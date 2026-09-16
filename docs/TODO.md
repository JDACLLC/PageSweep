# TODO

## In Progress

- Visually verify PageSweep 0.2.13 amber failure feedback and its 60-second inactivity fallback; background cancellation remains separate from popup feedback.

- Verify PageSweep 0.2.12 on the same page starting at the top, middle, and bottom; capture scroll positions must remain contiguous and restore the original position.
- Evaluate the higher-contrast, edge-filling robot visor glyph and its pulsing-eye toolbar animation in PageSweep 0.2.9.
- Verify that the mascot and plume remain physically locked together throughout normal and completion hover in PageSweep 0.2.10.
- Verify automatic popup dismissal after 1.7 seconds and inspect capture timing diagnostics in PageSweep 0.2.11; a slower 15-frame run was reported.

## Up Next

- Run a small friend beta through the public GitHub repository before Chrome Web Store packaging.
- Review and triage responses submitted through the private PageSweep beta feedback form.
- Create a dedicated PageSweep webpage under JDAC Labs, then replace the About-page `JDAC.ai` link with the new PageSweep URL.

## Waiting On

- Nothing currently.

## Recently Done

- Approve the refined small-size cape silhouette; visual review passed on 2026-09-15.
- Consolidate the approved mascot and persistent-popup work into the stable PageSweep 0.2.3 release on `main`.
- Approve the 25-percent larger booster plume and adjusted starting clearance in PageSweep 0.2.3; visual review passed on 2026-09-15.
- Replace the flashing in-page card with a persistent browser-owned popup; short- and long-page visual review passed on 2026-09-14.
- Protect the completion copy, turn the mascot toward it, and balance the completion-check spacing; visual review passed on 2026-09-13.
- Raise the mascot's starting position so the robot and existing booster plume visibly hover above the track; long-page visual review passed on 2026-09-13.
- Give the robot a continuous lower-left to upper-right ascent while preserving its gentle hover; short- and long-page visual review passed on 2026-09-13.
- Replace the dotted progress treatment with one clean illuminated scan track; visual review passed on 2026-09-13.
- Confirm that PageSweep's progress card, robot, scan beam, and capture transitions are absent from the exported 20-frame Fox News PNG.
- Validate PageSweep 0.1.3 runtime delivery of completion details; a Fox News retest captured 20 frames with zero cleanup errors, stitched and downloaded the PNG, and displayed the green completion state.
- Correct long-page termination and capture-count reporting; a 2026-09-13 Fox News retest stitched 20 unique frames, downloaded a 2,343 by 28,640 PNG, and displayed the green completion state.
- Add the visual GitHub installation guide to the repository package and first-page instructions.
- Add and validate the PageSweep Beta Evaluation License and private Google Forms feedback flow.
- Add and visually validate the one-time PageSweep welcome, limitations, privacy, and download-location guide.
- Add and visually validate the capture overlay, eased frame transitions, toolbar animation, progress badge, and completion state.
- Adopt the PageSweep name, tagline, and icon system across the extension and maintained documentation.
- Stage 12: finalize installation, usage, permissions, limitations, debugging, and testing documentation.
- Stage 10: validate clean rejection of a browser-controlled page.
- Stage 11: complete the ten-category real-world capture matrix.
- Validate fixed header, sticky sidebar, floating chat control, and fixed footer behavior with a controlled fixture.
- Validate successful cleanup and immediate session reuse on Google News and CNN.
- Implement stage-specific errors and independent cleanup of page and extension resources.
- Stage 9: validate lazy-loaded image capture, bounded settling, and scroll restoration.
- Implement bounded layout settling, visible-image decoding, and modest capture-boundary growth.
- Stage 8: validate fixed and sticky element suppression, restoration, and scrollbar exclusion.
- Implement first-visible-occurrence handling for fixed and sticky elements.
- Stage 7: validate final-viewport overlap and boundary cropping on a very long page.
- Implement unique-region cropping for every captured frame.
- Stage 6: stitch viewport frames and download one PNG.
- Fix frame transfer beyond Chrome's 64 MiB message limit.
- Add safe downscaling for pages beyond Chrome's canvas limits.
- Establish the project documentation protocol and supporting documents.
