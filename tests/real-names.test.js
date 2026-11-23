// Real company names (Settings): a display-only relabel of the puns, off by default, never touching S or the save.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const frame = (dom) => new Promise((r) => dom.window.requestAnimationFrame(() => dom.window.requestAnimationFrame(() => r())));
const probe = `document.body.insertAdjacentHTML('beforeend','<div id="rnT" title="Cogentle rack">Peering with Cogentle and NetChill over Marea Carey</div><input id="rnI" value="Cogentle"><code id="rnC">Cogentle</code>')`;

test('off by default: nothing is relabelled', async (t) => {
  const { ev, dom, errors } = load();
  t.after(() => dom.window.close());
  ev('ACT.start({})');
  assert.equal(ev("pref('realNames')"), false);
  ev(probe);
  await frame(dom);
  assert.equal(ev("$('rnT').textContent"), 'Peering with Cogentle and NetChill over Marea Carey');
  assert.equal(ev("rnText('Cogentle')"), 'Cogent Communications', 'the table is there, just not applied');
  assert.deepEqual(errors, []);
});

test('on: page text and titles show real names; form fields, code, S and the save keep the puns', async (t) => {
  const { ev, dom, errors } = load({ storage: { 'sot-prefs': JSON.stringify({ realNames: true }) } });
  t.after(() => dom.window.close());
  ev('ACT.start({})');
  ev(probe);
  await frame(dom);
  assert.equal(ev("$('rnT').textContent"), 'Peering with Cogent Communications and Netflix over MAREA');
  assert.equal(ev("$('rnT').title"), 'Cogent Communications rack');
  assert.equal(ev("$('rnI').value"), 'Cogentle');
  assert.equal(ev("$('rnC').textContent"), 'Cogentle');
  // Text changed later (a re-render) is caught too.
  ev("$('rnT').firstChild.nodeValue='Goggle peers at DE-KICKS'");
  await frame(dom);
  assert.equal(ev("$('rnT').textContent"), 'Google peers at DE-CIX');
  // Whole words only, longest name first.
  assert.equal(ev("rnText('Southern Cross-ed Fingers NEXT')"), 'Southern Cross NEXT');
  assert.equal(ev("rnText('Cogentleman')"), 'Cogentleman');
  // Display only.
  assert.equal(ev('NET.cog.name'), 'Cogentle');
  ev('save(true)');
  const saved = ev(`(()=>{let o='';for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k!=='sot-prefs')o+=localStorage.getItem(k);}return o;})()`);
  assert.doesNotMatch(saved, /Cogent Communications|Netflix/);
  assert.deepEqual(errors, []);
});

test('the setting is one line in Display and sound, stored per device, and switching it reloads', (t) => {
  const { ev, dom, errors } = load();
  t.after(() => dom.window.close());
  ev("ACT.start({});window.innerWidth=360;window.innerHeight=640;ACT.settings({})");
  assert.match(ev("$('modal').textContent"), /Real company names/);
  let reloads = 0;
  ev('window.__rnReload=0');
  // jsdom cannot reload: count the attempts through save(), which the switch calls first.
  ev('const __sv=save;save=(...a)=>{window.__rnReload++;return __sv(...a);}');
  ev(`document.querySelector('#modal [data-act="prefSet"][data-args*="realNames:0"]').click()`);
  assert.equal(ev('window.__rnReload'), reloads, 'already off: nothing happens');
  ev(`document.querySelector('#modal [data-act="prefSet"][data-args*="realNames:1"]').click()`);
  assert.equal(ev('window.__rnReload'), ++reloads);
  assert.equal(JSON.parse(ev("localStorage.getItem('sot-prefs')")).realNames, true);
  assert.deepEqual(errors, []);
});
