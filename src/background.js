let activeCapture = null;
let lastCapturedFrames = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "capture-visible-frame") {
    return false;
  }

  captureVisibleFrame(message, sender)
    .then((frame) => sendResponse({ ok: true, frame }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

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

  if (activeCapture) {
    console.warn("Full Page Capture is already capturing a page.");
    return;
  }

  try {
    activeCapture = {
      tabId: tab.id,
      windowId: tab.windowId,
      frames: [],
    };

    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/capture.js"],
    });

    lastCapturedFrames = activeCapture.frames;
    const captureDetails = {
      ...injectionResult.result,
      framesStoredInMemory: lastCapturedFrames.length,
    };
    console.log("Full Page Capture multi-frame capture complete", captureDetails);

    const stitchedImage = await stitchCapturedFrames(lastCapturedFrames, captureDetails);
    const filename = createScreenshotFilename(tab.url);
    const downloadId = await chrome.downloads.download({
      url: stitchedImage.dataUrl,
      filename,
      saveAs: false,
    });

    console.log("Full Page Capture stitched PNG downloaded", {
      downloadId,
      filename,
      width: stitchedImage.width,
      height: stitchedImage.height,
    });
  } catch (error) {
    console.error("Full Page Capture could not capture this page.", error);
  } finally {
    activeCapture = null;
  }
});

async function captureVisibleFrame(message, sender) {
  if (!activeCapture || sender.tab?.id !== activeCapture.tabId) {
    throw new Error("Received a frame request without a matching capture session.");
  }

  const dataUrl = await chrome.tabs.captureVisibleTab(activeCapture.windowId, {
    format: "png",
  });
  const dimensions = readPngDimensions(dataUrl);
  const frame = {
    dataUrl,
    scrollY: message.scrollY,
    expectedY: message.expectedY,
    width: dimensions.width,
    height: dimensions.height,
  };

  activeCapture.frames.push(frame);
  console.log(`Full Page Capture frame ${activeCapture.frames.length}`, {
    scrollY: frame.scrollY,
    expectedY: frame.expectedY,
    capturedWidth: frame.width,
    capturedHeight: frame.height,
  });

  return {
    scrollY: frame.scrollY,
    expectedY: frame.expectedY,
    width: frame.width,
    height: frame.height,
  };
}

function readPngDimensions(dataUrl) {
  const imageDataStart = dataUrl.indexOf(",") + 1;
  const base64 = dataUrl.slice(imageDataStart, imageDataStart + 32);
  const pngBytes = atob(base64);

  return {
    width: readUint32(pngBytes, 16),
    height: readUint32(pngBytes, 20),
  };
}

function readUint32(bytes, offset) {
  return (
    bytes.charCodeAt(offset) * 0x1000000
    + bytes.charCodeAt(offset + 1) * 0x10000
    + bytes.charCodeAt(offset + 2) * 0x100
    + bytes.charCodeAt(offset + 3)
  );
}

async function stitchCapturedFrames(frames, captureDetails) {
  await ensureOffscreenDocument();

  try {
    const response = await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "stitch-frames",
      frames,
      captureDetails,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "The image stitching operation failed.");
    }

    return response.image;
  } finally {
    await closeOffscreenDocument();
  }
}

async function ensureOffscreenDocument() {
  const documentUrl = chrome.runtime.getURL("offscreen.html");
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [documentUrl],
  });

  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["BLOBS"],
      justification: "Stitch captured viewport images into one PNG using a canvas.",
    });
  }
}

async function closeOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });

  if (contexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

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
