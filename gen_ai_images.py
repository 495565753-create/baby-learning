#!/usr/bin/env python3
"""用阿里百炼AI生成10套找茬图片"""
import requests, json, os, time, base64

KEY = "sk-ws-H.EIDPHYH.R6fz.MEUCIFHk5BeGIhohObv__u1AK5tfFoLdHc9SsWxSnyVxJwtYAiEA2gEI1Z29SE0Ln-LHJBTW9jZw_dRPxvY4L2OvKxYpI-k"
BASE = "https://ws-hp5a6ke5m2gv9tc8.cn-beijing.maas.aliyuncs.com/compatible-mode/v1"
OUT = "/Users/guoju/edu-app/img/spotdiff"
os.makedirs(OUT, exist_ok=True)
HEADERS = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

# 10 scenes: (name, orig_prompt, diff_prompt)
SCENES = [
    ("🏠 快乐农场",
     "Children's book illustration: a colorful farm with red barn, green trees, yellow sun, white cat sitting on grass, flowers. Bright cartoon style, simple shapes, no text.",
     "Children's book illustration: a colorful farm with red barn, green trees, yellow sun, NO cat (empty grass), a blue flower added in center. Bright cartoon style, no text."),
    
    ("🌊 海底世界",
     "Children's book illustration: underwater ocean scene with orange fish, green sea turtle, small sailboat on water, starfish, bubbles. Blue water, sandy bottom, cartoon style, no text.",
     "Children's book illustration: underwater ocean scene with orange fish, NO sea turtle, small sailboat with RED sail, starfish, bubbles. Blue water, cartoon style, no text."),
    
    ("🏙️ 城市街景",
     "Children's book illustration: cheerful city street with colorful tall buildings, a red car on road, green trees, blue sky with white clouds. Cartoon style, no text.",
     "Children's book illustration: cheerful city street with colorful tall buildings (PINK tallest building), NO car on road, green trees, a yellow bus instead. Cartoon style, no text."),
    
    ("🚀 太空探险",
     "Children's book illustration: outer space with white rocket, orange planet, blue planet, yellow moon, twinkling stars. Dark blue background, cartoon style, no text.",
     "Children's book illustration: outer space with white rocket (BLUE nose), NO blue planet, yellow moon, twinkling stars, a UFO added. Dark blue background, cartoon style, no text."),
    
    ("🌸 美丽花园",
     "Children's book illustration: colorful flower garden with pink flowers, yellow butterflies, green grass, a cute white bunny rabbit on the right, blue sky with clouds. Cartoon style, no text.",
     "Children's book illustration: colorful flower garden with pink flowers, yellow butterflies, green grass, NO bunny rabbit, an extra large red flower in center. Blue sky, cartoon style, no text."),
    
    ("🎄 圣诞快乐",
     "Children's book illustration: Christmas scene with green decorated tree and gold star on top, snowman on the left, snow on ground, yellow moon, stars in dark sky. Cartoon style, no text.",
     "Children's book illustration: Christmas scene with green decorated tree and RED star on top, NO snowman, a gift box under tree instead, yellow moon, dark sky. Cartoon style, no text."),
    
    ("🎪 欢乐公园",
     "Children's book illustration: fun park with blue pond and yellow ducks, green trees, brown bench, a cute brown dog on the left, colorful kite in blue sky. Cartoon style, no text.",
     "Children's book illustration: fun park with blue pond and yellow ducks, green trees, brown bench, NO dog, pond is BIGGER and wider, kite in blue sky. Cartoon style, no text."),
    
    ("🍳 美味厨房",
     "Children's book illustration: cozy kitchen with a wooden table, red apple, milk carton, bread loaf, two eggs, orange juice, window showing blue sky. Cartoon style, no text.",
     "Children's book illustration: cozy kitchen with a wooden table, GREEN apple, NO milk carton, bread loaf, two eggs, a cake added on table, window. Cartoon style, no text."),
    
    ("🏖️ 阳光沙滩",
     "Children's book illustration: sunny beach with red umbrella, colorful beach ball, seashells on golden sand, blue ocean waves, white clouds in sky. Cartoon style, no text.",
     "Children's book illustration: sunny beach with BLUE umbrella, NO beach ball, a sand castle added, seashells on golden sand, blue ocean, clouds. Cartoon style, no text."),
    
    ("🌲 森林动物",
     "Children's book illustration: green forest with big trees, a cute brown bear on the left, a white rabbit, an orange fox on the right, mushrooms, blue sky. Cartoon style, no text.",
     "Children's book illustration: green forest with big trees, a light brown bear, a white rabbit, NO fox, a colorful bird on a tree branch instead. Blue sky. Cartoon style, no text."),
]

def gen_img(prompt, path, max_retries=3):
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        print(f"  ⏭ 已存在 ({os.path.getsize(path)//1024}KB)")
        return True
    
    payload = {"model": "wan2.7-image-pro", "prompt": prompt, "n": 1, "size": "1024x768"}
    
    for attempt in range(max_retries):
        try:
            print(f"  🎨 生成中...", end=" ", flush=True)
            r = requests.post(f"{BASE}/images/generations", headers=HEADERS, json=payload, timeout=120)
            data = r.json()
            
            if "error" in data:
                print(f"❌ {data['error'].get('message','')[:80]}")
                if attempt < max_retries - 1: time.sleep(3)
                continue
            
            # Get image URL
            img_url = None
            if "data" in data and data["data"]:
                item = data["data"][0]
                img_url = item.get("url")
                if not img_url and "b64_json" in item:
                    import io
                    from PIL import Image
                    img = Image.open(io.BytesIO(base64.b64decode(item["b64_json"])))
                    img.save(path)
                    print(f"✅ ({os.path.getsize(path)//1024}KB)")
                    return True
            
            if img_url and img_url.startswith("http"):
                r2 = requests.get(img_url, timeout=60)
                with open(path, 'wb') as f: f.write(r2.content)
                print(f"✅ ({os.path.getsize(path)//1024}KB)")
                return True
            
            print(f"⚠ 无图片URL")
            if attempt < max_retries - 1: time.sleep(3)
            
        except Exception as e:
            print(f"❌ {e}")
            if attempt < max_retries - 1: time.sleep(3)
    
    return False

def main():
    print("🎨 开始AI生成10套找茬图片\n")
    
    for i, (name, orig_prompt, diff_prompt) in enumerate(SCENES):
        fid = f"scene_{i+1:02d}"
        orig_path = f"{OUT}/{fid}_orig.png"
        diff_path = f"{OUT}/{fid}_diff.png"
        
        print(f"[{i+1}/10] {name}")
        
        if gen_img(orig_prompt, orig_path) and gen_img(diff_prompt, diff_path):
            print(f"  ✅ 完成\n")
        else:
            print(f"  ❌ 失败\n")
        
        if i < len(SCENES) - 1:
            time.sleep(1)  # Rate limit
    
    # Count results
    done = sum(1 for f in os.listdir(OUT) if f.endswith("_orig.png") and os.path.getsize(f"{OUT}/{f}") > 10000)
    print(f"\n✅ 完成! {done}/10 场景已生成 -> {OUT}/")

if __name__ == "__main__":
    main()
