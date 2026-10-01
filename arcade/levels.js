(() => {
'use strict';

const GAMES = [
  {id:'traffic',name:'车车出逃',art:'car',help:'点一辆车，再用手指顺着车的方向滑动。把挡路的车挪开，让红色小车开到右边出口。'},
  {id:'boxes',name:'星星搬运队',art:'box',help:'在画面上滑一滑，把箱子推到星星上。先看好路再推，走错了可以点弯箭头退回来。'},
  {id:'maze',name:'迷宫寻宝',art:'maze',help:'在画面上滑一滑来找路。先收集所有星星，再走进小房子。'},
  {id:'pipes',name:'水管小工程师',art:'pipes',help:'轻点水管，它就会转身。把水龙头和小花连起来。'},
  {id:'slide',name:'图片拼拼乐',art:'slider',help:'点空格旁边的图片，把图案拼完整。上面的小图可以帮你看答案。'}
];
const $ = selector => document.querySelector(selector);
const board = $('#game-board'), controls = $('#game-controls'), metric = $('#game-metric'), status = $('#game-status');
const icon = (name, className='') => `<img class="${className}" src="assets/fluent/${name}.svg?v=2" alt="" draggable="false">`;
const deepCopy = value => JSON.parse(JSON.stringify(value));
const voice = new Audio(); voice.id='kid-voice'; voice.hidden=true; voice.preload='auto'; voice.setAttribute('aria-hidden','true'); document.body.append(voice);
const music = {
  ctx:null,timer:null,next:0,index:0,muted:localStorage.getItem('kid-challenge-muted')==='yes',notes:[60,64,67,72,69,65,62,67],
  start(){if(this.muted)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;this.ctx ||= new A();this.ctx.resume();if(!this.timer)this.timer=setInterval(()=>this.tick(),250);this.tick()}catch(_){}},
  tick(){if(this.muted||document.hidden||!this.ctx||this.ctx.state!=='running')return;if(this.next<this.ctx.currentTime)this.next=this.ctx.currentTime+.05;while(this.next<this.ctx.currentTime+.7){this.tone(440*2**((this.notes[this.index++%this.notes.length]-69)/12),.32,.011,this.next);this.next+=.4}},
  tone(f,d=.12,volume=.05,when){if(this.muted||!this.ctx)return;try{const t=when??this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+d+.025)}catch(_){}},
  tap(good=true){try{navigator.vibrate?.(good?16:9)}catch(_){}this.start();this.tone(good?690:260,.13,good?.055:.025)}
};
function say(key){try{voice.pause();voice.currentTime=0;voice.src=`voice/${key}.mp3?v=2`;voice.play().catch(()=>{})}catch(_){}}
function note(message,spoken){status.textContent=message;if(spoken)say(spoken)}
function completed(id){try{return new Set(JSON.parse(localStorage.getItem(`levels-done-${id}`)||'[]'))}catch(_){return new Set()}}
function unlocked(id){return Math.min(50,Math.max(1,Number(localStorage.getItem(`levels-open-${id}`))||1))}
let current=GAMES[0],number=1,phase='intro',state=null,history=[],moves=0,selectedCar=0,swiped=false;

