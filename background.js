// Manifest V3 Service Worker for Notion Change Guardian

// Handle extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🔍 Notion Change Guardian: Extension installed/updated', details.reason);
  
  if (details.reason === 'install') {
    // First-time installation setup
    console.log('🔍 Notion Change Guardian: First-time installation');
    
    // Set default settings if needed
    chrome.storage.local.set({
      'extension_version': chrome.runtime.getManifest().version,
      'install_date': Date.now()
    });
    
  } else if (details.reason === 'update') {
    // Extension was updated
    console.log('🔍 Notion Change Guardian: Extension updated from', details.previousVersion);
    
    // Update version in storage
    chrome.storage.local.set({
      'extension_version': chrome.runtime.getManifest().version,
      'update_date': Date.now()
    });
  }
});

// Update extension badge based on active Notion tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  updateBadgeForTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when page loading is complete
  if (changeInfo.status === 'complete' && tab.url) {
    updateBadgeForTab(tabId);
  }
});

async function updateBadgeForTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    
    if (!tab.url || !isNotionPage(tab.url)) {
      // Not a Notion page - clear badge
      chrome.action.setBadgeText({ text: '', tabId: tabId });
      return;
    }
    
    // Check if extension is enabled for this page
    const storage = await chrome.storage.local.get(`enabled_${tab.url}`);
    const isEnabled = storage[`enabled_${tab.url}`] || false;
    
    if (isEnabled) {
      // Extension is enabled - show green dot
      chrome.action.setBadgeText({ text: '●', tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tabId });
    } else {
      // Extension is disabled - clear badge
      chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
    
  } catch (error) {
    // Tab might not exist anymore, ignore error
    console.log('🔍 Notion Change Guardian: Tab no longer exists:', tabId);
  }
}

function isNotionPage(url) {
  return url && (
    url.includes('notion.so') || 
    url.includes('notion.site') || 
    url.includes('notion.com')
  );
}

// Handle messages from content scripts (if needed for cross-tab coordination)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔍 Notion Change Guardian: Background received message:', request);
  
  if (request.action === 'updateBadge') {
    // Content script requesting badge update
    if (sender.tab) {
      updateBadgeForTab(sender.tab.id);
    }
    sendResponse({ success: true });
  }
  
  // Add more message handlers as needed
});

console.log('🔍 Notion Change Guardian: Background service worker loaded');