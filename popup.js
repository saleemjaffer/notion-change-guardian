// Test button functionality
document.getElementById('test').addEventListener('click', () => {
  const testButton = document.getElementById('test');
  const originalText = testButton.textContent;
  
  testButton.textContent = 'Testing...';
  testButton.disabled = true;
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentUrl = tabs[0].url;
    console.log('Current URL:', currentUrl);
    
    // Check if we're on a Notion page
    if (!currentUrl.includes('notion.so')) {
      testButton.textContent = 'Not on Notion';
      testButton.style.backgroundColor = '#ff9800';
      console.log('Not on a Notion page');
    } else {
      // Try to send a test message
      chrome.tabs.sendMessage(tabs[0].id, {action: "test"}, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Test error:', chrome.runtime.lastError.message);
          testButton.textContent = 'Script not ready - try refreshing page';
          testButton.style.backgroundColor = '#f44336';
        } else {
          testButton.textContent = 'Connected!';
          testButton.style.backgroundColor = '#4CAF50';
          console.log('Content script is working!');
        }
      });
    }
    
    // Reset button after 3 seconds
    setTimeout(() => {
      testButton.textContent = originalText;
      testButton.style.backgroundColor = '#2196F3';
      testButton.disabled = false;
    }, 3000);
  });
});