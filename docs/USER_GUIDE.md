# PageSweep User Guide

Use this guide to install the unpacked extension, capture webpages, and resolve common issues.

**PageSweep — Capture the whole page.**

## Install the extension

1. On the GitHub project page, select **Code**, then select **Download ZIP**.
2. Open the downloaded ZIP and extract its contents.
3. Open `chrome://extensions` in Google Chrome.
4. Turn on **Developer mode**.
5. Select **Load unpacked**.
6. Choose the extracted project folder that contains `manifest.json`.
7. Confirm **PageSweep** appears without an error.
8. Open Chrome's extensions menu and pin **PageSweep** to the toolbar.

> **Tip:** Pin the extension from Chrome's extensions menu so its toolbar icon is always visible.

> **Tip:** After a project update, use the extension card's **Reload** button before testing.

> **Common issue:** Chrome says the manifest cannot be loaded.  
> **Solution:** Confirm you extracted the ZIP and selected the extracted project root containing `manifest.json`. Chrome cannot load the ZIP file directly.

> **Common issue:** The latest changes do not appear.  
> **Solution:** Reload the extension at `chrome://extensions`, then refresh the webpage.

## Capture a webpage

1. Open a normal webpage using an `http` or `https` address, or an enabled local `file` page.
2. Select the **PageSweep** toolbar icon once.
3. Watch the PageSweep progress card while the page scrolls from top to bottom. If PageSweep is pinned, its toolbar arrow and percentage badge also show progress.
4. Confirm the page returns to its starting position.
5. Wait for **Download started**, then open the PNG downloaded by Chrome.

The filename uses the website hostname and capture time, such as `example.com_2026-08-12_14-01-32.png`.

PageSweep uses Chrome's configured download location—normally the **Downloads** folder. If Chrome's **Ask where to save each file before downloading** setting is enabled, Chrome may ask where to save the PNG. PageSweep does not choose or create a separate folder.

> **Tip:** Avoid interacting with the tab while capture is in progress.

> **Tip:** Keep the target tab visible until the capture finishes because Chrome captures the visible tab.

> **Common issue:** No file downloads.  
> **Solution:** Confirm the page uses `http`, `https`, or an enabled local `file` address. Then open the extension's service-worker console from `chrome://extensions` and check which capture stage reported the error.

> **Common issue:** A local HTML test page does not capture.
> **Solution:** Open the extension details at `chrome://extensions` and enable **Allow access to file URLs**. Local files remain accessible only after you click the extension.

> **Common issue:** An exceptionally tall screenshot looks less sharp when enlarged.  
> **Solution:** Chrome limits the size of one export canvas. V1 preserves the complete page at the highest safe uniform resolution and logs a warning when it must reduce resolution.

## Current limitations

- Lazy-loaded content receives a bounded opportunity to render. Dynamic infinite feeds are captured only to the finite boundary established near the start, with limited growth for normal page expansion.
- Chrome-protected pages such as `chrome://` pages cannot be captured.

## Review the welcome and limitations guide

PageSweep opens this guide once after its first installation. Select **Got it** to close it. To review it later, open PageSweep's extension options from Chrome's extension controls.

## Development diagnostics

1. Open `chrome://extensions`.
2. Select **PageSweep**.
3. Click the **service worker** link.
4. Run a capture and inspect its progress, dimensions, `cleanupErrors`, and stage-specific error messages.
