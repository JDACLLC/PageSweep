# PageSweep 1.2.22 Restoration Test — Preflight report

Date: 2026-10-12
Status: **Isolated checks pass. Real Chrome extension smoke test pending. Do not merge/release.**

## Fix committed
- Retain the originally visible nested-panel DOM anchor and its viewport position before scrolling.
- Restore scroll offset while forcing instant/auto scrolling and disabling scroll anchoring; retry and verify after successive paint/render samples.
- When the anchor has been removed from the DOM, fall back to the original raw `scrollTop` (including negative values).
- Restore original CSS property values **and priority**, even if restoration fails.
- A verified restoration failure prevents success completion and is reported to the user.

## Simulated regression checks executed against current GitHub source
- `tests/nested-scroll-surface.test.cjs`: PASS
- `tests/dynamic-stabilization.test.cjs`: PASS
- `tests/progress-animation.test.cjs`: PASS
- `tests/scroll-position.test.cjs`: PASS
- `tests/panel-restoration.test.cjs`: PASS (shifted anchor, detached anchor fallback, blocked scroll)
- Capture and popup JavaScript syntax: PASS

Tests were executed in an isolated JavaScript harness with Node-compatible assertions and VM adapters, **not** a native `node --test` run or browser. They do not establish full screenshot stitching, PNG completeness or actual Chrome extension behavior.

## Outstanding release gates
1. Load PageSweep **1.2.22 Restoration Test** from `release-candidate/primary-scroll-1.2.20`.
2. Base44: capture from a recognizable middle passage and confirm *same content at same position* afterward.
3. Base44: repeat from top/bottom; inspect PNG beginning and end, missing content, feedback and auto-download.
4. ChatGPT: confirm oldest message present after dynamic history loading, correct position restoration.
5. Normal webpage (Fox News-style): full PNG, correct order, automatic download, no regression.
6. Popup mascot/progress, Windows compatibility and ordinary-page performance.
7. Ensure no false success if restoration is unsuccessful.

Embedded code/prompt expansion remains issue #4, not part of this candidate. Production `main` remains 0.2.18.
