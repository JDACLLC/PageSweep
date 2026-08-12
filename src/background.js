chrome.action.onClicked.addListener((tab) => {
  console.log("Full Page Capture triggered", {
    tabId: tab.id,
    url: tab.url,
    title: tab.title,
  });
});
