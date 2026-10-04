#!/usr/bin/env python3
"""Author original vector cards; append modern concepts without changing atlas order."""
from pathlib import Path
import json,re,math
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'assets/recognition-modern-v1'; OUT.mkdir(exist_ok=True)
SECTIONS=[
('modern_tech','科技小发现','🤖',[
('ai','AI 人工智能','这是 AI，叫人工智能。它是人们做出来的电脑程序，能帮忙回答问题、认图片。它不是真人，也会答错，重要的事要问老师和家长。'),
('ai_art','AI 绘画','这是 AI 绘画。人告诉电脑想画什么，电脑就能生成一张新图。它不是拿着画笔的小朋友，画出的东西也不一定都是真的。'),
('voice_helper','语音助手','这是语音助手。我们说一句话，程序听懂后可以放音乐、报天气。有些助手用了人工智能，它不是住在机器里的真人。'),
('humanoid','人形机器人','这是人形机器人。它有像人的胳膊和腿，有的能走路、搬东西。它由人设计和控制，不是有生命的小朋友，也不会什么都做。'),
('drone','无人机','这是无人机。它没有坐在里面的飞行员，可以由人操作或按程序飞。有人用它拍照片、送物品，小朋友要由大人带着认识它。'),
('electric_car','电动汽车','这是电动汽车。它用电池里的电带动轮子，需要在合适的地方充电。车子仍要遵守交通规则，充电设备请让大人操作。'),
('three_d_print','3D 打印','这是三维打印，也叫三 D 打印。机器照着设计，一层一层叠出立体物品，像慢慢搭积木。机器工作时不要伸手进去。'),
('solar','太阳能板','这是太阳能板。它能把阳光变成电，给一些设备供电。电不是凭空变出来的，晴天和阴天产生的电也可能不一样。')]),
('digital_world','屏幕里的世界','📱',[
('douyin','抖音','这是抖音，一个可以看和分享视频的应用。里面有短视频，也有其他内容。和爸爸妈妈一起挑适合的看，看一会儿就让眼睛休息。'),
('bilibili','B 站','这是 B 站，全名叫哔哩哔哩。人们在这里看和分享动画、音乐、知识等视频。内容不都适合小朋友，请爸爸妈妈陪你挑。'),
('youtube','YouTube','这是 YouTube，一个看和分享视频的网站，有许多地方的人上传视频。要请爸爸妈妈挑适合儿童的内容，有些地方可能打不开。'),
('short_video','短视频','这是短视频，意思是时间比较短的视频。有人拍动物，有人讲知识，也有人做广告。视频里说的不一定都对，要和大人一起想一想。'),
('live','直播','这是直播。有人正在拍摄，别人可以在屏幕上看见正在发生的事情，像远远地参加活动。看直播要由爸爸妈妈陪伴。'),
('internet','互联网','这是互联网。它把许多电脑和手机连接起来，让远处的人可以发消息、看资料。网上不是什么都真实，不认识的人要请大人帮忙。'),
('qr_code','二维码','这是二维码，像一个小方格图案。设备扫一扫，可以找到里面记录的信息，有的会打开网页。不能随便扫陌生的码，先请大人看看。'),
('private_info','个人信息','这是个人信息。你的姓名、照片、住址和家人的电话，都和你有关。别随便发给网上的人，遇到这种要求，先告诉爸爸妈妈。')]),
('world_peace','地球与和平','🌍',[
('earth','地球','这是地球，是我们大家生活的星球。上面有陆地、海洋和空气，也有许多国家。我们一起爱护水、植物和动物。'),
('country','国家','这是国家这个概念。世界上有许多国家，每个国家有自己的名字、人们和规则。国家里有城市和乡村，也住着许多小朋友。'),
('china','中国','这是中国，完整的名字是中华人民共和国，是亚洲的一个国家。这里有许多城市、乡村和不同民族的小朋友，大家共同生活。'),
('usa','美国','这是美国，是北美洲的一个国家。那里也有城市、乡村和不同背景的小朋友。国家和语言可能不同，大家都需要被尊重。'),
('map','地图','这是地图。人们把地方画得小小的，帮助我们找位置和方向。地图上的符号代表真实的地方，它不是那个地方本身。'),
('languages','不同的语言','这是不同的语言。人们可以用中文、英语和许多其他语言交流。我们可以慢慢学，不同的语言都能表达问候和友好。'),
('war','战争','这是战争的意思：一些国家或群体用武器互相攻击，会伤害人，也会破坏家园。它不是游戏。我们希望和平，如果担心，可以告诉爸爸妈妈。'),
('peace','和平','这是和平的意思：人们不用战争解决问题，能安心生活、学习和玩耍。遇到小争执，我们可以先停下来，好好说话，请大人帮助。')])]

