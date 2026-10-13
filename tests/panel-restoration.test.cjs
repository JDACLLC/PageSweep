const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("src/capture.js", "utf8");
const start = source.indexOf("  async function restoreOriginalPanelPosition()");
const end = source.indexOf("  // Bounded viewport sampling", start);
assert.ok(start > 0 && end > start, "Panel restoration function must exist");

async function scenario(mode) {
  let now = 0;
  let scroll = 0;
  const panel = {
    get scrollTop() { return scroll; },
    set scrollTop(v) { if (mode !== "blocked") scroll = v; },
    get scrollHeight() { return 3000; },
    contains() { return true; },
  };
  const anchor = {
    isConnected: mode !== "detached",
    getBoundingClientRect: () => ({ top: (mode === "blocked" ? 300 : 220) - scroll }),
  };
  const sandbox = {
    scrollSurface: { element: panel },
    originalPanelAnchor: { element: anchor, top: 120 },
    surfaceOriginalY: -120,
    performance: { now: () => now },
    waitForStylePaint: async () => {},
    delay: async ms => { now += ms; },
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start, end), sandbox);
  if (mode === "blocked") {
    await assert.rejects(sandbox.restoreOriginalPanelPosition(), /did not settle/);
    return;
  }
  const result = await sandbox.restoreOriginalPanelPosition();
  assert.equal(result.restored, true);
  assert.equal(result.anchored, mode === "anchor");
  assert.equal(scroll, mode === "anchor" ? 100 : -120);
  assert.ok(result.attempts >= 3, "Restoration must remain stable across samples");
}

(async () => {
  await scenario("anchor");
  await scenario("detached");
  await scenario("blocked");
  console.log("Passed: visual-anchor restoration, detached fallback, and blocked scrolling rejection.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
