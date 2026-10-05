(() => {
'use strict';
const GAMES=[
 {id:'dino',title:'恐龙跳跳',icon:'🦖',cat:'动作闯关',desc:'跳过仙人掌，连续过关',help:'看见仙人掌靠近，就点跳跃。连续跳过六个障碍就赢了。'},
 {id:'flappy',title:'飞跃小鸟',icon:'🐦',cat:'动作闯关',desc:'轻点翅膀，穿过云门',help:'轻点屏幕让小鸟飞高一点。穿过四道云门，别碰到边缘。'},
 {id:'snake',title:'贪吃小蛇',icon:'🐍',cat:'路线挑战',desc:'规划路线吃到五颗苹果',help:'在游戏画面上向上下左右滑动，带小蛇吃五颗苹果。要避开边界，也不要撞到自己。'},
 {id:'frog',title:'青蛙过路',icon:'🐸',cat:'路线挑战',desc:'避开车车，过马路',help:'在游戏画面上滑动，带青蛙穿过车道。观察车的位置，再向前走。'},
 {id:'pac',title:'迷宫豆豆',icon:'🟡',cat:'路线挑战',desc:'绕开小怪，收集豆豆',help:'在游戏画面上滑动，收集五颗豆豆，同时避开粉色小怪。'},
 {id:'maze',title:'星星迷宫',icon:'⭐',cat:'路线挑战',desc:'穿过小路找到星星',help:'在游戏画面上滑动，带小鸡穿过迷宫，找到右下角的星星。'},
 {id:'sokoban',title:'小小推箱工',icon:'📦',cat:'动脑解谜',desc:'把箱子推到绿色位置',help:'在游戏画面上滑动来推动箱子。把两个箱子都推到绿色目标上。'},
 {id:'merge',title:'数字合并',icon:'🔢',cat:'动脑解谜',desc:'滑动数字，合出 64',help:'在游戏画面上朝一个方向滑动。相同数字碰在一起会合并，合出六十四就赢了。'},
 {id:'match3',title:'彩色三消',icon:'💎',cat:'动脑解谜',desc:'交换宝石，连成三个',help:'先点一颗宝石，再点旁边的一颗。让三个相同颜色连在一起。'},
 {id:'slider',title:'数字拼图',icon:'🧩',cat:'动脑解谜',desc:'移动空格，排好数字',help:'点击空格旁边的数字，把一到八按顺序排好。'},
 {id:'pipes',title:'水管连连看',icon:'🚰',cat:'动脑解谜',desc:'转动水管把水送到花园',help:'点击水管让它旋转，把左上角水源接到右下角花园。'},
 {id:'hanoi',title:'彩盘搬家',icon:'🗼',cat:'动脑解谜',desc:'大盘子不能压小盘子',help:'先点有盘子的柱子，再点要放的柱子。把三个盘子搬到最右边，大盘不能压在小盘上。'},
 {id:'tetris',title:'彩块叠叠乐',icon:'🟦',cat:'动作闯关',desc:'转一转方块，填满一行',help:'移动或旋转落下的方块，填满一整行就能消除。消除两行就赢了。'},
 {id:'breakout',title:'弹球打砖',icon:'🏓',cat:'动作闯关',desc:'控制挡板打掉砖块',help:'左右移动挡板接住小球。打掉上面的八块砖就赢了。'},
 {id:'pong',title:'乒乓小冠军',icon:'🏓',cat:'动作闯关',desc:'接住球，先得三分',help:'用手指或方向按钮移动挡板。比对手先拿到三分。'},
 {id:'memory',title:'翻牌大挑战',icon:'🧠',cat:'记忆策略',desc:'记住位置，配对八组',help:'每次翻两张牌，记住它们的位置，找出八组相同图案。'},
 {id:'simon',title:'颜色节奏王',icon:'🎵',cat:'记忆策略',desc:'记住越来越长的顺序',help:'看颜色闪亮的顺序，再照着点。连续完成四轮就赢了。'},
 {id:'tictactoe',title:'井字棋对决',icon:'⭕',cat:'记忆策略',desc:'和小电脑连成三颗',help:'你是圆圈。轮流落子，先把三颗排成一条线就赢了。'},
 {id:'connect4',title:'四子连线',icon:'🔴',cat:'记忆策略',desc:'选列落子，先连成四颗',help:'点一列放下棋子，横着、竖着或斜着连成四颗就赢了。'},
 {id:'mole',title:'地鼠闪闪抓',icon:'🐹',cat:'动作闯关',desc:'眼疾手快抓住八只',help:'地鼠会不断换洞。看准它出现的位置，点中八次就赢了。'}
];
const $=s=>document.querySelector(s);
const list=$('#game-list'),board=$('#game-board'),controls=$('#game-controls'),metric=$('#game-metric'),status=$('#game-status');
let current=GAMES[0],game=null,phase='intro';
const SWIPE_GAMES=new Set(['snake','frog','pac','maze','sokoban','merge']);
const voicePlayer=new Audio();voicePlayer.id='kid-voice';voicePlayer.hidden=true;voicePlayer.setAttribute('aria-hidden','true');voicePlayer.preload='auto';voicePlayer.volume=1;document.body.append(voicePlayer);
const iconMap={'🐍':'snake','🍎':'apple','🐣':'chick','⭐':'star','😋':'eater','👻':'pac','🐸':'frog','🏡':'home','🚗':'car','🧒':'child','📦':'box','✅':'star','🚰':'water','🌷':'tulip','🐹':'mole','🕳️':'hole','❤️':'heart','🦖':'dino','🐦':'flappy','🌵':'cactus','🧠':'memory','🏓':'pong','🐶':'dog','🐱':'cat','🐼':'panda','🦊':'fox','🐻':'bear','🐰':'rabbit','🦁':'lion'};
function icon(name,cls=''){return `<img class="${cls}" src="assets/fluent/${name}.svg?v=2" alt="" draggable="false">`}
window.kidIcon=(emoji)=>iconMap[emoji]?icon(iconMap[emoji],'piece-icon'):emoji;
const audio={ctx:null,timer:null,next:0,index:0,muted:localStorage.getItem('kid-challenge-muted')==='yes',notes:[60,64,67,64,62,65,69,65,60,64,67,72,69,65,62,67],
 unlock(){if(this.muted)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx ||= new C();if(this.ctx.state==='suspended')this.ctx.resume();if(!this.timer)this.timer=setInterval(()=>this.tick(),240);this.tick()}catch(_){}},
 tick(){if(this.muted||document.hidden||!this.ctx||this.ctx.state!=='running')return;if(this.next<this.ctx.currentTime)this.next=this.ctx.currentTime+.05;while(this.next<this.ctx.currentTime+.7){this.tone(440*2**((this.notes[this.index%this.notes.length]-69)/12),.36,'sine',.011,this.next);this.index++;this.next+=.39}},
 tone(f=520,d=.12,type='triangle',v=.05,when){if(this.muted||!this.ctx)return;try{const t=when??this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+d+.025)}catch(_){}},
 feedback(good=true,f){try{navigator.vibrate?.(good?15:9)}catch(_){}this.unlock();this.tone(f??(good?650:260),good?.14:.11,good?'triangle':'sine',good?.055:.025)}
};
function voiceKey(message){if(message===current.help)return `${current.id}-intro`;if(message.includes('太棒啦，你完成了挑战'))return `${current.id}-win`;if(/顺序错/.test(message))return 'look';if(/轮到你/.test(message))return 'yourturn';if(/下一轮/.test(message))return 'next';if(/碰到|掉了|对手得分/.test(message))return 'careful';if(/太棒|抓到|消除|吃到|你得分/.test(message))return 'great';if(/大盘|挡住|换个|没有连成/.test(message))return 'think';return 'try'}
function say(message){try{voicePlayer.pause();voicePlayer.currentTime=0;voicePlayer.src=`voice/${voiceKey(message)}.mp3?v=2`;voicePlayer.play().catch(()=>{})}catch(_){}}
function setStatus(message,voice=false){status.textContent=message;if(voice)say(message)}
const goalIcon={dino:'cactus',flappy:'flappy',snake:'apple',frog:'home',pac:'eater',maze:'star',sokoban:'box',merge:'merge',match3:'match3',slider:'slider',pipes:'water',hanoi:'hanoi',tetris:'tetris',breakout:'brick',pong:'pong',memory:'memory',simon:'simon',tictactoe:'tictactoe',connect4:'connect4',mole:'mole'};
function setMetric(message){metric.setAttribute('aria-label',message);const ratio=message.match(/(\d+)\s*\/\s*(\d+)/),life=message.match(/❤️\s*(\d+)/),number=message.match(/\d+/),frogSteps=message.match(/前进\s*(\d+)/),pongScore=message.match(/你\s*(\d+)\s*:\s*(\d+)/);metric.innerHTML=icon(goalIcon[current.id]||current.id)+(ratio?`<b>${ratio[1]}<i>/</i>${ratio[2]}</b>`:frogSteps?`<b>${frogSteps[1]}<i>/</i>6</b>`:pongScore?`<b>${pongScore[1]}<i>:</i>${pongScore[2]}</b>`:number&&!life?`<b>${number[0]}</b>`:'')+(life?`${icon('heart')}<b>${life[1]}</b>`:'')}
function card(game){return `<button class="game-card ${game.id===current.id?'active':''}" data-game-id="${game.id}" type="button" aria-label="${game.title}：${game.desc}" title="${game.title}">${icon(game.id,'card-art')}${localStorage.getItem('kid-challenge-'+game.id)?icon('star','earned-star'):''}<span class="sr-only">${game.title}</span></button>`}
function renderCards(){list.innerHTML=GAMES.map(card).join('')}
function showIntro(){board.classList.remove('swipe-ready');controls.classList.remove('direction-controls-muted');board.innerHTML=`<div class="intro">${icon(current.id,'intro-art')}<button class="primary big-play" data-action="start" type="button" aria-label="开始${current.title}">${icon('play')}</button></div>`;controls.replaceChildren();setMetric('准备开始');setStatus('点开始后，会听到语音提示')}
function select(id,scroll=true,hash=true){const found=GAMES.find(g=>g.id===id);if(!found)return;game?.destroy?.();voicePlayer.pause();game=null;phase='intro';current=found;$('#play-category').textContent=found.cat;$('#play-title').textContent=found.title;$('#play-description').textContent=found.desc;$('#play-icon').src=`assets/fluent/${id}.svg?v=2`;$('#parent-game-info').innerHTML=`<strong>${found.title}</strong><p>${found.help}</p>`;if(hash)history.replaceState(null,'',`#${id}`);renderCards();showIntro();if(scroll)$('#play').scrollIntoView({behavior:'auto',block:'start'})}
const api={board,controls,setStatus,setMetric,say,sound:(good=true,f)=>audio.feedback(good,f),tone:(f,d)=>audio.tone(f,d),
 finish(message='闯关成功！'){if(phase!=='playing')return;phase='done';game?.destroy?.();game=null;board.classList.remove('swipe-ready');controls.classList.remove('direction-controls-muted');audio.feedback(true,850);localStorage.setItem('kid-challenge-'+current.id,'yes');renderCards();board.innerHTML=`<div class="result">${icon('win','result-art')}<div class="result-actions"><button class="primary" data-action="start" type="button" aria-label="再玩一次">${icon('repeat')}</button><button data-action="catalog" type="button" aria-label="换一款游戏">${icon('home')}</button></div><p class="sr-only">${message}</p></div>`;controls.replaceChildren();setMetric('⭐ 获得小星星');setStatus('太棒啦，你完成了挑战！',true)},
 fail(message='再试一次，你可以的！'){if(phase!=='playing')return;phase='done';game?.destroy?.();game=null;board.classList.remove('swipe-ready');controls.classList.remove('direction-controls-muted');audio.feedback(false);board.innerHTML=`<div class="result">${icon('retry','result-art')}<div class="result-actions"><button class="primary" data-action="start" type="button" aria-label="重新挑战">${icon('repeat')}</button><button data-action="catalog" type="button" aria-label="换一款游戏">${icon('home')}</button></div><p class="sr-only">${message}</p></div>`;controls.replaceChildren();setMetric('再试一次');setStatus(message,true)}
};
const controlSymbols={up:'↑',down:'↓',left:'←',right:'→',jump:'↑',rotate:'↻',launch:'●'};
const controlNames={up:'向上',down:'向下',left:'向左',right:'向右',jump:'跳跃',rotate:'旋转',launch:'发球'};
function iconizeControls(){controls.querySelectorAll('button[data-action]').forEach(b=>{const key=b.dataset.action;if(!controlSymbols[key])return;b.setAttribute('aria-label',controlNames[key]);b.textContent=controlSymbols[key];b.classList.add('control-icon')})}
function start(){game?.destroy?.();board.replaceChildren();controls.replaceChildren();phase='playing';audio.unlock();const factory=window.KidGames?.[current.id];if(!factory){phase='intro';board.textContent='这款游戏正在准备中';return}game=factory(api);game.start();const swipeGame=SWIPE_GAMES.has(current.id);board.classList.toggle('swipe-ready',swipeGame);controls.classList.toggle('direction-controls-muted',swipeGame);iconizeControls();say(current.help)}
function handleClick(event){const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;if(action==='start'){start();return}if(action==='catalog'){list.scrollIntoView({behavior:'auto'});return}if(phase==='playing')game?.action?.(action,button.dataset.value,button)}
board.addEventListener('click',handleClick);controls.addEventListener('click',handleClick);board.addEventListener('contextmenu',e=>{if(e.target.closest('button'))e.preventDefault()});controls.addEventListener('contextmenu',e=>e.preventDefault());
list.addEventListener('click',e=>{const card=e.target.closest('[data-game-id]');if(card)select(card.dataset.gameId)});
$('#music-button').addEventListener('click',()=>{audio.muted=!audio.muted;localStorage.setItem('kid-challenge-muted',audio.muted?'yes':'no');if(audio.muted)audio.ctx?.suspend();else{audio.next=0;audio.unlock()}updateMusic();voicePlayer.src=`voice/${audio.muted?'music-off':'music-on'}.mp3?v=2`;voicePlayer.play().catch(()=>{})});
function updateMusic(){const b=$('#music-button');b.innerHTML=icon(audio.muted?'mute':'music');b.setAttribute('aria-label',audio.muted?'打开音乐':'关闭音乐');b.setAttribute('aria-pressed',String(!audio.muted))}
$('#speak-button').addEventListener('click',()=>say(current.help));
$('#restart-game-button').addEventListener('click',start);
$('#reset-progress').addEventListener('click',()=>{GAMES.forEach(g=>localStorage.removeItem('kid-challenge-'+g.id));renderCards()});
window.addEventListener('keydown',e=>{if(phase!=='playing')return;const key=e.key;const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',' ':'jump',Enter:'jump',a:'left',d:'right',w:'up',s:'down'};if(map[key]){e.preventDefault();game?.action?.(map[key])}});
let swipeStart=null;
board.addEventListener('pointerdown',event=>{
 if(phase!=='playing'||!SWIPE_GAMES.has(current.id))return;
 swipeStart={id:event.pointerId,x:event.clientX,y:event.clientY};
 board.setPointerCapture?.(event.pointerId);
});
board.addEventListener('pointerup',event=>{
 if(!swipeStart||swipeStart.id!==event.pointerId)return;
 const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;
 swipeStart=null;
 if(Math.max(Math.abs(dx),Math.abs(dy))<22)return;
 event.preventDefault();
 const direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
 board.classList.remove('swipe-ready');
 game?.action?.(direction);
});
board.addEventListener('pointercancel',()=>{swipeStart=null});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)audio.next=0});
if(location.pathname.includes('/arcade/'))$('#back-link').href=location.pathname.startsWith('/offline/')?'/offline/play.html?section=games':'../index.html?section=games';
updateMusic();const initial=location.hash.slice(1),valid=GAMES.some(g=>g.id===initial);select(valid?initial:GAMES[0].id,false,valid);if(valid)requestAnimationFrame(()=>$('#play').scrollIntoView({behavior:'auto',block:'start'}));
})();
