# Full Page Capture

Full Page Capture is a Chrome extension that will capture an entire scrollable webpage and download it as one PNG. The project uses Chrome Extension Manifest V3 and native browser APIs.

Clicking the extension icon now performs a Stage 4 scrolling test: it records the page dimensions and starting position, scrolls from the top to the bottom, and restores the starting position. Screenshot downloading is intentionally disabled while scrolling is tested in isolation.

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

## Development

After changing extension files, open `chrome://extensions` and click the reload button on the extension card.

### Test automated scrolling

1. Open `chrome://extensions`.
2. Find **Full Page Capture** and click its **service worker** link to open DevTools.
3. Open a normal webpage in another tab.
4. Click the **Full Page Capture** toolbar icon.
5. Return to the service worker DevTools console.
6. Confirm that a `Full Page Capture triggered` message includes the tab ID, URL, and title.
7. Watch the page scroll automatically from top to bottom.
8. Confirm that the page returns to exactly the position where it started.
9. Confirm that no PNG downloads during this stage.
10. In the service worker console, inspect `Full Page Capture automated scroll complete` and verify its `visitedPositions`, `restoredScrollX`, and `restoredScrollY` values.

Test from both the top of a page and a position partway down a long page.
