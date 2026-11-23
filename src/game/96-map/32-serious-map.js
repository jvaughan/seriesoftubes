/* Serious Tubes (Settings, off by default, local fork), the map: an atlas look in place of the cartoon. Muted sea and land, a
   hairline coast, no waves, hills, clouds, sand band or drop shadow, on both maps (2D and the card). The land is cached
   at load, so this is applied once at load and switching reloads the page. */
const SM_NONE='rgba(0,0,0,0)';
const SERIOUS_PAL={
  light:{k:'sl',sea0:'#D9E3EB',sea1:'#CBD7E1',wave:SM_NONE,cloud:SM_NONE,shadow:SM_NONE,sand:SM_NONE,sandW:0,grass:'#F3F1EB',hill:SM_NONE,shine:SM_NONE,bar:'#CBD7E1',edge:'#8C99A8',edgeW:1,lcaseW:0,flat:true,lblZ:1.8,cabA:0.22},
  dark:{k:'sd',sea0:'#101923',sea1:'#0C141D',wave:SM_NONE,cloud:SM_NONE,shadow:SM_NONE,sand:SM_NONE,sandW:0,grass:'#2A3542',hill:SM_NONE,shine:SM_NONE,bar:'#0C141D',edge:'#5A6B7E',edgeW:1,lcaseW:0,flat:true,lblZ:1.8,cabA:0.22}};
// MAPC already points at one of these objects, so they are changed in place.
function seriousMap(){Object.assign(MAP_PAL.light,SERIOUS_PAL.light);Object.assign(MAP_PAL.dark,SERIOUS_PAL.dark);WAVES.length=0;HILLS.length=0;CLOUDS.length=0;}
if(pref('serious')){seriousMap();document.documentElement.classList.add('serious');}
