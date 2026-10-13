# PageSweep 1.2.22 Restoration Test — Manual Chrome Smoke Protocol

**Development only. Do not replace production 0.2.18 or merge until results are reviewed.**

## Setup

1. Download the `test/chatgpt-capture` branch ZIP; expand into a clean folder.
2. At `chrome://extensions`, disable previous PageSweep installations (do not uninstall production).
3. Load the unpacked development folder containing `manifest.json`.
4. Verify extension card says **PageSweep (Restoration Test)**, **1.2.22**.
5. Capture using the usual one-click popup. Only one PageSweep instance should be active.
6. Inspect actual downloaded PNG and on-screen progress; note whether current location was restored.

**Scope:** primary document/nested/reverse scrolling only. Embedded code and prompt panes are intentionally deferred; do not claim their full content is captured.

## History loading acceptance check

Before capturing the long ChatGPT conversation, note the actual first message by manually navigating to the oldest history and waiting for any spinner to finish. The new build should navigate to that same beginning before its first captured frame, include that first message and subsequent content in chronological order, and return to the starting position. A loading spinner still visible at the top of the PNG is a **failure**, not a passing capture.

If the app keeps loading more content beyond the safety budget, PageSweep must surface an incomplete-capture error rather than silently download a shortened PNG.

## Restoration test requirement

Before running a capture, note a recognizable passage halfway through the nested page. After the download and feedback popup, **that same passage must be at the same visible location**. Repeat from the top, middle and bottom of the page. If the page updates during capture and exact restoration is not possible, the extension must report that as a failure instead of silently reporting completion. This is a release blocker.

## Tests, in order

| Test | Pass requires |
| --- | --- |
| `https://example.com` | Automatic single PNG, no visual corruption, near-baseline timing |
| Previously passing Fox News long page | Scrolls through full document; top and bottom present; no duplicates |
| `tests/fixtures/reverse-nested-code.html` (allow file URL access) | Main reversed thread scrolls from oldest to newest; all MESSAGE identifiers present in order; sidebar appears once; original scroll position restored |
| Same fixture starting at top / middle / bottom | Same complete output each time; original position restored |
| Long ChatGPT conversation | Visibly scrolls up through history, resulting PNG includes old, middle, and recent messages with no gaps; returns to original position |
| Long ChatGPT conversation with vertically scrollable code/prompt | Embedded code/prompt expansion is **not yet supported** in this candidate; code remains viewport-only. Track separately for follow-on release. |
| Base44 long application page | Primary content moves and is captured; verify no unrelated sidebar gets selected |
| Popup and toolbar | Mascot animation, progress, success/failure state and auto-download unchanged |
| Windows Chrome smoke check before public roll-out | Capture regular page and nested page, check diagnostics and PNG |

## Failure reporting

Record test page type, extension version, starting scroll position (top/middle/bottom), whether page physically moved, whether a PNG downloaded, missing/duplicated content, whether original position was restored, and any exact error shown in the extension's service-worker console. **Do not share confidential page content or screenshots unless comfortable doing so.**

A passing scroll animation **without a correct complete PNG** is a failure. If any fixture or real-world case fails, keep code on the test branch and do not merge. Preserve Chrome version and OS details for diagnostics.

Performance goal: median ordinary-page slowdown <=5% versus 0.2.18 in comparable repeated tests; this is unmeasured and not a release claim.
