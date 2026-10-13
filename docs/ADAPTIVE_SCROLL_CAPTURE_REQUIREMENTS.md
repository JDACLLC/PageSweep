# Adaptive Scroll Capture: Requirements and Release Gates

Status: **Full target scope specification. RC implements primary nested/reverse scrolling only; embedded pane functionality deferred to `test/chatgpt-capture`.**  
Target: **1.2.20 Adaptive Capture Test** (test branch only; not production).  
Scope: existing PageSweep capture engine; no second engine or user experience redesign.  
Branch: `test/chatgpt-capture`; production `main` must remain unchanged until acceptance.

## 1. Observed evidence (2026-10-12)

- PageSweep 0.2.19: a long Fox News page scrolls and captures successfully; mascot animation works.
- PageSweep 0.2.19: long ChatGPT and Base44 pages each download only one viewport, without moving the relevant application content.
- GoFullPage was directly observed scrolling through a long ChatGPT conversation; its specific technique is not established.
- ChatGPT has an internal `DIV.thread-scroll-container`, computed `overflow-y: auto` and `flex-direction: column-reverse`. Observed `scrollHeight=25788`, `clientHeight=648`, `scrollTop=0`.
- Positive `scrollTop=400` clamped to 0. Negative `scrollTop=-400` held.
- Programmatic scroll test navigated `0 -> -25140 -> -12735 -> 0`, visibly moving the conversation, and original `scrollTop=0` was restored.
- During that test `scrollHeight` increased from 25788 to 26118 (330 CSS pixels), expanding the maximum negative distance from 25140 to 25470. Boundary growth must be handled; an initial endpoint calculation is not sufficient.
- We **have not** yet proven PageSweep's precise failure on Base44 is caused by the same layout, nor established how much content ChatGPT virtualizes, nor validated nested-panel image compositing or full coverage.

## 2. Non-negotiable product invariants

1. Preserve **one-click capture -> automatic PNG download**, with no intermediary preview, export choice, manual download, or PDF screen.
2. Preserve existing mascot appearance, flight path, hover/plume and toolbar animation; progress must be monotonic even if the capture estimate changes. Completion/error state stays accurate.
3. Keep the **single existing capture engine**, its Chrome MV3 service-worker flow, offscreen stitcher, safeguards and cleanup paths. No separate ChatGPT engine and no domain-specific capture implementation.
4. Preserve successful conventional document capture, fixed/sticky suppression, scrolling restoration, large-image downscaling, rate limiting, Windows/Chrome compatibility fallbacks, and existing download behavior.
5. No modification to production `main` until release gates are satisfied. No changes to other GitHub owners or installations.
6. Only capture a page upon the user's explicit action, retaining narrow extension permissions. Never transmit page content for analysis.

## 3. Adaptive scroll-surface selection

**Requirements:**

- Discover the effective vertical scroll surface *at runtime*, not by hostname, exact CSS class, browser OS, or application identity. Handle window/document, one meaningful primary nested panel, reverse-direction nested panels, and **one level of meaningful embedded scrollers within primary content**. The primary scroller and its embedded children are a bounded capture hierarchy, not separate engines.
- On the **ordinary document fast path**, reuse the current scroll strategy with minimal detection work. Avoid full-document scans, artificial delays, and costly watchers unless necessary. Screen-level sampling and limited ancestor traversal are preferable.
- Prefer a genuinely visible, dominant content scroller over sidebars, tiny widgets, menus and hidden elements. Candidate assessment must consider scrollable extent (`scrollHeight > clientHeight`), visible bounds, computed overflow, dimensions, pointer/viewport geometry and whether a small reversible scroll command actually moves the content.
- Detection must handle `overflow-y: auto/scroll`, effective `document.scrollingElement`, and cases where the page has several nested scroll candidates. Do not silently choose an ambiguous target and claim completion.
- Support positive and negative effective scroll ranges through a normalized model (e.g. visual offset from oldest/top of *chosen content*, independent of raw `scrollTop`). Do **not** assume `scrollTop >= 0`; do **not** assume `flex-direction: column-reverse` is the only way scrolling can be inverted. Confirm actual reachable endpoints by controlled movement.
- When there are multiple meaningful **peer** scrollers, define an explicit primary-capture policy and report unsupported/ambiguous cases. Embedded scrollers that belong to the chosen primary content are different from unrelated peers: those are included under the bounded one-level rule below. Do not promise simultaneous capture of unrelated independent panels.
- Record selection diagnostics (surface kind, dimensions, direction, reachable range, reason for selection) without logging private message text.

