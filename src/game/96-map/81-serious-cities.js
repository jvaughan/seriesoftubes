/* Serious Tubes, cities and labels (the land is 32-serious-map.js). When the setting is on, a few of the map's drawing
   functions are swapped for plain ones: a dot per city sized by its tier, a flat square for your POP with its router's
   port speed beside it (a second one behind it for more routers, with the count over it, a small linked one for the
   second building, a G tag for a backup generator), text labels with a halo instead of
   pills. What the game says with them stays: the IX hexagon, incidents, hot badges, offer bubbles, rings, glow.
   The cartoon functions are left as they are; this only reassigns them, once, at load. */
// Your network's colour on the serious map: deep blue (the cartoon map's pink is the game's own).
const SC_ME='#2F6DB5',SC_ME2='#1F4F8A';
const SC_FONT='system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
const SC_R=[2.6,3.2,3.9,4.7,5.6]; // a city's dot by tier (cTier 0 to 4)
const SC_FAR=[2.2,2.6,3.1,3.7,4.4];
const scDark=()=>MAPC.k==='sd';
const scEdge=()=>scDark()?'#0B121A':'#2B3744';
// Labels: text with a halo, painted once per text and look and kept as a sprite, as pill() does. Keys are kept by text.
const SC_K=new Map();
function scTag(t,big,mine,x,y){const dk=scDark(),id=(big?1:0)|(mine?2:0)|(dk?4:0);let L=SC_K.get(t);if(!L){if(SC_K.size>4000)SC_K.clear();SC_K.set(t,L=[]);}
  let m=L[id];if(!m){const font=`${mine?700:600} ${big?12.5:11.5}px ${SC_FONT}`;ctx.save();ctx.font=font;const w=ctx.measureText(t).width;ctx.restore();
    L[id]=m={font,w,ink:mine?(dk?'#8DB8F0':'#1F5A9E'):(dk?'#DCE4EC':'#25313D'),halo:dk?'rgba(12,20,29,.92)':'rgba(255,255,255,.95)',k:'sctag|'+id+'|'+t};}
  const W=Math.ceil(m.w+8),H=18;
  const e=spriteHas(m.k)||spriteEntry(m.k,W,H,W/2,H/2,g=>{g.translate(W/2,H/2);g.font=m.font;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
    g.lineWidth=4.2;g.strokeStyle=m.halo;g.strokeText(t,0,0.5);g.fillStyle=m.ink;g.fillText(t,0,0.5);});
  blit(e,Math.round((x-e.w/2)*DPR)/DPR,Math.round((y-e.h/2)*DPR)/DPR,e.w,e.h);}
