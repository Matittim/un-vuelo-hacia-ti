/* One shared 2D timeline. The flap's two hinge vertices never move. */
(() => {
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const ease=t=>(t=clamp(t),t*t*(3-2*t));
  window.EnvelopeMotion={
    sample(seconds){
      const fold=ease(seconds/.62),tipX=108-4*fold,tipY=65-117*fold;
      return {path:`M15 11L200 0L${tipX.toFixed(3)} ${tipY.toFixed(3)}Z`,
        behind:tipY<5,lift:-.38*ease((seconds-.22)/.8),paperOpacity:ease((seconds-.18)/.12)};
    },
    origin(from,to){
      const scale=Math.max(from.width/to.width,from.height/to.height);
      return {x:from.left+from.width/2-to.left-to.width/2,y:from.top+from.height/2-to.top-to.height/2,scale,
        insetX:clamp((1-from.width/(to.width*scale))*50,0,49),insetY:clamp((1-from.height/(to.height*scale))*50,0,49)};
    }
  };
})();
