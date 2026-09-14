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
  let lastCapturedScrollY = null;
  const maximumCaptureCount = Math.ceil(maximumCaptureBoundary / window.innerHeight) + 2;
  let pageCaptureCompleted = false;
  let reachedCaptureBoundary = false;
  let boundaryAdjustedToReachableEnd = false;

  try {
    documentElement.style.setProperty("scroll-behavior", "auto", "important");
    for (const scrollAnchoringStyle of scrollAnchoringStyles) {
      scrollAnchoringStyle.element.style.setProperty("overflow-anchor", "none", "important");
    }
    if (usesOverlayScrollbar) {
      (document.head || documentElement).appendChild(scrollbarSuppressionStyle);
    }

    while (captureCount < maximumCaptureCount) {
      let estimatedCaptureCount = Math.max(
        1,
        Math.ceil(captureBoundaryHeight / window.innerHeight),
        captureCount + 1,
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
      estimatedCaptureCount = Math.max(
        1,
        Math.ceil(captureBoundaryHeight / window.innerHeight),
        captureCount + 1,
      );

      const actualScrollY = window.scrollY;
      if (
        lastCapturedScrollY !== null
        && actualScrollY <= lastCapturedScrollY + 1
      ) {
        const capturedThroughY = lastCapturedScrollY + window.innerHeight;
        if (lastCapturedScrollY > 0) {
          captureBoundaryHeight = Math.min(captureBoundaryHeight, capturedThroughY);
          boundaryAdjustedToReachableEnd = true;
          reachedCaptureBoundary = true;
          break;
        }
        throw new Error(
          `The page stopped scrolling at ${actualScrollY}px before the ${captureBoundaryHeight}px capture boundary.`,
        );
      }

      progressOverlay.update(
        `Capturing ${captureCount + 1} of ${estimatedCaptureCount}`,
        Math.min(95, (captureCount / estimatedCaptureCount) * 100),
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
      lastCapturedScrollY = actualScrollY;

      const maximumScrollY = Math.max(0, captureBoundaryHeight - window.innerHeight);
      if (maximumScrollY - actualScrollY <= 1) {
        reachedCaptureBoundary = true;
        break;
      }

      const nextTargetY = Math.min(actualScrollY + window.innerHeight, maximumScrollY);
      if (nextTargetY <= actualScrollY + 1) {
        throw new Error(
          `PageSweep could not advance beyond ${actualScrollY}px toward the ${captureBoundaryHeight}px capture boundary.`,
        );
      }

      targetY = nextTargetY;
    }
    if (!reachedCaptureBoundary) {
      throw new Error(
        `PageSweep reached its ${maximumCaptureCount}-frame safety limit before the page boundary.`,
      );
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

  const observedBoundaryHeight = Math.min(maximumObservedHeight, maximumCaptureBoundary);

  const captureDetails = {
    ...measurements,
    documentHeight: captureBoundaryHeight,
    initialDocumentHeight,
    maximumObservedHeight,
    boundaryGrowth: Math.max(0, observedBoundaryHeight - initialDocumentHeight),
    boundaryGrowthWasCapped: maximumObservedHeight > maximumCaptureBoundary,
    boundaryAdjustedToReachableEnd,
    reachableBoundaryAdjustment: boundaryAdjustedToReachableEnd
      ? Math.max(0, observedBoundaryHeight - captureBoundaryHeight)
      : 0,
    stabilizationTimeouts,
    captureCount,
    fixedAndStickyElementsFound: repeatElements.length,
    fixedAndStickyElementsCaptured: capturedRepeatElements.size,
    repeatElementSuppressions,
    cleanupErrors,
    restoredScrollX: window.scrollX,
    restoredScrollY: window.scrollY,
  };

  try {
    const completionResponse = await chrome.runtime.sendMessage({
      type: "capture-complete",
      captureDetails,
    });
    if (!completionResponse?.ok) {
      console.warn(
        "PageSweep could not confirm capture completion through runtime messaging.",
        completionResponse?.error,
      );
    }
  } catch (error) {
    console.warn(
      "PageSweep could not deliver capture completion through runtime messaging; using the injected-script result fallback.",
      error,
    );
  }

  return captureDetails;

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
    document.querySelector("[data-pagesweep-feedback]")?.remove();

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
      width: "276px",
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
      height: "34px",
      gap: "10px",
    });

    const copy = document.createElement("div");
    copy.setAttribute("data-pagesweep-copy", "true");
    copy.style.minWidth = "0";
    const title = document.createElement("div");
    title.setAttribute("data-pagesweep-gradient-text", "true");
    title.textContent = "PageSweep";
    Object.assign(title.style, {
      margin: "0 0 2px",
      color: "#7DD3FC",
      fontSize: "13px",
      fontWeight: "700",
      letterSpacing: "0.01em",
      lineHeight: "1.2",
    });
    const status = document.createElement("div");
    status.setAttribute("data-pagesweep-status", "true");
    status.setAttribute("data-pagesweep-gradient-text", "true");
    status.textContent = "Starting capture…";
    Object.assign(status.style, {
      overflow: "hidden",
      color: "#7DD3FC",
      fontSize: "12px",
      fontWeight: "500",
      lineHeight: "1.3",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
    for (const textElement of [title, status]) {
      Object.assign(textElement.style, {
        backgroundImage: "linear-gradient(90deg, #7DD3FC 0%, #818CF8 50%, #C4B5FD 100%)",
        backgroundPosition: "0% 50%",
        backgroundSize: "220% 100%",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      });

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        textElement.animate(
          [
            { backgroundPosition: "0% 50%" },
            { backgroundPosition: "100% 50%" },
            { backgroundPosition: "0% 50%" },
          ],
          { duration: 4800, iterations: Infinity, easing: "ease-in-out" },
        );
      }
    }
    copy.append(title, status);
    row.append(copy);

    const scene = document.createElement("div");
    scene.setAttribute("data-pagesweep-scene", "true");
    Object.assign(scene.style, {
      position: "relative",
      height: "76px",
      marginTop: "7px",
    });

    const track = document.createElement("div");
    Object.assign(track.style, {
      position: "absolute",
      right: "2px",
      bottom: "3px",
      left: "2px",
      height: "5px",
      overflow: "hidden",
      borderRadius: "999px",
      background: "rgba(255, 255, 255, 0.14)",
      boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
    });
    const bar = document.createElement("div");
    bar.setAttribute("data-pagesweep-bar", "true");
    Object.assign(bar.style, {
      width: "3%",
      height: "100%",
      borderRadius: "inherit",
      background: "linear-gradient(90deg, #25C7F7 0%, #818CF8 58%, #A78BFA 100%)",
      boxShadow: "0 0 10px rgba(129, 140, 248, 0.72)",
      transition: "width 180ms ease-out, background-color 180ms ease-out",
    });
    track.appendChild(bar);

    const robotPosition = document.createElement("div");
    robotPosition.setAttribute("data-pagesweep-robot-position", "true");
    Object.assign(robotPosition.style, {
      position: "absolute",
      top: "12px",
      left: "3%",
      width: "56px",
      height: "50px",
      transform: "translateX(-3%)",
      transition: "left 320ms cubic-bezier(0.22, 1, 0.36, 1), top 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
      willChange: "left, top, transform",
    });

    const plume = document.createElement("img");
    plume.setAttribute("data-pagesweep-plume", "true");
    plume.alt = "";
    plume.src = chrome.runtime.getURL("icons/progress/pagesweep-plume.png");
    Object.assign(plume.style, {
      position: "absolute",
      top: "35px",
      left: "22px",
      width: "14px",
      height: "9px",
      objectFit: "fill",
      opacity: "0.88",
      filter: "drop-shadow(0 0 4px rgba(139, 92, 246, 0.78))",
      transformOrigin: "50% 0%",
    });

    const scanBeam = document.createElement("div");
    scanBeam.setAttribute("data-pagesweep-scan-beam", "true");
    Object.assign(scanBeam.style, {
      position: "absolute",
      top: "34px",
      left: "19px",
      width: "20px",
      height: "17px",
      background: "linear-gradient(180deg, rgba(196, 181, 253, 0.52), rgba(37, 199, 247, 0))",
      clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)",
      opacity: "0.68",
      filter: "blur(0.4px)",
    });

    const robotVisual = document.createElement("img");
    robotVisual.setAttribute("data-pagesweep-robot", "true");
    robotVisual.alt = "";
    robotVisual.src = chrome.runtime.getURL("icons/progress/pagesweep-robot-body.png");
    Object.assign(robotVisual.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "56px",
      height: "auto",
      filter: "drop-shadow(0 4px 7px rgba(7, 18, 43, 0.38))",
      transform: "translateY(-1px)",
      transformOrigin: "50% 58%",
    });

    const completeBadge = document.createElement("div");
    completeBadge.setAttribute("data-pagesweep-complete-badge", "true");
    completeBadge.textContent = "✓";
    Object.assign(completeBadge.style, {
      position: "absolute",
      right: "2px",
      bottom: "21px",
      display: "grid",
      placeItems: "center",
      width: "22px",
      height: "22px",
      borderRadius: "50%",
      background: "#18A66F",
      boxShadow: "0 0 0 3px rgba(52, 211, 153, 0.16), 0 4px 12px rgba(3, 80, 55, 0.32)",
      color: "#FFFFFF",
      fontSize: "14px",
      fontWeight: "800",
      opacity: "0",
      transform: "scale(0.72)",
      transition: "opacity 180ms ease-out, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
    });

    robotPosition.append(plume, scanBeam, robotVisual);
    scene.append(track, robotPosition, completeBadge);
    card.append(row, scene);
    shadow.appendChild(card);
    (document.body || documentElement).appendChild(host);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) {
      robotVisual.animate(
        [
          { transform: "translateY(-1px) rotate(-0.35deg)" },
          { transform: "translateY(1.5px) rotate(0.25deg)" },
          { transform: "translateY(-1px) rotate(-0.35deg)" },
        ],
        { duration: 2400, iterations: Infinity, easing: "ease-in-out" },
      );
      plume.animate(
        [
          { transform: "scaleY(0.86) scaleX(0.96)", opacity: 0.72 },
          { transform: "scaleY(1.04) scaleX(1.02)", opacity: 0.92 },
          { transform: "scaleY(0.86) scaleX(0.96)", opacity: 0.72 },
        ],
        { duration: 1500, iterations: Infinity, easing: "ease-in-out" },
      );
      scanBeam.animate(
        [{ opacity: 0.5 }, { opacity: 0.76 }, { opacity: 0.5 }],
        { duration: 1900, iterations: Infinity, easing: "ease-in-out" },
      );
    } else {
      robotPosition.style.transition = "none";
      completeBadge.style.transition = "none";
    }

    let displayedProgress = 3;
    let capturePulseAnimation = null;

    function getFlightTop(progressPercent) {
      const progress = progressPercent / 100;
      const waypoints = [
        [0, 12],
        [0.22, 4],
        [0.48, -5],
        [0.7, -13],
        [0.86, -20],
        [1, -27],
      ];

      for (let index = 1; index < waypoints.length; index += 1) {
        const [nextProgress, nextTop] = waypoints[index];
        if (progress <= nextProgress) {
          const [previousProgress, previousTop] = waypoints[index - 1];
          const segmentProgress = (progress - previousProgress) / (nextProgress - previousProgress);
          const easedProgress = segmentProgress * segmentProgress * (3 - 2 * segmentProgress);
          return previousTop + ((nextTop - previousTop) * easedProgress);
        }
      }

      return waypoints.at(-1)[1];
    }

    return {
      async hide() {
        if (!reducedMotion) {
          capturePulseAnimation?.cancel();
          capturePulseAnimation = scanBeam.animate(
            [{ opacity: 0.58 }, { opacity: 0.96 }],
            { duration: 55, fill: "forwards", easing: "ease-out" },
          );
          await delay(55);
        }
        host.style.setProperty("transition", "opacity 85ms ease-out", "important");
        host.style.setProperty("opacity", "0", "important");
        await delay(95);
        host.style.setProperty("visibility", "hidden", "important");
      },
      show() {
        capturePulseAnimation?.cancel();
        capturePulseAnimation = null;
        host.style.setProperty("visibility", "visible", "important");
        host.style.setProperty("opacity", "0", "important");
        requestAnimationFrame(() => {
          host.style.setProperty("transition", "opacity 125ms ease-in", "important");
          host.style.setProperty("opacity", "1", "important");
        });
      },
      update(nextStatus, progressPercent) {
        status.textContent = nextStatus;
        displayedProgress = Math.max(
          displayedProgress,
          Math.max(3, Math.min(100, progressPercent)),
        );
        bar.style.width = `${displayedProgress}%`;
        robotPosition.style.left = `${displayedProgress}%`;
        robotPosition.style.top = `${getFlightTop(displayedProgress)}px`;
        robotPosition.style.transform = `translateX(-${displayedProgress}%)`;
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
