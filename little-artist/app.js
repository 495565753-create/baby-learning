const $ = id => document.getElementById(id);
const colors = ['#303e50','#f16d6d','#fa9b43','#f7c747','#5cbd70','#22b8a7','#4e98dd','#7666d8','#e581bd','#a76b49','#ffffff','#8998a6','#f5b2ae','#aedcae','#a9d9ef'];
const titles = {trace:'学画画',color:'涂颜色',free:'自由画',write:'写写字'};
const hints = {trace:'沿着浅色虚线，慢慢描出图案',color:'点一下封闭区域填色，也可以拿笔涂',free:'这张画纸属于你的想象力',write:'沿着浅色字形，试着写一写'};
const writeGroups = {数字:[...'0123456789'],字母:[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],汉字:[...'人大小山水日月木火口田中上下天手']};
const fallbackStore = {
  saveArtwork(title,data){const id=String(Date.now())+'-'+Math.random().toString(36).slice(2);const items=JSON.parse(localStorage.getItem('littleartist-items')||'[]');items.unshift({id,title,time:Date.now(),data});localStorage.setItem('littleartist-items',JSON.stringify(items));return id},
  listArtworks(){return JSON.stringify(JSON.parse(localStorage.getItem('littleartist-items')||'[]').map(({id,title,time})=>({id,title,time})))},
  getArtwork(id){return (JSON.parse(localStorage.getItem('littleartist-items')||'[]').find(x=>x.id===id)||{}).data||''},
  getThumbnail(id){return this.getArtwork(id)},
  deleteArtwork(id){const items=JSON.parse(localStorage.getItem('littleartist-items')||'[]').filter(x=>x.id!==id);localStorage.setItem('littleartist-items',JSON.stringify(items));return true}
};
const store = window.ArtStore || fallbackStore;
const fillCanvas = $('fill-canvas'), baseCanvas = $('base-canvas'), artCanvas = $('art-canvas');
const fillCtx = fillCanvas.getContext('2d',{willReadFrequently:true}), baseCtx = baseCanvas.getContext('2d'), artCtx = artCanvas.getContext('2d',{willReadFrequently:true});
let screen='home', mode='free', currentTemplate=0, currentCategory='全部', writeGroup='数字', writeChar='0';
let tool='brush', activeStrokeTool='brush', color=colors[0], size=8, dirty=false, drawing=false, lastPoint=null, pixelRatio=1, undoStack=[], baseToken=0;
let selectedArtwork=null, confirmCallback=null, toastTimer=null;
let palmGuard=true, magnetEnabled=true, activePointerId=null, strokePoints=[], strokeStartPixels=null, guidePixels=null;

// WebView's native long press is also blocked in MainActivity. These handlers
// stop DOM selection and keep incidental fingers away from the drawing UI.
for(const name of ['contextmenu','selectstart','dragstart'])document.addEventListener(name,event=>event.preventDefault(),true);
const studio=$('studio');
function isPalmToggle(target){return target instanceof Element&&Boolean(target.closest('#palm-toggle'))}
for(const name of ['pointerdown','pointermove','pointerup','pointercancel'])studio.addEventListener(name,event=>{
  if(screen==='studio'&&palmGuard&&event.pointerType==='touch'&&!isPalmToggle(event.target)){
    event.preventDefault();event.stopImmediatePropagation();
  }
},true);
for(const name of ['touchstart','touchmove','touchend','touchcancel'])studio.addEventListener(name,event=>{
  if(screen==='studio'&&palmGuard&&!isPalmToggle(event.target)){
    event.preventDefault();event.stopImmediatePropagation();
  }
},{capture:true,passive:false});

