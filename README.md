# Full Page Capture

Full Page Capture is a Chrome extension that will capture an entire scrollable webpage and download it as one PNG. The project uses Chrome Extension Manifest V3 and native browser APIs.

Clicking the extension icon logs the active tab's details, measures the current page, and downloads the currently visible viewport as a PNG. Full-page scrolling and stitching have not been implemented yet.

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
├── src/
│   ├── background.js
│   └── capture.js
├── README.md
└── .gitignore
```

## Current permissions

- `activeTab`: Grants temporary access to the current page only after the user clicks the extension.
- `scripting`: Injects the page-measurement logic into that temporarily authorized tab.
- `downloads`: Saves the captured viewport as a PNG without displaying a save dialog.

## Development

After changing extension files, open `chrome://extensions` and click the reload button on the extension card.

### Test viewport capture

1. Open `chrome://extensions`.
2. Find **Full Page Capture** and click its **service worker** link to open DevTools.
3. Open a normal webpage in another tab.
4. Click the **Full Page Capture** toolbar icon.
5. Return to the service worker DevTools console.
6. Confirm that a `Full Page Capture triggered` message includes the tab ID, URL, and title.
7. Confirm that a `Full Page Capture page measurements` message includes the document width and height, viewport width and height, scroll position, and device pixel ratio.
8. Confirm that one PNG downloads automatically.
9. Open the PNG and verify that it matches the visible browser viewport.
10. Confirm that its name follows `hostname_YYYY-MM-DD_HH-MM-SS.png`.

At this stage, the extension intentionally captures only the visible viewport and does not scroll.
