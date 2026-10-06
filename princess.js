/* 果粒橙公主换装：本地图像与 SVG 叠层，离线可玩。 */
const princessWardrobe={
  dress:[
    ['森林舞会','#315aa7','#f8ce47','#e94752',0,'flower'],['冰雪星光','#69b9db','#b9e7f6','#f9ffff',5,'snow'],
    ['玫瑰花园','#e76d91','#ffd1df','#ffe9a1',3,'flower'],['月光紫罗兰','#7c65bf','#c6b4f5','#f6e4ff',1,'star'],
    ['彩虹糖果','#f579b7','#ffe6a1','#7ed6ca',4,'heart'],['蓝宝石舞裙','#3277c5','#7bb9ed','#f4f5ff',0,'gem'],
    ['金色皇冠','#d59b35','#ffe4a5','#fff8d3',2,'star'],['薄荷仙子','#49ad9c','#aee8ca','#f5f4bf',3,'flower'],
    ['樱桃红裙','#c83755','#ef7b87','#f7d79b',1,'heart'],['云朵公主','#97a6d8','#e7efff','#fffdfa',4,'star'],
    ['星夜礼服','#273a83','#5764b3','#f6d780',2,'star'],['桃花小裙','#d96ca4','#ffc7d8','#fef0b4',3,'flower'],
    ['极光长裙','#3c9fbd','#89d9df','#ebf9fd',1,'snow'],['南瓜舞会','#c96c31','#f4b35a','#ffefd0',0,'star'],
    ['湖水珍珠','#398c9b','#85cfd3','#eafff6',4,'gem'],['葡萄蜜语','#774a9a','#b99ad4','#f2def7',1,'flower'],
    ['奶油泡泡','#c89ba5','#f6dfda','#ffffff',3,'heart'],['翡翠森林','#326f65','#77bc9d','#e2e4a9',2,'flower'],
    ['雪花蓝纱','#579bc9','#bde3f4','#f9ffff',4,'snow'],['日落珊瑚','#e57768','#fac2a5','#ffe7a8',0,'star'],
    ['水晶南瓜马车','#719ed0','#d9eafd','#fff8de',2,'gem'],['书房玫瑰','#d5a448','#ffe3a0','#fbf5d4',0,'flower'],
    ['长发花塔','#9969bd','#e3c8f7','#f8e6ff',3,'flower'],['睡梦玫瑰','#e8749e','#ffd2e4','#fff1bf',2,'heart'],
    ['珊瑚海湾','#df716d','#ffb39d','#fbe8d5',4,'gem'],['沙漠月夜','#218e9c','#71cdd1','#f1df9a',1,'star'],
    ['木兰花灯','#bd4e5d','#f1abb0','#e9c882',3,'flower'],['森林百合','#41956e','#a4d7a2','#f7edb7',0,'flower'],
    ['银月舞裙','#778ac3','#d6dffc','#fff',5,'star'],['珍珠粉纱','#d98da9','#f7dce6','#fff',4,'gem'],
    ['樱花舞会','#d5839c','#f5c6d3','#fbeab9',2,'flower'],['海洋水晶','#3c9bb9','#9cdae7','#eaf8ff',5,'gem'],
    ['红宝石夜宴','#a63d62','#df7792','#f9d2a6',1,'gem'],['琥珀秋叶','#b87941','#f0bd77','#fff1ce',0,'flower'],
    ['星河夜曲','#4854a7','#a3b2ed','#f1e5ad',5,'star'],['粉云蝴蝶','#db83b6','#f9cfdf','#fff4ce',2,'heart'],
    ['薄荷月光','#459d91','#a7dfd6','#f8f4dc',4,'snow'],['紫晶流光','#8668b4','#d4c1ef','#f9eafa',1,'gem'],
    ['金丝玫瑰','#bd748c','#efd0d6','#f5e0a2',2,'flower'],['冰湖钻石','#5b9fc5','#d5eef9','#ffffff',5,'snow']
  ].map(([name,top,skirt,trim,cut,motif])=>({name,top,skirt,trim,cut,motif})),
  hair:[
    ['黑发短卷','#28243b',0],['银白侧辫','#e9e7de',2],['金色长卷','#c99443',1],['栗色公主髻','#6b3b32',10],
    ['粉色波浪','#d882a6',6],['冰蓝长发','#b8dce8',1],['紫色公主髻','#755783',4],['红棕公主髻','#9a503d',3],
    ['巧克力公主髻','#4d302f',7],['蜂蜜长卷','#c78b4d',9],['薄荷公主髻','#72bdb5',5],['夜蓝长辫','#374b87',8]
  ].map(([name,color,style])=>({name,color,style})),
  head:[['不戴头饰','✨','#ffffff'],['红色蝴蝶结','🎀','#e8485f'],['金色小皇冠','👑','#f6cd59'],['冰晶皇冠','❄️','#c7efff'],['玫瑰花环','🌹','#f08ba8'],['星星发箍','⭐','#f8d57b'],['珍珠王冠','👑','#efefff'],['紫晶发饰','💎','#ab8be0'],['蓝色丝带','🎀','#70b6eb'],['森林花冠','🌼','#e9d985'],['月亮发夹','🌙','#d8c5f7'],['樱桃发卡','🍒','#e9576c']].map(([name,icon,color])=>({name,icon,color})),
  necklace:[['不戴项链','✨','#ffffff'],['珍珠项链','⚪','#f8f8f4'],['红宝石','❤️','#d94968'],['蓝宝石','💎','#5da7de'],['金色星星','⭐','#efc65e'],['雪花吊坠','❄️','#c4edfa'],['粉晶爱心','💗','#ed9cba'],['翡翠小花','🌼','#73c2a4'],['紫晶项链','💜','#ab80d7'],['彩虹珠珠','🌈','#f5b864']].map(([name,icon,color])=>({name,icon,color})),
  earrings:[['不戴耳环','✨','#ffffff'],['珍珠耳坠','⚪','#f6f4e9'],['星星耳坠','⭐','#f6ca61'],['雪花耳坠','❄️','#c8f3ff'],['红心耳坠','❤️','#dc6580'],['蓝晶耳坠','💎','#7abde2'],['小花耳环','🌸','#eea6b2'],['紫晶耳环','💜','#aa82d3'],['金色圆环','🟡','#e5b755'],['彩虹耳环','🌈','#eb96b5']].map(([name,icon,color])=>({name,icon,color})),
  wand:[['空着双手','👐','#ffffff'],['星星魔法棒','⭐','#f7ce69'],['雪花魔法棒','❄️','#c7f0fd'],['爱心魔法棒','💗','#eb8aaf'],['月亮魔法棒','🌙','#ded1ee'],['花朵魔法棒','🌸','#f3a6aa'],['蝴蝶魔法棒','🦋','#9bc4f0'],['水晶魔法棒','💎','#8ed8e9'],['彩虹魔法棒','🌈','#f8bd88'],['太阳魔法棒','☀️','#ffd45e']].map(([name,icon,color])=>({name,icon,color})),
  shoes:[['红色舞鞋','👠','#d94e64'],['冰蓝水晶鞋','👠','#8ed5ee'],['金色舞鞋','👠','#e9bd65'],['粉色蝴蝶鞋','👠','#ee9dbb'],['紫晶舞鞋','👠','#a98ad1'],['薄荷绿鞋','👠','#75c9ad'],['珍珠白鞋','👠','#f3eee8'],['深蓝礼鞋','👠','#607bb4'],['珊瑚舞鞋','👠','#e9947b'],['彩虹舞鞋','👠','#eaa8c9']].map(([name,icon,color])=>({name,icon,color})),
  cape:[['没有披风','✨','#ffffff'],['红丝绒披风','🧣','#cf5368'],['冰雪薄纱','❄️','#b6e5f4'],['金色纱披风','✨','#e9cc88'],['粉色花瓣','🌸','#f1aac7'],['星空长披风','🌟','#5d65aa'],['薄荷精灵纱','🧚','#9bd6c6'],['紫色夜光纱','💜','#b9a4d9'],['彩虹轻纱','🌈','#f3b5b8'],['白云披风','☁️','#e9eef7']].map(([name,icon,color])=>({name,icon,color})),
  bag:[['不拿小包','✨','#ffffff'],['红心小包','👜','#d95169'],['雪花小包','👜','#a9e1f0'],['珍珠手包','👜','#f1ede4'],['金星小包','👜','#eac36c'],['花朵小包','👜','#f2a7bc'],['紫晶小包','👜','#a987c9'],['森林小包','👜','#89bf9c'],['蓝宝石包','👜','#75a8d6'],['彩虹小包','👜','#e9a2aa']].map(([name,icon,color])=>({name,icon,color})),
  scene:[['城堡大厅','🏰','#f9e9ed'],['冰雪王国','❄️','#d5f1fa'],['森林花园','🌳','#d7eedc'],['星空舞会','🌟','#343d75'],['玫瑰花园','🌹','#fce1e8'],['彩虹云端','🌈','#e9e5ff'],['月光湖畔','🌙','#cbd8ef'],['糖果城堡','🍬','#ffe5d8']].map(([name,icon,color])=>({name,icon,color}))
};
for(const [category,rows] of Object.entries({
  head:[['蓝水晶发箍','💎','#8ad4ee'],['蝴蝶珍珠冠','🦋','#f4d8e9'],['贝壳王冠','🐚','#f2c9b0'],['茉莉花环','🌼','#fff6df'],['绿宝石冠','👑','#a8d7a8'],['金色小花冠','🌻','#f5d786'],['银月发夹','🌙','#c8d1f3'],['彩虹蝴蝶结','🎀','#f2a6cc']],
  necklace:[['月亮珍珠','🌙','#f3e5ba'],['珊瑚项链','🪸','#ed9a87'],['玫瑰金项链','🌹','#e8b8a3'],['绿宝石项链','💚','#7fc89c'],['小贝壳项链','🐚','#f1d1bb']],
  earrings:[['月亮耳坠','🌙','#d8c8ec'],['贝壳耳坠','🐚','#efd4c2'],['花瓣耳坠','🌼','#efb6c8'],['翡翠耳坠','💚','#86caaa'],['蝴蝶耳坠','🦋','#b9b9ed']],
  wand:[['玫瑰魔法棒','🌹','#e997ad'],['贝壳魔法棒','🐚','#eccbb5'],['翡翠魔法棒','💚','#87c9a4'],['水滴魔法棒','💧','#a4dced'],['彩灯魔法棒','🏮','#e8bb8c']],
  shoes:[['玫瑰金舞鞋','👠','#d9a59a'],['紫云舞鞋','👠','#ba9bd2'],['翡翠舞鞋','👠','#78bca0'],['天鹅白鞋','👠','#f6f4ee'],['星河银鞋','👠','#b8c7df']],
  cape:[['珍珠薄纱','✨','#f2e8f5'],['海蓝披风','🌊','#90cddf'],['花瓣轻纱','🌸','#eeb4c5'],['金色流沙','🌟','#e2c58d'],['翡翠长披风','🍀','#8fc3a7']],
  bag:[['水晶小包','💎','#a9d5ee'],['玫瑰花包','🌹','#e9a5bb'],['贝壳手包','🐚','#ebcebb'],['星月小包','🌙','#bac5e8'],['翡翠小包','💚','#8abfa2']],
  scene:[['南瓜马车','🎃','#fce3c7'],['海底宫殿','🪸','#c7e7ea'],['花灯街','🏮','#fbe2d3'],['百合池塘','🪷','#deefdf']]
}))princessWardrobe[category].push(...rows.map(([name,icon,color])=>({name,icon,color})));
const princessCategories=[['dress','礼服','👗'],['hair','发型','💇'],['head','头饰','👑'],['necklace','项链','💎'],['earrings','耳环','✨'],['wand','魔法棒','🪄'],['shoes','鞋子','👠'],['cape','披风','🧣'],['bag','手包','👜'],['scene','场景','🏰']];
const princessCharacters=[
  {id:'snow',name:'白雪公主',icon:'🍎',skin:'#f3c7ae',dress:0,hair:0,head:1,shoes:0,cape:1,scene:0},
  {id:'ice',name:'艾莎公主',icon:'❄️',skin:'#f2cbb5',dress:1,hair:1,head:3,shoes:1,cape:2,scene:1},
  {id:'cinderella',name:'灰姑娘',icon:'👠',skin:'#f4cfb9',dress:20,hair:2,head:6,shoes:1,cape:10,scene:8},
  {id:'belle',name:'贝儿公主',icon:'🌹',skin:'#eac1a8',dress:21,hair:3,head:2,shoes:2,cape:3,scene:0},
  {id:'rapunzel',name:'长发公主',icon:'🌼',skin:'#f4c6ad',dress:22,hair:2,head:4,shoes:3,cape:4,scene:2},
  {id:'aurora',name:'睡美人',icon:'💗',skin:'#f3c7b1',dress:23,hair:9,head:6,shoes:3,cape:4,scene:4},
  {id:'ariel',name:'爱丽儿',icon:'🪸',skin:'#f0baa0',dress:24,hair:7,head:14,shoes:8,cape:11,scene:9},
  {id:'jasmine',name:'茉莉公主',icon:'🌙',skin:'#c99472',dress:25,hair:0,head:15,shoes:5,cape:6,scene:3},
  {id:'mulan',name:'花木兰',icon:'🌸',skin:'#e3ad90',dress:26,hair:0,head:9,shoes:0,cape:1,scene:10},
  {id:'tiana',name:'蒂安娜',icon:'🪷',skin:'#8d583f',dress:27,hair:8,head:16,shoes:5,cape:14,scene:11}
];
const princessDefaults=Object.fromEntries(princessCharacters.map(c=>[c.id,{dress:c.dress,hair:c.hair,head:c.head,necklace:0,earrings:0,wand:0,shoes:c.shoes,cape:c.cape,bag:0,scene:c.scene}]));
let princessSave={};try{princessSave=JSON.parse(localStorage.getItem('kid-princess-v2')||'{}')||{}}catch{}
const princessState={character:'snow',category:'dress',...Object.fromEntries(princessCharacters.map(c=>[c.id,{...princessDefaults[c.id],...(princessSave[c.id]||{})}])),celebrating:false,step:0,lastRewarded:''};
function princessSelection(){return princessState[princessState.character]}
function princessPersist(){localStorage.setItem('kid-princess-v2',JSON.stringify(Object.fromEntries(princessCharacters.map(c=>[c.id,princessState[c.id]]))))}
function princessCharacter(){return princessCharacters.find(c=>c.id===princessState.character)||princessCharacters[0]}
function princessMotif(kind,x,y,s,color){const paths={star:'M0,-1 L.23,-.28 1,-.28 .38,.14 .62,.85 0,.43 -.62,.85 -.38,.14 -1,-.28 -.23,-.28Z',heart:'M0,.85 C-1,.16 -1.12,-.45 -.5,-.61 C-.2,-.69 -.04,-.5 0,-.33 C.17,-.7 .74,-.74 .95,-.32 C1.15,.14 .63,.53 0,.85Z',flower:'M0,-.9 Q.3,-.45 0,-.18 Q.53,-.55 .9,0 Q.48,.3 .18,.08 Q.55,.52 0,.9 Q-.3,.48 -.08,.18 Q-.54,.55 -.9,0 Q-.48,-.3 -.18,-.08 Q-.54,-.5 0,-.9Z',gem:'M-.7,-.3 L-.3,-.7 .3,-.7 .7,-.3 0,.8Z',snow:'M0,-1 L0,1 M-1,0 L1,0 M-.72,-.72 L.72,.72 M-.72,.72 L.72,-.72'};return `<g transform="translate(${x} ${y}) scale(${s})" fill="${kind==='snow'?'none':color}" stroke="${color}" stroke-width="${kind==='snow'?'.15':'.05'}" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[kind]||paths.star}"/>${kind==='flower'?`<circle r=".18" fill="#fff5ca" stroke="none"/>`:''}</g>`}
function princessSceneSvg(scene){let out=`<rect width="360" height="600" fill="url(#sceneGradient)"/><circle cx="304" cy="90" r="45" fill="#fff" opacity=".35"/>`;
  if(scene===0||scene===7)out+=`<path d="M20 0V295 H340V0" fill="#fff" opacity=".1"/><path d="M0 270 Q45 236 90 270 V0 H109 V270 Q180 220 251 270 V0 H270 V270 Q315 236 360 270 V310 H0Z" fill="#fff" opacity=".27"/><path d="M16 0V275 M344 0V275" stroke="#fff" stroke-width="10" opacity=".25"/><path d="M0 510H360 M0 550H360" stroke="#fff" stroke-width="4" opacity=".35"/>`;
  if(scene===1)out+=`<path d="M0 350 L35 255 74 340 110 235 150 340 215 235 265 345 317 250 360 345V600H0Z" fill="#fff" opacity=".46"/><path d="M0 405 Q180 360 360 405 V600H0Z" fill="#fff" opacity=".45"/>`;
  if(scene===2||scene===4)out+=`<path d="M0 397 Q90 345 170 396 Q264 349 360 400V600H0Z" fill="#7fc692" opacity=".34"/><path d="M0 485 Q160 430 360 480 V600H0Z" fill="#71ba86" opacity=".3"/><path d="M32 360V230 M328 350V215" stroke="#679b7d" stroke-width="13" opacity=".4"/><circle cx="32" cy="215" r="63" fill="#82c59a" opacity=".48"/><circle cx="328" cy="200" r="69" fill="#82c59a" opacity=".43"/>`;
  if(scene===3||scene===6)out+=`<path d="M0 434 Q150 390 360 435 V600H0Z" fill="#fff" opacity=".17"/><circle cx="289" cy="84" r="28" fill="#fff6df" opacity=".85"/>`;
  if(scene===5)out+=`<path d="M0 350 Q120 265 220 350 T360 350 V600H0Z" fill="#fff" opacity=".38"/><path d="M30 200 Q180 55 335 195" fill="none" stroke="#ffb3b3" stroke-width="13" opacity=".45"/><path d="M36 205 Q180 69 330 202" fill="none" stroke="#ffdb8f" stroke-width="11" opacity=".47"/><path d="M42 211 Q180 83 325 208" fill="none" stroke="#ace8c7" stroke-width="10" opacity=".48"/>`;
  for(let i=0;i<17;i++){const x=(i*71+26)%350,y=(i*97+45)%365+15;out+=princessMotif(scene===1?'snow':scene===2||scene===4?'flower':'star',x,y,3+(i%3),scene===3?'#ffebae':'#fff')}
  return out+`<ellipse cx="180" cy="565" rx="129" ry="19" fill="#53627a" opacity=".12"/>`;
}
function princessHairBack(h){const c=h.color;let p=`<path d="M124 164 Q110 79 180 78 Q250 78 239 169 L247 248 Q222 266 205 235 L154 236 Q130 262 110 241Z" fill="url(#hairGradient)"/>`;
  if([1,2,6,8,9].includes(h.style))p+=`<path d="M124 144 Q92 214 115 315 Q138 330 143 303 Q135 250 149 191 M235 145 Q270 210 244 316 Q222 328 217 303 Q231 230 209 185" fill="${c}"/>`;
  if(h.style===3)p+=`<path d="M224 104 Q280 130 280 207 Q285 264 259 292 Q242 283 250 269 Q260 221 241 170Z" fill="${c}"/>`;
  if(h.style===4||h.style===5)p+=`<circle cx="180" cy="88" r="37" fill="${c}"/>`;
  if(h.style===5||h.style===10)p+=`<path d="M120 146 Q77 170 102 264 Q117 288 130 268 L145 174 M239 146 Q282 170 258 264 Q243 288 230 268 L215 174" fill="${c}"/>`;
  if(h.style===2||h.style===8)p+=`<path d="M238 181 Q277 210 253 263 Q284 282 253 304 Q274 326 247 340" fill="none" stroke="${c}" stroke-width="24" stroke-linecap="round"/><path d="M245 205 L263 220 M246 240 L266 255 M246 273 L262 287 M247 307 L260 317" stroke="#fff" stroke-opacity=".42" stroke-width="7"/>`;
  return p;
}
function princessHairFront(h){const c=h.color;let p=`<path d="M129 142 Q117 95 153 85 Q201 61 234 101 Q246 117 231 146 Q204 125 190 111 Q167 145 129 142Z" fill="url(#hairGradient)"/><path d="M129 130 Q116 165 132 202" fill="none" stroke="${c}" stroke-width="18" stroke-linecap="round"/><path d="M230 129 Q246 166 229 204" fill="none" stroke="${c}" stroke-width="18" stroke-linecap="round"/>`;
  if(h.style===0||h.style===7)p+=`<path d="M121 169 Q110 213 132 228 Q145 230 148 210 M238 165 Q252 210 228 227 Q213 228 211 208" fill="${c}"/>`;
  if([1,6,9].includes(h.style))p+=`<path d="M129 113 Q158 132 189 106 Q217 131 230 114" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="5"/>`;
  if(h.style===3)p+=`<path d="M221 90 Q245 94 250 122" fill="none" stroke="${c}" stroke-width="12"/>`;
  if(h.style===10)p+=`<circle cx="117" cy="172" r="11" fill="#f3c4ce"/><circle cx="242" cy="172" r="11" fill="#f3c4ce"/>`;
  if(h.style===2||h.style===8){
    const shade=princessShade(c,-.18),shine=princessShade(c,.16);
    p+=`<path d="M229 150 Q253 170 252 216 Q266 245 252 285 Q261 310 246 339" fill="none" stroke="${shade}" stroke-width="22" stroke-linecap="round"/>`;
    [[240,214,-18],[250,238,18],[242,262,-18],[252,286,18],[245,310,-15]].forEach(([x,y,r])=>{p+=`<ellipse cx="${x}" cy="${y}" rx="16" ry="12" transform="rotate(${r} ${x} ${y})" fill="${c}" stroke="${shade}" stroke-width="2"/><path d="M${x-9} ${y-3} Q${x} ${y-10} ${x+9} ${y-3}" fill="none" stroke="${shine}" stroke-width="3" stroke-linecap="round"/>`});
    p+=`<path d="M234 326 Q246 341 258 326" fill="none" stroke="${shine}" stroke-width="5"/><path d="M240 338 L250 349 L256 335" fill="${c}" stroke="${shade}" stroke-width="2"/>`;
  }
  return p;
}
function princessSkirt(d){const paths=['M143 316 Q89 335 48 508 Q178 551 312 508 Q274 337 217 316Z','M143 316 Q101 353 64 510 Q175 548 296 510 Q255 350 217 316Z','M143 316 Q68 338 39 518 Q180 565 321 518 Q292 339 217 316Z','M143 316 Q82 353 65 505 Q176 544 298 505 Q281 354 217 316Z','M143 316 Q108 361 75 521 Q184 544 287 512 Q246 359 217 316Z','M143 316 Q115 354 95 525 Q180 550 265 525 Q243 351 217 316Z'];return paths[d.cut]}
function princessDressSvg(d){
  const classic=d.name==='森林舞会',icy=d.name==='冰雪星光';
  let out=`<path d="${princessSkirt(d)}" fill="${princessShade(d.skirt,-.24)}" opacity=".3" transform="translate(2 5)"/><path d="${princessSkirt(d)}" fill="url(#skirtGradient)" stroke="${princessShade(d.skirt,-.19)}" stroke-width="2.5"/>`;
  out+=`<path d="M146 332 Q110 418 102 502 Q122 516 139 521 Q139 432 164 336Z" fill="#fff" opacity=".18"/><path d="M214 334 Q246 420 259 501 Q237 516 221 522 Q223 432 197 338Z" fill="${princessShade(d.skirt,-.22)}" opacity=".22"/>`;
  out+=`<path d="M149 334 Q124 428 127 512 M178 341 Q172 445 175 526 M210 335 Q230 426 230 510" fill="none" stroke="#fff" stroke-opacity=".29" stroke-width="3" stroke-linecap="round"/><path d="M78 505 Q180 545 283 505" fill="none" stroke="${d.trim}" stroke-opacity=".65" stroke-width="4"/>`;
  if(d.cut===1||d.cut===3)out+=`<path d="M92 409 Q180 461 268 408 Q267 475 293 497 Q179 532 66 497 Q98 473 92 409Z" fill="${d.trim}" opacity=".15"/><path d="M92 408 Q180 456 268 408" fill="none" stroke="#fff" stroke-width="4" opacity=".6"/>`;
  if(d.cut===2)out+=`<path d="M117 337 Q72 407 60 504 Q91 523 130 530 Q116 462 134 356 M243 337 Q288 407 300 504 Q269 523 230 530 Q244 462 226 356" fill="${d.trim}" opacity=".25"/>`;
  if(d.cut===4)out+=`<path d="M148 338 Q189 414 249 504 Q230 520 209 526 Q168 429 138 357Z" fill="#fff" opacity=".28"/>`;
  if(icy)out+=`<path d="M145 319 Q119 358 81 516 Q86 527 99 532 Q129 409 153 348 M214 319 Q244 368 278 515 Q267 530 254 532 Q233 423 207 348" fill="#faffff" opacity=".42"/><path d="M102 510 Q181 540 258 510" fill="none" stroke="#fff" stroke-width="5" opacity=".83"/>`;
  out+=`<path d="M144 235 Q163 225 180 244 Q198 225 216 235 L223 302 Q207 317 180 332 Q151 317 137 302Z" fill="url(#topGradient)" stroke="${princessShade(d.top,-.19)}" stroke-width="2.5"/><path d="M146 241 Q180 276 214 241" fill="none" stroke="${d.trim}" stroke-width="5"/><path d="M140 298 Q181 323 220 298" fill="none" stroke="${d.trim}" stroke-width="3.5" opacity=".8"/>`;
  out+=`<path d="M137 259 Q110 259 110 290 Q112 316 140 307 L152 281Z" fill="url(#sleeveGradient)" stroke="${princessShade(d.top,-.19)}" stroke-width="2"/><path d="M223 259 Q250 259 250 290 Q248 316 220 307 L208 281Z" fill="url(#sleeveGradient)" stroke="${princessShade(d.top,-.19)}" stroke-width="2"/><path d="M116 292 Q129 304 140 295 M244 292 Q231 304 220 295" fill="none" stroke="${d.trim}" stroke-width="3"/>`;
  if(classic)out+=`<path d="M116 272 L142 297 M111 284 L136 308 M244 272 L218 297 M249 284 L224 308" stroke="#e35162" stroke-width="5" opacity=".9"/><path d="M154 238 Q180 259 206 238" fill="none" stroke="#f8f4df" stroke-width="6"/>`;
  if(icy)out+=`<path d="M153 243 Q180 263 207 243" fill="none" stroke="#ecfcff" stroke-width="6"/><path d="M166 250 L180 267 L194 250" fill="none" stroke="#fff" stroke-width="3"/>`;
  const coords=d.cut===5?[[123,418,6],[161,389,5],[211,396,5],[243,430,6],[111,487,6],[153,477,6],[204,480,6],[246,488,6],[180,445,8]]:[[102,423,7],[145,403,5],[211,394,6],[265,433,7],[84,486,6],[141,478,6],[204,479,6],[275,487,6],[179,442,8]];
  for(const [x,y,size] of coords)out+=princessMotif(d.motif,x,y,size,d.trim);
  out+=princessMotif(d.motif,181,288,10,d.trim);return out;
}
function princessHeadSvg(o){if(!o)return '';const c=o.color;if(o.name.includes('蝴蝶结')||o.name.includes('丝带'))return `<path d="M151 96 Q111 58 114 100 Q116 121 158 110 Q184 119 184 103 Q184 88 158 98 Q202 56 213 92 Q211 116 179 110" fill="${c}" stroke="#fff" stroke-width="3"/><circle cx="168" cy="104" r="10" fill="#f7d67a"/>`;
  if(o.name.includes('花')||o.name.includes('樱桃'))return `<path d="M129 112 Q177 62 232 110" fill="none" stroke="${c}" stroke-width="9"/>${[140,163,187,213].map((x,i)=>princessMotif('flower',x,97-(i%2)*11,10,c)).join('')}`;
  if(o.name.includes('发夹'))return princessMotif('star',218,115,13,c);
  return `<path d="M130 107 L129 75 L151 93 L167 57 L181 88 L196 56 L211 92 L233 75 L231 107 Q180 119 130 107Z" fill="${c}" stroke="#fff" stroke-width="3"/><path d="M142 101 Q181 111 220 101" fill="none" stroke="#c68b5d" stroke-opacity=".4" stroke-width="4"/>${princessMotif(o.name.includes('冰')?'snow':'gem',181,87,8,'#ffffff')}`;
}
function princessShade(hex,factor){const v=hex.replace('#','');return '#'+[0,2,4].map(i=>{const n=parseInt(v.slice(i,i+2),16),out=factor>=0?n+(255-n)*factor:n*(1+factor);return Math.round(out).toString(16).padStart(2,'0')}).join('')}
function princessHairImage(index,character){
  if(character==='snow'&&index===0)return '';
  const looks=[['auburn-updo','grayscale(1) brightness(.4)',18,250,245],['ice-braid','none',59,250,250],['gold-curls','none',59,250,285],['auburn-updo','none',18,250,245],['gold-curls','hue-rotate(295deg) saturate(.8)',59,250,285],['gold-curls','hue-rotate(145deg) saturate(.55)',59,250,285],['auburn-updo','hue-rotate(255deg) saturate(.8)',18,250,245],['auburn-updo','hue-rotate(340deg)',18,250,245],['auburn-updo','brightness(.52) saturate(.8)',18,250,245],['gold-curls','saturate(.8) brightness(.9)',59,250,285],['auburn-updo','hue-rotate(145deg) saturate(.7)',18,250,245],['ice-braid','hue-rotate(75deg) saturate(1.4) brightness(.8)',59,250,250]];
  const [asset,filter,y,width,height]=looks[index]||looks[0];
  return `<image href="princess-assets/${asset}.png" x="55" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none" style="filter:${filter}"/>`;
}
function princessFaceImage(index,character){return `<image href="princess-assets/${character==='snow'&&index===0?'snow-bob':character+'-face'}.png" x="100" y="80" width="160" height="175" preserveAspectRatio="none"/>`}
function princessHairThumb(index){const character=princessState.character;return `<svg class="princess-hair-thumb" viewBox="80 50 200 220" aria-hidden="true">${princessFaceImage(index,character)}${princessHairImage(index,character)}</svg>`}
function princessCharacterThumb(character){const hair=princessDefaults[character].hair;return `<svg viewBox="80 50 200 220" aria-hidden="true">${princessFaceImage(hair,character)}${princessHairImage(hair,character)}</svg>`}
function princessSvg(){const s=princessSelection(),d=princessWardrobe.dress[s.dress],h=princessWardrobe.hair[s.hair],scene=princessWardrobe.scene[s.scene],head=princessWardrobe.head[s.head],neck=princessWardrobe.necklace[s.necklace],ears=princessWardrobe.earrings[s.earrings],wand=princessWardrobe.wand[s.wand],shoes=princessWardrobe.shoes[s.shoes],cape=princessWardrobe.cape[s.cape],bag=princessWardrobe.bag[s.bag];
  const end=scene.color==='#343d75'?'#6f79b7':'#ffffff',character=princessCharacter(),skin=character.skin,skinEdge=princessShade(skin,-.1);
  return `<svg class="princess-art" viewBox="0 0 360 600" role="img" aria-label="${character.name}穿着${d.name}，背景是${scene.name}"><defs><linearGradient id="sceneGradient" x2="0" y2="1"><stop stop-color="${scene.color}"/><stop offset="1" stop-color="${end}"/></linearGradient><linearGradient id="skirtGradient" x2=".7" y2="1"><stop stop-color="${d.skirt}"/><stop offset="1" stop-color="${princessShade(d.skirt,-.13)}"/></linearGradient><linearGradient id="sleeveGradient" x2="1" y2="1"><stop stop-color="${princessShade(d.top,.3)}"/><stop offset="1" stop-color="${princessShade(d.top,-.15)}"/></linearGradient><linearGradient id="topGradient" x2="1" y2="1"><stop stop-color="${d.top}"/><stop offset="1" stop-color="${d.skirt}"/></linearGradient><linearGradient id="hairGradient" x2="1" y2="1"><stop stop-color="${h.color}"/><stop offset=".52" stop-color="${h.color}"/><stop offset="1" stop-color="${princessShade(h.color,.18)}"/></linearGradient></defs>${princessSceneSvg(s.scene)}
    ${s.cape?`<path d="M145 230 Q107 247 64 493 Q177 555 301 493 Q251 247 216 230Z" fill="${cape.color}" opacity=".73" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>`:''}
    <path d="M151 420 L149 550 Q160 560 171 551 L177 422 M184 422 L189 552 Q200 558 211 547 L208 420" fill="${skin}" stroke="${skinEdge}" stroke-width="2"/>
    <path d="M146 541 Q139 554 143 560 Q157 567 177 560 L175 548 Q163 543 146 541 M186 548 L185 560 Q205 568 220 559 Q220 550 210 541 Q196 543 186 548" fill="${shoes.color}" stroke="#fff" stroke-width="2"/>
    <path d="M165 198 L164 237 Q180 255 197 237 L195 198" fill="${skin}"/>
    ${princessFaceImage(s.hair,princessState.character)}
    ${princessDressSvg(d)}
    <path d="M114 298 Q106 321 87 354 Q77 370 83 380 Q89 386 97 378 Q114 349 126 308Z M246 298 Q254 321 273 354 Q283 370 277 380 Q271 386 263 378 Q246 349 234 308Z" fill="${skin}" stroke="${skinEdge}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="87" cy="377" rx="8" ry="12" transform="rotate(18 87 377)" fill="${skin}" stroke="${skinEdge}" stroke-width="1.5"/><ellipse cx="273" cy="377" rx="8" ry="12" transform="rotate(-18 273 377)" fill="${skin}" stroke="${skinEdge}" stroke-width="1.5"/><path d="M94 355 Q87 367 86 374 M266 355 Q273 367 274 374" fill="none" stroke="${princessShade(skin,.2)}" stroke-width="2" stroke-linecap="round"/>
    ${princessHairImage(s.hair,princessState.character)}
    ${s.earrings?`<path d="M128 174 V194 M232 174 V194" stroke="#cfad72" stroke-width="2"/><circle cx="128" cy="197" r="6" fill="${ears.color}" stroke="#fff" stroke-width="1.5"/><circle cx="232" cy="197" r="6" fill="${ears.color}" stroke="#fff" stroke-width="1.5"/>`:''}
    ${s.necklace?`<path d="M158 220 Q180 250 202 220" fill="none" stroke="#e8d59a" stroke-width="3"/>${princessMotif(neck.name.includes('星')?'star':neck.name.includes('花')?'flower':neck.name.includes('心')?'heart':neck.name.includes('雪')?'snow':'gem',180,239,8,neck.color)}`:''}
    ${s.bag?`<path d="M87 353 Q86 338 101 338 Q116 338 116 353" fill="none" stroke="#dfc58a" stroke-width="4"/><rect x="82" y="353" width="39" height="33" rx="9" fill="${bag.color}" stroke="#fff" stroke-width="2"/>${princessMotif('star',102,369,6,'#fff')}`:''}
    ${s.wand?`<path d="M269 351 L308 270" stroke="#d4a96f" stroke-width="6" stroke-linecap="round"/>${princessMotif(wand.name.includes('花')?'flower':wand.name.includes('心')?'heart':wand.name.includes('雪')?'snow':'star',309,267,18,wand.color)}<circle cx="273" cy="350" r="7" fill="${skin}"/>`:''}
    ${s.head?princessHeadSvg(head):''}</svg>`;
}
function princessDressThumb(d){return `<svg class="princess-dress-thumb" viewBox="0 0 54 60" aria-hidden="true"><path d="M21 7 Q27 12 33 7 L38 26 Q27 31 16 26Z" fill="${d.top}" stroke="${d.trim}" stroke-width="2"/><path d="M17 25 Q9 30 5 54 Q27 61 49 54 Q45 30 37 25Z" fill="${d.skirt}" stroke="${d.trim}" stroke-width="2"/><path d="M17 25 Q27 31 37 25" fill="none" stroke="${d.trim}" stroke-width="2"/>${princessMotif(d.motif,27,43,6,d.trim)}</svg>`}
function princessChoices(){const cat=princessState.category,cur=princessSelection()[cat];return `<div class="princess-choice-head"><b>${princessCategories.find(x=>x[0]===cat)[2]} ${princessCategories.find(x=>x[0]===cat)[1]}</b><span>${princessWardrobe[cat].length} 款可选</span></div><div class="princess-choice-grid">${princessWardrobe[cat].map((o,i)=>`<button class="princess-choice ${i===cur?'selected':''}" onclick="princessPick('${cat}',${i})" aria-pressed="${i===cur}" aria-label="选择${o.name}"><span class="princess-choice-preview" style="--choice-color:${o.color||o.skirt||o.top}">${cat==='dress'?princessDressThumb(o):cat==='hair'?princessHairThumb(i):o.icon}</span><b>${o.name}</b>${i===cur?'<em>✓</em>':''}</button>`).join('')}</div>`}
function renderPrincessGame(){const character=princessCharacter();return `<section class="princess-game"><div class="princess-intro"><div><span class="princess-kicker">✨ 果粒橙的魔法衣橱</span><h1>公主换装舞会</h1><p>先选一位公主，再为她换礼服、发型和首饰。换好后她会和你说话！</p></div><span class="princess-intro-icon">👑</span></div><div class="princess-character-bar"><div class="princess-characters" aria-label="选择公主">${princessCharacters.map(c=>`<button class="${c.id===character.id?'active':''}" onclick="princessSwitch('${c.id}')" aria-pressed="${c.id===character.id}" aria-label="选择${c.name}"><span class="princess-character-portrait">${princessCharacterThumb(c.id)}</span><b>${c.name}</b></button>`).join('')}</div><button class="princess-top-finish" onclick="princessFinish()">✨ 换好啦！</button></div><div class="princess-layout"><div class="princess-stage-wrap"><div class="princess-stage" id="princessStage">${princessSvg()}</div><div class="princess-stage-caption">${character.icon} ${character.name} · ${princessWardrobe.dress[princessSelection().dress].name}</div><div class="princess-actions"><button onclick="princessRandom()">🎲 惊喜搭配</button><button class="princess-finish" onclick="princessFinish()">✨ 换好啦，见公主！</button></div></div><div class="princess-closet"><div class="princess-tabs">${princessCategories.map(([id,label,icon])=>`<button class="${princessState.category===id?'active':''}" onclick="princessCategory('${id}')">${icon} ${label}</button>`).join('')}</div><div id="princessChoices">${princessChoices()}</div></div></div><div class="princess-note">10 位公主都有自己的衣橱。搭配自动保存在这台平板，下次进来还能继续换。</div><div class="princess-celebration hidden" id="princessCelebration" role="dialog" aria-modal="true" aria-label="公主的问候"></div></section>`}
function princessRefresh(){const stage=document.querySelector('#princessStage'),choices=document.querySelector('#princessChoices');if(stage)stage.innerHTML=princessSvg();if(choices)choices.innerHTML=princessChoices();const caption=document.querySelector('.princess-stage-caption'),character=princessCharacter();if(caption)caption.textContent=`${character.icon} ${character.name} · ${princessWardrobe.dress[princessSelection().dress].name}`;document.querySelectorAll('.princess-tabs button').forEach((b,i)=>b.classList.toggle('active',princessCategories[i][0]===princessState.category))}
function princessCategory(cat){if(!princessWardrobe[cat])return;princessState.category=cat;princessRefresh()}
function princessPick(cat,i){if(!princessWardrobe[cat]?.[i])return;princessState[princessState.character][cat]=i;princessPersist();princessRefresh();if(!state.muted)tone(523+Math.random()*160,.08)}
function princessSwitch(character){if(!princessState[character])return;princessState.character=character;princessState.category='dress';princessState.celebrating=false;stopAudio();render()}
function princessReset(){princessClose();princessState[princessState.character]={...princessDefaults[princessState.character]};princessState.category='dress';princessPersist();render()}
function princessRandom(){const s=princessSelection();for(const key of Object.keys(princessWardrobe))s[key]=Math.floor(Math.random()*princessWardrobe[key].length);princessPersist();princessRefresh();if(!state.muted){tone(523,.11);setTimeout(()=>tone(659,.11),110);setTimeout(()=>tone(784,.15),220)}}
function princessGreeting(step){const who=princessCharacter().name;if(step===0)return `你好，果粒橙小朋友！我是${who}。你帮我挑的衣服真漂亮！我们以后做好朋友，好吗？`;return '太好啦！果粒橙小朋友，我们一起跳舞吧！'}
function princessShowCelebration(){const el=document.querySelector('#princessCelebration');if(!el)return;const step=princessState.step;el.classList.remove('hidden');el.innerHTML=`<div class="princess-confetti" aria-hidden="true">${Array.from({length:22},(_,i)=>`<i style="--n:${i};--x:${(i*47)%100}%;--delay:${(i%6)*.17}s">${i%3===0?'✨':i%3===1?'💖':'⭐'}</i>`).join('')}</div><div class="princess-dialog"><button class="princess-dialog-close" onclick="princessClose()" aria-label="关闭">×</button><div class="princess-dialog-avatar">${princessSvg().replace('viewBox="0 0 360 600"','viewBox="85 70 190 190"')}</div><h2>${step===0?'公主来找你啦！':'我们是好朋友！'}</h2><p>${princessGreeting(step)}</p><div class="princess-dialog-actions">${step===0?'<button class="princess-yes" onclick="princessReply()">💖 好呀，做好朋友！</button>':'<button class="princess-yes" onclick="princessClose()">👗 继续换装</button>'}<button onclick="princessPlayVoice()">🔊 再听一遍</button></div></div>`}
function princessPlayVoice(){
  if(state.muted)return;
  stopAudio();
  const run=voiceRun,page=state.page,game=state.game,character=princessState.character,step=princessState.step,greeting=princessGreeting(step);
  const name=step&&!['snow','ice'].includes(character)?'friend':character,suffix=step?'reply':'hello';
  let usedFallback=false;
  const fallback=()=>{
    if(usedFallback||run!==voiceRun||state.muted||page!=='game'||game!=='princess'||state.page!==page||state.game!==game||princessState.character!==character||princessState.step!==step)return;
    usedFallback=true;
    fallbackSpeech(greeting,'zh-CN',undefined,run);
  };
  player.src=`princess-voices/${name}-${suffix}.mp3`;
  player.onerror=fallback;
  player.play().catch(fallback);
}
function princessFinish(){princessState.step=0;princessState.celebrating=true;const signature=princessState.character+JSON.stringify(princessSelection());if(princessState.lastRewarded!==signature){princessState.lastRewarded=signature;reward()}princessShowCelebration();princessPlayVoice()}
function princessReply(){princessState.step=1;princessShowCelebration();princessPlayVoice();if(!state.muted){setTimeout(()=>tone(659,.12),100);setTimeout(()=>tone(784,.18),250)}}
function princessClose(){princessState.celebrating=false;stopAudio();document.querySelector('#princessCelebration')?.classList.add('hidden')}
Object.assign(window,{renderPrincessGame,princessPick,princessCategory,princessSwitch,princessReset,princessRandom,princessFinish,princessReply,princessPlayVoice,princessClose});