function updateCanvasTip(){
  let message=tool==='fill'?'轻点线稿里的空白区域，就能填上颜色':tool==='eraser'?'擦掉自己画的线条':mode==='trace'&&magnetEnabled?'靠近虚线，笔迹会自动吸附':mode==='free'&&magnetEnabled?'画圆、椭圆或五角星，松笔自动修整':'用手写笔或手指在画纸上画画';
  if(palmGuard)message+=' · 防误触已开，仅接受手写笔';
  $('canvas-tip').textContent=message;
}
function setPalmGuard(enabled){
  palmGuard=enabled;
  const button=$('palm-toggle');button.classList.toggle('off',!enabled);button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'关闭防误触，改用手指绘画':'开启防误触，只用手写笔绘画');button.querySelector('span').textContent='防误触 '+(enabled?'开':'关');
  updateCanvasTip();
}
function setMagnet(enabled){
  magnetEnabled=enabled;
  const button=$('magnet-toggle');button.classList.toggle('off',!enabled);button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'关闭磁铁辅助':'开启磁铁辅助');button.querySelector('span').textContent='磁铁 '+(enabled?'开':'关');
  updateCanvasTip();
}
$('palm-toggle').onclick=()=>setPalmGuard(!palmGuard);
$('magnet-toggle').onclick=()=>setMagnet(!magnetEnabled);

function showScreen(name){
  document.getElementById('return-garden').hidden=name==='studio';
  screen=name;
  for(const node of document.querySelectorAll('.screen')) node.classList.remove('active');
  $(name==='gallery'?'gallery-screen':name).classList.add('active');
}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
function ask(title,description,callback){$('confirm-title').textContent=title;$('confirm-text').textContent=description;confirmCallback=callback;$('confirm').classList.remove('hidden')}
function dismissConfirm(){confirmCallback=null;$('confirm').classList.add('hidden')}
$('confirm-no').onclick=dismissConfirm;
$('confirm-yes').onclick=()=>{const callback=confirmCallback;dismissConfirm();if(callback)callback()};

function setTool(next){
  tool=next;
  for(const name of ['brush','eraser','fill']) $(name+'-tool').classList.toggle('selected',name===next);
  $('size-range').disabled=next==='fill';
  updateCanvasTip();
}
function renderPalette(){
  const palette=$('palette');palette.replaceChildren();
  colors.forEach(value=>{const button=document.createElement('button');button.className='swatch'+(value===color?' selected':'');button.style.background=value;button.setAttribute('aria-label','选择颜色 '+value);button.onclick=()=>{color=value;renderPalette();if(tool==='eraser')setTool('brush')};palette.append(button)})
}
function launch(next){
  if(next==='gallery'){openGallery();return}
  mode=next;currentTemplate=0;currentCategory='全部';writeGroup='数字';writeChar='0';undoStack=[];dirty=false;
  $('studio-title').textContent=titles[mode];$('studio-hint').textContent=hints[mode];
  $('fill-tool').classList.toggle('hidden',mode!=='color');
  $('magnet-toggle').classList.toggle('hidden',mode!=='trace'&&mode!=='free');
  setPalmGuard(false);setMagnet(true);
  setTool(mode==='color'?'fill':'brush');
  showScreen('studio');renderPicker();
  requestAnimationFrame(()=>resizeCanvas(false));
}
document.querySelectorAll('.mode-card').forEach(button=>button.onclick=()=>launch(button.dataset.mode));
$('back-home').onclick=()=>leaveStudio();$('gallery-back').onclick=()=>showScreen('home');
function leaveStudio(){if(dirty)ask('离开这张画纸？','还没保存的画会消失哦',()=>showScreen('home'));else showScreen('home')}
window.appBack=()=>{
  if(!$('confirm').classList.contains('hidden')){dismissConfirm();return}
  if(!$('viewer').classList.contains('hidden')){closeViewer();return}
  if(screen==='studio')leaveStudio();else if(screen==='gallery')showScreen('home');else if(window.ArtStore&&window.ArtStore.finishApp)window.ArtStore.finishApp();
};

