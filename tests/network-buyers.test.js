// Market Forces, phase 2: networks that buy transit from you, and who pays for your cone (39-network-buyers.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const start = (ev, mods = ['forces']) => ev(`beginGame('Buyers','fra',{mode:'normal',preset:'oncall',rules:{mods:${JSON.stringify(mods)},pnis:'instant'}});if(UI.pendGame)ACT.pitchSkip()`);
// A small network: 100G of Cogentle in Frankfurt, level 4.
const build = (ev, ix = false) => ev(`S.lvl=4;S.cash=1e9;ACT.buyTransit({city:'fra',net:'cog',tier:1});${ix ? "ACT.buyIx({city:'fra',tier:1,signed:true});" : ''}compute()`);
// A network customer signed on the spot: B.I.G.S. (a Tier 2 buying from Level Tree, with a cone of its own) by default.
const sign = (ev, net = 'bgs', type = 'ntr', more = '') => ev(`(()=>{const o={id:'c-${net}',city:'fra',city2:null,net:'${net}',name:NET['${net}'].name,type:'${type}',bw:20,base:30,rate:45,mk:1,reqs:[],exp:S.day+14};
  const b=offerCustomer(o);Object.assign(b,{tef:1,u:30,hist:[]${more}});S.biz.push(clSign(b));compute();return b.id;})()`);
const J = (ev, x) => JSON.parse(ev(`JSON.stringify(${x})`));

test('Classic: no network asks for transit or paid peering, and a closed policy still scares customers off', () => {
  const { ev, errors } = load();
  start(ev, []);
  build(ev, true);
  for (let i = 0; i < 300; i++) ev('dayTick()');
  assert.equal(ev('S.offers.concat(S.biz).filter(o=>ntT(o.type)).length'), 0);
  assert.equal(ev("S.ppol='closed';offerOdds()/(S.ppol='open',offerOdds())"), 0.6);
  ev("S.rules.mods=['forces']");
  assert.equal(ev("S.ppol='closed';offerOdds()/(S.ppol='open',offerOdds())"), 1, 'in Market Forces, buyers of transit do not read peering policies');
  assert.deepEqual(errors, []);
});

test('Market Forces: a network asks for quotes only on its own cycle, only where it meets you, one request at a time', () => {
  const { ev, errors } = load();
  start(ev);
  build(ev);
  const seen = J(ev, `(()=>{const out=[];for(let d=S.day+1;d<S.day+1200;d++){S.offers=S.offers.filter(o=>!ntT(o.type));ntAsk(d);
    for(const o of S.offers)if(o.type==='ntr')out.push({d,net:o.net,city:o.city,cyc:ntAsks(o.net,d),buyer:ntBuyer(NET[o.net]),there:NET[o.net].pops.includes(o.city)&&!!S.pops[o.city],q:o.rfq.q,bw:o.bw,base:o.base});}return out;})()`);
  assert.ok(seen.length >= 5, `${seen.length} requests in 1200 days`);
  for (const o of seen) {
    assert.ok(o.cyc && o.buyer && o.there, JSON.stringify(o));
    assert.equal(o.q, null, 'nothing is quoted until you quote');
    assert.ok(o.base >= 10 && o.base <= ev('MF.net.max') && o.bw <= o.base, JSON.stringify(o));
  }
  // Worked out once per game, and the same as working it out each time.
  const cyc = () => J(ev, "['bgs','mag','tny','aat'].map(id=>[ntCyc(id),MF.net.cyc[hstr(S.asn+'|cyc|'+id)%MF.net.cyc.length],ntRound(id,S.day+500),Math.floor((S.day+500+hstr(id))/MF.net.cyc[hstr(S.asn+'|cyc|'+id)%MF.net.cyc.length])])");
  for (const [a, b, c, d] of cyc()) { assert.equal(a, b); assert.equal(c, d); }
  ev('window.__asn=S.asn;S.asn=S.asn+17');
  for (const [a, b, c, d] of cyc()) { assert.equal(a, b, 'another game, other cycles'); assert.equal(c, d); }
  ev('S.asn=__asn');
  const by = {};
  for (const o of seen) { if (by[o.net] !== undefined) assert.ok(o.d - by[o.net] >= ev(`ntCyc('${o.net}')`), `${o.net} asked again too soon`); by[o.net] = o.d; }
  // Left open, requests pile up to the cap and no further.
  ev('S.offers=[];for(let d=S.day+1;d<S.day+1200;d++)ntAsk(d)');
  assert.equal(ev('S.offers.filter(o=>ntT(o.type)).length'), ev('MF.net.open'));
  assert.equal(ev('new Set(S.offers.map(o=>o.net)).size'), ev('S.offers.length'), 'one request per network');
  // Below level 3 nobody asks, and the day draws no random numbers.
  ev(`S.offers=[];S.lvl=2;for(const o of ${JSON.stringify(seen.slice(0, 5))})ntDay(o.d)`);
  assert.equal(ev('S.offers.length'), 0);
  ev(`S.lvl=4;(()=>{const r=Math.random;let n=0;Math.random=()=>(n++,r());try{for(const o of ${JSON.stringify(seen)})ntDay(o.d);}finally{Math.random=r;}window.__n=n;})()`);
  assert.equal(ev('__n'), 0, 'every roll is a hash, so Classic keeps its random stream');
  assert.deepEqual(errors, []);
});

