const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/capture.js','utf8');
const begin = source.indexOf('  function expandVisibleEmbeddedScrollers()');
const end = source.indexOf('  function restoreInline(', begin);
assert.ok(begin > 0 && end > begin, 'embedded helpers must exist');
const styles = new Map([['height',['180px','']], ['max-height',['180px','']], ['overflow-y',['auto','']]]);
let savedScrollTop = 44;
const pane = {
  scrollHeight: 1800,
  get clientHeight() {
    return styles.get('height')?.[1] === 'important'
      ? Number.parseInt(styles.get('height')[0], 10) : 180;
  },
  get scrollTop() {return savedScrollTop;},
  set scrollTop(v) {savedScrollTop = v;},
  closest: () => null,
  getBoundingClientRect: () => ({ width: 650, height: 180, top: 200, bottom: 380 }),
  style: {
    getPropertyValue: p => styles.get(p)?.[0] || '',
    getPropertyPriority: p => styles.get(p)?.[1] || '',
    setProperty: (p,v,priority) => styles.set(p,[v,priority||'']),
    removeProperty: p => styles.delete(p),
  },
};
const host = { querySelectorAll: () => [pane], contains: e => e === pane };
const context = {
  scrollSurface: { kind: 'panel', element: host },
  document: { body: host },
  window: { innerWidth: 1200, innerHeight: 800 },
  getComputedStyle: () => ({ overflowY: 'auto' }),
  embeddedOriginalPositions: new Map(),
  maxEmbeddedRegions: 20,
  maxEmbeddedExpansion: 12000,
};
vm.createContext(context);
vm.runInContext('let totalEmbeddedExpansion = 0; '+source.slice(begin,end),context);
assert.equal(context.expandVisibleEmbeddedScrollers(),1620);
assert.equal(styles.get('overflow-y')[0],'hidden');
assert.equal(styles.get('height')[0],'1800px');
assert.equal(context.expandVisibleEmbeddedScrollers(),0,'deduplicate scrollers');
pane.scrollTop=0;
context.restoreEmbeddedScrollers();
assert.equal(styles.get('height')[0],'180px');
assert.equal(styles.get('overflow-y')[0],'auto');
assert.equal(pane.scrollTop,44);
console.log('Passed: embedded code expansion, deduplication and reversible restoration.');
