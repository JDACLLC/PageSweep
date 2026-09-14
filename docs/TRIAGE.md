# Triage

| ID | Priority | Status | Item |
|---:|:---:|---|---|
| 1 | P0 | Complete | Correct final-frame overlap and crop the stitched output accurately. |
| 2 | P0 | Complete | Prevent fixed and sticky elements from repeating in every frame. |
| 3 | P1 | Complete | Add bounded render settling for lazy-loaded content. |
| 4 | P1 | Complete | Harden failure cleanup and page-state restoration. |
| 5 | P1 | Complete | Run and record the ten-category real-world test matrix. |
| 6 | P2 | Complete | Complete installation, usage, permissions, and limitations documentation. |
| 7 | P2 | Complete | Add a visible capture overlay and toolbar animation that are excluded from the downloaded image. |
| 8 | P2 | Known limitation | Preserve full Retina resolution for exceptionally tall pages without relying on one oversized canvas. |
| 9 | P2 | Parking Lot | Prepare the Chrome Web Store package, listing assets, privacy policy, disclosures, and submission checklist. |
| 10 | P3 | Parking Lot | Evaluate Stripe-based monetization with a 30- or 45-day free trial and an approximately $1–$2 paid plan. |
| 11 | P2 | Complete | Add and visually validate a one-time first-install guide that remains available through extension options. |
| 12 | P3 | Parking Lot | Create a dedicated PageSweep webpage under JDAC Labs and repoint the About-page footer link to it. |
| 13 | P2 | Complete | Add and validate a limited beta evaluation license and private Google Forms feedback flow. |
| 14 | P0 | Complete | Stop long-page capture when scrolling no longer advances and prevent duplicate final frames from reaching stitching. |
| 15 | P0 | Complete | Prevent capture status from displaying a current frame number greater than its estimated total. |
| 16 | P0 | Waiting On | Verify that the robot, progress card, scan beam, and capture transition remain absent from exported PNGs. |
| 17 | P1 | Up Next | Reduce the obvious repeated disappearance and return of the in-page progress card during long captures. |
| 18 | P1 | Up Next | Replace the dotted progress treatment with one clean illuminated scan path. |
| 19 | P1 | Up Next | Move the robot above the scan path and add a gentle varied vertical flight path without backward movement. |
| 20 | P1 | Up Next | Move the completion check outside the robot's path and hold the green completed state for 1.5–2 seconds. |
| 21 | P2 | Up Next | Refine the small mascot asset so its cape reads clearly as a cape rather than a tail. |
| 22 | P1 | Parking Lot | Before Chrome Web Store release, remove beta wording and the automatic beta-feedback invitation and reminder schedule. |
| 23 | P0 | In Progress | Deliver long-page completion details independently of Chrome's intermittent injected-script result so captured frames always reach stitching. |

## Notes

- Item 7 was identified after Stage 6. Its exact interaction and design will be decided after the capture fundamentals are stable.
- Item 7 passed visual testing on 2026-08-12. The overlay uses eased opacity transitions, remains fully hidden while each frame is captured, is isolated from fixed-element processing, and is removed during cleanup.
- Item 8 is outside V1. V1 uniformly downscales only when Chrome's native canvas dimension or memory limits require it, preserving the entire page in one PNG.
- Item 9 is scheduled for release preparation. Screenshot capture counts as handling website content under Chrome Web Store policy even when processing remains local, so PageSweep will need an accurate privacy policy and dashboard disclosure before submission.
- Item 10 is intentionally deferred until the free product is stable and store-ready. Before implementation, decide between a 30- and 45-day trial, one-time purchase versus subscription, and a $1 versus $2 price point. Use Stripe-hosted checkout rather than collecting card details in the extension. The paid flow will also require trial-start tracking, license validation, restore-purchase support, clear pricing and renewal disclosures, terms, refund handling, and a useful payment prompt that does not interrupt an active capture.
- Item 11 passed visual review on 2026-08-12. It explains Chrome-controlled download destinations, major capture limitations, local screenshot processing, and how to use PageSweep. It opens automatically only for a new installation and remains manually available afterward.
- Item 12 keeps the general `JDAC.ai` footer destination for now. Replace it only after the dedicated JDAC Labs PageSweep page is published and its final URL is confirmed.
- Item 13 permits installation and testing without granting broad reuse rights. The Google Form is linked permanently from About and offered after the third successful capture. **Maybe later** schedules reminders after 6, 9, 12, and 15 additional successful captures; prompts then stop automatically.
- Items 14 and 15 were raised by a 2026-09-13 test of an approximately 20-frame page. The card advanced through `19 of 20`, `20 of 20`, and then `21 of 20`, `22 of 20`, and `23 of 20`; capture finished scrolling but never displayed the green completion state. Chrome had rounded or clamped the final scroll position below PageSweep's theoretical boundary, allowing repeated attempts at the same effective position instead of handing the 20 captured frames to stitching.
- Items 14 and 15 passed a Fox News retest on 2026-09-13. PageSweep captured and stitched 20 unique frames, adjusted the theoretical boundary to Chrome's reachable endpoint, displayed the green completion state, and downloaded a 2,343 by 28,640 PNG. The output was intentionally reduced from Retina source scale to fit Chrome's safe canvas limits. A follow-up correction prevents an unattempted 21st frame from appearing briefly in the status and reports reachable-boundary adjustment separately from page growth.
- Item 16 remains open until the PNG from the same long-page test is visually inspected. The webpage screenshot attached to the test report documents the visible card design but does not prove whether the overlay entered the exported PNG.
- Items 17–21 capture the first visual review of the robot progress branch. The test found that repeated hide/show cycles were conspicuous over approximately 20 frames, the dots read too literally, the robot traveled too close to the line for its booster plume to read clearly, the completion check overlapped the robot, and the compact cape silhouette resembled a tail.
- Item 22 is a mandatory release-preparation gate. Remove beta labels from maintained product surfaces and remove the automatic post-capture beta feedback prompt, local capture counter, and reminder cadence before packaging the Chrome Web Store release. A normal user-initiated feedback link may remain if intentionally approved for the release.
- Item 23 was identified by a PageSweep 0.1.2 Fox News retest on 2026-09-13. Chrome delivered all 20 frame messages but intermittently omitted the injected file's final result, leaving the background worker without capture geometry and preventing stitching. Version 0.1.3 sends the same completion details explicitly through runtime messaging and retains the injection result as a fallback; validation is pending on the same page.

## Parking Lot

Items excluded from V1 remain documented here until intentionally scheduled: Stripe monetization, trials and licensing, annotations, cropping UI, editing, cloud upload, screenshot library, accounts, OCR, AI analysis, PDF export, Evidence Flow integration, options dashboard, crawling, and multi-tab capture.
