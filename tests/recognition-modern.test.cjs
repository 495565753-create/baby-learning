const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function load(saved){
 let stored=saved||null;
 const s={console,Date,setTimeout,clearTimeout,state:{page:'home',stack:[]},localStorage:{getItem:()=>stored,setItem:(k,v)=>{stored=v;}},stopAudio(){},playSpoken(t){s.lastSpoken=t;}};
 s.window=s;vm.createContext(s);
 for(const n of ['recognition-data.js','recognition.js'])vm.runInContext(fs.readFileSync(path.join(root,n),'utf8'),s);
 s.render=()=>{s.html=s.state.page==='lesson'?s.KNOW.renderLesson():s.KNOW.renderHub();};
 s.go=(page)=>{s.state.page=page;s.render();};
 return s;
}

test('24张现代卡片包含所需概念，每张独立原创图存在且无外部执行内容',()=>{
 const s=load();const cats=s.RECOGNITION.categories.filter(c=>c.modern);const items=cats.flatMap(c=>c.items);
 assert.equal(cats.length,3);assert.equal(items.length,24);
 for(const expected of ['AI 人工智能','抖音','B 站','YouTube','中国','美国','战争','和平'])assert.ok(items.some(i=>i.word===expected));
 const illustrations=new Set();
 for(const item of items){
  assert.equal(item.quiz,false);const image=fs.readFileSync(path.join(root,item.image),'utf8');assert.match(image,/<svg/);assert.match(image,/viewBox="0 0 360 360"/);assert.doesNotMatch(image,/<script|foreignObject|(?:xlink:)?href=["']http|onload=/i);illustrations.add(crypto.createHash('sha256').update(image).digest('hex'));
 }
 assert.equal(illustrations.size,24);
 assert.match(items.find(i=>i.word==='AI 人工智能').text,/不是真人.*答错/);
 assert.match(items.find(i=>i.word==='战争').text,/伤害人.*不是游戏.*和平/);
 assert.doesNotMatch(items.map(i=>i.text).join(''),/坏国家|邪恶国家|所有视频都适合|都是最近发明/);
});

test('学完旧物品后每日可讲新概念，三图测验仍采用可辨认的物品',()=>{
 const initial=load();const recognized=initial.RECOGNITION.categories.filter(c=>!c.modern).flatMap(c=>c.items.map(i=>`${c.id}/${i.id}`));
 const s=load(JSON.stringify({version:2,recognized,favorites:[],daily:null}));s.KNOW.renderHub();const p=s.KNOW._test.getProgress();
 assert.equal(p.daily.ids.length,6);assert.ok(p.daily.ids.every(k=>s.KNOW._test.entryFromKey(k).category.modern));
 assert.equal(p.daily.questions.length,3);
 for(const q of p.daily.questions)for(const key of q.options){const e=s.KNOW._test.entryFromKey(key);assert.notEqual(e.category.id,'family');assert.notEqual(e.category.quiz,false);assert.notEqual(e.item.quiz,false);}
});

test('首页公开入口可打开中国、收藏及统计；独立图不误用旧图集',()=>{
 const s=load();s.KNOW.openModern('中国');assert.match(s.html,/<h1>中国<\/h1>/);assert.match(s.html,/src="assets\/recognition-modern-v1\/china.svg"/);assert.doesNotMatch(s.html,/world_peace.webp/);assert.match(s.lastSpoken,/这是中国/);
 s.KNOW.actions.toggleFavorite();assert.equal(s.KNOW.summary().favoritesCount,1);s.KNOW.openFavorites();assert.match(s.html,/我喜欢的卡片/);assert.match(s.html,/再看中国/);assert.doesNotMatch(s.html,/data-know-category-swipe/);
 const summary=s.KNOW.summary();assert.equal(summary.totalItems,264);assert.equal(summary.totalCategories,23);assert.equal(summary.dailyTarget,6);assert.equal(summary.dailyDone,false);
 s.KNOW.actions.openFavorite('world_peace/world_peace-03');assert.match(s.html,/<h1>中国<\/h1>/);
});

test('53条新音频映射与正文、清单及磁盘校验匹配，旧映射不覆盖',()=>{
 const s=load();s.VOICE_MAP={'zh|原有正文':'original.mp3'};vm.runInContext(fs.readFileSync(path.join(root,'modern-voice-map.js'),'utf8'),s);assert.equal(s.VOICE_MAP['zh|原有正文'],'original.mp3');
 const m=JSON.parse(fs.readFileSync(path.join(root,'voice-modern-v1/manifest.json'),'utf8'));assert.equal(Object.keys(m.files).length,53);assert.equal(m.voice,'zh-CN-XiaoxiaoNeural');
 for(const [text,item] of Object.entries(m.files)){assert.equal(s.VOICE_MAP['zh|'+text],item.file+'?v=1');const audio=fs.readFileSync(path.join(root,item.file));assert.equal(crypto.createHash('sha256').update(audio).digest('hex'),item.sha256);assert.equal(item.full_decode_passed,true);assert.ok(item.duration>1&&item.duration<40);assert.ok(item.peak_dbfs<=-.5);}
 for(const category of s.RECOGNITION.categories.filter(c=>c.modern))for(const item of category.items)assert.ok(s.VOICE_MAP['zh|'+item.text]);
});
