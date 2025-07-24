// Prevent multiple injections
if (typeof window.notionEditDetectorLoaded === 'undefined') {
  window.notionEditDetectorLoaded = true;
  
  // Debug message to confirm script is loading
  console.log('🔍 Notion Change Guardian: Content script loaded on', window.location.href);

let lastContent = '';
let originalContent = ''; // Track the original baseline content
let editBanner = null;
let contentCheckTimeout = null;
let monitoringInterval = null;
let pageLoadTime = Date.now(); // Track when the page/script loaded
let settlingPeriod = 4000; // 4 seconds settling period after page load
let recentExpandCollapseTime = 0; // Track when expand/collapse operations occur
let expandCollapseGracePeriod = 2000; // 2 seconds after expand/collapse to ignore changes
let isExtensionEnabled = false; // Track if extension is enabled for this page

function createBanner() {
  if (editBanner) return;
  
  // Don't show banner during settling period after page load
  if (Date.now() - pageLoadTime < settlingPeriod) {
    console.log('🔍 Notion Change Guardian: Ignoring change during settling period');
    return;
  }
  
  // Don't show banner if we recently detected an expand/collapse operation
  if (Date.now() - recentExpandCollapseTime < expandCollapseGracePeriod) {
    console.log('🔍 Notion Change Guardian: Ignoring change - recent expand/collapse operation');
    return;
  }
  
  console.log('🔍 Notion Change Guardian: Creating banner element...');
  
  editBanner = document.createElement('div');
  editBanner.style.position = 'fixed';
  editBanner.style.top = '0';
  editBanner.style.left = '0';
  editBanner.style.width = '100%';
  editBanner.style.height = 'auto';
  editBanner.style.backgroundColor = '#ffeb3b';
  editBanner.style.color = '#000';
  editBanner.style.padding = '10px';
  editBanner.style.textAlign = 'center';
  editBanner.style.fontWeight = 'bold';
  editBanner.style.zIndex = '999999'; // Much higher z-index
  editBanner.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  editBanner.style.display = 'flex';
  editBanner.style.alignItems = 'center';
  editBanner.style.justifyContent = 'center';
  editBanner.style.fontFamily = 'Arial, sans-serif';
  editBanner.style.fontSize = '14px';
  editBanner.style.minHeight = '40px';
  editBanner.style.pointerEvents = 'auto';
  editBanner.style.visibility = 'visible';
  editBanner.style.opacity = '1';
  
  // Create the main text
  const bannerText = document.createElement('span');
  bannerText.textContent = 'Page Edited';
  bannerText.style.flex = '1';
  bannerText.style.textAlign = 'center';
  
  // Create the reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'OK';
  resetButton.style.position = 'absolute';
  resetButton.style.right = '15px';
  resetButton.style.padding = '6px 12px';
  resetButton.style.backgroundColor = '#4CAF50';
  resetButton.style.color = '#fff';
  resetButton.style.border = '1px solid #4CAF50';
  resetButton.style.borderRadius = '4px';
  resetButton.style.fontSize = '12px';
  resetButton.style.fontWeight = 'normal';
  resetButton.style.cursor = 'pointer';
  resetButton.style.transition = 'all 0.2s ease';
  resetButton.style.zIndex = '999997';
  resetButton.style.pointerEvents = 'auto';
  
  // Reset button hover effect
  resetButton.onmouseover = () => {
    resetButton.style.backgroundColor = '#45a049';
    resetButton.style.borderColor = '#45a049';
  };
  resetButton.onmouseout = () => {
    resetButton.style.backgroundColor = '#4CAF50';
    resetButton.style.borderColor = '#4CAF50';
  };
  
  // Reset button click handler
  resetButton.onclick = (e) => {
    e.stopPropagation(); // Prevent any parent click handlers
    console.log('🔍 Notion Change Guardian: Reset button clicked');
    
    // Show loading state
    resetButton.textContent = 'Working...';
    resetButton.disabled = true;
    resetButton.style.opacity = '0.6';
    
    // Perform reset logic
    performReset(() => {
      // Reset completed successfully
      console.log('🔍 Notion Change Guardian: Reset completed, removing banner');
      removeBanner();
    });
  };
  
  // Assemble the banner
  editBanner.appendChild(bannerText);
  editBanner.appendChild(resetButton);
  
  // Add to body and verify
  document.body.appendChild(editBanner);
  
  // Ensure it stays visible
  setTimeout(() => {
    if (editBanner && document.body.contains(editBanner)) {
      console.log('🔍 Notion Change Guardian: Banner still in DOM after 1 second');
    } else {
      console.log('🔍 Notion Change Guardian: WARNING - Banner was removed from DOM!');
    }
  }, 1000);
  
  console.log('🔍 Notion Change Guardian: Banner creation completed');
}

function removeBanner() {
  if (editBanner && editBanner.parentNode) {
    editBanner.parentNode.removeChild(editBanner);
    editBanner = null;
    console.log('🔍 Notion Change Guardian: Banner removed');
  }
}

function checkPageContentDebounced() {
  // Clear any existing timeout
  if (contentCheckTimeout) {
    clearTimeout(contentCheckTimeout);
  }
  
  // Debounce the content check to avoid rapid false positives
  contentCheckTimeout = setTimeout(checkPageContent, 500); // Increased debounce delay
}

function checkPageContent() {
  // Try multiple selectors to find Notion content
  const possibleSelectors = [
    '.notion-page-content',
    '[data-block-id]',
    '.notion-page-block',
    'main',
    '[role="main"]'
  ];
  
  let contentArea = null;
  for (const selector of possibleSelectors) {
    contentArea = document.querySelector(selector);
    if (contentArea) {
      break;
    }
  }
  
  if (!contentArea) {
    console.log('🔍 Notion Change Guardian: No content area found with any selector');
    return;
  }
  
  // Get a more stable representation of the content
  const currentContent = getStableContent(contentArea);
  
  // First time seeing the page or during settling period - establish original baseline
  if (!originalContent || Date.now() - pageLoadTime < settlingPeriod) {
    originalContent = currentContent;
    lastContent = currentContent;
    // Store the original content as baseline in local storage
    chrome.storage.local.set({ 
      [window.location.href]: currentContent 
    });
    
    if (Date.now() - pageLoadTime < settlingPeriod) {
      console.log('🔍 Notion Change Guardian: Updating baseline during settling period');
    }
    return;
  }
  
  // Skip check if content is empty or too similar to last check (might be scroll-related flicker)
  if (!currentContent || currentContent.length === 0) {
    console.log('🔍 Notion Change Guardian: Skipping empty content');
    return;
  }
  
  // If content is identical to last check, no need to process
  if (currentContent === lastContent) {
    return;
  }
  
  // Update last seen content
  lastContent = currentContent;
  
  // Compare current content against original baseline
  if (currentContent !== originalContent) {
    // Content has changed from original - show banner (createBanner will check for recent expand/collapse)
    if (!editBanner) {
      console.log('🔍 Notion Change Guardian: Content differs from original - showing banner');
      createBanner();
    }
  } else {
    // Content matches original - hide banner if it's showing
    if (editBanner) {
      console.log('🔍 Notion Change Guardian: Content reverted to original - hiding banner');
      removeBanner();
    }
  }
}

function getStableContent(element) {
  // Create a copy of the element to avoid modifying the original
  const clone = element.cloneNode(true);
  
  // Remove dynamic elements that change frequently, including scroll-related ones
  const dynamicSelectors = [
    // Cursors and selection indicators
    '.notion-cursor',
    '.notion-selection-area',
    '[data-block-id] .notion-focusable-within',
    
    // Collaboration indicators
    '.notion-presence-container',
    '.notion-user-select',
    
    // Hover states and focus indicators
    '.notion-block-hover-target',
    '.notion-hover-target',
    
    // Timestamps and live elements
    '.notion-timestamp',
    '.live-timestamp',
    
    // Loading states and spinners
    '.notion-spinner',
    '.loading',
    '.skeleton',
    
    // Virtual scrolling and lazy loading elements
    '.notion-lazy-block',
    '.notion-viewport-observer',
    '[data-loading]',
    '[data-lazy]',
    
    // Intersection observer related elements
    '.notion-intersection-observer',
    '.notion-sentinel',
    
    // Collapse/expand UI elements
    '.notion-toggle-button',
    '.notion-expand-button',
    '.notion-collapse-button',
    '.notion-toggle-icon',
    '[role="button"][aria-expanded]',
    
    // Scroll-related dynamic attributes
    '[style*="cursor"]',
    '[style*="selection"]',
    '[style*="visibility: hidden"]',
    '[style*="display: none"]'
  ];
  
  // Remove dynamic elements
  dynamicSelectors.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
  
  // Remove or normalize dynamic attributes
  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove dynamic style attributes
    if (el.style) {
      el.style.removeProperty('cursor');
      el.style.removeProperty('user-select');
      el.style.removeProperty('outline');
      el.style.removeProperty('box-shadow');
      el.style.removeProperty('visibility');
      el.style.removeProperty('height');
      el.style.removeProperty('max-height');
    }
    
    // Remove data attributes that change frequently during scrolling and state changes
    el.removeAttribute('data-focusable-within');
    el.removeAttribute('data-hovered');
    el.removeAttribute('data-selected');
    el.removeAttribute('data-in-viewport');
    el.removeAttribute('data-lazy-loaded');
    el.removeAttribute('data-intersection');
    el.removeAttribute('data-visible');
    
    // Remove collapse/expand related attributes
    el.removeAttribute('aria-expanded');
    el.removeAttribute('data-expanded');
    el.removeAttribute('data-collapsed');
    el.removeAttribute('data-toggle-state');
    
    // Remove CSS classes related to expand/collapse states
    const classesToRemove = [
      'expanded', 'collapsed', 'notion-toggle-expanded', 'notion-toggle-collapsed',
      'open', 'closed', 'visible', 'hidden'
    ];
    classesToRemove.forEach(className => {
      el.classList.remove(className);
    });
    
    // Normalize whitespace in text content
    if (el.nodeType === Node.TEXT_NODE) {
      el.textContent = el.textContent.trim();
    }
  });
  
  // Focus on actual content blocks rather than the entire page structure
  // This approach extracts just the meaningful text content, ignoring UI state
  const contentBlocks = clone.querySelectorAll('[data-block-id], .notion-text-block, .notion-header-block, .notion-list-block');
  
  if (contentBlocks.length > 0) {
    // Create a normalized content representation focusing only on actual text content
    let stableContent = '';
    contentBlocks.forEach(block => {
      // Get only the meaningful text content, ignoring structural elements
      const textContent = block.textContent?.trim();
      if (textContent && textContent.length > 0) {
        // Normalize whitespace and remove extra spaces
        const normalizedText = textContent.replace(/\s+/g, ' ').trim();
        stableContent += normalizedText + '\n';
      }
    });
    
    console.log('🔍 Notion Change Guardian: Using normalized content blocks for comparison');
    return simpleHash(stableContent.trim());
  } else {
    // Fallback: if no content blocks found, extract text from the entire element
    // but still focus on text content rather than HTML structure
    const textContent = clone.textContent?.trim();
    if (textContent) {
      const normalizedText = textContent.replace(/\s+/g, ' ').trim();
      console.log('🔍 Notion Change Guardian: Using normalized text content for comparison');
      return simpleHash(normalizedText);
    } else {
      // Final fallback to HTML if no text content
      const cleanedHTML = clone.innerHTML.trim();
      console.log('🔍 Notion Change Guardian: Using full HTML for comparison');
      return simpleHash(cleanedHTML);
    }
  }
}