def rect(x,y,w,h,fill,rx=20,extra=''):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" {extra}/>'
def circle(x,y,r,fill):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>'
def line(x,y,a,b,c='#4d6282',w=8):return f'<path d="M{x} {y}L{a} {b}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'
def text(x,y,s,size=22,fill='#33455d'):return f'<text x="{x}" y="{y}" text-anchor="middle" fill="{fill}" font-family="system-ui,Arial,sans-serif" font-size="{size}" font-weight="700">{s}</text>'
def star(x,y,r=16,color='#ffd25e',rot=0):
 pts=[]
 for i in range(10):
  a=-math.pi/2+rot+i*math.pi/5;k=r if i%2==0 else r*.382;pts.append(f'{x+math.cos(a)*k:.2f},{y+math.sin(a)*k:.2f}')
 return f'<polygon points="{" ".join(pts)}" fill="{color}"/>'
def screen(label='',fill='#ccdfff'):
 return rect(60,64,240,181,'#6576a9',28)+rect(72,77,216,149,fill,20)+line(180,245,180,282,'#6576a9',17)+rect(123,282,114,13,'#6576a9',6)+(text(180,140,label,40) if label else '')
def phone(label='',fill='#d7dfff'):
 return rect(109,45,142,253,'#566482',29)+rect(119,58,122,220,fill,21)+rect(158,65,44,9,'#566482',4)+circle(180,288,5,'#d5e0ec')+(text(180,174,label,31) if label else '')
def person(x,y,color='#6dace0',skin='#f5c89f',scale=1):
 return f'<g transform="translate({x} {y}) scale({scale})">'+circle(0,0,23,skin)+f'<path d="M-23 1C-26-32 23-33 23 1L13-10H-13Z" fill="#605970"/>'+rect(-25,31,50,65,color,17)+line(-17,96,-22,125,'#64799b',12)+line(17,96,22,125,'#64799b',12)+line(-27,45,-47,79,color,12)+line(27,45,47,79,color,12)+'</g>'
def globe(x=180,y=155,r=88):
 return circle(x,y,r,'#77bde6')+f'<path d="M{x-r*.72} {y-r*.55}L{x-r*.15} {y-r*.7}L{x+r*.17} {y-r*.35}L{x-r*.16} {y-r*.06}L{x-r*.33} {y+r*.53}L{x-r*.61} {y+r*.24}Z M{x+r*.33} {y-r*.06}L{x+r*.82} {y+r*.03}L{x+r*.55} {y+r*.6}L{x+r*.12} {y+r*.5}Z" fill="#8ecea0"/>'+f'<ellipse cx="{x}" cy="{y}" rx="{r*.65}" ry="{r}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>'+f'<path d="M{x-r} {y}H{x+r}" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>'
