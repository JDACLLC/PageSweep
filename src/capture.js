(async () => {
  // Diagnostic wrapper only: preserve capture engine behavior while exposing
  // failures that used to disappear into an undefined injected-script result.
  let pageSweepPhase = "initialization";
  try {
    return await (async () => {
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
  const scrollSurface = selectScrollSurface();
  const surfaceOriginalY = scrollSurface.element?.scrollTop ?? null;
  const surfaceOriginalBehavior = scrollSurface.element?.style.getPropertyValue("scroll-behavior");
  const surfaceOriginalBehaviorPriority = scrollSurface.element?.style.getPropertyPriority("scroll-behavior");
  const surfaceOriginalAnchor = scrollSurface.element?.style.getPropertyValue("overflow-anchor");
  const surfaceOriginalAnchorPriority = scrollSurface.element?.style.getPropertyPriority("overflow-anchor");
  const originalPanelAnchor = findOriginalPanelAnchor();
  let panelRestoration = null;
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

  const captureStep = scrollSurface.kind === "panel"
    ? scrollSurface.element.clientHeight : window.innerHeight;
  const initialDocumentHeight = captureHeight();
  const maximumBoundaryGrowth = Math.min(5000, initialDocumentHeight * 0.2);
  let maximumCaptureBoundary = initialDocumentHeight + maximumBoundaryGrowth;
  let captureBoundaryHeight = initialDocumentHeight;
  let maximumObservedHeight = initialDocumentHeight;
  let stabilizationTimeouts = 0;
  let dynamicallyRenderedFrames = 0;
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
  let maximumCaptureCount = Math.ceil(maximumCaptureBoundary / captureStep) + 3;
  let historyDiscovery = { attempts: 0, growth: 0, elapsedMs: 0, settled: true };
  let pageCaptureCompleted = false;
  let reachedCaptureBoundary = false;
  let boundaryAdjustedToReachableEnd = false;

  try {
    pageSweepPhase = "capture setup";
    documentElement.style.setProperty("scroll-behavior", "auto", "important");
    for (const scrollAnchoringStyle of scrollAnchoringStyles) {
      scrollAnchoringStyle.element.style.setProperty("overflow-anchor", "none", "important");
    }
    if (scrollSurface.element) {
      scrollSurface.element.style.setProperty("scroll-behavior", "auto", "important");
      scrollSurface.element.style.setProperty("overflow-anchor", "none", "important");
    }
    if (usesOverlayScrollbar) {
      (document.head || documentElement).appendChild(scrollbarSuppressionStyle);
    }

    if (scrollSurface.kind === "panel") {
      progressOverlay.update("Finding the beginning of the conversation…", 1);
      pageSweepPhase = "oldest-history discovery";
      historyDiscovery = await discoverOldestReachableContent();
      const discoveredHeight = captureHeight();
      captureBoundaryHeight = discoveredHeight;
      maximumObservedHeight = Math.max(maximumObservedHeight, discoveredHeight);
      // The capture's growth budget begins AFTER history discovery, not before.
      maximumCaptureBoundary = discoveredHeight + Math.min(5000, discoveredHeight * 0.2);
      maximumCaptureCount = Math.ceil(maximumCaptureBoundary / captureStep) + 3;
    }

    pageSweepPhase = "frame capture";
    while (captureCount < maximumCaptureCount) {
      let estimatedCaptureCount = Math.max(
        1,
        Math.ceil(captureBoundaryHeight / captureStep),
        captureCount + 1,
      );
      moveCaptureSurface(targetY);
      const stabilization = await waitForPageToSettle();
      await ensureCapturePosition(targetY);

      if (stabilization.dynamicContent) dynamicallyRenderedFrames += 1;
      if (stabilization.timedOut) {
        stabilizationTimeouts += 1;
        // Never silently export a frame whose visible content kept changing.
        throw new Error(
          "Incomplete capture: dynamically rendered content did not stabilize before the screenshot. "
          + "Try again after the page finishes loading. "
          + "Settle diagnostics: " + JSON.stringify(stabilization.settleDiagnostics),
        );
      }

      const observedHeight = captureHeight();
      maximumObservedHeight = Math.max(maximumObservedHeight, observedHeight);
      captureBoundaryHeight = Math.max(
        captureBoundaryHeight,
        Math.min(observedHeight, maximumCaptureBoundary),
      );
      estimatedCaptureCount = Math.max(
        1,
        Math.ceil(captureBoundaryHeight / captureStep),
        captureCount + 1,
      );

      let actualScrollY = captureOffset();
      if (
        lastCapturedScrollY !== null
        && actualScrollY <= lastCapturedScrollY + 1
      ) {
        const capturedThroughY = lastCapturedScrollY + captureStep;
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
      await ensureCapturePosition(targetY);
      actualScrollY = captureOffset();
      if (lastCapturedScrollY !== null && (
        actualScrollY <= lastCapturedScrollY + 1
        || actualScrollY > lastCapturedScrollY + captureStep + 1
      )) {
        throw new Error("The page moved outside the contiguous capture region before its screenshot.");
      }

      let response;
      try {
        response = await chrome.runtime.sendMessage({
          type: "capture-visible-frame",
          status: `Capturing ${captureCount + 1} of ${estimatedCaptureCount}`,
          expectedY: targetY,
          scrollY: actualScrollY,
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

      // A page may add more content while we capture its footer. Check the
      // actual reachable end again before marking the page complete.
      const endObservedHeight = captureHeight();
      maximumObservedHeight = Math.max(maximumObservedHeight, endObservedHeight);
      captureBoundaryHeight = Math.max(
        captureBoundaryHeight,
        Math.min(endObservedHeight, maximumCaptureBoundary),
      );
      const effectiveViewport = scrollSurface.kind === "panel" ? captureStep : window.innerHeight;
      const scrollableHeight = scrollSurface.kind === "panel"
        ? captureBoundaryHeight - (window.innerHeight - captureStep)
        : captureBoundaryHeight;
      const maximumScrollY = Math.max(0, scrollableHeight - effectiveViewport);
      if (maximumScrollY - actualScrollY <= 1) {
        // A second measurement avoids claiming success when dynamic content
        // expands between the frame and the exit test.
        await waitForStylePaint();
        const confirmedHeight = captureHeight();
        maximumObservedHeight = Math.max(maximumObservedHeight, confirmedHeight);
        captureBoundaryHeight = Math.max(
          captureBoundaryHeight,
          Math.min(confirmedHeight, maximumCaptureBoundary),
        );
        if (captureBoundaryHeight > actualScrollY + (scrollSurface.kind === "panel"
          ? window.innerHeight : captureStep) + 1) {
          targetY = Math.min(actualScrollY + captureStep,
            Math.max(0, captureBoundaryHeight - (scrollSurface.kind === "panel"
              ? window.innerHeight : captureStep)));
          continue;
        }
        reachedCaptureBoundary = true;
        break;
      }

      const nextTargetY = Math.min(actualScrollY + captureStep, maximumScrollY);
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
    // Keep the stitcher's strict frame-height invariant. Incomplete coverage
    // must never be represented as a finished PNG.
    const capturedThrough = lastCapturedScrollY + captureStep;
    const requiredThrough = scrollSurface.kind === "panel"
      ? captureBoundaryHeight - (window.innerHeight - captureStep)
      : captureBoundaryHeight;
    if (requiredThrough - capturedThrough > 1) {
      throw new Error(
        `Incomplete capture: the page still has ${Math.ceil(requiredThrough - capturedThrough)}px beyond the final screenshot. Its content changed while capturing.`,
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
    if (scrollSurface.element) {
      await runCleanupStep("nested panel position and styles", async () => {
        const element = scrollSurface.element;
        try {
          // Keep scrolling instantaneous and disable browser anchoring until
          // the original *visible content* has been restored and verified.
          element.style.setProperty("scroll-behavior", "auto", "important");
          element.style.setProperty("overflow-anchor", "none", "important");
          panelRestoration = await restoreOriginalPanelPosition();
        } finally {
          restoreInline(element, "scroll-behavior", surfaceOriginalBehavior, surfaceOriginalBehaviorPriority);
          restoreInline(element, "overflow-anchor", surfaceOriginalAnchor, surfaceOriginalAnchorPriority);
        }
      });
    }
    if (!pageCaptureCompleted) {
      await runCleanupStep("capture progress overlay", () => progressOverlay.remove());
    }
  }

  // A screenshot can be correct while leaving the user's app in the wrong
  // place. Never report that capture as a successful completed operation.
  const restorationError = cleanupErrors.find(entry => entry.name === "nested panel position and styles");
  if (restorationError) {
    throw new Error(`Capture finished, but PageSweep could not restore your original viewing position: ${restorationError.message}`);
  }
  const observedBoundaryHeight = Math.min(maximumObservedHeight, maximumCaptureBoundary);

  pageSweepPhase = "completion reporting";
  const captureDetails = {
    ...measurements,
    scrollSurface: scrollSurface.kind,
    panelRect: scrollSurface.kind === 'panel' ? scrollSurface.rect : null,
    captureStep,
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
    dynamicallyRenderedFrames,
    historyDiscovery,
    panelRestoration,
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

  async function discoverOldestReachableContent() {
    // Only nested scroll panels take this preflight. Ordinary document captures
    // keep their existing timings. The budget is bounded to prevent endless
    // infinite-history feeds from consuming resources indefinitely.
    const started = performance.now();
    const timeBudgetMs = 16000;
    const progressingTimeBudgetMs = 90000;
    const maxProbes = 90;
    const quietPeriodMs = 1600;
    const stableProbesNeeded = 3;
    const initialHeight = scrollSurface.element.scrollHeight;
    const maximumHistoryHeight = initialHeight + Math.max(30000, initialHeight * 4);
    let previousHeight = initialHeight;
    let previousVisual = "";
    let stableProbes = 0;
    let attempts = 0;
    let lastChange = started;
    let sawBusy = false;
    let heightChangeCount = 0;
    let visualChangeCount = 0;
    let busyProbeCount = 0;
    let maximumStableProbes = 0;
    let meaningfulGrowthObserved = false;

    while (attempts < maxProbes && performance.now() - started < (meaningfulGrowthObserved ? progressingTimeBudgetMs : timeBudgetMs)) {
      attempts += 1;
      moveCaptureSurface(0);
      await waitForStylePaint();
      // Allow asynchronous loading triggered by reaching the oldest edge.
      await delay(450);
      const currentHeight = scrollSurface.element.scrollHeight;
      const visual = visibleContentSignature();
      const busy = hasVisibleTopLoadingIndicator();

      if (currentHeight > maximumHistoryHeight) {
        throw new Error("Incomplete capture: older content exceeded the bounded history-discovery range.");
      }
      const heightChanged = Math.abs(currentHeight - previousHeight) > 1;
      const visualChanged = previousVisual !== "" && previousVisual !== visual;
      if (heightChanged) heightChangeCount += 1;
      // Extend discovery only when older history demonstrably adds substantial
      // scrollable content. Mere text animation or spinners cannot extend it.
      if (currentHeight - initialHeight >= 1000) meaningfulGrowthObserved = true;
      if (visualChanged) visualChangeCount += 1;
      if (busy) busyProbeCount += 1;
      if (heightChanged || visualChanged || busy) {
        stableProbes = 0;
        lastChange = performance.now();
      } else {
        stableProbes += 1;
      }
      maximumStableProbes = Math.max(maximumStableProbes, stableProbes);
      sawBusy ||= busy;
      previousHeight = currentHeight;
      previousVisual = visual;
      if (stableProbes >= stableProbesNeeded
        && performance.now() - lastChange >= quietPeriodMs) {
        // Revisit the latest negative endpoint even if height grew just as
        // the async render settled.
        moveCaptureSurface(0);
        await waitForStylePaint();
        return {
          attempts, growth: currentHeight - initialHeight,
          elapsedMs: Math.round(performance.now() - started),
          loadingObserved: sawBusy, settled: true,
        };
      }
    }
    const reasons = [];
    if (heightChangeCount) reasons.push(`height changes=${heightChangeCount}`);
    if (visualChangeCount) reasons.push(`visual changes=${visualChangeCount}`);
    if (busyProbeCount) reasons.push(`busy indicator probes=${busyProbeCount}`);
    throw new Error(
      "Incomplete capture: the start of the scrolling content did not stabilize within the history-discovery safety limit. "
      + `Discovery diagnostics: attempts=${attempts}, elapsedMs=${Math.round(performance.now() - started)}, `
      + `heightGrowth=${previousHeight - initialHeight}px, extendedForHistoryGrowth=${meaningfulGrowthObserved}, maxStableProbes=${maximumStableProbes}, `
      + `quietForMs=${Math.round(performance.now() - lastChange)}, `
      + (reasons.join(", ") || "no identified change signals") + ".",
    );
  }

  function hasVisibleTopLoadingIndicator() {
    const element = scrollSurface.element;
    if (!element) return false;
    // Intentionally generic: do not hardcode ChatGPT or another application's
    // class names. Limit candidates to visible loading/status elements in the
    // selected scrolling surface, not arbitrary page activity.
    const rect = element.getBoundingClientRect();
    const topBand = Math.min(rect.bottom, rect.top + Math.min(250, rect.height * 0.45));
    const candidates = element.querySelectorAll(
      '[aria-busy="true"], [role="progressbar"], [role="status"], [aria-label*="loading" i], [aria-label*="spinner" i]',
    );
    for (const candidate of candidates) {
      const candidateRect = candidate.getBoundingClientRect();
      if (candidateRect.width <= 0 || candidateRect.height <= 0
        || candidateRect.bottom < rect.top || candidateRect.top > topBand) continue;
      const busy = candidate.matches('[aria-busy="true"], [role="progressbar"], [aria-label*="loading" i], [aria-label*="spinner" i]')
        || /load|fetch|retriev/i.test((candidate.innerText || candidate.textContent || "").slice(0, 100));
      if (busy) return true;
    }
    return false;
  }

  function restoreInline(element, property, previous, priority = "") {
    if (previous) element.style.setProperty(property, previous, priority);
    else element.style.removeProperty(property);
  }

  function findOriginalPanelAnchor() {
    const panel = scrollSurface.element;
    if (!panel) return null;
    const rect = panel.getBoundingClientRect();
    const x = Math.max(0, Math.min(window.innerWidth - 1, rect.left + rect.width * 0.5));
    const y = Math.max(0, Math.min(window.innerHeight - 1, rect.top + Math.min(rect.height * 0.45, 180)));
    let anchor = document.elementFromPoint(x, y);
    if (!anchor || !panel.contains(anchor)) return null;
    // Prefer a stable content block over a span or app-shell wrapper.
    while (anchor.parentElement && anchor.parentElement !== panel
      && !/^(ARTICLE|P|PRE|LI|BLOCKQUOTE|SECTION|TR|TD)$/.test(anchor.tagName)
      && anchor.getBoundingClientRect().height < 30) {
      anchor = anchor.parentElement;
    }
    return { element: anchor, top: anchor.getBoundingClientRect().top };
  }

  async function restoreOriginalPanelPosition() {
    const panel = scrollSurface.element;
    const deadline = performance.now() + 2100;
    const anchor = originalPanelAnchor;
    let consecutiveStable = 0;
    let attempts = 0;
    let lastHeight = panel.scrollHeight;
    while (performance.now() < deadline && attempts < 22) {
      attempts += 1;
      const anchored = anchor && anchor.element.isConnected && panel.contains(anchor.element);
      if (anchored) {
        const displacement = anchor.element.getBoundingClientRect().top - anchor.top;
        if (Math.abs(displacement) > 1) panel.scrollTop += displacement;
      } else {
        panel.scrollTop = surfaceOriginalY;
      }
      await waitForStylePaint();
      await delay(90);
      const stillAnchored = anchor && anchor.element.isConnected && panel.contains(anchor.element);
      const positionError = stillAnchored
        ? Math.abs(anchor.element.getBoundingClientRect().top - anchor.top)
        : Math.abs(panel.scrollTop - surfaceOriginalY);
      const heightStable = Math.abs(panel.scrollHeight - lastHeight) <= 1;
      consecutiveStable = positionError <= 3 && heightStable ? consecutiveStable + 1 : 0;
      lastHeight = panel.scrollHeight;
      if (consecutiveStable >= 3) {
        return { restored: true, attempts, anchored: Boolean(stillAnchored), scrollTop: panel.scrollTop };
      }
    }
    throw new Error("Nested panel did not settle back to its original visible position within the restoration limit.");
  }

  // Bounded viewport sampling avoids an expensive full DOM traversal and
  // preserves the original document scrolling path on ordinary pages.
  function selectScrollSurface() {
    const documentHeight = getDocumentHeight();
    const documentScrollable = documentHeight > window.innerHeight + 100;
    const candidates = new Set();
    for (const x of [0.25, 0.5, 0.75]) {
      for (const y of [0.2, 0.45, 0.7, 0.9]) {
        let node = document.elementFromPoint(window.innerWidth * x, window.innerHeight * y);
        while (node && node !== document.body && node !== document.documentElement) {
          if (node.scrollHeight > node.clientHeight + 120
            && node.clientHeight > 160
            && /^(auto|scroll|overlay)$/.test(getComputedStyle(node).overflowY)) {
            candidates.add(node);
          }
          node = node.parentElement;
        }
      }
    }
    const ordered = [...candidates].map(element => {
      const r = element.getBoundingClientRect();
      const width = Math.max(0, Math.min(window.innerWidth, r.right) - Math.max(0, r.left));
      const height = Math.max(0, Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top));
      return { element, rect: r, area: width * height };
    }).filter(c => c.area > window.innerWidth * window.innerHeight * 0.15)
      .sort((a, b) => b.area - a.area);
    if (!ordered.length) return { kind: "document", element: null, rect: null };
    const best = ordered[0];
    // A normally scrollable document remains the preferred fast path unless
    // a dominant inner panel has substantially more scrollable content.
    if (documentScrollable && !(
      best.area > window.innerWidth * window.innerHeight * 0.45
      && best.element.scrollHeight > documentHeight * 1.5
    )) {
      return { kind: "document", element: null, rect: null };
    }
    if (ordered[1] && ordered[1].area > best.area * 0.85
      && !best.element.contains(ordered[1].element)
      && !ordered[1].element.contains(best.element)) {
      throw new Error("Incomplete capture: multiple independent scrolling panels are equally prominent.");
    }
    const rect = {
      left: Math.max(0, Math.round(best.rect.left)),
      top: Math.max(0, Math.round(best.rect.top)),
      width: Math.min(window.innerWidth, Math.round(best.rect.right)) - Math.max(0, Math.round(best.rect.left)),
      height: best.element.clientHeight,
    };
    const element = best.element;
    // Probe negative scrolling without relying on a particular CSS class.
    const prior = element.scrollTop;
    element.scrollTop = -1;
    const reverse = element.scrollTop < -0.5;
    element.scrollTop = prior;
    return { kind: "panel", element, rect, reverse };
  }

  function captureHeight() {
    if (scrollSurface.kind !== "panel") return getDocumentHeight();
    return scrollSurface.element.scrollHeight + window.innerHeight - captureStep;
  }

  function captureOffset() {
    if (scrollSurface.kind !== "panel") return window.scrollY;
    const range = Math.max(0, scrollSurface.element.scrollHeight - captureStep);
    return scrollSurface.reverse ? range + scrollSurface.element.scrollTop
      : scrollSurface.element.scrollTop;
  }

  function moveCaptureSurface(offset) {
    if (scrollSurface.kind !== "panel") {
      window.scrollTo({ left: originalScrollX, top: offset, behavior: "instant" });
      return;
    }
    const range = Math.max(0, scrollSurface.element.scrollHeight - captureStep);
    scrollSurface.element.scrollTop = scrollSurface.reverse ? offset - range : offset;
  }

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
    return {
      async hide() {},
      show() {},
      update() {},
      remove() {},
    };
  }

  function createInPageProgressOverlay() {
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

    const robotHover = document.createElement("div");
    robotHover.setAttribute("data-pagesweep-robot-hover", "true");
    Object.assign(robotHover.style, {
      position: "absolute",
      inset: "0",
      transformOrigin: "50% 58%",
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
    robotVisual.src = chrome.runtime.getURL("icons/progress/pagesweep-robot-body-cape-v2.png");
    Object.assign(robotVisual.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "56px",
      height: "auto",
      filter: "drop-shadow(0 4px 7px rgba(7, 18, 43, 0.38))",
      transform: "none",
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

    robotHover.append(plume, scanBeam, robotVisual);
    robotPosition.append(robotHover);
    scene.append(track, robotPosition, completeBadge);
    card.append(row, scene);
    shadow.appendChild(card);
    (document.body || documentElement).appendChild(host);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) {
      robotHover.animate(
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
      show(onFadeStarted) {
        capturePulseAnimation?.cancel();
        capturePulseAnimation = null;
        host.style.setProperty("visibility", "visible", "important");
        host.style.setProperty("opacity", "0", "important");
        requestAnimationFrame(() => {
          const fadeStartedAt = performance.now();
          host.style.setProperty("transition", "opacity 125ms ease-in", "important");
          host.style.setProperty("opacity", "1", "important");
          onFadeStarted?.(fadeStartedAt);
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

  // Sample a few viewport points instead of scanning the entire DOM. This detects
  // recycled/virtualized content without penalizing ordinary static pages.
  function visibleContentSignature() {
    const points = [[0.2, 0.2], [0.5, 0.35], [0.8, 0.5], [0.35, 0.7], [0.65, 0.85]];
    return points.map(([x, y]) => {
      const element = document.elementFromPoint(
        Math.floor(window.innerWidth * x),
        Math.floor(window.innerHeight * y),
      );
      if (!element || element.closest("[data-pagesweep-progress], [data-pagesweep-feedback]")) {
        return "";
      }
      const bounds = element.getBoundingClientRect();
      const text = (element.innerText || element.textContent || "").slice(0, 120);
      return `${element.tagName}:${Math.round(bounds.top)}:${Math.round(bounds.height)}:${text}`;
    }).join("|");
  }

  async function waitForPageToSettle() {
    // Preserve the established fast path. Only add extra time when visible
    // content or layout actually changes after the scroll.
    const minimumWait = 550;
    const normalMaximumWait = 1600;
    const dynamicMaximumWait = 3600;
    const startedAt = performance.now();
    let previousHeight = getDocumentHeight();
    let previousSignature = visibleContentSignature();
    let stableSamples = 0;
    let sawDynamicContent = false;
    let lastChangeAt = startedAt;
    // Diagnostic counters only: do not change settle timing or safety rules.
    let heightChangeSamples = 0;
    let signatureChangeSamples = 0;
    let pendingImageSamples = 0;
    let lastPendingVisibleImages = 0;
    let lastSignatureChanged = false;
    let lastHeightChanged = false;

    await waitForStylePaint();

    while (performance.now() - startedAt < (sawDynamicContent ? dynamicMaximumWait : normalMaximumWait)) {
      await delay(100);
      const currentHeight = getDocumentHeight();
      const currentSignature = visibleContentSignature();
      const pendingVisibleImages = getVisibleImages().filter((image) => !image.complete).length;
      const heightChanged = Math.abs(currentHeight - previousHeight) >= 1;
      const signatureChanged = currentSignature !== previousSignature;
      const changed = heightChanged || signatureChanged;
      if (heightChanged) heightChangeSamples += 1;
      if (signatureChanged) signatureChangeSamples += 1;
      if (pendingVisibleImages) pendingImageSamples += 1;
      lastPendingVisibleImages = pendingVisibleImages;
      lastSignatureChanged = signatureChanged;
      lastHeightChanged = heightChanged;

      if (changed) {
        sawDynamicContent = true;
        lastChangeAt = performance.now();
        stableSamples = 0;
      } else if (pendingVisibleImages === 0) {
        stableSamples += 1;
      } else {
        stableSamples = 0;
      }

      previousHeight = currentHeight;
      previousSignature = currentSignature;

      if (
        performance.now() - startedAt >= minimumWait
        && stableSamples >= (sawDynamicContent ? 3 : 2)
        && (!sawDynamicContent || performance.now() - lastChangeAt >= 300)
      ) {
        break;
      }
    }

    const elapsed = performance.now() - startedAt;
    const timeout = sawDynamicContent ? dynamicMaximumWait : normalMaximumWait;
    const timedOut = elapsed >= timeout && stableSamples < (sawDynamicContent ? 3 : 2);
    const remainingTime = Math.max(0, timeout - elapsed);
    await decodeVisibleImages(Math.min(remainingTime, 300));
    await waitForStylePaint();
    return {
      timedOut,
      dynamicContent: sawDynamicContent,
      // Counts refer to samples within this single viewport's settle window.
      // Kept out of frame-capture flow except for failures.
      settleDiagnostics: timedOut ? {
        elapsedMs: Math.round(elapsed),
        heightChangeSamples,
        signatureChangeSamples,
        pendingImageSamples,
        pendingVisibleImages: lastPendingVisibleImages,
        lastHeightChanged,
        lastSignatureChanged,
        stableSamples,
        heightAtTimeout: previousHeight,
        scrollSurface: scrollSurface.kind,
      } : null,
    };
  }

  async function waitForStylePaint() {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function ensureCapturePosition(requestedY) {
    if (scrollSurface.kind === "document") {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const reachableY = Math.max(0, Math.min(requestedY, getDocumentHeight() - window.innerHeight));
        if (Math.abs(window.scrollY - reachableY) <= 1) return;
        window.scrollTo({ left: originalScrollX, top: reachableY, behavior: "instant" });
        await waitForStylePaint();
      }
      const reachableY = Math.max(0, Math.min(requestedY, getDocumentHeight() - window.innerHeight));
      if (Math.abs(window.scrollY - reachableY) > 1) {
        throw new Error(`The page would not stay at the requested capture position (${reachableY}px; actual ${window.scrollY}px).`);
      }
      return;
    }
    // A content-height change can move the negative endpoint; remeasure on every attempt.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const reachable = Math.max(0, Math.min(requestedY, scrollSurface.element.scrollHeight - captureStep));
      if (Math.abs(captureOffset() - reachable) <= 1) return;
      moveCaptureSurface(reachable);
      await waitForStylePaint();
    }
    const reachable = Math.max(0, Math.min(requestedY, scrollSurface.element.scrollHeight - captureStep));
    if (Math.abs(captureOffset() - reachable) > 1) {
      throw new Error(`The nested panel would not stay at capture offset ${reachable}px (actual ${captureOffset()}px).`);
    }
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
      window.scrollTo({ left: originalScrollX, top: originalScrollY, behavior: "instant" });
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

    window.scrollTo({ left: originalScrollX, top: originalScrollY, behavior: "instant" });
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
  } catch (error) {
    const failure = {
      name: error?.name || "Error",
      message: error?.message || String(error),
      stack: typeof error?.stack === "string" ? error.stack : null,
      phase: pageSweepPhase,
    };
    // Primary signal: report the actual page-side failure to the service worker.
    // If the tab closes or the message fails, return the same diagnostic data
    // through chrome.scripting.executeScript's original result channel.
    try {
      await chrome.runtime.sendMessage({ type: "capture-failed", failure });
    } catch (messagingError) {
      console.warn("PageSweep failure diagnostic message unavailable.", messagingError);
    }
    return { pageSweepError: failure };
  }
})();
