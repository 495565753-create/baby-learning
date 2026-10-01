(() => {
  'use strict';
  const STAGES=[
    {name:'云端第一层',goal:5,speed:235},
    {name:'越叠越高',goal:7,speed:265},
    {name:'风吹过塔尖',goal:9,speed:295},
    {name:'高空建筑师',goal:11,speed:325},
    {name:'碰到星星啦',goal:13,speed:355}
  ];
  const PALETTE=['#f4c77e','#a6ddd4','#aca3dc','#ef9ca4','#d7e69e'];
  const BASE_Y=500,BLOCK_H=29;
  const round=(ctx,x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};

  class StackGame {
    constructor(app){
      this.app=app;
      this.helpText='方块会左右移动。看它快要对齐下面一层时，点击画面或“放下方块”。没有对齐的部分会切掉，后面的方块也会变窄。连续叠到目标层数就过关。电脑可以按空格或回车。';
      this.level=Math.min(Math.max(Number(localStorage.getItem('pocket-stack-level')||0),0),STAGES.length-1);
      this.time=0;
    }
    start(){this.makeControls();this.restart();}
    destroy(){}
    makeControls(){
      this.app.controls.innerHTML='<span class="control-hint">找准对齐时机</span><button class="control-button primary-control stack-drop" id="stack-drop" type="button">↓ 放下方块</button><span class="stack-progress" id="stack-progress"></span>';
      this.app.controls.querySelector('#stack-drop').onclick=()=>this.drop();
      this.progress=this.app.controls.querySelector('#stack-progress');
    }
    restart(){
      this.app.hideOverlay();this.blocks=[{x:330,w:240,y:BASE_Y,color:'#354c66'}];this.moving={x:75,w:240,y:BASE_Y-BLOCK_H,dir:1};
      this.active=true;this.time=0;this.app.setLevel(this.level+1);this.app.setStatus(`${STAGES[this.level].name} · 叠到 ${STAGES[this.level].goal} 层就能过关`);this.updateBest();this.updateProgress();
    }
    updateBest(){const best=Number(localStorage.getItem(`pocket-stack-best-${this.level}`)||0);this.app.setScore(best?`最多 ${best} 层`:'最佳记录 —');}
    updateProgress(){if(this.progress)this.progress.textContent=`${this.blocks.length-1} / ${STAGES[this.level].goal} 层`;}
    pointerDown(){this.drop();}
    keyDown(e){if(e.key===' '||e.key==='Enter')this.drop();}
    update(dt){
      this.time+=dt;if(!this.active||!this.moving)return;
      const m=this.moving,level=STAGES[this.level];
      m.x+=m.dir*(level.speed+(this.blocks.length-1)*13)*dt;
      if(m.x<70){m.x=70;m.dir=1;}if(m.x+m.w>830){m.x=830-m.w;m.dir=-1;}
    }
    drop(){
      if(!this.active||!this.moving)return;
      const prev=this.blocks[this.blocks.length-1],m=this.moving;
      let left=Math.max(prev.x,m.x),right=Math.min(prev.x+prev.w,m.x+m.w);
      if(Math.abs(m.x-prev.x)<=11){left=prev.x;right=prev.x+prev.w;}
      const width=right-left;
      if(width<20){this.fail();return;}
      const floor=this.blocks.length,color=PALETTE[(floor-1)%PALETTE.length];
      this.blocks.push({x:left,w:width,y:m.y,color});this.app.sound(350+floor*42,.08,'triangle');this.updateProgress();
      const bestKey=`pocket-stack-best-${this.level}`,best=Number(localStorage.getItem(bestKey)||0);
      if(floor>best){localStorage.setItem(bestKey,String(floor));this.updateBest();}
      if(floor>=STAGES[this.level].goal){this.win();return;}
      this.moving={x:floor%2?830-width:70,w:width,y:BASE_Y-(floor+1)*BLOCK_H,dir:floor%2?-1:1};
      this.app.setStatus(`已经叠到第 ${floor} 层 · 看准下一块的位置`);
    }
    fail(){
      this.active=false;this.moving=null;this.app.sound(190,.18,'sawtooth');
      this.app.showOverlay({icon:'↺',title:'差一点就叠上啦',message:`这次叠到了 ${this.blocks.length-1} 层。观察方块快要重合时再点一下。`,primary:'重新挑战 →',secondary:'再玩一次',onPrimary:()=>this.restart(),onSecondary:()=>this.restart()});
    }
    win(){
      this.active=false;this.moving=null;this.app.sound(700,.16);setTimeout(()=>this.app.sound(920,.2),100);
      const last=this.level===STAGES.length-1;if(!last)localStorage.setItem('pocket-stack-level',String(this.level+1));
      this.app.showOverlay({icon:'✦',title:last?'塔尖碰到星星啦！':'叠塔成功！',message:`稳稳叠起了 ${STAGES[this.level].goal} 层。${last?'你是云上的建筑师。':'下一关移动得更快。'}`,primary:last?'从第一关再玩 →':'下一关 →',secondary:'重玩本关',onPrimary:()=>{if(last)localStorage.setItem('pocket-stack-level','0');this.level=last?0:this.level+1;this.restart();},onSecondary:()=>this.restart()});
    }
    render(ctx){
      const bg=ctx.createLinearGradient(0,0,0,550);bg.addColorStop(0,'#678bc6');bg.addColorStop(.7,'#e5b1b7');bg.addColorStop(1,'#fae2bd');ctx.fillStyle=bg;ctx.fillRect(0,0,900,550);
      const sun=ctx.createRadialGradient(750,120,20,750,120,120);sun.addColorStop(0,'#fff3cbaa');sun.addColorStop(1,'#fff3cb00');ctx.fillStyle=sun;ctx.fillRect(630,0,240,240);
      for(let i=0;i<15;i++){const x=(i*173+this.time*(i%2?5:-7)+80)%1080-90,y=105+(i*83)%330;ctx.fillStyle=i%3?'#ffffff46':'#ffffff71';ctx.beginPath();ctx.ellipse(x,y,45+(i%4)*10,10+(i%3)*5,0,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#263f62';ctx.font='700 17px sans-serif';ctx.fillText(STAGES[this.level].name,32,39);ctx.fillStyle='#405575';ctx.font='12px sans-serif';ctx.fillText('看准重合的瞬间，点一下放下方块',32,61);
      ctx.textAlign='right';ctx.fillStyle='#263f62';ctx.font='700 14px sans-serif';ctx.fillText(`${String(this.blocks.length-1).padStart(2,'0')} / ${STAGES[this.level].goal} FLOORS`,867,40);ctx.textAlign='left';
      ctx.fillStyle='#425d79';round(ctx,80,BASE_Y+3,740,24,11);ctx.fill();
      for(const [i,b] of this.blocks.entries()){
        if(i===0)continue;
        ctx.save();ctx.shadowColor='#39476055';ctx.shadowBlur=12;ctx.shadowOffsetY=4;round(ctx,b.x,b.y,b.w,BLOCK_H,5);ctx.fillStyle=b.color;ctx.fill();ctx.restore();
        ctx.fillStyle='#ffffff78';round(ctx,b.x+5,b.y+5,Math.max(0,b.w-10),5,3);ctx.fill();
      }
      if(this.moving){const m=this.moving;ctx.save();ctx.shadowColor='#263d6677';ctx.shadowBlur=17;round(ctx,m.x,m.y,m.w,BLOCK_H,6);ctx.fillStyle=PALETTE[(this.blocks.length-1)%PALETTE.length];ctx.fill();ctx.restore();ctx.fillStyle='#ffffff9b';round(ctx,m.x+5,m.y+5,Math.max(0,m.w-10),5,3);ctx.fill();}
      ctx.fillStyle='#355577';ctx.font='700 13px sans-serif';ctx.textAlign='center';ctx.fillText('点击任意位置放下',450,546);ctx.textAlign='left';
    }
  }
  window.PocketGames ||= {};
  window.PocketGames.stack=StackGame;
})();
