(async () => {
  const documentElement = document.documentElement;
  const body = document.body;
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;
  const originalScrollBehavior = documentElement.style.getPropertyValue("scroll-behavior");
  const originalScrollBehaviorPriority = documentElement.style.getPropertyPriority("scroll-behavior");
  const scrollAnchoringStyles = [documentElement, body]
    .filter(Boolean)
    .map((element) => ({
      element,
      value: element.style.getPropertyValue("overflow-anchor"),
      priority: element.style.getPropertyPriority("overflow-anchor"),
    }));
  const repeatElements = findFixedAndStickyElements();
  const capturedRepeatElements = new Set();
  const progressOverlay = createProgressOverlay();
  const scrollbarSuppressionStyle = document.createElement("style");
  scrollbarSuppressionStyle.textContent = `
    html::-webkit-scrollbar,
    body::-webkit-scrollbar {
      display: none !important;
    }
  `;
  const usesOverlayScrollbar = Math.abs(window.innerWidth - documentElement.clientWidth) < 1;
  let repeatElementSuppressions = 0;

  const documentWidth = Math.max(
    documentElement.scrollWidth,
    documentElement.offsetWidth,
    documentElement.clientWidth,
    body?.scrollWidth ?? 0,
    body?.offsetWidth ?? 0,
    body?.clientWidth ?? 0,
  );

  const initialDocumentHeight = getDocumentHeight();
  const maximumBoundaryGrowth = Math.min(5000, initialDocumentHeight * 0.2);
  const maximumCaptureBoundary = initialDocumentHeight + maximumBoundaryGrowth;
  let captureBoundaryHeight = initialDocumentHeight;
  let maximumObservedHeight = initialDocumentHeight;
  let stabilizationTimeouts = 0;
  const cleanupErrors = [];

  const measurements = {
    documentWidth,
    documentHeight: initialDocumentHeight,
    viewportWidth: window.innerWidth,
    viewportContentWidth: documentElement.clientWidth,
    viewportHeight: window.innerHeight,
    scrollX: originalScrollX,
    scrollY: originalScrollY,
    devicePixelRatio: window.devicePixelRatio,
  };

  let captureCount = 0;
  let targetY = 0;
  const maximumCaptureCount = Math.ceil(maximumCaptureBoundary / window.innerHeight) + 2;
  let pageCaptureCompleted = false;

  try {
    documentElement.style.setProperty("scroll-behavior", "auto", "important");
    for (const scrollAnchoringStyle of scrollAnchoringStyles) {
      scrollAnchoringStyle.element.style.setProperty("overflow-anchor", "none", "important");
    }
    if (usesOverlayScrollbar) {
      (document.head || documentElement).appendChild(scrollbarSuppressionStyle);
    }

    while (captureCount < maximumCaptureCount) {
      const estimatedCaptureCount = Math.max(
        1,
        Math.ceil(captureBoundaryHeight / window.innerHeight),
      );
      progressOverlay.update(
        `Capturing ${captureCount + 1} of ${estimatedCaptureCount}`,
        Math.min(95, (captureCount / estimatedCaptureCount) * 100),
      );
      window.scrollTo(originalScrollX, targetY);
      const stabilization = await waitForPageToSettle();

      if (stabilization.timedOut) {
        stabilizationTimeouts += 1;
      }

      const observedHeight = getDocumentHeight();
      maximumObservedHeight = Math.max(maximumObservedHeight, observedHeight);
      captureBoundaryHeight = Math.max(
        captureBoundaryHeight,
        Math.min(observedHeight, maximumCaptureBoundary),
      );

      suppressPreviouslyCapturedRepeatElements();
      await waitForStylePaint();
      await progressOverlay.hide();
      await waitForStylePaint();

      let response;
      try {
        response = await chrome.runtime.sendMessage({
          type: "capture-visible-frame",
          expectedY: targetY,
          scrollY: window.scrollY,
          progressPercent: Math.min(99, ((captureCount + 1) / estimatedCaptureCount) * 100),
        });
      } finally {
        progressOverlay.show();
      }

      if (!response?.ok) {
        throw new Error(response?.error || "The viewport capture failed.");
      }

      recordVisibleRepeatElements();
      captureCount += 1;

      const maximumScrollY = Math.max(0, captureBoundaryHeight - window.innerHeight);
      if (window.scrollY >= maximumScrollY - 0.5) {
        break;
      }

      const nextTargetY = Math.min(window.scrollY + window.innerHeight, maximumScrollY);
      if (nextTargetY <= window.scrollY + 0.5) {
        break;
      }

      targetY = nextTargetY;
    }
    pageCaptureCompleted = true;
    progressOverlay.update("Preparing your PNG…", 100);
  } finally {
    await runCleanupStep("scrollbar suppression style", () => scrollbarSuppressionStyle.remove());
    await runCleanupStep("fixed and sticky element styles", () => restoreRepeatElements());
    await runCleanupStep("smooth scrolling style", () => {
      if (originalScrollBehavior) {
        documentElement.style.setProperty(
          "scroll-behavior",
          originalScrollBehavior,
          originalScrollBehaviorPriority,
        );
      } else {
        documentElement.style.removeProperty("scroll-behavior");
      }
    });
    await runCleanupStep("scroll anchoring styles", () => {
      for (const scrollAnchoringStyle of scrollAnchoringStyles) {
        if (scrollAnchoringStyle.value) {
          scrollAnchoringStyle.element.style.setProperty(
            "overflow-anchor",
            scrollAnchoringStyle.value,
            scrollAnchoringStyle.priority,
          );
        } else {
          scrollAnchoringStyle.element.style.removeProperty("overflow-anchor");
        }
      }
    });

    await runCleanupStep("original scroll position", () => restoreOriginalScrollPosition());
    if (!pageCaptureCompleted) {
      await runCleanupStep("capture progress overlay", () => progressOverlay.remove());
    }
  }

  return {
    ...measurements,
    documentHeight: captureBoundaryHeight,
    initialDocumentHeight,
    maximumObservedHeight,
    boundaryGrowth: captureBoundaryHeight - initialDocumentHeight,
    boundaryGrowthWasCapped: maximumObservedHeight > maximumCaptureBoundary,
    stabilizationTimeouts,
    captureCount,
    fixedAndStickyElementsFound: repeatElements.length,
    fixedAndStickyElementsCaptured: capturedRepeatElements.size,
    repeatElementSuppressions,
    cleanupErrors,
    restoredScrollX: window.scrollX,
    restoredScrollY: window.scrollY,
  };

  function getDocumentHeight() {
    return Math.max(
      documentElement.scrollHeight,
      documentElement.offsetHeight,
      documentElement.clientHeight,
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
      body?.clientHeight ?? 0,
    );
  }

  function createProgressOverlay() {
    document.querySelector("[data-pagesweep-progress]")?.remove();

    const host = document.createElement("div");
    host.setAttribute("data-pagesweep-progress", "true");
    host.setAttribute("aria-live", "polite");
    Object.assign(host.style, {
      all: "initial",
      position: "fixed",
      top: "18px",
      right: "18px",
      zIndex: "2147483647",
      pointerEvents: "none",
      opacity: "1",
      transition: "opacity 120ms ease-out",
      visibility: "visible",
    });

    const shadow = host.attachShadow({ mode: "open" });
    const card = document.createElement("div");
    card.setAttribute("data-pagesweep-card", "true");
    Object.assign(card.style, {
      boxSizing: "border-box",
      width: "236px",
      padding: "12px 14px 11px",
      border: "1px solid rgba(255, 255, 255, 0.22)",
      borderRadius: "14px",
      background: "#132B52",
      boxShadow: "0 10px 30px rgba(11, 32, 66, 0.28)",
      color: "#FFFFFF",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    });

    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    });

    const icon = document.createElement("div");
    icon.setAttribute("data-pagesweep-icon", "true");
    Object.assign(icon.style, {
      display: "grid",
      placeItems: "center",
      width: "30px",
      height: "30px",
      flex: "0 0 30px",
      borderRadius: "8px",
      background: "#185ADB",
      color: "#FFFFFF",
      fontSize: "22px",
      fontWeight: "800",
      lineHeight: "1",
    });
    icon.textContent = "↓";
    icon.animate(
      [
        { transform: "translateY(-2px)" },
        { transform: "translateY(3px)" },
        { transform: "translateY(-2px)" },
      ],
      { duration: 850, iterations: Infinity, easing: "ease-in-out" },
    );

    const copy = document.createElement("div");
    copy.style.minWidth = "0";
    const title = document.createElement("div");
    title.textContent = "PageSweep";
    Object.assign(title.style, {
      margin: "0 0 2px",
      color: "#FFFFFF",
      fontSize: "13px",
      fontWeight: "700",
      letterSpacing: "0.01em",
      lineHeight: "1.2",
    });
    const status = document.createElement("div");
    status.setAttribute("data-pagesweep-status", "true");
    status.textContent = "Starting capture…";
    Object.assign(status.style, {
      overflow: "hidden",
      color: "#DCE9FF",
      fontSize: "12px",
      fontWeight: "500",
      lineHeight: "1.3",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
    copy.append(title, status);
    row.append(icon, copy);

    const track = document.createElement("div");
    Object.assign(track.style, {
      height: "4px",
      marginTop: "10px",
      overflow: "hidden",
      borderRadius: "999px",
      background: "rgba(255, 255, 255, 0.18)",
    });
    const bar = document.createElement("div");
    bar.setAttribute("data-pagesweep-bar", "true");
    Object.assign(bar.style, {
      width: "3%",
      height: "100%",
      borderRadius: "inherit",
      background: "#25C7F7",
      transition: "width 180ms ease-out",
    });
    track.appendChild(bar);
    card.append(row, track);
    shadow.appendChild(card);
    (document.body || documentElement).appendChild(host);

    return {
      async hide() {
        host.style.setProperty("transition", "opacity 120ms ease-out", "important");
        host.style.setProperty("opacity", "0", "important");
        await delay(130);
        host.style.setProperty("visibility", "hidden", "important");
      },
      show() {
        host.style.setProperty("visibility", "visible", "important");
        host.style.setProperty("opacity", "0", "important");
        requestAnimationFrame(() => {
          host.style.setProperty("transition", "opacity 180ms ease-in", "important");
          host.style.setProperty("opacity", "1", "important");
        });
      },
      update(nextStatus, progressPercent) {
        status.textContent = nextStatus;
        bar.style.width = `${Math.max(3, Math.min(100, progressPercent))}%`;
      },
      remove() {
        host.remove();
      },
    };
  }

  async function waitForPageToSettle() {
    const minimumWait = 550;
    const maximumWait = 1600;
    const startedAt = performance.now();
    let previousHeight = getDocumentHeight();
    let stableSamples = 0;

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    while (performance.now() - startedAt < maximumWait) {
      await delay(100);
      const currentHeight = getDocumentHeight();
      const pendingVisibleImages = getVisibleImages().filter((image) => !image.complete).length;

      if (Math.abs(currentHeight - previousHeight) < 1 && pendingVisibleImages === 0) {
        stableSamples += 1;
      } else {
        stableSamples = 0;
      }

      previousHeight = currentHeight;

      if (performance.now() - startedAt >= minimumWait && stableSamples >= 2) {
        break;
      }
    }

    const remainingTime = Math.max(0, maximumWait - (performance.now() - startedAt));
    await decodeVisibleImages(Math.min(remainingTime, 300));
    await waitForStylePaint();

    return { timedOut: performance.now() - startedAt >= maximumWait };
  }

  async function waitForStylePaint() {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function decodeVisibleImages(timeout) {
    const decodePromises = getVisibleImages()
      .filter((image) => image.complete && typeof image.decode === "function")
      .map((image) => image.decode().catch(() => undefined));

    if (decodePromises.length === 0 || timeout <= 0) {
      return;
    }

    await Promise.race([
      Promise.allSettled(decodePromises),
      delay(timeout),
    ]);
  }

  function getVisibleImages() {
    return [...document.images].filter((image) => isVisibleInViewport(image));
  }

  function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async function runCleanupStep(name, cleanup) {
    try {
      await cleanup();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      cleanupErrors.push({ name, message });
      console.warn(`PageSweep could not restore ${name}.`, error);
    }
  }

  async function restoreOriginalScrollPosition() {
    const restoreDeadline = performance.now() + 750;

    do {
      window.scrollTo(originalScrollX, originalScrollY);
      await waitForStylePaint();

      if (
        Math.abs(window.scrollX - originalScrollX) < 0.5
        && Math.abs(window.scrollY - originalScrollY) < 0.5
      ) {
        await delay(100);

        if (
          Math.abs(window.scrollX - originalScrollX) < 0.5
          && Math.abs(window.scrollY - originalScrollY) < 0.5
        ) {
          return;
        }
      }
    } while (performance.now() < restoreDeadline);

    window.scrollTo(originalScrollX, originalScrollY);
    await waitForStylePaint();
  }

  function findFixedAndStickyElements() {
    const elements = [];

    for (const element of document.querySelectorAll("body *")) {
      const position = getComputedStyle(element).position;

      if (position === "fixed" || position === "sticky") {
        elements.push({
          element,
          originalVisibility: element.style.getPropertyValue("visibility"),
          originalVisibilityPriority: element.style.getPropertyPriority("visibility"),
        });
      }
    }

    return elements;
  }

  function suppressPreviouslyCapturedRepeatElements() {
    for (const repeatElement of repeatElements) {
      if (capturedRepeatElements.has(repeatElement.element)) {
        repeatElement.element.style.setProperty("visibility", "hidden", "important");
        repeatElementSuppressions += 1;
      }
    }
  }

  function recordVisibleRepeatElements() {
    for (const repeatElement of repeatElements) {
      if (
        !capturedRepeatElements.has(repeatElement.element)
        && isVisibleInViewport(repeatElement.element)
      ) {
        capturedRepeatElements.add(repeatElement.element);
      }
    }
  }

  function isVisibleInViewport(element) {
    const styles = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();

    return (
      styles.display !== "none"
      && styles.visibility !== "hidden"
      && Number.parseFloat(styles.opacity) !== 0
      && bounds.width > 0
      && bounds.height > 0
      && bounds.right > 0
      && bounds.bottom > 0
      && bounds.left < window.innerWidth
      && bounds.top < window.innerHeight
    );
  }

  function restoreRepeatElements() {
    for (const repeatElement of repeatElements) {
      if (repeatElement.originalVisibility) {
        repeatElement.element.style.setProperty(
          "visibility",
          repeatElement.originalVisibility,
          repeatElement.originalVisibilityPriority,
        );
      } else {
        repeatElement.element.style.removeProperty("visibility");
      }
    }
  }
})();
