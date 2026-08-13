# Triage

| ID | Priority | Status | Item |
|---:|:---:|---|---|
| 1 | P0 | Complete | Correct final-frame overlap and crop the stitched output accurately. |
| 2 | P0 | Complete | Prevent fixed and sticky elements from repeating in every frame. |
| 3 | P1 | Complete | Add bounded render settling for lazy-loaded content. |
| 4 | P1 | Complete | Harden failure cleanup and page-state restoration. |
| 5 | P1 | Complete | Run and record the ten-category real-world test matrix. |
| 6 | P2 | Complete | Complete installation, usage, permissions, and limitations documentation. |
| 7 | P2 | In Progress | Add a visible capture overlay and toolbar animation that are excluded from the downloaded image. |
| 8 | P2 | Known limitation | Preserve full Retina resolution for exceptionally tall pages without relying on one oversized canvas. |
| 9 | P2 | Parking Lot | Prepare the Chrome Web Store package, listing assets, privacy policy, disclosures, and submission checklist. |
| 10 | P3 | Parking Lot | Evaluate Stripe-based monetization with a 30- or 45-day free trial and an approximately $1–$2 paid plan. |

## Notes

- Item 7 was identified after Stage 6. Its exact interaction and design will be decided after the capture fundamentals are stable.
- The initial Item 7 direction is a lightweight PageSweep overlay plus an animated toolbar arrow. Hide the overlay and wait for a repaint before every frame capture, restore it between frames, exclude it from fixed-element processing, and remove it during all cleanup paths.
- Item 8 is outside V1. V1 uniformly downscales only when Chrome's native canvas dimension or memory limits require it, preserving the entire page in one PNG.
- Item 9 is scheduled for release preparation. Screenshot capture counts as handling website content under Chrome Web Store policy even when processing remains local, so PageSweep will need an accurate privacy policy and dashboard disclosure before submission.
- Item 10 is intentionally deferred until the free product is stable and store-ready. Before implementation, decide between a 30- and 45-day trial, one-time purchase versus subscription, and a $1 versus $2 price point. Use Stripe-hosted checkout rather than collecting card details in the extension. The paid flow will also require trial-start tracking, license validation, restore-purchase support, clear pricing and renewal disclosures, terms, refund handling, and a useful payment prompt that does not interrupt an active capture.

## Parking Lot

Items excluded from V1 remain documented here until intentionally scheduled: Stripe monetization, trials and licensing, annotations, cropping UI, editing, cloud upload, screenshot library, accounts, OCR, AI analysis, PDF export, Evidence Flow integration, options dashboard, crawling, and multi-tab capture.
