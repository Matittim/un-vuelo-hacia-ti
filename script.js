(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const experience = $('experience');
  const dragons = [$('darkDragon'), $('whiteDragon')];
  const params = new URLSearchParams(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && !params.has('forceMotion');
  if(params.has('forceMotion'))document.documentElement.classList.add('force-motion');
  const qa = params.has('testTime');
  const paperMotion = !reduced && (!qa||params.has('animateLetter'));
  const duration = reduced && !qa ? 6 : 16;
  const clamp = (v, a=0, b=1) => Math.min(b, Math.max(a, v));
  const mix = (a,b,t) => a+(b-a)*t;
  const smooth = t => (t=clamp(t), t*t*(3-2*t));
  let elapsed = 0, startedAt = 0, running = false, final = false, finalAt = 0;
  let raf = 0, ready = false, opening = false, openTimer = 0, deliveryTimer = 0, closingTimer = 0, closing = false;
  const art = [];
  let finaleOrigins=[];
  let envelopeOpenedAt=0;
  const finaleCanvas=document.createElement('canvas');finaleCanvas.className='finale-trails';finaleCanvas.setAttribute('aria-hidden','true');experience.appendChild(finaleCanvas);
  const finaleCtx=finaleCanvas.getContext('2d');
  const letterScene=$('letterScene');
  const paper=document.querySelector('.letter-shell');
  const reading=document.querySelector('.letter');
  letterScene.dataset.stage='closed';
  function refreshLetterScroll() {
    paper.classList.toggle('has-more',reading.scrollHeight-reading.clientHeight-reading.scrollTop>5);
  }
  function setPaperOrigin() {
    if(!paper.getBoundingClientRect)return;
    const from=$('envelopePaper').getBoundingClientRect(),to=paper.getBoundingClientRect();
    if(!from.width||!from.height||!to.width||!to.height)return;
    const origin=window.EnvelopeMotion.origin(from,to);
    paper.style.setProperty('--paper-from-x',origin.x.toFixed(3)+'px');paper.style.setProperty('--paper-from-y',origin.y.toFixed(3)+'px');
    paper.style.setProperty('--paper-from-scale',String(origin.scale));
    paper.style.setProperty('--paper-from-clip',`inset(${origin.insetY.toFixed(6)}% ${origin.insetX.toFixed(6)}% round 2px)`);
  }
  function updateEnvelope(seconds){
    const pose=window.EnvelopeMotion.sample(seconds);
    $('envelopeFlapPath').setAttribute('d',pose.path);
    $('envelopeFlap').style.zIndex=pose.behind?'1':'4';
    $('envelopePaper').style.transform=`translateY(${pose.lift*100}%)`;
    $('envelopePaper').style.opacity=String(pose.paperOpacity);
  }
  function settlePaper() {
    clearTimeout(deliveryTimer);deliveryTimer=0;
    if(closing||!letterScene.classList.contains('open'))return;
    letterScene.classList.remove('delivering');letterScene.dataset.stage='reading';
    experience.classList.add('letter-delivered');
    refreshLetterScroll();
  }
  reading.addEventListener('scroll',refreshLetterScroll,{passive:true});
  window.flightAudit = { assets: [], ready: false, reducedMotion:reduced, duration };
  const trail=document.createElement('canvas');trail.className='flight-trail';
  trail.setAttribute('aria-hidden','true');$('flight').prepend(trail);
  const trailCtx=trail.getContext('2d');
  let trailPoints=[],lastTrailAt=-1,trailWidth=0,trailHeight=0;

  function drawTrail(seconds,positions,w,h) {
    if(trailWidth!==w||trailHeight!==h) {
      trail.width=Math.round(w);trail.height=Math.round(h);
      trailWidth=w;trailHeight=h;trailPoints=[];
    }
    trailCtx.clearRect(0,0,w,h);
    if(reduced||final||opening||$('letterScene').classList.contains('open'))return;
    if(seconds-lastTrailAt>.075) {
      positions.forEach((p,i)=>trailPoints.push({x:p.x+(i?1:-1)*p.size*.22,y:p.y+p.size*.14,t:seconds,side:i}));
      lastTrailAt=seconds;
    }
    trailPoints=trailPoints.filter(p=>seconds-p.t<1.7).slice(-48);
    for(const p of trailPoints) {
      const age=seconds-p.t,alpha=(1-age/1.7)*.32*smooth(seconds);
      trailCtx.fillStyle=p.side?`rgba(225,219,255,${alpha})`:`rgba(107,202,255,${alpha})`;
      trailCtx.beginPath();trailCtx.arc(p.x+(p.side?1:-1)*age*10,p.y+age*7,1.2+(1-age/1.7),0,Math.PI*2);trailCtx.fill();
    }
  }

  // Continuous paths: adjoining phases share their endpoint and zero velocity.
  const keys = [
    {t:0, x:[.22,.78], y:[.66,.29], s:.80, r:[-7,7]},
    {t:4, x:[.25,.75], y:[.57,.35], s:1, r:[-3,3]},
    {t:8, x:[.26,.74], y:[.38,.51], s:.94, r:[4,-4]},
    {t:12, x:[.25,.75], y:[.46,.46], s:1, r:[0,0]},
    {t:16, x:[.25,.75], y:[.46,.46], s:1, r:[0,0]}
  ];

  async function loadArt(index) {
    const refs=await window.referenceReady;
    const frames=refs.frames[index];
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=768;
    canvas.className='dragon-art';canvas.setAttribute('aria-hidden','true');
    dragons[index].replaceChildren(canvas);
    window.flightAudit.assets.push({character:index,frames:frames.length,source:'user reference atlas'});
    if(index===0) {
      const finalCanvas=refs.pair;finalCanvas.id='finalPair';finalCanvas.className='final-pair-display';
      finalCanvas.setAttribute('role','img');finalCanvas.setAttribute('aria-label','Ambos dragones juntos');
      experience.appendChild(finalCanvas);
      const paper=document.createElement('span');paper.className='envelope-paper';paper.id='envelopePaper';
      const pocket=document.createElement('span');pocket.className='envelope-pocket';
      const flap=document.createElement('span');flap.className='envelope-flap';flap.id='envelopeFlap';
      flap.innerHTML='<svg viewBox="0 0 215 120" aria-hidden="true"><defs><linearGradient id="flapPaper" x2="0" y2="1"><stop stop-color="#e7caaa"/><stop offset="1" stop-color="#d4b08b"/></linearGradient></defs><path id="envelopeFlapPath" d="M15 11L200 0L108 65Z" fill="url(#flapPaper)" stroke="#ad8968" stroke-width=".7"/></svg>';
      const invitation=document.createElement('span');invitation.className='envelope-invitation';invitation.setAttribute('aria-hidden','true');
      invitation.innerHTML='<span>Ábreme</span><svg viewBox="0 0 40 24"><path d="M7 3c17-5 29 4 16 15m-7-3 7 4 4-7"/></svg>';
      const front=refs.envelope.cloneNode();front.className='envelope-cutout-front';
      const seal=refs.envelope.cloneNode();seal.className='envelope-wax';
      refs.envelope.className='envelope-base';
      $('envelope').replaceChildren(refs.envelope,pocket,paper,front,seal,flap,invitation);
    }
    return {frames,canvas,ctx:canvas.getContext('2d'),last:-1,side:index,drawnAt:-1};
  }
  function drawPose(item,seconds,offset=0) {
    if($('letterScene').classList.contains('open'))return;
    const explicit=params.has('pose');
    const frame=explicit?Math.round(clamp(Number(params.get('pose'))||0,0,item.frames.length-1)):0;
    const still=reduced&&!params.has('forceMotion');
    if((explicit||still)&&item.last===frame)return;
    if(!qa&&seconds-item.drawnAt<1/30)return;
    const ctx=item.ctx,source=item.frames[frame];
    ctx.clearRect(0,0,768,768);
    // Each column shares its body/wing boundary. Head and tail movement are
    // smooth deformations of the complete original, never detached cutouts.
    if(explicit||still)ctx.drawImage(source,0,0);
    else {
      const phase=params.has('wingPhase')?Number(params.get('wingPhase'))||0:(seconds+offset)*.82;
      const wave=(1-Math.cos(phase*Math.PI*2))*.5;
      const glide=1-.45*smooth((seconds/duration-.60)/.20);
      const root=item.side===0?440:455;
      const finalTime=final?(qa?Math.max(0,Number(params.get('finalTime'))||0):seconds-finalAt):-1;
      const acting=window.DragonActing.sample(seconds,item.side,finalTime);
      const amplitude=(-22+wave*(item.side===0?280:245))*glide*acting.wingGain;
      for(let x=0;x<768;x+=8){
        const influence=smooth((548-x)/365);
        const shift=amplitude*influence;
        const head=acting.head*smooth((x-490)/200),tail=acting.tail*smooth((460-x)/275);
        ctx.drawImage(source,x,0,8,root,x,shift+head,8,root-shift);
        ctx.drawImage(source,x,root,8,768-root,x,root+head,8,768-root+tail);
      }
      const blink=qa&&params.has('blink')?clamp(Number(params.get('blink'))):acting.blink;
      if(blink>.025){
        const eye=item.side?{x:638,y:425,rx:23,ry:20,color:'#d2d8f3'}:{x:649,y:431,rx:32,ry:25,color:'#263144'};
        const ey=eye.y+acting.head*smooth((eye.x-490)/200);
        ctx.save();ctx.beginPath();ctx.ellipse(eye.x,ey,eye.rx,eye.ry,0,0,Math.PI*2);ctx.clip();ctx.fillStyle=eye.color;
        ctx.fillRect(eye.x-eye.rx,ey-eye.ry,eye.rx*2,eye.ry*blink);
        ctx.fillRect(eye.x-eye.rx,ey+eye.ry*(1-blink),eye.rx*2,eye.ry*blink);
        if(blink>.65){
          ctx.beginPath();ctx.moveTo(eye.x-eye.rx*.82,ey);
          ctx.quadraticCurveTo(eye.x,ey+6,eye.x+eye.rx*.82,ey-1);
          ctx.strokeStyle=item.side?'#7b83ac':'#111824';ctx.lineWidth=2.6;ctx.globalAlpha=smooth((blink-.65)/.35);ctx.stroke();
        }
        ctx.restore();
      }
      item.canvas.dataset.head=acting.head.toFixed(3);item.canvas.dataset.tail=acting.tail.toFixed(3);item.canvas.dataset.blink=blink.toFixed(3);
    }
    item.last=frame;item.drawnAt=seconds;
    item.canvas.dataset.wing=String(Math.round(((1-Math.cos((params.has('wingPhase')?Number(params.get('wingPhase'))||0:(seconds+offset)*.82)*Math.PI*2))*.5)*1000));
  }

  function sample(seconds, side) {
    const t=clamp(seconds/duration)*16;
    let i=0;
    while(i<keys.length-2 && t>keys[i+1].t) i++;
    const a=keys[i], b=keys[i+1];
    const u=smooth((t-a.t)/(b.t-a.t));
    return {x:mix(a.x[side],b.x[side],u), y:mix(a.y[side],b.y[side],u),
      scale:mix(a.s,b.s,u), angle:mix(a.r[side],b.r[side],u)};
  }

  function render(seconds) {
    elapsed=seconds;
    const w=experience.clientWidth, h=experience.clientHeight;
    const mobile=w<650;
    const base=Math.min(w*(mobile?.42:.34),h*.49,480);
    const progress=clamp(seconds/duration);
    const margin=Math.max(12,Math.min(w,h)*.035);
    const positions=[];
    dragons.forEach((node,i)=>{
      const state=sample(seconds,i);
      let size=base*state.scale, angle=state.angle;
      let x=(mobile?state.x:.5+(state.x-.5)*.82)*w, y=state.y*h;
      if(final) {
        const at=qa?Math.max(0,Number(params.get('finalTime'))||0):seconds-finalAt;
        const o=finaleOrigins[i]||{x:x/w,y:y/h,size:size/w};
        const pose=window.Finale.sample(at,i,w,h,{x:o.x*w,y:o.y*h,size:o.size*w});
        ({x,y,size,angle}=pose);art[i].canvas.style.transform=`scaleX(${pose.face})`;
        node.style.setProperty('--final-opacity',reduced?'0':String(pose.opacity));
        experience.dataset.finaleStage=reduced?'settled':pose.stage;
      }
      // Bounding the rotated square keeps every pose and wing tip inside the viewport.
      const rad=Math.abs(angle)*Math.PI/180;
      const half=size*(Math.cos(rad)+Math.sin(rad))/2;
      x=clamp(x,half+margin,w-half-margin);
      const sharedBob=mix(i,0,smooth((progress-.55)/.2));
      y=clamp(y+(final?0:Math.sin(seconds*1.2+sharedBob)*h*.003),half+margin,h-half-margin);
      positions.push({x,y,size});
      node.style.width=`${size}px`;node.style.height=`${size}px`;
      node.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%) rotate(${angle}deg)`;
      node.style.opacity=String(smooth(seconds/.9));drawPose(art[i],seconds,i*.12);
      node.dataset.pose=String(art[i].last);
    });
    drawTrail(seconds,positions,w,h);
    if(!final)finaleOrigins=positions.map(p=>({x:p.x/w,y:p.y/h,size:p.size/w}));
    if(final){
      if(finaleCanvas.width!==w||finaleCanvas.height!==h){finaleCanvas.width=w;finaleCanvas.height=h;}
      const at=qa?Math.max(0,Number(params.get('finalTime'))||0):seconds-finalAt;
      window.Finale.draw(finaleCtx,at,w,h,reduced);
      const message=$('finalMessage'),m=window.Finale.message(at,w,h,reduced);
      if(message.hidden===m.show)message.hidden=!m.show;
      message.style.setProperty('--message-top',m.top+'px');message.style.setProperty('--message-width',m.width+'px');
      message.style.setProperty('--message-name-size',m.nameSize+'px');message.style.setProperty('--message-label-size',m.labelSize+'px');
      message.style.setProperty('--message-label',String(m.label));message.style.setProperty('--message-name',String(m.name));message.style.setProperty('--message-flourish',String(m.flourish));
    }
    const heart=$('heart');
    const finalHeartTop=Math.max(h*.12,h*.86-Math.min(w*.76,420)*111/240-28)/h*100;
    heart.style.top=`${final?mix(43,finalHeartTop,qa || reduced ? 1 : smooth((seconds-finalAt)/1.6)):43}%`;
    heart.style.setProperty('--heart-opacity',final?(reduced?'1':'0'):smooth((progress-.68)/.16));
    heart.style.setProperty('--heart-scale',1+Math.sin(seconds*3.5)*.045);
    const envelope=$('envelope');
    envelope.style.setProperty('--envelope-opacity',final?'0':smooth((progress-.82)/.16));
    envelope.classList.toggle('ready',progress>=.98 && !final && !opening && !$('letterScene').classList.contains('open'));envelope.disabled=progress<.98 || final || opening || $('letterScene').classList.contains('open');
    if(opening)updateEnvelope(seconds-envelopeOpenedAt);
  }

  function tick(now) {
    render((now-startedAt)/1000);
    if(final&&(reduced||elapsed-finalAt>window.Finale.duration+.2))running=false;
    if(running) raf=requestAnimationFrame(tick);
  }
  function start() {
    if(!ready || experience.classList.contains('started')) return;
    experience.classList.add('started');$('intro').inert=true;
    if(!qa)window.flightMusic?.start();
    $('intro').setAttribute('aria-hidden','true');$('flight').setAttribute('aria-hidden','false');
    startedAt=performance.now();
    if(qa) render(Math.max(0,Number(params.get('testTime'))||0));
    else {running=true;raf=requestAnimationFrame(tick);}
  }
  function openLetter() {
    if($('envelope').disabled||opening||final) return;
    const before=$('envelope').getBoundingClientRect?.();
    if(typeof getComputedStyle==='function')$('envelope').style.translate=getComputedStyle($('envelope')).translate;
    envelopeOpenedAt=elapsed;
    opening=true;$('envelope').disabled=true;experience.classList.add('opening-envelope');
    updateEnvelope(0);
    window.flightMusic?.setScene('letter');
    $('envelope').classList.remove('ready');
    if(before){
      $('envelope').style.translate='none';
      const base=$('envelope').getBoundingClientRect();
      $('envelope').style.translate=`0px ${(before.top-base.top).toFixed(4)}px`;
      $('envelope').dataset.openingShift=($('envelope').getBoundingClientRect().top-before.top).toFixed(4);
    }
    const reveal=()=>{
      updateEnvelope(1.15);
      openTimer=0;opening=false;experience.classList.remove('opening-envelope');experience.classList.add('letter-open');
      $('letterScene').classList.add('open');$('letterScene').setAttribute('aria-hidden','false');
      $('letterScene').inert=false;$('flight').inert=true;$('closeLetter').focus({preventScroll:true});
      window.flightMusic?.setDialog(true);
      reading.scrollTop=0;refreshLetterScroll();
      if(paperMotion||params.has('letterFrame')) {
        setPaperOrigin();letterScene.classList.add('delivering');letterScene.dataset.stage='delivering';
        if(qa&&!paperMotion){const frame=String(clamp(Number(params.get('letterFrame'))||0,0,2.05));letterScene.style.setProperty('--letter-at',frame);experience.style.setProperty('--letter-at',frame);}
        else deliveryTimer=setTimeout(settlePaper,2080);
      }else {letterScene.dataset.stage='reading';experience.classList.add('letter-delivered');}
    };
    if(qa||reduced)reveal();else openTimer=setTimeout(reveal,1150);
  }
  function finish() {
    if(final||closing)return;
    if(letterScene.classList.contains('open')&&paperMotion) {
      clearTimeout(deliveryTimer);deliveryTimer=0;closing=true;
      const interrupted=letterScene.classList.contains('delivering');
      if(interrupted)letterScene.classList.add('interrupted-delivery');
      if(typeof getComputedStyle==='function') {
        const current=getComputedStyle(paper);
        paper.style.setProperty('--return-transform',current.transform);
        paper.style.setProperty('--return-clip',current.clipPath==='none'?'inset(0 round 5px)':current.clipPath);
        paper.style.setProperty('--return-opacity',current.opacity);
      }
      letterScene.classList.add('closing-letter');letterScene.dataset.stage='closing';
      closingTimer=setTimeout(completeFinish,interrupted?400:700);return;
    }
    completeFinish();
  }
  function completeFinish() {
    clearTimeout(deliveryTimer);clearTimeout(closingTimer);deliveryTimer=closingTimer=0;closing=false;
    letterScene.classList.remove('delivering','closing-letter','interrupted-delivery');letterScene.dataset.stage='closed';
    clearTimeout(openTimer);opening=false;
    experience.classList.remove('letter-open','opening-envelope','letter-delivered');
    final=true;finalAt=elapsed;$('letterScene').classList.remove('open');$('letterScene').setAttribute('aria-hidden','true');
    window.flightMusic?.setScene('final');
    window.flightMusic?.setDialog(false);
    $('letterScene').inert=true;$('flight').inert=true;$('flight').setAttribute('aria-hidden','true');$('closeLetter').blur();
    experience.classList.add('final');render(elapsed);
    if(!qa&&!reduced&&!running){running=true;startedAt=performance.now()-elapsed*1000;raf=requestAnimationFrame(tick);}
  }

  $('startButton').disabled=true;$('envelope').disabled=true;$('letterScene').inert=true;$('finalMessage').hidden=true;
  $('startButton').addEventListener('click',start);$('envelope').addEventListener('click',openLetter);
  $('closeLetter').addEventListener('click',finish);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && $('letterScene').classList.contains('open')) finish();
    if(e.key==='Tab' && $('letterScene').classList.contains('open')) {
      e.preventDefault();
      const focusables=[$('closeLetter'),document.querySelector('.letter')];
      if($('musicButton')&&!$('musicButton').hidden)focusables.push($('musicButton'));
      const current=focusables.indexOf(document.activeElement);
      focusables[(current+(e.shiftKey?-1:1)+focusables.length)%focusables.length].focus({preventScroll:true});
    }
  });
  window.addEventListener('resize',()=>{
    if(ready && experience.classList.contains('started'))render(elapsed);
    if(closing){completeFinish();return;}
    if(letterScene.classList.contains('open')&&!closing){settlePaper();setPaperOrigin();refreshLetterScroll();}
  });
  document.addEventListener('visibilitychange',()=>{
    if(!qa && experience.classList.contains('started')) {
      running=!document.hidden;cancelAnimationFrame(raf);
      if(running) {startedAt=performance.now()-elapsed*1000;raf=requestAnimationFrame(tick);}
    }
  });
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);running=false;});
  window.addEventListener('pageshow',e=>{
    if(e.persisted&&!qa&&ready&&experience.classList.contains('started')) {
      cancelAnimationFrame(raf);startedAt=performance.now()-elapsed*1000;running=true;raf=requestAnimationFrame(tick);
    }
  });
  let seed=94821;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  for(let i=0;i<92;i++) {
    const star=document.createElement('i');star.className='star';
    star.style.cssText=`left:${random()*100}%;top:${random()*72}%;--size:${.7+random()*2.1}px;--alpha:${.28+random()*.7};--duration:${1.6+random()*3.7}s;--delay:${-random()*4}s`;
    $('stars').appendChild(star);
  }
  if(params.has('qa')) document.documentElement.classList.add('qa-mode');
  Promise.all([Promise.all([0,1].map(index=>loadArt(index))),document.fonts?document.fonts.ready:Promise.resolve()])
    .then(([items])=>{
      art.push(...items);ready=true;window.flightAudit.ready=true;$('startButton').disabled=false;
      window.flightAudit.fonts=document.fonts?{body:document.fonts.check('400 16px "Lora Letter"'),signature:document.fonts.check('700 32px "Caveat Signature"')}:{fallback:true};
      const audit=document.createElement('script');audit.type='application/json';audit.id='assetAudit';
      audit.textContent=JSON.stringify(window.flightAudit);document.body.appendChild(audit);
      if(qa) {
        start();if(params.has('openLetter')) openLetter();if(params.has('final')) finish();
        if(params.has('previewOpening')) {
          experience.classList.add('opening-envelope');
          experience.style.setProperty('--opening-at',String(clamp(Number(params.get('previewOpening'))||.5,0,1.1)));
          updateEnvelope(clamp(Number(params.get('previewOpening'))||0,0,1.15));
          $('envelope').classList.remove('ready');$('envelope').disabled=true;
        }
        if(params.has('closingFrame')&&letterScene.classList.contains('open')) {
          setPaperOrigin();letterScene.classList.add('closing-letter');letterScene.dataset.stage='closing';
          letterScene.style.setProperty('--closing-at',String(clamp(Number(params.get('closingFrame'))||0,0,.7)));
        }
      }
    }).catch(error=>{
      window.flightAudit.error=error.message;console.error(error);$('startButton').disabled=false;
      $('startButton').querySelector('span').textContent='Volver a cargar';$('startButton').onclick=()=>location.reload();
    });
})();
