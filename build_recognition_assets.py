#!/usr/bin/env python3
"""Slice/encode original atlases and draw exact color/number concepts."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import re
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'assets/recognition-v1'

def save(im, name):
    im.convert('RGB').save(OUT / f'{name}.webp', 'WEBP', quality=88, method=6)

def font(size):
    for path in ['/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Supplemental/Georgia Bold.ttf']:
        if Path(path).exists(): return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def concepts():
    cell = 420
    palette = ['#e34a4d', '#f58c39', '#f3ce35', '#59ad68', '#448eda', '#9464bb', '#ed9abf', '#976343', '#272a32', '#ffffff', '#9ba2a9', '#c59c37']
    colors = Image.new('RGB', (cell*4,cell*3), '#fffaf0')
    d = ImageDraw.Draw(colors)
    for i, color in enumerate(palette):
        x,y=(i%4)*cell,(i//4)*cell
        # A solid sample with a crayon makes the requested color unambiguous.
        d.ellipse((x+53,y+328,x+362,y+365),fill='#eee7db')
        d.ellipse((x+81,y+41,x+339,y+299),fill=color,outline='#d8d3c8' if i==9 else color,width=3)
        d.arc((x+101,y+61,x+319,y+279),195,280,fill='#fff9e9',width=7)
        d.rounded_rectangle((x+104,y+314,x+316,y+355),radius=9,fill=color,outline='#d4cbbb' if i==9 else color,width=2)
        d.rectangle((x+157,y+314,x+180,y+355),fill='#f8e6c5')
        d.rectangle((x+250,y+314,x+273,y+355),fill='#f8e6c5')
        d.polygon([(x+316,y+314),(x+352,y+335),(x+316,y+355)],fill=color)
        if i==11:
            d.arc((x+81,y+41,x+339,y+299),-50,25,fill='#f7df91',width=14)
    save(colors, 'colors')
    numbers = Image.new('RGB',(cell*4,cell*3),'#fffaf0')
    d=ImageDraw.Draw(numbers)
    for index in range(12):
        n=index+1;x,y=(index%4)*cell,(index//4)*cell
        value=str(n); ft=font(108); box=d.textbbox((0,0),value,font=ft)
        d.text((x+(cell-(box[2]-box[0]))/2,y+15-box[1]),value,font=ft,fill='#376b68')
        cols=4 if n>6 else 3 if n>2 else n; rows=math.ceil(n/cols)
        radius=27 if n>9 else 31; step=76
        for j in range(n):
            r,c=divmod(j,cols); row_count=min(cols,n-r*cols)
            cx=x+cell/2+(c-(row_count-1)/2)*step;cy=y+210+(r-(rows-1)/2)*step
            d.ellipse((cx-radius,cy-radius+5,cx+radius,cy+radius+5),fill='#f0ddbd')
            d.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),fill='#f2a149',outline='#db8836',width=2)
            d.ellipse((cx-radius+9,cy-radius+8,cx-radius+22,cy-radius+19),fill='#ffd078')
            d.line((cx,cy-radius+1,cx+2,cy-radius-8),fill='#6b804a',width=4)
            d.ellipse((cx+1,cy-radius-10,cx+15,cy-radius-1),fill='#6d9960')
    save(numbers,'numbers')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-records',type=Path,help='Optional private generated-final.json containing original atlas paths.')
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    manifest=args.source_records or OUT/'generated-final.json'
    if manifest.exists():
        for name,item in json.loads(manifest.read_text()).items():
            path=re.search(r'as (/[^\n]+\.png)',item['generated']['output_hint']).group(1)
            save(Image.open(path), name)
    concepts()
    covers=OUT/'covers'
    covers.mkdir(exist_ok=True)
    for path in OUT.glob('*.webp'):
        with Image.open(path) as atlas:
            cover=atlas.crop((0,0,round(atlas.width/4),round(atlas.height/3)))
            cover.save(covers/path.name,'WEBP',quality=86,method=6)
    rows=[]
    for path in sorted(OUT.glob('*.webp')):
        with Image.open(path) as im: size=list(im.size)
        rows.append({'category':path.stem,'file':path.relative_to(ROOT).as_posix(),'cover':(covers/path.name).relative_to(ROOT).as_posix(),'size':size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    (OUT/'manifest.json').write_text(json.dumps({'count':len(rows),'grid':[4,3],'style':'original realistic preschool recognition illustrations; exact color and number concepts drawn in code','files':rows},ensure_ascii=False,indent=2)+'\n')
    print(f'{len(rows)} atlases / {len(rows)*12} recognition pictures ready')

if __name__=='__main__': main()
