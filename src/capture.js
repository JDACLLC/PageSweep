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

  const documentHeight = Math.max(
    documentElement.scrollHeight,
    documentElement.offsetHeight,
    documentElement.clientHeight,
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
    body?.clientHeight ?? 0,
  );

  const measurements = {
    documentWidth,
    documentHeight,
    viewportWidth: window.innerWidth,
    viewportContentWidth: documentElement.clientWidth,
    viewportHeight: window.innerHeight,
    scrollX: originalScrollX,
    scrollY: originalScrollY,
    devicePixelRatio: window.devicePixelRatio,
  };

  const maximumScrollY = Math.max(0, documentHeight - window.innerHeight);
  const targetPositions = [];

  for (let targetY = 0; targetY < maximumScrollY; targetY += window.innerHeight) {
    targetPositions.push(targetY);
  }

  if (targetPositions.at(-1) !== maximumScrollY) {
    targetPositions.push(maximumScrollY);
  }

  let captureCount = 0;

  try {
    documentElement.style.setProperty("scroll-behavior", "auto", "important");

    for (const targetY of targetPositions) {
      window.scrollTo(originalScrollX, targetY);
      await waitForScrollToSettle();
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
    }
  } finally {
    window.scrollTo(originalScrollX, originalScrollY);
    restoreRepeatElements();
    await waitForScrollToSettle();

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
    captureCount,
    fixedAndStickyElementsFound: repeatElements.length,
    fixedAndStickyElementsCaptured: capturedRepeatElements.size,
    repeatElementSuppressions,
    restoredScrollX: window.scrollX,
    restoredScrollY: window.scrollY,
  };

  async function waitForScrollToSettle() {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // Keeping captures below two calls per second avoids Chrome's screenshot rate limit.
    await new Promise((resolve) => setTimeout(resolve, 550));
  }

  async function waitForStylePaint() {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
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