function simpleHash(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

function initializeExtension() {
  console.log('🔍 Notion Change Guardian: Checking if extension is enabled for', window.location.href);
  
  // Check if extension is enabled for this page
  chrome.storage.local.get(`enabled_${window.location.href}`, (data) => {
    isExtensionEnabled = data[`enabled_${window.location.href}`] || false;
    
    if (!isExtensionEnabled) {
      console.log('🔍 Notion Change Guardian: Extension is disabled for this page');
      return;
    }
    
    console.log('🔍 Notion Change Guardian: Extension is enabled, initializing monitoring');
    startMonitoring();
  });
}

// Initialize with longer delay for page to settle
if (document.readyState === 'loading') {
  window.addEventListener('load', () => {
    setTimeout(initializeExtension, 1000); // Additional delay after load
  });
} else {
  // Document is already loaded, wait a bit longer
  setTimeout(initializeExtension, 3000); // Longer delay for already loaded pages
}

// Clean up when the page is unloaded
window.addEventListener('beforeunload', () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  if (contentCheckTimeout) {
    clearTimeout(contentCheckTimeout);
  }
});

// Handle messages from popup (enable/disable)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔍 Notion Change Guardian: Received message', request);
  
  if (request.action === "enable") {
    console.log('🔍 Notion Change Guardian: Enabling extension for this page');
    isExtensionEnabled = true;
    chrome.storage.local.set({[`enabled_${window.location.href}`]: true}, () => {
      startMonitoring();
      sendResponse({success: true, message: "Extension enabled"});
    });
  } else if (request.action === "disable") {
    console.log('🔍 Notion Change Guardian: Disabling extension for this page');
    chrome.storage.local.set({[`enabled_${window.location.href}`]: false}, () => {
      stopMonitoring();
      sendResponse({success: true, message: "Extension disabled"});
    });
  } else if (request.action === "getStatus") {
    // Return current enabled status
    sendResponse({enabled: isExtensionEnabled});
  }
  
  // Return true to keep the message channel open for async responses
  return true;
});

