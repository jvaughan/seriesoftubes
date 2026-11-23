/* Display filter (local fork): rewrites what the page and the map show, never the game's state, text tables or saves.
   Text transforms (DISP_TX, applied in order) reach page text, title/aria-label/alt and canvas fillText/strokeText/
   measureText (the map's labels); style transforms (DISP_STY) reach inline styles and SVG fill/stroke/stop-color. Nothing
   runs until a setting that needs it calls dispInstall() (more calls do nothing), and the first pass over the page waits
   until the game script has run, so transforms added by later files apply to it too. */
const DISP_TX=[],DISP_STY=[];let dispOn=false;
const dispTx=v=>{for(const f of DISP_TX)v=f(v);return v;};
const dispSty=v=>{for(const f of DISP_STY)v=f(v);return v;};
// Form controls keep what the player typed (and an <option> without value= is its own text).
const DISP_SKIP='script,style,noscript,pre,code,textarea,input,select,option,[contenteditable]';
function dispVisit(n){if(n.nodeType===3){const p=n.parentElement;if(p&&!p.isContentEditable){const a=dispTx(n.nodeValue);if(a!==n.nodeValue)n.nodeValue=a;}return;}
  if(DISP_STY.length)for(const k of ['style','fill','stroke','stop-color']){const st=n.getAttribute(k);if(st){const a=dispSty(st);if(a!==st)n.setAttribute(k,a);}}
  for(const k of ['title','aria-label','alt']){const v=n.getAttribute(k);if(v){const a=dispTx(v);if(a!==v)n.setAttribute(k,a);}}}
function dispScan(root){if(!root||!root.isConnected)return;
  if(root.nodeType===3){if(root.parentElement&&!root.parentElement.closest(DISP_SKIP))dispVisit(root);return;}
  if(root.nodeType!==1||root.closest(DISP_SKIP))return;dispVisit(root);
  const w=document.createTreeWalker(root,5,{acceptNode:n=>n.nodeType===1&&n.matches(DISP_SKIP)?2:1});let x;while((x=w.nextNode()))dispVisit(x);}
function dispInstall(){if(dispOn)return;dispOn=true;
  for(const C of [window.CanvasRenderingContext2D,window.OffscreenCanvasRenderingContext2D]){if(!C)continue;const p=C.prototype;
    for(const m of ['fillText','strokeText','measureText']){const f=p[m];if(typeof f==='function')p[m]=function(t,...a){return f.call(this,dispTx(t),...a);};}}
  const go=()=>{const b=document.body;if(!b)return;dispScan(b);const q=new Set();let on=false;
    const flush=()=>{on=false;const w=[...q];q.clear();for(const n of w)dispScan(n);};
    new MutationObserver(ch=>{for(const c of ch){if(c.type==='childList')for(const n of c.addedNodes)q.add(n);else q.add(c.target);}
      if(!on&&q.size){on=true;requestAnimationFrame(flush);}}).observe(b,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','alt']});};
  queueMicrotask(()=>{if(document.body)go();else document.addEventListener('DOMContentLoaded',go,{once:true});});}