function cards(){
  $('#level-game-list').innerHTML=GAMES.map(game=>`<button class="game-card ${game.id===current.id?'active':''}" data-game="${game.id}" type="button" aria-label="${game.name}，已完成${completed(game.id).size}关">${icon(game.art,'card-art')}<span class="level-card-progress">${icon('star')}${completed(game.id).size}/50</span><span class="sr-only">${game.name}</span></button>`).join('');
}
function picker(){
  $('#level-picker').innerHTML=Array.from({length:50},(_,i)=>`<button data-pick="${i+1}" type="button" ${i+1>unlocked(current.id)?'disabled':''} class="${completed(current.id).has(i+1)?'done':''}" aria-label="第${i+1}关">${i+1}</button>`).join('');
}
function nav(){
  $('#level-number').innerHTML=`${number}<span>/50</span>`;
  $('#level-number').setAttribute('aria-label',`第${number}关，共50关`);
  $('#previous-level').disabled=number<=1;
  $('#next-level').disabled=number>=unlocked(current.id)||number>=50;
  picker();
}
function setMetric(art,value,extra=''){
  metric.innerHTML=icon(art)+`<b>${value}</b>`+extra;
  metric.setAttribute('aria-label',`第${number}关，${value}`);
}
function showIntro(){
  phase='intro';board.innerHTML=`<div class="intro">${icon(current.art,'intro-art')}<button class="primary big-play" data-action="start" type="button" aria-label="开始第${number}关">${icon('play')}</button></div>`;
  controls.replaceChildren();setMetric(current.art,`${number}/50`);note(current.help);nav();
}
function selectGame(id,scroll=true){
  const found=GAMES.find(game=>game.id===id);if(!found)return;
  voice.pause();current=found;number=unlocked(id);$('#play-icon').src=`assets/fluent/${found.art}.svg?v=2`;
  $('#play-title').textContent=found.name;$('#parent-game-info').innerHTML=`<strong>${found.name}</strong><p>${found.help}</p>`;
  history=[];cards();showIntro();
  if(location.hash!==`#${id}`)window.history.replaceState(null,'',`#${id}`);
  if(scroll)$('#play').scrollIntoView({behavior:'auto',block:'start'});
}
function selectLevel(value){
  if(value<1||value>unlocked(current.id)||value>50)return;
  number=value;showIntro();startLevel(true);
}
function remember(){history.push({state:deepCopy(state),moves,selectedCar});if(history.length>100)history.shift()}
function undo(){if(phase!=='playing'||!history.length){music.tap(false);return}const previous=history.pop();state=previous.state;moves=previous.moves;selectedCar=previous.selectedCar;music.tap();draw()}
function startLevel(next=false){
  phase='playing';state=deepCopy(window.LevelData[current.id][number-1]);
  if(current.id==='maze')state.player=state.size+1;
  history=[];moves=0;selectedCar=0;music.start();draw();
  say(next?'levels-next':`level-${current.id}-intro`);nav();
}
function finish(){
  if(phase!=='playing')return;
  phase='done';music.tap();music.tone(910,.36,.065);
  const done=completed(current.id);done.add(number);localStorage.setItem(`levels-done-${current.id}`,JSON.stringify([...done].sort((a,b)=>a-b)));
  localStorage.setItem(`levels-open-${current.id}`,String(Math.min(50,Math.max(unlocked(current.id),number+1))));
  cards();nav();
  board.innerHTML=`<div class="result">${icon('win','complete-art')}<div class="complete-actions"><button data-action="restart" type="button" aria-label="再玩一次">${icon('repeat')}</button>${number<50?`<button data-action="next" type="button" aria-label="下一关">${icon('right-arrow')}</button>`:''}<button data-action="catalog" type="button" aria-label="换游戏">${icon('home')}</button></div></div>`;
  controls.replaceChildren();setMetric('star',`${done.size}/50`);note(number===50?'五十关全部完成啦':'这一关成功啦',number===50?'levels-final':'levels-win');
}
function directionControls(withUndo=true){
  controls.innerHTML=`<div class="level-controls"><button data-action="left" type="button" aria-label="向左">←</button><button data-action="up" type="button" aria-label="向上">↑</button><button data-action="down" type="button" aria-label="向下">↓</button><button data-action="right" type="button" aria-label="向右">→</button>${withUndo?`<button data-action="undo" type="button" aria-label="撤销一步">↶</button>`:''}<button data-action="restart" type="button" aria-label="重新开始">↻</button></div>`;
}
function simpleControls(){controls.innerHTML=`<div class="level-controls"><button data-action="undo" type="button" aria-label="撤销一步">↶</button><button data-action="restart" type="button" aria-label="重新开始">↻</button></div>`}
const DELTAS={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]};

