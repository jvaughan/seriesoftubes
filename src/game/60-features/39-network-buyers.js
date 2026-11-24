/* ---------- Networks that buy from you (Market Forces, phase 2; docs/proposals/realistic-market.md) ----------
   Real networks buy transit from two or three carriers at once and shop again when a contract ends: they ask several
   for a quote and weigh reach, diversity, quality and price. Here a network that shares a city with you asks you on its
   own cycle (ntr): decline, or quote list price or a discount, and a few days later it picks between you and the
   upstreams it already has, which it keeps (multihoming, so no cone ever changes). Win, and its cone joins yours; it pays
   its commit or its 95th percentile, whichever is more, and its traffic moves with the week, with failover when one of
   its other upstreams has a bad day, and away from you when you drop it.
   Your peering policy decides who pays to reach your own cone (ncone, paid peering). Nobody can charge for that while
   buying transit: everyone reaches you through your providers. Transit-free, Selective makes content networks that do
   not reach you through a peer or a customer pay, and Closed every such network.
   Every roll is a hash, never Math.random, so the mode leaves Classic's random stream alone. */
Object.assign(BIZ_T,{
 ntr:{l:tr('network_buyers.type'),opts:[10,20,50,100,200,400,800,1600],max:MF.net.max,rate:0,ntr:true,lv:MF.net.lv},
 ncone:{l:tr('network_buyers.cone_type'),opts:[10,20,50,100,200,400,800,1600],max:MF.net.max,rate:0,ntr:true,cone:true,lv:MF.net.lv}});
const ntT=t=>!!BIZ_T[t]&&!!BIZ_T[t].ntr;
// A stable roll in [0,1) for this game and this question.
const ntU=k=>(hstr(((S&&S.asn)||0)+'|nt|'+k)%100000)/100000;
// How often a network shops (one to three years), and which round of shopping a day falls in. Both hang only on the
// game's ASN and the network, so they are worked out once per game (asked of every network every day).
let NT_CYC={asn:null,m:new Map()};
function ntCycOf(id){const a=(S&&S.asn)||0;if(NT_CYC.asn!==a)NT_CYC={asn:a,m:new Map()};let c=NT_CYC.m.get(id);
  if(!c)NT_CYC.m.set(id,c={n:MF.net.cyc[hstr(a+'|cyc|'+id)%MF.net.cyc.length],o:hstr(id)});return c;}
const ntCyc=id=>ntCycOf(id).n;
const ntAsks=(id,d)=>{const c=ntCycOf(id);return (d+c.o)%c.n===0;};
const ntRound=(id,d)=>{const c=ntCycOf(id);return Math.floor((d+c.o)/c.n);};
// Who buys transit at all: eyeball and Tier 2 networks with upstreams of their own (the transit-free islands do not),
// not another player's, not China's.
const ntBuyer=n=>!!n&&(n.type==='eye'||n.type==='t2')&&!n.fed&&!n.cn&&!!(n.up&&n.up.length)&&!merged(n.id);
// Where it would connect: of your working POPs in its cities, the one with the most networks present (PeeringDB).
function ntCity(n){let at=null,w=-1;for(const c of n.pops){if(!CITY[c]||!S.pops[c]||!popUp(c)||!bizCity(c))continue;const q=CITY_PDB[c],v=(q?q[1]:0)*1e4+CITY[c].P;if(v>w){w=v;at=c;}}return at;}
// What you are worth to it: the whole internet (a reseller can win on price and being local), more of it on your own
// network, Tier, diversity (the more of your transit comes from its own providers, the less you add), how well you serve
// the city it would connect in, and your price. Its odds: you against each upstream it already has.
function ntScore(n,c,cut){const N=MF.net,i=N.cut.indexOf(cut),r=R?Math.max(0,reachSolo()):0;
  return r*(1-N.own+N.own*Math.min(r,Math.max(0,(R&&R.reachNT)||0)))*(isTier1()?N.t1:isTier2()?N.t2:1)*(1-(1-N.resell)*ntOverlap(n))*Math.min(1,sfOf(R,c)/0.95)*(i<0?1:N.cutW[i]);}
