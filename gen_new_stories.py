#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量新增故事：1 个新绘本系列 + 新成语 + 新古诗

- 插图: Pollinations.ai 免费绘图（无需 key）
- 配音: edge-tts，与全站同一把声音 zh-CN-XiaoyiNeural
- 同时产出 png 和 webp（App 优先用 webp，小一半体积）

用法: python3 gen_new_stories.py [--only dino|idiom|poem] [--force]
"""
import asyncio
import json
import os
import re
import sys
import time
import urllib.parse

import edge_tts
import requests
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
VOICE = 'zh-CN-XiaoyiNeural'
FORCE = '--force' in sys.argv
ONLY = None
for i, a in enumerate(sys.argv):
    if a == '--only' and i + 1 < len(sys.argv):
        ONLY = sys.argv[i + 1]

STYLE = ("children's book illustration, cute cartoon style, bright cheerful colors, "
         "simple shapes, soft shading, no text, no watermark, no signature")


def img_prompt(scene):
    return scene + ', ' + STYLE


def fetch_image(prompt, path, seed=0):
    """下载插画并存成 png + webp"""
    png = path + '.png'
    webp = path + '.webp'
    if not FORCE and os.path.exists(png) and os.path.getsize(png) > 10000:
        return True
    url = ('https://image.pollinations.ai/prompt/' + urllib.parse.quote(prompt)
           + '?width=1024&height=768&nologo=true&seed=' + str(seed or abs(hash(path)) % 9999))
    for attempt in range(3):
        try:
            r = requests.get(url, timeout=120)
            if r.status_code == 200 and len(r.content) > 5000:
                os.makedirs(os.path.dirname(png), exist_ok=True)
                with open(png, 'wb') as f:
                    f.write(r.content)
                im = Image.open(png).convert('RGB').resize((800, 600), Image.LANCZOS)
                # Pollinations 会在右下角打 pollinations.ai 水印，裁掉底部一条
                w, h = im.size
                im = im.crop((0, 0, w, int(h * 0.92)))
                im = im.resize((800, 600), Image.LANCZOS)
                im.save(png, optimize=True, quality=85)
                im.save(webp, 'WEBP', quality=82, method=4)
                return True
        except Exception:
            pass
        time.sleep(2)
    return False


async def gen_audio(text, path):
    if not FORCE and os.path.exists(path) and os.path.getsize(path) > 500:
        return True
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, VOICE, rate='-5%').save(path)
            if os.path.getsize(path) > 200:
                return True
        except Exception:
            await asyncio.sleep(1)
    return False


# ============ 1. 新绘本系列：小恐龙奇奇 ============
DINO = {
    'name': 'dino', 'icon': '🦕', 'title': '小恐龙奇奇',
    'episodes': [
        ('dino_01', '小恐龙上幼儿园', [
            ('小恐龙奇奇第一天去幼儿园。妈妈牵着他的手，走到大门口。', 'cute little green dinosaur and his mother standing at a kindergarten gate, morning'),
            ('奇奇抱住妈妈的腿不肯放，眼泪在眼眶里打转："我不想进去。"', 'cute little green dinosaur hugging his mother leg, teary eyes, kindergarten entrance'),
            ('长颈鹿老师蹲下来，轻轻拉住奇奇的手："我们进去看看吧。"', 'friendly giraffe teacher bending down holding the little dinosaur hand, warm classroom door'),
            ('教室里，小兔子在搭积木，小猴子在画画。奇奇慢慢松开了妈妈的手。', 'bright kindergarten classroom, rabbit building blocks, monkey drawing, little dinosaur watching'),
            ('奇奇和小兔子一起搭了一座高高的桥。他笑了起来。', 'little dinosaur and rabbit building a tall block bridge together, happy'),
            ('放学时，奇奇对妈妈说："明天我还要来！"', 'little dinosaur running to his mother at kindergarten gate, sunset, big smile'),
        ]),
        ('dino_02', '小恐龙学分享', [
            ('奇奇带了一个红色的小皮球去幼儿园，球又圆又亮。', 'little dinosaur holding a shiny red ball, kindergarten playground'),
            ('小兔子想玩，奇奇把球藏在身后："这是我的！"', 'little dinosaur hiding a red ball behind his back, rabbit looking at it'),
            ('小兔子低下头走开了。奇奇一个人拍球，觉得没那么好玩。', 'little dinosaur playing alone with a red ball, sad rabbit walking away'),
            ('长颈鹿老师说："球可以一起玩呀，你拍给我，我拍给你。"', 'giraffe teacher talking to little dinosaur, red ball on ground between them'),
            ('奇奇把球递过去，小兔子笑得眼睛弯弯的。', 'little dinosaur handing the red ball to a smiling rabbit'),
            ('两个人你拍一下、我拍一下，笑声传得很远很远。', 'little dinosaur and rabbit playing catch with a red ball, laughing, sunny playground'),
        ]),
        ('dino_03', '小恐龙不怕黑', [
            ('晚上，房间里黑黑的。奇奇把头蒙在被子里，只露出一只眼睛。', 'little dinosaur hiding under a blanket in a dark bedroom, only one eye showing'),
            ('忽然"咔哒"一声，奇奇吓得心咚咚跳，把被子裹得更紧了。', 'little dinosaur peeking out scared in a dark bedroom, moonlight'),
            ('妈妈打开门，轻轻抱住他："我们一起去看看是什么声音。"', 'mother dinosaur hugging the little dinosaur in a dim bedroom doorway'),
            ('原来是窗帘被风吹起来，碰到了小桌子。一点也不可怕。', 'curtain blown by wind touching a small table, moonlight through window, cute bedroom'),
            ('妈妈留下一盏小夜灯，光像月亮一样温柔。', 'cozy bedroom with a small night lamp glowing softly, little dinosaur in bed'),
            ('奇奇闭上眼睛，慢慢睡着了，还做了一个甜甜的梦。', 'little dinosaur sleeping peacefully in bed with a soft night light'),
        ]),
        ('dino_04', '小恐龙做错事了', [
            ('奇奇在客厅里跑得太快，把妈妈的花瓶碰倒了，"啪"的一声碎了。', 'little dinosaur accidentally knocking over a vase in a living room, broken pieces, startled'),
            ('他吓坏了，赶紧把碎片扫到沙发后面，装作什么都没发生。', 'little dinosaur sweeping broken vase pieces behind a sofa, guilty look'),
            ('一整天，奇奇都不敢看妈妈的眼睛，心里像压着一块小石头。', 'little dinosaur sitting quietly looking down, sad, living room'),
            ('晚上，他终于小声说："妈妈，对不起，是我打碎的。"', 'little dinosaur talking to his mother at night, honest confession, warm light'),
            ('妈妈摸摸他的头："谢谢你告诉我。说实话，比不犯错更重要。"', 'mother dinosaur gently patting the little dinosaur head, warm smile'),
            ('他们一起把碎片扫干净。奇奇松了一口气，心里亮堂堂的。', 'little dinosaur and mother cleaning up together, relieved happy faces'),
        ]),
        ('dino_05', '小恐龙学骑车', [
            ('奇奇得到一辆崭新的自行车，他高兴地跨了上去。', 'little dinosaur with a brand new small bicycle, excited, sunny yard'),
            ('刚蹬一下，车子歪了，"哐当"摔倒了，膝盖擦破了皮。', 'little dinosaur falling off a bicycle on the grass, small scrape on knee'),
            ('奇奇坐在地上，眼泪掉下来："我学不会了。"', 'little dinosaur sitting on the ground crying next to a fallen bicycle'),
            ('爸爸蹲下来："摔倒是学骑车的一部分，我们再来一次。"', 'father dinosaur kneeling beside the little dinosaur, encouraging, bicycle'),
            ('奇奇扶着车把，爸爸在后面扶着。这一次他骑了三米远。', 'father dinosaur holding the bicycle seat while little dinosaur pedals, park path'),
            ('第二天，奇奇自己骑了一圈又一圈。原来坚持真的能学会。', 'little dinosaur riding a bicycle by himself in the park, proud and happy'),
        ]),
        ('dino_06', '小恐龙交新朋友', [
            ('幼儿园来了一位新同学——小刺猬球球。', 'new classmate hedgehog standing in a kindergarten classroom, little dinosaur watching'),
            ('大家都不敢靠近，因为球球身上长满了刺。', 'small hedgehog alone with soft spikes, other animal kids standing far away'),
            ('球球一个人坐在角落里，看起来很难过。', 'hedgehog sitting alone in the corner of a bright classroom, sad'),
            ('奇奇拿了两块饼干走过去："你要吃吗？"', 'little dinosaur offering cookies to the hedgehog, friendly'),
            ('球球小心地接过饼干，笑了："谢谢你，你真好。"', 'hedgehog holding a cookie and smiling at the little dinosaur'),
            ('从那天起，他们成了最好的朋友。原来交朋友只要说一句话。', 'little dinosaur and hedgehog playing together happily in the classroom'),
        ]),
    ],
}

# ============ 2. 新成语（单图） ============
IDIOMS = [
    ('idiom_31', '惊弓之鸟',
     '更羸是魏国有名的射手。一天，他陪着魏王站在高台上，看见一只大雁慢慢飞来，叫声很凄凉。更羸说："我不用箭，只要拉一下弓，就能把这只雁射下来。"魏王不信。更羸拉开弓弦，"嗡"的一声，大雁果然应声落地。魏王惊讶地问为什么。更羸说："这只雁飞得慢、叫得惨，说明它身上有旧伤，又离群很久。听到弓弦声，它吓得拼命往上飞，伤口裂开，就掉下来了。"',
     '受了惊吓的人，一有动静就害怕。',
     'a famous archer pulling a bowstring aiming at a wild goose flying in the sky, ancient chinese setting, children book illustration'),
    ('idiom_32', '画蛇添足',
     '古时候，几个人分到一壶酒。酒只够一个人喝，有人提议："我们在地上画蛇，谁先画完谁喝。"一个人很快画好了，他端起酒壶，得意地说："我还能给蛇添上脚呢！"可是脚还没画完，另一个人画好了蛇，一把夺过酒壶："蛇本来就没有脚，你添上脚就不是蛇了！"说完把酒喝光了。',
     '做多余的事，反而把事情弄糟。',
     'two people drawing snakes on the ground with brushes, ancient chinese courtyard, one adding feet to a snake, children book illustration'),
    ('idiom_33', '滥竽充数',
     '战国时，齐宣王喜欢听三百人一起吹竽。南郭先生根本不会吹，也混在队伍里装模作样。后来齐湣王即位，他喜欢听独奏。南郭先生吓坏了，只好偷偷逃走了。',
     '没有真本事却混在里面，早晚会露馅。',
     'a large ancient chinese orchestra of musicians playing yu instruments, one person pretending, palace courtyard, children book illustration'),
    ('idiom_34', '买椟还珠',
     '一个楚国人把珍珠拿到郑国去卖。他做了一个非常漂亮的木匣子，用香料熏过，还镶上翡翠。一个郑国人看见了，非常喜欢这个匣子，买下来后，把里面的珍珠还给楚国人，只带走了匣子。',
     '只看外表不看实质，反而丢掉了真正宝贵的东西。',
     'a beautiful decorated wooden box with a pearl inside on a market stall, ancient chinese market, children book illustration'),
    ('idiom_35', '一鸣惊人',
     '楚庄王当国君三年，从来不发号施令，大臣们都很着急。有人问他："有一只鸟落在山丘上，三年不飞也不叫，这是什么鸟？"楚庄王笑着说："这只鸟不飞则已，一飞冲天；不鸣则已，一鸣惊人。"从此他认真治理国家，很快成了霸主。',
     '平时默默努力，一旦出手就做出惊人的成绩。',
     'a magnificent bird perched on a hill about to take off, ancient chinese landscape, sunrise, children book illustration'),
    ('idiom_36', '破釜沉舟',
     '项羽带兵去救赵国。渡过河以后，他下令把渡船凿沉，把做饭的锅砸破，把营房烧掉，只带三天的干粮。他告诉士兵们："我们已经没有退路了，只能向前，打胜这一仗！"士兵们明白后，个个拼死作战，终于大败秦军。',
     '下定决心不留退路，就一定能成功。',
     'ancient chinese soldiers crossing a river, boats being sunk, determined army, dramatic scene, children book illustration'),
    ('idiom_37', '指鹿为马',
     '秦朝的赵高想试试谁听他的话。他牵来一只鹿，当着满朝大臣的面对皇帝说："这是一匹马。"皇帝笑了："丞相看错了吧，明明是鹿。"赵高就问大臣们。有的大臣害怕他，跟着说"是马"；有的大臣坚持说是鹿。后来，说真话的大臣都被他害了。',
     '故意颠倒黑白，仗势压人。',
     'a deer standing in an ancient chinese palace hall, officials arguing, east asian historical costume, children book illustration'),
    ('idiom_38', '鹬蚌相争',
     '一只河蚌爬上岸晒太阳，一只鹬鸟飞过来啄它的肉。河蚌马上合上壳，夹住了鹬鸟的嘴。鹬鸟说："今天不下雨，明天不下雨，你就干死了。"河蚌说："我今天不放你，明天不放你，你就饿死了。"两个谁也不让谁。渔夫走过来，把它们一起捉走了。',
     '双方互不相让，只会让别人得利。',
     'a big clam holding a bird beak on a riverbank, muddy shore, ancient chinese river scene, children book illustration'),
]

# ============ 3. 新古诗（单图） ============
POEMS = [
    ('poem_31', '山行', '杜牧 · 唐',
     '远上寒山石径斜，白云生处有人家。停车坐爱枫林晚，霜叶红于二月花。',
     '深秋沿着石头小路往山上走，白云飘起的地方住着人家。我停下车子，是因为喜爱傍晚的枫树林——被霜打过的枫叶，比二月的春花还要红。',
     'autumn mountain path with maple trees in bright red, a traveler stopping a carriage, white clouds, children book illustration'),
    ('poem_32', '九月九日忆山东兄弟', '王维 · 唐',
     '独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。',
     '我一个人在外地，每逢过节就更加想念亲人。想到兄弟们今天登高，头上插着茱萸，一定会发现少了我一个人。',
     'a lonely poet standing far away looking at distant hills on a festival day, ancient chinese scene, warm autumn, children book illustration'),
    ('poem_33', '咏柳', '贺知章 · 唐',
     '碧玉妆成一树高，万条垂下绿丝绦。不知细叶谁裁出，二月春风似剪刀。',
     '高高的柳树像是用碧玉打扮成的，千万条柳枝垂下来，像绿色的丝带。不知道这些细细的叶子是谁裁出来的呢？原来是二月的春风，它就像一把剪刀呀。',
     'a tall green willow tree by a lake in spring, drooping branches, breeze, children book illustration'),
    ('poem_34', '元日', '王安石 · 宋',
     '爆竹声中一岁除，春风送暖入屠苏。千门万户曈曈日，总把新桃换旧符。',
     '在鞭炮声里旧的一年过去了，春风送暖，大家一起喝屠苏酒。初升的太阳照着千家万户，人们把旧桃符换成新的，迎接新的一年。',
     'chinese new year morning, children setting off firecrackers, red couplets on doors, warm sunrise, children book illustration'),
    ('poem_35', '晓出净慈寺送林子方', '杨万里 · 宋',
     '毕竟西湖六月中，风光不与四时同。接天莲叶无穷碧，映日荷花别样红。',
     '六月的西湖，景色和其他季节都不一样。莲叶一直铺到天边，绿得望不到头；荷花被太阳一照，红得特别鲜艳。',
     'west lake in summer, endless green lotus leaves and pink lotus flowers, morning sun, children book illustration'),
    ('poem_36', '池上', '白居易 · 唐',
     '小娃撑小艇，偷采白莲回。不解藏踪迹，浮萍一道开。',
     '一个小娃娃撑着小船，偷偷去采了白莲花回来。他不懂得藏起自己的行踪，水面上的浮萍被划开了一道长长的痕迹。',
     'a small child rowing a tiny boat picking white lotus on a pond, duckweed parting behind, summer, children book illustration'),
]


def build_manifest_entry(story):
    return story


def main():
    manifest_path = os.path.join(BASE, 'stories', 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf-8'))
    have_ids = {s['id'] for s in manifest}
    added = []
    img_ok = img_fail = 0

    # ---- 绘本系列 ----
    if ONLY in (None, 'dino'):
        name = DINO['name']
        for sid, title, pages in DINO['episodes']:
            print('\n📖 %s %s' % (sid, title))
            img_dir = os.path.join(BASE, 'img', name, sid)
            aud_dir = os.path.join(BASE, 'audio', name, sid)
            os.makedirs(img_dir, exist_ok=True)
            os.makedirs(aud_dir, exist_ok=True)
            # 封面
            ok = fetch_image(img_prompt(pages[0][1] + ', cover illustration, title scene'), os.path.join(img_dir, 'cover'))
            img_ok += ok; img_fail += (not ok)
            # 内页
            for i, (text, scene) in enumerate(pages):
                if fetch_image(img_prompt(scene), os.path.join(img_dir, 'page%d' % (i + 1))):
                    img_ok += 1
                else:
                    img_fail += 1
                print('   page%d %s' % (i + 1, '✓' if os.path.exists(os.path.join(img_dir, 'page%d.png' % (i + 1))) else '✗'), end='', flush=True)
            # 配音
            asyncio.run(gen_audio('《%s》。小朋友，让我们一起来听故事吧！' % title, os.path.join(aud_dir, 'cover_zh.mp3')))
            for i, (text, scene) in enumerate(pages):
                asyncio.run(gen_audio(text, os.path.join(aud_dir, 'page%d_zh.mp3' % (i + 1))))
            print('   🔊 done')
            entry = {
                'title': title, 'id': sid, 'icon': DINO['icon'],
                'img_prefix': 'img/%s/%s' % (name, sid),
                'audio_prefix': 'audio/%s/%s' % (name, sid),
                'pages': [{'text': t, 'kw': s[:24]} for t, s in pages],
            }
            json.dump(entry, open(os.path.join(BASE, 'stories', sid + '.json'), 'w', encoding='utf-8'),
                      ensure_ascii=False, indent=2)
            if sid not in have_ids:
                manifest.append(entry)
                added.append(sid)

    # ---- 成语 ----
    if ONLY in (None, 'idiom'):
        for sid, name, body, moral, scene in IDIOMS:
            print('\n📚 %s %s' % (sid, name))
            text = '【成语】%s\n\n%s\n\n💡 %s' % (name, body, moral)
            png = os.path.join(BASE, 'img', 'idioms2', '%s_%s' % (sid.split('_')[1], name))
            ok = fetch_image(img_prompt(scene), png)
            img_ok += ok; img_fail += (not ok)
            asyncio.run(gen_audio(text, os.path.join(BASE, 'audio', 'idioms2', '%s.mp3' % os.path.basename(png))))
            print('   图 %s  音 %s' % ('✓' if ok else '✗', '✓'))
            entry = {
                'id': sid, 'title': '成语：%s' % name, 'icon': '📚', 'type': 'idiom',
                'img_prefix': 'img/idioms2/', 'audio_prefix': 'audio/idioms2/',
                'pages': [{'text': text, 'kw': name,
                           'img': 'img/idioms2/%s.png' % os.path.basename(png),
                           'audio': 'audio/idioms2/%s.mp3' % os.path.basename(png)}],
                'single_img': True,
            }
            json.dump(entry, open(os.path.join(BASE, 'stories', sid + '.json'), 'w', encoding='utf-8'),
                      ensure_ascii=False, indent=2)
            if sid not in have_ids:
                manifest.append(entry)
                added.append(sid)

    # ---- 古诗 ----
    if ONLY in (None, 'poem'):
        for sid, name, author, verse, trans, scene in POEMS:
            print('\n📜 %s %s' % (sid, name))
            text = '《%s》\n%s\n\n%s\n\n📖 %s' % (name, author, verse, trans)
            png = os.path.join(BASE, 'img', 'poems2', '%s_%s' % (sid.split('_')[1], name))
            ok = fetch_image(img_prompt(scene), png)
            img_ok += ok; img_fail += (not ok)
            asyncio.run(gen_audio(text, os.path.join(BASE, 'audio', 'poems2', '%s.mp3' % os.path.basename(png))))
            print('   图 %s  音 %s' % ('✓' if ok else '✗', '✓'))
            entry = {
                'id': sid, 'title': '古诗：%s' % name, 'icon': '📜', 'type': 'poem',
                'img_prefix': 'img/poems2/', 'audio_prefix': 'audio/poems2/',
                'pages': [{'text': text, 'kw': name,
                           'img': 'img/poems2/%s.png' % os.path.basename(png),
                           'audio': 'audio/poems2/%s.mp3' % os.path.basename(png)}],
                'single_img': True,
            }
            json.dump(entry, open(os.path.join(BASE, 'stories', sid + '.json'), 'w', encoding='utf-8'),
                      ensure_ascii=False, indent=2)
            if sid not in have_ids:
                manifest.append(entry)
                added.append(sid)

    json.dump(manifest, open(manifest_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('\n✅ 新增 %d 集: %s' % (len(added), ', '.join(added)))
    print('   插画 成功 %d / 失败 %d，清单共 %d 集' % (img_ok, img_fail, len(manifest)))


if __name__ == '__main__':
    main()
