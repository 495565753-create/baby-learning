#!/usr/bin/env python3
"""
生成20套找茬图片 + 10幅涂色线稿
使用Pillow生成真正的卡通场景
"""
from PIL import Image, ImageDraw, ImageFont
import random, os, math

OUT = '/Users/guoju/edu-app/img'
os.makedirs(f'{OUT}/spotdiff', exist_ok=True)
os.makedirs(f'{OUT}/coloring', exist_ok=True)

W, H = 400, 300
COLORS = {
    'red':'#FF4444','green':'#44BB44','blue':'#4488FF','yellow':'#FFDD44',
    'orange':'#FF8844','purple':'#AA44FF','pink':'#FF88AA','brown':'#8B5E3C',
    'white':'#FFFFFF','black':'#000000','gray':'#AAAAAA','darkgreen':'#228B22',
    'sky':'#87CEEB','sand':'#F5DEB3','grass':'#90EE90','water':'#4488CC',
    'wood':'#CD853F','roof':'#CC4444','sun':'#FFD700',
}

def hex2rgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))

def draw_sky(draw, w=W, h=H):
    for y in range(h): draw.line([(0,y),(w,y)], fill=hex2rgb(COLORS['sky']))
def draw_grass(draw, y0=220):
    draw.rectangle([(0,y0),(W,H)], fill=hex2rgb(COLORS['grass']))

def draw_sun(draw, x, y, r=30):
    c = hex2rgb(COLORS['sun']); draw.ellipse([(x-r,y-r),(x+r,y+r)], fill=c)
    for i in range(12):
        a = i*math.pi/6; x1=x+(r+6)*math.cos(a); y1=y+(r+6)*math.sin(a)
        x2=x+(r+2)*math.cos(a); y2=y+(r+2)*math.sin(a)
        draw.line([(x1,y1),(x2,y2)], fill=c, width=3)

def draw_tree(draw, x, y, size=1):
    s=int(20*size); draw.rectangle([(x-6,y-s),(x+6,y)], fill=hex2rgb(COLORS['brown']))
    for dy,cx in [(-2*s,0),(-3*s,0),(-4*s,0),(-5*s,0)]:
        r=s+2; draw.ellipse([(x-r,y+dy-r),(x+r,y+dy+r)], fill=hex2rgb(COLORS['darkgreen']))

