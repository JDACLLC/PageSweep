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

Normal `http`, `https`, and explicitly enabled local `file` pages are supported. Browser-controlled schemes remain blocked.

### `src/background.js`

Owns Chrome API calls and capture-session coordination. It prevents concurrent captures, rejects unsupported browser-controlled URLs, stores viewport frames in memory, reads PNG dimensions, controls the offscreen stitch session, downloads the result, and logs failures by stage. Its final cleanup clears frame memory and closes temporary documents even after an earlier operation fails.

### `src/capture.js`

Runs in the active webpage. It measures document and viewport geometry, establishes a bounded capture boundary, temporarily disables smooth scrolling and scrollbar painting, visits each target position, waits for layout and visible images to settle, requests a frame, and restores the original scroll position and page styles in `finally` cleanup. Fixed and sticky elements remain visible for their first on-screen capture and are then hidden with `visibility`, preserving page layout while preventing repeated appearances.

### `offscreen.html` and `src/stitch.js`

Provide a temporary DOM environment for image decoding and canvas composition. Frames arrive one at a time to avoid message-size failures. Normal pages retain source resolution; exceptionally tall pages use a uniform safe scale. The result is exposed through a temporary Blob URL and released after the download begins.

## Capture data flow

1. The user clicks the extension icon.
2. The service worker opens a capture session and injects `capture.js`.
3. The page script establishes dimensions and scroll targets.
4. At each target, the page settles and requests a visible-tab capture.
5. The service worker stores the PNG data URL and frame metadata.
6. After page cleanup, the service worker opens the offscreen document.
7. The stitcher receives frames individually and draws only each frame's unique region, ending the final frame at the fixed document boundary.
8. The stitcher exports a PNG Blob URL.
9. The service worker starts the download using a sanitized timestamped filename.
10. The temporary Blob URL and offscreen document are released.

## Current boundaries

- V1 captures one active tab after an explicit toolbar click.
- The initial document height establishes a finite boundary. Modest lazy-load growth is accepted up to 20 percent or 5,000 CSS pixels, whichever is smaller; infinite feeds are not followed indefinitely.
- Page manipulation and output file management are intentionally separate, allowing future capture metadata to be routed elsewhere without changing page logic.