def house(x,y,c='#faac91',w=80):return rect(x,y,w,w*.62,c,8)+f'<path d="M{x-8} {y}L{x+w/2} {y-w*.49}L{x+w+8} {y}Z" fill="#8b86b8"/>'+rect(x+w*.38,y+w*.19,w*.24,w*.43,'#fff7e6',3)
def drawing(k):
 if k=='ai':return screen('AI')+circle(95,152,10,'#967cde')+circle(266,152,10,'#967cde')+line(95,162,131,195,'#967cde',5)+line(266,162,231,195,'#967cde',5)+star(302,51)+text(180,205,'?',26)
 if k=='ai_art':return screen('', '#fff2d1')+circle(243,110,20,'#ffc65c')+f'<path d="M84 219L145 132L194 185L230 147L280 219Z" fill="#87cbb0"/>'+line(295,94,319,59,'#b69ae2',14)+star(318,98)+text(125,115,'AI',23)
 if k=='voice_helper':return rect(98,110,166,168,'#b9a0e7',42)+rect(108,133,146,81,'#dbc9f4',22)+circle(180,168,22,'#fff')+rect(173,149,14,28,'#8c70bd',7)+f'<path d="M166 171Q180 191 194 171M180 187V199M171 199H189" fill="none" stroke="#8c70bd" stroke-width="5" stroke-linecap="round"/>'+f'<path d="M282 110Q315 137 282 164M302 86Q355 137 302 187" fill="none" stroke="#8c70bd" stroke-width="7" stroke-linecap="round"/>'
 if k=='humanoid':return line(180,77,180,44,'#6d85ae')+circle(180,36,10,'#f9bb7c')+rect(120,77,120,81,'#dfeaff',29)+rect(133,96,94,44,'#6578a2',18)+circle(156,117,7,'#fff')+circle(204,117,7,'#fff')+rect(131,166,98,73,'#acd6e8',26)+rect(139,179,82,37,'#c4eef0',13)+line(121,184,89,220,'#8bb3ce',19)+line(239,184,271,220,'#8bb3ce',19)+line(154,238,139,274,'#8bb3ce',18)+line(206,238,221,274,'#8bb3ce',18)+rect(114,274,43,15,'#627caa',7)+rect(203,274,43,15,'#627caa',7)
 if k=='drone':return line(155,140,93,109,'#7796b0',12)+line(205,140,267,109,'#7796b0',12)+line(155,172,93,206,'#7796b0',12)+line(205,172,267,206,'#7796b0',12)+rect(140,128,80,56,'#9bbcdf',20)+''.join(f'<ellipse cx="{x}" cy="{y}" rx="43" ry="13" fill="#8cd4c3"/>'+circle(x,y,8,'#648594') for x,y in [(89,107),(271,107),(89,207),(271,207)])+rect(162,185,36,24,'#577796',7)+circle(180,197,8,'#c0ecf6')
 if k=='electric_car':return rect(62,170,214,72,'#7bc1bc',22)+f'<path d="M92 171L122 116H207L246 171Z" fill="#89d1cb"/>'+f'<path d="M111 165L133 127H171V165ZM183 127H204L230 165H183Z" fill="#d2eff7"/>'+circle(110,239,25,'#526b85')+circle(231,239,25,'#526b85')+circle(110,239,12,'#d5e4ee')+circle(231,239,12,'#d5e4ee')+rect(284,127,29,83,'#e5b35e',8)+f'<path d="M299 151L291 173H301L294 190" fill="none" stroke="#fff" stroke-width="5"/>'+f'<path d="M290 209Q312 263 265 263V214" fill="none" stroke="#657d9b" stroke-width="6"/>'
 if k=='three_d_print':return rect(75,64,210,239,'#8d9fc4',15)+rect(89,80,182,197,'#ecf6ff',10)+line(107,103,255,103,'#637d9b',10)+line(180,103,180,151,'#637d9b',8)+rect(165,141,30,26,'#bba0df',7)+f'<path d="M137 230V195L179 171L222 195V230L179 255Z" fill="#7ecebc"/>'+f'<path d="M137 195L179 219L222 195M179 219V255" fill="none" stroke="#fff" stroke-width="4"/>'+''.join(line(143,y,175,y+17,'#addccb',3) for y in [207,216,225])
 if k=='solar':return circle(80,68,27,'#ffd26c')+''.join(line(80+math.cos(a)*37,68+math.sin(a)*37,80+math.cos(a)*46,68+math.sin(a)*46,'#ffd26c',5) for a in [i*math.pi/4 for i in range(8)])+f'<path d="M83 120H280L305 245H59Z" fill="#608cc2" stroke="#486e9c" stroke-width="7" stroke-linejoin="round"/>'+''.join(line(88+i*45,128,72+i*55,238,'#b5d8f2',3) for i in range(4))+''.join(line(77-i*8,153+i*35,287+i*7,153+i*35,'#b5d8f2',3) for i in range(3))+line(108,251,103,285,'#687da6',10)+line(254,251,259,285,'#687da6',10)
 if k in ['douyin','bilibili','youtube']:
  labels={'douyin':('抖音','#675482'),'bilibili':('B站','#6aafd0'),'youtube':('YouTube','#d8898f')};l,c=labels[k]
  return phone('', '#f8f3ff')+rect(137,103,86,80,c,20)+f'<path d="M166 122L198 143L166 163Z" fill="#fff"/>'+text(180,222,l,23 if k=='youtube' else 28)+circle(138,253,5,'#bccee3')+circle(160,253,5,'#bccee3')+circle(182,253,5,'#bccee3')
 if k=='short_video':return phone('', '#eff7fb')+rect(129,94,102,140,'#a7d6c3',15)+circle(206,114,12,'#ffd585')+f'<path d="M129 231L167 163L193 192L215 170L231 231Z" fill="#6cae98"/>'+circle(178,160,25,'#fff')+f'<path d="M173 147L190 160L173 173Z" fill="#8198b7"/>'+text(180,257,'00:30',17)
 if k=='live':return screen('', '#f3edf9')+person(180,125,'#e5a5a9',scale=.63)+rect(209,87,60,27,'#e7a4a7',9)+circle(221,101,4,'#fff')+text(245,107,'LIVE',13,'#fff')+rect(64,260,64,48,'#869abd',10)+f'<path d="M132 273L154 262V309L132 298Z" fill="#869abd"/>'+line(95,308,77,326,'#869abd',6)+line(95,308,111,326,'#869abd',6)
 if k=='internet':return globe(180,153,67)+''.join(line(180,153,x,y,'#647fa7',5)+rect(x-28,y-20,56,40,'#c6dbf6',8)+rect(x-20,y-13,40,24,'#7fb9ce',4) for x,y in [(63,68),(296,73),(55,224),(300,236)])+rect(145,276,70,41,'#738dab',8)+rect(153,283,54,26,'#d4ecf6',3)+line(180,220,180,269,'#647fa7',5)
 if k=='qr_code':
  # Deliberate nonfunctional educational pattern: never encode an external URL.
  s=rect(75,65,210,225,'#fff',23)
  for x,y in [(99,89),(213,89),(99,203)]:s+=rect(x,y,48,48,'#617897',3)+rect(x+9,y+9,30,30,'#fff',1)+rect(x+17,y+17,14,14,'#617897',1)
  for x,y in [(169,91),(170,115),(194,143),(98,160),(123,173),(157,152),(168,193),(212,206),(237,227),(184,251),(209,256),(249,167)]:s+=rect(x,y,13,13,'#617897',1)
  return s+text(180,319,'先问大人',19)
 if k=='private_info':return rect(78,72,207,215,'#ccdff3',23)+circle(140,132,25,'#e6b8a2')+f'<path d="M102 190Q140 152 177 190Z" fill="#85b6be"/>'+line(195,121,255,121,'#89a3c0',7)+line(195,148,246,148,'#89a3c0',7)+line(108,219,252,219,'#89a3c0',7)+line(108,247,201,247,'#89a3c0',7)+rect(236,243,67,58,'#e8bb73',12)+f'<path d="M248 247V232Q269 208 289 232V247" fill="none" stroke="#b48851" stroke-width="8"/>'+circle(269,272,6,'#fff7e5')
 if k=='earth':return globe(180,157,104)+rect(150,279,60,16,'#a8c9db',6)+line(180,262,180,280,'#a8c9db',10)+star(49,85)+star(298,249,12)
 if k=='country':return globe(180,103,67)+house(63,247,'#f5b090',69)+house(230,247,'#a1c5da',69)+person(148,211,'#aaa0d6',scale=.7)+person(208,211,'#8fc4b6',scale=.7)+text(180,315,'许多家园',20)
 if k in ['china','usa']:
  s=line(73,75,73,282,'#869bb4',7)
  if k=='china':
   s+=rect(77,67,216,144,'#da6c6a',2)+star(113,105,19,'#ffe07b')
   for x,y in [(146,80),(160,95),(160,117),(146,133)]:s+=star(x,y,7,'#ffe07b',math.atan2(105-y,113-x)+math.pi/2)
  else:
   s+=rect(77,67,216,144,'#fffaf0',2)
   for i in range(0,13,2):s+=rect(77,67+i*144/13,216,144/13,'#df9097',0)
   s+=rect(77,67,86,144/13*7,'#60789f',0)
   for row in range(9):
    count=6 if row%2==0 else 5
    for col in range(count):s+=star(84+col*13.8+(6.9 if row%2 else 0),73+row*7.2,2.4,'#fff')
  return s+rect(53,281,40,10,'#869bb4',4)+house(127,277,'#f1be8a',66)+house(220,277,'#a2c9c3',64)
 if k=='map':return f'<path d="M61 76L139 95L219 74L303 96V276L219 256L139 277L61 257Z" fill="#deedd9" stroke="#8eb6a6" stroke-width="6" stroke-linejoin="round"/>'+line(139,99,139,274,'#b5d2b9',3)+line(219,76,219,253,'#b5d2b9',3)+f'<path d="M73 189Q119 122 165 183T290 154" fill="none" stroke="#8cc6df" stroke-width="15"/>'+f'<path d="M251 175Q224 138 251 123Q279 138 251 175Z" fill="#de967f"/>'+circle(251,143,8,'#fff')+f'<path d="M305 45V95M295 61L305 45L315 61" fill="none" stroke="#62789a" stroke-width="5" stroke-linecap="round"/>'+text(305,116,'N',17)
 if k=='languages':return person(108,179,'#99caba')+person(251,179,'#b5a3db',skin='#b88b70')+rect(43,64,127,58,'#fff',20)+rect(201,74,119,58,'#fff',20)+text(106,101,'你好',26)+text(260,111,'Hello',25)+star(182,54,11)
 if k=='war':return house(58,196,'#b0bdcf',84)+house(216,196,'#b0bdcf',84)+f'<path d="M137 87H159L190 125L223 81H244" fill="none" stroke="#c99895" stroke-width="7" stroke-linecap="round"/>'+rect(100,238,164,58,'#fff1e8',24)+text(182,276,'不是游戏',24)+f'<path d="M170 163Q184 152 197 165Q185 181 185 192" fill="none" stroke="#899db6" stroke-width="7" stroke-linecap="round"/>'+circle(185,208,4,'#899db6')
 if k=='peace':return globe(180,175,84)+f'<path d="M140 134Q170 143 180 123Q203 143 224 133Q217 168 184 178Q168 201 140 205L160 175Q132 159 117 145Z" fill="#fff" stroke="#b7d7e4" stroke-width="3"/>'+circle(198,147,3,'#71899f')+line(220,164,251,149,'#70ac85',5)+f'<path d="M235 151Q224 130 241 137Q247 143 235 151M245 146Q247 125 258 133Q261 143 245 146" fill="#70ac85"/>'+star(66,79,15)+star(287,247,12)
 raise ValueError(k)