function renderPicker(){
  const picker=$('picker');picker.replaceChildren();
  if(mode==='free')return;
  if(mode==='write'){
    const group=document.createElement('div');group.className='picker-group';
    Object.keys(writeGroups).forEach(name=>{const button=document.createElement('button');button.textContent=name;button.classList.toggle('selected',name===writeGroup);button.onclick=()=>switchSubject(()=>{writeGroup=name;writeChar=writeGroups[name][0]});group.append(button)});
    picker.append(group);
    writeGroups[writeGroup].forEach(char=>{const button=document.createElement('button');button.className='picker-card'+(char===writeChar?' selected':'');button.innerHTML='<span></span><small>描一描</small>';button.querySelector('span').textContent=char;button.onclick=()=>switchSubject(()=>writeChar=char);picker.append(button)});
    return;
  }
  const available=mode==='trace'?templates.slice(0,26):templates;
  const group=document.createElement('div');group.className='picker-group';
  const categories=mode==='trace'?['全部','动物','自然','交通']:['全部','动物','自然','交通','物品'];
  categories.forEach(name=>{const button=document.createElement('button');button.textContent=name;button.classList.toggle('selected',name===currentCategory);button.onclick=()=>{currentCategory=name;renderPicker()};group.append(button)});picker.append(group);
  available.forEach((item,index)=>{if(currentCategory!=='全部'&&item.category!==currentCategory)return;const button=document.createElement('button');button.className='picker-card'+(index===currentTemplate?' selected':'');button.innerHTML='<span></span><small></small>';button.querySelector('span').textContent=item.icon;button.querySelector('small').textContent=item.name;button.onclick=()=>switchSubject(()=>currentTemplate=index);picker.append(button)});
}
function switchSubject(change){
  const proceed=()=>{change();dirty=false;undoStack=[];renderPicker();resizeCanvas(false)};
  if(dirty)ask('换一张画纸？','先保存这张作品，再换新图案吧',proceed);else proceed();
}

function copyLayer(canvas){return canvas.width?canvas.toDataURL('image/png'):null}
function restoreLayer(ctx,data){if(!data)return;const image=new Image();image.onload=()=>ctx.drawImage(image,0,0,ctx.canvas.width,ctx.canvas.height);image.src=data}
function resizeCanvas(preserve=true){
  if(screen!=='studio')return;
  const rect=artCanvas.getBoundingClientRect();if(rect.width<10||rect.height<10)return;
  const newRatio=Math.min(window.devicePixelRatio||1,2);
  const width=Math.round(rect.width*newRatio),height=Math.round(rect.height*newRatio);
  if(width===artCanvas.width&&height===artCanvas.height){
    if(!preserve){fillCtx.clearRect(0,0,width,height);artCtx.clearRect(0,0,width,height);drawBase()}
    return;
  }
  // Keep a live copy so resizing cannot race with image decoding after a turn.
  const copyCanvas=source=>{const copy=document.createElement('canvas');copy.width=source.width;copy.height=source.height;copy.getContext('2d').drawImage(source,0,0);return copy};
  const oldFill=preserve?copyCanvas(fillCanvas):null,oldArt=preserve?copyCanvas(artCanvas):null;
  pixelRatio=newRatio;
  for(const canvas of [fillCanvas,baseCanvas,artCanvas]){canvas.width=width;canvas.height=height}
  drawBase();
  if(oldFill)fillCtx.drawImage(oldFill,0,0,width,height);
  if(oldArt)artCtx.drawImage(oldArt,0,0,width,height);
}
function drawBase(){
  const token=++baseToken,w=baseCanvas.width,h=baseCanvas.height;
  baseCtx.clearRect(0,0,w,h);guidePixels=null;
  if(mode==='free')return;
  if(mode==='write'){
    baseCtx.save();baseCtx.strokeStyle='#d8e4e6';baseCtx.lineWidth=1*pixelRatio;baseCtx.setLineDash([7*pixelRatio,7*pixelRatio]);
    const margin=42*pixelRatio;const top=50*pixelRatio,bottom=h-50*pixelRatio;
    baseCtx.strokeRect(margin,top,w-2*margin,bottom-top);
    baseCtx.beginPath();baseCtx.moveTo(margin,(top+bottom)/2);baseCtx.lineTo(w-margin,(top+bottom)/2);baseCtx.moveTo(w/2,top);baseCtx.lineTo(w/2,bottom);baseCtx.stroke();
    baseCtx.textAlign='center';baseCtx.textBaseline='middle';
    const fontSize=Math.min(w*.48,h*.7);
    baseCtx.font=`900 ${fontSize}px "Noto Sans CJK SC","PingFang SC",sans-serif`;
    baseCtx.fillStyle='#e5eded';baseCtx.fillText(writeChar,w/2,h*.52);
    baseCtx.strokeStyle='#b9cbd0';baseCtx.lineWidth=2.5*pixelRatio;baseCtx.setLineDash([7*pixelRatio,8*pixelRatio]);baseCtx.strokeText(writeChar,w/2,h*.52);
    baseCtx.restore();return;
  }
  const selected=templates[currentTemplate];
  const image=new Image();image.onload=()=>{if(token!==baseToken)return;baseCtx.clearRect(0,0,w,h);baseCtx.drawImage(image,0,0,w,h)};
  image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(templateSvg(selected,mode==='trace'));
  if(mode==='trace'){
    const guide=new Image();guide.onload=()=>{
      if(token!==baseToken)return;
      const hidden=document.createElement('canvas');hidden.width=w;hidden.height=h;
      const context=hidden.getContext('2d',{willReadFrequently:true});context.drawImage(guide,0,0,w,h);
      guidePixels={data:context.getImageData(0,0,w,h).data,width:w,height:h};
    };
    guide.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(templateSvg(selected,false));
  }
}
window.addEventListener('resize',()=>resizeCanvas(true));

