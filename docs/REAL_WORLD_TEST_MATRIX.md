# Real-World Capture Test Matrix

**Last Updated:** 2026-08-12

This matrix records browser-tested evidence for substantially different page types. A result is marked **Pass** only after the downloaded PNG and page restoration have been inspected. Known V1 limitations are recorded as qualified passes rather than hidden.

| # | Page type | Test page | Result | Observed issue | Expected behavior | Fix or follow-up |
|---:|---|---|---|---|---|---|
| 1 | Simple static page | Example Domain | Pass | None | One correctly bounded PNG and restored position | One frame, full device-pixel output, `cleanupErrors: []` |
| 2 | Long article | CNN article | Pass | Initial overlay-scrollbar marks before correction | Complete article, one PNG, restored position | Added reversible overlay-scrollbar suppression; rerun recommended for final regression evidence |
| 3 | Marketing website | Spawn.page | Pass | None visible | Complete page without missing sections | Eight contiguous frames, full device-pixel output, `cleanupErrors: []` |
| 4 | Documentation site | Position Sticky demo | Pass | Initial overlay-scrollbar marks before correction | Complete documentation-style page with stable layout | Overlay-scrollbar suppression added |
| 5 | Sticky navigation | Position Sticky demo | Pass | Navigation would normally repeat | Sticky navigation appears once | First-visible-occurrence suppression |
| 6 | Lazy-loaded images | Native 100-image lazy-loading demo | Pass with limitation | Exceptional height required downscaling; initial restoration regression | Images render throughout, capture terminates, page returns to start | Bounded settling, image decoding, safe downscaling, and verified scroll restoration |
| 7 | Floating chat UI | Controlled fixed-element fixture | Pass | PageWidgets resolved to an unrelated Plesk default page, so a stable fixture was used | Floating control appears once and is restored afterward | Chat button, fixed footer, sticky header, and delayed sticky sidebar each appeared once |
| 8 | Very long webpage | Bored Panda | Pass with limitation | Native canvas could not export full Retina dimensions | Complete page in one PNG | Per-frame messaging and safe uniform downscaling |
| 9 | Page shorter than viewport | Example Domain | Pass | None | One frame with no stitching gap or crop | One frame at `1810 x 1942`, `outputScale: 2` |
| 10 | Complex responsive web app | Google News | Pass | No cleanup errors; full device-pixel output | Complete finite dashboard state and reusable session | `cleanupErrors: []`; immediate CNN capture also succeeded |

## Stage 10 cleanup evidence

- Google News completed with `cleanupErrors: []` and `outputScale: 2`.
- A subsequent CNN capture completed immediately, confirming the prior capture session was released.
- Lazy-loading demo returned to its original top position after the scroll-anchoring correction.
- Unsupported browser-controlled page behavior passed: `chrome://extensions` produced a clean explanatory console error with no capture attempt.

## Remaining test sequence

### Simple and shorter-than-viewport page

1. Open `https://example.com/` in a browser window tall enough to contain the entire page.
2. Capture it once.
3. Confirm one PNG, no blank region below the page, no scrollbar marks, and `cleanupErrors: []`.

### Marketing website

1. Open a finite public product landing page with several sections.
2. Start partway down the page.
3. Capture it and verify the hero, middle sections, footer, and exact scroll restoration.

### Floating chat control

1. Reload the extension, then open `tests/fixtures/fixed-elements.html` in Chrome. File-URL access must be enabled for the extension.
2. Capture it once.
3. Confirm the sticky header, delayed sticky sidebar, chat button, and fixed footer each appear once.
4. Confirm page content does not shift and all four elements return to their original visible state afterward.

### Unsupported page

1. Open `chrome://extensions`.
2. Click **Full Page Capture**.
3. Confirm the service-worker console reports that the browser-controlled page cannot be accessed.
4. Confirm the page does not scroll and no file downloads.
