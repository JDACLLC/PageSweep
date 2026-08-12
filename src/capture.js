(async () => {
  const documentElement = document.documentElement;
  const body = document.body;
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;
  const originalScrollBehavior = documentElement.style.getPropertyValue("scroll-behavior");
  const originalScrollBehaviorPriority = documentElement.style.getPropertyPriority("scroll-behavior");

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

  const visitedPositions = [];

  try {
    documentElement.style.setProperty("scroll-behavior", "auto", "important");

    for (const targetY of targetPositions) {
      window.scrollTo(originalScrollX, targetY);
      await waitForScrollToSettle();
      visitedPositions.push(window.scrollY);
    }
  } finally {
    window.scrollTo(originalScrollX, originalScrollY);
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
    visitedPositions,
    restoredScrollX: window.scrollX,
    restoredScrollY: window.scrollY,
  };

  async function waitForScrollToSettle() {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
})();