function snapshot(){undoStack.push({fill:copyLayer(fillCanvas),art:copyLayer(artCanvas),dirty});if(undoStack.length>15)undoStack.shift()}
function restoreSnapshot(previous){
  fillCtx.clearRect(0,0,fillCanvas.width,fillCanvas.height);artCtx.clearRect(0,0,artCanvas.width,artCanvas.height);
  restoreLayer(fillCtx,previous.fill);restoreLayer(artCtx,previous.art);dirty=previous.dirty;
}
function undo(){
  const previous=undoStack.pop();if(!previous){toast('还没有可以撤销的画笔');return}
  restoreSnapshot(previous);
}
function clearArtwork(){snapshot();fillCtx.clearRect(0,0,fillCanvas.width,fillCanvas.height);artCtx.clearRect(0,0,artCanvas.width,artCanvas.height);dirty=true;toast('画纸清空啦')}
$('undo-button').onclick=undo;
$('clear-button').onclick=()=>ask('清空画纸？','所有自己画的线条和颜色都会清掉',clearArtwork);
$('brush-tool').onclick=()=>setTool('brush');$('eraser-tool').onclick=()=>setTool('eraser');$('fill-tool').onclick=()=>setTool('fill');
$('size-range').oninput=e=>{size=Number(e.target.value);$('size-value').textContent=size};