function drawTraffic(){
  const colors=['#ec7369','#7fbecc','#d6a86c','#aa9cce','#91c68d','#e1a4b4','#7faada','#d7bc83','#83c2b6','#d3a3da'];
  board.innerHTML=`<div class="level-board traffic-board" aria-label="六乘六停车场"><div class="traffic-exit" aria-hidden="true">➜</div>${state.cars.map((car,i)=>{
    const x=car.o==='h'?car.p:car.lane,y=car.o==='v'?car.p:car.lane,w=car.o==='h'?car.l:1,h=car.o==='v'?car.l:1;
    return `<button class="vehicle ${i===0?'red':''} ${car.o==='v'?'vertical':''} ${selectedCar===i?'selected':''}" type="button" data-action="select-car" data-index="${i}" aria-label="${i===0?'红色目标车':`第${i+1}辆车`}" style="--x:${x};--y:${y};--w:${w};--h:${h};--paint:${colors[i%colors.length]}"></button>`
  }).join('')}</div>`;
  directionControls();setMetric('car',moves);note(`已移动${moves}步`);
}
function moveTraffic(direction,index=selectedCar){
  const car=state.cars[index],delta=DELTAS[direction];if(!car||!delta)return;
  const shift=car.o==='h'?delta[0]:delta[1];if(!shift){music.tap(false);return}
  const next=car.p+shift;if(next<0||next+car.l>6){music.tap(false);return}
  const edge=shift<0?next:next+car.l-1;
  const x=car.o==='h'?edge:car.lane,y=car.o==='v'?edge:car.lane;
  const blocked=state.cars.some((other,j)=>j!==index&&Array.from({length:other.l},(_,offset)=>{
    const xx=other.o==='h'?other.p+offset:other.lane,yy=other.o==='v'?other.p+offset:other.lane;
    return xx===x&&yy===y
  }).some(Boolean));
  if(blocked){music.tap(false);note('这辆车被挡住了','levels-think');return}
  remember();car.p=next;selectedCar=index;moves++;music.tap();
  if(index===0&&car.p===4){finish();return}drawTraffic();
}

function drawBoxes(){
  const walls=new Set(state.walls),goals=new Set(state.goals),boxes=new Set(state.boxes),cells=[];
  for(let i=0;i<49;i++){
    const x=i%7,y=Math.floor(i/7),wall=x===0||x===6||y===0||y===6||walls.has(i),goal=goals.has(i),box=boxes.has(i),player=state.player===i;
    cells.push(`<div class="level-cell ${wall?'wall':''} ${goal?'goal':''} ${box?'box':''} ${player?'player':''}" aria-label="${wall?'墙':player?'小朋友':box?'箱子':goal?'目标':''}">${player?icon('child'):box?icon('box'):goal?icon('star'):''}</div>`)
  }
  board.innerHTML=`<div class="level-board level-grid" style="--n:7" aria-label="推箱子棋盘">${cells.join('')}</div>`;
  directionControls();setMetric('box',`${state.boxes.filter(x=>goals.has(x)).length}/${state.goals.length}`);note(`已走${moves}步`);
}
function moveBoxes(direction){
  const delta=DELTAS[direction];if(!delta)return;const step=delta[0]+delta[1]*7,p=state.player,next=p+step,walls=new Set(state.walls),boxes=new Set(state.boxes);
  const blocked=index=>index<0||index>=49||index%7===0||index%7===6||Math.floor(index/7)===0||Math.floor(index/7)===6||walls.has(index);
  if(blocked(next)){music.tap(false);return}
  if(boxes.has(next)){
    const beyond=next+step;if(blocked(beyond)||boxes.has(beyond)){music.tap(false);note('箱子被挡住了','levels-think');return}
    remember();boxes.delete(next);boxes.add(beyond);state.boxes=[...boxes];
  }else remember();
  state.player=next;moves++;music.tap();
  if(state.goals.every(goal=>boxes.has(goal))){finish();return}drawBoxes();
}

