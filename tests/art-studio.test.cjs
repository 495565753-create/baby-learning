const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'kids-art-studio.js'), 'utf8');

/* Small browser double exercises actual canvas lifecycle and persistent snapshots. */
function environment() {
  let seq = 0, throwsWrite = false;
  const pngs = new Map(), values = new Map(), images = [], timers = new Map(), downloads = [], spoken = [];
  function hex(c) { const value = /^#[0-9a-f]{6}$/i.test(c) ? c : '#ffffff';return [parseInt(value.slice(1,3),16),parseInt(value.slice(3,5),16),parseInt(value.slice(5,7),16),255]; }
  class Board {
    constructor(){ this.width=720;this.height=720;this.attrs={};this.data=new Uint8ClampedArray(720*720*4);this.drawSources=[];const board=this;this.ctx={
      fillStyle:'#ffffff',strokeStyle:'#000000',lineWidth:1,globalAlpha:1,globalCompositeOperation:'source-over',
      getImageData(){return {data:board.data.slice(),width:board.width,height:board.height};},
      putImageData(im){board.data.set(im.data);},clearRect(){board.data.fill(0);},
      fillRect(x,y,w,h){const c=hex(this.fillStyle);for(let yy=Math.max(0,y);yy<Math.min(board.height,y+h);yy++)for(let xx=Math.max(0,x);xx<Math.min(board.width,x+w);xx++)board.data.set(c,(yy*board.width+xx)*4);},
      arc(x,y){this.last={x:Math.round(x),y:Math.round(y)};},ellipse(x,y){this.last={x:Math.round(x),y:Math.round(y)};},
      rect(x,y){this.last={x:Math.round(x),y:Math.round(y)};},moveTo(x,y){this.last={x:Math.round(x),y:Math.round(y)};},lineTo(x,y){this.last={x:Math.round(x),y:Math.round(y)};},
      beginPath(){},closePath(){},bezierCurveTo(){},strokeRect(){},save(){},restore(){},translate(){},rotate(){},setLineDash(){},
      fill(){const {x,y}=this.last||{x:0,y:0};if(x>=0&&y>=0&&x<board.width&&y<board.height){const off=(y*board.width+x)*4;if(this.globalCompositeOperation==='destination-out')board.data.fill(0,off,off+4);else board.data.set(hex(this.fillStyle),off);}},
      stroke(){this.fillStyle=this.strokeStyle;this.fill();},
      drawImage(from){board.drawSources.push(from);const src=from.data;if(!src)return;for(let i=0;i<src.length;i+=4)if(src[i+3])board.data.set(src.slice(i,i+4),i);},
      createLinearGradient(){return {addColorStop(){}};}
    };}
    getContext(){return this.ctx;}
    toDataURL(){const value='data:image/png;base64,'+Buffer.from('canvas-'+(++seq)).toString('base64');pngs.set(value,this.data.slice());return value;}
    getBoundingClientRect(){return {left:0,top:0,width:this.width,height:this.height};}
    setPointerCapture(){} releasePointerCapture(){} setAttribute(k,v){this.attrs[k]=v;}
  }
  function node(){return {textContent:'',innerHTML:'',disabled:false,hidden:true,attrs:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},dataset:{}};}
  const board = new Board();const nodes = new Map();
  for (const id of ['artSaveStatus','artPanel','artTask','artDialog','artCanvasHint'])nodes.set('#'+id,node());
  for (const action of ['undo','redo'])nodes.set(`[data-art-action="${action}"]`,node());
  const root={matches:selector=>selector==='#artStudio',querySelector:selector=>selector==='#artCanvas'?board:nodes.get(selector)||node(),querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},contains(){return true;}};
  const sandbox={console,Uint8ClampedArray,Uint8Array,Uint32Array,Date,Math,JSON,
    localStorage:{getItem:key=>values.get(key)||null,setItem(key,value){if(throwsWrite)throw new Error('QuotaExceededError');values.set(key,value);}},
    document:{querySelector:selector=>selector==='#artStudio'?root:null,createElement(tag){if(tag==='canvas')return new Board();return {click(){downloads.push(this);},remove(){}};},body:{appendChild(){}}},
    Image:class{set src(data){this.data=pngs.get(data);images.push(this);}},
    setTimeout(fn){const id=++seq;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},navigator:{},state:{muted:false},speak(text){spoken.push(text);}
  };sandbox.window=sandbox;vm.runInNewContext(source,sandbox);
  return {api:sandbox.ART_STUDIO,sandbox,board,root,nodes,values,downloads,pngs,images,spoken,blockWrite(){throwsWrite=true;},flush(){for(const fn of timers.values())fn();timers.clear();},finishImages(){for(const im of images.splice(0))im.onload?.();},pixel(x,y){return Array.from(board.data.slice((y*720+x)*4,(y*720+x)*4+4));}};
}
function event(id,x,y){return {pointerId:id,clientX:x,clientY:y,isPrimary:true,button:0,preventDefault(){}};}
function paintDot(env,x=100,y=100){env.api._test.pointerDown(event(1,x,y));env.api._test.pointerEnd(event(1,x,y));}