function point(event){const rect=artCanvas.getBoundingClientRect();return {x:(event.clientX-rect.left)*artCanvas.width/rect.width,y:(event.clientY-rect.top)*artCanvas.height/rect.height}}
function snapToGuide(raw){
  if(!magnetEnabled||mode!=='trace'||activeStrokeTool!=='brush'||!guidePixels)return raw;
  const {data,width,height}=guidePixels,r=Math.round(21*pixelRatio);
  const centerX=Math.round(raw.x),centerY=Math.round(raw.y);
  let best=r*r+1,bestX=centerX,bestY=centerY;
  for(let dy=-r;dy<=r;dy+=2){
    const y=centerY+dy;if(y<0||y>=height)continue;
    for(let dx=-r;dx<=r;dx+=2){
      const d=dx*dx+dy*dy;if(d>=best)continue;
      const x=centerX+dx;if(x<0||x>=width)continue;
      if(data[(y*width+x)*4+3]>130){best=d;bestX=x;bestY=y}
    }
  }
  return best<=r*r?{x:bestX,y:bestY}:raw;
}
function drawSegment(raw,pressure){
  if(!lastPoint)return;
  strokePoints.push(raw);
  const to=snapToGuide(raw);
  artCtx.save();artCtx.globalCompositeOperation=activeStrokeTool==='eraser'?'destination-out':'source-over';
  artCtx.strokeStyle=activeStrokeTool==='eraser'?'#000':color;
  artCtx.lineWidth=(activeStrokeTool==='eraser'?size*2.5:size)*pixelRatio*(pressure>0?Math.max(.65,Math.min(1.35,pressure*1.5)):1);
  artCtx.lineCap='round';artCtx.lineJoin='round';artCtx.beginPath();artCtx.moveTo(lastPoint.x,lastPoint.y);artCtx.lineTo(to.x,to.y);artCtx.stroke();artCtx.restore();lastPoint=to;
}
artCanvas.addEventListener('pointerdown',event=>{
  if(palmGuard&&event.pointerType==='touch')return;
  if(event.pointerType==='mouse'&&event.button!==0)return;
  if(drawing)return;
  event.preventDefault();
  const p=point(event);
  if(tool==='fill'){
    if(floodFill(Math.round(p.x),Math.round(p.y),snapshot))dirty=true;
    return;
  }
  snapshot();
  dirty=true;
  activeStrokeTool=event.pointerType==='pen'&&event.button===5?'eraser':tool;
  drawing=true;activePointerId=event.pointerId;strokePoints=[p];
  strokeStartPixels=mode==='free'&&magnetEnabled&&activeStrokeTool==='brush'?artCtx.getImageData(0,0,artCanvas.width,artCanvas.height):null;
  lastPoint=snapToGuide(p);
  try{artCanvas.setPointerCapture(event.pointerId)}catch(e){}
  artCtx.save();artCtx.globalCompositeOperation=activeStrokeTool==='eraser'?'destination-out':'source-over';artCtx.fillStyle=activeStrokeTool==='eraser'?'#000':color;
  artCtx.beginPath();artCtx.arc(lastPoint.x,lastPoint.y,(activeStrokeTool==='eraser'?size*2.5:size)*pixelRatio/2,0,Math.PI*2);artCtx.fill();artCtx.restore();
});
artCanvas.addEventListener('pointermove',event=>{if(!drawing||event.pointerId!==activePointerId)return;event.preventDefault();const events=event.getCoalescedEvents?event.getCoalescedEvents():[event];for(const item of events)drawSegment(point(item),item.pressure)});
function finishStroke(event){
  if(!drawing||event.pointerId!==activePointerId)return;
  event.preventDefault();
  if(event.type==='pointercancel'){
    const previous=undoStack.pop();if(previous)restoreSnapshot(previous);
  }else{
    drawSegment(point(event),event.pressure);
    if(mode==='free'&&magnetEnabled&&activeStrokeTool==='brush'&&strokeStartPixels){
      const shape=Magnet.recognize(strokePoints,pixelRatio);
      if(shape){artCtx.putImageData(strokeStartPixels,0,0);Magnet.draw(artCtx,shape,color,size*pixelRatio);toast('磁铁帮你修整成'+shape.label+'啦')}
    }
  }
  drawing=false;lastPoint=null;activePointerId=null;strokePoints=[];strokeStartPixels=null;
  try{artCanvas.releasePointerCapture(event.pointerId)}catch(e){}
}
artCanvas.addEventListener('pointerup',finishStroke);artCanvas.addEventListener('pointercancel',finishStroke);

function floodFill(x,y,beforeFill){
  const w=artCanvas.width,h=artCanvas.height;if(x<0||y<0||x>=w||y>=h)return false;
  const composite=document.createElement('canvas');composite.width=w;composite.height=h;
  const cc=composite.getContext('2d',{willReadFrequently:true});cc.fillStyle='#fff';cc.fillRect(0,0,w,h);cc.drawImage(fillCanvas,0,0);cc.drawImage(baseCanvas,0,0);cc.drawImage(artCanvas,0,0);
  const source=cc.getImageData(0,0,w,h).data;const targetIndex=(y*w+x)*4;
  const sr=source[targetIndex],sg=source[targetIndex+1],sb=source[targetIndex+2];
  if(sr<85&&sg<85&&sb<85){toast('点在线条围起来的空白处哦');return false}
  const rgb=[parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16)];
  if(Math.abs(sr-rgb[0])+Math.abs(sg-rgb[1])+Math.abs(sb-rgb[2])<12)return false;
  if(beforeFill)beforeFill();
  const image=fillCtx.getImageData(0,0,w,h),data=image.data;
  const seen=new Uint8Array(w*h),queue=new Uint32Array(w*h);let head=0,tail=0;const start=y*w+x;queue[tail++]=start;seen[start]=1;
  while(head<tail){
    const index=queue[head++],at=index*4;
    if(Math.abs(source[at]-sr)>33||Math.abs(source[at+1]-sg)>33||Math.abs(source[at+2]-sb)>33)continue;
    data[at]=rgb[0];data[at+1]=rgb[1];data[at+2]=rgb[2];data[at+3]=255;
    const px=index%w;
    if(px>0&&!seen[index-1]){seen[index-1]=1;queue[tail++]=index-1}
    if(px<w-1&&!seen[index+1]){seen[index+1]=1;queue[tail++]=index+1}
    if(index>=w&&!seen[index-w]){seen[index-w]=1;queue[tail++]=index-w}
    if(index<w*(h-1)&&!seen[index+w]){seen[index+w]=1;queue[tail++]=index+w}
  }
  fillCtx.putImageData(image,0,0);
  return true;
}

