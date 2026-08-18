# Changelog

All notable changes to this project are documented here. The project uses semantic versioning.

## [Unreleased]

### Added

- Failure diagnostics now report the PageSweep version, browser version and user-agent details, operating system and architecture, and relevant Chrome API availability.
- Capture completion now identifies **Full resolution** or **Reduced to fit Chrome limits**, while console diagnostics report source scale, output scale, final dimensions, and whether downscaling occurred.
- A four-step visual GitHub installation guide displayed prominently in the README and user guide.
- A limited beta evaluation license and private Google Forms feedback link available from the About page and an invitation after the third successful capture.
- A one-time first-install welcome page with download-location guidance, current limitations, privacy information, and a permanently available extension-options entry.
- An animated PageSweep capture overlay, toolbar-arrow animation, percentage badge, and success or failure status.
- Stage-specific error reporting for page capture, image stitching, and download failures.
- Bounded layout stabilization and visible-image decoding before each viewport capture.
- Manifest V3 extension shell and toolbar action.
- Active-tab logging and injected page measurement.
- Single visible-viewport PNG capture and filename generation.
- Controlled full-page scrolling with original-position restoration.
- Rate-limited multi-frame capture with frame diagnostics.
- Offscreen canvas stitching and automatic PNG download.
- Project documentation protocol, work tracking, architecture, decisions, smoke testing, and optional user guide.
- A real-world test matrix that separates verified results, qualified passes, and unrun cases.
- Final installation, usage, permission, debugging, testing, and known-limitation documentation.

### Changed

- Revised the beta invitation copy and reminder cadence to prompt at successful-capture totals 3, 9, 18, 30, and 45 before stopping automatically.
- Reworded capture completion as **Download started** so the status remains accurate for default folders, custom download locations, and save-location prompts.
- Smoothed the progress overlay's frame-capture transition with a short fade out and fade in instead of an abrupt flash.
- Added first-page GitHub ZIP installation instructions for unpacked friend testing.
- Rebranded the extension as **PageSweep — Capture the whole page**, with a new toolbar and store-ready icon set.
- The finite capture boundary can grow by up to 20 percent or 5,000 CSS pixels, whichever is smaller, when lazy-loaded content modestly expands the page.
- Fixed and sticky elements remain visible for their first captured occurrence, then use temporary layout-preserving suppression in later frames.
- Each captured frame now contributes only the vertical region not covered by the next frame. The final frame is cropped exactly at the fixed document boundary.
- Viewport frames are transferred to the offscreen stitcher one at a time to stay below Chrome's 64 MiB extension-message limit.
- Exceptionally tall pages are uniformly downscaled to the highest safe canvas resolution while preserving the complete page.

### Fixed

- Offscreen stitching now supports browsers without `runtime.getContexts()` through the documented service-worker client fallback, and locks document creation to prevent concurrent setup attempts.
- Capture frames now wait for the progress overlay to be hidden and repainted so PageSweep's own interface is excluded from downloaded PNGs.
- Allowed explicitly user-triggered capture of local `file:` test pages when Chrome's file-URL access toggle is enabled.
- Guaranteed independent cleanup attempts for scroll position, smooth scrolling, scroll anchoring, fixed-element styles, frame memory, Blob URLs, and offscreen documents.
- Protected browser-controlled pages now fail cleanly with an actionable console message.
- Prevented lazy-load layout shifts and Chrome scroll anchoring from leaving the page at the bottom after capture.
- Prevented standard and macOS overlay scrollbar thumbs from repeating along the stitched image edge.
- Prevented fixed navigation, sticky headers, floating controls, and similar elements from repeating throughout the stitched PNG.
- Removed duplicated bottom content and overdraw caused by a partially overlapping final viewport.
- Prevented oversized multi-frame messages from aborting stitching.
- Prevented PNG export failure when a page exceeds Chrome's native canvas limits.

### Validated

- Confirmed protected Chrome pages fail cleanly without scrolling or downloading.
- Completed the ten-category real-world capture matrix, including static, article, marketing, documentation, sticky, lazy-loaded, floating-control, exceptionally tall, short, and responsive-app pages.

### Known limitations

- Exceptionally tall captures may have reduced resolution.
- Capture progress is visible only through scrolling and service-worker console messages.