categories=[]
for cid,title,icon,rows in SECTIONS:
 items=[]
 for i,(slug,word,body) in enumerate(rows,1):
  art=drawing(slug)
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" role="img"><title>{word}</title><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#f5faff"/><stop offset="1" stop-color="#eaf1f7"/></linearGradient></defs><rect width="360" height="360" rx="36" fill="url(#bg)"/><circle cx="302" cy="57" r="56" fill="#fff" opacity=".56"/><ellipse cx="180" cy="309" rx="117" ry="15" fill="#d9e3ef" opacity=".6"/>{art}</svg>'
  (OUT/f'{slug}.svg').write_text(svg+'\n')
  items.append({'id':f'{cid}-{i:02}','word':word,'text':body,'image':f'assets/recognition-modern-v1/{slug}.svg','quiz':False,'concept':True})
 categories.append({'id':cid,'title':title,'icon':icon,'level':5,'quiz':False,'modern':True,'cover':items[0]['image'],'items':items})
source=ROOT/'recognition-data.js';s=source.read_text();m=re.search(r'root\.RECOGNITION\s*=\s*(\{.*\})\s*;\s*\}\)\(window\);',s,re.S);data=json.loads(m.group(1))
data['categories']=[c for c in data['categories'] if c['id'] not in [x[0] for x in SECTIONS]]+categories
data['version']='recognition-v2-20261004'
s='/* 果粒橙小朋友 · 264张认知卡。旧20类图格顺序保留；现代概念使用独立原创SVG。 */\n(function (root) {\n  \'use strict\';\n  root.RECOGNITION = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n})(window);\n';source.write_text(s)
import hashlib
manifest={'version':'recognition-modern-v1-20261004','category_count':3,'item_count':24,'generator':'Original project-authored SVG vectors','files':[]}
for category in categories:
 for item in category['items']:
  image=ROOT/item['image']
  manifest['files'].append({'category':category['id'],'item':item['id'],'word':item['word'],'file':item['image'],'sha256':hashlib.sha256(image.read_bytes()).hexdigest(),'bytes':image.stat().st_size})
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('24 original SVG cards and 3 new categories written')
