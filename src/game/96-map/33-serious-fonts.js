/* Serious map, type and corners (with 44-serious.css): the cartoon look leans on very heavy weights (800 and 900 in 130-odd rules)
   and on Baloo 2 and Nunito, named directly in the stylesheets and in the map's canvas text. When the setting is on,
   once at load: the page's own style rules get lighter weights and the system sans-serif, and every font set on a
   canvas is rewritten the same way (cable names, floaters, badges). Nothing changes with it off. */
const SF_STACK='system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
const SF_W={900:'700',800:'600',700:'600'};
const SF_C=new Map();
// A CSS font string with the cartoon faces and weights swapped (cached: the map sets the same few fonts all the time).
function sfFont(f){if(typeof f!=='string')return f;let r=SF_C.get(f);if(r!==undefined)return r;
  r=f.replace(/(^|\s)(900|800|700)(?=\s)/,(m,a,w)=>a+SF_W[w]).replace(/"Baloo 2"|'Baloo 2'|Baloo 2|Nunito/g,'').replace(/,\s*,/g,',').replace(/(\d(?:px|pt|em|rem))\s*,?\s*(sans-serif)?\s*$/,'$1 '+SF_STACK);
  if(SF_C.size>500)SF_C.clear();SF_C.set(f,r);return r;}
// Corners: every radius in px is capped (pills and big cards turn into small rounded boxes); % radii are circles and stay.
const SF_RMAX=6,SF_RK=['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'];
const sfRad=v=>!v||v.includes('%')?v:v.replace(/([\d.]+)px/g,(m,n)=>Math.min(+n,SF_RMAX)+'px');
function sfRules(rules){for(const r of rules){if(r.cssRules&&!r.style){sfRules(r.cssRules);continue;}const s=r.style;if(!s)continue;
  const w=SF_W[s.fontWeight];if(w)s.fontWeight=w;
  for(const k of SF_RK){const v=s[k];if(v){const c=sfRad(v);if(c!==v)s[k]=c;}}
  if(/Baloo|Nunito/.test(s.fontFamily||''))s.fontFamily=SF_STACK;
  if(r.cssRules)sfRules(r.cssRules);}}
function seriousFonts(){
  for(const sh of document.styleSheets){let rs=null;try{rs=sh.cssRules;}catch(e){}if(rs)sfRules(rs);} // the web-font sheet is another origin: skipped
  for(const C of [window.CanvasRenderingContext2D,window.OffscreenCanvasRenderingContext2D]){if(!C)continue;const d=Object.getOwnPropertyDescriptor(C.prototype,'font');
    if(d&&d.set)Object.defineProperty(C.prototype,'font',{configurable:true,enumerable:d.enumerable,get:d.get,set(v){d.set.call(this,sfFont(v));}});}}
if(pref('serious'))seriousFonts();