// Which of your transit providers are its own, and what share of them that is (by provider, not by port).
const ntResell=n=>S.transit.find(t=>n.up.includes(t.net))||null;
function ntOverlap(n){const ps=new Set(S.transit.map(t=>t.net));if(!ps.size)return 0;let k=0;for(const p of ps)if(n.up.includes(p))k++;return k/ps.size;}
function ntWin(n,s){return s>0?s/(s+n.up.length):0;}
// Its traffic through you: its share of the world's, times how much of it it would give you.
const ntBase=(n,share)=>Math.round(clamp(NSH[n.id]*MF.net.world*eraMul()*share,10,MF.net.max));
const ntCommit=g=>Math.max(10,Math.round(g*MF.net.commit/10)*10);
const ntList=c=>Math.round(cityRate('isp',c)*mkt());
// What it sends today (Gbps), and what crossed your network (its 95th percentile counts that).
const ntUse=b=>b.u>0?b.u:b.base>0?b.base:b.bw;
function ntCarried(b,r=R){if(!r)return 0;return BIZ_T[b.type].cone?(r.usePni&&r.usePni['nt:'+b.id])||0:ntUse(b)*bizSfOf(r,b.city);}
// Gbps it is billed for: the commit, or the 95th percentile of the last 30 days, whichever is more.
const ntBillG=(b,cur,today)=>Math.max(b.bw,p95(b,cur,today));
// A failover day: one of its other upstreams is in trouble, so you get more of its traffic.
function ntFailover(b,n,d){const ev=S.ev,k=clKey(b);if(ev.depeer>d&&n.up.includes('cog'))return true;
  const m=Math.floor(d/30);if(ntU(k+'|fo|'+m)>=MF.net.foP)return false;const s=Math.floor(ntU(k+'|fos|'+m)*28),len=1+Math.floor(ntU(k+'|fol|'+m)*3),x=d-m*30;return x>=s&&x<s+len;}
// The day's traffic, before routing: the week, a little noise, traffic engineering and failover.
function ntUseDay(b,d){const n=NET[b.net],N=MF.net;if(!n||BIZ_T[b.type].cone)return;
  if(R&&S.day-(b.since||0)>0)b.tef=+clamp((b.tef||1)+(bizSfOf(R,b.city)<0.95?-N.te:N.te),N.teMin,1).toFixed(3);
  b.u=+(b.base*(1+N.wk*Math.sin(2*Math.PI*d/7))*(0.9+0.2*ntU(clKey(b)+'|d|'+d))*(b.tef||1)*(ntFailover(b,n,d)?N.fo:1)).toFixed(2);}
// Their ports, for compute(): a customer route to the network and its whole cone (the shape Multimode uses for transit
// sold to a player), preferred like a PNI. Paid peering reaches the same.
function ntExits(E){for(const b of S.biz){if(!ntT(b.type)||!popUp(b.city))continue;const n=NET[b.net];if(!n)continue;
  E.push(mkEx('p','nt:'+b.id,b.city,Math.max(2*b.bw,2*(b.base||0)),2,'normal',labOf(BIZ_T[b.type].cone?N_('network_buyers.ex_cone'):N_('fedplay.ex_customer'),'net',n.name),x=>CONE_S[b.net].has(x),CONE[b.net],b.net));}}
// For compute(): the month's revenue, and the 95th percentile it was billed on (R.ntq, for the panels).
function ntRev(b,r,sf,today){const q=p95(b,ntCarried(b,r),today);(r.ntq||(r.ntq={}))[b.id]=q;return Math.max(b.bw,q)*b.rate*(BIZ_T[b.type].cone?1:Math.min(1,sf/0.95));}
// After routing: what crossed today goes into the 30 days its bill is taken from (like bought transit's).
function ntHist(){if(!R)return;for(const b of S.biz)if(ntT(b.type)){(b.hist||(b.hist=[])).push(+ntCarried(b).toFixed(2));if(b.hist.length>30)b.hist.shift();}}