## 4. Embedded scrolling regions: included scope and exclusions

**Required for this release, within the existing engine:**

- Capture **meaningful embedded scrollable regions located within the chosen primary content**, including vertically scrollable code blocks, long prompt/output boxes, and similar message/document panes. A region must be visibly part of primary content, have actual overflow beyond its visible bounds, and be sufficiently substantial to merit capturing; avoid selecting nested wrappers that do not move independent content.
- **Limit traversal to one embedded level**: a primary page/document or primary panel plus its directly relevant secondary scrollers. A scroller nested *inside* an embedded secondary scroller is out of scope for this release and must be identified as unsupported when it would otherwise make the result incomplete.
- Treat embedded regions as **content in place**: retain their contextual location relative to the surrounding message/document and capture their full scrollable contents in visual order. Decide and test how expanded secondary content affects PNG height and the continuation of following primary content; do not silently replace it with only its initial visible viewport.
- Exclude navigation/history sidebars, unrelated secondary panels, tiny dropdowns, incidental menus, popovers, offscreen/hidden surfaces, and utility widgets from automatic embedded traversal. Do not recursively sweep every scrollbar discovered in the DOM.
- Distinguish overlapping/adjacent nested surfaces from independent peers using containment in the selected primary content, geometry, user-visible content role, and a lightweight reversible movement probe when ambiguity remains. No hostname-, CSS-class-, or ChatGPT-specific rules.
- Bound number of embedded regions, per-region capture extent, total pixel/processing budget, retries and growth; exceeding those limits must produce explicit incomplete/unsupported diagnostics rather than a falsely complete output.
- Preserve and restore **each visited embedded scrollTop**, its scroll behavior, and affected styles along with the primary scroll position, on success and on failure. Do not leave code boxes or prompt panes at new offsets after capture.
- Avoid imposing embedded-region scanning on ordinary sites: inspect only relevant content near each visited primary viewport, deduplicate candidate regions across frames, and enter secondary traversal only when independently scrollable overflow is confirmed.

**Explicitly deferred:** third-level and deeper recursive scrollers, automatic multi-panel dashboard composition, arbitrary horizontal/2D scrolling capture, cross-origin frame internals and non-DOM canvas content. Detect important unsupported regions and report the limitation rather than claiming full coverage.

## 5. Capture geometry and correctness

- Calculate the chosen panel's viewport **rectangle** relative to the browser viewport and determine how to stitch its scrolled content while preserving surrounding page chrome only once; do not treat panel scroll offsets as window offsets.
- Visually capture content in top-to-bottom output order regardless of the raw scroll direction. Ensure continuous frame coverage, precise overlap/cropping, no repeated headers/sidebar and no unintended blank bands.
- Maintain a finite but adaptive capture boundary. Re-measure reachable range during capture, including at endpoints; account for bounded growth/shrinkage and warn on growth caps/unstable ranges rather than silently truncating.
- Sample appropriate render readiness after each scroll, including visible material changes not reflected in document height. Existing adaptive stabilization remains in the same engine.
- Distinguish *scroll succeeded* from *content actually rendered*. Virtualized panels may replace offscreen nodes; track progress/coverage and detect obvious missing or repeated regions. Do not present a successful complete PNG if capture coverage is unknown or evidently incomplete.
- Ensure currently visible non-scroll regions remain correct; fixed/sticky suppression must not corrupt the panel or persist after capture.
- Preserve original window scroll position, chosen panel scroll position (possibly negative), styles and page state in success and failure paths. Clean up temporary observers/style changes.

## 6. Performance / animation

- Candidate discovery must use a bounded, lightweight fast-path first. Full dynamic stabilization only when observed behavior requires it; no unconditional extra per-frame delay for ordinary pages.
- Baseline against `main`/0.2.18 and 0.2.19. **Engineering target:** <=5% median capture-time regression on ordinary static pages, measured across repeated runs with comparable environment, resolution and pages. This is a target, not an observed result.
- Dynamic pages may take longer to ensure completeness; every retry, scan and growth adjustment must be bounded and diagnosable.
- Popup and toolbar mascot continue animating during waits; visual progress never moves backward, never prematurely announces completion, and supports changing frame estimates.
- Preserve single PNG and one-click workflow.

## 7. Implementation strategy (design, not authorization to deploy)

