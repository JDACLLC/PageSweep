# Architecture

## System overview

```text
Toolbar click
    |
    v
Background service worker
    |-- injects page capture logic
    |-- receives one frame request at a time
    |-- calls captureVisibleTab
    |-- coordinates stitching and download
    |
    +--> Page capture script
    |      |-- measures a finite document boundary
    |      |-- records original scroll state
    |      |-- scrolls and requests frames
    |      `-- restores the original position and styles
    |
    `--> Offscreen stitch document
           |-- receives and draws frames individually
           |-- applies a safe output scale
           `-- exports a temporary PNG Blob URL
```

## Components

### `manifest.json`

Declares Manifest V3, the toolbar action, service worker, and four narrowly scoped permissions:

- `activeTab` for user-triggered access to the current tab.
- `scripting` to inject page capture logic.
- `offscreen` to provide temporary canvas and image APIs.
- `downloads` to save the final PNG automatically.

No persistent host permission or `<all_urls>` access is requested.

### `src/background.js`

Owns Chrome API calls and capture-session coordination. It prevents concurrent captures, stores viewport frames in memory, reads PNG dimensions, controls the offscreen stitch session, downloads the result, and logs actionable failures.

### `src/capture.js`

Runs in the active webpage. It measures document and viewport geometry, fixes the capture boundary, temporarily disables smooth scrolling, visits each target position, requests a frame, and restores the original scroll position and inline scroll behavior in `finally` cleanup.

### `offscreen.html` and `src/stitch.js`

Provide a temporary DOM environment for image decoding and canvas composition. Frames arrive one at a time to avoid message-size failures. Normal pages retain source resolution; exceptionally tall pages use a uniform safe scale. The result is exposed through a temporary Blob URL and released after the download begins.

## Capture data flow

1. The user clicks the extension icon.
2. The service worker opens a capture session and injects `capture.js`.
3. The page script establishes dimensions and scroll targets.
4. At each target, the page settles and requests a visible-tab capture.
5. The service worker stores the PNG data URL and frame metadata.
6. After page cleanup, the service worker opens the offscreen document.
7. The stitcher receives and draws frames individually.
8. The stitcher exports a PNG Blob URL.
9. The service worker starts the download using a sanitized timestamped filename.
10. The temporary Blob URL and offscreen document are released.

## Current boundaries

- V1 captures one active tab after an explicit toolbar click.
- The initial document height establishes a finite boundary; infinite feeds are not followed indefinitely.
- Page manipulation and output file management are intentionally separate, allowing future capture metadata to be routed elsewhere without changing page logic.

