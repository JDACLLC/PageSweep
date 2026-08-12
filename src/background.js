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
  } catch (error) {
    console.error("Full Page Capture could not measure this page.", error);
  }
});
