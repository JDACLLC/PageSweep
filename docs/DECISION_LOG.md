# Decision Log

## Move capture progress into the toolbar popup — 2026-09-14

### Context

The in-page card had to disappear for every screenshot. Measurements showed Chrome's capture call dominated the hidden interval, so shorter fades did not visibly reduce flashing.

### Decision

Display the mascot progress card in Chrome's action popup and send it progress from the service worker. Keep the earlier in-page implementation in source as a fallback.

### Alternatives

- Continue shortening the in-page hide and show transitions.
- Use Chrome's larger side panel.
- Reconstruct webpage pixels hidden behind a continuously visible in-page card.

### Consequences

The card remains continuously visible without entering captured webpage pixels or changing the page viewport. Capture now starts through the popup, and closing the popup hides progress without interrupting the background capture.

## Separate mascot travel from hovering motion — 2026-09-13

### Context

The capture mascot needed to show clear progress from the lower-left toward the upper-right without following a stiff diagonal or appearing to make most of its climb only near the end.

### Decision

Tie the mascot's forward and upward travel to capture progress, using a continuous ascent with varied easing. Apply a separate small vertical bob and rotation to the mascot artwork so it continues to feel like it is hovering while it travels. Place the completion check above the track's lower-right endpoint so the mascot can finish in the upper-right without competing with the success indicator.

### Alternatives

- Use one straight diagonal transition.
- Include a mid-flight downward movement as part of the progress path.
- Use only local hovering motion without a visible overall ascent.

### Consequences

The mascot communicates progress across the full capture and never flies backward. The independent hover remains subtle, and its strength can be tuned later without changing progress accuracy or the flight destination. The success indicator remains visually tied to the completed track while the upper-right becomes the mascot's clear destination.

## Request private beta feedback after demonstrated use — 2026-08-12

### Context

Community testers should be able to download PageSweep and provide feedback without creating or learning to use a GitHub account. Asking before they have used the extension would produce lower-quality feedback and add friction to installation.

### Decision

Link to a private Google Form from the About page and offer a lightweight invitation after the third successful capture. Keep the successful-capture count and invitation preference locally in Chrome. Let testers provide feedback or postpone invitations through progressively wider intervals of 6, 9, 12, and 15 additional successful captures, after which prompting stops.

### Alternatives

- Use a public GitHub Issue Form, which requires a GitHub account and exposes responses publicly.
- Open the Google Form automatically, which would interrupt the tester.
- Ask after installation before the tester has completed a capture.

### Consequences

Downloading and feedback require no GitHub knowledge, responses remain outside the public repository, and the prompt appears only after demonstrated use. PageSweep adds the narrow `storage` permission solely for local counters and preferences.

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

## Use a transparent glyph with white/purple capture eyes — 2026-09-16

### Context

The detailed mascot helmet was difficult to recognize in Chrome’s small toolbar slot. Subtle brightness and shape changes remained imperceptible, and the white/purple/dark sequence felt awkward once the animation worked.

### Decision

Keep the edge-filling transparent robot glyph, use white eyes at rest, and alternate white/purple eyes every 450 ms during capture. Preload pixel frames, update default and captured-tab actions sequentially, expose update failures, and restore the idle glyph after stopping. User approved 0.2.18.

### Alternatives

Retain the detailed helmet, use subtle eye brightness alone, or include a dark phase.

### Consequences

The toolbar state is legible without a numeric badge and remains separate from the popup mascot. The unfinished track is reduced to 7% opacity; its explicit contrast review remains open. Stable main and v0.2.3 remain unchanged until release consolidation.
