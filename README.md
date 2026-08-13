# PageSweep

PageSweep is a Chrome Manifest V3 extension that captures an entire scrollable webpage and automatically downloads it as one PNG.

**PageSweep — Capture the whole page.**

One toolbar click measures a finite page boundary, scrolls through the page, captures each viewport, removes overlap, stitches the frames, downloads the PNG, and restores the original page state.

## Install PageSweep from GitHub

1. Select **Code**, then select **Download ZIP**.
2. Open the downloaded ZIP and extract its contents.
3. Open `chrome://extensions` in Google Chrome.
4. Turn on **Developer mode** in the upper-right corner.
5. Select **Load unpacked**.
6. Choose the extracted project folder that contains `manifest.json`.
7. Open Chrome's extensions menu and pin **PageSweep** to the toolbar.

After an update, download and extract the latest ZIP again, then select **Reload** on the PageSweep card at `chrome://extensions`.

## Features

- One-click full-page capture with no manual scrolling.
- One automatically downloaded PNG named `hostname_YYYY-MM-DD_HH-MM-SS.png`.
- Accurate high-DPI, zoom, fractional-scroll, and final-viewport handling.
- First-occurrence handling for fixed and sticky interface elements.
- Bounded settling for lazy-loaded images and modest page growth.
- Restoration of scroll position and temporary page styles after success or failure.
- Animated in-page and toolbar progress that stays out of the downloaded PNG.
- No persistent website access and no `<all_urls>` permission.

## Install a local development copy

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select this project directory.
5. Confirm that **PageSweep** appears in the extensions list.
6. Use Chrome's extensions menu to pin **PageSweep** to the toolbar.

For local HTML files, open the extension's **Details** page and enable **Allow access to file URLs**.

## Usage

1. Open an `http`, `https`, or enabled local `file` page.
2. Click the **PageSweep** toolbar icon once.
3. Keep that tab visible and follow the PageSweep progress card while the page scrolls.
4. Wait for **Saved to Downloads**, then open the PNG that Chrome downloads automatically.

Do not interact with or switch away from the target tab until the page returns to its original position.

## Project structure

```text
GoFullPage_ReplacementTool/
├── manifest.json
├── offscreen.html
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CHANGELOG.md
│   ├── DECISION_LOG.md
│   ├── DOC_PROTOCOL.md
│   ├── E2E_SMOKE_PROTOCOL.md
│   ├── REAL_WORLD_TEST_MATRIX.md
│   ├── TODO.md
│   ├── TRIAGE.md
│   └── USER_GUIDE.md
├── src/
│   ├── background.js
│   ├── capture.js
│   └── stitch.js
├── tests/
│   └── fixtures/
│       └── fixed-elements.html
├── README.md
└── .gitignore
```

## Documentation

- [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) explains installation, usage, and current limitations.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) describes the capture and stitching design.
- [`docs/E2E_SMOKE_PROTOCOL.md`](docs/E2E_SMOKE_PROTOCOL.md) defines browser acceptance tests.
- [`docs/REAL_WORLD_TEST_MATRIX.md`](docs/REAL_WORLD_TEST_MATRIX.md) records Stage 11 page-by-page results.
- [`docs/TODO.md`](docs/TODO.md) and [`docs/TRIAGE.md`](docs/TRIAGE.md) track current and planned work.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) and [`docs/DECISION_LOG.md`](docs/DECISION_LOG.md) record what changed and why.
- [`docs/DOC_PROTOCOL.md`](docs/DOC_PROTOCOL.md) defines how these documents stay current.

Controlled browser fixtures live under `tests/fixtures/`.

## Permissions

- `activeTab`: Grants temporary access to the current page only after the user clicks the extension.
- `scripting`: Injects the page-measurement logic into that temporarily authorized tab.
- `offscreen`: Provides an invisible extension document with the image and canvas APIs needed to stitch captured frames. A Manifest V3 service worker does not provide those DOM APIs. The document exists only during stitching.
- `downloads`: Saves the finished PNG automatically. Chrome provides no narrower permission for initiating a download.

The extension does not request persistent host access. `activeTab` grants temporary access only after the user clicks the toolbar icon.

## Supported pages

- Normal `http://` and `https://` webpages.
- Local `file://` pages when Chrome's file-URL access toggle is enabled.

Chrome prevents extensions from accessing browser-controlled surfaces such as `chrome://` pages, Chrome Web Store pages, DevTools, settings, and some built-in viewers. The extension reports these pages cleanly in its service-worker console.

## Development

This project uses plain JavaScript and native Chrome APIs; there is no dependency installation or build step.

After changing extension files, open `chrome://extensions`, click the reload button on the extension card, and refresh the target webpage.

### Debugging

- **Service-worker console:** Open `chrome://extensions`, select **PageSweep**, then click **service worker**. Capture progress, dimensions, cleanup status, and errors are logged here.
- **Webpage console:** Use the target tab's DevTools console for rare page-side cleanup warnings.
- **Extension errors:** Inspect the **Errors** button on the extension card if Chrome reports a loading or runtime problem.

### Smoke test

1. Open `chrome://extensions`.
2. Find **PageSweep** and click its **service worker** link to open DevTools.
3. Open a normal webpage in another tab.
4. Click the **PageSweep** toolbar icon.
5. Return to the service worker DevTools console.
6. Confirm that a `PageSweep triggered` message includes the tab ID, URL, and title.
7. Watch the page scroll automatically from top to bottom and return to its starting position.
8. Confirm that one PNG downloads automatically after the final frame.
9. Open the PNG and verify that its pixel width and height match the values in `PageSweep stitched PNG downloaded`.
10. Check the image from top to bottom for missing regions, blank gaps, and obvious seams.
11. Inspect `PageSweep multi-frame capture complete`; verify `captureCount` matches `framesStoredInMemory` and `cleanupErrors` is empty.

Use [`docs/E2E_SMOKE_PROTOCOL.md`](docs/E2E_SMOKE_PROTOCOL.md) for the complete checks and [`docs/REAL_WORLD_TEST_MATRIX.md`](docs/REAL_WORLD_TEST_MATRIX.md) for recorded results.

## Known limitations

- Exceptionally tall pages may be downscaled because Chrome cannot export a single canvas beyond its native dimension and memory limits. The extension logs a warning with the source and output scale when this happens.
- Infinite or continuously growing feeds are limited to a finite boundary. Normal lazy-load growth is allowed only within a bounded cap.
- Content that takes longer than the bounded render timeout may not appear fully loaded.
- Chrome-protected pages cannot be captured.