test('Market Forces: what wins a quote is reach, Tier, diversity and price', () => {
  const { ev, errors } = load();
  start(ev);
  build(ev);
  const s = cut => ev(`ntScore(NET.bgs,'fra',${cut})`);
  assert.ok(s(0) > 0);
  assert.ok(s(0.1) > s(0) && s(0.2) > s(0.1), 'a deeper cut helps');
  assert.ok(Math.abs(s(0.2) / s(0) - 1.8) < 1e-9);
  // Half of your transit from its own provider (Level Tree): you add less.
  const before = s(0);
  ev("ACT.buyTransit({city:'fra',net:'lvl',tier:1});compute()");
  assert.equal(ev('ntOverlap(NET.bgs)'), 0.5);
  assert.ok(Math.abs(s(0) / before - (1 - 0.7 * 0.5)) < 0.02, `${s(0)} vs ${before}`);
  assert.match(ev("ntRisk({type:'ntr',net:'bgs',rfq:{q:null}})"), /Level Tree/);
  ev("S.transit=S.transit.filter(t=>t.net!=='lvl');compute()");
  ev('window.__t1=isTier1;isTier1=()=>true');
  assert.ok(Math.abs(s(0) / before - 2) < 0.02, 'a Tier 1 is worth twice as much');
  ev('isTier1=__t1');
  // Odds: you against each upstream it has.
  assert.equal(ev('ntWin(NET.mag,1)'), 1 / 3);
  assert.deepEqual(errors, []);
});

test('Market Forces: the same game gives the same buyers', () => {
  const run = () => {
    const { ev, errors } = load();
    start(ev);
    build(ev);
    for (let i = 0; i < 400; i++) { ev('dayTick()'); ev("for(const o of S.offers)if(o.type==='ntr'&&o.rfq.q===null)ACT.ntQuote({id:o.id,cut:0.2})"); }
    assert.deepEqual(errors, []);
    return J(ev, "S.biz.filter(b=>b.type==='ntr').map(b=>[b.net,b.city,b.bw,b.base,b.rate])");
  };
  const a = run();
  assert.ok(a.length > 0, 'some quotes are won');
  assert.deepEqual(run(), a);
});

test('Market Forces: billed on the commit or the 95th percentile of what crossed, whichever is more', () => {
  const { ev, errors } = load();
  start(ev);
  build(ev);
  const id = sign(ev);
  const b = `S.biz.find(x=>x.id==='${id}')`;
  ev(`${b}.hist=Array(29).fill(10)`);
  assert.equal(ev(`ntBillG(${b},10,false)`), 20, 'under the commit: the commit');
  ev(`${b}.hist=Array(28).fill(10).concat([50])`);
  assert.equal(ev(`ntBillG(${b},10,false)`), 20, 'one day of failover is free (the 95th percentile drops it)');
  ev(`${b}.hist=Array(27).fill(10).concat([50,50])`);
  assert.equal(ev(`ntBillG(${b},10,false)`), 50, 'two are billed');
  // What crossed, not what it wanted: its traffic times how much of it you carried.
  ev(`${b}.hist=[];${b}.u=30;compute()`);
  assert.ok(Math.abs(ev(`ntCarried(${b})`) - 30 * ev("bizSfOf(R,'fra')")) < 1e-9);
  const q = ev(`R.ntq['${id}']`), sf = ev("sfOf(R,'fra')");
  assert.ok(Math.abs(q - ev(`ntCarried(${b})`)) < 1e-9);
  const without = ev(`(()=>{const x=${b};S.biz=S.biz.filter(y=>y!==x);compute();const v=R.rev.business;S.biz.push(x);compute();return v;})()`);
  assert.ok(Math.abs(ev('R.rev.business') - without - Math.max(20, q) * 45 * Math.min(1, sf / 0.95)) < 1e-6);
  assert.equal(ev(`Math.round(bizMo(${b}))`), Math.round(Math.max(20, q) * 45));
  ev('ntHist()');
  assert.equal(ev(`${b}.hist.length`), 1);
  assert.deepEqual(errors, []);
});

