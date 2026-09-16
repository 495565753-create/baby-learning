#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
补齐 / 重新配好 App 的语音

做三件事：
1. 把仓库里已经录好、但没挂到映射表上的音频接上
   （audio/feedback/* 的「答对了！」等，之前一直在退化成系统朗读）
2. 给新加的内容补录语音（板块名、新练习名、情绪、垃圾分类、画图游戏等）
3. 重建 index.html 里的 EMBEDDED_MANIFEST 和 audio/manifest.json

用法:  python3 gen_v5_audio.py          # 只补缺失的
       python3 gen_v5_audio.py --force  # 全部重录
"""
import asyncio
import ast
import json
import os
import re
import sys

import edge_tts

BASE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(BASE, 'audio')
INDEX = os.path.join(BASE, 'index.html')
ZH = 'zh-CN-XiaoyiNeural'
EN = 'en-US-JennyNeural'
FORCE = '--force' in sys.argv


def load_embedded_manifest():
    """取出 index.html 里现有的映射表"""
    src = open(INDEX, encoding='utf-8').read()
    m = re.search(r'const EMBEDDED_MANIFEST = (\{.*?\});', src, re.S)
    return json.loads(m.group(1))


def load_old_feedback_map():
    """generate_audio.py 里定义的反馈语音：文字 -> 文件（文件早就在仓库里了）"""
    src = open(os.path.join(BASE, 'generate_audio.py'), encoding='utf-8').read()
    data = ast.literal_eval(re.search(r'^DATA = (\{.*?\n\})\n', src, re.S | re.M).group(1))
    out = {}
    for item in data.get('feedback', []):
        key, text = item
        path = 'audio/feedback/%s.mp3' % key
        if os.path.exists(os.path.join(BASE, path)):
            out[text] = path
    return out


def nav_map_from_disk():
    """audio/nav/<tab>.mp3 对应子菜单名字：从 index.html 的 data-speak + showXTab('id') 反推"""
    src = open(INDEX, encoding='utf-8').read()
    out = {}
    for m in re.finditer(r"show(?:Math|English|General|Game|Draw)Tab\('([a-z0-9]+)'\)\" data-speak=\"([^\"]+)\"", src):
        tab, label = m.group(1), m.group(2)
        path = 'audio/nav/%s.mp3' % tab
        if os.path.exists(os.path.join(BASE, path)):
            out[label] = path
    # 板块入口（首页四/六张大卡）
    for m in re.finditer(r"navigate\('([a-z]+)'\)\" data-speak=\"([^\"]+)\"", src):
        page, label = m.group(1), m.group(2)
        path = 'audio/nav/%s.mp3' % page
        if os.path.exists(os.path.join(BASE, path)):
            out[label] = path
    if os.path.exists(os.path.join(BASE, 'audio/nav/english.mp3')):
        out['英语启蒙'] = 'audio/nav/english.mp3'
    return out


# ---- 需要新录的内容 ----

# 板块名 + 新练习名（audio/nav/<key>.mp3）
NEW_NAV = [
    ('math', '数学启蒙'), ('story', '故事书'), ('games', '游戏乐园'), ('draw', '画图乐园'),
    ('me', '我的成长'), ('trace', '写数字'), ('multiplication', '乘法入门'), ('ordering', '数字排序'),
    ('patterns', '找规律'), ('bonds', '数的分解'), ('oddeven', '单数双数'),
    ('listening', '听音选图'), ('spelling', '单词拼写'), ('memory', '记忆配对'), ('quiz2', '英语小测验'),
    ('emotion', '认识情绪'), ('recycle', '垃圾分类'), ('spotdiff', '火眼金睛'), ('color', '涂色画板'),
    ('puzzle', '拼图乐园'), ('sequence', '记忆序列'), ('shadow', '影子配对'), ('maze', '迷宫冒险'),
    ('sprint', '口算闯关'), ('whack', '打地鼠'), ('hunt', '数字寻宝'),
    ('kaleido', '万花筒'), ('dots', '数字连线'), ('mirror', '对称画'), ('sticker', '贴纸画'),
    ('general', '常识百科'), ('hint', '看看这里哦'), ('found', '真棒，找到一个！'),
]

# 游戏里的固定台词（audio/fb2/<key>.mp3）
NEW_FB = [
    ('puzzle_done', '拼好啦，你真专心！'),
    ('maze_done', '走出迷宫啦，你真有耐心！'),
    ('memory_done', '全部配对成功，你的记性真好！'),
    ('whack_good', '手真快，你反应好灵敏！'),
    ('whack_retry', '反应很快哦，再来一次吧！'),
    ('hunt_good', '找得真快，眼力真好！'),
    ('hunt_retry', '完成啦，多练几次会更快哦！'),
    ('sprint_good', '太厉害了，你是个口算小达人！'),
    ('sprint_retry', '完成挑战啦，多练几次会更快哦！'),
    ('kaleido_done', '好漂亮的花纹，你画得真棒！'),
    ('dots_done', '连好啦'),
    ('mirror_done', '左右一模一样，好厉害！'),
    ('sticker_done', '好丰富的一幅画，你真会创作！'),
    ('recycle_done', '太棒了，你是环保小卫士！'),
    ('try_again2', '没关系，再试一次吧'),
    ('praise_effort', '答对了！你认真想了，真棒！'),
    ('keep_going', '再试一次，多想一步就会啦'),
    ('shadow_ok', '一眼就看出来了，好眼力！'),
    ('seq_ok', '记忆力真好！'),
    ('seq_good', '这就是进步，下次会更好！'),
    ('ok', '答对了'),
]

# 认识情绪：词 + 建议
EMOTIONS = [
    ('happy', '开心', '开心的时候可以笑出来，也可以告诉别人你为什么开心，快乐会变得更多。'),
    ('angry', '生气', '生气时先深呼吸，慢慢数到五再说话，就不容易做错事。'),
    ('sad', '难过', '难过可以哭一会儿，也可以找爸爸妈妈抱一抱，说出来会好受很多。'),
    ('scared', '害怕', '害怕的时候握住大人的手，把害怕的事讲出来，就没那么可怕了。'),
    ('surprised', '惊讶', '惊讶是遇到了没想到的事，睁大眼睛、张大小嘴，一下子就明白了。'),
    ('shy', '害羞', '害羞很正常，小声打个招呼，慢慢就不紧张啦。'),
    ('tired', '累了', '累了就休息一下，喝点水、睡一小觉，身体又有力气了。'),
    ('love', '爱', '爱可以抱抱、亲亲、说一句“我喜欢你”，让别人知道你的心意。'),
]

# 垃圾分类：桶 + 物品 + 为什么
RECYCLE_BINS = [('recycle', '可回收物'), ('kitchen', '厨余垃圾'), ('harmful', '有害垃圾'), ('other', '其他垃圾')]
RECYCLE_ITEMS = [
    ('can', '易拉罐', '金属可以重新做成新罐子。'),
    ('paper', '旧报纸', '纸可以回收再造纸。'),
    ('bottle', '塑料瓶', '塑料瓶洗干净后可以回收。'),
    ('carton', '纸箱', '纸箱压扁后可以回收。'),
    ('banana', '香蕉皮', '果皮会烂掉，可以变成肥料。'),
    ('applecore', '苹果核', '吃剩的食物属于厨余垃圾。'),
    ('eggshell', '鸡蛋壳', '蛋壳是厨余垃圾。'),
    ('rice', '剩饭', '剩下的饭菜是厨余垃圾。'),
    ('battery', '旧电池', '电池有毒，会污染土壤和水。'),
    ('medicine', '过期药', '过期药品有害，不能随便扔。'),
    ('thermometer', '体温计', '水银温度计是有害垃圾。'),
    ('tissue', '用过的纸巾', '纸巾沾了脏东西，不能回收。'),
    ('chopsticks', '一次性筷子', '用过的筷子属于其他垃圾。'),
    ('brokenbowl', '破碗', '陶瓷不能回收，属于其他垃圾。'),
]

# 涂色模板名
DRAW_TEMPLATES = [
    ('cat', '小猫'), ('dog', '小狗'), ('rabbit', '兔子'), ('house', '房子'), ('butterfly', '蝴蝶'),
    ('star', '星星'), ('fish', '小鱼'), ('flower', '花朵'), ('icecream', '冰淇淋'), ('car', '汽车'),
]

# 数字连线连完以后的图案名
DOT_SHAPES = [
    ('star', '小星星'), ('house', '小房子'), ('fish', '小鱼'),
    ('rocket', '小火箭'), ('boat', '小帆船'), ('pine', '小松树'),
]


def tasks():
    """返回 [(文本, 文件路径), ...]"""
    out = []
    for key, text in NEW_NAV:
        out.append((text, 'audio/nav/%s.mp3' % key))
    for key, text in NEW_FB:
        out.append((text, 'audio/fb2/%s.mp3' % key))
    for key, word, tip in EMOTIONS:
        out.append((word, 'audio/emotion/%s.mp3' % key))
        out.append((tip, 'audio/emotion/%s_tip.mp3' % key))
    for key, word in RECYCLE_BINS:
        out.append((word, 'audio/recycle/bin_%s.mp3' % key))
    for key, word, why in RECYCLE_ITEMS:
        out.append((word, 'audio/recycle/%s.mp3' % key))
        out.append((why, 'audio/recycle/%s_why.mp3' % key))
    for key, word in DRAW_TEMPLATES:
        out.append((word, 'audio/coloring/%s.mp3' % key))
    for key, word in DOT_SHAPES:
        out.append((word, 'audio/dots/%s.mp3' % key))
    return out


async def say(text, path, voice=ZH):
    full = os.path.join(BASE, path)
    if not FORCE and os.path.exists(full) and os.path.getsize(full) > 500:
        return True
    os.makedirs(os.path.dirname(full), exist_ok=True)
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, voice, rate='-5%').save(full)
            if os.path.getsize(full) > 200:
                return True
        except Exception as e:
            if attempt == 2:
                print('   ❌ %s -> %s' % (text[:24], e))
    return False


async def main():
    manifest = load_embedded_manifest()
    before = len(manifest)

    # 1. 接上仓库里已有的音频
    added_existing = 0
    for text, path in list(load_old_feedback_map().items()) + list(nav_map_from_disk().items()):
        if text not in manifest:
            manifest[text] = path
            added_existing += 1
    print('① 接上已有音频: +%d 条' % added_existing)

    # 2. 新录缺失的
    todo = tasks()
    print('② 需要补录: %d 条' % len(todo))
    done = 0
    for text, path in todo:
        if text in manifest and os.path.exists(os.path.join(BASE, manifest[text])):
            continue        # 这条已经有配音了，别重复录
        if await say(text, path):
            manifest[text] = path
            done += 1
            if done % 10 == 0:
                print('   已录 %d/%d …' % (done, len(todo)))
        else:
            print('   失败:', text[:24])
    print('   完成 %d 条' % done)

    # 3. 写回
    with open(os.path.join(AUDIO, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    src = open(INDEX, encoding='utf-8').read()
    literal = json.dumps(manifest, ensure_ascii=False, separators=(',', ':'))
    new_src, n = re.subn(r'const EMBEDDED_MANIFEST = \{.*?\};',
                         lambda _: 'const EMBEDDED_MANIFEST = ' + literal + ';',
                         src, count=1, flags=re.S)
    if n != 1:
        print('⚠️ 没能替换 index.html 里的 EMBEDDED_MANIFEST')
        return
    open(INDEX, 'w', encoding='utf-8').write(new_src)
    print('③ 映射表: %d -> %d 条（写回 index.html 和 audio/manifest.json）' % (before, len(manifest)))


if __name__ == '__main__':
    asyncio.run(main())
