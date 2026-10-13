# PageSweep 1.2.21 History Discovery — Preflight Test Report

Date: 2026-10-12 (development testing)
Status: **Automated checks passed; controlled Chrome extension smoke test NOT completed; do not release.**

## Source checks conducted

Executed the existing regression test logic against the current GitHub branch source in a JavaScript test harness with Node-compatible file, assertion and VM adapters (not the native Node test runner).

- `tests/nested-scroll-surface.test.cjs`: PASS — normalized positive/reverse positions and nested geometry.
- `tests/dynamic-stabilization.test.cjs`: PASS — static fast path, dynamic stabilization and bounded timeout.
- `tests/progress-animation.test.cjs`: PASS — progress/mascot position does not move backward.
- `tests/scroll-position.test.cjs`: PASS — document scroll position, reachability and rejection of blocked scrolling.

Additional extracted `discoverOldestReachableContent()` isolated scenarios:
- Stable nested panel: PASS — settled in 4 probes (~1.8 simulated seconds).
- Delayed older history: PASS — simulated +3,700 pixel growth, settled in 6 probes (~2.7 simulated seconds).
- Never-stabilizing content: PASS — expected incomplete-capture error rather than success.

Source JavaScript syntax: PASS (earlier branch validation).

## Controlled Chromium browser attempt

- Headless Chromium is installed in the execution environment.
- A local fixture with `flex-direction: column-reverse` and delayed older-message insertion was prepared.
- Both headless launch attempts **timed out without page output** (bus/socket startup diagnostics). No browser result can be scored as a pass or fail of PageSweep.
- This execution environment could not retrieve the private GitHub branch as an installable extension checkout due to network resolution restrictions.
- **No real extension end-to-end capture was executed.** No browser screenshots or downloaded PNGs were validated.

## Outstanding release gates

- Load `PageSweep (History Discovery Test)` version 1.2.21 in real Chrome.
- Confirm first historical message appears and no spinner is captured at apparent top.
- Confirm contiguous PNG content, no duplicate/missing frames and correct starting-position restoration.
- Run conventional long-page and short-page regressions, animated mascot and one-click PNG.
- Check Windows Chrome compatibility and ordinary page latency before merge.
- If loader is not exposed semantically or starts after quiet timeout, existing generic heuristics may still stop prematurely; verify against actual ChatGPT behavior.

**The release remains blocked pending browser validation and user approval.** Embedded code/prompt expansion is separate follow-up issue #4.
