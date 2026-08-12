# Full Page Capture

Full Page Capture is a Chrome extension that will capture an entire scrollable webpage and download it as one PNG. The project uses Chrome Extension Manifest V3 and native browser APIs.

This repository currently contains the Stage 0 extension shell. Capture behavior has not been implemented yet.

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

None. Permissions will be added only when a feature requires them.

## Development

After changing extension files, open `chrome://extensions` and click the reload button on the extension card.