// The IX hexagon, smaller and next to the dot.
function scIX(C,p,t,hot,now){const mine=!!S.myIx[C.id],joined=hasIxAt(C.id),Rr=7,x=p?29:SC_R[t]+7.5,y=-8;
  ctx.fillStyle=hot?(Math.sin(now/180)>0?'#FF4D5E':'#FF8A3D'):mine?SC_ME:joined?'#F2B705':(scDark()?'#C9D3DD':'#FFFFFF');
  ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i+Math.PI/6;ctx.lineTo(x+Rr*Math.cos(a),y+Rr*Math.sin(a));}ctx.closePath();ctx.fill();ctx.lineWidth=1.1;ctx.strokeStyle=scEdge();ctx.stroke();
  ctx.fillStyle=mine||hot?'#fff':'#25313D';ctx.font=`700 7px ${SC_FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('IX',x,y+0.4);}
// What does not move, in the city's frame: rings, the marker, the IX, an incident.
function scCityStatic(C,p,t,cs,k,ph,st){const down=st.down,edge=scEdge();
  if(st.feed){ctx.strokeStyle='#FF8A3D';ctx.lineWidth=2.5;ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(0,0,22*k,0,7);ctx.stroke();ctx.setLineDash([]);}
  if(st.sel){ctx.strokeStyle=SC_ME;ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.lineDashOffset=-ph.sel;ctx.beginPath();ctx.arc(0,0,17*k,0,7);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;}
  if(ph.dd>=0){ctx.strokeStyle='#FF4D5E';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.lineDashOffset=ph.dd;ctx.beginPath();ctx.arc(0,0,20*k,0,7);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;}
  ctx.scale(k*cs,k*cs);ctx.strokeStyle=edge;
  if(!p){const r=SC_R[t];
    if(t===4){ctx.lineWidth=0.9;ctx.beginPath();ctx.arc(0,0,r+2.6,0,7);ctx.stroke();}
    ctx.fillStyle=hasIxAt(C.id)?'#F2B705':(scDark()?'#C9D3DD':'#FFFFFF');ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.stroke();}
  else{const col=down?'#8A91A8':SC_ME;
    if(p.site2){const dB=siteDown(C.id,'b'),cut=p.ringcut>S.day;ctx.lineWidth=1.2;ctx.setLineDash(cut?[2,3]:[]);ctx.strokeStyle=cut?'#FF4D5E':edge;
      ctx.beginPath();ctx.moveTo(6,3.5);ctx.lineTo(10.5,3.5);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle=edge;ctx.fillStyle=dB?'#8A91A8':col;ctx.lineWidth=1.3;ctx.fillRect(10.5,-1,9,9);ctx.strokeRect(10.5,-1,9,9);}
    ctx.lineWidth=1.3;
    if((p.routers||1)>=2){ctx.fillStyle=down?'#6E7590':SC_ME2;ctx.fillRect(-3.5,-8.5,11,11);ctx.strokeRect(-3.5,-8.5,11,11);}
    ctx.fillStyle=col;ctx.fillRect(-6,-6,12,12);ctx.strokeRect(-6,-6,12,12);
    // To the left of the square: the router's port speed (what it can do, 100G up to 3.2T) and under it how many routers
    // there are, when more than one (the box behind says "more than one", this says how many).
    {const sp=RG[p.rgen||0].pn,ro=p.routers||1,cnt=ro>=2?'×'+ro:'',xr=-9,y1=cnt?-3.5:0.5,dk=scDark();
      ctx.font=`700 7px ${SC_FONT}`;      ctx.textAlign='right';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=2.4;ctx.strokeStyle=dk?'rgba(12,20,29,.9)':'rgba(255,255,255,.95)';ctx.fillStyle=dk?'#DCE4EC':'#25313D';
      ctx.strokeText(sp,xr,y1);ctx.fillText(sp,xr,y1);if(cnt){ctx.strokeText(cnt,xr,y1+8);ctx.fillText(cnt,xr,y1+8);}
      // A backup generator: a small G tag under the IX hexagon, right of the second building.
      if(p.gen){ctx.fillStyle=dk?'#C9D3DD':'#FFFFFF';ctx.lineWidth=1;ctx.strokeStyle=edge;ctx.fillRect(24.5,0.5,9,9);ctx.strokeRect(24.5,0.5,9,9);
        ctx.fillStyle='#25313D';ctx.font=`700 7px ${SC_FONT}`;ctx.textAlign='center';ctx.fillText('G',29,5);}
      ctx.strokeStyle=edge;}}
  if(st.ixDraw&&!st.ixHot)scIX(C,p,t,false,0);
  if(st.inc){const x=p?-13:-SC_R[t]-6,y=p?-12:-7;ctx.fillStyle='#FF4D5E';ctx.beginPath();ctx.arc(x,y,5,0,7);ctx.fill();ctx.lineWidth=1.2;ctx.strokeStyle=edge;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font=`800 8px ${SC_FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',x,y+0.4);}}
// Zoomed out: the same marks, smaller.
function scCityFarStatic(C,p,down,sel,hov,ph){const edge=scEdge();ctx.strokeStyle=edge;
  if(sel){ctx.strokeStyle=SC_ME;ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.lineDashOffset=-ph;ctx.beginPath();ctx.arc(0,0,p?11:8,0,7);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;ctx.strokeStyle=edge;}
  if(p){const col=down?'#8A91A8':SC_ME;ctx.lineWidth=1.2;
    if(p.site2){ctx.fillStyle=col;ctx.fillRect(6,3,5,5);ctx.strokeRect(6,3,5,5);}
    if((p.routers||1)>=2){ctx.fillStyle=down?'#6E7590':SC_ME2;ctx.fillRect(-2.5,-6.5,8,8);ctx.strokeRect(-2.5,-6.5,8,8);}
    ctx.fillStyle=col;ctx.fillRect(-4.5,-4.5,9,9);ctx.strokeRect(-4.5,-4.5,9,9);}
  else{const t=cTier(C.id),r=SC_FAR[t]*(hov?1.5:1);ctx.fillStyle=hasIxAt(C.id)?'#F2B705':(scDark()?'#C9D3DD':'#FFFFFF');ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.stroke();}
  if(CM.off.has(C.id)){ctx.fillStyle='#16A866';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p?7:5,p?-6:-5,2.6,0,7);ctx.fill();ctx.stroke();}
  if(CM.inc.has(C.id)){ctx.fillStyle='#FF4D5E';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p?-7:-5,p?-6:-5,2.8,0,7);ctx.fill();ctx.stroke();}}
