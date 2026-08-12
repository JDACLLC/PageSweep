# Full Page Capture User Guide

This guide is optional during development and will be completed before the V1 release.

## Install the extension

1. Open `chrome://extensions` in Google Chrome.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose the project folder.
5. Confirm **Full Page Capture** appears without an error.

> **Tip:** Pin the extension from Chrome's extensions menu so its toolbar icon is always visible.

> **Tip:** After a project update, use the extension card's **Reload** button before testing.

> **Common issue:** Chrome says the manifest cannot be loaded.  
> **Solution:** Confirm you selected the project root containing `manifest.json`.

> **Common issue:** The latest changes do not appear.  
> **Solution:** Reload the extension at `chrome://extensions`, then refresh the webpage.

## Capture a webpage

1. Open a normal webpage using an `http` or `https` address.
2. Select the **Full Page Capture** toolbar icon once.
3. Wait while the page scrolls from top to bottom.
4. Confirm the page returns to its starting position.
5. Open the PNG downloaded by Chrome.

The filename uses the website hostname and capture time, such as `example.com_2026-08-12_14-01-32.png`.

> **Tip:** Avoid interacting with the tab while capture is in progress.

> **Tip:** Keep the target tab visible until the capture finishes because Chrome captures the visible tab.

> **Common issue:** No file downloads.  
> **Solution:** Open the extension's service-worker console from `chrome://extensions` and check the latest error.

> **Common issue:** An exceptionally tall screenshot looks less sharp when enlarged.  
> **Solution:** Chrome limits the size of one export canvas. V1 preserves the complete page at the highest safe uniform resolution and logs a warning when it must reduce resolution.

## Current limitations

- A visible progress indicator has not been added yet; the page movement and development console currently show activity.
- Fixed and sticky elements may repeat until Stage 8 is complete.
- Dynamic infinite feeds are captured only to the finite boundary established near the start.
- Chrome-protected pages such as `chrome://` pages cannot be captured.

