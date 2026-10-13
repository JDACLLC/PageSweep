const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("popup.js", "utf8");
const make = () => ({ style: {}, classList: { add() {}, remove() {} }, textContent: "" });
const elements = {
  "#card": make(), "#status": make(), "#bar": make(), "#robot-position": make(),
};
let messageHandler;
const context = {
  document: { querySelector: (selector) => elements[selector] },
  chrome: { runtime: {
    onMessage: { addListener: (handler) => { messageHandler = handler; } },
    sendMessage: () => Promise.resolve({ ok: true }),
  } },
  setTimeout: () => 1,
  clearTimeout: () => {},
  window: { close() {} },
};
vm.createContext(context);
vm.runInContext(source, context);
function progress(value) {
  messageHandler({ type: "popup-progress", status: "Capturing", progressPercent: value });
  return { bar: elements["#bar"].style.width, robot: elements["#robot-position"].style.left };
}
assert.deepEqual(progress(70), { bar: "70%", robot: "70%" });
assert.deepEqual(progress(45), { bar: "70%", robot: "70%" });
assert.deepEqual(progress(85), { bar: "85%", robot: "85%" });
console.log("Passed: mascot and progress bar never reverse when estimated capture length increases.");