test('art history caps memory, preserves redo, and clears redo when a new stroke starts',()=>{
  const {api}=environment();const h=api._test.makeHistory(2);h.push('one');h.push('two');h.push('three');assert.deepEqual(Array.from(h.undo),['two','three']);assert.equal(h.back('now'),'three');assert.equal(h.forward('previous'),'now');h.back('next');h.push('fresh');assert.equal(h.redo.length,0);h.clear();assert.equal(h.undo.length,0);
});

test('flood fill stops at a closed boundary and changes only the drawing layer',()=>{
  const {api}=environment();const width=5,height=5;const src=new Uint8ClampedArray(width*height*4),dest=new Uint8ClampedArray(src.length);for(let i=0;i<width*height;i++)src.set([255,255,255,255],i*4);for(let y=0;y<height;y++)src.set([0,0,0,255],(y*width+2)*4);const before=src.slice();const count=api._test.floodFill(src,dest,width,height,0,0,[220,0,10,255]);assert.equal(count,10);assert.deepEqual(src,before);for(let y=0;y<height;y++){assert.equal(dest[(y*width+1)*4],220);assert.equal(dest[(y*width+2)*4+3],0);assert.equal(dest[(y*width+3)*4+3],0);}assert.equal(api._test.floodFill(src,dest,width,height,-1,2,[1,2,3,255]),0);
});

test('second fingers cannot steal a stroke and pointer cancellation restores the previous image',()=>{
  const env=environment();env.api.mount(env.root);const t=env.api._test;t.pointerDown(event(1,100,100));assert.notEqual(env.pixel(100,100)[0],255);t.pointerDown(event(2,200,200));t.pointerMove(event(2,220,220));assert.equal(t.getState().active.id,1);assert.deepEqual(env.pixel(220,220),[255,253,247,255]);t.pointerEnd(event(1,100,100),true);assert.equal(t.getState().undo,0);assert.deepEqual(env.pixel(100,100),[255,253,247,255]);env.api.stop();assert.equal(env.values.size,0);
});

test('tool and panel changes preserve the canvas, committed strokes undo and redo',()=>{
  const env=environment();env.api.mount(env.root);paintDot(env);const painted=env.pixel(100,100);env.api._test.action('tool','water');env.api._test.action('panel','scene');assert.deepEqual(env.pixel(100,100),painted);env.api._test.action('undo');assert.deepEqual(env.pixel(100,100),[255,253,247,255]);env.api._test.action('redo');assert.deepEqual(env.pixel(100,100),painted);assert.equal(env.api._test.getState().undo,1);env.api.stop();
});

test('completed drawing restores from storage on a fresh mount and blocks strokes until image loads',()=>{
  const env=environment();env.api.mount(env.root);paintDot(env);const expected=env.pixel(100,100);env.flush();assert.ok(env.values.has(env.api._test.DRAFT_KEY));env.api.stop();env.api.mount(env.root);assert.equal(env.api._test.getState().loading,true);env.api._test.pointerDown(event(1,200,200));assert.equal(env.api._test.getState().active,null);env.finishImages();assert.equal(env.api._test.getState().loading,false);assert.deepEqual(env.pixel(100,100),expected);assert.deepEqual(env.pixel(200,200),[255,253,247,255]);assert.equal(env.api._test.getState().undo,0);env.api.stop();
});

