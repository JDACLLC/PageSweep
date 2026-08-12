# Decision Log

## Adopt the PageSweep product identity — 2026-08-12

### Context

The working name described the feature but was generic and did not provide a distinct identity suitable for a future Chrome Web Store listing.

### Decision

Use **PageSweep** as the product name and **Capture the whole page.** as its tagline. Represent it with a blue rounded-square icon containing a white page and a downward sweep arrow.

### Alternatives

- Continue using the descriptive working name.
- Use ScrollShot, which is already associated with other screenshot products.

### Consequences

The extension has a concise, memorable identity that communicates motion through a complete webpage. The repository folder may retain its working name without affecting the installed extension or future store listing.

## Bound lazy-load stabilization and page growth — 2026-08-12

### Context

Modern pages can load images and expand sections after scrolling. A fixed delay can capture incomplete content, while waiting for full network inactivity or following all height growth can hang on animated pages and infinite feeds.

### Decision

After each scroll, require at least 550 milliseconds between captures, sample document height and visible image readiness, decode visible completed images when possible, and stop waiting after 1,600 milliseconds. Allow the initial page boundary to grow by at most 20 percent or 5,000 CSS pixels, whichever is smaller.

### Alternatives

- Use one fixed delay for every page.
- Wait indefinitely for all page requests and images.
- Follow every increase in document height.

### Consequences

Normal lazy-loaded content gets a bounded opportunity to render, Chrome's screenshot rate is respected, and dynamic feeds cannot extend capture forever. Content that loads after the timeout or beyond the growth cap remains a documented V1 boundary.

## Use controlled scroll-and-stitch capture — 2026-08-12

### Context

Chrome's visible-tab screenshot API captures only the current viewport, while the product must capture an entire scrollable page.

### Decision

Measure a finite page boundary, scroll through viewport positions, capture each visible frame at a controlled rate, and stitch the frames into one PNG.

### Alternatives

- Treat one visible-tab capture as a full-page image, which does not meet the requirement.
- Use Chrome DevTools Protocol capture, which would require broader or more complex extension capabilities.
- Add a third-party capture dependency.

### Consequences

The architecture uses native APIs and minimal permissions, but must explicitly handle overlap, fixed elements, lazy loading, rate limits, page restoration, and large-image constraints.

## Use an offscreen document for stitching — 2026-08-12

### Context

Manifest V3 service workers do not provide the DOM image and canvas APIs used to compose PNG frames.

### Decision

Create an offscreen extension document only during stitching, draw the frames on its canvas, export the PNG, then close the document.

### Alternatives

- Add a third-party image library to the service worker.
- Stitch inside the webpage, which would mix extension output processing with page manipulation.

### Consequences

The extension requires the narrow `offscreen` permission. Capture coordination, webpage manipulation, and image stitching remain separated.

## Transfer captured frames individually — 2026-08-12

### Context

Sending 77 PNG data URLs in one extension message exceeded Chrome's 64 MiB message limit.

### Decision

Initialize a stitch session and transfer and draw one frame per message. Return a short temporary Blob URL for the completed download.

### Alternatives

- Reduce every frame's quality before transfer.
- Limit the number of captured frames and omit part of the page.

### Consequences

Exceptionally long pages can be stitched without an oversized message, and peak message size is bounded by one viewport image.

## Downscale only beyond native canvas limits in V1 — 2026-08-12

### Context

A test capture required an approximately 1,810 by 117,250-pixel canvas, which Chrome could not export as one PNG.

### Decision

Keep normal captures at their source device-pixel scale. When native canvas dimension or area limits would be exceeded, uniformly reduce the output to the highest safe scale and log a warning.

### Alternatives

- Build a custom tiled or streaming PNG encoder in V1.
- Fail exceptionally tall captures.
- Produce multiple PNG files instead of the required single image.

### Consequences

V1 reliably preserves the entire page as one PNG, but exceptionally tall pages can be less sharp when enlarged. Full-resolution tiled encoding remains a future option.
