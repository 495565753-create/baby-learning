(() => {
  'use strict';
  const PALETTE={A:{name:'莓果红',hex:'#ed8c83'},B:{name:'蜂蜜黄',hex:'#f2ca75'},C:{name:'薄荷绿',hex:'#8ad4b4'},D:{name:'蓝莓紫',hex:'#a8a0d6'}};
  const stages=[
    {name:'花园第一课',par:4,art:['..AA....','.AABB...','AABCCB..','ABCDDCB.','ABCDDCB.','AABCCB..','.AABB...','..AA....']},
    {name:'夏日的小花',par:5,art:['..BBBB..','.BBAABB.','BBAAAABB','BAACCAAB','BAACCAAB','BBAAAABB','.BBAABB.','..BBBB..']},
    {name:'莓果蛋糕',par:5,art:['..AAAA..','..ABBA..','.ABBBA..','.ACCCAA.','BBCCCCBB','BBDDDDBB','BBBBBBBB','........']},
    {name:'森林的纸风车',par:6,art:['...DD...','..DCCD..','.DCCBBD.','DCCBBAAD','DCCBBAAD','.DCCBBD.','..DCCD..','...DD...']},
    {name:'最后一颗星',par:7,art:['...BB...','..BAAB..','.BAAAAB.','BAACCAAB','BAACCAAB','.BAAAAB.','..BAAB..','...BB...']}
  ];
  const CELL=48, BX=258, BY=85, N=8;
  const round=(ctx,x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};

  class ColonyGame {
    constructor(app) {
      this.app=app;
      this.helpText='画布上的色块像一层层积木。选一种颜色，小队会搬走所有与外边或空位相邻的该色方块，也会连续搬走刚露出来的同色方块。先处理外层，直到画布清空。尽量用更少的步数过关。可以点击下方颜色，或直接点击画布边缘的色块。';
      this.level=Math.min(Number(localStorage.getItem('pocket-colony-level')||0),stages.length-1);
      this.clock=0;this.animating=null;this.moves=0;
    }
    start(){this.makeControls();this.restart();}
    destroy(){}
    makeControls(){
      this.app.controls.innerHTML='<span class="control-hint">派出小队</span>'+Object.entries(PALETTE).map(([key,value])=>`<button class="control-button color-choice" data-color="${key}" type="button"><span class="color-swatch" style="background:${value.hex}"></span>${value.name}</button>`).join('');
      this.app.controls.querySelectorAll('[data-color]').forEach(button=>button.onclick=()=>this.choose(button.dataset.color));
    }
    restart(){
      this.app.hideOverlay();this.board=stages[this.level].art.map(row=>[...row].map(c=>c==='.'?null:c));
      this.moves=0;this.animating=null;this.clock=0;this.active=true;
      this.app.setLevel(this.level+1);this.app.setStatus(`${stages[this.level].name} · 从外层开始搬吧`);this.updateBest();this.updateButtons();
    }
    updateBest(){const b=Number(localStorage.getItem(`pocket-colony-best-${this.level}`)||0);this.app.setScore(b?`最佳 ${b} 步`:'最佳记录 —');}
    isExposed(x,y,board=this.board){
      if(!board[y]?.[x])return false;
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])if(!board[y+dy]?.[x+dx])return true;
      return false;
    }
    exposedCount(color){let n=0;for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(this.board[y][x]===color&&this.isExposed(x,y))n++;return n;}
    cellsFor(color){
      const copy=this.board.map(row=>row.slice()),cells=[];
      let wave=0;
      while(true){
        const next=[];
        for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(copy[y][x]===color&&this.isExposed(x,y,copy))next.push({x,y,wave});
        if(!next.length)break;
        for(const cell of next){copy[cell.y][cell.x]=null;cells.push(cell);}
        wave++;
      }
      return cells;
    }
    updateButtons(){this.app.controls.querySelectorAll('[data-color]').forEach(button=>{const c=button.dataset.color;button.disabled=!this.active||!!this.animating||this.exposedCount(c)===0;});}
    choose(color){
      if(!this.active||this.animating)return;
      const cells=this.cellsFor(color);
      if(!cells.length){this.app.setStatus(`${PALETTE[color].name}暂时被挡住了，先搬别的颜色。`);this.app.sound(190,.07,'triangle');return;}
      this.moves++;this.animating={cells,time:0,color,removed:new Set()};this.app.sound(400+this.moves*25,.08,'triangle');
      this.app.setStatus(`${PALETTE[color].name}小队出发！这一步能搬走 ${cells.length} 块。`);this.updateButtons();
    }
    pointerDown(x,y){
      const gx=Math.floor((x-BX)/CELL),gy=Math.floor((y-BY)/CELL);
      if(gx<0||gx>=N||gy<0||gy>=N)return;
      const color=this.board[gy][gx];
      if(color)this.choose(color);
    }
    keyDown(e){const color={a:'A',b:'B',c:'C',d:'D'}[e.key.toLowerCase()];if(color)this.choose(color);}
    update(dt){
      this.clock+=dt;
      if(!this.animating)return;
      const a=this.animating;a.time+=dt;
      let lastEnd=0;
      a.cells.forEach((cell,index)=>{
        const delay=cell.wave*.2+(index%9)*.032;
        const end=delay+.34;lastEnd=Math.max(lastEnd,end);
        if(a.time>=end&&!a.removed.has(index)){this.board[cell.y][cell.x]=null;a.removed.add(index);}
      });
      if(a.time>=lastEnd+.1){
        this.animating=null;
        if(this.board.every(row=>row.every(cell=>!cell)))this.win();
        else{this.app.setStatus(`已搬 ${this.moves} 步 · 继续清理刚露出来的色块`);this.updateButtons();}
      }
    }
    win(){
      this.active=false;
      const key=`pocket-colony-best-${this.level}`,best=Number(localStorage.getItem(key)||0);
      if(!best||this.moves<best)localStorage.setItem(key,String(this.moves));this.updateBest();
      this.app.sound(620,.14);setTimeout(()=>this.app.sound(830,.18),100);
      const last=this.level===stages.length-1;
      if(!last)localStorage.setItem('pocket-colony-level',String(this.level+1));
      this.app.showOverlay({icon:'❀',title:last?'森林整理好了！':'搬运完成！',message:`用了 ${this.moves} 步${this.moves<=stages[this.level].par?'，拿到了效率小星星 ✦':'。再玩一次，试试能否更快'}。`,primary:last?'再从第一关玩 →':'下一关 →',secondary:'重玩本关',onPrimary:()=>{if(last)localStorage.setItem('pocket-colony-level','0');this.level=last?0:this.level+1;this.restart();},onSecondary:()=>this.restart()});
    }
    render(ctx){
      const grad=ctx.createLinearGradient(0,0,900,550);grad.addColorStop(0,'#cce8cf');grad.addColorStop(1,'#f2e6bf');ctx.fillStyle=grad;ctx.fillRect(0,0,900,550);
      for(let i=0;i<16;i++){
        const x=(i*163+70)%960-30,y=(i*101+45)%550;
        ctx.save();ctx.translate(x,y);ctx.rotate((i%4)*.7);ctx.fillStyle=i%2?'#a5cba06b':'#f5f2d683';ctx.beginPath();ctx.ellipse(0,0,18,7,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      ctx.fillStyle='#365e5a';ctx.font='700 17px "Noto Sans SC",sans-serif';ctx.fillText(stages[this.level].name,31,45);
      ctx.fillStyle='#66847a';ctx.font='12px "Noto Sans SC",sans-serif';ctx.fillText('把画布一点点搬回家',31,67);
      ctx.textAlign='right';ctx.fillStyle='#365e5a';ctx.font='700 14px "DM Sans",sans-serif';ctx.fillText(`${String(this.moves).padStart(2,'0')} STEPS`,870,45);ctx.textAlign='left';
      round(ctx,BX-15,BY-15,N*CELL+30,N*CELL+30,23);ctx.fillStyle='#f8f7e9';ctx.fill();ctx.strokeStyle='#b9d5bc';ctx.lineWidth=3;ctx.stroke();
      for(let y=0;y<N;y++)for(let x=0;x<N;x++){
        const px=BX+x*CELL,py=BY+y*CELL,c=this.board[y][x];
        round(ctx,px+2,py+2,CELL-4,CELL-4,7);ctx.fillStyle=c?PALETTE[c].hex:'#dde5d5';ctx.fill();
        if(c){
          ctx.fillStyle='#ffffff49';round(ctx,px+6,py+6,CELL-12,6,3);ctx.fill();
          if(this.isExposed(x,y)){ctx.strokeStyle='#ffffffa8';ctx.lineWidth=2;round(ctx,px+3,py+3,CELL-6,CELL-6,7);ctx.stroke();}
        }else{
          ctx.fillStyle='#ffffff73';ctx.font='16px sans-serif';ctx.textAlign='center';ctx.fillText('·',px+CELL/2,py+CELL/2+5);ctx.textAlign='left';
        }
      }
      if(this.animating){
        const a=this.animating;
        a.cells.forEach((cell,index)=>{
          if(a.removed.has(index))return;
          const delay=cell.wave*.2+(index%9)*.032;
          const progress=Math.max(0,Math.min(1,(a.time-delay)/.34));
          if(progress<=0)return;
          const tx=BX+(cell.x+.5)*CELL,ty=BY+(cell.y+.5)*CELL;
          const sx=450+(index%9-4)*7,sy=520;
          const ease=1-Math.pow(1-progress,3);
          const x=sx+(tx-sx)*ease,y=sy+(ty-sy)*ease;
          ctx.fillStyle='#385b56';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=PALETTE[a.color].hex;ctx.beginPath();ctx.arc(x-4,y-3,3,0,Math.PI*2);ctx.fill();
        });
      }
      const total=stages[this.level].art.join('').replaceAll('.','').length;
      const remaining=this.board.flat().filter(Boolean).length;
      ctx.fillStyle='#54776c';ctx.font='700 13px "Noto Sans SC",sans-serif';ctx.textAlign='center';ctx.fillText(`剩余 ${remaining} / ${total} 块`,450,515);ctx.textAlign='left';
      ctx.fillStyle='#8aa68a';ctx.font='31px sans-serif';ctx.fillText('❀',75,458);ctx.fillText('✿',780,423);
    }
  }
  window.PocketGames ||= {};
  window.PocketGames.colony=ColonyGame;
})();
