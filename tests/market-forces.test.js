// Market Forces mode (docs/proposals/realistic-market.md): a Normal-game option, picked once and locked.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const start = (ev, mods) => ev(`beginGame('Forces','fra',{mode:'normal',preset:'oncall'${mods ? `,rules:{mods:${JSON.stringify(mods)}}` : ''}});if(UI.pendGame)ACT.pitchSkip()`);
const mods = ev => JSON.parse(ev('JSON.stringify(S.rules.mods)'));

test('Market Forces is off unless picked', () => {
  const { ev, errors } = load();
  start(ev);
  assert.deepEqual(mods(ev), []);
  assert.equal(ev("modeOn('forces')"), false);
  assert.equal(ev('ruleTag()'), '');
  assert.deepEqual(JSON.parse(ev("JSON.stringify(makeRules('oncall').mods)")), []);
  assert.deepEqual(errors, []);
});

test('Market Forces stays on through a save, and shows in the HUD and share tag', () => {
  const { ev, errors } = load();
  start(ev, ['forces']);
  assert.deepEqual(mods(ev), ['forces']);
  assert.equal(ev("modeOn('forces')"), true);
  ev('S=migrate(JSON.parse(JSON.stringify(packSave(S))))');
  assert.deepEqual(mods(ev), ['forces']);
  assert.equal(ev("modeOn('forces')"), true);
  assert.equal(ev('ruleTag()'), 'Market Forces mode 📉');
  ev('renderAll()');
  assert.match(ev("document.getElementById('hAsn').textContent"), /📉/);
  ev('shareCanvas()');
  assert.deepEqual(errors, []);
});

test('Market Forces is dropped from Sandbox and scenarios, and unknown mods are ignored', () => {
  const { ev, errors } = load();
  start(ev, ['forces']);
  ev("S.mode='sandbox';S.rules.mods=['forces'];sanitize(S)");
  assert.deepEqual(mods(ev), []);
  assert.equal(ev("modeOn('forces')"), false);
  ev("beginGame('Scenario','stg',{scn:SCN.find(x=>x.id==='stg')});S.rules.mods=['forces'];sanitize(S)");
  assert.deepEqual(mods(ev), []);
  assert.equal(ev("modeOn('forces')"), false);
  assert.deepEqual(JSON.parse(ev("JSON.stringify(makeRules('oncall',{mods:['forces','bogus','forces']}).mods)")), ['forces']);
  assert.deepEqual(errors, []);
});

test('Market Forces is picked on the title screen and is played alone, without Multimode', () => {
  const { ev, dom, errors } = load();
  ev("FU.can=true;UI.mode='normal';UI.mods=[];UI.fs={on:false,url:null,typed:'',inv:null,note:null};showTitle()");
  const doc = dom.window.document;
  assert.ok(doc.querySelector('#fsTog'), 'Multimode is offered before any option is picked');
  doc.querySelector('.add-options summary').click();
  const sw = doc.querySelector('[data-mode-id=forces]');
  assert.ok(sw, 'the switch is in the options block');
  assert.equal(sw.getAttribute('aria-checked'), 'false');
  assert.match(doc.getElementById('modeName-forces').textContent, /Market Forces mode/);
  assert.match(doc.getElementById('modeDesc-forces').textContent, /transit you buy/);
  sw.click();
  assert.equal(doc.querySelector('[data-mode-id=forces]').getAttribute('aria-checked'), 'true');
  assert.equal(doc.querySelector('#fsTog'), null, 'picking it hides the Multimode switch');
  ev("ACT.start({});if(UI.pendGame)ACT.pitchSkip()");
  assert.deepEqual(mods(ev), ['forces']);
  assert.equal(ev('S.fed'), null);
  assert.equal(ev('fedEligible(S)'), false);
  assert.deepEqual(errors, []);
});

// Step 2: customer prices. The same game, priced with the option off and on.
const both = (ev, expr) => { ev("S.rules.mods=[]"); const off = JSON.parse(ev(`JSON.stringify(${expr})`)); ev("S.rules.mods=['forces']"); const on = JSON.parse(ev(`JSON.stringify(${expr})`)); ev("S.rules.mods=[]"); return { off, on }; };

