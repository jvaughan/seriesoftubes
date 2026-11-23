/* Serious map, accent and status colours: the game marks everything that is yours in pink (#FF4F9A and its darker and paler shades), in
   stylesheets, inline styles, canvas drawing and the WebGL tubes' selection halo. With the setting on, all of it turns
   deep blue at load (and the bright status greens, amber and reds turn muted), so no game file has to change: CSS rules are rewritten once, canvas colours and shader sources are
   translated as they are set, and inline styles go through the display filter (29-display-filter.js). */
// Your pinks to deep blue; the status greens, amber and reds (also the map's link load colours) to muted ones.
const SA_MAP=[[255,79,154,47,109,181],[214,59,127,31,79,138],[224,69,123,47,109,181],[255,224,238,220,232,248],[255,143,191,141,184,240],
  [34,196,122,62,158,112],[22,168,102,47,138,94],[255,77,94,207,77,87],[255,92,108,212,90,99],[255,170,31,217,154,46]];
const saHex=(r,g,b)=>'#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
// rgb()/rgba() with or without spaces, and #rrggbb in either case.
const SA_RE=new RegExp(SA_MAP.map(([r,g,b])=>`rgba?\\(\\s*${r},\\s*${g},\\s*${b}\\b|${saHex(r,g,b)}\\b`).join('|'),'gi');
const SA_TO=new Map();for(const [r,g,b,R,G,B] of SA_MAP){SA_TO.set(`${r},${g},${b}`,[R,G,B]);SA_TO.set(saHex(r,g,b),saHex(R,G,B));}
const SA_C=new Map();
function saFix(v){if(typeof v!=='string'||!v)return v;let r=SA_C.get(v);if(r!==undefined)return r;
  SA_RE.lastIndex=0;r=!SA_RE.test(v)?v:v.replace(SA_RE,m=>{const h=SA_TO.get(m.toLowerCase());if(h)return h;
    const p=/^(rgba?\()\s*(\d+),\s*(\d+),\s*(\d+)/i.exec(m),t=SA_TO.get(`${p[2]},${p[3]},${p[4]}`);return `${p[1]}${t[0]}, ${t[1]}, ${t[2]}`;});
  if(SA_C.size>2000)SA_C.clear();SA_C.set(v,r);return r;}
function saRules(rules){for(const r of rules){if(r.cssRules&&!r.style){saRules(r.cssRules);continue;}const s=r.style;if(!s)continue;
  for(let i=0;i<s.length;i++){const p=s[i],v=s.getPropertyValue(p),f=saFix(v);if(f!==v)s.setProperty(p,f,s.getPropertyPriority(p));}
  if(r.cssRules)saRules(r.cssRules);}}
function seriousAccent(){
  for(const sh of document.styleSheets){let rs=null;try{rs=sh.cssRules;}catch(e){}if(rs)saRules(rs);}
  for(const C of [window.CanvasRenderingContext2D,window.OffscreenCanvasRenderingContext2D])if(C)for(const k of ['fillStyle','strokeStyle']){
    const d=Object.getOwnPropertyDescriptor(C.prototype,k);if(d&&d.set)Object.defineProperty(C.prototype,k,{configurable:true,enumerable:d.enumerable,get:d.get,set(v){d.set.call(this,saFix(v));}});}
  // The card (WebGL) parses its own colours: tubes, cables and markers go through the same remap.
  const g0=glColor;glColor=c=>g0(saFix(c));
  // The selection halo's pink is written into the tubes' shader source.
  const W2=window.WebGL2RenderingContext;if(W2){const f=W2.prototype.shaderSource;W2.prototype.shaderSource=function(sh,src){return f.call(this,sh,typeof src==='string'?src.replace(/1\.,79\.\/255\.,154\.\/255\./g,'47./255.,109./255.,181./255.'):src);};}}
if(pref('serious')){seriousAccent();DISP_STY.push(saFix);dispInstall();}