def draw_house(draw, x, y, w=80, h=60):
    draw.rectangle([(x,y-h),(x+w,y)], fill=hex2rgb(COLORS['wood']))
    pts=[(x-10,y-h),(x+w//2,y-h-35),(x+w+10,y-h)]
    draw.polygon(pts, fill=hex2rgb(COLORS['roof']))
    dw,dh=16,22; draw.rectangle([(x+w//2-dw//2,y-(h-dh)),(x+w//2+dw//2,y)], fill=hex2rgb(COLORS['brown']))

def draw_flower(draw, x, y, size=1):
    r=int(8*size); c=hex2rgb(COLORS[random.choice(['red','pink','yellow','purple'])])
    for i in range(5):
        a=i*math.pi*2/5; cx=x+r*math.cos(a); cy=y+r*math.sin(a)
        draw.ellipse([(cx-r,cy-r),(cx+r,cy+r)], fill=c)
    draw.ellipse([(x-r,y-r),(x+r,y+r)], fill=hex2rgb(COLORS['orange']))
    draw.line([(x,y+r),(x,y+r+int(20*size))], fill=hex2rgb(COLORS['green']), width=3)

def draw_cloud(draw, x, y, r=25):
    c=hex2rgb(COLORS['white'])
    for dx,dy in [(0,0),(-r+5,3),(r-5,2),(-r//2,-r//2+3),(r//2,-r//2+2)]:
        draw.ellipse([(x+dx-r//2,y+dy-r//2),(x+dx+r//2,y+dy+r//2)], fill=c)

def draw_bird(draw, x, y, size=1):
    s=int(8*size); c=hex2rgb(COLORS['black'])
    draw.arc([(x-s,y-s),(x+s,y+s)], 0, 180, fill=c, width=2)

def draw_cat(draw, x, y, size=1):
    s=int(25*size); c=hex2rgb(COLORS['orange'])
    draw.ellipse([(x-s,y-s),(x+s,y+s)], fill=c)
    for dx,dy in [(-s//2,-s),(s//2,-s)]:
        pts=[(x+dx-10,y+dy+5),(x+dx,y+dy-15),(x+dx+10,y+dy+5)]
        draw.polygon(pts, fill=c)
    draw.ellipse([(x-s//3-2,y-s//4-2),(x-s//3+2,y-s//4+2)], fill=hex2rgb(COLORS['black']))
    draw.ellipse([(x+s//3-2,y-s//4-2),(x+s//3+2,y-s//4+2)], fill=hex2rgb(COLORS['black']))
    draw.ellipse([(x-3,y-1),(x+3,y+3)], fill=hex2rgb(COLORS['pink']))

def draw_car(draw, x, y, size=1):
    s=int(40*size); c=hex2rgb(COLORS['red'])
    draw.rectangle([(x-s,y-s//2),(x+s,y+s//2)], fill=c)
    draw.rectangle([(x-s//3,y-s),(x+s//3,y-s//2)], fill=c)
    draw.ellipse([(x-s//2-6,y+s//2-4),(x-s//2+6,y+s//2+6)], fill=hex2rgb(COLORS['black']))
    draw.ellipse([(x+s//2-6,y+s//2-4),(x+s//2+6,y+s//2+6)], fill=hex2rgb(COLORS['black']))

def draw_butterfly(draw, x, y, size=1):
    s=int(18*size); c1=hex2rgb(COLORS['purple']); c2=hex2rgb(COLORS['pink'])
    draw.ellipse([(x-s,y-s),(x+2,y+s)], fill=c1)
    draw.ellipse([(x+2,y-s),(x+s,y+s)], fill=c1)
    draw.ellipse([(x-s//2,y-s+s//2),(x+2,y+s)], fill=c2)
    draw.ellipse([(x-2,y-s+s//2),(x+s//2,y+s)], fill=c2)
    draw.line([(x,y-s//3),(x,y+s//2)], fill=hex2rgb(COLORS['black']), width=2)

def draw_bunny(draw, x, y, size=1):
    s=int(20*size); c=hex2rgb(COLORS['white']); sc=hex2rgb(COLORS['gray'])
    draw.ellipse([(x-s,y-s),(x+s,y+s)], fill=c, outline=sc)
    for dx in [-8,8]:
        draw.ellipse([(x+dx-6,y-s-15),(x+dx+6,y-s+5)], fill=c, outline=sc)
    draw.ellipse([(x-4,y-4),(x+1,y+1)], fill=hex2rgb(COLORS['black']))
    draw.ellipse([(x+4,y-4),(x+9,y+1)], fill=hex2rgb(COLORS['black']))
    draw.ellipse([(x-1,y+1),(x+4,y+4)], fill=hex2rgb(COLORS['pink']))

# ===== SCENE GENERATORS =====
# Each returns (draw_fn, diff_fn) where diff_fn modifies the scene

def scene_farm():
    def draw_scene(draw, variant='orig'):
        draw_sky(draw); draw_grass(draw); draw_sun(draw, 340, 50)
        draw_cloud(draw, 80, 40); draw_cloud(draw, 220, 65)
        draw_house(draw, 50, 240, 70, 50)
        draw_tree(draw, 180, 230, 1.3)
        draw_tree(draw, 300, 240, 0.9)
        draw_flower(draw, 130, 205); draw_flower(draw, 250, 215)
        draw_cat(draw, 330, 210)
    def diff_fn(draw):
        draw_grass(draw)  # cover old
        draw_flower(draw, 170, 205)  # extra flower
        draw_rectangle_filled(draw, 320, 200, 345, 225, hex2rgb(COLORS['grass']))  # remove cat
        draw_tree(draw, 300, 240, 1.3)  # tree bigger
        draw_sun(draw, 340, 50, 25)  # sun smaller
    return draw_scene, diff_fn

def draw_rectangle_filled(draw, x1, y1, x2, y2, color):
    draw.rectangle([(x1,y1),(x2,y2)], fill=color)

def scene_ocean():
    def draw_scene(draw, variant='orig'):
        draw.rectangle([(0,0),(W,H)], fill=hex2rgb(COLORS['water']))
        draw.rectangle([(0,220),(W,H)], fill=hex2rgb(COLORS['sand']))
        draw_sun(draw, 350, 45, 28)
        draw_cloud(draw, 60, 35); draw_cloud(draw, 200, 20)
        # boat
        draw.polygon([(100,190),(160,190),(180,220),(80,220)], fill=hex2rgb(COLORS['brown']))
        draw.line([(130,190),(130,140)], fill=hex2rgb(COLORS['brown']), width=3)
        draw.polygon([(130,140),(130,170),(175,170)], fill=hex2rgb(COLORS['white']))
        # fish
        for fx,fy,fc in [(250,180,'orange'),(300,200,'red'),(220,230,'yellow')]:
            draw.ellipse([(fx-15,fy-8),(fx+15,fy+8)], fill=hex2rgb(COLORS[fc]))
            draw.polygon([(fx+15,fy),(fx+28,fy-12),(fx+28,fy+12)], fill=hex2rgb(COLORS[fc]))
            draw.ellipse([(fx-8,fy-2),(fx-4,fy+2)], fill=hex2rgb(COLORS['black']))
    def diff_fn(draw):
        draw.rectangle([(0,220),(W,H)], fill=hex2rgb(COLORS['sand']))
        draw_sun(draw, 350, 45, 20)  # smaller sun
        draw.rectangle([(238,188),(278,218)], fill=hex2rgb(COLORS['sand']))  # remove middle fish
        draw.ellipse([(215,225),(235,245)], fill=hex2rgb(COLORS['sand']))  # remove right fish
        draw.polygon([(100,190),(160,190),(185,220),(75,220)], fill=hex2rgb(COLORS['brown']))  # boat different
    return draw_scene, diff_fn

def scene_city():
    def draw_scene(draw, variant='orig'):
        draw_sky(draw); draw_grass(draw, 200)
        draw_sun(draw, 340, 40, 25)
        draw_cloud(draw, 300, 20)
        # buildings
        for bx,by,bw,bh,c in [(20,200,60,90,'blue'),(90,200,50,120,'gray'),(150,200,70,80,'purple'),(230,200,55,110,'pink')]:
            draw.rectangle([(bx,by-bh),(bx+bw,by)], fill=hex2rgb(COLORS[c]))
            for ry in range(by-bh+15,by-10,20):
                for rx in range(bx+10,bx+bw-10,18):
                    draw.rectangle([(rx,ry),(rx+12,ry+12)], fill=hex2rgb(COLORS['yellow']))
        draw_car(draw, 100, 190)
        draw_tree(draw, 290, 200, 0.8)
    def diff_fn(draw):
        draw_grass(draw, 200)
        draw.rectangle([(20,110),(80,200)], fill=hex2rgb(COLORS['red']))  # building color change
        draw.rectangle([(85,185),(105,205)], fill=hex2rgb(COLORS['grass']))  # remove car
        draw_tree(draw, 290, 200, 1.1)  # bigger tree
    return draw_scene, diff_fn

def scene_space():
    def draw_scene(draw, variant='orig'):
        draw.rectangle([(0,0),(W,H)], fill=hex2rgb('#0A0A2E'))
        # stars
        for i in range(50):
            sx,sy=random.randint(0,W),random.randint(0,H-80)
            sr=random.randint(1,3); draw.ellipse([(sx-sr,sy-sr),(sx+sr,sy+sr)], fill=hex2rgb(COLORS['white']))
        # planets
        draw.ellipse([(280,30),(340,90)], fill=hex2rgb(COLORS['orange']))
        draw.ellipse([(70,50),(120,100)], fill=hex2rgb(COLORS['blue']))
        draw.ellipse([(200,200),(260,260)], fill=hex2rgb(COLORS['yellow']))
        # rocket
        draw.rectangle([(150,130),(190,180)], fill=hex2rgb(COLORS['white']))
        draw.polygon([(150,130),(170,100),(190,130)], fill=hex2rgb(COLORS['red']))
        draw.polygon([(150,180),(170,200),(160,180)], fill=hex2rgb(COLORS['orange']))
        draw.polygon([(190,180),(170,200),(180,180)], fill=hex2rgb(COLORS['orange']))
        draw.ellipse([(162,145),(178,158)], fill=hex2rgb(COLORS['blue']))
    def diff_fn(draw):
        draw.rectangle([(0,0),(W,H)], fill=hex2rgb('#0A0A2E'))
        draw.ellipse([(280,30),(340,90)], fill=hex2rgb(COLORS['purple']))  # planet color
        draw.rectangle([(60,40),(130,110)], fill=hex2rgb('#0A0A2E'))  # remove planet
        draw.ellipse([(220,210),(240,250)], fill=hex2rgb('#0A0A2E'))  # remove planet
        draw.polygon([(150,130),(170,100),(190,130)], fill=hex2rgb(COLORS['blue']))  # rocket nose color
    return draw_scene, diff_fn

def scene_garden():
    def draw_scene(draw, variant='orig'):
        draw_sky(draw); draw_grass(draw, 200)
        draw_sun(draw, 40, 35, 22); draw_cloud(draw, 200, 30)
        draw_cloud(draw, 320, 50)
        for fx,fy in [(60,205),(100,210),(140,200),(180,215),(220,205),(260,210),(300,215),(340,200)]:
            draw_flower(draw, fx, fy, random.uniform(0.7,1.2))
        draw_butterfly(draw, 160, 100)
        draw_bunny(draw, 320, 185)
    def diff_fn(draw):
        draw_grass(draw, 200)
        draw_rectangle_filled(draw, 130, 190, 215, 230, hex2rgb(COLORS['grass']))
        draw_flower(draw, 190, 200, 0.8)  # different flowers
        draw_flower(draw, 250, 200, 1.1)
        draw_butterfly(draw, 240, 100)  # butterfly moved
        draw.rectangle([(310,170),(340,200)], fill=hex2rgb(COLORS['grass']))  # remove bunny
        draw_cloud(draw, 320, 50, 18)  # smaller cloud
    return draw_scene, diff_fn

def scene_park():
    def draw_scene(draw, variant='orig'):
        draw_sky(draw); draw_grass(draw, 210)
        draw_sun(draw, 350, 40, 25); draw_cloud(draw, 60, 30)
        draw_tree(draw, 60, 215, 1.2); draw_tree(draw, 310, 220, 1.0)
        # pond
        draw.ellipse([(130,230),(230,280)], fill=hex2rgb(COLORS['water']))
        draw_flower(draw, 280, 210); draw_flower(draw, 100, 215)
        draw_bird(draw, 180, 80); draw_bird(draw, 220, 95)
        draw_cat(draw, 40, 205)
    def diff_fn(draw):
        draw_grass(draw, 210)
        draw_tree(draw, 60, 215, 0.9)  # smaller tree
        draw.ellipse([(130,225),(230,290)], fill=hex2rgb(COLORS['water']))  # bigger pond
        draw_rectangle_filled(draw, 30, 195, 55, 220, hex2rgb(COLORS['grass']))  # remove cat
        draw_bird(draw, 300, 70)  # bird moved
    return draw_scene, diff_fn

def scene_kitchen():
    def draw_scene(draw, variant='orig'):
        draw.rectangle([(0,0),(W,H)], fill=hex2rgb('#FFF8E7'))
        draw.rectangle([(0,180),(W,H)], fill=hex2rgb(COLORS['wood']))
        # table
        draw.rectangle([(40,130),(360,180)], fill=hex2rgb(COLORS['brown']))
        # items on table
        draw.ellipse([(60,95),(110,130)], fill=hex2rgb(COLORS['orange']))  # orange
        draw.ellipse([(120,100),(155,130)], fill=hex2rgb(COLORS['red']))  # apple
        draw.rectangle([(170,100),(200,130)], fill=hex2rgb(COLORS['white']))  # milk carton
        draw.ellipse([(210,105),(250,135)], fill=hex2rgb(COLORS['yellow']))  # egg
        draw.rectangle([(260,95),(310,120)], fill=hex2rgb('#8B4513'))  # bread
        # window
        draw.rectangle([(200,20),(280,80)], fill=hex2rgb(COLORS['sky']))
        draw.rectangle([(200,20),(280,80)], outline=hex2rgb(COLORS['brown']), width=3)
        draw.line([(240,20),(240,80)], fill=hex2rgb(COLORS['brown']), width=2)
    def diff_fn(draw):
        draw.rectangle([(0,130),(W,180)], fill=hex2rgb(COLORS['wood']))
        draw.ellipse([(60,95),(110,130)], fill=hex2rgb(COLORS['green']))  # green apple instead
        draw.rectangle([(170,100),(200,130)], fill=hex2rgb(COLORS['pink']))  # pink carton
        draw.rectangle([(205,100),(260,130)], fill=hex2rgb(COLORS['wood']))  # remove egg
        draw.rectangle([(260,100),(310,130)], fill=hex2rgb(COLORS['sand']))  # bread shape change
    return draw_scene, diff_fn

def scene_mountain():
    def draw_scene(draw, variant='orig'):
        draw_sky(draw); draw_grass(draw, 230)
        draw_sun(draw, 330, 40, 25); draw_cloud(draw, 180, 35)
        # mountains
        draw.polygon([(50,230),(140,90),(230,230)], fill=hex2rgb(COLORS['purple']))
        draw.polygon([(140,230),(240,100),(340,230)], fill=hex2rgb(COLORS['blue']))
        draw.polygon([(0,230),(120,230),(60,130)], fill=hex2rgb(COLORS['white']))
        for fx,fy in [(50,235),(120,240),(200,238),(300,242),(350,235)]:
            draw_flower(draw, fx, fy, random.uniform(0.6,1.0))
        draw_bird(draw, 280, 60); draw_bird(draw, 310, 80)
    def diff_fn(draw):
        draw_grass(draw, 230)
        draw.polygon([(50,230),(140,90),(230,230)], fill=hex2rgb(COLORS['pink']))  # color change
        draw_sun(draw, 330, 40, 20)  # smaller sun
        draw_flower(draw, 160, 238)
        draw_bird(draw, 80, 70)  # bird moved
    return draw_scene, diff_fn

def scene_beach():
    def draw_scene(draw, variant='orig'):
        draw_sky(draw)
        draw.rectangle([(0,100),(W,H)], fill=hex2rgb(COLORS['water']))
        draw.rectangle([(0,200),(W,H)], fill=hex2rgb(COLORS['sand']))
        draw_sun(draw, 60, 45, 30)
        draw_cloud(draw, 260, 35)
        # umbrella
        draw.rectangle([(190,150),(200,220)], fill=hex2rgb(COLORS['brown']))
        draw.polygon([(160,150),(230,150),(195,100)], fill=hex2rgb(COLORS['red']))
        # shells
        for sx,sy in [(80,220),(120,230),(280,225),(340,235)]:
            draw.ellipse([(sx-6,sy-3),(sx+6,sy+3)], fill=hex2rgb(COLORS['white']))
        draw.ellipse([(150,210),(175,225)], fill=hex2rgb(COLORS['orange']))  # beach ball
    def diff_fn(draw):
        draw.rectangle([(0,200),(W,H)], fill=hex2rgb(COLORS['sand']))
        draw.polygon([(160,150),(230,150),(195,100)], fill=hex2rgb(COLORS['blue']))  # umbrella color
        draw.rectangle([(140,200),(180,230)], fill=hex2rgb(COLORS['sand']))  # remove ball
        draw_cloud(draw, 260, 35, 15)  # smaller cloud
    return draw_scene, diff_fn

def scene_christmas():
    def draw_scene(draw, variant='orig'):
        draw_rectangle_filled(draw, 0, 0, W, H, hex2rgb('#1a1a3e'))
        # ground
        draw.rectangle([(0,230),(W,H)], fill=hex2rgb(COLORS['white']))
        # moon
        draw.ellipse([(300,20),(370,90)], fill=hex2rgb(COLORS['yellow']))
        # stars
        for i in range(20):
            sx,sy=random.randint(10,W-10),random.randint(10,180)
            draw.ellipse([(sx-2,sy-2),(sx+2,sy+2)], fill=hex2rgb(COLORS['white']))
        # tree
        for dy,r,c in [(0,40,'darkgreen'),(-30,35,'darkgreen'),(-60,30,'darkgreen'),(-85,25,'darkgreen')]:
            draw.ellipse([(180-r,210+dy-r),(180+r,210+dy+r)], fill=hex2rgb(COLORS[c]))
        draw.rectangle([(175,250),(185,280)], fill=hex2rgb(COLORS['brown']))
        # decorations
        for i in range(8):
            dx=170+random.randint(-20,20); dy=140+random.randint(0,60)
            draw.ellipse([(dx-4,dy-4),(dx+4,dy+4)], fill=hex2rgb(COLORS[random.choice(['red','yellow','blue'])]) )
        draw.ellipse([(180,115),(190,130)], fill=hex2rgb(COLORS['yellow']))  # star on top
        # snowman
        draw.ellipse([(60,210),(90,240)], fill=hex2rgb(COLORS['white']), outline=hex2rgb(COLORS['gray']))
        draw.ellipse([(55,185),(95,215)], fill=hex2rgb(COLORS['white']), outline=hex2rgb(COLORS['gray']))
        draw.ellipse([(72,178),(78,184)], fill=hex2rgb(COLORS['black']))
        draw.ellipse([(68,185),(70,187)], fill=hex2rgb(COLORS['black']))
        draw.ellipse([(80,185),(82,187)], fill=hex2rgb(COLORS['black']))
        draw.ellipse([(72,172),(78,178)], fill=hex2rgb(COLORS['pink']))
    def diff_fn(draw):
        draw.rectangle([(0,230),(W,H)], fill=hex2rgb(COLORS['white']))
        draw.ellipse([(180,115),(190,130)], fill=hex2rgb(COLORS['red']))  # star color
        draw.rectangle([(50,200),(100,250)], fill=hex2rgb(COLORS['white']))  # remove snowman
        draw.ellipse([(300,20),(370,90)], fill=hex2rgb('#1a1a3e'))  # remove moon
    return draw_scene, diff_fn

# Generate all 10 scenes
SCENES = [
    ('farm', scene_farm), ('ocean', scene_ocean), ('city', scene_city),
    ('space', scene_space), ('garden', scene_garden), ('park', scene_park),
    ('kitchen', scene_kitchen), ('mountain', scene_mountain), ('beach', scene_beach),
    ('christmas', scene_christmas),
]

print('🎨 开始生成图片...')

for i, (name, factory) in enumerate(SCENES):
    draw_fn, diff_fn = factory()
    
    # Original
    img = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(img)
    draw_fn(d, 'orig')
    img.save(f'{OUT}/spotdiff/{name}_orig.png')
    
    # Modified (with differences)
    img2 = Image.new('RGB', (W, H), 'white')
    d2 = ImageDraw.Draw(img2)
    draw_fn(d2, 'orig')  # first draw original
    diff_fn(d2)  # then modify
    img2.save(f'{OUT}/spotdiff/{name}_diff.png')
    
    print(f'  [{i+1}/10] ✅ {name}')

# ===== COLORING TEMPLATES =====
print('\n🖍️ 生成涂色线稿...')

def coloring_template(name, draw_fn):
    img = Image.new('RGB', (320, 400), 'white')
    d = ImageDraw.Draw(img)
    draw_fn(d)
    img.save(f'{OUT}/coloring/{name}.png')
    return img

def c_cat(draw):
    s=60; x,y=160,160
    draw.ellipse([(x-s,y-s),(x+s,y+s)], outline='black', width=2)
    for dx,dy in [(-s//3,-s),(s//3,-s)]:
        pts=[(x+dx-12,y+dy+8),(x+dx,y+dy-18),(x+dx+12,y+dy+8)]
        draw.polygon(pts, outline='black', width=2)
    draw.ellipse([(x-12,y-10),(x-4,y-2)], outline='black', width=2)
    draw.ellipse([(x+4,y-10),(x+12,y-2)], outline='black', width=2)
    draw.ellipse([(x-4,y+2),(x+4,y+8)], outline='black', width=2)
    for i in range(3):
        draw.line([(x-12,y+5+i*6),(x-25,y+12+i*3)], fill='black', width=1)

def c_dog(draw):
    s=55; x,y=160,150
    draw.ellipse([(x-s,y-s),(x+s,y+s)], outline='black', width=2)
    draw.ellipse([(x-40,y-40),(x-15,y-5)], outline='black', width=2)
    draw.ellipse([(x+15,y-40),(x+40,y-5)], outline='black', width=2)
    draw.ellipse([(x-12,y-8),(x-4,y)], outline='black', width=2)
    draw.ellipse([(x+4,y-8),(x+12,y)], outline='black', width=2)
    draw.ellipse([(x-3,y+2),(x+3,y+8)], outline='black', width=2)
    draw.arc([(x-8,y+12),(x+8,y+22)], 0, 180, fill='black', width=2)

def c_rabbit(draw):
    x,y=160,170; s=45
    draw.ellipse([(x-s,y-s),(x+s,y+s)], outline='black', width=2)
    draw.ellipse([(x-25,y-s-25),(x-10,y-s+5)], outline='black', width=2)
    draw.ellipse([(x+10,y-s-25),(x+25,y-s+5)], outline='black', width=2)
    draw.ellipse([(x-10,y-6),(x-4,y)], outline='black', width=2)
    draw.ellipse([(x+4,y-6),(x+10,y)], outline='black', width=2)
    draw.line([(x,y+2),(x-2,y+8)], fill='black', width=2)
    draw.line([(x,y+2),(x+2,y+8)], fill='black', width=2)

def c_house(draw):
    draw.rectangle([(60,220),(260,360)], outline='black', width=2)
    draw.polygon([(50,220),(160,150),(270,220)], outline='black', width=2)
    draw.rectangle([(140,280),(180,360)], outline='black', width=2)
    draw.rectangle([(80,250),(120,280)], outline='black', width=2)
    draw.rectangle([(200,250),(240,280)], outline='black', width=2)
    draw_ellipse_outline(draw, 300, 120, 30)
    draw_tree_outline(draw, 290, 260, 25)

def draw_ellipse_outline(draw, x, y, r):
    draw.ellipse([(x-r,y-r),(x+r,y+r)], outline='black', width=2)

def draw_tree_outline(draw, x, y, s):
    draw.rectangle([(x-5,y-s//2),(x+5,y+s//2)], outline='black', width=2)
    for dy,r in [(-s,12),(-s*2,18),(-s*3,22)]:
        draw.ellipse([(x-r,y+dy-r),(x+r,y+dy+r)], outline='black', width=2)

def c_butterfly(draw):
    x,y=160,180; s=35
    draw.ellipse([(x-s,y-s),(x+2,y+s)], outline='black', width=2)
    draw.ellipse([(x+2,y-s),(x+s,y+s)], outline='black', width=2)
    draw.ellipse([(x-s//2,y-s+s//2),(x+2,y+s)], outline='black', width=2)
    draw.ellipse([(x-2,y-s+s//2),(x+s//2,y+s)], outline='black', width=2)
    draw.line([(x,y-s//2),(x,y+s//2)], fill='black', width=2)
    for dy in [-s//3,-s//3]:
        draw.line([(x,dy+y-5),(x-8,dy+y-15)], fill='black', width=1)
        draw.line([(x,dy+y-5),(x+8,dy+y-15)], fill='black', width=1)

def c_star(draw):
    x,y=160,180; r=70
    pts=[]
    for i in range(10):
        a=(i*36-90)*math.pi/180; rad=r if i%2==0 else r//2
        pts.append((x+rad*math.cos(a), y+rad*math.sin(a)))
    draw.polygon(pts, outline='black', width=2)

def c_fish(draw):
    x,y=160,200; draw.ellipse([(x-60,y-25),(x+60,y+25)], outline='black', width=2)
    draw.polygon([(x+60,y),(x+85,y-20),(x+85,y+20)], outline='black', width=2)
    draw.ellipse([(x-30,y-5),(x-20,y+5)], outline='black', width=2)
    draw.ellipse([(x+25,y-15),(x+45,y+15)], outline='black', width=2)

def c_flower(draw):
    x,y=160,180; r=25
    for i in range(6):
        a=i*math.pi/3; cx=x+r*math.cos(a); cy=y+r*math.sin(a)
        draw.ellipse([(cx-r,cy-r),(cx+r,cy+r)], outline='black', width=2)
    draw.ellipse([(x-10,y-10),(x+10,y+10)], outline='black', width=2)
    draw.line([(x,y+r),(x,y+r+80)], fill='black', width=3)
    draw.ellipse([(x-20,y+60),(x-8,y+80)], outline='black', width=2)
    draw.ellipse([(x+8,y+50),(x+20,y+70)], outline='black', width=2)

def c_icecream(draw):
    x,y=160,220; r=40
    draw.polygon([(x-r,y),(x+r,y),(x,y-r*2)], outline='black', width=2)
    draw.ellipse([(x-r,y),(x+r,y+r*2)], outline='black', width=2)
    for i in range(5):
        ex=x-15+random.randint(0,30); ey=y+10+random.randint(0,30)
        draw.ellipse([(ex-6,ey-6),(ex+6,ey+6)], outline='black', width=2)

def c_car(draw):
    x,y=160,250; s=70
    draw.rectangle([(x-s,y-30),(x+s,y+15)], outline='black', width=2)
    draw.rectangle([(x-s//3,y-48),(x+s//3,y-30)], outline='black', width=2)
    draw.ellipse([(x-s//2-8,y+7),(x-s//2+8,y+23)], outline='black', width=2)
    draw.ellipse([(x+s//2-8,y+7),(x+s//2+8,y+23)], outline='black', width=2)

TEMPLATES = [('cat','小猫',c_cat),('dog','小狗',c_dog),('rabbit','兔子',c_rabbit),
    ('house','房子',c_house),('butterfly','蝴蝶',c_butterfly),('star','星星',c_star),
    ('fish','小鱼',c_fish),('flower','花朵',c_flower),('icecream','冰淇淋',c_icecream),
    ('car','汽车',c_car)]

for i, (name, cn, fn) in enumerate(TEMPLATES):
    coloring_template(name, fn)
    print(f'  [{i+1}/10] ✅ {name} ({cn})')

print(f'\n✅ 全部完成!')
print(f'   找茬: {OUT}/spotdiff/ (20 张)')
print(f'   涂色: {OUT}/coloring/ (10 张)')
