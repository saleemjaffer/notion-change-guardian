// DOM elements
const toggleButton = document.getElementById('toggleExtension');

let currentUrl = '';
let isEnabled = false;

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  checkCurrentPage();
});

// Check current page and update UI
function checkCurrentPage() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    currentUrl = tabs[0].url;
    console.log('Current URL:', currentUrl);
    
    // Check if we're on a Notion page
    if (!isNotionPage(currentUrl)) {
      updateUI('not-notion');
      return;
    }
    
    // Check if extension is enabled for this page
    checkExtensionStatus(tabs[0]);
  });
}

// Check if we're on a Notion page
function isNotionPage(url) {
  return url.includes('notion.so') || url.includes('notion.site') || url.includes('notion.com');
}

// Check extension status for current page
function checkExtensionStatus(tab) {
  chrome.tabs.sendMessage(tab.id, {action: "getStatus"}, (response) => {
    if (chrome.runtime.lastError) {
      console.log('Content script not ready:', chrome.runtime.lastError.message);
      updateUI('script-not-ready');
    } else {
      isEnabled = response.enabled;
      updateUI(isEnabled ? 'enabled' : 'disabled');
    }
  });
}

// Update UI based on current state
function updateUI(state) {
  switch (state) {
    case 'not-notion':
      toggleButton.textContent = 'Not Available';
      toggleButton.disabled = true;
      toggleButton.className = 'button button-secondary';
      break;
      
    case 'script-not-ready':
      toggleButton.textContent = 'Loading...';
      toggleButton.disabled = true;
      toggleButton.className = 'button button-secondary';
      break;
      
    case 'enabled':
      toggleButton.textContent = 'Disable';
      toggleButton.disabled = false;
      toggleButton.className = 'button button-secondary';
      break;
      
    case 'disabled':
      toggleButton.textContent = 'Enable';
      toggleButton.disabled = false;
      toggleButton.className = 'button button-primary';
      break;
  }
}

// Toggle extension enable/disable
toggleButton.addEventListener('click', () => {
  if (!isNotionPage(currentUrl)) {
    return;
  }
  
  const originalText = toggleButton.textContent;
  toggleButton.textContent = 'Working...';
  toggleButton.disabled = true;
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const action = isEnabled ? 'disable' : 'enable';
    
    chrome.tabs.sendMessage(tabs[0].id, {action: action}, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Toggle error:', chrome.runtime.lastError.message);
        toggleButton.textContent = 'Error - Refresh Page';
        toggleButton.className = 'button button-secondary';
        
        // Reset after 3 seconds
        setTimeout(() => {
          toggleButton.textContent = originalText;
          toggleButton.disabled = false;
          updateUI(isEnabled ? 'enabled' : 'disabled');
        }, 3000);
      } else {
        console.log('Toggle response:', response);
        isEnabled = !isEnabled;
        updateUI(isEnabled ? 'enabled' : 'disabled');
      }
    });
  });
});