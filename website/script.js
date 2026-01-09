// Drift Landing Page - Interactive elements

// Reusable modal utility
function showModal(title, content) {
  const messageModal = document.getElementById('message-modal');
  const modalTitle = document.getElementById('message-modal-title');
  const modalContent = document.getElementById('message-modal-content');
  
  if (messageModal && modalTitle && modalContent) {
    modalTitle.innerHTML = title;
    modalContent.innerHTML = content;
    messageModal.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Installation modal elements
  const installModal = document.getElementById('install-modal');
  const sideloadBtn = document.getElementById('sideload-btn');
  const helpBtn = document.getElementById('help-btn');
  const closeInstallModalBtn = document.getElementById('close-modal');

  // Message modal elements
  const messageModal = document.getElementById('message-modal');
  const closeMessageModalBtn = document.getElementById('message-modal-close');

  // Show installation modal when sideload button is clicked
  if (sideloadBtn) {
    sideloadBtn.addEventListener('click', (e) => {
      // Don't prevent default - let the download happen
      // Show modal after a brief delay to let download start
      setTimeout(() => {
        installModal.classList.remove('hidden');
      }, 200);
    });
  }

  // Show installation modal when help button is clicked
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      installModal.classList.remove('hidden');
    });
  }

  // Close installation modal when X is clicked
  if (closeInstallModalBtn) {
    closeInstallModalBtn.addEventListener('click', () => {
      installModal.classList.add('hidden');
    });
  }

  // Close installation modal when clicking outside
  if (installModal) {
    installModal.addEventListener('click', (e) => {
      if (e.target === installModal) {
        installModal.classList.add('hidden');
      }
    });
  }

  // Close message modal when X is clicked
  if (closeMessageModalBtn) {
    closeMessageModalBtn.addEventListener('click', () => {
      messageModal.classList.add('hidden');
    });
  }

  // Close message modal when clicking outside
  if (messageModal) {
    messageModal.addEventListener('click', (e) => {
      if (e.target === messageModal) {
        messageModal.classList.add('hidden');
      }
    });
  }

  // Chrome Store install button handler
  const installBtn = document.getElementById('install-btn');
  
  if (installBtn) {
    installBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // TODO: Replace with actual Chrome Web Store URL when published
      const chromeWebStoreUrl = 'https://chrome.google.com/webstore/detail/drift/YOUR_EXTENSION_ID';
      
      // Show themed modal instead of alert
      showModal(
        '<i class="fa-light fa-sparkles text-sol-cyan mr-2"></i>Coming Soon!',
        `<p class="mb-3">Drift will be available on the Chrome Web Store very soon! 🚀</p>
         <p class="text-sol-base1">For now, you can <strong class="text-sol-cyan">sideload the extension</strong> using the download button above.</p>`
      );
      
      // Uncomment when published:
      // window.open(chromeWebStoreUrl, '_blank');
    });
  }

  // Smooth scroll for any anchor links (if added later)
  document.querySelectorAll('a[href^=\"#\"]').forEach(anchor => {
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
