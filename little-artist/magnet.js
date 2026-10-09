// Conservative geometry recognition: leave uncertain strokes exactly as drawn.
const Magnet = (() => {
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));

  function resample(input,count,close){
    const source=close?[...input,input[0]]:input;
    const lengths=[0];
    for(let i=1;i<source.length;i++)lengths[i]=lengths[i-1]+distance(source[i-1],source[i]);
    const total=lengths[lengths.length-1];if(total<1)return input;
    const result=[];let segment=1;
    for(let i=0;i<count;i++){
      const target=total*i/(close?count:count-1);
      while(segment<lengths.length-1&&lengths[segment]<target)segment++;
      const span=lengths[segment]-lengths[segment-1]||1;
      const part=(target-lengths[segment-1])/span;
      result.push({x:source[segment-1].x+(source[segment].x-source[segment-1].x)*part,y:source[segment-1].y+(source[segment].y-source[segment-1].y)*part});
    }
    return result;
  }
  function pointSegmentDistance(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy||1;
    const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1);
    return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
  }
  function pathError(points,vertices,order){
    let sum=0;
    for(const p of points){let best=Infinity;for(let i=0;i<order.length;i++)best=Math.min(best,pointSegmentDistance(p,vertices[order[i]],vertices[order[(i+1)%order.length]]));sum+=best}
    return sum/points.length;
  }
  function starCandidate(points,cx,cy,r){
    let best=Infinity,bestAngle=0;
    for(let step=0;step<12;step++){
      const angle=-Math.PI/2+step*Math.PI/30;
      const outline=[];
      for(let j=0;j<10;j++){
        const rr=j%2?0.43*r:r,a=angle+j*Math.PI/5;
        outline.push({x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr});
      }
      const pentagram=[];
      for(let j=0;j<5;j++){
        const a=angle+j*2*Math.PI/5;
        pentagram.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r});
      }
      const error=Math.min(pathError(points,outline,[0,1,2,3,4,5,6,7,8,9]),pathError(points,pentagram,[0,2,4,1,3]));
      if(error<best){best=error;bestAngle=angle}
    }
    return best/r<0.105?{type:'star',cx,cy,r,angle:bestAngle,label:'五角星'}:null;
  }
  function cornerCount(points){
    let count=0;
    const n=points.length;
    for(let i=0;i<n;i++){
      const a=points[(i-3+n)%n],b=points[i],c=points[(i+3)%n];
      const u=Math.atan2(b.y-a.y,b.x-a.x),v=Math.atan2(c.y-b.y,c.x-b.x);
      const turn=Math.abs(Math.atan2(Math.sin(v-u),Math.cos(v-u)));
      if(turn>0.85)count++;
    }
    return count;
  }
  function ellipseCandidate(points){
    const n=points.length;
    let meanX=0,meanY=0;for(const p of points){meanX+=p.x;meanY+=p.y}meanX/=n;meanY/=n;
    let xx=0,yy=0,xy=0;
    for(const p of points){const x=p.x-meanX,y=p.y-meanY;xx+=x*x;yy+=y*y;xy+=x*y}
    const angle=0.5*Math.atan2(2*xy,xx-yy),ca=Math.cos(angle),sa=Math.sin(angle);
    let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;
    for(const p of points){const x=p.x-meanX,y=p.y-meanY,u=x*ca+y*sa,v=-x*sa+y*ca;minU=Math.min(minU,u);maxU=Math.max(maxU,u);minV=Math.min(minV,v);maxV=Math.max(maxV,v)}
    const rx=(maxU-minU)/2,ry=(maxV-minV)/2;if(rx<24||ry<24)return null;
    const centerU=(maxU+minU)/2,centerV=(maxV+minV)/2;
    let error=0;
    for(const p of points){const x=p.x-meanX,y=p.y-meanY,u=(x*ca+y*sa-centerU)/rx,v=(-x*sa+y*ca-centerV)/ry;error+=Math.abs(Math.hypot(u,v)-1)}
    error/=n;
    if(error>0.17||cornerCount(points)>4)return null;
    const cx=meanX+centerU*ca-centerV*sa,cy=meanY+centerU*sa+centerV*ca;
    const ratio=Math.max(rx,ry)/Math.min(rx,ry);
    return {type:ratio<1.22?'circle':'ellipse',cx,cy,rx,ry,angle,label:ratio<1.22?'圆形':'椭圆'};
  }
  function recognize(input,pixelRatio=1){
    if(!input||input.length<10)return null;
    const points=input.filter((p,i)=>i===0||distance(p,input[i-1])>1.4*pixelRatio);
    if(points.length<10)return null;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,length=0;
    for(let i=0;i<points.length;i++){
      const p=points[i];minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);
      if(i)length+=distance(points[i-1],p);
    }
    const width=maxX-minX,height=maxY-minY,diag=Math.hypot(width,height);
    if(diag<65*pixelRatio||length<90*pixelRatio)return null;
    const start=points[0],end=points[points.length-1],gap=distance(start,end);
    if(gap/length>0.84&&length/gap<1.16)return {type:'line',start,end,label:'直线'};
    if(gap>Math.max(30*pixelRatio,diag*.23)||width<42*pixelRatio||height<42*pixelRatio)return null;
    const sample=resample(points,72,true);
    const center=sample.reduce((value,p)=>({x:value.x+p.x/sample.length,y:value.y+p.y/sample.length}),{x:0,y:0});
    const outerRadius=Math.max(...sample.map(p=>distance(p,center)));
    const star=starCandidate(sample,center.x,center.y,outerRadius);
    if(star&&length>4*star.r)return star;
    return ellipseCandidate(sample);
  }
  function draw(ctx,shape,strokeColor,strokeWidth){
    ctx.save();ctx.strokeStyle=strokeColor;ctx.lineWidth=strokeWidth;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
    if(shape.type==='line'){ctx.moveTo(shape.start.x,shape.start.y);ctx.lineTo(shape.end.x,shape.end.y)}
    else if(shape.type==='star'){
      for(let i=0;i<10;i++){
        const radius=i%2?shape.r*.43:shape.r,angle=shape.angle+i*Math.PI/5;
        const x=shape.cx+Math.cos(angle)*radius,y=shape.cy+Math.sin(angle)*radius;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }ctx.closePath();
    } else ctx.ellipse(shape.cx,shape.cy,shape.rx,shape.ry,shape.angle,0,Math.PI*2);
    ctx.stroke();ctx.restore();
  }
  return {recognize,draw};
})();
