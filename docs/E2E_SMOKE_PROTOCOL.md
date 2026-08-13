# End-to-End Smoke-Test Protocol

## Purpose

Use this checklist before declaring a capture stage complete and before a release. Record the page category, result, observed issue, expected behavior, and fix when applicable. Do not record a pass when a required check was skipped.

## Test environment

- Current stable Google Chrome with Developer mode enabled.
- Extension loaded unpacked from the repository root.
- Extension reloaded after every code change.
- Service-worker DevTools console open for diagnostics.
- Test begins on a normal `http` or `https` page unless testing unsupported-page behavior.

## Core happy path

1. Open a test page and note the starting scroll position.
2. Click the **PageSweep** toolbar icon once.
3. Confirm the page scrolls automatically without manual input.
4. Confirm the PageSweep overlay appears, its arrow moves, and its progress advances.
5. If PageSweep is pinned, confirm its toolbar arrow and percentage badge also advance.
6. Confirm exactly one PNG downloads.
7. Confirm the filename follows `hostname_YYYY-MM-DD_HH-MM-SS.png`.
8. Confirm the page returns to its exact starting position.
9. Confirm the overlay reports **Download started** and then disappears.
10. Open the PNG and inspect it from top to bottom.
11. Confirm the PageSweep overlay does not appear anywhere in the PNG.
12. Confirm major content is present without blank gaps or missing regions.
13. Confirm the console contains a completion message and no uncaught error.

**Progress UI validation:** Passed 2026-08-12. The in-page card, animated arrow, progress bar, toolbar animation, and completion state appeared correctly. The eased frame transition was visually acceptable, and the PageSweep interface did not appear in the downloaded PNG.

## First-run guide checks

- A new installation opens the PageSweep welcome guide once.
- The guide states that Chrome controls the download location and may show a save prompt depending on Chrome settings.
- The guide lists protected pages, exceptionally tall pages, infinite feeds, and slow-loading content as current limitations.
- The guide states that captured webpage content is processed locally and is not sent to an external server.
- **Got it** closes the guide.
- Reloading or updating PageSweep does not automatically reopen the guide.
- PageSweep's extension-options entry reopens the guide on demand.

**First-run guide visual validation:** Passed 2026-08-12. Card order, version display, **Got it** action, JDAC.ai footer link, limitations, privacy language, and Chrome-controlled download guidance were approved.

## Stage 6 regression checks

- Shorter-than-viewport page: one frame, valid PNG, no extra blank height.
- Several-screen static page: all frames captured and stitched.
- Non-zero starting position: exact restoration after capture.
- High-DPI display: captured frame dimensions agree with viewport size and device-pixel scale.
- Long page with more than 64 MiB of combined frame data: stitching succeeds through individual frame transfer.
- Page beyond canvas limits: one complete downscaled PNG downloads and the console emits the expected warning.

## Stage 7 acceptance checks

- Page height evenly divisible by the viewport height.
- Page height not evenly divisible by the viewport height. **Passed 2026-08-12 on a very long page.**
- Final remaining region smaller than half a viewport.
- Page shorter than one viewport.
- No duplicated bottom content, missing strip, blank gap, or visible overlap seam. **Passed in the recorded very-long-page test.**

## Stage 8 acceptance checks

- Fixed navigation appears once and its original visibility is restored afterward. **Passed 2026-08-12.**
- Sticky header appears once rather than in every viewport frame. **Passed 2026-08-12.**
- Floating chat control or action button appears once.
- Fixed footer appears once.
- Sticky sidebar that first becomes visible below the first viewport appears once at its first visible location. **Passed 2026-08-12.**
- Suppressed elements do not cause content to shift or collapse.
- Browser scrollbar thumbs do not repeat along the stitched image edge, including macOS overlay scrollbars.
- A capture started partway down the page still restores the exact scroll position and all temporary visibility changes.

## Stage 9 acceptance checks

- Images that normally lazy-load when scrolled into view appear in the final PNG. **Passed 2026-08-12 on a 100-image native lazy-loading demo.**
- A modest increase in document height is included and reported as `boundaryGrowth`.
- An infinite or continuously growing page stops at the bounded capture limit.
- A slow or animated viewport does not wait longer than the per-frame hard timeout.
- `stabilizationTimeouts` reports viewports that reached the hard timeout.
- The extension still respects Chrome's screenshot rate limit. **Passed without rate-limit errors.**
- Short static pages do not incur an unbounded wait.
- Lazy-load layout shifts do not override restoration of the original scroll position. **Passed after the scroll-anchoring correction.**

## Stage 10 acceptance checks

- Clicking the extension on `chrome://extensions` logs a clean unsupported-page message and does not scroll or download. **Passed 2026-08-12.**
- A successful capture reports an empty `cleanupErrors` array.
- Starting from a non-zero position restores the exact X and Y coordinates.
- Smooth-scrolling and scroll-anchoring inline styles match their original values after capture.
- Fixed and sticky element visibility matches its original state after capture.
- Temporary scrollbar suppression is removed after capture.
- A failed capture does not prevent the next toolbar click from starting a new capture.
- Frame memory and the temporary offscreen document are released after success and failure.
- Errors identify whether failure occurred during page capture, image stitching, or PNG download.

## Full V1 test matrix

Detailed evidence and remaining steps are maintained in `REAL_WORLD_TEST_MATRIX.md`.

The controlled fixed-element regression fixture is `tests/fixtures/fixed-elements.html`.

| Category | Result | Observed issue | Expected behavior | Fix |
|---|---|---|---|---|
| Simple static page | Pass | — | Complete PNG | Example Domain |
| Long article | Pass | Initial overlay scrollbar | Complete PNG | CNN; scrollbar suppression added |
| Marketing website | Pass | — | Complete PNG | Spawn.page |
| Documentation site | Pass | Initial overlay scrollbar | Complete PNG | Position Sticky demo; scrollbar suppression added |
| Sticky navigation | Pass | — | No repeated navigation | Position Sticky demo |
| Lazy-loaded images | Pass with limitation | Tall output downscaled | Loaded content captured within bounded wait | Native 100-image demo |
| Floating chat UI | Pass | Public candidate changed unexpectedly | Floating UI not repeated | Controlled fixed-element fixture |
| Very long webpage | Pass with limitation | Output downscaled | Entire page in one PNG with warning | Safe uniform scaling |
| Page shorter than viewport | Pass | — | One correctly sized image | Example Domain |
| Complex responsive web app | Pass | — | Stable complete capture | Google News |

## Failure reporting

Capture the full console error and record:

- Page category and approximate dimensions.
- Starting scroll position and device-pixel ratio.
- Last successful stage or frame.
- Whether the page state was restored.
- Whether a partial or incorrect file downloaded.
- Smallest correction applied and regression page retested.
