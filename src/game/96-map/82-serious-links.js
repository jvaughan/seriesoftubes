/* Serious Tubes, links (the land is 32-serious-map.js, cities 81-serious-cities.js). Thin lines whose width still grows
   with capacity, the same colours for load and state, and the packets running along them, a little slower. The palette (MAPC) turns off the
   dark casing, draws cut and unfinished links with the plain markers, and keeps capacity labels for closer zooms. */
const slLook0=linkLook;
function slLinkLook(grp,day){const L=slLook0(grp,day),many=grp.length>1;
  L.w0=L.vx?1.2:(1.6+Math.max(...grp.map(tierW))*1.0+(many?Math.min(0.9,(grp.length-1)*0.3):0));return L;}
// The link being dragged out is drawn in your colour too (DRAG_PINK is read when it draws).
if(pref('serious')){linkLook=slLinkLook;PK_RATE=0.6;const c=glColor('#2F6DB5');for(let i=0;i<4;i++)DRAG_PINK[i]=c[i];}