function drawMaze(){
  const n=state.size,stars=new Set(state.stars),exit=n*(n-2)+n-2,cells=[];
  for(let i=0;i<n*n;i++){
    const wall=state.rows[Math.floor(i/n)][i%n]==='#',player=state.player===i,star=stars.has(i),home=i===exit;
    cells.push(`<div class="level-cell ${wall?'wall':''} ${home?'exit':''} ${player?'player':''}" aria-label="${wall?'墙':player?'小鸡':star?'星星':home?'小房子':''}">${wall?'':player?icon('chick'):star?icon('star'):home?icon('home'):''}</div>`)
  }
  board.innerHTML=`<div class="level-board level-grid maze-grid" data-size="${n}" style="--n:${n}" aria-label="寻宝迷宫">${cells.join('')}</div>`;
  directionControls(false);setMetric('star',`${(window.LevelData.maze[number-1].stars.length-state.stars.length)}/${window.LevelData.maze[number-1].stars.length}`);note('收集星星后走到小房子');
}
function moveMaze(direction){
  const delta=DELTAS[direction];if(!delta)return;const n=state.size,x=state.player%n+delta[0],y=Math.floor(state.player/n)+delta[1];
  if(x<0||x>=n||y<0||y>=n||state.rows[y][x]==='#'){music.tap(false);return}
  remember();state.player=y*n+x;moves++;
  if(state.stars.includes(state.player)){state.stars=state.stars.filter(value=>value!==state.player);music.tone(870,.2,.07)}
  music.tap();
  if(state.player===n*(n-2)+n-2&&!state.stars.length){finish();return}drawMaze();
}

const BITS=[[1,'up'],[2,'right'],[4,'down'],[8,'left']];
const rotate=mask=>((mask<<1)&15)|(mask>>3);
function pipeConnected(){
  const n=state.size,target=n*n-1,seen=new Set([0]),queue=[0];
  while(queue.length){const i=queue.shift(),x=i%n,y=Math.floor(i/n);if(i===target)return true;
    for(const [bit,dx,dy,opposite] of [[1,0,-1,4],[2,1,0,8],[4,0,1,1],[8,-1,0,2]]){
      const xx=x+dx,yy=y+dy;if(xx<0||xx>=n||yy<0||yy>=n||!(state.masks[i]&bit))continue;
      const next=yy*n+xx;if(state.masks[next]&opposite&&!seen.has(next)){seen.add(next);queue.push(next)}
    }
  }return false
}
function drawPipes(){
  const n=state.size,end=n*n-1;
  board.innerHTML=`<div class="level-board level-grid pipe-grid" style="--n:${n}" aria-label="旋转水管棋盘">${state.masks.map((mask,i)=>`<button class="level-cell pipe-tile ${i===0?'source':i===end?'target':''}" data-action="pipe" data-index="${i}" type="button" ${i===0||i===end?'disabled':''} aria-label="${i===0?'水龙头':i===end?'小花':`第${i+1}段水管`}">${BITS.filter(([bit])=>mask&bit).map(([,name])=>`<span class="pipe-arm ${name}"></span>`).join('')}<span class="pipe-center"></span>${i===0?icon('water'):i===end?icon('tulip'):''}</button>`).join('')}</div>`;
  simpleControls();setMetric('water',moves);note('点击水管，把水送到小花');
}
function movePipes(index){
  const i=Number(index),end=state.size*state.size-1;if(i<=0||i>=end)return;
  remember();state.masks[i]=rotate(state.masks[i]);moves++;music.tap();
  if(pipeConnected()){finish();return}drawPipes();
}

