# Full Page Capture

Full Page Capture is a Chrome extension that will capture an entire scrollable webpage and download it as one PNG. The project uses Chrome Extension Manifest V3 and native browser APIs.

The toolbar trigger is implemented. Clicking the extension icon logs the active tab's ID, URL, and title. Screenshot capture has not been implemented yet.

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
│   └── background.js
├── README.md
└── .gitignore
```

## Current permissions

- `activeTab`: Grants temporary access to the page only after the user clicks the extension. Stage 1 uses it to read information about the clicked tab, and later stages will use the same temporary access for capture-related work.

## Development

After changing extension files, open `chrome://extensions` and click the reload button on the extension card.

### Test the toolbar trigger

1. Open `chrome://extensions`.
2. Find **Full Page Capture** and click its **service worker** link to open DevTools.
3. Open a normal webpage in another tab.
4. Click the **Full Page Capture** toolbar icon.
5. Return to the service worker DevTools console.
6. Confirm that a `Full Page Capture triggered` message includes the tab ID, URL, and title.
