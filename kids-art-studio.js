/* Original canvas art studio. Templates and drawing stay on separate layers. */
(function (global) {
  'use strict';
  const SIZE = 720;
  const DRAFT_KEY = 'guolicheng-art-draft-v3';
  const GALLERY_KEY = 'guolicheng-art-gallery-v3';
  const HELP = '小画室来啦。选一支画笔，在画纸上慢慢画。还可以换底图，画形状，试试对称。画好以后，放进小画廊。';
  const TASKS = [
    { icon:'🌼', title:'会开花的花园', scene:'garden', text:'给花朵穿上不同颜色，再画一只小蝴蝶。' },
    { icon:'🚀', title:'我的星球', scene:'space', text:'画一颗新星球，再给它画一座小房子。' },
    { icon:'🐠', title:'海底好朋友', scene:'ocean', text:'给小鱼添上花纹，再画几个泡泡。' },
    { icon:'🦋', title:'对称小翅膀', scene:'blank', mirror:'mirror', text:'打开左右对称，画一只漂亮的蝴蝶。' },
    { icon:'🌸', title:'彩色万花筒', scene:'blank', mirror:'four', text:'打开四向对称，画出自己的花朵图案。' }
  ];
  const SCENES = [ ['blank','📝','白画纸'],['space','🌌','星空'],['garden','🌷','花园'],['ocean','🐟','海洋'],['robot','🤖','机器人'],['petals','🌸','花瓣图'] ];
  const TOOLS = [ ['pen','🖍️','画笔'],['water','🖌️','水彩'],['glow','✨','荧光'],['fill','🪣','填色'],['eraser','🧽','橡皮'] ];
  const COLORS = ['#e75a65','#f28d47','#f4c847','#7dbf60','#34ad95','#4d9eda','#5c70c6','#9365bd','#db75ae','#935b43','#dcbea4','#fdf5df','#ffffff','#aec4d2','#445769','#253447'];
  const SHAPES = [['circle','⭕','圆形'],['square','🔲','方形'],['star','⭐','星星'],['heart','💗','爱心']];
  let root = null, canvas = null, display = null, ink = null, paint = null, base = null, paper = null;
  let mounted = 0, active = null, saveTimer = null, dirty = false, gallery = [], pendingNew = false;
  let history = makeHistory(16);
  let options = {tool:'pen',color:COLORS[0],size:12,shape:'star',mirror:'none',scene:'blank',panel:'brush'};
  let task = null, loading = false, imageTicket = 0, exportFile = null;

  function esc(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function makeHistory(limit) {
    const undo = [], redo = [];
    return {undo,redo,push(before){undo.push(before);if(undo.length>limit)undo.shift();redo.length=0;},back(now){if(!undo.length)return null;redo.push(now);return undo.pop();},forward(now){if(!redo.length)return null;undo.push(now);return redo.pop();},clear(){undo.length=0;redo.length=0;}};
  }
  function validPNG(data) { return typeof data==='string' && data.length<4000000 && /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(data); }
  function readStore(key, fallback) {
    try { const raw=global.localStorage.getItem(key); if(!raw)return {ok:true,value:fallback};return {ok:true,value:JSON.parse(raw)}; }
    catch(e) {return {ok:false,value:fallback};}
  }
  function writeStore(key, value) {
    try { global.localStorage.setItem(key,JSON.stringify(value));return true; } catch(e){return false;}
  }
  function validScene(scene){return SCENES.some(item=>item[0]===scene)?scene:'blank';}
  function cleanGallery(value){return Array.isArray(value)?value.filter(row=>row&&validPNG(row.ink)&&validPNG(row.preview)&&typeof row.id==='string').slice(0,6).map(row=>({id:row.id,ink:row.ink,preview:row.preview,scene:validScene(row.scene),name:typeof row.name==='string'?row.name.slice(0,30):'我的画',time:Number(row.time)||0})):[];}
  function point(event, board) {
    const r=board.getBoundingClientRect();
    return {x:Math.max(0,Math.min(board.width-1,(event.clientX-r.left)*board.width/r.width)),y:Math.max(0,Math.min(board.height-1,(event.clientY-r.top)*board.height/r.height))};
  }
  function mirrors(p,mode,w=SIZE,h=SIZE){const points=[p];if(mode==='mirror'||mode==='four')points.push({x:w-1-p.x,y:p.y});if(mode==='four')points.push({x:p.x,y:h-1-p.y},{x:w-1-p.x,y:h-1-p.y});return points;}
  function colorBytes(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255];}
  /* Flood boundaries are read from the composed picture; paint is written only to the drawing layer. */
  function floodFill(source, target, width, height, x, y, rgba, tolerance=38) {
    x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=width||y>=height)return 0;
    const start=y*width+x,offset=start*4,old=Array.from(source.slice(offset,offset+4));
    if(old.every((value,i)=>Math.abs(value-rgba[i])<8))return 0;
    const queue=new Uint32Array(width*height),seen=new Uint8Array(width*height);let head=0,tail=1,count=0;queue[0]=start;seen[start]=1;
    while(head<tail){const index=queue[head++],at=index*4;
      if(Math.abs(source[at]-old[0])+Math.abs(source[at+1]-old[1])+Math.abs(source[at+2]-old[2])+Math.abs(source[at+3]-old[3])>tolerance)continue;
      target[at]=rgba[0];target[at+1]=rgba[1];target[at+2]=rgba[2];target[at+3]=rgba[3];count++;
      const xx=index%width,yy=Math.floor(index/width);
      const next=[];if(xx>0)next.push(index-1);if(xx<width-1)next.push(index+1);if(yy>0)next.push(index-width);if(yy<height-1)next.push(index+width);
      for(const n of next){if(!seen[n]){seen[n]=1;queue[tail++]=n;}}
    }
    return count;
  }
  function render(){return `<section id="artStudio" class="art-studio" aria-label="创作小画室">
    <header class="art-heading"><span>🎨</span><div><h2>创作小画室</h2><p>画一幅只属于你的画</p></div><button data-art-action="help" aria-label="听画画介绍">🔊</button></header>
    <div class="art-task" id="artTask"><span>💡</span><div><b>今天想画什么？</b><small>选一个小灵感，或自由画画</small></div><button data-art-action="inspiration">换灵感</button></div>
    <div class="art-quick" aria-label="画画工具">${TOOLS.map(([id,icon,name])=>`<button data-art-action="tool" data-value="${id}" aria-pressed="${id==='pen'}"><span>${icon}</span><small>${name}</small></button>`).join('')}</div>
    <div class="art-canvas-wrap"><canvas id="artCanvas" width="${SIZE}" height="${SIZE}" aria-label="创作画板，用手指画画；填色时点一个区域"></canvas><span id="artCanvasHint" class="art-canvas-hint">在画纸上画一画</span></div>
    <div class="art-history"><button data-art-action="undo" disabled>↶ 撤销</button><button data-art-action="redo" disabled>↷ 重做</button><button data-art-action="new">＋ 新画纸</button></div>
    <div class="art-panel-tabs" role="tablist" aria-label="画室工具分类">${[['brush','🎨','调色'],['scene','🌄','底图'],['shape','⭐','形状'],['gallery','🖼️','画廊']].map(([id,icon,name])=>`<button id="artTab-${id}" role="tab" aria-controls="artPanel" aria-selected="${id==='brush'}" data-art-action="panel" data-value="${id}"><span>${icon}</span>${name}</button>`).join('')}</div>
    <div id="artPanel" class="art-panel" role="tabpanel" aria-labelledby="artTab-brush"></div>
    <div class="art-bottom-actions"><button data-art-action="save" class="art-save">🖼️ 放进画廊</button><button data-art-action="export">↗ 导出图片</button></div>
    <p id="artSaveStatus" class="art-save-status" role="status" aria-live="polite">作品保存在这台设备上</p><div id="artDialog" class="art-dialog" hidden></div>
  </section>`;}
  function say(text){if(!global.state?.muted&&typeof global.speak==='function')global.speak(text);}
  function status(text,error=false){const el=root?.querySelector('#artSaveStatus');if(el){el.textContent=text;el.classList.toggle('error',error);}}
  function snapshot(){return {image:paint.getImageData(0,0,SIZE,SIZE),scene:options.scene};}
  function restore(s){paint.clearRect(0,0,SIZE,SIZE);paint.putImageData(s.image,0,0);options.scene=s.scene;drawScene();compose();}
  function changed(before){history.push(before);dirty=true;updateActions();scheduleSave();}
  function updateActions(){if(!root)return;root.querySelector('[data-art-action="undo"]').disabled=!history.undo.length;root.querySelector('[data-art-action="redo"]').disabled=!history.redo.length;for(const b of root.querySelectorAll('[data-art-action="tool"]'))b.setAttribute('aria-pressed',String(options.tool===b.dataset.value));const hint=root.querySelector('#artCanvasHint');hint.textContent=options.tool==='fill'?'点一块颜色，让它变一变':options.tool==='shape'?'按住拖一拖，画出形状':options.tool==='eraser'?'轻轻擦掉自己画的颜色':'按住画一画，试试长线和短线';}
  function scheduleSave(){clearTimeout(saveTimer);status('正在保存草稿…');saveTimer=setTimeout(saveDraft,450);}
  function saveDraft(){clearTimeout(saveTimer);saveTimer=null;if(!ink)return false;let data;try{data=ink.toDataURL('image/png');}catch(e){status('草稿没有保存成功，请试试导出图片',true);return false;}const ok=writeStore(DRAFT_KEY,{version:3,ink:data,scene:options.scene,options:{color:options.color,size:options.size,mirror:options.mirror},time:Date.now()});status(ok?'草稿已保存在这台设备上':'草稿没有保存成功，请导出图片保留',!ok);return ok;}
  function compose(guides=true){if(!display)return;display.clearRect(0,0,SIZE,SIZE);display.drawImage(base,0,0);display.drawImage(ink,0,0);if(guides&&options.mirror!=='none'){display.save();display.setLineDash([8,9]);display.lineWidth=2;display.strokeStyle='#697c8f77';display.beginPath();display.moveTo(SIZE/2,0);display.lineTo(SIZE/2,SIZE);if(options.mirror==='four'){display.moveTo(0,SIZE/2);display.lineTo(SIZE,SIZE/2);}display.stroke();display.restore();}}
  function ellipse(ctx,x,y,rx,ry,fill,stroke='#637d8e'){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function starPath(ctx,x,y,r){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.44:r;const xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();}
  function drawScene(){const p=paper;p.clearRect(0,0,SIZE,SIZE);p.lineWidth=4;p.fillStyle='#fffdf7';p.fillRect(0,0,SIZE,SIZE);
    if(options.scene==='space'){p.fillStyle='#1c315c';p.fillRect(0,0,SIZE,SIZE);for(let i=0;i<36;i++){const x=(i*139+53)%SIZE,y=(i*97+29)%SIZE;p.fillStyle=i%3?'#f8e7a2':'#c1dff7';starPath(p,x,y,i%3?4:9);p.fill();}ellipse(p,185,190,92,92,'#fff4d2','#a9bcdc');ellipse(p,570,530,106,106,'#e7eefb','#a9bcdc');p.strokeStyle='#c9d5ef';p.beginPath();p.ellipse(570,530,154,33,-.45,0,Math.PI*2);p.stroke();}
    if(options.scene==='garden'){p.fillStyle='#eaf7ff';p.fillRect(0,0,SIZE,510);p.fillStyle='#e1f0cf';p.fillRect(0,510,SIZE,210);ellipse(p,595,105,49,49,'#fff8cc','#dcba62');for(let i=0;i<4;i++){const x=100+i*170,y=390+(i%2)*55;p.strokeStyle='#69996b';p.beginPath();p.moveTo(x,y);p.lineTo(x,600);p.stroke();ellipse(p,x-24,535,25,12,'#fffdf7','#7ca97a');ellipse(p,x+24,565,25,12,'#fffdf7','#7ca97a');for(let j=0;j<6;j++){const a=j*Math.PI/3;ellipse(p,x+Math.cos(a)*32,y+Math.sin(a)*32,25,25,'#fffdf7','#ab899a');}ellipse(p,x,y,20,20,'#fff7c9','#bcac73');}}
    if(options.scene==='ocean'){const g=p.createLinearGradient(0,0,0,SIZE);g.addColorStop(0,'#e8faff');g.addColorStop(1,'#badfe6');p.fillStyle=g;p.fillRect(0,0,SIZE,SIZE);p.fillStyle='#f3e6c9';p.fillRect(0,635,SIZE,85);for(let i=0;i<3;i++){const x=155+i*200,y=190+(i%2)*230;p.beginPath();p.moveTo(x+55,y);p.lineTo(x+109,y-52);p.lineTo(x+109,y+52);p.closePath();p.fillStyle='#fffdf7';p.fill();p.strokeStyle='#7499a8';p.stroke();ellipse(p,x,y,69,44,'#fffdf7','#7499a8');ellipse(p,x-30,y-8,6,6,'#496271',null);}for(let i=0;i<12;i++)ellipse(p,(i*121+20)%SIZE,(i*137+32)%600,10+i%3*7,10+i%3*7,'#ffffff40','#8cbdc9');p.strokeStyle='#7daf91';p.lineWidth=12;for(let i=0;i<5;i++){p.beginPath();p.moveTo(60+i*142,670);p.bezierCurveTo(30+i*142,570,110+i*142,570,60+i*142,530);p.stroke();}}
    if(options.scene==='robot'){p.fillStyle='#f0f4fb';p.fillRect(0,0,SIZE,SIZE);p.strokeStyle='#73899f';p.lineWidth=5;p.fillStyle='#fffdf7';p.fillRect(240,150,240,180);p.strokeRect(240,150,240,180);p.fillRect(215,355,290,205);p.strokeRect(215,355,290,205);p.fillRect(160,370,45,140);p.strokeRect(160,370,45,140);p.fillRect(515,370,45,140);p.strokeRect(515,370,45,140);p.fillRect(255,575,65,75);p.strokeRect(255,575,65,75);p.fillRect(400,575,65,75);p.strokeRect(400,575,65,75);ellipse(p,305,228,26,26,'#fffdf7');ellipse(p,415,228,26,26,'#fffdf7');p.beginPath();p.moveTo(305,290);p.lineTo(415,290);p.moveTo(360,150);p.lineTo(360,107);p.stroke();ellipse(p,360,91,16,16,'#fffdf7');for(let i=0;i<3;i++)ellipse(p,288+i*72,422,20,20,'#fffdf7');starPath(p,360,505,38);p.fillStyle='#fffdf7';p.fill();p.stroke();}
    if(options.scene==='petals'){p.fillStyle='#fbf4fb';p.fillRect(0,0,SIZE,SIZE);p.lineWidth=5;for(let i=0;i<8;i++){p.save();p.translate(360,360);p.rotate(i*Math.PI/4);ellipse(p,0,-123,51,124,'#fffdf7','#a28aa9');p.restore();}ellipse(p,360,360,74,74,'#fffdf7','#a28aa9');for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8;ellipse(p,360+Math.cos(a)*270,360+Math.sin(a)*270,22,22,'#fffdf7','#b8a4bd');}}
  }
  function panel(){if(!root)return;const box=root.querySelector('#artPanel');box.setAttribute('aria-labelledby','artTab-'+options.panel);for(const b of root.querySelectorAll('[data-art-action="panel"]'))b.setAttribute('aria-selected',String(b.dataset.value===options.panel));
    if(options.panel==='brush'){box.innerHTML=`<div class="art-palette">${COLORS.map(c=>`<button data-art-action="color" data-value="${c}" style="--art-color:${c}" aria-label="颜色 ${c}" aria-pressed="${options.color===c}"></button>`).join('')}<label class="art-custom">🌈<input type="color" id="artCustomColor" value="${options.color}" aria-label="自由调颜色"></label></div><label class="art-size">笔头 <input type="range" id="artBrushSize" min="4" max="50" value="${options.size}"><b id="artSizeLabel">${options.size<15?'细':options.size<30?'中':'粗'}</b></label><div class="art-mirror"><span>对称画</span>${[['none','一支笔'],['mirror','左右'],['four','四向']].map(([id,name])=>`<button data-art-action="mirror" data-value="${id}" aria-pressed="${options.mirror===id}">${name}</button>`).join('')}</div>`;}
    if(options.panel==='scene'){box.innerHTML=`<p class="art-panel-note">换底图会保留你画的线条，也能撤销</p><div class="art-scenes">${SCENES.map(([id,icon,name])=>`<button data-art-action="scene" data-value="${id}" aria-pressed="${options.scene===id}"><span>${icon}</span><b>${name}</b></button>`).join('')}</div>`;}
    if(options.panel==='shape'){box.innerHTML=`<p class="art-panel-note">选一个形状，按住画纸拖大或拖小</p><div class="art-shapes">${SHAPES.map(([id,icon,name])=>`<button data-art-action="shape" data-value="${id}" aria-pressed="${options.tool==='shape'&&options.shape===id}"><span>${icon}</span>${name}</button>`).join('')}</div><p class="art-panel-note">颜色在「调色」里选，对称画也可以一起用</p>`;}
    if(options.panel==='gallery'){box.innerHTML=`<p class="art-panel-note">只在这台设备上保存，最多放 6 幅；导出后可长期保留</p>${gallery.length?`<div class="art-gallery">${gallery.map(row=>`<article><button data-art-action="open" data-value="${esc(row.id)}" aria-label="打开${esc(row.name)}"><img src="${row.preview}" alt="${esc(row.name)}"><b>${esc(row.name)}</b></button><button class="art-remove" data-art-action="remove" data-value="${esc(row.id)}" aria-label="删除${esc(row.name)}">移除</button></article>`).join('')}</div>`:'<div class="art-empty">🖼️<p>这里等着你的第一幅作品</p></div>'}`;}
  }
  function brush(a,b,isDot=false){const aa=mirrors(a,options.mirror),bb=mirrors(b,options.mirror);paint.save();paint.lineCap='round';paint.lineJoin='round';paint.lineWidth=options.size;paint.strokeStyle=options.color;paint.fillStyle=options.color;
    if(options.tool==='eraser'){paint.globalCompositeOperation='destination-out';paint.lineWidth=options.size*1.4;}
    if(options.tool==='water'){paint.globalAlpha=.24;paint.lineWidth=options.size*1.7;}
    if(options.tool==='glow'){paint.shadowColor=options.color;paint.shadowBlur=options.size*1.2;paint.globalAlpha=.85;paint.lineWidth=Math.max(4,options.size*.7);}
    for(let i=0;i<aa.length;i++){paint.beginPath();if(isDot){paint.arc(bb[i].x,bb[i].y,paint.lineWidth/2,0,Math.PI*2);paint.fill();}else{paint.moveTo(aa[i].x,aa[i].y);paint.lineTo(bb[i].x,bb[i].y);paint.stroke();}}
    paint.restore();
  }
  function shape(from,to){const starts=mirrors(from,options.mirror),ends=mirrors(to,options.mirror);paint.save();paint.fillStyle=options.color;paint.strokeStyle=options.color;paint.lineWidth=Math.max(3,options.size*.35);for(let i=0;i<starts.length;i++){const a=starts[i],b=ends[i],cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,w=Math.max(12,Math.abs(a.x-b.x)),h=Math.max(12,Math.abs(a.y-b.y));paint.beginPath();if(options.shape==='circle')paint.ellipse(cx,cy,w/2,h/2,0,0,Math.PI*2);if(options.shape==='square')paint.rect(cx-w/2,cy-h/2,w,h);if(options.shape==='star')starPath(paint,cx,cy,Math.max(w,h)/2);if(options.shape==='heart'){paint.moveTo(cx,cy+h/2);paint.bezierCurveTo(cx-w,cy-h/8,cx-w/2,cy-h*.8,cx,cy-h/4);paint.bezierCurveTo(cx+w/2,cy-h*.8,cx+w,cy-h/8,cx,cy+h/2);paint.closePath();}paint.globalAlpha=.82;paint.fill();paint.globalAlpha=1;paint.stroke();}paint.restore();}
  function fill(p){compose(false);const source=display.getImageData(0,0,SIZE,SIZE),dest=paint.getImageData(0,0,SIZE,SIZE);let n=0;for(const target of mirrors(p,options.mirror))n+=floodFill(source.data,dest.data,SIZE,SIZE,target.x,target.y,colorBytes(options.color));if(n)paint.putImageData(dest,0,0);return n;}
  function pointerDown(e){if(loading||active||e.isPrimary===false||e.button>0||!canvas||e.currentTarget&&e.currentTarget!==canvas)return;e.preventDefault();const p=point(e,canvas),before=snapshot();active={id:e.pointerId,start:p,last:p,before,moved:false};canvas.setPointerCapture?.(e.pointerId);
    if(options.tool==='fill'){const n=fill(p);active.moved=!!n;}
    else if(options.tool!=='shape'){brush(p,p,true);active.moved=true;}
    compose();}
  function pointerMove(e){if(!active||e.pointerId!==active.id)return;e.preventDefault();const p=point(e,canvas);if(options.tool==='fill')return;if(options.tool==='shape'){paint.putImageData(active.before.image,0,0);shape(active.start,p);}else brush(active.last,p);active.moved=true;active.last=p;compose();}
  function pointerEnd(e,cancel=false){if(!active||e.pointerId!==active.id)return;const gesture=active;active=null;try{canvas.releasePointerCapture?.(e.pointerId);}catch(err){}if(cancel){restore(gesture.before);return;}if(options.tool==='shape'&&!gesture.moved){shape(gesture.start,{x:gesture.start.x+80,y:gesture.start.y+80});gesture.moved=true;}if(gesture.moved)changed(gesture.before);compose();}
  function cancelActive(){if(active)pointerEnd({pointerId:active.id},true);}
  function restorePNG(data,scene,done){const token=mounted,ticket=++imageTicket,image=new global.Image();loading=true;canvas.setAttribute('aria-busy','true');image.onload=()=>{if(token!==mounted||ticket!==imageTicket||!paint)return;loading=false;canvas.setAttribute('aria-busy','false');paint.clearRect(0,0,SIZE,SIZE);paint.drawImage(image,0,0,SIZE,SIZE);options.scene=validScene(scene);drawScene();compose();done?.(true);};image.onerror=()=>{if(token===mounted&&ticket===imageTicket){loading=false;canvas?.setAttribute('aria-busy','false');done?.(false);}};image.src=data;}
  function showTask(index){task=TASKS[index%TASKS.length];const box=root?.querySelector('#artTask');if(box)box.innerHTML=`<span>${task.icon}</span><div><b>${task.title}</b><small>${task.text}</small></div><button data-art-action="task">试一试</button><button data-art-action="inspiration" aria-label="换一个画画灵感">↻</button>`;}
  function beginTask(){if(!task)return;cancelActive();const before=snapshot();options.scene=task.scene;options.mirror=task.mirror||'none';drawScene();compose();changed(before);options.panel='brush';panel();status(task.text);}
  function dialog(body){const box=root?.querySelector('#artDialog');if(!box)return;box.hidden=!body;box.innerHTML=body?`<div class="art-dialog-card">${body}</div>`:'';}
  function askNew(){cancelActive();pendingNew=true;dialog('<b>换一张新画纸？</b><p>可以先把这幅画放进画廊。</p><button data-art-action="save-new">🖼️ 保存后换新纸</button><button data-art-action="blank-new">＋ 直接换新纸</button><button data-art-action="close-dialog">继续画这幅</button>');}
  function newPaper(){cancelActive();const before=snapshot();paint.clearRect(0,0,SIZE,SIZE);options.scene='blank';drawScene();compose();changed(before);pendingNew=false;dialog('');panel();}
  function gallerySave(){cancelActive();if(gallery.length>=6){options.panel='gallery';panel();status('画廊已经有 6 幅啦，先导出或移除一幅，再保存新作品',true);return false;}try{compose(false);const time=Date.now(),item={id:String(time)+'-'+Math.random().toString(36).slice(2,7),ink:ink.toDataURL('image/png'),preview:canvas.toDataURL('image/png'),scene:options.scene,name:'我的画 '+(gallery.length+1),time};const next=[item,...gallery];compose();if(!writeStore(GALLERY_KEY,next)){status('画廊没有保存成功，请导出图片保留',true);return false;}gallery=next;saveDraft();status('作品已放进这台设备的小画廊');options.panel='gallery';panel();say('每一幅画都不一样，你的小画廊又多了一幅作品。');return true;}catch(e){compose();status('画廊没有保存成功，请导出图片保留',true);return false;}}
  function openArtwork(id){const row=gallery.find(item=>item.id===id);if(!row)return;cancelActive();const before=snapshot();restorePNG(row.ink,row.scene,ok=>{if(ok){changed(before);status('打开作品啦，可以继续画');panel();}else status('这幅画暂时打不开，请再试一次',true);});}
  function removeArtwork(id){const row=gallery.find(item=>item.id===id);if(!row)return;dialog(`<b>移除这幅画？</b><p>移除后，可以继续画其他作品。</p><button data-art-action="confirm-remove" data-value="${esc(id)}">移除作品</button><button data-art-action="close-dialog">保留作品</button>`);}
  function confirmRemove(id){const next=gallery.filter(row=>row.id!==id);if(!writeStore(GALLERY_KEY,next)){status('没有移除成功，作品仍在画廊里',true);dialog('');return;}gallery=next;dialog('');panel();status('已从这台设备的画廊移除');}
  function exportArtwork(){cancelActive();const out=global.document.createElement('canvas');out.width=SIZE;out.height=SIZE;const ctx=out.getContext('2d');ctx.drawImage(base,0,0);ctx.drawImage(ink,0,0);exportFile=null;
    try{const data=out.toDataURL('image/png'),filename='果粒橙小画室-'+Date.now()+'.png';
      if(typeof global.File==='function'&&typeof global.atob==='function'&&global.navigator?.share&&global.navigator?.canShare){try{const raw=global.atob(data.split(',')[1]),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const file=new global.File([bytes],filename,{type:'image/png'});if(global.navigator.canShare({files:[file]}))exportFile=file;}catch(e){exportFile=null;}}
      dialog(`<b>画作准备好啦</b><img class="art-export-preview" src="${data}" alt="要保存的画作预览"><p>点保存图片。手机上也可以长按这幅画，选择保存图片。</p><a class="art-export-download" data-art-download href="${data}" download="${esc(filename)}">⬇ 保存 PNG 图片</a>${exportFile?'<button data-art-action="share-export">↗ 手机分享</button>':''}<button data-art-action="close-dialog">返回继续画</button>`);
      status('图片已准备好，在预览面板选择保存或长按图片');
    }catch(e){status('图片没有准备成功，请再试一次',true);}
    return out;
  }
  function shareExport(){if(!exportFile||!global.navigator?.share)return;const file=exportFile,run=mounted;status('正在请求手机分享，也可以在预览面板保存图片');try{const result=global.navigator.share({files:[file],title:'我的画'});Promise.resolve(result).then(()=>{if(root&&run===mounted)status('手机分享操作已完成，也可以继续画');}).catch(e=>{if(root&&run===mounted)status(e?.name==='AbortError'?'已取消分享，仍可保存或长按预览图片':'手机分享未完成，请保存或长按预览图片',e?.name!=='AbortError');});}catch(e){status('手机分享未打开，请保存或长按预览图片',true);}}
  function action(name,value){if(!canvas)return;if(loading&&name!=='help'){status('正在打开作品，请稍等一下');return;}cancelActive();switch(name){case 'tool':if(TOOLS.some(t=>t[0]===value))options.tool=value;updateActions();break;case 'panel':if(['brush','scene','shape','gallery'].includes(value))options.panel=value;panel();break;case 'color':if(/^#[0-9a-f]{6}$/i.test(value))options.color=value;if(options.tool==='eraser')options.tool='pen';updateActions();panel();break;case 'mirror':if(['none','mirror','four'].includes(value))options.mirror=value;compose();panel();break;case 'shape':if(SHAPES.some(s=>s[0]===value)){options.shape=value;options.tool='shape';}updateActions();panel();break;case 'scene':{const before=snapshot();options.scene=validScene(value);drawScene();compose();changed(before);panel();break;}case 'undo':{const snap=history.back(snapshot());if(snap){restore(snap);dirty=true;scheduleSave();updateActions();panel();}break;}case 'redo':{const snap=history.forward(snapshot());if(snap){restore(snap);dirty=true;scheduleSave();updateActions();panel();}break;}case 'help':say(HELP);break;case 'inspiration':showTask((task?TASKS.indexOf(task)+1:Math.floor(Math.random()*TASKS.length))%TASKS.length);break;case 'task':beginTask();break;case 'new':askNew();break;case 'blank-new':newPaper();break;case 'save-new':if(gallerySave())newPaper();break;case 'close-dialog':pendingNew=false;exportFile=null;dialog('');break;case 'save':gallerySave();break;case 'open':openArtwork(value);break;case 'remove':removeArtwork(value);break;case 'confirm-remove':confirmRemove(value);break;case 'export':exportArtwork();break;case 'share-export':shareExport();break;}}
  function clickHandler(e){if(e.target.closest?.('[data-art-download]')){status('请在浏览器下载或保存面板查看图片；也可以长按预览保存');return;}const button=e.target.closest?.('[data-art-action]');if(button&&root?.contains(button)&&!button.disabled)action(button.dataset.artAction,button.dataset.value);}
  function inputHandler(e){if(e.target.id==='artBrushSize'){options.size=Math.max(4,Math.min(50,Number(e.target.value)||12));const label=root.querySelector('#artSizeLabel');if(label)label.textContent=options.size<15?'细':options.size<30?'中':'粗';}if(e.target.id==='artCustomColor'&&/^#[0-9a-f]{6}$/i.test(e.target.value)){options.color=e.target.value;if(options.tool==='eraser')options.tool='pen';updateActions();for(const b of root.querySelectorAll('[data-art-action="color"]'))b.setAttribute('aria-pressed',String(b.dataset.value===options.color));}}
  function mount(host){stop();root=host?.matches?.('#artStudio')?host:host?.querySelector?.('#artStudio')||global.document.querySelector('#artStudio');if(!root)return false;canvas=root.querySelector('#artCanvas');if(!canvas)return false;display=canvas.getContext('2d');ink=global.document.createElement('canvas');base=global.document.createElement('canvas');ink.width=base.width=SIZE;ink.height=base.height=SIZE;paint=ink.getContext('2d',{willReadFrequently:true});paper=base.getContext('2d');history=makeHistory(16);dirty=false;active=null;loading=false;mounted++;
    const draft=readStore(DRAFT_KEY,null),saved=readStore(GALLERY_KEY,[]);gallery=cleanGallery(saved.value);options={tool:'pen',color:COLORS[0],size:12,shape:'star',mirror:'none',scene:'blank',panel:'brush'};const row=draft.value;if(row?.version===3&&validPNG(row.ink)){options.scene=validScene(row.scene);if(/^#[0-9a-f]{6}$/i.test(row.options?.color))options.color=row.options.color;if(Number.isFinite(row.options?.size))options.size=Math.max(4,Math.min(50,row.options.size));if(['none','mirror','four'].includes(row.options?.mirror))options.mirror=row.options.mirror;}
    drawScene();compose();panel();updateActions();root.addEventListener('click',clickHandler);root.addEventListener('input',inputHandler);canvas.onpointerdown=pointerDown;canvas.onpointermove=pointerMove;canvas.onpointerup=e=>pointerEnd(e);canvas.onpointercancel=e=>pointerEnd(e,true);canvas.onlostpointercapture=e=>pointerEnd(e,true);
    if(row?.version===3&&validPNG(row.ink))restorePNG(row.ink,row.scene,ok=>status(ok?'上次的草稿已经打开，可以接着画':'上次的草稿暂时打不开，请先别覆盖保存',!ok));else status(!draft.ok||!saved.ok?'这台设备暂时不能读取画廊；可用导出图片保留作品':'画好后会自动保存在这台设备上',!draft.ok||!saved.ok);return true;}
  function stop(){cancelActive();if(saveTimer||dirty)saveDraft();clearTimeout(saveTimer);saveTimer=null;mounted++;if(root){root.removeEventListener('click',clickHandler);root.removeEventListener('input',inputHandler);}if(canvas){canvas.onpointerdown=canvas.onpointermove=canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=null;}root=canvas=display=ink=paint=base=paper=null;active=null;loading=false;exportFile=null;imageTicket++;history.clear();dirty=false;}
  function reset(){if(canvas&&!loading)askNew();}
  global.ART_STUDIO={render,mount,stop,reset,helpText:HELP,texts:[HELP,'每一幅画都不一样，你的小画廊又多了一幅作品。'],_test:{makeHistory,floodFill,point,mirrors,cleanGallery,readStore,writeStore,validPNG,action,getState:()=>({options:{...options},active:active?{id:active.id,moved:active.moved}:null,undo:history.undo.length,redo:history.redo.length,loading,gallery:[...gallery]}),pointerDown,pointerMove,pointerEnd,exportArtwork,SIZE,DRAFT_KEY,GALLERY_KEY}};
})(window);
