const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/capture.js', 'utf8');
const start = source.indexOf('  async function ensureCapturePosition(');
const end = source.indexOf('  async function decodeVisibleImages(', start);
assert.ok(start >= 0 && end > start);
function fixture(initialY, move = (w, options) => { w.scrollY = options.top; }) {
  const calls = [];
  const window = { scrollY: initialY, innerHeight: 1251, scrollTo(options) {
    assert.equal(options.behavior, 'instant'); calls.push(options); move(this, options);
  }};
  const context = { window, originalScrollX: 0, getDocumentHeight: () => 14669,
    waitForStylePaint: async () => {} };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return { window, calls, ensure: context.ensureCapturePosition };
}
(async () => {
  const bottom = fixture(2100.5);
  await bottom.ensure(0); assert.equal(bottom.window.scrollY, 0);
  await bottom.ensure(1251); assert.equal(bottom.window.scrollY, 1251);
  await bottom.ensure(15000); assert.equal(bottom.window.scrollY, 13418);
  const settled = fixture(0); await settled.ensure(0); assert.equal(settled.calls.length, 0);
  let attempts = 0;
  const drift = fixture(2232.5, (w, o) => { if (++attempts > 1) w.scrollY = o.top; });
  await drift.ensure(0); assert.equal(attempts, 2);
  const blocked = fixture(2100.5, () => {});
  await assert.rejects(blocked.ensure(0), /would not stay/); assert.equal(blocked.calls.length, 3);
  console.log('Passed: bottom-start correction, contiguous next position, reachable endpoint, bounded retry, and blocked-scroll rejection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