// drawCity() with the plain marks: the same states, without the cartoon's random router lights or steam (a busy router
// still shows as the R hot badge, an under-served city as the red glow).
function scDrawCity(C,sx,sy,sc,now,lyOverride,dem){
  if(CM.far)return drawCityFar(C,sx,sy,sc,now,lyOverride);
  const hot=(UI.hotMap||{})[C.id];
  const p=S.pops[C.id],down=p&&p.down>S.day,sel=UI.sel&&UI.sel.type==='city'&&UI.sel.id===C.id,hov=UI.hover===C.id||(UI.snap&&UI.snap.id===C.id);
  if(dem&&!p&&!sel&&!hov){const rq=Math.round((2+cTier(C.id)*0.3)*sc*4)/4,fill=hasIxAt(C.id)?'#F2B705':(scDark()?'#C9D3DD':'#FFFFFF'),S2=Math.ceil(rq*2+4),key='scquiet|'+rq+'|'+fill;
    const e=spriteHas(key)||spriteEntry(key,S2,S2,S2/2,S2/2,g=>{g.translate(S2/2,S2/2);g.fillStyle=fill;g.strokeStyle=scEdge();g.lineWidth=1.1;g.beginPath();g.arc(0,0,rq,0,7);g.fill();g.stroke();});
    blit(e,sx-e.ax,sy-e.ay,e.w,e.h);return;}
  const t=cTier(C.id),cs=p?1:CSC[t],k=sc*(hov?1.4:1),kq=sprQ(k),K=k*cs;
  const ixn=ixName(C.id),ixDraw=!!ixn&&(ixShown(C.id,p)||(hot&&hot.ix)||sel||hov),ixHot=!!(ixDraw&&hot&&hot.ix);
  const st={down:!!down,feed:!!(UI.feed&&UI.feed.has(C.id)),sel:!!sel,inc:CM.inc.has(C.id),ixDraw,ixHot,off:CM.off.has(C.id),big:CM.big.has(C.id)};
  const ph=cityPhase(C,p,sel,now),spr=citySprite(C,p,t,cs,kq,ph,st),r=k/kq;
  if(ph.gl>=0)dot(sx,sy,16*k,'rgba(255,77,94,1)',.35+.25*(2*ph.gl/7-1));
  blit(spr,sx-spr.ax*r,sy-spr.ay*r,spr.w*r,spr.h*r);
  if(ixHot){const on=Math.sin(now/180)>0;stamp('scixhot'+(on?1:0),84,40,42,20,K,sx,sy,()=>{ctx.strokeStyle=scEdge();scIX(C,p,t,true,on?1:-1);},true);}
  if(hot&&p){let y=-6;const pulse=.75+.25*Math.sin(now/200);for(const kk of ['r','t','p','c']){if(!hot[kk])continue;const bx=sx-16*K,by=sy+y*K;dot(bx,by,5.5*K,'#FF4D5E',pulse);
    stamp('schotb|'+HOTL[kk],16,16,8,8,K,bx,by,g=>{g.lineWidth=1.2;g.strokeStyle=scEdge();g.beginPath();g.arc(0,0,5.5,0,7);g.stroke();g.fillStyle='#fff';g.font=`800 7px ${SC_FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(HOTL[kk],0,0.5);},true);y+=12;}}
  if(st.off)stamp('scoffer|'+(st.big?2:1),24,22,12,11,K,sx,sy+(-17+Math.sin(now/250)*2)*K,g=>{g.fillStyle='#fff';g.strokeStyle=scEdge();g.lineWidth=1.2;g.beginPath();g.arc(0,0,8,0,7);g.fill();g.stroke();
    g.fillStyle=st.big?'#1F5A9E':'#16A866';g.font=`800 ${st.big?8:10}px ${SC_FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(st.big?'$$':'$',0,0.5);},true);
  if(CM.dish&&p&&CM.dish.has(C.id))dishBadge(sx+14*k,sy-10*k,CM.dish.get(C.id),CM.dl&&CM.dl[C.id],k);
  if((cam.z>=0.62||p||sel||hov)&&(lyOverride!==null||hov)){const ly=lyOverride==null?sy+12*sc+6:lyOverride;scTag(C.name,!!p,!!p,sx,ly);}}
// Pills become text with a halo; the dark tooltip pill stays as it is.
const scPill0=pill;
function scPill(t,font,w,h,r,fill,ink,stroke,lw,x,y,ty){if(fill==='#1E2640')return scPill0(t,font,w,h,r,fill,ink,stroke,lw,x,y,ty);scTag(t,h>=19,fill==='#FF4F9A',x,y);}
if(pref('serious')){pill=scPill;cityStatic=scCityStatic;cityFarStatic=scCityFarStatic;drawCity=scDrawCity;}
