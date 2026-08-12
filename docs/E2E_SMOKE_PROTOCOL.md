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
2. Click the **Full Page Capture** toolbar icon once.
3. Confirm the page scrolls automatically without manual input.
4. Confirm exactly one PNG downloads.
5. Confirm the filename follows `hostname_YYYY-MM-DD_HH-MM-SS.png`.
6. Confirm the page returns to its exact starting position.
7. Open the PNG and inspect it from top to bottom.
8. Confirm major content is present without blank gaps or missing regions.
9. Confirm the console contains a completion message and no uncaught error.

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

- Fixed navigation appears once and its original visibility is restored afterward.
- Sticky header appears once rather than in every viewport frame.
- Floating chat control or action button appears once.
- Fixed footer appears once.
- Sticky sidebar that first becomes visible below the first viewport appears once at its first visible location.
- Suppressed elements do not cause content to shift or collapse.
- Browser scrollbar thumbs do not repeat along the stitched image edge.
- A capture started partway down the page still restores the exact scroll position and all temporary visibility changes.

## Full V1 test matrix

| Category | Result | Observed issue | Expected behavior | Fix |
|---|---|---|---|---|
| Simple static page | Not run | — | Complete PNG | — |
| Long article | Not run | — | Complete PNG | — |
| Marketing website | Not run | — | Complete PNG | — |
| Documentation site | Not run | — | Complete PNG | — |
| Sticky navigation | Not run | — | No repeated navigation | — |
| Lazy-loaded images | Not run | — | Loaded content captured within bounded wait | — |
| Floating chat UI | Not run | — | Floating UI not repeated | — |
| Very long webpage | Pass with limitation | Output downscaled | Entire page in one PNG with warning | Safe uniform scaling |
| Page shorter than viewport | Not run | — | One correctly sized image | — |
| Complex responsive web app | Not run | — | Stable complete capture | — |

## Failure reporting

Capture the full console error and record:

- Page category and approximate dimensions.
- Starting scroll position and device-pixel ratio.
- Last successful stage or frame.
- Whether the page state was restored.
- Whether a partial or incorrect file downloaded.
- Smallest correction applied and regression page retested.
