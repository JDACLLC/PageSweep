let activeCapture = null;
let toolbarAnimationTimer = null;
let toolbarResetTimer = null;
let toolbarAnimationFrame = 0;
const BETA_FEEDBACK_FORM_URL = "https://forms.gle/f7kgk5EchbeFDP9K8";
const BETA_FEEDBACK_REMINDER_INTERVALS = [6, 9, 12, 15];

const DEFAULT_ACTION_ICONS = {
  16: "icons/icon-16.png",
  32: "icons/icon-32.png",
  48: "icons/icon-48.png",
  128: "icons/icon-128.png",
};
const CAPTURING_ACTION_ICONS = [1, 2, 3].map((frame) => ({
  16: `icons/animation/capturing-${frame}-16.png`,
  32: `icons/animation/capturing-${frame}-32.png`,
  48: `icons/animation/capturing-${frame}-48.png`,
  128: `icons/animation/capturing-${frame}-128.png`,
}));

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.runtime.openOptionsPage().catch((error) => {
      console.warn("PageSweep could not open its first-run guide.", error);
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "beta-feedback-choice") {
    handleBetaFeedbackChoice(message.choice).catch((error) => {
      console.warn("PageSweep could not save the feedback preference.", error);
    });
    return false;
  }

  if (message?.type !== "capture-visible-frame") {
    return false;
  }

  captureVisibleFrame(message, sender)
    .then((frame) => sendResponse({ ok: true, frame }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  console.log("PageSweep triggered", {
    tabId: tab.id,
    url: tab.url,
    title: tab.title,
  });

  if (typeof tab.id !== "number") {
    console.error("PageSweep could not identify the active tab.");
    return;
  }

  if (!isSupportedPageUrl(tab.url)) {
    console.error("PageSweep cannot access this browser-controlled page.", {
      url: tab.url,
      supportedSchemes: ["http:", "https:", "file:"],
    });
    return;
  }

  if (activeCapture) {
    console.warn("PageSweep is already capturing a page.");
    return;
  }

  try {
    activeCapture = {
      tabId: tab.id,
      windowId: tab.windowId,
      frames: [],
      stage: "page capture",
    };
    await startToolbarProgress(tab.id);

    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/capture.js"],
    });

    const capturedFrames = activeCapture.frames;
    const captureDetails = {
      ...injectionResult.result,
      framesStoredInMemory: capturedFrames.length,
    };

    if (!injectionResult?.result || capturedFrames.length === 0) {
      throw new Error("Page capture returned no usable frames.");
    }

    console.log("PageSweep multi-frame capture complete", captureDetails);

    activeCapture.stage = "image stitching";
    await setPageProgressStatus(tab.id, "Preparing your PNG…", 100);
    const stitchedImage = await stitchCapturedFrames(capturedFrames, captureDetails);

    if (stitchedImage.wasDownscaled) {
      console.warn("PageSweep reduced this exceptionally large page to fit Chrome's PNG canvas limits.", {
        sourceScale: stitchedImage.sourceScale,
        outputScale: stitchedImage.outputScale,
        outputWidth: stitchedImage.width,
        outputHeight: stitchedImage.height,
      });
    }

    try {
      activeCapture.stage = "PNG download";
      const filename = createScreenshotFilename(tab.url);
      const downloadId = await chrome.downloads.download({
        url: stitchedImage.url,
        filename,
        saveAs: false,
      });

      console.log("PageSweep stitched PNG downloaded", {
        downloadId,
        filename,
        width: stitchedImage.width,
        height: stitchedImage.height,
        outputScale: stitchedImage.outputScale,
      });
      activeCapture.succeeded = true;
      await setPageProgressStatus(tab.id, "Download started", 100, "complete");
      await delay(900);
    } finally {
      await releaseStitchedImage();
    }
  } catch (error) {
    const stage = activeCapture?.stage || "startup";
    console.error(`PageSweep failed during ${stage}.`, {
      message: getErrorMessage(error),
      url: tab.url,
      tabId: tab.id,
      capturedFrames: activeCapture?.frames.length ?? 0,
      error,
    });
  } finally {
    const captureSucceeded = activeCapture?.succeeded === true;
    if (activeCapture?.frames) {
      activeCapture.frames.length = 0;
    }

    await safelyCloseOffscreenDocument();
    await removePageProgress(tab.id);
    await finishToolbarProgress(tab.id, captureSucceeded);
    if (captureSucceeded) {
      await recordSuccessfulCaptureAndMaybePrompt(tab.id);
    }
    activeCapture = null;
  }
});