1. Introduce a small scroll-surface abstraction **inside `src/capture.js`**: detect, read bounds, read position, scroll to normalized offset, restore. Keep ordinary window behavior as default.
2. Extend the same frame traversal and stitch planning for **one embedded child level** when relevant: capture code/prompt regions within primary content in place, preserve visual order, and account for additional output geometry. Add no parallel engine or unrelated capture loop.
3. Keep browser-owned popup and toolbar visual assets/path intact; refine only progress estimates/status messages if needed.
4. Create deterministic local fixtures: normal document; positive nested scroller; reverse-direction scroller with negative `scrollTop`; height growth; virtualized replacement; competing sidebar/content scrollers; sticky UI; blocked/non-scrollable candidate; primary panel with scrollable code block and long prompt; excluded sidebar/dropdown; third-level nested scroller reported unsupported; scroll restoration after failures.
5. Record diagnostics and incomplete-coverage failures without exposing page content.

## 8. Acceptance matrix and release gates

| Test | Expected result |
| --- | --- |
| Short ordinary page | Same one-click PNG, no new wait or blank output |
| Long static Fox News-style page | Full contiguous capture; no ordinary-page regression |
| Conventional positive nested scroller | Entire chosen panel, visually ordered |
| Reverse nested scroller | Entire chosen panel; visits negative endpoint correctly |
| Long code block embedded in ChatGPT conversation | Entire code region readable in-place, surrounding conversation remains in order, code scroll restored |
| Long prompt/output box in primary panel | Full embedded content captured in context without missing later primary content |
| Multiple meaningful embedded code/prompt panes | Each captured once, without duplicating parent frames or scrolling unrelated panels |
| Sidebar, dropdown, utility scroll widget | Remains excluded from embedded traversal; no accidental navigation capture |
| Third-level nested scroller | Explicit incomplete/unsupported indication when needed; no silent truncation |
| Embedded scroll failure and cleanup | Original primary and all secondary scroll positions restored; no leftover style changes |
| ChatGPT long conversation | Visible upward navigation, full readable output, correct order, original position restored |
| Base44 long page | Full scroll capture; confirm actual layout/direction separately |
| Claude/Gmail/other candidates | Exploration only until manually confirmed; no assumption they use the same layout |
| Growing/virtualized content | Adaptive remeasurement, bounded waits, no silent truncation |
| Multiple scroll panels / ambiguous target | Explicit safe behavior and diagnostics, no false complete result |
| Start at top, middle, bottom | Same complete content and restored start position |
| Sticky/sidebar/scrollbars | No duplicated chrome or repeated controls |
| Mascot and toolbar | Visually unchanged, continuously responsive, forward-only progress |
| Download | Single automatic PNG; no extra user action |
| Windows Chrome | Preserve prior compatibility and perform a Windows smoke test before public roll-out |
| Performance | Measure static-page overhead; meet <=5% median target or document/resolve regression |

A passing unit/simulation test is **not** evidence of a passing end-to-end Chrome capture. Inspect actual PNGs and capture diagnostics. Verify screenshot correctness, final scroll position, and animation. Reject release if a known reproducible single-viewport capture is silently marked complete.

## 9. Promotion and version discipline

- Keep 0.2.18 as public baseline and 0.2.19 as existing test baseline. Decide and document the intended 1.x transition/version before labeling the next extension ZIP; don't confuse development identifiers with public release numbers.
- Commit work only to `test/chatgpt-capture`; verify differences versus `main` and run test suite + real Chrome regression tests (including Windows). Create a PR for review; merge only after explicit test evidence and approval.
- Update manifest, changelog, release notes and tester instructions together at the time of release. Distinguish branch/install identity from animation eye color.

## 10. Open engineering questions

- How does the chosen panel compose relative to the page viewport for stitching and preserving page chrome?
- Which inexpensive DOM/layout probes best identify the **main** content scroller without selecting sidebars?
- Is the selected panel subject to DOM virtualization, and how do we validate actual coverage despite recycled nodes?
- How can negative-range endpoints and dynamic height growth be traversed without gaps or double captures?
- What safe outcome should occur if a UI has multiple equally important independent panels?
- How will full embedded content be composed **in place** without overpainting surrounding primary content, losing later paragraphs/messages, or duplicating frames?
- Which cheap heuristics can separate meaningful code/prompt panes from small utility scrollers, and how will output limits be surfaced?

**Current state:** generic primary nested/reverse scrolling is present on this release-candidate branch; one-level embedded expansion remains only on `test/chatgpt-capture`. Automated syntax and selected isolated model checks passed; real Chrome PNG correctness, Base44 behavior, complex virtualization, embedded display and performance are **not yet verified**. Do not release or merge based on these checks alone.