// Extract reset logic into a reusable function
function performReset(callback) {
  console.log('🔍 Notion Change Guardian: Performing reset...');
  
  // Clear any existing intervals/timeouts
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  if (contentCheckTimeout) {
    clearTimeout(contentCheckTimeout);
    contentCheckTimeout = null;
  }
  
  // Get current content to set as new baseline
  const possibleSelectors = [
    '.notion-page-content',
    '[data-block-id]',
    '.notion-page-block',
    'main',
    '[role="main"]'
  ];
  
  let contentArea = null;
  for (const selector of possibleSelectors) {
    contentArea = document.querySelector(selector);
    if (contentArea) {
      break;
    }
  }
  
  if (contentArea) {
    const currentContent = getStableContent(contentArea);
    originalContent = currentContent; // Update original baseline
    lastContent = currentContent; // Update last seen content
    
    // Store the new baseline in local storage
    chrome.storage.local.set({ 
      [window.location.href]: currentContent 
    }, () => {
      console.log('🔍 Notion Change Guardian: New baseline stored');
      
      // Reset the page load time to trigger settling period
      pageLoadTime = Date.now();
      
      // Wait 1 second before resuming monitoring after reset
      setTimeout(() => {
        // Resume monitoring for changes with debounced checking
        monitoringInterval = setInterval(checkPageContentDebounced, 3000);
        console.log('🔍 Notion Change Guardian: Monitoring resumed after reset');
        
        if (callback) callback();
      }, 1000); // 1 second delay after reset
    });
  } else {
    console.log('🔍 Notion Change Guardian: No content area found during reset');
    if (callback) callback();
  }
}

