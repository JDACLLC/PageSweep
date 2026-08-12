# Changelog

All notable changes to this project are documented here. The project uses semantic versioning.

## [Unreleased]

### Added

- Manifest V3 extension shell and toolbar action.
- Active-tab logging and injected page measurement.
- Single visible-viewport PNG capture and filename generation.
- Controlled full-page scrolling with original-position restoration.
- Rate-limited multi-frame capture with frame diagnostics.
- Offscreen canvas stitching and automatic PNG download.
- Project documentation protocol, work tracking, architecture, decisions, smoke testing, and optional user guide.

### Changed

- Viewport frames are transferred to the offscreen stitcher one at a time to stay below Chrome's 64 MiB extension-message limit.
- Exceptionally tall pages are uniformly downscaled to the highest safe canvas resolution while preserving the complete page.

### Fixed

- Prevented oversized multi-frame messages from aborting stitching.
- Prevented PNG export failure when a page exceeds Chrome's native canvas limits.

### Known limitations

- Final overlapping viewport correction has not yet been implemented.
- Fixed and sticky page elements may repeat in multiple frames.
- Lazy-loaded content receives a fixed settling delay but does not yet use the planned bounded stabilization strategy.
- Exceptionally tall captures may have reduced resolution.
- Capture progress is visible only through scrolling and service-worker console messages.