async function recordSuccessfulCaptureAndMaybePrompt(tabId) {
  try {
    const stored = await chrome.storage.local.get({
      betaSuccessfulCaptures: 0,
      betaFeedbackNextPromptAt: 3,
      betaFeedbackDismissed: false,
      betaFeedbackReminderIndex: 0,
    });
    const successfulCaptures = stored.betaSuccessfulCaptures + 1;
    await chrome.storage.local.set({ betaSuccessfulCaptures: successfulCaptures });

    if (
      stored.betaFeedbackDismissed
      || successfulCaptures < stored.betaFeedbackNextPromptAt
    ) {
      return;
    }

    await showBetaFeedbackPrompt(tabId);
    const reminderInterval = BETA_FEEDBACK_REMINDER_INTERVALS[stored.betaFeedbackReminderIndex];
    if (typeof reminderInterval === "number") {
      await chrome.storage.local.set({
        betaFeedbackNextPromptAt: successfulCaptures + reminderInterval,
        betaFeedbackReminderIndex: stored.betaFeedbackReminderIndex + 1,
      });
    } else {
      await chrome.storage.local.set({ betaFeedbackDismissed: true });
    }
  } catch (error) {
    console.warn("PageSweep could not show its beta feedback invitation.", error);
  }
}

async function handleBetaFeedbackChoice(choice) {
  if (choice === "feedback") {
    await chrome.storage.local.set({ betaFeedbackDismissed: true });
  }
}

async function showBetaFeedbackPrompt(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (formUrl) => {
      document.querySelector("[data-pagesweep-feedback]")?.remove();

      const host = document.createElement("div");
      host.setAttribute("data-pagesweep-feedback", "true");
      Object.assign(host.style, {
        all: "initial",
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "2147483647",
      });

      const shadow = host.attachShadow({ mode: "open" });
      const card = document.createElement("section");
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-labelledby", "pagesweep-feedback-title");
      Object.assign(card.style, {
        boxSizing: "border-box",
        width: "min(360px, calc(100vw - 36px))",
        padding: "20px",
        border: "1px solid #D9E3F2",
        borderRadius: "16px",
        background: "#FFFFFF",
        boxShadow: "0 16px 44px rgba(18, 43, 82, 0.24)",
        color: "#142443",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      });

      const title = document.createElement("h2");
      title.id = "pagesweep-feedback-title";
      title.textContent = "Feedback Requested";
      Object.assign(title.style, {
        margin: "0 0 8px",
        color: "#10264B",
        fontSize: "18px",
        lineHeight: "1.25",
      });

      const copy = document.createElement("p");
      copy.textContent = "Beta feedback is very important. Please take 3 minutes to complete this survey.";
      Object.assign(copy.style, {
        margin: "0 0 16px",
        color: "#52647E",
        fontSize: "14px",
        lineHeight: "1.5",
      });

      const actions = document.createElement("div");
      Object.assign(actions.style, {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "8px",
      });

      const feedbackLink = document.createElement("a");
      feedbackLink.href = formUrl;
      feedbackLink.target = "_blank";
      feedbackLink.rel = "noreferrer";
      feedbackLink.textContent = "Give feedback";
      Object.assign(feedbackLink.style, {
        padding: "9px 13px",
        borderRadius: "9px",
        background: "#185ADB",
        color: "#FFFFFF",
        fontSize: "13px",
        fontWeight: "700",
        textDecoration: "none",
      });

      const makeButton = (label, choice) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        Object.assign(button.style, {
          padding: "8px 5px",
          border: "0",
          background: "transparent",
          color: "#52647E",
          cursor: "pointer",
          font: "600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        });
        button.addEventListener("click", () => {
          host.remove();
          chrome.runtime.sendMessage({ type: "beta-feedback-choice", choice });
        });
        return button;
      };

      feedbackLink.addEventListener("click", () => {
        host.remove();
        chrome.runtime.sendMessage({ type: "beta-feedback-choice", choice: "feedback" });
      });

      actions.append(
        feedbackLink,
        makeButton("Maybe later", "later"),
      );
      card.append(title, copy, actions);
      shadow.appendChild(card);
      (document.body || document.documentElement).appendChild(host);
    },
    args: [BETA_FEEDBACK_FORM_URL],
  });
}

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
  await updateToolbarProgress(activeCapture.tabId, message.progressPercent);
  console.log(`PageSweep frame ${activeCapture.frames.length}`, {
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

async function startToolbarProgress(tabId) {
  clearInterval(toolbarAnimationTimer);
  clearTimeout(toolbarResetTimer);
  toolbarAnimationFrame = 0;

  await Promise.allSettled([
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#185ADB" }),
    chrome.action.setBadgeText({ tabId, text: "0" }),
    chrome.action.setTitle({ tabId, title: "PageSweep is capturing this page" }),
    chrome.action.setIcon({ tabId, path: CAPTURING_ACTION_ICONS[0] }),
  ]);

  toolbarAnimationTimer = setInterval(() => {
    toolbarAnimationFrame = (toolbarAnimationFrame + 1) % CAPTURING_ACTION_ICONS.length;
    chrome.action.setIcon({
      tabId,
      path: CAPTURING_ACTION_ICONS[toolbarAnimationFrame],
    }).catch(() => undefined);
  }, 180);
}

async function updateToolbarProgress(tabId, progressPercent) {
  const boundedProgress = Math.max(0, Math.min(99, Math.round(progressPercent ?? 0)));
  await chrome.action.setBadgeText({ tabId, text: String(boundedProgress) });
}

async function finishToolbarProgress(tabId, succeeded) {
  clearInterval(toolbarAnimationTimer);
  toolbarAnimationTimer = null;

  await Promise.allSettled([
    chrome.action.setIcon({ tabId, path: DEFAULT_ACTION_ICONS }),
    chrome.action.setBadgeBackgroundColor({
      tabId,
      color: succeeded ? "#168A5B" : "#C83C3C",
    }),
    chrome.action.setBadgeText({ tabId, text: succeeded ? "✓" : "!" }),
    chrome.action.setTitle({
      tabId,
      title: succeeded ? "PageSweep download started" : "PageSweep capture failed",
    }),
  ]);

  toolbarResetTimer = setTimeout(() => {
    Promise.allSettled([
      chrome.action.setBadgeText({ tabId, text: "" }),
      chrome.action.setTitle({ tabId, title: "PageSweep — Capture the whole page" }),
    ]);
  }, 2200);
}

async function setPageProgressStatus(tabId, status, progressPercent, state = "working") {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (nextStatus, nextProgress, nextState) => {
        const host = document.querySelector("[data-pagesweep-progress]");
        const shadow = host?.shadowRoot;
        if (!host || !shadow) {
          return;
        }

        const statusElement = shadow.querySelector("[data-pagesweep-status]");
        const barElement = shadow.querySelector("[data-pagesweep-bar]");
        const cardElement = shadow.querySelector("[data-pagesweep-card]");
        const iconElement = shadow.querySelector("[data-pagesweep-icon]");
        if (statusElement) statusElement.textContent = nextStatus;
        if (barElement) barElement.style.width = `${nextProgress}%`;
        if (cardElement) {
          cardElement.dataset.state = nextState;
          if (nextState === "complete") cardElement.style.background = "#126B4B";
        }
        if (iconElement && nextState === "complete") {
          iconElement.getAnimations().forEach((animation) => animation.cancel());
          iconElement.textContent = "✓";
          iconElement.style.background = "#18A66F";
        }
      },
      args: [status, progressPercent, state],
    });
  } catch {
    // The tab may have navigated or closed after capture; toolbar state still reports the result.
  }
}