// Set up event listeners to detect expand/collapse operations
function setupExpandCollapseDetection() {
  // Listen for clicks on expand/collapse elements
  document.addEventListener('click', (event) => {
    const target = event.target;
    
    // Check if the clicked element is likely an expand/collapse trigger
    const isToggleElement = (
      target.matches('.notion-toggle-button') ||
      target.matches('.notion-toggle') ||
      target.matches('[role="button"][aria-expanded]') ||
      target.matches('[data-toggle]') ||
      target.closest('.notion-toggle-button') ||
      target.closest('.notion-toggle') ||
      target.closest('[role="button"][aria-expanded]') ||
      target.closest('[data-toggle]') ||
      // Check for triangle/arrow icons typically used for expand/collapse
      target.matches('svg') && target.closest('[role="button"]') ||
      // Check for text content that suggests expand/collapse
      (target.textContent && (target.textContent.includes('▶') || target.textContent.includes('▼')))
    );
    
    if (isToggleElement) {
      console.log('🔍 Notion Change Guardian: Detected expand/collapse operation');
      recentExpandCollapseTime = Date.now();
      
      // Also check if any aria-expanded attributes changed
      setTimeout(() => {
        checkForExpandedStateChanges();
      }, 100);
    }
  }, true); // Use capture phase to catch events early
  
  // Also listen for keyboard events that might trigger expand/collapse
  document.addEventListener('keydown', (event) => {
    // Space or Enter on focusable elements might trigger expand/collapse
    if ((event.key === ' ' || event.key === 'Enter') && event.target.matches('[role="button"][aria-expanded]')) {
      console.log('🔍 Notion Change Guardian: Detected keyboard expand/collapse operation');
      recentExpandCollapseTime = Date.now();
    }
  });
}

