(() => {
  'use strict';
  const COLORS={A:'#f3a5b9',B:'#9cdbcf',C:'#f8d28d',D:'#b9a9ef'};
  const STAGES=[
    {name:'两片泡泡云',rows:['..AA..BB..','..AA..BB..','...A..B...']},
    {name:'三色小星球',rows:['.AABBCC...','.AABBCC...','..AABBCC..']},
    {name:'交错的彩虹',rows:['..ABCABC..','.AABBCC...','..ABCABC..','...ABCC...']},
    {name:'紫色新朋友',rows:['.AABBDD...','..AABBDD..','..CCBBCC..','...C..C...']},
    {name:'星空大扫除',rows:['AABBCCDDAA','.AABBCCDD.','..AABBCC..','..DCCBBAA.','...DDCC...']}
  ];
  const COLS=10,ROWS=10,R=22,DX=46,DY=40,BX=222,BY=104,SX=450,SY=493;
  const key=(r,c)=>`${r},${c}`;
  const center=(r,c)=>({x:BX+c*DX+(r%2)*DX/2,y:BY+r*DY});
  const circle=(ctx,x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);};

  class BubblesGame {
    constructor(app){
      this.app=app;
      this.helpText='点击泡泡下方或泡泡本身，发射一颗泡泡。三颗或更多同色泡泡连在一起就会消失；失去顶部支撑的泡泡也会掉落。点击下方“换颜色”可选择还在画面里的颜色。别让泡泡堆到发射器。';
      this.level=Math.min(Math.max(Number(localStorage.getItem('pocket-bubbles-level')||0),0),STAGES.length-1);
      this.aim={x:450,y:170};this.particles=[];
    }
    start(){this.makeControls();this.restart();}
    destroy(){}
    makeControls(){
      this.app.controls.innerHTML='<span class="control-hint">点击画面发射</span><button class="control-button primary-control" id="bubble-swap" type="button">换颜色 ↻</button><span class="bubble-color-note" id="bubble-color-note"></span>';
      this.app.controls.querySelector('#bubble-swap').onclick=()=>this.swap();
      this.colorNote=this.app.controls.querySelector('#bubble-color-note');
    }
    restart(){
      this.app.hideOverlay();this.board=new Map();
      STAGES[this.level].rows.forEach((row,r)=>[...row].forEach((color,c)=>{if(color!=='.')this.board.set(key(r,c),color);}));
      this.shots=0;this.active=true;this.projectile=null;this.particles=[];this.current=this.available()[0];this.aim={x:450,y:170};
      this.app.setLevel(this.level+1);this.app.setStatus(`${STAGES[this.level].name} · 三颗同色泡泡连在一起就会消除`);this.updateBest();this.updateColor();
    }
    updateBest(){const best=Number(localStorage.getItem(`pocket-bubbles-best-${this.level}`)||0);this.app.setScore(best?`最佳 ${best} 发`:'最佳记录 —');}
    available(){return [...new Set(this.board.values())].sort();}
    updateColor(){if(this.colorNote)this.colorNote.innerHTML=`<i style="background:${COLORS[this.current]||COLORS.A}"></i>当前泡泡`;}
    swap(){if(!this.active)return;const colors=this.available();if(colors.length<2)return;this.current=colors[(colors.indexOf(this.current)+1)%colors.length];this.updateColor();this.app.sound(450,.06,'triangle');}
    pointerMove(x,y){if(y<SY-15)this.aim={x,y};}
    pointerDown(x,y){if(y>=SY-10)return;this.aim={x,y};this.shoot();}
    keyDown(e){if(e.key===' '||e.key==='Enter')this.shoot();if(e.key==='c'||e.key==='C')this.swap();if(e.key==='ArrowLeft')this.aim.x=Math.max(190,this.aim.x-28);if(e.key==='ArrowRight')this.aim.x=Math.min(710,this.aim.x+28);}
    shoot(){
      if(!this.active||this.projectile)return;
      const dx=this.aim.x-SX,dy=Math.min(-35,this.aim.y-SY),length=Math.hypot(dx,dy);
      this.projectile={x:SX,y:SY,color:this.current,vx:dx/length*690,vy:dy/length*690};
      this.shots++;this.app.sound(480,.08,'sine');this.app.setStatus(`第 ${this.shots} 发 · 凑齐三个相同颜色`);
      const colors=this.available(),index=colors.indexOf(this.current);this.current=colors[(index+1)%colors.length]||colors[0];this.updateColor();
    }
    neighbors(r,c){
      const out=[];const p=center(r,c);
      for(let nr=Math.max(0,r-1);nr<=Math.min(ROWS-1,r+1);nr++)for(let nc=Math.max(0,c-1);nc<=Math.min(COLS-1,c+1);nc++){
        if(nr===r&&nc===c)continue;
        const q=center(nr,nc);if(Math.hypot(p.x-q.x,p.y-q.y)<DX*1.12)out.push([nr,nc]);
      }
      return out;
    }
    connected(start,matchColor){
      const stack=[start],seen=new Set();
      while(stack.length){const [r,c]=stack.pop(),k=key(r,c);if(seen.has(k)||!this.board.has(k))continue;if(matchColor&&this.board.get(k)!==matchColor)continue;seen.add(k);for(const next of this.neighbors(r,c))stack.push(next);}
      return seen;
    }
    burst(keys){
      for(const k of keys){const [r,c]=k.split(',').map(Number),p=center(r,c),color=this.board.get(k);if(!color)continue;this.board.delete(k);for(let i=0;i<3;i++)this.particles.push({x:p.x,y:p.y,vx:(i-1)*85+(Math.random()-.5)*45,vy:-80-Math.random()*70,life:.45,color:COLORS[color]});}
      this.app.sound(750,.1,'triangle');
    }
    settle(x,y,color){
      const spots=[];
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
        const k=key(r,c);if(this.board.has(k))continue;
        if(r!==0&&!this.neighbors(r,c).some(([nr,nc])=>this.board.has(key(nr,nc))))continue;
        const p=center(r,c);spots.push({r,c,d:Math.hypot(x-p.x,y-p.y)});
      }
      spots.sort((a,b)=>a.d-b.d);
      if(!spots.length){this.fail();return;}
      const {r,c}=spots[0],placed=key(r,c);this.board.set(placed,color);
      const group=this.connected([r,c],color);
      if(group.size>=3){
        this.burst(group);
        const anchored=new Set();for(let col=0;col<COLS;col++)if(this.board.has(key(0,col)))for(const k of this.connected([0,col]))anchored.add(k);
        const floating=[...this.board.keys()].filter(k=>!anchored.has(k));if(floating.length)this.burst(floating);
        this.app.setStatus(`太棒啦！消掉 ${group.size+floating.length} 颗泡泡`);
      }else this.app.setStatus('再来一颗同色泡泡试试');
      if(this.board.size===0){this.win();return;}
      if([...this.board.keys()].some(k=>Number(k.split(',')[0])>=8)){this.fail();return;}
      if(!this.available().includes(this.current))this.current=this.available()[0];this.updateColor();
    }
    update(dt){
      for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=230*dt;p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0);
      const b=this.projectile;if(!b)return;
      const steps=Math.max(1,Math.ceil(dt/.008)),step=dt/steps;
      for(let i=0;i<steps&&this.projectile;i++){
        b.x+=b.vx*step;b.y+=b.vy*step;
        if(b.x<205+R){b.x=205+R;b.vx=Math.abs(b.vx);}if(b.x>695-R){b.x=695-R;b.vx=-Math.abs(b.vx);}
        if(b.y<=BY){this.projectile=null;this.settle(b.x,b.y,b.color);break;}
        for(const k of this.board.keys()){
          const [r,c]=k.split(',').map(Number),p=center(r,c);
          if(Math.hypot(b.x-p.x,b.y-p.y)<R*2-.5){this.projectile=null;this.settle(b.x,b.y,b.color);break;}
        }
      }
    }
    fail(){
      this.active=false;this.app.sound(220,.16,'sawtooth');
      this.app.showOverlay({icon:'↺',title:'泡泡堆得太高啦',message:'换个角度再试试，记得切换颜色。',primary:'重新开始 →',secondary:'再玩一次',onPrimary:()=>this.restart(),onSecondary:()=>this.restart()});
    }
    win(){
      this.active=false;const key=`pocket-bubbles-best-${this.level}`,best=Number(localStorage.getItem(key)||0);
      if(!best||this.shots<best)localStorage.setItem(key,String(this.shots));this.updateBest();
      this.app.sound(720,.14);setTimeout(()=>this.app.sound(970,.2),110);
      const last=this.level===STAGES.length-1;if(!last)localStorage.setItem('pocket-bubbles-level',String(this.level+1));
      this.app.showOverlay({icon:'✧',title:last?'星空清理完成！':'泡泡都消失啦！',message:`用了 ${this.shots} 发。${last?'整个星球都闪闪发亮。':'下一片泡泡云在等你。'}`,primary:last?'从第一关再玩 →':'下一关 →',secondary:'重玩本关',onPrimary:()=>{if(last)localStorage.setItem('pocket-bubbles-level','0');this.level=last?0:this.level+1;this.restart();},onSecondary:()=>this.restart()});
    }
    drawBubble(ctx,x,y,color,r=R){
      ctx.save();ctx.shadowColor=color;ctx.shadowBlur=12;circle(ctx,x,y,r);ctx.fillStyle=color;ctx.fill();ctx.restore();
      ctx.fillStyle='#ffffff8c';circle(ctx,x-r*.28,y-r*.32,r*.23);ctx.fill();ctx.strokeStyle='#ffffff6b';ctx.lineWidth=2;circle(ctx,x,y,r-3);ctx.stroke();
    }
    render(ctx){
      const bg=ctx.createRadialGradient(450,240,90,450,280,610);bg.addColorStop(0,'#61559e');bg.addColorStop(1,'#292647');ctx.fillStyle=bg;ctx.fillRect(0,0,900,550);
      for(let i=0;i<45;i++){circle(ctx,(i*173+33)%900,(i*89+29)%550,i%6===0?2:1);ctx.fillStyle='#ffffff56';ctx.fill();}
      ctx.fillStyle='#f1e8ff';ctx.font='700 17px sans-serif';ctx.fillText(STAGES[this.level].name,32,39);ctx.fillStyle='#d0c4ed';ctx.font='12px sans-serif';ctx.fillText('三颗同色泡泡相连就能消除',32,61);
      ctx.textAlign='right';ctx.fillStyle='#f9dfaf';ctx.font='700 14px sans-serif';ctx.fillText(`${String(this.shots).padStart(2,'0')} SHOTS`,870,40);ctx.textAlign='left';
      ctx.strokeStyle='#ffffff30';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(205,82);ctx.lineTo(205,456);ctx.moveTo(695,82);ctx.lineTo(695,456);ctx.stroke();
      for(const [k,color] of this.board){const [r,c]=k.split(',').map(Number),p=center(r,c);this.drawBubble(ctx,p.x,p.y,COLORS[color]);}
      if(this.active&&!this.projectile){const dx=this.aim.x-SX,dy=Math.min(-35,this.aim.y-SY),length=Math.hypot(dx,dy);ctx.strokeStyle='#fff8c677';ctx.lineWidth=3;ctx.setLineDash([5,12]);ctx.beginPath();ctx.moveTo(SX,SY);ctx.lineTo(SX+dx/length*190,SY+dy/length*190);ctx.stroke();ctx.setLineDash([]);}
      ctx.fillStyle='#e6d3f7';ctx.beginPath();ctx.moveTo(SX-34,540);ctx.lineTo(SX-18,490);ctx.lineTo(SX+18,490);ctx.lineTo(SX+34,540);ctx.fill();
      if(this.current)this.drawBubble(ctx,SX,SY,COLORS[this.current],R+3);
      if(this.projectile)this.drawBubble(ctx,this.projectile.x,this.projectile.y,COLORS[this.projectile.color]);
      for(const p of this.particles){ctx.globalAlpha=Math.max(0,p.life/.45);circle(ctx,p.x,p.y,4);ctx.fillStyle=p.color;ctx.fill();}ctx.globalAlpha=1;
    }
  }
  window.PocketGames ||= {};
  window.PocketGames.bubbles=BubblesGame;
})();
