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

  // Add subtle parallax effect to wave icon
  const waveIcon = document.querySelector('.wave-icon');
  let scrollY = 0;
  
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    if (waveIcon) {
      waveIcon.style.transform = `translateY(${scrollY * 0.1}px) rotate(${Math.sin(scrollY * 0.01) * 5}deg)`;
    }
  });

  // Easter egg: Konami code for fun message
  let konamiCode = [];
  const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  
  document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
      console.log('🌊 You found the secret! The web is still magical ✨');
      document.body.style.animation = 'rainbow 2s ease-in-out';
      setTimeout(() => {
        document.body.style.animation = '';
      }, 2000);
    }
  });
});

// Rainbow animation for easter egg
const style = document.createElement('style');
style.textContent = `
  @keyframes rainbow {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }
`;
document.head.appendChild(style);