test('with the option off, every customer price is the Classic one', () => {
  const { ev, errors } = load();
  start(ev);
  for (const [t, r] of [['isp', 15], ['provedor', 20], ['metav', 35], ['cgame', 45], ['dia', 600]]) assert.equal(ev(`bizRate('${t}')`), r, t);
  assert.equal(ev('l2Per(1000,BIZ_T.l2vpn)'), (150 + 1000 * 0.08) * 1);
  assert.equal(ev('l2Per(500,BIZ_T.hyper)'), (150 + 500 * 0.08) * 0.5);
  assert.equal(ev("reqBonus('diverse',BIZ_T.ai)"), 0.25);
  assert.equal(ev("rpRate('lon','fra')"), ev("Math.round((150+kmBetween('lon','fra')*0.08)*BIZ_T.rpeer.km*REMOTE_FEE)"));
  assert.equal(ev("capOffer('lon','fra','capw',()=>'Wave Co.').rate"), ev("Math.round((150+kmBetween('lon','fra')*0.08)*BIZ_T.capw.km)"));
  assert.deepEqual(errors, []);
});

test('Market Forces: transit types sell dearer, plain circuits cheaper, hard circuits pay double bonuses', () => {
  const { ev, errors } = load();
  start(ev, ['forces']);
  for (const [t, r] of [['isp', 45], ['provedor', 50], ['metav', 53], ['cgame', 59], ['dia', 600], ['host', 60], ['scrub', 900]]) assert.equal(ev(`bizRate('${t}')`), r, t);
  for (const t of ['l2vpn', 'ai', 'hyper', 'rpeer', 'capw', 'aiwan', 'onramp']) {
    const { off, on } = both(ev, `l2Per(2000,BIZ_T.${t})`);
    assert.ok(Math.abs(on - off * 0.3) < 1e-9, `${t}: ${on} is 0.3× ${off}`);
  }
  for (const t of ['hft', 'lowlat', 'flex', 'mars']) {
    const { off, on } = both(ev, `l2Per(2000,BIZ_T.${t})`);
    assert.equal(on, off, `${t} keeps its latency premium`);
  }
  ev("S.rules.mods=['forces']");
  assert.equal(ev("reqBonus('diverse',BIZ_T.ai)"), 0.5);
  assert.equal(ev("reqBonus('sharks',BIZ_T.l2vpn)"), 0.4);
  assert.equal(ev("reqBonus('local',BIZ_T.isp)"), 0.2, 'IP customers keep the Classic bonus');
  for (const t of ['hft', 'lowlat', 'flex', 'mars']) assert.equal(ev(`reqBonus('sharks',BIZ_T.${t})`), 0.2, `${t} keeps its Classic bonuses`);
  assert.deepEqual(errors, []);
});

test('Market Forces reaches the offers themselves: spotted, remote-port and capacity prices', () => {
  const { ev, errors } = load();
  start(ev, ['forces']);
  const km = ev("kmBetween('lon','fra')"), base = (150 + km * 0.08);
  const spot = both(ev, "(spawnSpot('sov',{a:'lon',b:'fra',k:'div',n:0}),S.offers[S.offers.length-1].rate)");
  assert.equal(spot.off, Math.round(base * 0.6 * 1.25));
  assert.equal(spot.on, Math.round(base * 0.6 * 0.3 * 1.5));
  const rp = both(ev, "rpRate('lon','fra')");
  assert.equal(rp.on, ev("Math.round((150+kmBetween('lon','fra')*0.08)*BIZ_T.rpeer.km*0.3*REMOTE_FEE)"));
  assert.ok(rp.on < rp.off);
  const cap = both(ev, "capOffer('lon','fra','capw',()=>'Wave Co.').rate");
  assert.equal(cap.on, Math.round(base * 0.45 * 0.3));
  const cg = both(ev, "(spawnSpot('cgame',{a:'fra',b:null,k:'eye',n:0}),S.offers[S.offers.length-1].rate)");
  assert.deepEqual(cg, { off: 45, on: 59 });
  assert.deepEqual(errors, []);
});

