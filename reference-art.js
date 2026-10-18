/* Prepared cutouts from the user's supplied 2D reference sheet. */
(() => {
  async function load(name) {
    const image=new Image();image.src=`assets/${/\.(?:svg|webp)$/.test(name)?name:name+'.png'}`;image.alt='';
    await image.decode();return image;
  }
  window.referenceReady=(async()=>{
    const [dark,white,pair,envelope]=await Promise.all([
      Promise.all([0].map(i=>load(`dark-flight-${i}`))),
      Promise.all([0].map(i=>load(`white-flight-${i}`))),
      load('together'),load('envelope-cami.svg'),
      load(matchMedia('(max-width:700px) and (orientation:portrait)').matches?'berk-mobile-v17.webp':'berk-desktop-v17.webp'),
      load('gerberas-v17.webp'),load('paper-v17.webp')
    ]);
    return {frames:[dark,white],pair,envelope};
  })();
})();
