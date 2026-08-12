# Triage

| ID | Priority | Status | Item |
|---:|:---:|---|---|
| 1 | P0 | Up next | Correct final-frame overlap and crop the stitched output accurately. |
| 2 | P0 | Planned | Prevent fixed and sticky elements from repeating in every frame. |
| 3 | P1 | Planned | Add bounded render settling for lazy-loaded content. |
| 4 | P1 | Planned | Harden failure cleanup and page-state restoration. |
| 5 | P1 | Planned | Run and record the ten-category real-world test matrix. |
| 6 | P2 | Planned | Complete installation, usage, permissions, and limitations documentation. |
| 7 | P2 | Parking Lot | Add visible capture progress or animation so users know capture is active. |
| 8 | P2 | Known limitation | Preserve full Retina resolution for exceptionally tall pages without relying on one oversized canvas. |

## Notes

- Item 7 was identified after Stage 6. Its exact interaction and design will be decided after the capture fundamentals are stable.
- Item 8 is outside V1. V1 uniformly downscales only when Chrome's native canvas dimension or memory limits require it, preserving the entire page in one PNG.

## Parking Lot

Items excluded from V1 remain documented here until intentionally scheduled: annotations, cropping UI, editing, cloud upload, screenshot library, accounts, OCR, AI analysis, PDF export, Evidence Flow integration, options dashboard, crawling, and multi-tab capture.