// Step 3: bought transit has its own market, flat for 180 days, then 8% cheaper a year down to 40% of its list price.
const port = "({id:'tx',net:'lvl',city:'fra',tier:1,n:1})";
test('with the option off, bought transit keeps its list price for ever', () => {
  const { ev, errors } = load();
  start(ev);
  const list = ev("transitPerG(NET.lvl,'fra',false)");
  for (const d of [0, 181, 900, 9000]) {
    ev(`S.day=${d}`);
    assert.equal(ev('mfBuy()'), 1, `day ${d}`);
    assert.equal(ev("transitPerG(NET.lvl,'fra',false)"), list, `day ${d}`);
  }
  assert.deepEqual(errors, []);
});

test('Market Forces: bought transit is flat for 180 days, then 8% cheaper a year, never under 40%', () => {
  const { ev, errors } = load();
  start(ev, ['forces']);
  ev('S.day=0');
  const list = ev("transitPerG(NET.lvl,'fra',false)"), mo0 = ev(`transitMo(${port},50)`), fee = ev('PORT[1].tmo');
  assert.equal(ev('mfBuy(180)'), 1, 'the first six months are flat, so a new network starts on list prices (F2)');
  assert.ok(Math.abs(ev('mfBuy(180+365)') - 0.92) < 1e-9);
  assert.ok(Math.abs(ev('mfBuy(180+730)') - 0.92 * 0.92) < 1e-9);
  assert.equal(ev('mfBuy(180+365*30)'), 0.4);
  ev('S.day=180+365');
  assert.ok(Math.abs(ev("transitPerG(NET.lvl,'fra',false)") - list * 0.92) < 1e-9, 'the price per Gbps');
  assert.ok(Math.abs((ev(`transitMo(${port},50)`) - fee) - (mo0 - fee) * 0.92) < 1e-6, 'the monthly bill; the port fee does not move');
  assert.match(ev("netMore(NET.lvl,'',false,false)"), new RegExp(`transit \\$${(ev('NET.lvl.price*S.priceMul') * 0.92).toFixed(2)}/Gbps`), 'the Networks tab shows the price you would pay');
  ev("S.rules.market=false");
  assert.equal(ev('mfBuy()'), 1, 'without the market rule nothing moves, as for customers');
  ev('S.rules.market=true;S.mode="sandbox"');
  assert.equal(ev('mfBuy()'), 1, 'only in a Normal game');
  assert.deepEqual(errors, []);
});

test('Market Forces: wholesale transit sold in the hubs never sinks below what it costs to buy there', () => {
  const { ev, errors } = load();
  start(ev, ['forces']);
  for (const d of [0, 400, 1500, 4000, 9000]) {
    ev(`S.day=${d}`);
    const sell = ev("bizRate('isp')*mkt()");
    for (const c of ['fra', 'lon', 'ams', 'nyc', 'ash', 'chi']) {
      const buy = ev(`Math.max(...NETS.filter(n=>sellsAt(n,'${c}')).map(n=>transitPerG(n,'${c}',false)*S.priceMul))`);
      assert.ok(sell > buy, `day ${d}, ${c}: sells at ${sell}, buys at up to ${buy}`);
    }
  }
  assert.deepEqual(errors, []);
});

test('every km-priced circuit goes through l2Per(), so no price site can skip the option', () => {
  const fs = require('node:fs'), path = require('node:path');
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
  const re = /150\s*\+[^;]*?\*\s*0\.08\b/;
  for (const old of ['(150+kmBetween(city,city2)*0.08)*T.km', '(150+km*0.08)*T.km', '(150 + avg * 0.08)*0.6', '(150+kmBetween(a,b)*0.08)*BIZ_T.rpeer.km']) assert.match(old, re, old);
  const hits = walk(path.join(__dirname, '..', 'src', 'game')).filter(f => re.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(hits.map(f => path.basename(f)), ['35-market-forces.js']);
});
