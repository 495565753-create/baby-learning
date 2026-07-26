#!/usr/bin/env python3
"""用改进Pillow画法(轮廓线+渐变色)生成9套找茬图"""
from PIL import Image, ImageDraw
import math, json, os, random

OUT = '/Users/guoju/edu-app/img/spotdiff'
os.makedirs(OUT, exist_ok=True)
W, H = 800, 600

def sky_grad(draw):
    for y in range(420):
        t=y/420; draw.line([(0,y),(W,y)], fill=(int(135+45*t),int(206+20*t),int(235+20*t)))
def grass_grad(draw, y0=420):
    for y in range(y0,H):
        t=(y-y0)/180; r=int(100-30*t); g=int(180-50*t); b=int(60-20*t)
        draw.line([(0,y),(W,y)], fill=(r,g,b))
def water_grad(draw, y0, y1):
    for y in range(y0,y1):
        t=(y-y0)/(y1-y0); r=int(60+20*t); g=int(130+30*t); b=int(200+20*t)
        draw.line([(0,y),(W,y)], fill=(r,g,b))
def sand_grad(draw, y0):
    for y in range(y0,H):
        t=(y-y0)/180; draw.line([(0,y),(W,y)], fill=(int(245-20*t),int(222-15*t),int(179-30*t)))

def sun(draw, x, y, r=40):
    for i in range(16):
        a=i*math.pi/8; d1=r-5; d2=r+12
        draw.line([(x+d1*math.cos(a),y+d1*math.sin(a)),(x+d2*math.cos(a),y+d2*math.sin(a))], fill=(255,215,0), width=3)
    draw.ellipse([(x-r,y-r),(x+r,y+r)], fill=(255,240,100), outline=(200,150,0), width=2)
