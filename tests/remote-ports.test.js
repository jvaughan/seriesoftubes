const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

// London home, an exchange founded in Bude, and POPs on other continents joined to London by waves.
const FAR = ['nyc', 'sao', 'tok', 'sin', 'jnb'];
function setup(ev, mods) {
  ev(`beginGame('Remote','lon',{mode:'normal',preset:'oncall'${mods ? `,rules:{mods:${JSON.stringify(mods)}}` : ''}});if(UI.pendGame)ACT.pitchSkip();S.cash=1e12;S.lvl=LEVELS.length;for(const g of GOALS)S.done[g.id]=0`);
  ev("ACT.buildPop({city:'bde'})");
  for (const c of FAR) ev(`ACT.buildPop({city:'${c}'})`);
  ev(`for(const c of ['bde',...${JSON.stringify(FAR)}])S.links.push({id:'w'+c,a:'lon',b:c,kind:'wave',tier:LT.length-1,km:kmBetween('lon',c),sub:c!=='bde',cut:0,mo:1,day:0});compute()`);
}
const found = ev => ev("ACT.foundIx({city:'bde'});S.myIx.bde.fab=MYIX_FAB.length-1;compute()");

test('remote port offers come only from far networks that accept remote peering', () => {
  const { ev, errors } = load();
  setup(ev);
  assert.equal(ev('rpOn()'), false, 'no exchange of your own, nothing to sell');
  found(ev);
  assert.equal(ev('rpOn()'), true);
  const cands = JSON.parse(ev("JSON.stringify(rpCands('bde'))"));
  assert.ok(cands.length > 0, 'networks on other continents can buy a remote port');
  const bad = JSON.parse(ev(`JSON.stringify(rpCands('bde').filter(x=>{const n=NET[x.net];return !S.pops[x.city]||n.fed||n.type==='t1'||noRemote(n.id)||!n.pops.includes(x.city)||n.pops.some(p=>CITY[p].reg===CITY.bde.reg);}))`));
  assert.deepEqual(bad, [], 'every candidate is far away, willing, and starts at a POP of yours where it already is');
  ev('S.offers=[];rpOffer()');
  const o = JSON.parse(ev("JSON.stringify(S.offers[0])"));
  assert.equal(o.type, 'rpeer');
  assert.equal(o.city2, 'bde');
  assert.ok(cands.some(x => x.net === o.net && x.city === o.city));
  assert.equal(o.rate, ev(`rpRate('${o.city}','bde')`));
  ev('S.offers=[];for(let i=0;i<400;i++)spawnOffer()');
  assert.ok(ev("S.offers.some(o=>o.type==='rpeer')"), 'the daily customer calls include remote ports');
  assert.deepEqual(errors, []);
});

test('an accepted remote port is a member, peers, rides the backbone and pays', () => {
  const { ev, errors } = load();
  setup(ev);
  found(ev);
  // A willing open network, so the session is certain.
  const x = JSON.parse(ev("JSON.stringify(rpCands('bde').find(x=>NET[x.net].pol==='open'))"));
  assert.ok(x, 'an open network far away');
  ev(`S.offers=[{id:'rp1',city:'${x.city}',city2:'bde',net:'${x.net}',name:NET['${x.net}'].name,type:'rpeer',bw:10,rate:rpRate('${x.city}','bde'),reqs:[],exp:S.day+40}]`);
  const before = ev('compute(),R.rev.business');
  ev("ACT.accept({id:'rp1'});compute()");
  const b = JSON.parse(ev("JSON.stringify(S.biz.find(b=>b.type==='rpeer'))"));
  assert.equal(b.net, x.net, 'the customer remembers its network');
  assert.equal(ev(`ixMembers('bde').includes('${x.net}')`), true);
  assert.equal(ev(`ixSessions('bde').has('${x.net}')`), true);
  assert.equal(ev(`S.myIx.bde.members.includes('${x.net}')`), false, 'it takes no local member slot');
  assert.equal(ev(`R.l2['${b.id}']`), 10, 'the circuit is carried in full');
  assert.ok(ev('R.rev.business') - before >= 10 * b.rate * 0.99, 'and paid for');
  assert.equal(ev("rpVia('bde','" + x.net + "')"), x.city);
  assert.match(ev("selectCity('bde');ixBlock('bde',false)"), new RegExp(ev("esc(tr('remote_ports.remote_ports'))")));
  assert.deepEqual(errors, []);
});

