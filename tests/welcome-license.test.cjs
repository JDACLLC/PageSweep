const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const license = fs.readFileSync("LICENSE", "utf8");
const script = fs.readFileSync("src/license.js", "utf8");
const guide = fs.readFileSync("about.html", "utf8");
const terms = fs.readFileSync("license.html", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

class Element {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.textContent = ""; }
  appendChild(child) { this.children.push(child); return child; }
  append(text) { this.textContent += String(text); }
  replaceChildren() { this.children = []; this.textContent = ""; }
  get lastElementChild() { return this.children.at(-1) || null; }
}

(async () => {
  const content = new Element("div");
  const meta = new Element("div");
  const errors = [];
  const sandbox = {
    document: {
      querySelector: selector => selector === "#license-content" ? content : meta,
      createElement: tag => new Element(tag),
    },
    chrome: { runtime: { getURL: name => name } },
    fetch: async () => ({ ok: true, text: async () => license }),
    console: { error: (...args) => errors.push(args) },
  };
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  for (let i = 0; i < 20; i++) await Promise.resolve();

  assert.equal(errors.length, 0);
  assert.equal(content.children.filter(child => child.tagName === "SECTION").length, 8);
  assert.ok(meta.children.some(child => child.textContent.includes("Version 1.0")));
  assert.ok(meta.children.some(child => child.textContent.includes("JDAC LLC")));
  assert.equal(content.children.flatMap(section => section.children)
    .filter(child => child.tagName === "UL").flatMap(list => list.children).length, 6);
  assert.ok(guide.includes('src="icons/toolbar/mascot-glyph-128.png"'));
  assert.ok(guide.includes('href="license.html"'));
  assert.ok(guide.includes('href="https://lab.jdac.ai/labs/pagesweep/privacy"'));
  assert.ok(terms.includes('src="src/license.js"'));
  assert.equal(manifest.version, "1.2.25");
  console.log("Passed: welcome mascot, separate policy links, and eight original license sections.");
})().catch(error => { console.error(error); process.exitCode = 1; });