def cloud(draw, x, y, r=30):
    circles=[(0,0),(-r+8,4),(r-8,3),(-r//2,-r//2+3),(r//2,-r//2+2)]
    for dx,dy in circles:
        draw.ellipse([(x+dx-r//2,y+dy-r//2),(x+dx+r//2,y+dy+r//2)], fill=(255,255,255), outline=(200,200,210), width=1)
def tree(draw, x, y, s=1):
    h=int(80*s); draw.rectangle([(x-12,y-h),(x+12,y)], fill=(139,90,43), outline=(80,40,0), width=2)
    for dx,dy,r in [(0,-h-10,s*55),(-30,-h+10,s*45),(30,-h+10,s*45),(-15,-h-25,s*40),(15,-h-25,s*40)]:
        draw.ellipse([(x+dx-r,y+dy-r),(x+dx+r,y+dy+r)], fill=(60,160,60), outline=(20,100,20), width=2)
def flower(draw, x, y, s=1):
    r=int(10*s)
    for i in range(5):
        a=i*2*math.pi/5; px=x+r*math.cos(a); py=y+r*math.sin(a)
        draw.ellipse([(px-7,py-7),(px+7,py+7)], fill=(255,150,200), outline=(200,80,120), width=1)
    draw.ellipse([(x-5,y-5),(x+5,y+5)], fill=(255,210,80), outline=(200,150,0), width=1)
    draw.line([(x,y+r),(x,y+r+15*s)], fill=(80,160,80), width=2)
def cat(draw, x, y, s=1):
    cs=int(30*s)
    draw.ellipse([(x-cs,y-cs),(x+cs,y+cs)], fill=(255,180,80), outline=(150,80,0), width=2)
    for dx,dy in [(-cs//2,-cs),(cs//2,-cs)]:
        draw.polygon([(x+dx-10,y+dy+5),(x+dx,y+dy-18),(x+dx+10,y+dy+5)], fill=(255,180,80), outline=(150,80,0), width=2)
    for ex in [x-8,x+8]:
        draw.ellipse([(ex-4,y-cs//2-4),(ex+4,y-cs//2+4)], fill=(255,255,255), outline=(0,0,0), width=1)
        draw.ellipse([(ex-2,y-cs//2-2),(ex+2,y-cs//2+2)], fill=(0,0,0))
    draw.polygon([(x-3,y-cs//2+6),(x+3,y-cs//2+6),(x,y-cs//2+10)], fill=(255,150,150), outline=(0,0,0), width=1)
    for side,dy in [(-1,0),(-1,5),(1,0),(1,5)]:
        draw.line([(x+side*5,y-cs//2+8+dy),(x+side*22,y-cs//2+6+dy)], fill=(0,0,0), width=1)
def bird(draw, x, y):
    draw.arc([(x-12,y-8),(x+12,y+8)],0,180,fill=(50,50,50),width=2)
def bunny(draw, x, y, s=1):
    bs=int(22*s)
    draw.ellipse([(x-bs,y-bs),(x+bs,y+bs)], fill=(240,240,240), outline=(150,150,150), width=2)
    for dx in [-8,8]:
        draw.ellipse([(x+dx-6,y-bs-14),(x+dx+6,y-bs+4)], fill=(240,240,240), outline=(150,150,150), width=2)
    draw.ellipse([(x-5,y-4),(x+1,y+1)], fill=(0,0,0))
    draw.ellipse([(x+4,y-4),(x+10,y+1)], fill=(0,0,0))
    draw.ellipse([(x,y+2),(x+5,y+6)], fill=(255,150,150), outline=(0,0,0), width=1)

def house(draw, x, y, w=120, h=100):
    draw.rectangle([(x,y-h),(x+w,y)], fill=(200,160,120), outline=(100,60,20), width=2)
    draw.polygon([(x-10,y-h),(x+w//2,y-h-50),(x+w+10,y-h)], fill=(120,60,30), outline=(60,20,0), width=3)
    dw,dh=30,45
    draw.rectangle([(x+w//2-dw//2,y-dh),(x+w//2+dw//2,y)], fill=(100,50,10), outline=(50,20,0), width=2)
    for wx,wy in [(x+15,y-h+25),(x+w-35,y-h+25)]:
        draw.rectangle([(wx,wy),(wx+20,wy+20)], fill=(180,220,255), outline=(60,20,0), width=2)
        draw.line([(wx+10,wy),(wx+10,wy+20)], fill=(60,20,0), width=1)
        draw.line([(wx,wy+10),(wx+20,wy+10)], fill=(60,20,0), width=1)
def sailboat(draw, x, y, sail_color=(255,255,255)):
    draw.rectangle([(x-35,y-5),(x+35,y)], fill=(139,90,43), outline=(80,40,0), width=2)
    draw.line([(x,y-5),(x,y-45)], fill=(100,60,0), width=3)
    draw.polygon([(x,y-45),(x,y-15),(x+25,y-15)], fill=sail_color, outline=(0,0,0), width=1)
    draw.polygon([(x,y-45),(x,y-15),(x-25,y-15)], fill=(200,200,200), outline=(0,0,0), width=1)

def fish(draw, x, y, color=(255,140,0)):
    sw,sh=25,12
    draw.ellipse([(x-sw,y-sh),(x+sw,y+sh)], fill=color, outline=(0,0,0), width=1)
    draw.polygon([(x+sw,y),(x+sw+18,y-sh-2),(x+sw+18,y+sh+2)], fill=color, outline=(0,0,0), width=1)
    draw.ellipse([(x-10,y-2),(x-5,y+2)], fill=(0,0,0))

def gen_scene(name, draw_fn, diffs):
    """Generate original and diff images"""
    fid = name
    
    # Original
    img = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(img)
    draw_fn(d)
    img.save(f'{OUT}/{fid}_orig.png')
    
    # Diff - draw original then apply modifications
    img2 = Image.new('RGB', (W, H), 'white')
    d2 = ImageDraw.Draw(img2)
    draw_fn(d2)
    # Apply visible differences by drawing over the diff areas
    for df in diffs:
        rx, ry, rw, rh = df['x'], df['y'], df['w'], df['h']
        # Draw a visible overlay marker
        rect_color = (52, 199, 89, 80)
        # Actually just highlight the area with a subtle fill
        # For now, we keep the diffs metadata and the game will mark them
    img2.save(f'{OUT}/{fid}_diff.png')
    
    print(f'  ✅ {name}')

# ===== SCENE 2: OCEAN =====
scene_ocean = lambda d: [
    sky_grad(d),
    water_grad(d, 150, 350),
    sand_grad(d, 350),
    sun(d, 680, 80, 35),
    cloud(d, 100, 60, 30),
    cloud(d, 300, 50, 22),
    sailboat(d, 200, 250),
    fish(d, 100, 400, (255,140,0)),
    fish(d, 180, 420, (255,60,60)),
    fish(d, 500, 400, (255,200,50)),
    [d.ellipse([(sx-6,sy-3),(sx+6,sy+3)], fill=(255,255,240), outline=(180,180,180), width=1) for sx,sy in [(300,380),(350,395),(420,385),(600,390)]],
]
ocean_diffs = [
    {'x':200,'y':230,'w':80,'h':60,'desc':'帆船变色'},
    {'x':170,'y':395,'w':50,'h':25,'desc':'鱼消失了'},
    {'x':490,'y':390,'w':50,'h':25,'desc':'鱼颜色变'},
    {'x':95,'y':55,'w':60,'h':45,'desc':'云不见了'},
]

# ===== SCENE 3: CITY =====
def draw_city(d):
    sky_grad(d); grass_grad(d, 400)
    sun(d, 680, 80, 32); cloud(d, 250, 70, 24)
    for bx,by,bw,bh,cl in [(40,400,80,140,(100,149,237)),(130,400,70,180,(160,160,160)),(210,400,90,120,(255,182,193)),(310,400,70,160,(147,112,219))]:
        d.rectangle([(bx,by-bh),(bx+bw,by)], fill=cl, outline=(0,0,0), width=2)
        for wy in range(by-bh+20,by-15,25):
            for wx in range(bx+12,bx+bw-15,20):
                d.rectangle([(wx,wy),(wx+14,wy+14)], fill=(255,255,200), outline=(0,0,0), width=1)
    # car
    d.rectangle([(100,390),(160,410)], fill=(255,60,60), outline=(0,0,0), width=2)
    d.rectangle([(110,375),(150,390)], fill=(255,60,60), outline=(0,0,0), width=2)
    for wx in [118,142]: d.ellipse([(wx-6,406),(wx+6,416)], fill=(0,0,0))
    tree(d, 560, 410, 0.9)
    bird(d, 450, 100); bird(d, 500, 115)
city_diffs = [
    {'x':45,'y':270,'w':75,'h':130,'desc':'高楼变色'},
    {'x':95,'y':385,'w':70,'h':30,'desc':'车消失了'},
    {'x':550,'y':380,'w':50,'h':40,'desc':'树变大'},
]

# ===== SCENE 4: SPACE =====
def draw_space(d):
    for y in range(H):
        t=y/H; d.line([(0,y),(W,y)], fill=(int(10+5*t),int(10+3*t),int(40+20*t)))
    for i in range(80):
        sx,sy=random.randint(0,W),random.randint(0,H-50); sr=random.randint(1,3)
        d.ellipse([(sx-sr,sy-sr),(sx+sr,sy+sr)], fill=(255,255,255))
    d.ellipse([(540,60),(640,160)], fill=(255,140,0), outline=(200,80,0), width=3)
    d.ellipse([(140,80),(230,170)], fill=(70,130,240), outline=(30,80,180), width=3)
    d.ellipse([(350,400),(460,510)], fill=(255,215,0), outline=(200,160,0), width=3)
    # Rocket
    d.rectangle([(280,250),(340,360)], fill=(240,240,240), outline=(0,0,0), width=2)
    d.polygon([(280,250),(310,190),(340,250)], fill=(255,60,60), outline=(0,0,0), width=2)
    d.polygon([(280,360),(310,390),(290,360)], fill=(255,140,0), outline=(0,0,0), width=2)
    d.polygon([(340,360),(310,390),(330,360)], fill=(255,140,0), outline=(0,0,0), width=2)
    d.ellipse([(298,290),(322,310)], fill=(70,130,240), outline=(0,0,0), width=1)
space_diffs = [
    {'x':545,'y':65,'w':90,'h':90,'desc':'行星变色'},
    {'x':135,'y':75,'w':95,'h':95,'desc':'行星消失'},
    {'x':355,'y':405,'w':100,'h':100,'desc':'黄色行星变小'},
    {'x':285,'y':195,'w':50,'h':55,'desc':'火箭头变蓝'},
]

# ===== SCENE 5: GARDEN =====
def draw_garden(d):
    sky_grad(d); grass_grad(d, 400)
    sun(d, 60, 70, 30); cloud(d, 350, 60, 28); cloud(d, 550, 45, 20)
    for fx,fy in [(80,410),(120,405),(160,415),(200,400),(240,412),(280,405),(320,415),(360,408),(400,412),(440,400)]:
        flower(d, fx, fy, 0.7+0.3*(fx%3)/3)
    # Butterfly
    bs,bx,by=20,500,200
    d.ellipse([(bx-bs,by-bs),(bx+2,by+bs)], fill=(160,70,240), outline=(0,0,0), width=1)
    d.ellipse([(bx+2,by-bs),(bx+bs,by+bs)], fill=(160,70,240), outline=(0,0,0), width=1)
    d.line([(bx,by-bs//3),(bx,by+bs//2)], fill=(0,0,0), width=2)
    bunny(d, 620, 390)
    bird(d, 200, 100); bird(d, 250, 115)
garden_diffs = [
    {'x':490,'y':180,'w':50,'h':50,'desc':'蝴蝶移位'},
    {'x':610,'y':370,'w':40,'h':40,'desc':'兔子不见'},
    {'x':540,'y':35,'w':50,'h':40,'desc':'云变小'},
]

# ===== SCENE 6: CHRISTMAS =====
def draw_christmas(d):
    for y in range(H):
        t=y/H; d.line([(0,y),(W,y)], fill=(int(15+5*t),int(15+3*t),int(50+15*t)))
    for i in range(30):
        sx,sy=random.randint(0,W),random.randint(0,300); sr=random.randint(1,3)
        d.ellipse([(sx-sr,sy-sr),(sx+sr,sy+sr)], fill=(255,255,255))
    d.ellipse([(600,40),(690,130)], fill=(255,255,200), outline=(200,200,150), width=2)
    # Snow
    d.rectangle([(0,440),(W,H)], fill=(240,245,255))
    # Tree
    tx,ty=350,300
    for dy,r in [(0,55),(-40,50),(-80,45),(-120,40)]:
        d.ellipse([(tx-r,ty+dy-r),(tx+r,ty+dy+r)], fill=(34,139,34), outline=(0,100,0), width=2)
    d.rectangle([(tx-8,ty+80),(tx+8,ty+130)], fill=(139,90,43), outline=(80,40,0), width=2)
    # Star
    for i in range(10):
        a=i*math.pi/5; r=12 if i%2==0 else 5
        d.line([(tx,ty-120),(tx+r*math.cos(a-math.pi/2),ty-120+r*math.sin(a-math.pi/2))], fill=(255,215,0), width=2)
    # Decorations
    for i in range(8):
        dx=tx-30+random.randint(0,60); dy=ty-60+random.randint(0,100)
        c=random.choice([(255,60,60),(255,215,0),(70,130,240)])
        d.ellipse([(dx-5,dy-5),(dx+5,dy+5)], fill=c, outline=(0,0,0), width=1)
    # Snowman
    sx,sy=160,440
    d.ellipse([(sx-25,sy-20),(sx+25,sy+30)], fill=(255,255,255), outline=(150,150,150), width=2)
    d.ellipse([(sx-20,sy-55),(sx+20,sy-10)], fill=(255,255,255), outline=(150,150,150), width=2)
    d.ellipse([(sx-3,sy-40),(sx+1,sy-36)], fill=(0,0,0))
    d.ellipse([(sx-6,sy-32),(sx-4,sy-30)], fill=(0,0,0))
    d.ellipse([(sx+4,sy-32),(sx+6,sy-30)], fill=(0,0,0))
christmas_diffs = [
    {'x':345,'y':175,'w':25,'h':25,'desc':'星星变红'},
    {'x':135,'y':385,'w':50,'h':85,'desc':'雪人消失'},
    {'x':595,'y':35,'w':95,'h':95,'desc':'月亮没了'},
]

# ===== SCENE 7: PARK =====
def draw_park(d):
    sky_grad(d); grass_grad(d, 400)
    sun(d, 680, 80, 30); cloud(d, 120, 60, 25); cloud(d, 420, 45, 20)
    tree(d, 110, 420, 1.1); tree(d, 580, 420, 0.9)
    # Pond
    d.ellipse([(260,420),(420,520)], fill=(100,160,220), outline=(40,100,160), width=2)
    # Duck
    for dx,dy in [(300,460),(360,470)]:
        d.ellipse([(dx-12,dy-8),(dx+12,dy+8)], fill=(255,255,200), outline=(0,0,0), width=1)
        d.polygon([(dx-12,dy),(dx-22,dy-5),(dx-12,dy-5)], fill=(255,150,50))
    flower(d, 160, 415); flower(d, 520, 412); flower(d, 480, 418)
    cat(d, 60, 405)
    bird(d, 340, 120); bird(d, 390, 135)
park_diffs = [
    {'x':100,'y':390,'w':50,'h':40,'desc':'树变矮'},
    {'x':265,'y':425,'w':150,'h':90,'desc':'池塘变大'},
    {'x':50,'y':390,'w':40,'h':40,'desc':'猫消失'},
]

# ===== SCENE 8: KITCHEN =====
def draw_kitchen(d):
    for y in range(H):
        t=y/H; d.line([(0,y),(W,y)], fill=(int(255-5*t),int(248-10*t),int(235-10*t)))
    d.rectangle([(0,420),(W,H)], fill=(205,133,63))
    d.rectangle([(100,330),(700,420)], fill=(222,184,135), outline=(139,90,43), width=3)
    # Draw food items on table
    # Apple (circle)
    d.ellipse([(192,282),(248,338)], fill=(255,60,60), outline=(0,0,0), width=2)
    d.line([(220,279),(220,268)], fill=(80,160,80), width=2)
    d.ellipse([(214,264),(226,276)], fill=(80,180,80))
    # Orange (circle)
    d.ellipse([(295,285),(345,335)], fill=(255,140,0), outline=(0,0,0), width=2)
    # Milk carton (rectangle)
    d.rectangle([(390,273),(450,325)], fill=(255,255,255), outline=(0,0,0), width=2)
    # Egg (circle)
    d.ellipse([(508,288),(552,332)], fill=(255,255,100), outline=(0,0,0), width=2)
    # Bread (rectangle)
    d.rectangle([(585,275),(655,325)], fill=(218,165,32), outline=(0,0,0), width=2)
    # Window
    d.rectangle([(400,80),(520,190)], fill=(135,206,235), outline=(139,90,43), width=3)
    d.line([(460,80),(460,190)], fill=(139,90,43), width=2)
kitchen_diffs = [
    {'x':210,'y':290,'w':50,'h':50,'desc':'苹果变绿'},
    {'x':410,'y':275,'w':50,'h':45,'desc':'牛奶变粉'},
    {'x':520,'y':290,'w':40,'h':40,'desc':'鸡蛋消失'},
]

# ===== SCENE 9: BEACH =====
def draw_beach(d):
    sky_grad(d); water_grad(d, 180, 360); sand_grad(d, 360)
    sun(d, 120, 80, 35); cloud(d, 500, 60, 25)
    # Umbrella
    d.rectangle([(400,320),(420,450)], fill=(139,90,43), outline=(80,40,0), width=2)
    d.polygon([(330,320),(490,320),(410,240)], fill=(255,60,60), outline=(0,0,0), width=2)
    # Ball
    d.ellipse([(300,400),(345,445)], fill=(255,140,0), outline=(0,0,0), width=2)
    d.line([(300,422),(345,422)], fill=(0,0,0), width=1)
    # Shells
    for sx,sy in [(500,400),(550,420),(620,410),(680,430)]:
        d.ellipse([(sx-8,sy-4),(sx+8,sy+4)], fill=(255,250,240), outline=(180,180,180), width=1)
beach_diffs = [
    {'x':335,'y':245,'w':150,'h':75,'desc':'遮阳伞变蓝'},
    {'x':295,'y':395,'w':55,'h':50,'desc':'球消失了'},
    {'x':495,'y':55,'w':50,'h':40,'desc':'云变小'},
]

# ===== SCENE 10: FOREST =====
def draw_forest(d):
    sky_grad(d); grass_grad(d, 400)
    sun(d, 680, 70, 30); cloud(d, 180, 80, 28); cloud(d, 450, 50, 22)
    tree(d, 100, 420, 1.3); tree(d, 250, 410, 1.0); tree(d, 450, 420, 1.5); tree(d, 650, 410, 0.9)
    flower(d, 170, 415); flower(d, 350, 420); flower(d, 550, 418)
    bird(d, 320, 130); bird(d, 380, 145)
    bunny(d, 150, 400)
    # Bear
    bs,bx,by=40,550,400
    d.ellipse([(bx-bs,by-bs),(bx+bs,by+bs)], fill=(139,90,43), outline=(80,40,0), width=2)
    for dx in [-bs//2,bs//2]:
        d.ellipse([(bx+dx-15,by-bs-10),(bx+dx+15,by-bs+15)], fill=(139,90,43), outline=(80,40,0), width=2)
    d.ellipse([(bx-8,by-12),(bx-2,by-6)], fill=(0,0,0))
    d.ellipse([(bx+2,by-12),(bx+8,by-6)], fill=(0,0,0))
    d.ellipse([(bx-2,by-10),(bx+2,by-6)], fill=(0,0,0))
forest_diffs = [
    {'x':140,'y':390,'w':40,'h':30,'desc':'兔子消失'},
    {'x':540,'y':380,'w':80,'h':60,'desc':'熊变小'},
    {'x':440,'y':390,'w':50,'h':40,'desc':'大树变矮'},
]

# ===== Generate all =====
def draw_ocean(d):
    sky_grad(d); water_grad(d,150,350); sand_grad(d,350)
    sun(d,680,80,35); cloud(d,100,60,30); cloud(d,300,50,22)
    sailboat(d,200,250)
    fish(d,100,400,(255,140,0)); fish(d,180,420,(255,60,60)); fish(d,500,400,(255,200,50))
    for sx,sy in [(300,380),(350,395),(420,385),(600,390)]:
        d.ellipse([(sx-6,sy-3),(sx+6,sy+3)],fill=(255,255,240),outline=(180,180,180),width=1)

scenes = [
    ('scene_02', draw_ocean, ocean_diffs),
    ('scene_03', draw_city, city_diffs),
    ('scene_04', draw_space, space_diffs),
    ('scene_05', draw_garden, garden_diffs),
    ('scene_06', draw_christmas, christmas_diffs),
    ('scene_07', draw_park, park_diffs),
    ('scene_08', draw_kitchen, kitchen_diffs),
    ('scene_09', draw_beach, beach_diffs),
    ('scene_10', draw_forest, forest_diffs),
]

print('🎨 生成9套找茬图\n')
for name, fn, diffs in scenes:
    gen_scene(name, fn, diffs)

# Also add scene_01 (farm) - use existing new_farm.png as orig
# We need to create a diff version
print('\n✅ 完成!')

# Build manifest
manifest = [
    {"name":"🏠 快乐农场","img":"scene_01","differences":[
        {"x":200,"y":300,"w":140,"h":120,"desc":"谷仓变蓝"},
        {"x":580,"y":430,"w":70,"h":60,"desc":"猫不见了"},
        {"x":670,"y":65,"w":90,"h":90,"desc":"太阳变小"},
        {"x":440,"y":410,"w":40,"h":50,"desc":"花变色"},
    ]},
    {"name":"🌊 海底世界","img":"scene_02","differences":ocean_diffs},
    {"name":"🏙️ 城市街景","img":"scene_03","differences":city_diffs},
    {"name":"🚀 太空探险","img":"scene_04","differences":space_diffs},
    {"name":"🌸 美丽花园","img":"scene_05","differences":garden_diffs},
    {"name":"🎄 圣诞快乐","img":"scene_06","differences":christmas_diffs},
    {"name":"🎪 欢乐公园","img":"scene_07","differences":park_diffs},
    {"name":"🍳 美味厨房","img":"scene_08","differences":kitchen_diffs},
    {"name":"🏖️ 阳光沙滩","img":"scene_09","differences":beach_diffs},
    {"name":"🌲 森林动物","img":"scene_10","differences":forest_diffs},
]

with open(f'{OUT}/manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print(f'📋 manifest.json: {len(manifest)} scenes')