test('remote ports are capped at half the fabric members, offers included', () => {
  const { ev, errors } = load();
  setup(ev);
  found(ev);
  const max = ev("rpMax('bde')");
  assert.equal(max, ev('Math.floor(MYIX_FAB[MYIX_FAB.length-1].max/2)'));
  ev(`S.offers=[];for(let i=0;i<${max};i++)S.offers.push({id:'f'+i,city:'nyc',city2:'bde',net:NETS[i].id,name:'x',type:'rpeer',bw:10,rate:1,reqs:[],exp:S.day+40});rpOffer()`);
  assert.equal(ev("S.offers.filter(o=>o.type==='rpeer').length"), max, 'a full exchange gets no more offers');
  assert.equal(ev("S.myIx.bde.members.length<myFab('bde').max"), true, 'local members are counted separately');
  assert.deepEqual(errors, []);
});

test('closing the exchange POP ends its remote ports; saves are checked', () => {
  const { ev, errors } = load();
  setup(ev);
  found(ev);
  const x = JSON.parse(ev("JSON.stringify(rpCands('bde')[0])"));
  ev(`S.offers=[{id:'rp1',city:'${x.city}',city2:'bde',net:'${x.net}',name:'x',type:'rpeer',bw:10,rate:100,reqs:[],exp:S.day+40}];ACT.accept({id:'rp1'})`);
  assert.equal(ev("S.biz.filter(b=>b.type==='rpeer').length"), 1);
  // A save round trip keeps it; a bogus network or a missing exchange is dropped.
  assert.equal(ev("sanitize(JSON.parse(JSON.stringify(S))).biz.filter(b=>b.type==='rpeer').length"), 1);
  assert.equal(ev("(()=>{const s=JSON.parse(JSON.stringify(S));s.biz.find(b=>b.type==='rpeer').net='nope';return sanitize(s).biz.filter(b=>b.type==='rpeer').length})()"), 0);
  assert.equal(ev("(()=>{const s=JSON.parse(JSON.stringify(S));delete s.myIx.bde;return sanitize(s).biz.filter(b=>b.type==='rpeer').length})()"), 0);
  ev("decommission(['bde'])");
  assert.equal(ev("S.biz.filter(b=>b.type==='rpeer').length"), 0);
  assert.deepEqual(errors, []);
});

test('no remote port offers in Outcast mode', () => {
  const { ev, errors } = load();
  setup(ev, ['outcast']);
  found(ev);
  assert.equal(ev('!!S.myIx.bde'), true);
  assert.equal(ev('rpOn()'), false);
  assert.deepEqual(errors, []);
});

test('far networks ask less often but are never ruled out, and a bigger exchange pulls harder', () => {
  const { ev, errors } = load();
  setup(ev);
  found(ev);
  // The fall-off: whole at the door, half at RP_KM, small but never zero across the planet.
  assert.equal(ev('rpFar(0)'), 1);
  assert.equal(ev('rpFar(RP_KM)'), 0.5);
  assert.ok(ev('rpFar(20000)') > 0, 'no distance is forbidden');
  assert.equal(ev('[0,1000,3000,6000,12000].every((k,i,a)=>!i||rpFar(k)<rpFar(a[i-1]))'), true, 'farther is always less likely');
  // Drawn offers lean nearer than the pool they come from.
  const r = JSON.parse(ev(`(()=>{__reseed(7);const pool=rpCands('bde'),avg=a=>a.reduce((s,x)=>s+x,0)/a.length,got=[];
    for(let i=0;i<300;i++){S.offers=[];rpOffer();got.push(kmBetween(S.offers[0].city,'bde'));}
    return JSON.stringify({pool:avg(pool.map(x=>x.km)),got:avg(got)});})()`));
  assert.ok(r.got < r.pool * 0.9, `offers come from nearer than the average candidate (${Math.round(r.got)} vs ${Math.round(r.pool)} km)`);
  // A second exchange with no members against Bude with 40: Bude gets most of the calls.
  ev("ACT.buildPop({city:'mla'});S.links.push({id:'wmla',a:'lon',b:'mla',kind:'wave',tier:LT.length-1,km:kmBetween('lon','mla'),sub:true,cut:0,mo:1,day:0});ACT.foundIx({city:'mla'});S.myIx.mla.fab=MYIX_FAB.length-1;S.myIx.bde.members=NETS.filter(n=>!n.fed&&n.type!=='t1').slice(0,40).map(n=>n.id);compute()");
  const bde = ev("(()=>{__reseed(9);let n=0;for(let i=0;i<200;i++){S.offers=[];rpOffer();if(S.offers[0].city2==='bde')n++;}return n;})()");
  assert.ok(bde > 160, `the exchange with 40 members draws most remote ports (${bde} of 200)`);
  assert.deepEqual(errors, []);
});
