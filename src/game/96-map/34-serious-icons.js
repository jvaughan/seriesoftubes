/* Serious Tubes, icons: no emoji, plain ships. Emoji are taken out of the page's text and the map's canvas text as they
   are shown, through the display filter (29-display-filter.js); a few become plain symbols so their
   meaning stays (✅ ✓, ⚠️ ⚠, ⭐ ★, ❓ ?), and ™, arrows and ▶ stay as they are. Saves and the game's text are untouched.
   The cartoon cable ships become small flat hulls in the same colours. Only with the setting on. */
const EMO_SUB={'✅':'✓','✔️':'✓','⚠️':'⚠︎','⚠':'⚠︎','⭐':'★','❓':'?','❔':'?','🔴':'●','➖':'−','⬆️':'↑','⬆':'↑','⏩':'»','▶️':'▶'};
const EMO_RE=/(\p{Extended_Pictographic}(?:️|⃣|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*)(\s?)/gu;
// Kept: ™ ©, arrows (U+2190 to U+21FF) and geometric shapes (U+25A0 to U+25FF) such as ▶.
const emoKeep=e=>{const c=e.codePointAt(0);return c===0x2122||c===0xA9||c===0xAE||(c>=0x2190&&c<=0x21FF)||(c>=0x25A0&&c<=0x25FF);};
const EMO_C=new Map();
function emoStrip(v){if(typeof v!=='string'||!v||v.length>10000)return v;let r=EMO_C.get(v);if(r!==undefined)return r;
  r=v.replace(EMO_RE,(m,e,sp)=>{if(emoKeep(e))return m;const s=EMO_SUB[e]??EMO_SUB[e.replace(/️/g,'')];return s!==undefined?s+sp:'';});
  if(EMO_C.size>=5000)EMO_C.clear();EMO_C.set(v,r);return r;}
// A cable ship: a small hull pointing the way it sails, flat colour, a hairline; a dot over it while it works.
function siShip(x,y,face,sc,col,now,mode){const bl=mode==='work'&&Math.floor(now/500)%2;
  stamp(['siship',col,face,mode,bl?1:0].join('|'),30,20,15,10,sc,x,y,c=>{c.scale(face,1);
    c.fillStyle=col;c.strokeStyle=scEdge();c.lineWidth=1.1;c.lineJoin='round';c.beginPath();c.moveTo(-8,-2.5);c.lineTo(5,-2.5);c.lineTo(9,0);c.lineTo(5,2.5);c.lineTo(-8,2.5);c.closePath();c.fill();c.stroke();
    if(bl){c.fillStyle='#F2B705';c.beginPath();c.arc(0,-6,1.8,0,7);c.fill();}},true);}
if(pref('serious')){DISP_TX.push(emoStrip);shipSprite=siShip;dispInstall();}