test('cancelled shape previews are not saved and leaving rolls back unfinished strokes',()=>{
  const env=environment();env.api.mount(env.root);paintDot(env);env.flush();env.api._test.action('shape','star');env.api._test.pointerDown(event(1,300,300));env.api._test.pointerMove(event(1,420,420));env.api._test.pointerEnd(event(1,420,420),true);assert.equal(env.api._test.getState().undo,1);env.api._test.action('tool','pen');env.api._test.pointerDown(event(1,200,200));env.api.stop();env.api.mount(env.root);env.finishImages();assert.deepEqual(env.pixel(200,200),[255,253,247,255]);assert.notEqual(env.pixel(100,100)[0],255);env.api.stop();
});

test('storage failure is reported honestly and failed gallery saves do not create phantom works',()=>{
  const env=environment();env.api.mount(env.root);env.blockWrite();paintDot(env);env.flush();assert.match(env.nodes.get('#artSaveStatus').textContent,/没有保存成功/);env.api._test.action('save');assert.equal(env.api._test.getState().gallery.length,0);assert.match(env.nodes.get('#artSaveStatus').textContent,/没有保存成功/);env.api.stop();
});

test('gallery reopens editable layers, exports without UI guides, and restart asks before clearing',()=>{
  const env=environment();env.api.mount(env.root);paintDot(env);const expected=env.pixel(100,100);env.api._test.action('save');const saved=env.api._test.getState().gallery;assert.equal(saved.length,1);assert.ok(env.values.has(env.api._test.GALLERY_KEY));env.api.reset();assert.equal(env.nodes.get('#artDialog').hidden,false);assert.deepEqual(env.pixel(100,100),expected);env.api._test.action('blank-new');assert.deepEqual(env.pixel(100,100),[255,253,247,255]);env.api._test.action('open',saved[0].id);env.finishImages();assert.deepEqual(env.pixel(100,100),expected);const exported=env.api._test.exportArtwork();assert.equal(exported.drawSources.length,2);assert.ok(exported.drawSources.every(board=>board!==env.board),'exports base and ink, without the on-screen guide canvas');assert.equal(env.downloads.length,0,'export first prepares a visible preview, without automatic native sharing');assert.match(env.nodes.get('#artDialog').innerHTML,/art-export-preview/);assert.match(env.nodes.get('#artDialog').innerHTML,/data-art-download/);assert.match(env.nodes.get('#artDialog').innerHTML,/download="[^"]+\.png"/);assert.match(env.nodes.get('#artDialog').innerHTML,/长按/);assert.equal(env.nodes.get('#artDialog').hidden,false);env.api.stop();
});

test('gallery rejects malformed or external images and symmetry respects drawing boundaries',()=>{
  const {api}=environment();const png='data:image/png;base64,YQ==';assert.equal(api._test.validPNG('https://remote/image.png'),false);assert.equal(api._test.cleanGallery([{id:'a',ink:png,preview:png,scene:'unknown',name:'My art'},{id:'b',ink:'bad',preview:png}]).length,1);assert.equal(api._test.cleanGallery([{id:'a',ink:png,preview:png,scene:'unknown'}])[0].scene,'blank');const mirrored=Array.from(api._test.mirrors({x:0,y:0},'four',10,10),p=>[p.x,p.y]);assert.deepEqual(mirrored,[[0,0],[9,0],[0,9],[9,9]]);const board={width:100,height:100,getBoundingClientRect:()=>({left:10,top:10,width:100,height:100})};const p=api._test.point({clientX:-20,clientY:200},board);assert.equal(p.x,0);assert.equal(p.y,99);
});


test('export prepares a PNG before native sharing and requests share only from its explicit action',()=>{
  const env=environment();let shares=0;env.sandbox.File=class{constructor(parts,name,options){this.parts=parts;this.name=name;this.type=options.type;}};env.sandbox.atob=value=>Buffer.from(value,'base64').toString('binary');env.sandbox.navigator={canShare:()=>true,share(){shares++;return new Promise(()=>{});}};env.api.mount(env.root);paintDot(env);env.api._test.exportArtwork();assert.equal(shares,0);assert.match(env.nodes.get('#artDialog').innerHTML,/share-export/);assert.match(env.nodes.get('#artSaveStatus').textContent,/图片已准备好/);env.api._test.action('share-export');assert.equal(shares,1);assert.equal(env.nodes.get('#artDialog').hidden,false,'the preview and download stay usable even if a native share request never settles');assert.match(env.nodes.get('#artDialog').innerHTML,/data-art-download/);env.api.stop();
});
