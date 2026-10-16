/* Prepared cutouts from the user's supplied 2D reference sheet. */
(() => {
  async function load(name) {
    const image=new Image();image.src=`assets/${name}.png`;image.alt='';
    await image.decode();return image;
  }
  window.referenceReady=(async()=>{
    const [dark,white,pair,envelope]=await Promise.all([
      Promise.all([0].map(i=>load(`dark-flight-${i}`))),
      Promise.all([0].map(i=>load(`white-flight-${i}`))),
      load('together'),load('envelope'),load('archipielago-nordico-v10')
    ]);
    return {frames:[dark,white],pair,envelope};
  })();
})();
