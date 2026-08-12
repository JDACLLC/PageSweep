# Full Page Capture

Full Page Capture is a Chrome extension that will capture an entire scrollable webpage and download it as one PNG. The project uses Chrome Extension Manifest V3 and native browser APIs.

Clicking the extension icon captures each viewport, stitches the frames into one page-length PNG, downloads it automatically, and restores the starting position.

## Install in Chrome

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select this project directory.
5. Confirm that **Full Page Capture** appears in the extensions list.

Project directory:

```text
/Users/jons/Documents/GoFullPage_ReplacementTool
```

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
│   ├── TODO.md
│   ├── TRIAGE.md
│   └── USER_GUIDE.md
├── src/
│   ├── background.js
│   ├── capture.js
│   └── stitch.js
├── README.md
└── .gitignore
```

## Documentation

- [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) explains installation, usage, and current limitations.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) describes the capture and stitching design.
- [`docs/E2E_SMOKE_PROTOCOL.md`](docs/E2E_SMOKE_PROTOCOL.md) defines browser acceptance tests.
- [`docs/TODO.md`](docs/TODO.md) and [`docs/TRIAGE.md`](docs/TRIAGE.md) track current and planned work.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) and [`docs/DECISION_LOG.md`](docs/DECISION_LOG.md) record what changed and why.
- [`docs/DOC_PROTOCOL.md`](docs/DOC_PROTOCOL.md) defines how these documents stay current.

## Current permissions

- `activeTab`: Grants temporary access to the current page only after the user clicks the extension.
- `scripting`: Injects the page-measurement logic into that temporarily authorized tab.
- `offscreen`: Provides an invisible extension document with the image and canvas APIs needed to stitch captured frames. A Manifest V3 service worker does not provide those DOM APIs. The document exists only during stitching.
- `downloads`: Saves the finished PNG automatically. Chrome provides no narrower permission for initiating a download.

## Development

After changing extension files, open `chrome://extensions` and click the reload button on the extension card.

### Test full-page stitching

1. Open `chrome://extensions`.
2. Find **Full Page Capture** and click its **service worker** link to open DevTools.
3. Open a normal webpage in another tab.
4. Click the **Full Page Capture** toolbar icon.
5. Return to the service worker DevTools console.
6. Confirm that a `Full Page Capture triggered` message includes the tab ID, URL, and title.
7. Watch the page scroll automatically from top to bottom and return to its starting position.
8. Confirm that one PNG downloads automatically after the final frame.
9. Open the PNG and verify that its pixel width and height match the values in `Full Page Capture stitched PNG downloaded`.
10. Check the image from top to bottom for missing regions, blank gaps, and obvious seams.
11. Inspect `Full Page Capture multi-frame capture complete` and verify that `captureCount` matches `framesStoredInMemory`.

Very tall pages that exceed Chrome's native canvas limits are downscaled to the highest safe resolution so the complete page can still be exported as one PNG.

## Known limitations

- Exceptionally tall pages may be downscaled because Chrome cannot export a single canvas beyond its native dimension and memory limits. The extension logs a warning with the source and output scale when this happens.
- A visible capture-progress indicator is planned for a later stage. The current version reports progress in the extension service worker console.

Test from both the top of a page and a position partway down a long page.
