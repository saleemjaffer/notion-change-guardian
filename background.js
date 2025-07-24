chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url.includes('notion.so')) {
      chrome.scripting.executeScript({
        target: { tabId },
        function: checkForEdits
      });
    }
  });
  
  function checkForEdits() {
    // This function will be injected into the page
    console.log("🔍 Notion Change Guardian: Background script checking page...");
  }