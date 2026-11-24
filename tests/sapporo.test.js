const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const start = "ACT.start({});S.cash=1e9;S.nextFail=1e9;S.nextEvent=1e9;for(const g of GOALS)S.done[g.id]=0";

test('Sapporo is a Japanese city on Hokkaido, with an exchange, transit and calibration', () => {
  const { ev, errors } = load();
  ev(start);
  assert.equal(ev('CITY.spk.name'), 'Sapporo');
  assert.equal(ev('CITY.spk.cc'), 'JP');
  assert.equal(ev('CITY.spk.ix'), 'Jingisukan-IX');
  assert.equal(ev('onLand(CITY.spk.x,CITY.spk.y)'), true, 'Sapporo is on drawn land');
  assert.equal(ev("NETS.some(n=>sellsAt(n,'spk'))"), true, 'Sapporo has a transit seller');
  assert.equal(ev('CITY_PDB.spk.length'), 3);
  assert.equal(ev("NETS.some(n=>n.ix.includes('spk'))"), true, 'someone peers at Jingisukan-IX');
  for (const n of ['ntt', 'kdi', 'dcm']) assert.equal(ev(`NET.${n}.pops.includes('spk')`), true, `${n} is in Sapporo`);
  assert.deepEqual(errors, []);
});

test('Hokkaido joins Honshu over land (the Seikan Tunnel), and only the sea reaches Sakhalin', () => {
  const { ev, errors } = load();
  ev(start);
  assert.equal(ev("isSub('spk','tok')"), false, 'Sapporo to Tokyo is overland');
  assert.equal(ev("isSub('spk','fuk')"), false, 'Sapporo to Fukuoka is overland');
  assert.equal(ev("isSub('spk','uus')"), true, 'Sapporo to Sakhalin is subsea');
  assert.deepEqual(errors, []);
});

test('Hokkaido Hop lands at Sapporo, and keeps its Tokyo pair so saved links keep their cable', () => {
  const { ev, errors } = load();
  ev(start);
  assert.deepEqual(JSON.parse(ev("JSON.stringify(CABLES.find(c=>c.id==='hscs').pairs.map(p=>p.slice(0,2)))")), [['uus', 'tok'], ['uus', 'spk']]);
  const wp = JSON.parse(ev("JSON.stringify(CABLES.find(c=>c.id==='hscs').pairs[1][2].map(w=>{const q=proj(w[0],w[1]);return onLand(q[0],q[1])}))"));
  assert.ok(wp.every((x) => !x), 'every waypoint to Sapporo is at sea');
  assert.equal(ev("!!cablePair('hscs','uus','spk')"), true);
  for (const z of [0.35, 1.4, 6]) ev(`cam.z=${z};draw(performance.now())`);
  assert.deepEqual(errors, []);
});

test('an old save gains Sapporo and keeps its POPs and its Hokkaido Hop link', () => {
  const { ev, errors } = load();
  ev(start);
  ev("S.pops.uus={day:0,bb:null,boost:0,down:0,routers:1,gen:false};S.links.push({id:'l9',a:'uus',b:'tok',kind:'wave',tier:0,km:kmBetween('uus','tok'),sub:true,cable:'hscs',mo:1,cut:0})");
  const saved = ev('JSON.stringify(S)');
  ev(`S=sanitize(JSON.parse(${JSON.stringify(saved)}))`);
  assert.equal(ev("S.links.find(l=>l.id==='l9').cable"), 'hscs');
  assert.equal(ev("!!S.pops.uus"), true);
  assert.equal(ev("cityOn('spk')"), true, 'Sapporo is on the map of an old save');
  assert.deepEqual(errors, []);
});
