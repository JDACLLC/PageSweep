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

- Bumped the extension version to 0.1.10 and raised the completion check by 8 pixels to balance its clearance between the mascot and progress track.
- Bumped the extension version to 0.1.9, protected the mascot's upper-right destination with an end-state-only two-line text boundary, and flipped the mascot at completion so it faces the success message while hovering.
- Bumped the extension version to 0.1.8 and raised the mascot's starting flight path by 12 pixels so the robot and booster plume begin visibly above the progress track.
- Bumped the extension version to 0.1.7, moved the completion check to the lower-right above the progress track, and extended the mascot's climb into the freed upper-right area without increasing the card height.
- Synchronized the user guide, architecture, smoke-test protocol, decision log, TODO, and triage records with the approved PageSweep 0.1.6 mascot motion.
- Bumped the extension version to 0.1.6 and revised the mascot path to use the existing card height for a continuous, more visible ascent throughout capture.
- Bumped the extension version to 0.1.5, added a gentle progress-driven flight path from lower-left to upper-right, moved the completion check beside the status text, and extended the completed-state hold to 1.7 seconds.
- Bumped the extension version to 0.1.4 and replaced the dotted progress treatment with a clean illuminated scan track.
- Bumped the extension version to 0.1.3 for reliable long-page completion delivery.
- Bumped the extension version to 0.1.2 for the robot-progress and long-page termination test build.
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

- Delivered page-capture completion details through runtime messaging, with the injected-script return retained as a fallback, so long captures can proceed to stitching when Chrome omits the file-injection result.
- Kept reachable-end trimming separate from lazy-load boundary growth in capture diagnostics and stopped displaying an unattempted final frame while confirming the page endpoint.
- Treat a page that has already scrolled through multiple frames and can no longer advance as having reached its browser-accessible end, preventing duplicate final frames and allowing the captured frames to proceed to stitching.
- Preserve injected page-script failures instead of replacing them with a misleading claim that captured frames were unusable.
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
