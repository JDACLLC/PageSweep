# Changelog

All notable changes to this project are documented here. The project uses semantic versioning.

## [Unreleased]

### Added

- Stage-specific error reporting for page capture, image stitching, and download failures.
- Bounded layout stabilization and visible-image decoding before each viewport capture.
- Manifest V3 extension shell and toolbar action.
- Active-tab logging and injected page measurement.
- Single visible-viewport PNG capture and filename generation.
- Controlled full-page scrolling with original-position restoration.
- Rate-limited multi-frame capture with frame diagnostics.
- Offscreen canvas stitching and automatic PNG download.
- Project documentation protocol, work tracking, architecture, decisions, smoke testing, and optional user guide.

### Changed

- The finite capture boundary can grow by up to 20 percent or 5,000 CSS pixels, whichever is smaller, when lazy-loaded content modestly expands the page.
- Fixed and sticky elements remain visible for their first captured occurrence, then use temporary layout-preserving suppression in later frames.
- Each captured frame now contributes only the vertical region not covered by the next frame. The final frame is cropped exactly at the fixed document boundary.
- Viewport frames are transferred to the offscreen stitcher one at a time to stay below Chrome's 64 MiB extension-message limit.
- Exceptionally tall pages are uniformly downscaled to the highest safe canvas resolution while preserving the complete page.

### Fixed

- Guaranteed independent cleanup attempts for scroll position, smooth scrolling, scroll anchoring, fixed-element styles, frame memory, Blob URLs, and offscreen documents.
- Protected browser-controlled pages now fail cleanly with an actionable console message.
- Prevented lazy-load layout shifts and Chrome scroll anchoring from leaving the page at the bottom after capture.
- Excluded the browser's vertical scrollbar from stitched output so its thumb does not repeat along the right edge.
- Prevented fixed navigation, sticky headers, floating controls, and similar elements from repeating throughout the stitched PNG.
- Removed duplicated bottom content and overdraw caused by a partially overlapping final viewport.
- Prevented oversized multi-frame messages from aborting stitching.
- Prevented PNG export failure when a page exceeds Chrome's native canvas limits.

### Known limitations

- Exceptionally tall captures may have reduced resolution.
- Capture progress is visible only through scrolling and service-worker console messages.
