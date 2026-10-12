const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/capture.js', 'utf8');
const begin = source.indexOf('  function restoreInline(');
const end = source.indexOf('  function getDocumentHeight()', begin);
assert.ok(begin > 0 && end > begin, 'scroll surface helpers must exist');
const helpers = source.slice(begin, end);

function nested(reverse) {
  const root = { };
  const body = { };
  let rawTop = 0;
  const panel = {
    clientHeight: 648,
    scrollHeight: 25788,
    style: {},
    parentElement: body,
    get scrollTop() { return rawTop; },
    set scrollTop(value) {
      rawTop = Math.max(reverse ? -25140 : 0, Math.min(reverse ? 0 : 25140, value));
    },
    getBoundingClientRect() {
      return { left: 240, right: 1160, top: 100, bottom: 748 };
    },
  };
  const context = {
    document: { body, documentElement: root, elementFromPoint: () => panel },
    window: { innerWidth: 1200, innerHeight: 800, scrollY: 0,
      scrollTo({ top }) { this.scrollY = top; } },
    getDocumentHeight: () => 800,
    getComputedStyle: () => ({ overflowY: 'auto' }),
    captureStep: 648,
    scrollSurface: { kind: 'document' },
  };
  vm.createContext(context);
  vm.runInContext(helpers, context);
  const selected = context.selectScrollSurface();
  assert.equal(selected.kind, 'panel');
  assert.equal(selected.reverse, reverse);
  context.scrollSurface = selected;
  const max = panel.scrollHeight - panel.clientHeight;
  context.moveCaptureSurface(0);
  assert.equal(context.captureOffset(), 0);
  assert.equal(panel.scrollTop, reverse ? -max : 0);
  context.moveCaptureSurface(max / 2);
  assert.equal(context.captureOffset(), max / 2);
  context.moveCaptureSurface(max);
  assert.equal(context.captureOffset(), max);
  assert.equal(panel.scrollTop, reverse ? 0 : max);
  assert.equal(context.captureHeight(), 25940);
}

nested(false);
nested(true);
console.log('Passed: positive and reverse nested panels, normalized offsets, and panel capture height.');
