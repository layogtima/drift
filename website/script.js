// Drift Landing Page - Interactive elements

document.addEventListener('DOMContentLoaded', () => {
  // Install button handler
  const installBtn = document.getElementById('install-btn');
  
  installBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // TODO: Replace with actual Chrome Web Store URL when published
    const chromeWebStoreUrl = 'https://chrome.google.com/webstore/detail/drift/YOUR_EXTENSION_ID';
    
    // For now, show a friendly message
    alert('Drift will be available on the Chrome Web Store soon!\n\nFor now, you can install it manually:\n1. Download from GitHub\n2. Go to chrome://extensions/\n3. Enable Developer mode\n4. Click "Load unpacked"\n5. Select the extension folder');
    
    // Uncomment when published:
    // window.open(chromeWebStoreUrl, '_blank');
  });

  // Smooth scroll for any anchor links (if added later)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});
