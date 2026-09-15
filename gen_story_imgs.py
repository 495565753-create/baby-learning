#!/usr/bin/env python3
"""补全+重做所有故事插图,使用一致性角色描述"""
import json, os, requests, time, urllib.parse, glob
from PIL import Image

API = 'https://image.pollinations.ai/prompt/'
BASE = '/Users/guoju/edu-app'

CHARACTERS = {
    'peppa': 'Peppa Pig, a pink pig wearing a red dress, cute cartoon style, children book illustration',
    'paw': 'Paw Patrol pups (Marshall the dalmatian firefighter, Chase the german shepherd police, Skye the cockapoo pilot, Rubble the bulldog builder), cute cartoon style, children book illustration',
    'judy': 'Judy Hopps, a grey rabbit in blue police uniform, from Zootopia Disney style, cute cartoon',
}

def gen_img(prompt, path):
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        return True
    url = API + urllib.parse.quote(prompt) + f'?width=1024&height=768&nologo=true&seed={hash(path)%1000}'
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

def main():
    stories = []
    for f in sorted(glob.glob(f'{BASE}/stories/peppa_*.json') + 
                    glob.glob(f'{BASE}/stories/paw_*.json') +
                    glob.glob(f'{BASE}/stories/judy_*.json')):
        try:
            with open(f) as fp: stories.append(json.load(fp))
        except: pass
    
    total = 0
    done = 0
    for s in stories:
        sid = s.get('id', '')
        series = sid.split('_')[0] if '_' in sid else ''
        char = CHARACTERS.get(series, 'cute cartoon')
        title = s.get('title', 'story')
        pages = s.get('pages', [])
        
        img_dir = f'{BASE}/img/{series}/{sid}'
        os.makedirs(img_dir, exist_ok=True)
        
        # Cover
        path = f'{img_dir}/cover.png'
        total += 1
        prompt = f"{char}, story cover: {title}, beautiful children book illustration, bright colors, simple, no text"
        if gen_img(prompt, path): done += 1; print(f'  ✅ {sid}/cover', flush=True)
        else: print(f'  ❌ {sid}/cover', flush=True)
        time.sleep(1)
        
        # Page illustrations
        for pi, page in enumerate(pages):
            path = f'{img_dir}/page{pi+1}.png'
            total += 1
            scene = page.get('text', page.get('text_zh', ''))[:100]
            prompt = f"{char}, scene: {scene}, children book illustration, bright colors, simple, no text"
            if gen_img(prompt, path): done += 1; print(f'  ✅ {sid}/page{pi+1}', flush=True)
            else: print(f'  ❌ {sid}/page{pi+1}', flush=True)
            time.sleep(1.5)
    
    print(f'\n📊 {done}/{total} images generated')

if __name__ == '__main__':
    main()
