const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("src/capture.js", "utf8");
const start = source.indexOf("  function visibleContentSignature()");
const end = source.indexOf("  async function waitForStylePaint()", start);
assert.ok(start >= 0 && end > start, "Adaptive stabilizer must exist");

async function scenario({ changeUntil = 0, alwaysChanging = false } = {}) {
  let elapsed = 0;
  const document = {
    elementFromPoint: () => ({
      tagName: "DIV",
      closest: () => null,
      getBoundingClientRect: () => ({ top: 1, height: 30 }),
      get innerText() {
        return (alwaysChanging || elapsed < changeUntil)
          ? "rebuilding-" + elapsed
          : "settled";
      },
    }),
  };
  const sandbox = {
    document,
    window: { innerWidth: 1200, innerHeight: 800 },
    performance: { now: () => elapsed },
    getDocumentHeight: () => 3000,
    getVisibleImages: () => [],
    waitForStylePaint: async () => {},
    delay: async (ms) => { elapsed += ms; },
    decodeVisibleImages: async () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start, end), sandbox);
  return { result: await sandbox.waitForPageToSettle(), elapsed };
}

(async () => {
  const ordinary = await scenario();
  assert.equal(ordinary.result.timedOut, false);
  assert.equal(ordinary.result.dynamicContent, false);
  assert.ok(ordinary.elapsed <= 650, "Ordinary pages retain fast settling");

  const dynamic = await scenario({ changeUntil: 900 });
  assert.equal(dynamic.result.timedOut, false);
  assert.equal(dynamic.result.dynamicContent, true);
  assert.ok(dynamic.elapsed > ordinary.elapsed, "Dynamic pages get extra stabilization");

  const unstable = await scenario({ alwaysChanging: true });
  assert.equal(unstable.result.timedOut, true);
  assert.equal(unstable.result.dynamicContent, true);
  assert.ok(unstable.elapsed <= 3700, "Rendering retries must remain bounded");
  console.log("Passed: static fast path, dynamic stabilization, and bounded failure.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
