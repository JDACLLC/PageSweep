(async () => {
  const documentElement = document.documentElement;
  const body = document.body;
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;
  const originalScrollBehavior = documentElement.style.getPropertyValue("scroll-behavior");
  const originalScrollBehaviorPriority = documentElement.style.getPropertyPriority("scroll-behavior");
  const repeatElements = findFixedAndStickyElements();
  const capturedRepeatElements = new Set();
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

  try {
    documentElement.style.setProperty("scroll-behavior", "auto", "important");

    while (captureCount < maximumCaptureCount) {
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
      const response = await chrome.runtime.sendMessage({
        type: "capture-visible-frame",
        expectedY: targetY,
        scrollY: window.scrollY,
      });

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
  } finally {
    window.scrollTo(originalScrollX, originalScrollY);
    restoreRepeatElements();
    await waitForStylePaint();

    if (originalScrollBehavior) {
      documentElement.style.setProperty(
        "scroll-behavior",
        originalScrollBehavior,
        originalScrollBehaviorPriority,
      );
    } else {
      documentElement.style.removeProperty("scroll-behavior");
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