test('Market Forces: traffic moves with the week, away from you while you drop it, toward you on failover days', () => {
  const { ev, errors } = load();
  start(ev);
  build(ev);
  const id = sign(ev, 'mag');
  const b = `S.biz.find(x=>x.id==='${id}')`;
  ev(`${b}.since=S.day-30;window.__sf=bizSfOf;bizSfOf=()=>0.5;for(let i=0;i<20;i++)ntUseDay(${b},S.day)`);
  assert.equal(ev(`${b}.tef`), ev('MF.net.teMin'), 'it routes around you, down to its floor');
  ev(`bizSfOf=__sf;for(let i=0;i<20;i++)ntUseDay(${b},S.day)`);
  assert.equal(ev(`${b}.tef`), 1, 'and comes back');
  // Failover: in some months one to three days in a row, and then you get more of its traffic.
  const days = J(ev, `(()=>{const n=NET.mag,o=[];for(let d=1;d<=720;d++)if(ntFailover(${b},n,d))o.push(d);return o;})()`);
  assert.ok(days.length > 0);
  const months = new Set(days.map(d => Math.floor(d / 30)));
  assert.ok(months.size >= 2 && months.size <= 14, `${months.size} months of 24`);
  for (const m of months) { const ds = days.filter(d => Math.floor(d / 30) === m); assert.ok(ds.length <= 3 && ds[ds.length - 1] - ds[0] === ds.length - 1, `month ${m}: ${ds}`); }
  const fo = days[0], calm = J(ev, `(()=>{const o=[];for(let d=1;d<=720;d++)if(!ntFailover(${b},NET.mag,d))o.push(d);return o;})()`);
  const use = d => ev(`(ntUseDay(${b},${d}),${b}.u)`);
  const avg = calm.slice(0, 60).reduce((a, d) => a + use(d), 0) / 60;
  assert.ok(use(fo) > avg * 1.25, `${use(fo)} on a failover day, ${avg} usually`);
  // A de-peering at one of its upstreams (Cogentle) is a failover too.
  ev('S.ev.depeer=S.day+5');
  assert.equal(ev(`ntFailover(${b},NET.mag,S.day+1)`), true);
  assert.deepEqual(errors, []);
});

test('Market Forces: a Hyperscaler buys transit but never sells it, so nobody asks it for any', () => {
  const { ev, errors } = load();
  start(ev);
  ev("ACT.charter({k:'hyper'})");
  assert.equal(ev('hyper()'), true);
  ev('S.lvl=4');
  // The networks around it would ask (ntAsk on its own), but the day never lets them.
  assert.ok(ev("(()=>{S.offers=[];for(let d=S.day+1;d<S.day+1200;d++)ntAsk(d);const n=S.offers.length;S.offers=[];return n;})()") > 0);
  ev('for(let d=S.day+1;d<S.day+1200;d++)ntDay(d)');
  assert.equal(ev('S.offers.filter(o=>ntT(o.type)).length'), 0);
  // A save that has some anyway (made before this check) loses them.
  sign(ev);
  ev("S.offers.push({id:'rq',city:'fra',city2:null,net:'mag',name:'Dive-Bomb Magpie',type:'ntr',bw:50,base:100,rate:45,mk:1,reqs:[],exp:S.day+20,rfq:{q:null,due:0,r:1}});sanitize(S)");
  assert.equal(ev('S.biz.concat(S.offers).filter(o=>ntT(o.type)).length'), 0);
  assert.deepEqual(errors, []);
});

