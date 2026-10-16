/* Original score playback: no autoplay, network streaming, or third-party embeds. */
(() => {
  'use strict';
  const button=document.getElementById('musicButton');
  const params=new URLSearchParams(location.search);
  const state={started:false,muted:false,scene:'flight',status:'idle',backend:'none'};
  let context,gain,master,source,buffer,decoding,starting,fallback,wasPlaying=false,analyser;
  // Source peak measured at -4.9 dBFS: +3.23 dB preserves >1.6 dB headroom.
  // The original MP3 stays byte-for-byte unchanged.
  const levels={flight:1,letter:.82,final:.95};
  const target=()=>state.muted?0:levels[state.scene];
  function publish() {
    const unavailable=state.status==='error';
    const label=unavailable?'Reintentar música':state.muted?'Activar música':'Silenciar música';
    button.setAttribute('aria-label',label);button.title=label;
    button.setAttribute('aria-pressed',String(state.muted));
    button.dataset.status=state.status;button.dataset.scene=state.scene;
    button.dataset.backend=state.backend;button.dataset.level=String(target());
    button.dataset.context=context?.state||'none';button.dataset.duration=String(buffer?.duration||0);
  }
  function setVolume(seconds=1.2) {
    if(gain&&context) {
      const now=context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value,now);
      gain.gain.linearRampToValueAtTime(target(),now+seconds);
    }
    if(fallback){fallback.muted=state.muted;fallback.volume=target();}
    publish();
  }
  async function decode() {
    if(buffer)return buffer;
    if(!decoding)decoding=(async()=>{
      const binary=atob(window.ORIGINAL_SCORE_BASE64),bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      buffer=await context.decodeAudioData(bytes.buffer);return buffer;
    })().catch(error=>{decoding=null;throw error;});
    return decoding;
  }
  function start() {
    if(starting)return starting;
    state.started=true;button.hidden=false;state.status='loading';publish();
    const AudioContextType=window.AudioContext||window.webkitAudioContext;
    // resume() is invoked synchronously inside the user's click, before decoding.
    if(AudioContextType&&window.ORIGINAL_SCORE_BASE64) {
      try {
        if(!context||context.state==='closed') {
          context=new AudioContextType();gain=context.createGain();gain.gain.value=0;
          master=context.createGain();master.gain.value=1.45;master.connect(gain);
          if(params.has('audioAudit')) {
            analyser=context.createAnalyser();analyser.fftSize=1024;gain.connect(analyser);analyser.connect(context.destination);
            const samples=new Float32Array(1024);
            setInterval(()=>{
              analyser.getFloatTimeDomainData(samples);
              button.dataset.rms=String(Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length));
              button.dataset.audioTime=String(context.currentTime);
            },250);
          }else gain.connect(context.destination);
        }
        const resumed=context.resume();
        starting=Promise.all([resumed,decode()]).then(()=>{
          if(!source) {
            source=context.createBufferSource();source.buffer=buffer;source.loop=true;
            source.connect(master);source.start(0);
          }
          state.backend='webaudio';state.status='playing';setVolume(1.8);
        }).catch(()=>{state.status='error';publish();}).finally(()=>{starting=null;});
      }catch(error){state.status='error';publish();}
    }else {
      try {
        if(!fallback){fallback=new Audio('assets/un-vuelo-contigo.mp3');fallback.loop=true;fallback.preload='auto';
          fallback.addEventListener('error',()=>{state.status='error';publish();});}
        state.backend='htmlaudio';fallback.volume=target();fallback.muted=state.muted;
        starting=Promise.resolve(fallback.play()).then(()=>{state.status='playing';publish();})
          .catch(()=>{state.status='error';publish();}).finally(()=>{starting=null;});
      }catch(error){state.status='error';publish();}
    }
    return starting;
  }
  button.addEventListener('click',()=>{
    if(state.status==='error'||!state.started){start();return;}
    state.muted=!state.muted;setVolume(.18);
    if(!state.muted&&context?.state==='suspended')context.resume().catch(()=>{state.status='error';publish();});
  });
  function pauseHidden() {
    if(!state.started)return;
    if(context?.state==='running')context.suspend().catch(()=>{});
    if(fallback&&!fallback.paused){wasPlaying=true;fallback.pause();}
  }
  function resumeVisible() {
    if(!state.started||state.status==='error')return;
    if(context?.state==='suspended')context.resume().catch(()=>{state.status='error';publish();});
    if(fallback&&wasPlaying){wasPlaying=false;fallback.play().catch(()=>{state.status='error';publish();});}
  }
  document.addEventListener('visibilitychange',()=>document.hidden?pauseHidden():resumeVisible());
  window.addEventListener('pagehide',pauseHidden);
  window.addEventListener('pageshow',e=>{if(e.persisted)resumeVisible();});
  window.flightMusic={start,setScene(scene){if(Object.hasOwn(levels,scene)){state.scene=scene;setVolume();}},
    setDialog(open){document.querySelector(open?'.letter-shell':'#experience').appendChild(button);}};
  // QA pages stay silent until a genuine button click.
  if(params.has('testTime'))button.hidden=true;
  publish();
})();
