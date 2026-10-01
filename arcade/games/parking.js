(() => {
  'use strict';
  const N=6, CELL=72, BX=213, BY=58;
  const levels=[
    {name:'出口就在前面',cars:[['X',0,2,2,'h'],['A',3,1,2,'v'],['B',1,4,3,'h']]},
    {name:'两辆挡路车',cars:[['X',0,2,2,'h'],['A',2,1,2,'v'],['B',4,2,2,'v'],['C',3,4,2,'h']]},
    {name:'先把横车挪开',cars:[['X',0,2,2,'h'],['A',2,1,2,'v'],['B',3,0,3,'v'],['C',4,2,2,'v'],['D',2,4,3,'h']]},
    {name:'转个弯想一想',cars:[['X',0,2,2,'h'],['A',2,1,2,'v'],['B',3,1,2,'v'],['C',4,2,2,'v'],['D',3,4,2,'h'],['E',1,0,2,'h']]},
    {name:'最后的停车场',cars:[['X',0,2,2,'h'],['A',2,1,2,'v'],['B',3,0,3,'v'],['C',4,2,2,'v'],['D',3,4,2,'h'],['E',2,5,2,'h']]}
  ];
  const paints=['#ef827b','#f7c976','#96d9cd','#aab9eb','#ceabdf','#90c3d6','#edab9f'];
  const round=(ctx,x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};

  class ParkingGame {
    constructor(app){
      this.app=app;
      this.helpText='点击一辆车选中它，再按下方方向按钮。车只能沿着车身方向移动。也可以在车上用手指滑动。把挡路的车辆移开，让红色小车开到右边出口。';
      this.level=Math.min(Math.max(Number(localStorage.getItem('pocket-parking-level')||0),0),levels.length-1);
      this.selected='X';this.touchStart=null;
    }
    start(){this.makeControls();this.restart();}
    destroy(){this.touchStart=null;}
    makeControls(){
      this.app.controls.innerHTML='<span class="control-hint" id="parking-selection">当前：红色小车</span><button class="control-button" id="parking-back" type="button">← 往左</button><button class="control-button primary-control" id="parking-forward" type="button">往右 →</button><button class="control-button" id="parking-hint" type="button">✧ 提示</button>';
      this.selectionLabel=this.app.controls.querySelector('#parking-selection');
      this.backButton=this.app.controls.querySelector('#parking-back');
      this.forwardButton=this.app.controls.querySelector('#parking-forward');
      this.backButton.onclick=()=>this.move(-1);
      this.forwardButton.onclick=()=>this.move(1);
      this.app.controls.querySelector('#parking-hint').onclick=()=>this.hint();
    }
    restart(){
      this.app.hideOverlay();
      this.cars=levels[this.level].cars.map(([id,x,y,len,axis],i)=>({id,x,y,len,axis,color:paints[i]}));
      this.selected='X';this.moves=0;this.active=true;this.touchStart=null;
      this.app.setLevel(this.level+1);this.app.setStatus(`${levels[this.level].name} · 帮红色小车开到右边出口`);this.updateBest();this.updateSelection();
    }
    updateBest(){const n=Number(localStorage.getItem(`pocket-parking-best-${this.level}`)||0);this.app.setScore(n?`最佳 ${n} 步`:'最佳记录 —');}
    selectedCar(){return this.cars.find(c=>c.id===this.selected);}
    updateSelection(){
      const car=this.selectedCar();if(!car)return;
      if(this.selectionLabel)this.selectionLabel.textContent=`当前：${car.id==='X'?'红色小车':`${car.id} 号车`}`;
      if(this.backButton)this.backButton.textContent=car.axis==='h'?'← 往左':'↑ 往上';
      if(this.forwardButton)this.forwardButton.textContent=car.axis==='h'?'往右 →':'往下 ↓';
    }
    occupied(x,y,except){return this.cars.some(c=>c.id!==except&&Array.from({length:c.len},(_,i)=>c.axis==='h'?[c.x+i,c.y]:[c.x,c.y+i]).some(([cx,cy])=>cx===x&&cy===y));}
    canMove(car,dir,cars=this.cars){
      const x=car.x+(car.axis==='h'?(dir>0?car.len:-1):0);
      const y=car.y+(car.axis==='v'?(dir>0?car.len:-1):0);
      if(x<0||x>=N||y<0||y>=N)return false;
      return !cars.some(c=>c.id!==car.id&&Array.from({length:c.len},(_,i)=>c.axis==='h'?[c.x+i,c.y]:[c.x,c.y+i]).some(([cx,cy])=>cx===x&&cy===y));
    }
    move(dir){
      if(!this.active)return false;
      const car=this.selectedCar();if(!car||!this.canMove(car,dir)){this.app.sound(180,.06,'triangle');return false;}
      if(car.axis==='h')car.x+=dir;else car.y+=dir;
      this.moves++;this.app.sound(380+(this.moves%5)*35,.06,'triangle');
      this.app.setStatus(`已移动 ${this.moves} 步 · ${car.id==='X'?'继续朝出口开吧':'再看看红色小车前面的路'}`);
      if(car.id==='X'&&car.x+car.len===N)this.win();
      return true;
    }
    hint(){
      if(!this.active)return;
      const start=this.cars.map(c=>({id:c.id,x:c.x,y:c.y,len:c.len,axis:c.axis}));
      const key=cars=>cars.map(c=>`${c.x},${c.y}`).join('|');
      const queue=[{cars:start,first:null}],seen=new Set([key(start)]);
      for(let head=0;head<queue.length&&head<30000;head++){
        const {cars,first}=queue[head];
        for(let i=0;i<cars.length;i++)for(const dir of [-1,1]){
          if(!this.canMove(cars[i],dir,cars))continue;
          const next=cars.map(c=>({...c})),car=next[i];
          if(car.axis==='h')car.x+=dir;else car.y+=dir;
          const firstMove=first||{id:car.id,dir,axis:car.axis};
          if(car.id==='X'&&car.x+car.len===N){this.selected=firstMove.id;this.updateSelection();this.app.setStatus(`提示：把 ${firstMove.id==='X'?'红色小车':`${firstMove.id} 号车`}往${firstMove.axis==='h'?(firstMove.dir>0?'右':'左'):(firstMove.dir>0?'下':'上')}挪一格`);this.app.sound(730,.1);return;}
          const k=key(next);if(!seen.has(k)){seen.add(k);queue.push({cars:next,first:firstMove});}
        }
      }
      this.app.setStatus('再试着挪一挪挡住出口的车吧。');
    }
    pointerDown(x,y,event){
      if(!this.active)return;
      const gx=Math.floor((x-BX)/CELL),gy=Math.floor((y-BY)/CELL);
      if(gx<0||gy<0||gx>=N||gy>=N)return;
      const car=this.cars.find(c=>Array.from({length:c.len},(_,i)=>c.axis==='h'?[c.x+i,c.y]:[c.x,c.y+i]).some(([cx,cy])=>cx===gx&&cy===gy));
      if(car){this.selected=car.id;this.updateSelection();this.touchStart={x,y,id:car.id,pointerId:event.pointerId};this.app.sound(470,.045);}
    }
    pointerUp(x,y,event){
      const start=this.touchStart;this.touchStart=null;
      if(!start||start.pointerId!==event.pointerId||!this.active)return;
      const car=this.selectedCar(),delta=car.axis==='h'?x-start.x:y-start.y;
      if(Math.abs(delta)<CELL*.28)return;
      const steps=Math.min(5,Math.max(1,Math.round(Math.abs(delta)/CELL)));
      for(let i=0;i<steps;i++)if(!this.move(Math.sign(delta)))break;
    }
    pointerCancel(){this.touchStart=null;}
    keyDown(e){const car=this.selectedCar();if(!car)return;if((car.axis==='h'&&e.key==='ArrowLeft')||(car.axis==='v'&&e.key==='ArrowUp'))this.move(-1);if((car.axis==='h'&&e.key==='ArrowRight')||(car.axis==='v'&&e.key==='ArrowDown'))this.move(1);if(e.key==='h'||e.key==='H')this.hint();}
    update(){}
    win(){
      this.active=false;const key=`pocket-parking-best-${this.level}`,best=Number(localStorage.getItem(key)||0);
      if(!best||this.moves<best)localStorage.setItem(key,String(this.moves));this.updateBest();
      this.app.sound(650,.14);setTimeout(()=>this.app.sound(860,.17),100);
      const last=this.level===levels.length-1;if(!last)localStorage.setItem('pocket-parking-level',String(this.level+1));
      this.app.showOverlay({icon:'🚗',title:last?'全部开出去啦！':'成功出逃！',message:`用了 ${this.moves} 步。${last?'停车场畅通无阻。':'下一关还有新路线。'}`,primary:last?'从第一关再玩 →':'下一关 →',secondary:'重玩本关',onPrimary:()=>{if(last)localStorage.setItem('pocket-parking-level','0');this.level=last?0:this.level+1;this.restart();},onSecondary:()=>this.restart()});
    }
    render(ctx){
      const bg=ctx.createLinearGradient(0,0,900,550);bg.addColorStop(0,'#b8d7d7');bg.addColorStop(1,'#e3e8c7');ctx.fillStyle=bg;ctx.fillRect(0,0,900,550);
      for(let i=0;i<15;i++){ctx.fillStyle=i%2?'#8dbfa04b':'#ffffff66';ctx.beginPath();ctx.arc((i*163+41)%900,(i*113+27)%550,i%3===0?11:5,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#315367';ctx.font='700 17px sans-serif';ctx.fillText(levels[this.level].name,32,39);ctx.fillStyle='#547083';ctx.font='12px sans-serif';ctx.fillText('选车后按方向移动，或顺着车身滑动',32,61);
      ctx.textAlign='right';ctx.fillStyle='#315367';ctx.font='700 14px sans-serif';ctx.fillText(`${String(this.moves).padStart(2,'0')} STEPS`,869,40);ctx.textAlign='left';
      round(ctx,BX-13,BY-13,N*CELL+26,N*CELL+26,22);ctx.fillStyle='#385d70';ctx.fill();
      for(let y=0;y<N;y++)for(let x=0;x<N;x++){round(ctx,BX+x*CELL+3,BY+y*CELL+3,CELL-6,CELL-6,8);ctx.fillStyle=(x+y)%2?'#517187':'#58798e';ctx.fill();}
      ctx.fillStyle='#eaf8bb';round(ctx,BX+N*CELL-4,BY+2*CELL+10,62,CELL-20,10);ctx.fill();
      ctx.strokeStyle='#426977';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(BX+N*CELL+17,BY+2*CELL+CELL/2);ctx.lineTo(BX+N*CELL+48,BY+2*CELL+CELL/2);ctx.lineTo(BX+N*CELL+37,BY+2*CELL+CELL/2-11);ctx.moveTo(BX+N*CELL+48,BY+2*CELL+CELL/2);ctx.lineTo(BX+N*CELL+37,BY+2*CELL+CELL/2+11);ctx.stroke();
      this.cars.forEach(car=>{
        const x=BX+car.x*CELL+7,y=BY+car.y*CELL+7,w=(car.axis==='h'?car.len:1)*CELL-14,h=(car.axis==='v'?car.len:1)*CELL-14;
        ctx.save();ctx.shadowColor='#172f3d66';ctx.shadowBlur=10;ctx.shadowOffsetY=6;round(ctx,x,y,w,h,13);ctx.fillStyle=car.color;ctx.fill();ctx.restore();
        round(ctx,x+5,y+5,w-10,h-10,9);ctx.strokeStyle=car.id===this.selected?'#fffdf0':'#ffffff66';ctx.lineWidth=car.id===this.selected?4:2;ctx.stroke();
        ctx.fillStyle='#ffffff8a';if(car.axis==='h'){round(ctx,x+w*.31,y+11,w*.38,h-22,6);ctx.fill();}else{round(ctx,x+11,y+h*.31,w-22,h*.38,6);ctx.fill();}
        ctx.fillStyle='#29475b';ctx.font='800 21px sans-serif';ctx.textAlign='center';ctx.fillText(car.id==='X'?'✦':car.id,x+w/2,y+h/2+7);ctx.textAlign='left';
      });
      ctx.fillStyle='#426476';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('出口 →',720,268);ctx.textAlign='left';
    }
  }
  window.PocketGames ||= {};
  window.PocketGames.parking=ParkingGame;
})();