test('Market Forces: paid peering buys a port into your network, so only that port can disappoint it', () => {
  const { ev, errors } = load();
  start(ev);
  build(ev);
  sign(ev, 'nfx', 'ncone');
  sign(ev, 'bgs');
  // No transit: you reach little of the internet, and a transit customer suffers; a paying peer does not care.
  ev('S.transit=[];compute()');
  assert.ok(ev('reachSolo()') < 0.99);
  const nc = "S.biz.find(b=>b.type==='ncone')", tr = "S.biz.find(b=>b.type==='ntr')";
  assert.equal(ev(`bizSf(${nc})`), 1);
  assert.deepEqual(J(ev, `bizWhy(${nc})`), []);
  assert.ok(J(ev, `bizWhy(${tr})`).length > 0);
  ev(`${nc}.mood=90;${tr}.mood=90;${nc}.since=${tr}.since=S.day-30;for(let i=0;i<2;i++){S.nextFail=S.day+99;S.nextEvent=S.day+99;dayTick();}`);
  assert.ok(ev(`${nc}.mood`) > 90, 'the paying peer is content');
  assert.ok(ev(`(b=>!b||b.mood<90)(${tr})`), 'the transit customer is not (or has left)');
  assert.deepEqual(errors, []);
});

test('Market Forces: a customer network brings its cone, and takes it away when it leaves', () => {
  const { ev, errors } = load();
  start(ev);
  build(ev);
  assert.ok(!ev('R.nt.bgs') && !ev('R.nt.pxm'), 'only transit reaches them before');
  const id = sign(ev);
  assert.equal(ev('R.nt.bgs'), 1);
  assert.equal(ev('R.nt.pxm'), 1, 'and its own customers');
  assert.equal(ev('R.cone.pxm'), 'bgs');
  assert.ok(ev(`R.usePni['nt:${id}']`) >= 0);
  ev(`S.biz=S.biz.filter(b=>b.id!=='${id}');compute()`);
  assert.ok(!ev('R.nt.bgs') && !ev('R.nt.pxm'));
  assert.deepEqual(errors, []);
});

test('Market Forces: who pays to reach your cone depends on your policy, your transit and their way round', () => {
  const { ev, errors } = load();
  start(ev);
  build(ev);
  const pays = (net, pol) => ev(`(R.demand=1e6,ntPays(NET.${net},'${pol}'))`);
  assert.equal(pays('nfx', 'closed'), false, 'while you buy transit, everyone reaches you through your providers');
  ev('S.transit=[]');
  assert.equal(pays('nfx', 'open'), false);
  assert.equal(pays('nfx', 'selective'), true, 'Selective: content pays');
  assert.equal(pays('tny', 'selective'), false);
  assert.equal(pays('tny', 'closed'), true, 'Closed: everyone pays');
  assert.equal(pays('cog', 'closed'), false, 'Tier 1s never do');
  assert.equal(ev("(R.demand=1,ntPays(NET.nfx,'selective'))"), false, 'not for a trickle');
  ev("S.pni.push({id:'p-lvl',net:'lvl',city:'fra',tier:2})");
  assert.equal(pays('tny', 'closed'), false, 'its upstream peers with you: it goes round');
  ev("S.pni=[]");
  assert.equal(pays('pxm', 'closed'), true);
  sign(ev);
  ev('S.transit=[]');
  assert.equal(pays('pxm', 'closed'), false, "a customer's customer reaches you through it");
  // The request comes half a cycle away from its transit shopping, and is accepted like any offer.
  ev("S.ppol='selective';S.offers=[]");
  const d = ev("(()=>{const h=Math.floor(ntCyc('nfx')/2);for(let d=S.day+1;;d++)if(ntAsks('nfx',d+h))return d;})()");
  ev(`R.demand=1e6;ntAsk(${d})`);
  const o = J(ev, "S.offers.find(o=>o.net==='nfx')");
  assert.equal(o.type, 'ncone');
  assert.equal(o.rate, Math.round(ev("cityRate('isp','fra')*mkt()") * 0.4));
  assert.match(ev("dlOffer(S.offers.find(o=>o.net==='nfx'),2)"), /data-act="accept"/);
  ev(`ACT.accept({id:'${o.id}'})`);
  assert.equal(ev("S.biz.filter(b=>b.type==='ncone').length"), 1);
  // Once it can reach you free, it stops paying at the end of its term.
  ev("S.ppol='open';S.biz.find(b=>b.type==='ncone').te=S.day;ntDay(S.day)");
  assert.equal(ev("S.biz.filter(b=>b.type==='ncone').length"), 0);
  assert.deepEqual(errors, []);
});