/* Paid peering: who must pay to reach your cone. Nobody while you buy transit (they reach you through your providers);
   then Selective asks it of content networks, Closed of every network, unless one of its upstreams peers with you, it is
   in a customer's cone, or it reaches you free already (a PNI or a session). Only for traffic worth the trouble. */
function ntPays(n,pol=ppol()){if(!n||n.fed||n.cn||merged(n.id)||n.type==='t1'||pol==='open'||S.transit.length)return false;
  if(pol==='selective'?n.type!=='cdn':!['eye','t2','cdn'].includes(n.type))return false;
  if(S.pni.some(p=>pniOn(p)&&(p.net===n.id||(n.up||[]).includes(p.net))))return false;
  for(const b of S.biz)if(b.type==='ntr'&&CONE_S[b.net].has(n.id))return false;
  for(const c in S.ixp)if(ixSessions(c).has(n.id))return false;
  return ntWant(n)>=MF.cone.min;}
// Its traffic to and from your cone: its share of everything your network carries.
const ntWant=n=>((R&&R.demand)||0)*NSH[n.id];

/* Once a day, before routing (dayPreRun): today's traffic, answers to quotes, contracts that lost their reason, and
   who asks. Only in the mode, and never for a Hyperscaler, which buys transit but never sells it. */
function ntDay(d){if(!mfOn()||hyper())return;
  for(const b of S.biz)if(ntT(b.type))ntUseDay(b,d);
  for(const o of S.offers.slice())if(o.type==='ntr'&&o.rfq&&o.rfq.q!==null&&d>=o.rfq.due)ntAnswer(o);
  // Paid peering ends with its term once they can reach you free (you opened up, or bought transit again).
  for(const b of S.biz.slice())if(b.type==='ncone'&&b.te!=null&&d>=b.te&&!ntPays(NET[b.net])){clGone(b,'cheap');toast(tr('network_buyers.cone_free',{net:esc(b.name)}),'');}
  if(lvl()>=MF.net.lv)ntAsk(d);}
function ntAsk(d){let open=0;const have=new Set();for(const o of S.offers)if(ntT(o.type)){open++;have.add(o.net);}if(open>=MF.net.open)return;
  for(const b of S.biz)if(ntT(b.type))have.add(b.net);
  for(const n of NETS){if(have.has(n.id))continue;const half=Math.floor(ntCyc(n.id)/2);let o=null;
    if(ntAsks(n.id,d)&&ntBuyer(n))o=ntRfq(n,d);
    else if(ntAsks(n.id,d+half)&&ntPays(n))o=ntCone(n,d);
    if(!o)continue;S.offers.push(o);have.add(n.id);
    const v={net:esc(n.name),city:esc(CITY[o.city].name)};toast(o.type==='ntr'?tr('network_buyers.asks',v):tr('network_buyers.cone_asks',v),'',[{l:tr('common.deals'),act:'leftTab',args:{t:'deals'}}]);
    if(++open>=MF.net.open)return;}}
// A request for a transit quote: sized on what list price would win it, priced at list until you quote.
function ntRfq(n,d){const c=ntCity(n);if(!c)return null;const base=ntBase(n,ntWin(n,ntScore(n,c,0))||1/(n.up.length+1));
  return {id:uid(),city:c,city2:null,net:n.id,name:n.name,type:'ntr',bw:ntCommit(base),base,rate:ntList(c),mk:mkt(),reqs:[],exp:d+MF.net.exp,rfq:{q:null,due:0,r:ntRound(n.id,d)}};}
// Paid peering: accepted or declined like any offer (only you sell your cone), billed on what crosses its port.
function ntCone(n,d){const c=ntCity(n);if(!c)return null;const base=Math.round(clamp(ntWant(n),10,MF.net.max));
  return {id:uid(),city:c,city2:null,net:n.id,name:n.name,type:'ncone',bw:ntCommit(base),base,rate:Math.round(cityRate('isp',c)*mkt()*MF.cone.rate),mk:mkt(),reqs:[],exp:d+MF.net.exp};}
