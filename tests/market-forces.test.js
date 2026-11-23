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
  sw.click();
  assert.equal(doc.querySelector('[data-mode-id=forces]').getAttribute('aria-checked'), 'true');
  assert.equal(doc.querySelector('#fsTog'), null, 'picking it hides the Multimode switch');
  ev("ACT.start({});if(UI.pendGame)ACT.pitchSkip()");
  assert.deepEqual(mods(ev), ['forces']);
  assert.equal(ev('S.fed'), null);
  assert.equal(ev('fedEligible(S)'), false);
  assert.deepEqual(errors, []);
});