// Check for changes in aria-expanded attributes which indicate expand/collapse
function checkForExpandedStateChanges() {
  const expandableElements = document.querySelectorAll('[aria-expanded]');
  expandableElements.forEach(element => {
    // If we find elements with aria-expanded, it confirms expand/collapse activity
    if (element.getAttribute('aria-expanded') !== null) {
      console.log('🔍 Notion Change Guardian: Confirmed expand/collapse via aria-expanded attribute');
      recentExpandCollapseTime = Date.now();
    }
  });
}

function startMonitoring() {
  // Set up expand/collapse detection
  setupExpandCollapseDetection();
  
  // Clear any existing monitoring interval
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  // Wait 2 seconds for page to be stable before starting monitoring
  setTimeout(() => {
    chrome.storage.local.get(window.location.href, (data) => {
      if (data[window.location.href]) {
        originalContent = data[window.location.href]; // Load original baseline from storage
        lastContent = originalContent; // Initialize lastContent with original
        console.log('🔍 Notion Change Guardian: Loaded stored original content');
      } else {
        // First visit to this page - get initial content using stable method
        const possibleSelectors = [
          '.notion-page-content',
          '[data-block-id]',
          '.notion-page-block',
          'main',
          '[role="main"]'
        ];
        
        let contentArea = null;
        for (const selector of possibleSelectors) {
          contentArea = document.querySelector(selector);
          if (contentArea) {
            originalContent = getStableContent(contentArea); // Store original baseline
            lastContent = originalContent; // Initialize lastContent with original
            chrome.storage.local.set({ 
              [window.location.href]: originalContent 
            });
            console.log('🔍 Notion Change Guardian: First visit, storing original baseline');
            break;
          }
        }
        
        if (!contentArea) {
          console.log('🔍 Notion Change Guardian: No content area found during initialization');
        }
      }
      
      // Start monitoring for changes with debounced checking
      monitoringInterval = setInterval(checkPageContentDebounced, 3000); // Less frequent monitoring
      console.log('🔍 Notion Change Guardian: Started monitoring with debouncing');
    });
  }, 2000); // 2 second delay before initialization
}

function stopMonitoring() {
  console.log('🔍 Notion Change Guardian: Stopping monitoring');
  
  // Clear intervals and timeouts
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  if (contentCheckTimeout) {
    clearTimeout(contentCheckTimeout);
    contentCheckTimeout = null;
  }
  
  // Remove banner if it exists
  removeBanner();
  
  // Reset state
  isExtensionEnabled = false;
}

} // End of multiple injection prevention