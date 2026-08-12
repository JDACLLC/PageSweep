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
├── src/
│   ├── background.js
│   ├── capture.js
│   └── stitch.js
├── README.md
└── .gitignore
```

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

Test from both the top of a page and a position partway down a long page.