async function removePageProgress(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.querySelector("[data-pagesweep-progress]")?.remove(),
    });
  } catch {
    // The page may no longer be available for cleanup.
  }
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
    const startResponse = await sendOffscreenMessage({
      target: "offscreen",
      type: "stitch-start",
      firstFrame: frames[0],
      captureDetails,
    });

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
      const frame = frames[frameIndex];
      const nextFrame = frames[frameIndex + 1];
      const uniqueHeight = nextFrame
        ? nextFrame.scrollY - frame.scrollY
        : captureDetails.documentHeight - frame.scrollY;

      if (uniqueHeight <= 0 || uniqueHeight > captureDetails.viewportHeight + 1) {
        throw new Error(`Frame ${frameIndex + 1} has an invalid unique height (${uniqueHeight}px).`);
      }

      await sendOffscreenMessage({
        target: "offscreen",
        type: "stitch-add-frame",
        frame: {
          ...frame,
          uniqueHeight,
        },
      });
    }

    const finishResponse = await sendOffscreenMessage({
      target: "offscreen",
      type: "stitch-finish",
    });

    return {
      ...finishResponse.image,
      width: startResponse.width,
      height: startResponse.height,
      outputScale: startResponse.outputScale,
      sourceScale: startResponse.sourceScale,
      wasDownscaled: startResponse.wasDownscaled,
    };
  } catch (error) {
    await safelyCloseOffscreenDocument();
    throw error;
  }
}

async function sendOffscreenMessage(message) {
  const response = await chrome.runtime.sendMessage(message);

  if (!response?.ok) {
    throw new Error(response?.error || "The image stitching operation failed.");
  }

  return response;
}

async function releaseStitchedImage() {
  try {
    await sendOffscreenMessage({
      target: "offscreen",
      type: "stitch-release",
    });
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

async function safelyCloseOffscreenDocument() {
  try {
    await closeOffscreenDocument();
  } catch (error) {
    console.warn("PageSweep could not close its temporary stitching document.", error);
  }
}

function isSupportedPageUrl(pageUrl) {
  if (!pageUrl) {
    return false;
  }

  try {
    const protocol = new URL(pageUrl).protocol;
    return protocol === "http:" || protocol === "https:" || protocol === "file:";
  } catch {
    return false;
  }
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
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

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
