// Local fork: Serious Tubes text (SERIOUS_EN) is keyed by label, and the build gives labels short ids. It has to be
// re-keyed with them, or the shipped page merges 600 entries nothing reads and the setting only works in npm run dev.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { load } = require('./harness');
const { pageFile } = require('../scripts/lib/page');

const file = path.join(os.tmpdir(), `tubes-serious-${process.pid}.html`);
test.after(() => fs.rmSync(file, { force: true }));

test('in the shipped page every Serious Tubes entry replaces an English one', (t) => {
  pageFile(file);
  const h = load({ file, storage: { 'sot-prefs': JSON.stringify({ serious: true }) } });
  t.after(() => h.dom.window.close());
  assert.equal(h.ev('LANG'), 'en');
  const r = JSON.parse(h.ev(`JSON.stringify((()=>{const ks=Object.keys(SERIOUS_EN),en=window.I18N.en;
    return {n:ks.length,missing:ks.filter(k=>!(k in en)).slice(0,5),used:ks.filter(k=>DICT[k]===SERIOUS_EN[k]||typeof SERIOUS_EN[k]!=='string').length};})())`));
  assert.ok(r.n > 500, `the table is there (${r.n})`);
  assert.deepEqual(r.missing, [], 'every key is a key of the shipped English');
  assert.ok(r.used > r.n * 0.9, `the game reads the serious text (${r.used} of ${r.n})`);
  assert.deepEqual(h.errors, []);
});

test('the build refuses a Serious Tubes label with no English', () => {
  const { compile } = require('../scripts/lib/compile-labels');
  const html = `<script>(window.I18N=window.I18N||{}).en={\n"a.b_c":"x"\n};\nconst SERIOUS_EN={\n"a.b_c":"y",\n"a.gone_now":"z"\n};\ntr('a.b_c')</script>`;
  assert.throws(() => compile(html, { 'a.b_c': 'x' }, {}), /SERIOUS_EN=\{ has labels with no English: a\.gone_now/);
  const ok = compile(html.replace(',\n"a.gone_now":"z"', ''), { 'a.b_c': 'x' }, {}).html;
  assert.match(ok, /const SERIOUS_EN=\{\n"0":"y"\n\};/, 're-keyed with the English id');
});
