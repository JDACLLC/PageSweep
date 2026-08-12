chrome.action.onClicked.addListener(async (tab) => {
  console.log("Full Page Capture triggered", {
    tabId: tab.id,
    url: tab.url,
    title: tab.title,
  });

  if (typeof tab.id !== "number") {
    console.error("Full Page Capture could not identify the active tab.");
    return;
  }

  try {
    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/capture.js"],
    });

    console.log("Full Page Capture page measurements", injectionResult.result);

    const screenshotUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
    });
    const filename = createScreenshotFilename(tab.url);
    const downloadId = await chrome.downloads.download({
      url: screenshotUrl,
      filename,
      saveAs: false,
    });

    console.log("Full Page Capture viewport downloaded", {
      downloadId,
      filename,
    });
  } catch (error) {
    console.error("Full Page Capture could not capture this page.", error);
  }
});

function createScreenshotFilename(pageUrl) {
  const hostname = new URL(pageUrl).hostname || "webpage";
  const timestamp = new Date();
  const date = [
    timestamp.getFullYear(),
    padNumber(timestamp.getMonth() + 1),
    padNumber(timestamp.getDate()),
  ].join("-");
  const time = [
    padNumber(timestamp.getHours()),
    padNumber(timestamp.getMinutes()),
    padNumber(timestamp.getSeconds()),
  ].join("-");
  const safeHostname = hostname.replace(/[<>:"/\\|?*\s]+/g, "_");

  return `${safeHostname}_${date}_${time}.png`;
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}
