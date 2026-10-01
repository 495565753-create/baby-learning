(() => {
  'use strict';
  const TAU=Math.PI*2, STEP=TAU/8, CX=450, CY=285;
  const colors=['#ffcf85','#a8ead7','#d8c1f4','#f4a6b5'];
  const names=['外环','第二环','第三环','内环'];
  const levels=[
    {name:'第一枚星锁',rings:3,linked:false,scramble:[[0,2],[1,-2],[2,3]],message:'先试试：分别转动三层，让开口都朝向上方。'},
    {name:'一动，两响',rings:3,linked:true,scramble:[[0,2],[1,3],[2,-2]],message:'现在每次转动，里侧的圆环会反向走一步。'},
    {name:'交错的轨道',rings:3,linked:true,scramble:[[1,3],[0,-2],[2,2],[1,-1]],message:'观察联动规律，再决定先转哪一层。'},
    {name:'四环试炼',rings:4,linked:false,scramble:[[0,3],[1,-2],[2,3],[3,-3]],message:'四层圆环，考验你的耐心与顺序。'},
    {name:'最后一枚星锁',rings:4,linked:true,scramble:[[0,2],[2,-3],[1,2],[3,3],[0,-1]],message:'四环联动。把所有缺口送回星标。'}
  ];
  const mod=n=>(n%8+8)%8;
  const circle=(ctx,x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);};

  class RingsGame {
    constructor(app) {
      this.app=app;
      this.helpText='点一下想转动的圆环，它会顺时针走一格。下方按钮也可以顺时针或逆时针转动选中的环。所有开口对准上方的星标即可过关；后面的关卡会有圆环联动。键盘按 1～4 选环，← → 转动。';
      this.level=Math.min(Number(localStorage.getItem('pocket-rings-level')||0),levels.length-1);
      this.selected=0;
      this.visual=[];
      this.t=0;
    }
    start(){this.makeControls();this.restart();}
    destroy(){}
    config(){return levels[this.level];}
    applyMove(state,index,dir){
      const next=state.slice();next[index]=mod(next[index]+dir);
      if(this.config().linked)next[(index+1)%next.length]=mod(next[(index+1)%next.length]-dir);
      return next;
    }
    initialState(){
      let state=Array(this.config().rings).fill(0);
      for(const [index,dir] of this.config().scramble)state=this.applyMove(state,index,dir);
      return state;
    }
    restart(){
      this.app.hideOverlay();this.state=this.initialState();this.visual=this.state.map(n=>n*STEP);this.selected=0;this.moves=0;this.t=0;this.active=true;
      this.app.setLevel(this.level+1);this.app.setStatus(`${this.config().name} · ${this.config().message}`);this.updateBest();this.updateControlLabel();
    }
    makeControls(){
      this.app.controls.innerHTML='<span class="control-hint" id="ring-selection">当前：外环</span><button class="control-button" id="ring-left" type="button">↶ 逆时针</button><button class="control-button primary-control" id="ring-right" type="button">顺时针 ↷</button><span class="control-divider"></span><button class="control-button" id="ring-hint" type="button">✧ 提示</button>';
      this.selectionLabel=this.app.controls.querySelector('#ring-selection');
      this.app.controls.querySelector('#ring-left').onclick=()=>this.rotate(this.selected,-1);
      this.app.controls.querySelector('#ring-right').onclick=()=>this.rotate(this.selected,1);
      this.app.controls.querySelector('#ring-hint').onclick=()=>this.hint();
    }
    updateControlLabel(){if(this.selectionLabel)this.selectionLabel.textContent=`当前：${names[this.selected]}`;}
    updateBest(){const b=Number(localStorage.getItem(`pocket-rings-best-${this.level}`)||0);this.app.setScore(b?`最佳 ${b} 步`:'最佳记录 —');}
    rotate(index,dir){
      if(!this.active)return;
      this.selected=index;this.updateControlLabel();this.state=this.applyMove(this.state,index,dir);this.moves++;this.app.sound(430+index*85,.085,'triangle');
      this.app.setStatus(`已转 ${this.moves} 步 · ${this.config().linked?'圆环会相互带动':'让所有开口朝向上方'}`);
      if(this.state.every(n=>n===0))this.win();
    }
    hint(){
      if(!this.active)return;
      const start=this.state;
      const queue=[{state:start,first:null}];const seen=new Set([start.join(',')]);
      for(let head=0;head<queue.length;head++){
        const current=queue[head];
        for(let i=0;i<start.length;i++)for(const dir of [-1,1]){
          const next=this.applyMove(current.state,i,dir), key=next.join(',');
          if(seen.has(key))continue;
          const first=current.first||{index:i,dir};
          if(next.every(n=>n===0)){this.selected=first.index;this.updateControlLabel();this.app.setStatus(`提示：试试将${names[first.index]}向${first.dir>0?'顺':'逆'}时针转动`);this.app.sound(720,.13);return;}
          seen.add(key);queue.push({state:next,first});
        }
      }
      this.app.setStatus('再观察一下圆环的联动吧。');
    }
    win(){
      this.active=false;const key=`pocket-rings-best-${this.level}`,best=Number(localStorage.getItem(key)||0);
      if(!best||this.moves<best)localStorage.setItem(key,String(this.moves));
      this.updateBest();this.app.sound(790,.18);setTimeout(()=>this.app.sound(1040,.2),100);
      const last=this.level===levels.length-1;
      if(!last)localStorage.setItem('pocket-rings-level',String(this.level+1));
      this.app.showOverlay({icon:'✧',title:last?'星锁全部解开！':'机关解开了！',message:`用了 ${this.moves} 步。${last?'整座工坊重新亮起来了。':'下一枚星锁会更有意思。'}`,primary:last?'从第一关再玩 →':'下一关 →',secondary:'重玩本关',onPrimary:()=>{if(last)localStorage.setItem('pocket-rings-level','0');this.level=last?0:this.level+1;this.restart();},onSecondary:()=>this.restart()});
    }
    pointerDown(x,y){
      const distance=Math.hypot(x-CX,y-CY),radii=this.radii();
      let index=-1,delta=Infinity;
      radii.forEach((r,i)=>{const d=Math.abs(distance-r);if(d<delta){delta=d;index=i;}});
      if(delta<33&&index>=0){this.selected=index;this.updateControlLabel();this.rotate(index,1);}
    }
    keyDown(e){
      if(/^[1-4]$/.test(e.key)){const i=Number(e.key)-1;if(i<this.config().rings){this.selected=i;this.updateControlLabel();this.app.sound(340,.05);}}
      if(e.key==='ArrowLeft')this.rotate(this.selected,-1);
      if(e.key==='ArrowRight')this.rotate(this.selected,1);
      if(e.key==='h'||e.key==='H')this.hint();
    }
    radii(){return this.config().rings===4?[198,156,114,72]:[188,136,84];}
    update(dt){
      this.t+=dt;
      for(let i=0;i<this.state.length;i++){
        const target=this.state[i]*STEP;
        const diff=Math.atan2(Math.sin(target-this.visual[i]),Math.cos(target-this.visual[i]));
        this.visual[i]+=diff*Math.min(1,dt*12);
      }
    }
    render(ctx){
      const bg=ctx.createRadialGradient(CX,CY,30,CX,CY,570);bg.addColorStop(0,'#5b538e');bg.addColorStop(1,'#292647');ctx.fillStyle=bg;ctx.fillRect(0,0,900,550);
      ctx.strokeStyle='#ffffff10';for(let r=50;r<620;r+=60){circle(ctx,CX,CY,r);ctx.lineWidth=1;ctx.stroke();}
      for(let i=0;i<35;i++){const x=(i*169+29)%900,y=(i*97+33)%550;ctx.fillStyle=i%4?'#e3d9ff40':'#ffe7b285';circle(ctx,x,y,i%5===0?2:1);ctx.fill();}
      ctx.fillStyle='#dfd5f5';ctx.font='700 15px "Noto Sans SC", sans-serif';ctx.textAlign='left';ctx.fillText(this.config().name,36,45);
      ctx.fillStyle='#c1b8dd';ctx.font='12px "Noto Sans SC", sans-serif';ctx.fillText(this.config().linked?'联动机关：转动一环，里侧也会动':'独立机关：一环一环慢慢解开',36,70);
      ctx.textAlign='right';ctx.font='700 14px "DM Sans", sans-serif';ctx.fillStyle='#fff0c0';ctx.fillText(`${String(this.moves).padStart(2,'0')} STEPS`,862,46);ctx.textAlign='left';
      const radii=this.radii();
      ctx.fillStyle='#ffe8a7';ctx.font='31px sans-serif';ctx.textAlign='center';ctx.fillText('✦',CX,CY-radii[0]-36);
      ctx.strokeStyle='#ffe9aa70';ctx.lineWidth=2;ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(CX,CY-radii[0]-20);ctx.lineTo(CX,CY-38);ctx.stroke();ctx.setLineDash([]);
      for(let i=0;i<radii.length;i++){
        const r=radii[i],angle=-Math.PI/2+this.visual[i],gap=.58;
        ctx.save();ctx.shadowColor=colors[i];ctx.shadowBlur=i===this.selected?22:5;
        ctx.strokeStyle='#ffffff0d';ctx.lineWidth=35;circle(ctx,CX,CY,r);ctx.stroke();
        ctx.beginPath();ctx.arc(CX,CY,r,angle+gap/2,angle+TAU-gap/2);ctx.strokeStyle=colors[i];ctx.lineWidth=i===this.selected?25:21;ctx.lineCap='round';ctx.stroke();ctx.restore();
        const dotAngle=angle+Math.PI,dx=CX+r*Math.cos(dotAngle),dy=CY+r*Math.sin(dotAngle);
        ctx.fillStyle='#302b57';circle(ctx,dx,dy,9);ctx.fill();ctx.fillStyle=colors[i];circle(ctx,dx,dy,4);ctx.fill();
      }
      const pulse=.5+.5*Math.sin(this.t*2.5);
      ctx.fillStyle=`rgba(255,234,178,${.12+.1*pulse})`;circle(ctx,CX,CY,42);ctx.fill();
      ctx.fillStyle='#f8e0a2';ctx.font='31px sans-serif';ctx.textAlign='center';ctx.fillText('✧',CX,CY+11);
      ctx.fillStyle='#e9def6';ctx.font='13px "Noto Sans SC", sans-serif';ctx.fillText(`当前：${names[this.selected]}`,CX,517);
      ctx.textAlign='left';
    }
  }
  window.PocketGames ||= {};
  window.PocketGames.rings=RingsGame;
})();
