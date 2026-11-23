/* ---------- remote ports on exchanges you founded ---------- */
/* Selling remote peering: a network far from your exchange buys a layer-2 circuit from one of your POPs where it already
   is (b.city) to the exchange (b.city2) and becomes a member there (b.net). It is an L2 circuit customer like any other:
   routed over your backbone every day, billed per Gbps, and it leaves when the circuit runs badly. Networks in the
   exchange's own region join it locally instead (myIxCands), and selective networks that refuse remote peers say no
   here too (noRemote). Remote ports have their own cap, half the fabric's members, so a full exchange can still sell.
   Who asks follows what is measured: no exchange or peering policy caps the distance (Tokyo peers in Frankfurt), but most
   remote members are fairly near, and a big exchange draws networks from farther than a small one (African networks
   skipped their national exchanges for London and Amsterdam). So each (network, exchange) pair is drawn with weight
   rpPull: the exchange's members times a fall-off with distance that halves at RP_KM and never reaches zero. */
Object.assign(BIZ_T,{rpeer:{l:tr('remote_ports.type'),opts:[10,40,100],rate:0,l2:true,km:0.6,lv:3,rp:true}});
const rpMax=c=>Math.floor(myFab(c).max/2);
// Networks on a remote port into your exchange at c, and remote ports offered there.
const rpNets=c=>{const o=[];for(const b of S.biz)if(b.type==='rpeer'&&b.city2===c)o.push(b.net);return o;};
const rpAsked=c=>S.offers.filter(o=>o.type==='rpeer'&&o.city2===c).map(o=>o.net);
const rpUsed=c=>rpNets(c).length+rpAsked(c).length;
const rpOn=()=>!hyper()&&!modeOn('outcast')&&lvl()>=BIZ_T.rpeer.lv&&Object.keys(S.myIx).length>0;
// The POP a remote port into c starts from, per member (null for a local one).
const rpVia=(c,id)=>{const b=S.biz.find(x=>x.type==='rpeer'&&x.city2===c&&x.net===id);return b?b.city:null;};
// Who could buy one into c: computer-run networks outside c's region, not members already, that accept remote peering,
// with a POP where you have one. The circuit starts at the nearest such POP; km is how far that is.
function rpCands(c){const m=S.myIx[c];if(!m)return [];const reg=CITY[c].reg,have=new Set([...m.members,...rpNets(c),...rpAsked(c)]),out=[];
  for(const n of NETS){if(n.fed||n.type==='t1'||have.has(n.id)||noRemote(n.id)||n.pops.some(p=>CITY[p]&&CITY[p].reg===reg))continue;
    let at=null,km=Infinity;for(const p of n.pops){if(!S.pops[p]||!bizCity(p))continue;const k=kmBetween(p,c);if(k<km){km=k;at=p;}}
    if(at)out.push({net:n.id,city:at,km});}
  return out;}
const RP_KM=3000;
const rpFar=km=>1/(1+(km/RP_KM)**2);
// How strongly the exchange at c pulls a network km away: its members (one for a new one) times the fall-off.
const rpPull=(c,km)=>Math.max(1,ixMembers(c).length)*rpFar(km);
// Per Gbps a month: the price of any other L2 circuit that long, with the remote peering premium.
const rpRate=(a,b)=>Math.round(l2Per(kmBetween(a,b),BIZ_T.rpeer)*REMOTE_FEE);
function rpOffer(){const T=BIZ_T.rpeer,all=[];let tot=0;
  for(const c of Object.keys(S.myIx)){if(!S.pops[c]||rpUsed(c)>=rpMax(c))continue;for(const x of rpCands(c)){const w=rpPull(c,x.km);tot+=w;all.push({...x,c,w});}}
  if(!all.length)return;let r=Math.random()*tot,x=all[all.length-1];for(const y of all)if((r-=y.w)<0){x=y;break;}
  S.offers.push({id:uid(),city:x.city,city2:x.c,net:x.net,name:NET[x.net].name,type:'rpeer',bw:pick(T.opts),rate:rpRate(x.city,x.c),reqs:[],exp:S.day+40});}
