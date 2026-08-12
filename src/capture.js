(() => {
  const documentElement = document.documentElement;
  const body = document.body;

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

  return {
    documentWidth,
    documentHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    devicePixelRatio: window.devicePixelRatio,
  };
})();