test('Market Forces: quotes in Deals and the city panel, the answer, and the 95th percentile on the customer', () => {
  const { ev, errors } = load();
  start(ev);
  build(ev);
  ev("S.offers=[];(()=>{for(let d=S.day+1;!S.offers.length;d++)ntAsk(d);})();S.offers.length=1");
  const o = J(ev, 'S.offers[0]');
  const card = () => ev(`dlOffer(S.offers[0],dlSt(S.offers[0]))`);
  assert.match(card(), /ntQuote/);
  assert.doesNotMatch(card(), /data-act="accept"/);
  assert.match(ev(`offersHere('${o.city}')`), /ntQuote/);
  assert.match(ev('bTerms(S.offers[0])'), /commit/);
  ev(`ACT.accept({id:'${o.id}'})`);
  assert.equal(ev('S.offers[0].rfq.q'), 0, 'Accept (the sales agents, the intern) quotes list price');
  assert.match(card(), /Quoted/);
  assert.doesNotMatch(card(), /ntQuote/);
  ev(`ACT.ntQuote({id:'${o.id}',cut:0.2})`);
  assert.equal(ev('S.offers[0].rfq.q'), 0, 'one quote per request');
  // The answer, won for sure here.
  ev("window.__w=ntWin;ntWin=()=>1;ntAnswer(S.offers[0]);ntWin=__w");
  assert.equal(ev('S.offers.length'), 0);
  const b = J(ev, "S.biz.find(b=>b.type==='ntr')");
  assert.equal(b.net, o.net);
  assert.equal(b.rate, o.rate);
  assert.ok(b.te > ev('S.day'), 'it signs for a term');
  ev('compute()');
  assert.match(ev('custSection()'), /95th pct/);
  assert.deepEqual(errors, []);
});

test('Market Forces: network customers and quotes survive a save, junk is repaired, and other games drop them', () => {
  const { ev, errors } = load();
  start(ev);
  build(ev);
  sign(ev, 'bgs', 'ntr', ",hist:[10,20,30]");
  sign(ev, 'nfx', 'ncone');
  ev("S.offers.push({id:'rq',city:'fra',city2:null,net:'mag',name:'Dive-Bomb Magpie',type:'ntr',bw:50,base:100,rate:45,mk:1,reqs:[],exp:S.day+20,rfq:{q:0.1,due:S.day+4,r:7}})");
  ev('S=migrate(JSON.parse(JSON.stringify(packSave(S))))');
  assert.deepEqual(J(ev, "S.biz.filter(b=>ntT(b.type)).map(b=>[b.type,b.net,b.bw,b.base,b.hist.length])"), [['ntr', 'bgs', 20, 30, 3], ['ncone', 'nfx', 20, 30, 0]]);
  assert.deepEqual(J(ev, "S.offers.find(o=>o.id==='rq').rfq"), { q: 0.1, due: ev('S.day') + 4, r: 7 });
  ev("S.biz.push({id:'j1',type:'ntr',net:'nope',city:'fra',name:'X',bw:10,rate:1},{id:'j2',type:'ntr',net:'tny',city:'fra',name:'Y',bw:10,rate:1,base:'lots',hist:['x',5,-1,null,7],tef:9});S.offers.find(o=>o.id==='rq').rfq={q:0.33,due:'soon',r:7};sanitize(S)");
  assert.equal(ev("S.biz.some(b=>b.id==='j1')"), false, 'an unknown network goes');
  assert.deepEqual(J(ev, "(b=>[b.base,b.hist,b.tef])(S.biz.find(b=>b.id==='j2'))"), [20, [5, 7], 1]);
  assert.deepEqual(J(ev, "S.offers.find(o=>o.id==='rq').rfq"), { q: null, due: 0, r: 7 });
  ev("S.rules.mods=[];sanitize(S)");
  assert.equal(ev('S.biz.concat(S.offers).filter(o=>ntT(o.type)).length'), 0, 'without the option they have no place');
  assert.deepEqual(errors, []);
});
