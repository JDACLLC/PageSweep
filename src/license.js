// LICENSE is the authoritative document. Render its words verbatim rather
// than maintaining another copy of the beta license's legal terms in HTML.
(async () => {
  const content = document.querySelector("#license-content");
  const meta = document.querySelector("#legal-meta");
  try {
    const response = await fetch(chrome.runtime.getURL("LICENSE"));
    if (!response.ok) throw new Error("License file unavailable");
    const raw = (await response.text()).replace(/\r\n/g, "\n").trim();
    const blocks = raw.split(/\n\s*\n/);
    const headerLines = (blocks.shift() || "").split("\n");
    if (headerLines[0] !== "PageSweep Beta Evaluation License") throw new Error("Unexpected license format");
    // The authoritative LICENSE has the version directly under its title,
    // followed by a blank line and a separate copyright block.
    const metaLines = [...headerLines.slice(1), ...(blocks.shift() || "").split("\n")];
    for (const line of metaLines) {
      const item = document.createElement("p");
      item.textContent = line;
      meta.appendChild(item);
    }
    content.replaceChildren();
    for (const block of blocks) {
      const lines = block.split("\n");
      const heading = /^\d+\.\s+.+$/.test(lines[0]);
      if (heading) {
        const section = document.createElement("section");
        const h2 = document.createElement("h2");
        h2.textContent = lines[0];
        section.appendChild(h2);
        appendText(section, lines.slice(1).join("\n"));
        content.appendChild(section);
      } else {
        const section = content.lastElementChild || content;
        appendText(section, block);
      }
    }
  } catch (error) {
    content.replaceChildren();
    const p = document.createElement("p");
    p.textContent = "The license couldn't be displayed. You can read the original LICENSE file included with your PageSweep download.";
    p.className = "error";
    content.appendChild(p);
    console.error("PageSweep license display failed", error);
  }

  function appendText(parent, text) {
    if (!text.trim()) return;
    const lines = text.split("\n");
    let bullets = null;
    for (const line of lines) {
      if (line.startsWith("- ")) {
        if (!bullets) {
          bullets = document.createElement("ul");
          parent.appendChild(bullets);
        }
        const li = document.createElement("li");
        li.textContent = line.slice(2);
        bullets.appendChild(li);
      } else if (bullets && /^\s{2,}\S/.test(line)) {
        // Continuation of the previous list item in the plain-text LICENSE.
        bullets.lastElementChild.textContent += " " + line.trim();
      } else {
        bullets = null;
        let p = parent.lastElementChild;
        if (!p || p.tagName !== "P") {
          p = document.createElement("p");
          parent.appendChild(p);
        } else if (p.textContent) {
          p.append(" ");
        }
        p.append(line.trim());
      }
    }
  }
})();
