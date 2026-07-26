#!/usr/bin/env python3
"""用Pollinations.ai生成10套AI找茬图片"""
import requests, os, json, time, urllib.parse
from PIL import Image, ImageDraw, ImageEnhance

OUT = '/Users/guoju/edu-app/img/spotdiff'
os.makedirs(OUT, exist_ok=True)

API = "https://image.pollinations.ai/prompt/"

SCENES = [
    ("scene_01", "🏠 快乐农场",
     "beautiful children book illustration, colorful farm with red barn, green trees, yellow sun, cute white cat sitting on grass, flowers, cartoon style, bright colors, simple shapes, no text, no watermark",
     "beautiful children book illustration, colorful farm with BLUE barn, green trees, small sun, NO cat on grass, extra sunflower in center, cartoon style, bright colors, no text"),
    ("scene_02", "🌊 海底世界",
     "beautiful children book illustration, underwater ocean scene, orange fish, green sea turtle, small sailboat, starfish, bubbles, blue water, sandy bottom, cartoon style, bright colors, no text",
     "beautiful children book illustration, underwater ocean scene, orange fish, NO sea turtle, small sailboat with RED sail, starfish, bubbles, cartoon style, no text"),
    ("scene_03", "🏙️ 城市街景",
     "beautiful children book illustration, cheerful city street, colorful tall buildings, red car on road, green trees, blue sky with white clouds, cartoon style, bright colors, no text",
     "beautiful children book illustration, cheerful city street, colorful buildings with PINK tallest one, NO car on road, yellow bus instead, cartoon style, no text"),
    ("scene_04", "🚀 太空探险",
     "beautiful children book illustration, outer space, white rocket, orange planet, blue planet, yellow moon, twinkling stars, dark blue background, cartoon style, bright colors, no text",
     "beautiful children book illustration, outer space, white rocket with BLUE nose, orange planet, NO blue planet, yellow moon, UFO flying saucer, cartoon style, no text"),
    ("scene_05", "🌸 美丽花园",
     "beautiful children book illustration, colorful flower garden, pink flowers, yellow butterflies, green grass, cute white bunny rabbit on right, blue sky with clouds, cartoon style, no text",
     "beautiful children book illustration, colorful flower garden, pink flowers, yellow butterflies, green grass, NO bunny rabbit, extra large red flower in center, cartoon style, no text"),
    ("scene_06", "🎄 圣诞快乐",
     "beautiful children book illustration, Christmas scene, green decorated tree with gold star on top, snowman on left, snow on ground, yellow moon, stars in dark sky, cartoon style, no text",
     "beautiful children book illustration, Christmas scene, green tree with RED star on top, NO snowman, gift box under tree, yellow moon, cartoon style, no text"),
    ("scene_07", "🎪 欢乐公园",
     "beautiful children book illustration, fun park, blue pond with yellow ducks, green trees, brown bench, cute brown dog on left, colorful kite in blue sky, cartoon style, no text",
     "beautiful children book illustration, fun park, bigger blue pond with yellow ducks, green trees, NO dog, colorful kite in blue sky, cartoon style, no text"),
    ("scene_08", "🍳 美味厨房",
     "beautiful children book illustration, cozy kitchen, wooden table with red apple, milk carton, bread loaf, two eggs, orange juice, window showing blue sky, cartoon style, no text",
     "beautiful children book illustration, cozy kitchen, wooden table with GREEN apple, NO milk carton, bread loaf, a cake added on table, cartoon style, no text"),
    ("scene_09", "🏖️ 阳光沙滩",
     "beautiful children book illustration, sunny beach, red umbrella, colorful beach ball, seashells on golden sand, blue ocean waves, white clouds, cartoon style, no text",
     "beautiful children book illustration, sunny beach, BLUE umbrella, NO beach ball, sand castle on sand, blue ocean waves, cartoon style, no text"),
    ("scene_10", "🌲 森林动物",
     "beautiful children book illustration, green forest, big trees, cute brown bear on left, white rabbit, orange fox on right, mushrooms, blue sky, cartoon style, no text",
     "beautiful children book illustration, green forest, big trees, light brown bear, white rabbit, NO fox, colorful bird on tree branch, cartoon style, no text"),
]

def download(url, path, retries=3):
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=120)
            if r.status_code == 200 and len(r.content) > 5000:
                with open(path, 'wb') as f: f.write(r.content)
                return True
            print(f"  ⚠ HTTP {r.status_code}, retry {attempt+1}")
        except Exception as e:
            print(f"  ⚠ {e}, retry {attempt+1}")
        time.sleep(3)
    return False

def main():
    manifest = []
    
    for fid, name, orig_prompt, diff_prompt in SCENES:
        orig_path = f"{OUT}/{fid}_orig.png"
        diff_path = f"{OUT}/{fid}_diff.png"
        
        print(f"\n🎨 {name}")
        
        # Generate original
        if not os.path.exists(orig_path) or os.path.getsize(orig_path) < 10000:
            url = API + urllib.parse.quote(orig_prompt) + "?width=1024&height=768&nologo=true&seed=42"
            print(f"  生成原图...")
            if download(url, orig_path):
                sz = os.path.getsize(orig_path)//1024
                # Resize to 800x600
                img = Image.open(orig_path)
                img = img.resize((800, 600), Image.LANCZOS)
                img.save(orig_path)
                print(f"  ✅ 原图 {sz}KB")
            else:
                print(f"  ❌ 失败")
                continue
        else:
            print(f"  ✅ 原图已存在 ({os.path.getsize(orig_path)//1024}KB)")
        
        # Generate different version
        if not os.path.exists(diff_path) or os.path.getsize(diff_path) < 10000:
            url = API + urllib.parse.quote(diff_prompt) + "?width=1024&height=768&nologo=true&seed=100"
            print(f"  生成差异图...")
            if download(url, diff_path):
                sz = os.path.getsize(diff_path)//1024
                img = Image.open(diff_path)
                img = img.resize((800, 600), Image.LANCZOS)
                img.save(diff_path)
                print(f"  ✅ 差异图 {sz}KB")
            else:
                print(f"  ❌ 失败")
        else:
            print(f"  ✅ 差异图已存在 ({os.path.getsize(diff_path)//1024}KB)")
        
        # Define approximate diff zones (will be more accurate since AI images have specific content)
        diffs = [
            {"x": 100, "y": 250, "w": 180, "h": 150, "desc": "主要物体变了"},
            {"x": 450, "y": 350, "w": 150, "h": 120, "desc": "动物/物品消失"},
            {"x": 600, "y": 60, "w": 100, "h": 100, "desc": "太阳/天空变化"},
            {"x": 300, "y": 400, "w": 120, "h": 100, "desc": "颜色变化"},
        ]
        
        entry = {"name": name, "img": fid, "differences": diffs}
        manifest.append(entry)
    
    # Save manifest
    with open(f'{OUT}/manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 完成! {len(manifest)} scenes")
    print(f"📁 {OUT}/")

if __name__ == "__main__":
    main()