function composePng(){
  const canvas=document.createElement('canvas');canvas.width=artCanvas.width;canvas.height=artCanvas.height;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(fillCanvas,0,0);ctx.drawImage(baseCanvas,0,0);ctx.drawImage(artCanvas,0,0);
  return canvas.toDataURL('image/png');
}
function saveArtwork(){
  const subject=mode==='free'?'自由创作':mode==='write'?writeChar:templates[currentTemplate].name;
  let id;try{id=store.saveArtwork(`${subject} · ${titles[mode]}`,composePng())}catch{toast("设备空间不足，画作还在画纸上，请先导出图片。");return}
  if(id){dirty=false;toast('保存成功！去「我的作品」看看吧')}else toast('保存失败，请再试一次');
}
$('save-top').onclick=saveArtwork;

function openGallery(){showScreen('gallery');renderGallery()}
function renderGallery(){
  const items=JSON.parse(store.listArtworks()||'[]'),list=$('gallery-list');list.replaceChildren();
  $('gallery-count').textContent=items.length+' 张作品';
  if(!items.length){const empty=document.createElement('div');empty.className='empty-gallery';empty.innerHTML='<div class="empty-icon">✎</div><h3>画册还是空的</h3><p>先画一张，再来这里欣赏吧！</p>';list.append(empty);return}
  for(const item of items){
    const card=document.createElement('button');card.className='art-card';
    const image=document.createElement('img');image.alt=item.title;image.src=store.getThumbnail(item.id);
    const meta=document.createElement('div');meta.className='art-meta';const title=document.createElement('strong');title.textContent=item.title;
    const date=document.createElement('small');date.textContent=new Date(item.time).toLocaleString('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
    meta.append(title,date);card.append(image,meta);card.onclick=()=>openViewer(item);list.append(card);
  }
}
function openViewer(item){selectedArtwork=item;$('viewer-title').textContent=item.title;$('viewer-time').textContent=new Date(item.time).toLocaleString('zh-CN');$('viewer-image').src=store.getArtwork(item.id);$('viewer').classList.remove('hidden')}
function closeViewer(){selectedArtwork=null;$('viewer').classList.add('hidden');$('viewer-image').removeAttribute('src')}
$('viewer-close').onclick=closeViewer;
$('viewer-delete').onclick=()=>{if(!selectedArtwork)return;const id=selectedArtwork.id;ask('删除这张作品？','删除后就找不回来啦',()=>{if(store.deleteArtwork(id)){closeViewer();renderGallery();toast('作品已删除')}else toast('删除失败，请再试一次')})};
renderPalette();

// Integrated web edition: keep existing drawing and unsaved-work protections.
function returnToGarden(){const target=location.pathname.startsWith('/offline/')?'/offline/play.html':'/index.html';const leave=()=>location.assign(target);if(dirty&&screen==='studio')ask('回到甜甜乐园？','这张画还没保存，先保存作品再回来吧。',leave);else leave()}
document.getElementById('return-garden').onclick=returnToGarden;
window.addEventListener('beforeunload',e=>{if(dirty&&screen==='studio'){e.preventDefault();e.returnValue=''}});

document.getElementById('export-artwork').onclick=()=>{const a=document.createElement('a');a.download='小小画家-'+Date.now()+'.png';a.href=composePng();a.click();toast('图片已导出，请查看浏览器下载。')};
