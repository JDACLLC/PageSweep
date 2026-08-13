const manifest = chrome.runtime.getManifest();
const version = document.querySelector("#version");
const dismissButton = document.querySelector("#dismiss-button");

if (version) {
  version.textContent = `version ${manifest.version}`;
}

dismissButton?.addEventListener("click", async () => {
  const currentTab = await chrome.tabs.getCurrent();
  if (typeof currentTab?.id === "number") {
    await chrome.tabs.remove(currentTab.id);
  } else {
    window.close();
  }
});
