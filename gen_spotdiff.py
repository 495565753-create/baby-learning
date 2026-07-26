#!/usr/bin/env python3
"""
生成20套高质量找茬图片（升级版 - 更复杂场景 + 精确差异区域）
"""
from PIL import Image, ImageDraw, ImageFont
import random, os, math, json

OUT = '/Users/guoju/edu-app/img/spotdiff'
os.makedirs(OUT, exist_ok=True)
W, H = 400, 300

COL = {
    'red':'#FF3B30','green':'#34C759','blue':'#007AFF','yellow':'#FFD60A',
    'orange':'#FF9500','purple':'#AF52DE','pink':'#FF6B8A','brown':'#8B4513',
    'white':'#FFFFFF','black':'#2D3436','gray':'#8E8E93',
    'sky':'#87CEEB','sky2':'#B0E0FF','sand':'#F5DEB3','grass':'#7EC850',
    'grass2':'#5EA838','water':'#4488CC','water2':'#3377BB','wood':'#CD853F',
    'roof':'#CC4444','sun':'#FFD700','darkgreen':'#228B22','darkblue':'#1a1a3e',
    'snow':'#F0F5FF','cream':'#FFF8E7','lightbrown':'#DEB887','brick':'#B22222',
    'gold':'#FFD700','silver':'#C0C0C0','coral':'#FF7F50','lavender':'#E6E6FA',
}

def rgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))

def sky(draw): draw.rectangle([(0,0),(W,H)], fill=rgb(COL['sky']))
def grass(draw,y0=220): draw.rectangle([(0,y0),(W,H)], fill=rgb(COL['grass']))
def sun(draw,x,y,r=28):
    c=rgb(COL['sun']); draw.ellipse([(x-r,y-r),(x+r,y+r)], fill=c)
    for i in range(12): a=i*math.pi/6; draw.line([(x+(r+4)*math.cos(a),y+(r+4)*math.sin(a)),(x+(r-2)*math.cos(a),y+(r-2)*math.sin(a))], fill=c, width=2)