function drawSlide(){
  const image=`assets/fluent/${state.art}.svg?v=2`;
  board.innerHTML=`<div class="slide-wrap"><img class="slide-preview" src="${image}" alt="目标图片"><div class="level-board slide-grid" aria-label="九宫格图片拼图">${state.tiles.map((tile,i)=>tile===8?`<button class="slide-piece empty" type="button" disabled aria-label="空格"></button>`:`<button class="slide-piece" data-action="slide" data-index="${i}" type="button" aria-label="移动图片块" style="background-image:url('${image}');background-size:300% 300%;background-position:${tile%3*50}% ${Math.floor(tile/3)*50}%"></button>`).join('')}</div></div>`;
  simpleControls();setMetric('puzzle',moves);note('点空格旁边的图片块');
}
function moveSlide(index){
  const i=Number(index),blank=state.tiles.indexOf(8),x=i%3,y=Math.floor(i/3),bx=blank%3,by=Math.floor(blank/3);
  if(Math.abs(x-bx)+Math.abs(y-by)!==1){music.tap(false);return}
  remember();[state.tiles[i],state.tiles[blank]]=[state.tiles[blank],state.tiles[i]];moves++;music.tap();
  if(state.tiles.every((value,place)=>value===place)){finish();return}drawSlide();
}
function draw(){
  if(current.id==='traffic')drawTraffic();
  else if(current.id==='boxes')drawBoxes();
  else if(current.id==='maze')drawMaze();
  else if(current.id==='pipes')drawPipes();
  else drawSlide();
}
function action(type,value){
  if(type==='start'){startLevel();return}
  if(type==='restart'){startLevel(true);return}
  if(type==='next'){if(number<50)selectLevel(number+1);return}
  if(type==='catalog'){$('#level-game-list').scrollIntoView({behavior:'auto'});return}
  if(type==='undo'){undo();return}
  if(phase!=='playing')return;
  if(type==='select-car'){selectedCar=Number(value);music.tap();drawTraffic();return}
  if(type==='pipe'){movePipes(value);return}
  if(type==='slide'){moveSlide(value);return}
  if(DELTAS[type]){
    if(current.id==='traffic')moveTraffic(type);
    else if(current.id==='boxes')moveBoxes(type);
    else if(current.id==='maze')moveMaze(type);
  }
}
board.addEventListener('click',event=>{
  const target=event.target.closest('[data-action]');if(!target||swiped){swiped=false;return}
  action(target.dataset.action,target.dataset.index);
});
controls.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(target)action(target.dataset.action)});
board.addEventListener('contextmenu',event=>{if(event.target.closest('button'))event.preventDefault()});
controls.addEventListener('contextmenu',event=>event.preventDefault());
$('#level-game-list').addEventListener('click',event=>{const target=event.target.closest('[data-game]');if(target)selectGame(target.dataset.game)});
$('#previous-level').addEventListener('click',()=>selectLevel(number-1));
$('#next-level').addEventListener('click',()=>selectLevel(number+1));
$('#level-picker').addEventListener('click',event=>{const target=event.target.closest('[data-pick]');if(target)selectLevel(Number(target.dataset.pick))});
$('#reset-current').addEventListener('click',()=>{localStorage.removeItem(`levels-done-${current.id}`);localStorage.removeItem(`levels-open-${current.id}`);number=1;cards();showIntro()});
$('#speak-button').addEventListener('click',()=>say(`level-${current.id}-intro`));
$('#restart-level-button').addEventListener('click',()=>startLevel(true));
$('#music-button').addEventListener('click',()=>{music.muted=!music.muted;localStorage.setItem('kid-challenge-muted',music.muted?'yes':'no');if(music.muted)music.ctx?.suspend();else{music.next=0;music.start()}updateMusic();say(music.muted?'music-off':'music-on')});
function updateMusic(){const button=$('#music-button');button.innerHTML=icon(music.muted?'mute':'music');button.setAttribute('aria-label',music.muted?'打开音乐':'关闭音乐');button.setAttribute('aria-pressed',String(!music.muted))}
window.addEventListener('keydown',event=>{const actionName={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'}[event.key];if(actionName&&phase==='playing'){event.preventDefault();action(actionName)}});
let pointerStart=null;
board.addEventListener('pointerdown',event=>{if(phase!=='playing'||!['traffic','boxes','maze'].includes(current.id))return;pointerStart={x:event.clientX,y:event.clientY,index:event.target.closest('.vehicle')?.dataset.index};});
board.addEventListener('pointerup',event=>{if(!pointerStart)return;const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y,from=pointerStart;pointerStart=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<27)return;
  const direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
  swiped=true;setTimeout(()=>{swiped=false},250);
  if(current.id==='traffic'){
    const i=from.index===undefined?selectedCar:Number(from.index);selectedCar=i;
    const cellSize=(board.querySelector('.traffic-board')?.getBoundingClientRect().width||360)/6;
    const distance=Math.max(1,Math.min(4,Math.round(Math.max(Math.abs(dx),Math.abs(dy))/cellSize)));
    for(let n=0;n<distance&&phase==='playing';n++)moveTraffic(direction,i);
  }else action(direction);
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)music.next=0});
if(!window.LevelData||GAMES.some(game=>window.LevelData[game.id]?.length!==50)){board.textContent='关卡加载失败，请刷新页面';return}
updateMusic();const initial=location.hash.slice(1);selectGame(GAMES.some(game=>game.id===initial)?initial:GAMES[0].id,false);
if(initial)requestAnimationFrame(()=>$('#play').scrollIntoView({behavior:'auto',block:'start'}));
})();