// The answer: it scores you as you are today, at the price you quoted, and rolls once per round of shopping.
function ntAnswer(o){const n=NET[o.net];S.offers=S.offers.filter(x=>x!==o);if(!n||!S.pops[o.city])return;
  const q=o.rfq.q,p=ntWin(n,ntScore(n,o.city,q));
  if(ntU(n.id+'|win|'+o.rfq.r)<p){const b=offerCustomer(o);b.base=ntBase(n,p);b.bw=ntCommit(b.base);b.rate=Math.round(o.rate*(1-q));b.mk=o.mk||mkt();b.tef=1;b.u=b.base;b.hist=[];
    S.biz.push(clSign(b));toast(tr('network_buyers.won',{net:esc(n.name),city:esc(CITY[o.city].name),commit:fmtG(b.bw),price:fmt$(b.rate)}),'goal',[],{a:'cust',v:b.id});sfx('coin');return;}
  const up=n.up.filter(u=>NET[u]),w=up.length?NET[up[hstr(n.id+'|'+o.rfq.r)%up.length]].name:'';
  toast(tr('network_buyers.lost',{net:esc(n.name),up:esc(w),city:esc(CITY[o.city].name)}),'');}
// Growing or shrinking a contract moves the traffic behind it too.
const ntScale=(b,was)=>{if(ntT(b.type)&&b.base>0&&was>0)b.base=Math.round(b.base*b.bw/was);};

// The offer's buttons: three quotes and the wait for an answer (Decline stays). null for every other offer.
function ntOfferBtns(o){if(o.type!=='ntr')return null;const r=o.rfq||{};
  if(r.q!==null&&r.q!==undefined)return `<span class="dl-st">${tr('network_buyers.waiting',{n:Math.max(0,r.due-S.day)})}</span>`;
  return MF.net.cut.map((c,i)=>btn(c?tr('network_buyers.quote_cut',{p:Math.round(c*100)}):tr('network_buyers.quote_list'),'ntQuote',{id:o.id,cut:c},i?'ghost sm':'green sm')).join('');}
// Its terms: commit, the traffic behind it, and the price per Gbps (the quoted one once you have quoted).
function ntTerms(o){const q=o.rfq&&o.rfq.q>0?o.rfq.q:0;return tr('network_buyers.terms',{commit:fmtG(o.bw),g:fmtG(o.base||o.bw),price:fmt$(Math.round(o.rate*(1-q)))});}
// An offer's warning (bRisk()): you buy transit from its own provider, so you add less. Strong when half or more of your
// providers are its own (a 35% to 70% cut), mild below that.
function ntRisk(o){if(!o.rfq)return '';const n=NET[o.net],rs=n&&ntResell(n);if(!rs)return '';const up=esc(NET[rs.net].name);
  return `<div class="why">${ntOverlap(n)>=0.5?tr('network_buyers.resell',{up}):tr('network_buyers.resell_some',{up})}</div>`;}
// A customer's line: its 95th percentile, its commit and the month's bill.
function ntLine(b){const q=p95(b,ntCarried(b));return tr('city_panel.95th_pct_p95_commit_commit_bill',{p95:fmtG(q),commit:fmtG(b.bw),bill:fmt$(Math.round(Math.max(b.bw,q)*b.rate))});}
// Save repair for both types (fixBiz): numbers that are numbers, a bill history that is one, a quote that is a choice.
function ntFix(b){b.base=num(b.base,b.bw*2);if(b.u!==undefined)b.u=Math.max(0,num(b.u,b.base));if(b.tef!==undefined)b.tef=clamp(num(b.tef,1),MF.net.teMin,1);
  if(b.hist!==undefined)b.hist=Array.isArray(b.hist)?b.hist.filter(v=>typeof v==='number'&&isFinite(v)&&v>=0).slice(-30):[];
  if(b.rfq!==undefined){const r=b.rfq&&typeof b.rfq==='object'?b.rfq:{};b.rfq={q:MF.net.cut.includes(r.q)?r.q:null,due:num(r.due,0),r:num(r.r,0)};}
  return b;}
// The peering policy, as the mode prices it: Selective and Closed can earn paid peering once you are transit-free.
const PPOL_D_MF={open:N_('peering_desk.open_desc'),selective:N_('network_buyers.selective_desc'),closed:N_('network_buyers.closed_desc')};