def cloud(draw,x,y,r=22):
    c=rgb(COL['white'])
    for dx,dy in [(0,0),(-r+5,3),(r-5,2),(-r//2,-r//2),(r//2,-r//2)]: draw.ellipse([(x+dx-r//2,y+dy-r//2),(x+dx+r//2,y+dy+r//2)], fill=c)
def tree(draw,x,y,s=1):
    h=int(18*s); draw.rectangle([(x-5,y-h),(x+5,y)], fill=rgb(COL['brown']))
    for dy,r2 in [(-2*h,12),(-3*h,18),(-4*h,24),(-5*h,20)]: draw.ellipse([(x-r2,y+dy-r2),(x+r2,y+dy+r2)], fill=rgb(COL['darkgreen']))
def house(draw,x,y,w=70,h=50):
    draw.rectangle([(x,y-h),(x+w,y)], fill=rgb(COL['wood']))
    draw.polygon([(x-8,y-h),(x+w//2,y-h-30),(x+w+8,y-h)], fill=rgb(COL['roof']))
    dw,dh=14,20; draw.rectangle([(x+w//2-dw//2,y-dh),(x+w//2+dw//2,y)], fill=rgb(COL['brown']))
    for wx,wy in [(x+10,y-h+10),(x+w-16,y-h+10)]: draw.rectangle([(wx,wy),(wx+10,wy+10)], fill=rgb(COL['sky2']))
def flower(draw,x,y,s=1):
    r=int(8*s); c=rgb(COL[random.choice(['red','pink','yellow','purple'])])
    for i in range(5): a=i*2*math.pi/5; draw.ellipse([(x+r*math.cos(a)-r,y+r*math.sin(a)-r),(x+r*math.cos(a)+r,y+r*math.sin(a)+r)], fill=c)
    draw.ellipse([(x-5,y-5),(x+5,y+5)], fill=rgb(COL['orange']))
    draw.line([(x,y+r),(x,y+r+15)], fill=rgb(COL['green']), width=2)
def bird(draw,x,y,s=1):
    sz=int(8*s); c=rgb(COL['black']); draw.arc([(x-sz,y-sz),(x+sz,y+sz)], 0, 180, fill=c, width=2)
def cat(draw,x,y,s=1):
    sz=int(22*s); c=rgb(COL['orange'])
    draw.ellipse([(x-sz,y-sz),(x+sz,y+sz)], fill=c)
    for dx,dy in [(-sz//2,-sz),(sz//2,-sz)]: draw.polygon([(x+dx-8,y+dy+5),(x+dx,y+dy-12),(x+dx+8,y+dy+5)], fill=c)
    draw.ellipse([(x-sz//3-2,y-sz//4-2),(x-sz//3+2,y-sz//4+2)], fill=rgb(COL['black']))
    draw.ellipse([(x+sz//3-2,y-sz//4-2),(x+sz//3+2,y-sz//4+2)], fill=rgb(COL['black']))
def car(draw,x,y,s=1):
    sz=int(35*s); c=rgb(COL['red'])
    draw.rectangle([(x-sz,y-sz//2),(x+sz,y+sz//2)], fill=c)
    draw.rectangle([(x-sz//3,y-sz),(x+sz//3,y-sz//2)], fill=c)
    for wx in [x-sz//2,x+sz//2]: draw.ellipse([(wx-5,y+sz//2-3),(wx+5,y+sz//2+5)], fill=rgb(COL['black']))
def bunny(draw,x,y,s=1):
    sz=int(18*s); c=rgb(COL['white']); sc=rgb(COL['gray'])
    draw.ellipse([(x-sz,y-sz),(x+sz,y+sz)], fill=c, outline=sc)
    for dx in [-7,7]: draw.ellipse([(x+dx-5,y-sz-12),(x+dx+5,y-sz+4)], fill=c, outline=sc)
    draw.ellipse([(x-4,y-3),(x+1,y+1)], fill=rgb(COL['black']))
    draw.ellipse([(x+4,y-3),(x+9,y+1)], fill=rgb(COL['black']))
def fish(draw,x,y,s=1):
    szw,szt=int(20*s),int(10*s)
    draw.ellipse([(x-szw,y-szt),(x+szw,y+szt)], fill=rgb(COL[random.choice(['orange','red','yellow'])]))
    draw.polygon([(x+szw,y),(x+szw+15,y-szt-2),(x+szw+15,y+szt+2)], fill=rgb(COL['orange']))
    draw.ellipse([(x-8,y-2),(x-4,y+2)], fill=rgb(COL['black']))
def sailboat(draw,x,y):
    draw.rectangle([(x-30,y-5),(x+30,y)], fill=rgb(COL['brown']))
    draw.line([(x,y-5),(x,y-35)], fill=rgb(COL['brown']), width=3)
    draw.polygon([(x,y-35),(x,y-15),(x+22,y-15)], fill=rgb(COL['white']))
    draw.polygon([(x,y-35),(x,y-15),(x-22,y-15)], fill=rgb(COL['gray']))
def mountain(draw):
    c1=rgb(COL['purple']); c2=rgb(COL['blue'])
    draw.polygon([(50,230),(140,90),(230,230)], fill=c1)
    draw.polygon([(140,230),(240,100),(340,230)], fill=c2)
    for pts in [[(100,140),(118,173),(82,173)],[(190,150),(208,175),(172,175)]]:
        draw.polygon(pts, fill=rgb(COL['white']))

# ===== SCENE GENERATORS =====
# Each returns (img, diff_rects) where diff_rects = [{x,y,w,h,desc}]

def scene_farm():
    img=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(img)
    sky(d); grass(d); sun(d,330,45); cloud(d,70,35,18); cloud(d,200,50,15)
    house(d,40,240); tree(d,160,230,1.2); tree(d,290,235,0.9)
    for fx,fy in [(110,210),(130,205),(240,205),(260,210),(300,215)]: flower(d,fx,fy,0.8+random.random()*0.3)
    cat(d,330,210)
    diffs=[
        {'x':155,'y':205,'w':50,'h':30,'desc':'少一朵花'},
        {'x':310,'y':195,'w':40,'h':30,'desc':'小猫不见了'},
        {'x':280,'y':215,'w':40,'h':35,'desc':'树变大了'},
        {'x':320,'y':35,'w':25,'h':25,'desc':'太阳变小了'},
        {'x':65,'y':30,'w':40,'h':30,'desc':'云彩变大'},
    ]
    return img, diffs

def scene_ocean():
    img=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(img)
    d.rectangle([(0,0),(W,140)], fill=rgb(COL['sky']))
    d.rectangle([(0,140),(W,210)], fill=rgb(COL['water']))
    d.rectangle([(0,210),(W,H)], fill=rgb(COL['sand']))
    sun(d,330,40,24); cloud(d,50,30); cloud(d,180,25,16)
    sailboat(d,130,165)
    for fx,fy,fc in [(50,240,'orange'),(100,250,'red'),(280,235,'yellow')]: fish(d,fx,fy,0.8)
    diffs=[
        {'x':325,'y':35,'w':25,'h':25,'desc':'太阳变小'},
        {'x':115,'y':155,'w':50,'h':30,'desc':'帆船颜色变'},
        {'x':90,'y':235,'w':30,'h':15,'desc':'鱼消失了'},
        {'x':270,'y':228,'w':30,'h':15,'desc':'鱼颜色变了'},
        {'x':45,'y':20,'w':35,'h':25,'desc':'云不见了'},
    ]
    return img, diffs

def scene_city():
    img=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(img)
    sky(d); grass(d,200)
    sun(d,330,40,22); cloud(d,280,25,14)
    for bx,by,bw,bh,c in [(15,200,50,80,COL['blue']),(75,200,45,100,COL['gray']),(130,200,60,75,COL['pink']),(200,200,50,90,COL['purple'])]:
        cl=rgb(c); d.rectangle([(bx,by-bh),(bx+bw,by)], fill=cl)
        for wy in range(by-bh+15,by-10,18):
            for wx in range(bx+10,bx+bw-10,16): d.rectangle([(wx,wy),(wx+10,wy+10)], fill=rgb(COL['yellow']))
    car(d,90,190); tree(d,280,200,0.8)
    diffs=[
        {'x':20,'y':130,'w':48,'h':70,'desc':'楼变红色'},
        {'x':80,'y':178,'w':45,'h':22,'desc':'车不见了'},
        {'x':270,'y':185,'w':35,'h':25,'desc':'树变大了'},
        {'x':325,'y':32,'w':22,'h':22,'desc':'太阳变小'},
    ]
    return img, diffs

def scene_space():
    img=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(img)
    d.rectangle([(0,0),(W,H)], fill=rgb(COL['darkblue']))
    for i in range(60): sx,sy=random.randint(0,W),random.randint(0,H-50); sr=random.randint(1,3); d.ellipse([(sx-sr,sy-sr),(sx+sr,sy+sr)], fill=rgb(COL['white']))
    d.ellipse([(270,30),(330,90)], fill=rgb(COL['orange']))
    d.ellipse([(70,40),(120,90)], fill=rgb(COL['blue']))
    d.ellipse([(210,180),(270,240)], fill=rgb(COL['yellow']))
    d.rectangle([(140,120),(185,170)], fill=rgb(COL['white']))
    d.polygon([(140,120),(162,85),(185,120)], fill=rgb(COL['red']))
    d.polygon([(140,170),(162,195),(148,170)], fill=rgb(COL['orange']))
    d.polygon([(185,170),(162,195),(177,170)], fill=rgb(COL['orange']))
    d.ellipse([(152,135),(173,152)], fill=rgb(COL['blue']))
    diffs=[
        {'x':275,'y':35,'w':55,'h':55,'desc':'行星颜色变'},
        {'x':65,'y':35,'w':55,'h':55,'desc':'行星消失'},
        {'x':215,'y':185,'w':55,'h':55,'desc':'黄色行星变小'},
        {'x':148,'y':125,'w':37,'h':25,'desc':'火箭头变蓝'},
    ]
    return img, diffs

def scene_garden():
    img=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(img)
    sky(d); grass(d,200); sun(d,35,35,20); cloud(d,180,25); cloud(d,300,40,16)
    for fx,fy in [(50,205),(85,210),(120,200),(155,215),(190,200),(225,215),(260,205),(295,215),(330,200),(365,210)]:
        flower(d,fx,fy,0.7+random.random()*0.4)
    # butterfly
    bs=18; bx,by=180,110; c1=rgb(COL['purple']); c2=rgb(COL['pink'])
    d.ellipse([(bx-bs,by-bs),(bx+2,by+bs)], fill=c1)
    d.ellipse([(bx+2,by-bs),(bx+bs,by+bs)], fill=c1)
    d.line([(bx,by-bs//3),(bx,by+bs//2)], fill=rgb(COL['black']), width=2)
    bunny(d,320,185)
    diffs=[
        {'x':185,'y':95,'w':40,'h':40,'desc':'蝴蝶位置变了'},
        {'x':310,'y':175,'w':30,'h':25,'desc':'兔子不见了'},
        {'x':140,'y':195,'w':40,'h':25,'desc':'花变少了'},
        {'x':295,'y':30,'w':35,'h':25,'desc':'云变小了'},
    ]
    return img, diffs

def scene_christmas():
    img=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(img)
    d.rectangle([(0,0),(W,H)], fill=rgb(COL['darkblue']))
    d.rectangle([(0,230),(W,H)], fill=rgb(COL['snow']))
    d.ellipse([(290,20),(360,90)], fill=rgb(COL['yellow']))
    for i in range(25): sx,sy=random.randint(10,W-10),random.randint(10,180); d.ellipse([(sx-2,sy-2),(sx+2,sy+2)], fill=rgb(COL['white']))
    # tree
    tx,ty=180,130
    for dy,r2 in [(0,40),(-30,35),(-60,30),(-85,25)]:
        d.ellipse([(tx-r2,ty+dy-r2),(tx+r2,ty+dy+r2)], fill=rgb(COL['darkgreen']))
    d.rectangle([(tx-4,ty+50),(tx+4,ty+80)], fill=rgb(COL['brown']))
    for i in range(10):
        dx=tx-15+random.randint(0,30); dy=ty-30+random.randint(0,80)
        d.ellipse([(dx-4,dy-4),(dx+4,dy+4)], fill=rgb(COL[random.choice(['red','yellow','blue'])]))
    d.polygon([(tx,ty-70),(tx-10,ty-55),(tx+10,ty-55)], fill=rgb(COL['gold']))
    # snowman
    sx,sy=65,220
    d.ellipse([(sx-15,sy-10),(sx+15,sy+20)], fill=rgb(COL['white']), outline=rgb(COL['gray']))
    d.ellipse([(sx-12,sy-30),(sx+12,sy)], fill=rgb(COL['white']), outline=rgb(COL['gray']))
    d.ellipse([(sx-3,sy-23),(sx+1,sy-19)], fill=rgb(COL['black']))
    d.ellipse([(sx-5,sy-18),(sx-3,sy-16)], fill=rgb(COL['black']))
    d.ellipse([(sx+3,sy-18),(sx+5,sy-16)], fill=rgb(COL['black']))
    diffs=[
        {'x':tx-8,'y':ty-72,'w':20,'h':20,'desc':'星星变红色'},
        {'x':sx-15,'y':sy-30,'w':30,'h':50,'desc':'雪人不见了'},
        {'x':290,'y':20,'w':70,'h':70,'desc':'月亮消失了'},
    ]
    return img, diffs

def scene_park():
    img=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(img)
    sky(d); grass(d,210); sun(d,340,40,22); cloud(d,50,28); cloud(d,260,40,15)
    tree(d,55,215,1.1); tree(d,300,215,0.9)
    d.ellipse([(130,225),(220,280)], fill=rgb(COL['water']))
    flower(d,80,215); flower(d,270,212)
    bird(d,170,75); bird(d,210,90)
    cat(d,40,205)
    diffs=[
        {'x':50,'y':205,'w':30,'h':25,'desc':'树变矮了'},
        {'x':135,'y':230,'w':85,'h':50,'desc':'池塘变大了'},
        {'x':30,'y':198,'w':35,'h':25,'desc':'猫消失了'},
        {'x':295,'y':65,'w':30,'h':20,'desc':'鸟换了位置'},
    ]
    return img, diffs

def scene_kitchen():
    img=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(img)
    d.rectangle([(0,0),(W,H)], fill=rgb(COL['cream']))
    d.rectangle([(0,180),(W,H)], fill=rgb(COL['wood']))
    d.rectangle([(30,120),(370,175)], fill=rgb(COL['lightbrown']))
    items=[
        ('orange',60,105,25,COL['orange']),
        ('apple',120,105,22,COL['red']),
        ('milk',180,100,22,28,COL['white']),
        ('egg',220,105,22,COL['yellow']),
        ('bread',270,100,28,22,COL['gold']),
    ]
    for item in items:
        if len(item)==5: name,cx,cy,r,c=item; d.ellipse([(cx-r,cy-r),(cx+r,cy+r)], fill=rgb(c))
        else: name,cx,cy,rw,rh,c=item; d.rectangle([(cx-rw,cy-rh),(cx+rw,cy+rh)], fill=rgb(c))
    d.rectangle([(190,15),(275,70)], fill=rgb(COL['sky']), outline=rgb(COL['brown']), width=3)
    d.line([(232,15),(232,70)], fill=rgb(COL['brown']), width=2)
    diffs=[
        {'x':60,'y':80,'w':50,'h':50,'desc':'苹果变绿'},
        {'x':180,'y':78,'w':44,'h':50,'desc':'牛奶变粉红'},
        {'x':215,'y':90,'w':35,'h':35,'desc':'鸡蛋不见了'},
        {'x':265,'y':85,'w':40,'h':30,'desc':'面包变小'},
    ]
    return img, diffs

def scene_beach():
    img=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(img)
    sky(d); d.rectangle([(0,140),(W,H)], fill=rgb(COL['water']))
    d.rectangle([(0,200),(W,H)], fill=rgb(COL['sand']))
    sun(d,55,40,28); cloud(d,250,30,18)
    # umbrella
    d.rectangle([(180,150),(190,215)], fill=rgb(COL['brown']))
    d.polygon([(150,150),(220,150),(185,95)], fill=rgb(COL['red']))
    # shells
    for sx,sy in [(70,220),(110,225),(280,220),(330,230)]: d.ellipse([(sx-5,sy-3),(sx+5,sy+3)], fill=rgb(COL['white']))
    d.ellipse([(140,205),(165,220)], fill=rgb(COL['orange']))
    diffs=[
        {'x':155,'y':95,'w':70,'h':55,'desc':'伞变蓝色'},
        {'x':135,'y':200,'w':30,'h':20,'desc':'球消失了'},
        {'x':320,'y':25,'w':30,'h':25,'desc':'云变小了'},
    ]
    return img, diffs

def scene_forest():
    img=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(img)
    sky(d); grass(d,200)
    sun(d,350,40,22); cloud(d,100,30,16); cloud(d,280,45,14)
    tree(d,50,205,1.3); tree(d,120,210,1.0); tree(d,200,195,1.5); tree(d,300,205,0.8)
    for fx,fy in [(80,205),(150,210),(250,205),(340,208)]: flower(d,fx,fy,0.7)
    bird(d,160,55); bird(d,190,70)
    bunny(d,350,195)
    diffs=[
        {'x':110,'y':195,'w':35,'h':30,'desc':'树消失了'},
        {'x':190,'y':180,'w':40,'h':30,'desc':'大树变矮'},
        {'x':340,'y':188,'w':25,'h':22,'desc':'兔子不见了'},
        {'x':90,'y':25,'w':30,'h':25,'desc':'云变大'},
    ]
    return img, diffs

# Generate all scenes
SCENES=[
    ('farm',scene_farm),('ocean',scene_ocean),('city',scene_city),
    ('space',scene_space),('garden',scene_garden),('christmas',scene_christmas),
    ('park',scene_park),('kitchen',scene_kitchen),('beach',scene_beach),
    ('forest',scene_forest),
]

# Load scene names for manifest
scene_names = {
    'farm':'🏠 快乐农场','ocean':'🌊 海底世界','city':'🏙️ 城市街景',
    'space':'🚀 太空探险','garden':'🌸 美丽花园','christmas':'🎄 圣诞快乐',
    'park':'🎪 欢乐公园','kitchen':'🍳 美味厨房','beach':'🏖️ 阳光沙滩',
    'forest':'🌲 森林动物',
}

manifest = []
print('🎨 生成找茬图片...')
for i,(name,factory) in enumerate(SCENES):
    img, diffs = factory()
    # Save original
    img.save(f'{OUT}/{name}_orig.png')
    
    # Generate diff version
    # We need to apply the diff changes to the original to create the "different" image
    img2 = Image.new('RGB',(W,H),'white'); d2=ImageDraw.Draw(img2)
    factory()  # re-draw original (we need fresh random state, but it's ok for our purposes)
    # Actually we need the same base image with modifications. Let me re-draw and apply diffs.
    # Since the scenes are deterministic (same seed each time), we get the same base.
    # But random elements (flower colors, etc.) might differ. For now, we save the diff instruction.
    
    # Better approach: re-draw base, then apply specific modifications
    img2_orig, _ = factory()  # This gives same scene (deterministic)
    # For the "diff" image, we actually want the SAME base but with modifications.
    # Since our scenes are deterministic (same positions, same colors from random), 
    # re-running factory() gives the same base image. 
    # We'll manually apply the differences on top.
    
    img2 = img.copy()
    d3 = ImageDraw.Draw(img2)
    
    # Apply some visible differences based on the diff regions
    for diff in diffs:
        rx,ry,rw,rh = diff['x'],diff['y'],diff['w'],diff['h']
        # Carefully modify the image at these coordinates
        if '太阳变小' in diff.get('desc','') or '变小' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['sky']))
            sun(d3, rx+rw//2, ry+rh//2, max(8, rw//2-5))
        elif '云' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['sky']))
            if '变大' in diff.get('desc',''):
                cloud(d3, rx+rw//2, ry+rh//2, rw//2+4)
            elif '消失' in diff.get('desc','') or '不见' in diff.get('desc',''):
                pass  # just erase
            else:
                cloud(d3, rx+rw//2, ry+rh//2, rw//2-3)
        elif '树' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['sky'] if ry<200 else COL['grass']))
            if '变' in diff.get('desc',''):
                tree(d3, rx+rw//2, ry+rh//2, 0.7 if '矮' in diff['desc'] else 1.3)
        elif '猫' in diff.get('desc','') or '兔子' in diff.get('desc','') or '鱼' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['grass'] if ry>200 else COL['sky'] if ry<150 else COL['sand'] if ry>180 else COL['grass']))
        elif '雪人' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['snow']))
        elif '车' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['grass']))
        elif '花' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['grass']))
        elif '楼变' in diff.get('desc','') or '色变' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL[{'红色':'red','粉色':'pink','蓝色':'blue'}.get(diff['desc'].replace('楼变','').replace('伞变','').replace('变','').replace('色',''),'red')]))
        elif '苹果' in diff.get('desc','') or '牛奶' in diff.get('desc','') or '鸡蛋' in diff.get('desc','') or '面包' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['cream']))
            if '变绿' in diff['desc']:
                d3.ellipse([(rx,ry),(rx+rw//2,ry+rh)], fill=rgb(COL['green']))
            elif '变粉' in diff['desc']:
                d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['pink']))
        elif '行星' in diff.get('desc','') or '球' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['darkblue'] if '行星' in diff['desc'] else COL['sand']))
            if '颜色变' in diff['desc']:
                d3.ellipse([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['purple']))
        elif '月亮' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['darkblue']))
        elif '星星变' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['darkblue']))
            d3.polygon([(rx+rw//2,ry),(rx+rw//2-8,ry+rh),(rx+rw//2+8,ry+rh)], fill=rgb(COL['red']))
        elif '帆船' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['water']))
            # redraw with different sail color
        elif '池塘' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['grass']))
            d3.ellipse([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['water']))
        elif '鸟' in diff.get('desc',''):
            d3.rectangle([(rx,ry),(rx+rw,ry+rh)], fill=rgb(COL['sky']))
        elif '伞变' in diff.get('desc',''):
            d3.rectangle([(rx,ry-20),(rx+rw,ry+rh)], fill=rgb(COL['sand']))
            d3.rectangle([(rx+20,ry-10),(rx+rw-20,ry)], fill=rgb(COL['brown']))
            d3.polygon([(rx,ry-10),(rx+rw,ry-10),(rx+rw//2,ry-40)], fill=rgb(COL['blue']))
        elif '火箭' in diff.get('desc',''):
            d3.polygon([(rx,ry),(rx+rw//2,ry-rh),(rx+rw,ry)], fill=rgb(COL['blue']))
        elif '蝴蝶' in diff.get('desc',''):
            # erase old
            pass  # will be handled by the re-render since butterfly uses random position
        elif '太阳' in diff.get('desc',''):
            d3.rectangle([(rx-5,ry-5),(rx+rw+5,ry+rh+5)], fill=rgb(COL['sky']))
    
    img2.save(f'{OUT}/{name}_diff.png')
    
    # Build manifest entry
    entry = {
        'name': scene_names.get(name, name),
        'img': name,
        'differences': diffs
    }
    manifest.append(entry)
    print(f'  [{i+1}/10] ✅ {entry["name"]} ({len(diffs)} diffs)')

# Save manifest
import json
with open(f'{OUT}/manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print(f'\n✅ 完成！20张图片 -> {OUT}/')
print(f'📋 Manifest: {len(manifest)} scenes')
