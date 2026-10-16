/* Deterministic 2D choreography: shared by animation and geometry checks. */
(() => {
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const ease=t=>(t=clamp(t),t*t*(3-2*t));
  const mix=(a,b,t)=>a+(b-a)*t;
  const cubic=(a,b,c,d,t)=>{const u=1-t;return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d;};
  function point(progress,side,w,h){
    const t=clamp(progress),sign=side?1:-1,u=t<.5?t*2:(t-.5)*2;
    const x=t<.5?cubic(0,-.30,-1.15,-.95,u):cubic(-.95,-.75,-.22,0,u);
    const y=t<.5?cubic(1,.70,.10,-.48,u):cubic(-.48,-1,-.95,-.52,u);
    return {x:w*.5+sign*x*-1*Math.min(w*.27,h*.30,290),y:h*.43+y*Math.min(w*.30,h*.25,240)};
  }
  function sample(seconds,side,w,h,origin){
    const t=Math.max(0,seconds),sign=side?1:-1;
    const size=Math.min(w*.22,h*.23,190),draw=ease((t-1.4)/6),p=point(draw,side,w,h);
    // Bodies keep separate full-square bounds even where the light trails join.
    const offset=(size*.54+8)*(1-.25*Math.sin(draw*Math.PI));
    let x=p.x+sign*offset,y=p.y,s=size,angle=sign*Math.sin(draw*Math.PI*2)*15;
    let face=(side?-1:1)*(t<1.4?1-2*ease(t/.9):-1+2*ease((draw-.43)/.18));
    if(t<1.4){const u=ease(t/1.4);x=mix(origin.x,x,u);y=mix(origin.y,y,u);s=mix(origin.size,size,u);angle*=u;}
    if(t>8.2){const u=ease((t-8.2)/4);s=mix(size,size*.13,u);x=mix(x,w*.5+sign*(s*.56+6),u);y=mix(y,h*.14,u);angle=mix(angle,-sign*8,u);face=side?-1:1;}
    // A brief, shallow bank suggests turning; never flatten the entire drawing.
    face=(face<0?-1:1)*(.34+.66*Math.abs(face));
    if(Math.abs(angle)<.00001)angle=0;
    return {x,y,size:s,angle,face,opacity:1-ease((t-11.7)/1.1),draw,heartOpacity:1-ease((t-14)/4),stage:t<1.4?'takeoff':t<7.4?'drawing':t<8.2?'meeting':t<12.8?'departure':t<18?'afterglow':'settled'};
  }
  function draw(ctx,seconds,w,h,reduced=false){
    const progress=reduced?1:ease((seconds-1.4)/6),alpha=reduced?.65:1-ease((seconds-14)/4);
    ctx.clearRect(0,0,w,h);if(!progress||alpha<=0)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.lineJoin='round';
    for(let side=0;side<2;side++){
      const color=side?'#e8e5ff':'#8fdfff';
      for(const [width,opacity,blur] of [[7,.10,16],[3,.40,9],[1.35,.95,3]]){
        ctx.beginPath();for(let n=0;n<=96;n++){const p=point(progress*n/96,side,w,h);n?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
        ctx.lineWidth=width;ctx.strokeStyle=color;ctx.globalAlpha=alpha*opacity;ctx.shadowColor=color;ctx.shadowBlur=blur;ctx.stroke();
      }
      if(!reduced){for(let n=0;n<18;n++){
        const u=progress-n*.012;if(u<0)continue;const p=point(u,side,w,h),fade=clamp(1-(seconds-7.4)/2);
        ctx.globalAlpha=alpha*fade*(1-n/18)*.8;ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x+Math.sin(n*2.7+seconds)*3,p.y+Math.cos(n*1.7+seconds)*3,n%3===0?1.6:.8,0,Math.PI*2);ctx.fill();
      }}
    }
    ctx.restore();
  }
  function message(seconds,w,h,reduced=false){
    const rx=Math.min(w*.27,h*.30,290),ry=Math.min(w*.30,h*.25,240);
    return {show:reduced||seconds>=9.7,top:h*.43-ry*.09,width:rx*1.8,
      nameSize:clamp(rx*.40,30,64),labelSize:clamp(rx*.19,16,25),
      label:reduced?1:ease((seconds-9.7)/.85),name:reduced?1:ease((seconds-10.15)/1.5),
      flourish:reduced?1:ease((seconds-11.2)/1.05)};
  }
  window.Finale={sample,point,draw,message,duration:18};
  window.DragonActing={sample(seconds,side,finalTime=-1){
    const phase=(finalTime>=0?16+finalTime:seconds)+side*.43;
    const encounter=finalTime>=0?ease((finalTime-6.5)/.8)*(1-ease((finalTime-8.1)/.8)):ease((seconds-10)/2);
    const nod=finalTime>=0?Math.sin((finalTime-6.6-side*.22)*Math.PI*1.4)*encounter:Math.sin(phase*1.15);
    const local=finalTime>=0?finalTime:((seconds-(2.7+side*.37)+10.05)%6.7)-3.35;
    const blink=finalTime>=0?Math.exp(-Math.pow((local-(7.65+side*.16))/.075,2)):Math.exp(-Math.pow(local/.075,2));
    return {head:nod*(side?13:10),tail:Math.sin(phase*2.25-.8)*18,blink,wingGain:1-encounter*.32};
  }};
})();
