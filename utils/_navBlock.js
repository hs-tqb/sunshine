let navBlockTimer  = -1;
let navBlockDelay  = 700;
let isNavigating   = false;

module.exports = function({url,type, complete}) {
  if ( isNavigating ) return;
  isNavigating = true;
  wx[type||'navigateTo']({
    url: url,
    complete:()=>{
      clearTimeout( navBlockTimer );
      navBlockTimer = setTimeout(e=>{
        isNavigating = false;
        (typeof complete === 'function') && complete();
      }, navBlockDelay);
    }
  });
}