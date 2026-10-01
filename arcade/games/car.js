(() => {
  'use strict';
  const W = 900, H = 550;
  const levels = [
    {name:'早安，星星镇', finish:940, track:[[[0,430],[240,430],[365,403],[490,403],[610,430],[1010,430]]], tip:'先按住前进，试着越过小坡。'},
    {name:'空中的邮路', finish:1060, track:[[[0,430],[260,430],[392,365],[505,365]],[[730,430],[840,430],[930,398],[1130,398]]], tip:'上坡加速，腾空后松开油门稳住车身。'},
    {name:'风吹纸桥', finish:1220, track:[[[0,430],[210,430],[310,380],[432,380]],[[515,425],[745,425],[835,355],[930,355]],[[1025,430],[1310,430]]], tip:'空中松开油门，可以让车身更平稳。'},
    {name:'月光弯弯路', finish:1320, track:[[[0,430],[200,430],[305,385],[380,455],[480,390],[580,390]],[[660,440],[800,440],[905,382],[1010,382]],[[1095,430],[1420,430]]], tip:'连续上下坡，记得控制速度。'},
    {name:'星河终点站', finish:1490, track:[[[0,430],[210,430],[345,365],[455,365]],[[550,435],[760,435],[865,345],[965,345]],[[1065,430],[1200,430],[1300,382],[1590,382]]], tip:'三次短跳，把最后一封信送到终点。'}
  ];
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const easeAngle = angle => Math.atan2(Math.sin(angle),Math.cos(angle));
  const rounded = (ctx,x,y,w,h,r) => {ctx.beginPath();ctx.roundRect(x,y,w,h,r);};

  class CarGame {
    constructor(app) {
      this.app=app;
      this.helpText='按住 → 或 D 前进，按住 ← 或 A 刹车、倒车。手机用画面下方的两个按钮。上坡加速，腾空后适时松开油门，避免车头翻过去。车顶朝下着地就会翻车；抵达邮箱即可送出星星信。';
      this.level=clamp(Number(localStorage.getItem('pocket-car-level')||0),0,levels.length-1);
      this.input={left:false,right:false};
      this.particles=[];
      this.clouds=[{x:90,y:115,s:1},{x:370,y:83,s:.7},{x:740,y:130,s:1.2},{x:1130,y:94,s:.9}];
    }
    start() {
      this.makeControls();
      this.restart();
    }
    destroy() {this.input.left=false;this.input.right=false;}
    makeControls() {
      this.app.controls.innerHTML=`
        <div class="drive-control">
          <button class="control-button drive-button" data-direction="left" type="button" aria-label="按住刹车或倒车">
            <svg viewBox="0 0 64 40" aria-hidden="true" focusable="false"><path d="M43 20H13m0 0 10-10M13 20l10 10M50 10v20M57 10v20"/></svg>
          </button>
          <span aria-hidden="true">刹车 / 倒车</span>
        </div>
        <div class="drive-control">
          <button class="control-button primary-control drive-button" data-direction="right" type="button" aria-label="按住前进加速">
            <svg viewBox="0 0 64 40" aria-hidden="true" focusable="false"><path d="M19 20h30m0 0L39 10m10 10L39 30M7 12h12M7 28h12"/></svg>
          </button>
          <span aria-hidden="true">前进 / 加速</span>
        </div>`;
      this.app.controls.querySelectorAll('[data-direction]').forEach(button => {
        const direction=button.dataset.direction;
        const release=()=>{this.input[direction]=false;button.classList.remove('pressed');};
        button.addEventListener('pointerdown', e=>{e.preventDefault();button.setPointerCapture(e.pointerId);this.input[direction]=true;button.classList.add('pressed');this.app.sound(direction==='right'?510:290,.055,'triangle');});
        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
        button.addEventListener('lostpointercapture', release);
        button.addEventListener('contextmenu', e=>e.preventDefault());
        button.addEventListener('selectstart', e=>e.preventDefault());
        button.addEventListener('dragstart', e=>e.preventDefault());
      });
    }
    restart() {
      this.app.hideOverlay();
      this.input.left=false;this.input.right=false;
      this.car={x:84,y:360,vx:0,vy:0,angle:0,angVel:0,onGround:false};
      this.camera=0;this.elapsed=0;this.state='playing';this.particles=[];
      this.app.setLevel(this.level+1);
      this.app.setStatus(`${levels[this.level].name} · ${levels[this.level].tip}`);
      this.updateBest();
    }
    updateBest() {
      const best=Number(localStorage.getItem(`pocket-car-best-${this.level}`)||0);
      this.app.setScore(best?`最快 ${best.toFixed(1)} 秒`:'最佳记录 —');
    }
    keyDown(e) {if(['ArrowLeft','a','A'].includes(e.key))this.input.left=true;if(['ArrowRight','d','D'].includes(e.key))this.input.right=true;if(e.key==='r'||e.key==='R')this.restart();}
    keyUp(e) {if(['ArrowLeft','a','A'].includes(e.key))this.input.left=false;if(['ArrowRight','d','D'].includes(e.key))this.input.right=false;}
    blur() {this.input.left=false;this.input.right=false;}
    terrainY(x) {
      for(const piece of levels[this.level].track) {
        for(let i=0;i<piece.length-1;i++) {
          const a=piece[i],b=piece[i+1];
          if(x>=a[0]&&x<=b[0]) return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
        }
      }
      return null;
    }
    wheel(offset) {
      const c=this.car,a=c.angle;
      return {x:c.x+offset*Math.cos(a)-18*Math.sin(a),y:c.y+offset*Math.sin(a)+18*Math.cos(a)};
    }
    update(dt) {
      if(this.state!=='playing') return;
      this.elapsed+=dt;
      const c=this.car;
      const direction=Number(this.input.right)-Number(this.input.left);
      const acceleration=c.onGround?440:90;
      c.vx=clamp(c.vx+direction*acceleration*dt,-125,360);
      c.vx*=Math.pow(c.onGround?.986:.998,dt*60);
      c.vy+=690*dt;
      c.x+=c.vx*dt;
      c.y+=c.vy*dt;
      c.angVel+=-direction*(c.onGround?.22:16)*dt;
      c.angle+=c.angVel*dt;
      c.angVel*=Math.pow(.986,dt*60);
      if(c.x<55){c.x=55;c.vx=Math.max(0,c.vx);}
      const left=this.wheel(-34),right=this.wheel(34);
      const hLeft=this.terrainY(left.x),hRight=this.terrainY(right.x);
      const contacts=[];
      if(hLeft!==null && left.y+16>=hLeft && left.y<hLeft+28)contacts.push({h:hLeft,p:left.y+16-hLeft});
      if(hRight!==null && right.y+16>=hRight && right.y<hRight+28)contacts.push({h:hRight,p:right.y+16-hRight});
      c.onGround=contacts.length>0;
      if(contacts.length) {
        const penetration=Math.max(...contacts.map(q=>q.p));
        c.y-=penetration;
        if(c.vy>0)c.vy=0;
        const rawTarget=(hLeft!==null&&hRight!==null)?Math.atan2(hRight-hLeft,68):0;
        const target=clamp(rawTarget,-.65,.65);
        c.angle+=easeAngle(target-c.angle)*Math.min(1,dt*7.5);
        c.angVel*=Math.pow(.57,dt*60);
        if(Math.abs(easeAngle(c.angle))>1.58){this.fail('哎呀，邮车翻过来了！');return;}
        if(Math.abs(c.vx)>95 && Math.random()<dt*15)this.particles.push({x:c.x-32,y:c.y+39,life:.45,r:3+Math.random()*3});
      }
      for(const p of this.particles)p.life-=dt;
      this.particles=this.particles.filter(p=>p.life>0);
      this.camera+=((clamp(c.x-250,0,Math.max(0,levels[this.level].finish-600)))-this.camera)*Math.min(1,dt*4);
      if(c.y>H+110){this.fail('邮车掉下去了，再试一次！');return;}
      if(c.x>=levels[this.level].finish && c.onGround) this.win();
    }
    fail(message) {
      this.state='failed';this.app.sound(220,.19,'sawtooth');this.app.setStatus(message);
      this.app.showOverlay({icon:'↺',title:'差一点就到了',message,primary:'再试一次 →',secondary:'从头再来',onPrimary:()=>this.restart(),onSecondary:()=>this.restart()});
    }
    win() {
      this.state='won';
      const key=`pocket-car-best-${this.level}`;
      const best=Number(localStorage.getItem(key)||0);
      if(!best||this.elapsed<best)localStorage.setItem(key,this.elapsed.toFixed(2));
      this.updateBest();this.app.setStatus('星星信送达！');
      this.app.sound(660,.15);setTimeout(()=>this.app.sound(880,.23),110);
      const final=this.level===levels.length-1;
      if(!final)localStorage.setItem('pocket-car-level',String(this.level+1));
      this.app.showOverlay({icon:'✉',title:final?'全部送达！':'送达成功！',message:`用时 ${this.elapsed.toFixed(1)} 秒。${final?'星星镇的每一封信都收到了。':'下一条邮路在等你。'}`,primary:final?'再跑一圈 →':'下一关 →',secondary:'重玩本关',onPrimary:()=>{if(final)localStorage.setItem('pocket-car-level','0');this.level=final?0:this.level+1;this.restart();},onSecondary:()=>this.restart()});
    }
    drawCloud(ctx,x,y,s) {
      ctx.fillStyle='#ffffffad';ctx.beginPath();ctx.ellipse(x,y,37*s,13*s,0,0,Math.PI*2);ctx.ellipse(x-19*s,y+3*s,25*s,11*s,0,0,Math.PI*2);ctx.ellipse(x+19*s,y+3*s,27*s,10*s,0,0,Math.PI*2);ctx.fill();
    }
    render(ctx) {
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#7bc7d2');sky.addColorStop(.65,'#d3eacb');sky.addColorStop(1,'#f3d49b');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#fff4bb';ctx.beginPath();ctx.arc(735-this.camera*.08,95,43,0,Math.PI*2);ctx.fill();
      for(const cloud of this.clouds)this.drawCloud(ctx,cloud.x-this.camera*.18,cloud.y,cloud.s);
      ctx.fillStyle='#88b7a6';for(let i=-1;i<9;i++){ctx.beginPath();ctx.ellipse(i*185-this.camera*.25,435,165,95,0,Math.PI,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#659d8d';for(let i=-1;i<10;i++){ctx.beginPath();ctx.ellipse(i*150+50-this.camera*.46,445,125,56,0,Math.PI,Math.PI*2);ctx.fill();}
      ctx.save();ctx.translate(-this.camera,0);
      const level=levels[this.level];
      for(const piece of level.track) {
        ctx.beginPath();ctx.moveTo(piece[0][0],H);ctx.lineTo(piece[0][0],piece[0][1]);for(const point of piece.slice(1))ctx.lineTo(point[0],point[1]);ctx.lineTo(piece[piece.length-1][0],H);ctx.closePath();ctx.fillStyle='#435c62';ctx.fill();
        ctx.beginPath();ctx.moveTo(piece[0][0],piece[0][1]);for(const point of piece.slice(1))ctx.lineTo(point[0],point[1]);ctx.lineWidth=13;ctx.strokeStyle='#7dba91';ctx.lineJoin='round';ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle='#c2e0a5';ctx.stroke();
        for(let x=piece[0][0]+28;x<piece[piece.length-1][0];x+=58){const y=this.terrainY(x);if(y===null)continue;ctx.strokeStyle='#6e9280';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y+17);ctx.lineTo(x-4,y+26);ctx.stroke();}
      }
      for(let i=210;i<level.finish;i+=250){const y=this.terrainY(i);if(y===null)continue;ctx.fillStyle='#f6e1ac';ctx.fillRect(i,y-22,4,21);ctx.fillStyle='#e36d72';ctx.beginPath();ctx.moveTo(i+4,y-22);ctx.lineTo(i+21,y-17);ctx.lineTo(i+4,y-11);ctx.fill();}
      const mailboxY=this.terrainY(level.finish)||430;
      ctx.fillStyle='#faf3d8';ctx.fillRect(level.finish-4,mailboxY-82,6,82);
      rounded(ctx,level.finish-21,mailboxY-91,43,38,7);ctx.fillStyle='#ec766c';ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(level.finish-10,mailboxY-77,20,3);ctx.font='17px sans-serif';ctx.fillText('✦',level.finish-9,mailboxY-52);
      for(const p of this.particles){ctx.globalAlpha=p.life/.45;ctx.fillStyle='#efecce';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
      this.drawCar(ctx);
      ctx.restore();
      ctx.fillStyle='#1c425044';rounded(ctx,24,20,205,28,14);ctx.fill();ctx.fillStyle='#ecf7dc';ctx.font='bold 13px "Noto Sans SC", sans-serif';ctx.fillText(`✦ ${level.name}`,38,39);
      ctx.fillStyle='#ffffff70';rounded(ctx,24,H-24,W-48,7,4);ctx.fill();ctx.fillStyle='#e2f584';rounded(ctx,24,H-24,(W-48)*clamp((this.car.x-80)/(level.finish-80),0,1),7,4);ctx.fill();
    }
    drawCar(ctx) {
      const c=this.car;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);
      ctx.fillStyle='#31506555';ctx.beginPath();ctx.ellipse(3,31,67,8,0,0,Math.PI*2);ctx.fill();
      rounded(ctx,-58,-18,102,48,10);ctx.fillStyle='#f2ab5f';ctx.fill();
      rounded(ctx,-55,-28,70,43,9);ctx.fillStyle='#f8cf76';ctx.fill();
      ctx.fillStyle='#e8f7e8';rounded(ctx,18,-13,19,16,4);ctx.fill();ctx.fillStyle='#8ac6c3';rounded(ctx,20,-11,15,12,2);ctx.fill();
      ctx.fillStyle='#fff1b3';ctx.font='bold 22px sans-serif';ctx.fillText('✦',-31,1);
      ctx.fillStyle='#345160';ctx.fillRect(-61,13,109,9);
      for(const x of [-34,34]){ctx.fillStyle='#263c4c';ctx.beginPath();ctx.arc(x,26,17,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dce9df';ctx.beginPath();ctx.arc(x,26,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#758c8e';ctx.beginPath();ctx.arc(x,26,3,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
  }
  window.PocketGames ||= {};
  window.PocketGames.car=CarGame;
})();
