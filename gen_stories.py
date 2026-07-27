#!/usr/bin/env python3
"""批量生成60集儿童故事: 佩奇20集+汪汪队20集+朱迪20集"""
import requests, json, os, time, re, asyncio, edge_tts, urllib.parse
from PIL import Image

KEY = "sk-ws-H.EIDPHYH.R6fz.MEUCIFHk5BeGIhohObv__u1AK5tfFoLdHc9SsWxSnyVxJwtYAiEA2gEI1Z29SE0Ln-LHJBTW9jZw_dRPxvY4L2OvKxYpI-k"
API_CHAT = "https://ws-hp5a6ke5m2gv9tc8.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions"
API_IMG = "https://image.pollinations.ai/prompt/"
BASE = "/Users/guoju/edu-app"

SERIES = [
    {"name": "peppa", "title_prefix": "佩奇", "icon": "🐷", "character": "Peppa Pig",
     "themes": ["第一天幼儿园","认识新朋友","唱歌跳舞","画画比赛","传球游戏","午餐时间","小医生游戏","积木搭房子","户外滑滑梯","讲故事时间","做手工","学数数","角色扮演","音乐课","动物模仿","分享玩具","雨天室内","运动会","制作三明治","告别演出"]},
    {"name": "paw", "title_prefix": "汪汪队", "icon": "🐶", "character": "Paw Patrol",
     "themes": ["大火救援","小猫困树上","洪水救援","雪崩搜救","火车脱轨","游轮漏水","飞机迫降","大桥坍塌","地震救援","海啸预警","火山爆发","龙卷风来袭","蜜蜂大迁移","停电抢修","隧道塌方","冰面破裂","毒蛇入侵","烟花事故","赛车失控","外星来客"]},
    {"name": "judy", "title_prefix": "朱迪", "icon": "🐰", "character": "Judy Hopps from Zootopia",
     "themes": ["交通大救援","寻找走失小猫","超市大堵车","运动会执勤","雨天巡逻","动物城狂欢节","地铁故障","追捕小偷","帮助老山羊","幼儿园安全课","快递丢失","冰淇淋车坏了","红绿灯坏了","河马过马路","马拉松比赛","闪电树懒开车","大犀牛迷路","游乐园走失","水獭建桥","帮助小考拉"]},
]

async def gen_audio(text, path):
    if os.path.exists(path) and os.path.getsize(path) > 500: return
    try:
        comm = edge_tts.Communicate(text, 'zh-CN-XiaoyiNeural', rate='-5%')
        await comm.save(path)
    except: pass

def gen_story_text(series_name, ep_num, theme):
    """Generate story via DeepSeek"""
    prompt = f"""写一集{series_name}的儿童故事，适合3-6岁儿童。主题是：{theme}。
要求：6页，每页2-3句简单中文。输出严格JSON格式，不要额外文字：
{{"title":"...", "pages":[{{"text":"...","kw":"..."}}]}}"""
    
    for attempt in range(3):
        try:
            r = requests.post(API_CHAT,
                headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
                json={"model": "deepseek-v4-pro", "messages": [{"role":"user","content":prompt}], "max_tokens": 1500, "temperature": 0.8},
                timeout=120)
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            m = re.search(r'\{.*\}', content, re.DOTALL)
            if m:
                story = json.loads(m.group())
                if 'title' in story and 'pages' in story and len(story['pages']) >= 4:
                    return story
            print(f"  Retry {attempt+1}: invalid format")
        except Exception as e:
            print(f"  Retry {attempt+1}: {e}")
        time.sleep(3)
    return None

def gen_image(prompt, path):
    """Generate image via Pollinations.ai"""
    if os.path.exists(path) and os.path.getsize(path) > 10000: return True
    url = API_IMG + urllib.parse.quote(prompt) + f'?width=1024&height=768&nologo=true&seed={hash(path)%1000}'
    for attempt in range(3):
        try:
            r = requests.get(url, timeout=120)
            if r.status_code == 200 and len(r.content) > 5000:
                with open(path, 'wb') as f: f.write(r.content)
                img = Image.open(path)
                img = img.resize((800, 600), Image.LANCZOS)
                img.save(path, optimize=True, quality=85)
                return True
        except: pass
        time.sleep(2)
    return False

def process_series(series, start_ep=1, count=20):
    """Process all episodes for a series"""
    name = series["name"]
    character = series["character"]
    themes = series["themes"]
    
    print(f"\n{'='*50}")
    print(f"📚 {series['title_prefix']} — {count}集")
    print(f"{'='*50}")
    
    all_stories = []
    
    for ep in range(start_ep, start_ep + count):
        theme = themes[(ep-1) % len(themes)]
        if count > len(themes):
            theme = f"{theme}{ep}"
        
        fid = f"{name}_{ep:02d}"
        img_dir = f"{BASE}/img/{name}/{fid}"
        audio_dir = f"{BASE}/audio/{name}/{fid}"
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(audio_dir, exist_ok=True)
        
        print(f"\n[{ep}/{count}] {series['title_prefix']}: {theme}")
        
        # Check if already done
        if os.path.exists(f"{BASE}/stories/{name}_{ep:02d}.json"):
            with open(f"{BASE}/stories/{name}_{ep:02d}.json") as f:
                all_stories.append(json.load(f))
            print(f"  ⏭ Already done")
            continue
        
        # 1. Generate story text
        print(f"  ✍️ 写文案...")
        story = gen_story_text(character, ep, theme)
        if not story:
            print(f"  ❌ Failed to generate story")
            continue
        
        story["id"] = f"{name}_{ep:02d}"
        story["icon"] = series["icon"]
        story["img_prefix"] = f"img/{name}/{fid}"
        story["audio_prefix"] = f"audio/{name}/{fid}"
        story["pages"] = story["pages"][:6]  # Max 6 pages
        print(f"  ✅ {story['title']} ({len(story['pages'])} pages)")
        
        # 2. Generate images
        print(f"  🎨 生成插图...")
        # Cover
        cover_prompt = f"Cute {character} cartoon, {theme}, children book illustration, bright colors, simple, no text"
        for img_name, prompt in [("cover", cover_prompt)] + [(f"page{p+1}", f"Cute {character} cartoon, scene from children story about {theme}, page {p+1}, children book illustration, bright colors, no text") for p in range(len(story['pages']))]:
            path = f"{img_dir}/{img_name}.png"
            if gen_image(prompt, path):
                print(f"    ✅ {img_name}", end=" ", flush=True)
            else:
                print(f"    ❌ {img_name}", end=" ", flush=True)
        print()
        
        # 3. Generate audio
        print(f"  🎤 生成配音...")
        async def gen_audio_batch():
            await gen_audio(f"《{story['title']}》。小朋友，让我们一起来听故事吧！", f"{audio_dir}/cover_zh.mp3")
            for p, page in enumerate(story['pages']):
                await gen_audio(page['text'], f"{audio_dir}/page{p+1}_zh.mp3")
        asyncio.run(gen_audio_batch())
        print(f"    ✅ done")
        
        # Save story JSON
        os.makedirs(f"{BASE}/stories", exist_ok=True)
        with open(f"{BASE}/stories/{name}_{ep:02d}.json", 'w') as f:
            json.dump(story, f, ensure_ascii=False, indent=2)
        all_stories.append(story)
        print(f"  💾 Saved")
        
        time.sleep(1)  # Rate limit
    
    return all_stories

if __name__ == "__main__":
    import sys
    series_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    start = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 20
    
    series = SERIES[series_idx]
    stories = process_series(series, start, count)
    print(f"\n✅ {series['title_prefix']}: {len(stories)}/{count} 集完成")
