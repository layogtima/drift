// Drift Content Script
// Injects toolbar and handles user interactions

// State
let toolbarVisible = true;
let driftHistory = [];
let stats = {};
let preferences = {};
let isFirstRun = false;
let currentUser = null;
let pendingCount = 0;
let currentUrl = null; // Currently displayed URL data
let approvalMode = false; // Approval mode for mods/admins
let urlExistsInDb = false; // Whether current page URL exists in database

// Initialize
async function init() {
  // Load data from storage
  const data = await chrome.storage.local.get([
    'driftHistory',
    'stats',
    'preferences',
    'firstRun',
    'toolbarVisible',
    'currentUser',
    'approvalMode',
    'urlCache'
  ]);

  driftHistory = data.driftHistory || [];
  stats = data.stats || { totalDrifts: 0, totalLikes: 0, totalDislikes: 0 };
  preferences = data.preferences || { openInNewTab: false, toolbarPosition: 'top', theme: 'light' };
  isFirstRun = data.firstRun || false;
  toolbarVisible = data.toolbarVisible !== undefined ? data.toolbarVisible : true;
  currentUser = data.currentUser || null;
  approvalMode = data.approvalMode || false;

  // Check if current URL exists in database
  if (data.urlCache && data.urlCache.urls) {
    const currentPageUrl = window.location.href;
    urlExistsInDb = data.urlCache.urls.some(item => item.url === currentPageUrl);
  }

  // Apply theme
  document.body.setAttribute('data-theme', preferences.theme || 'light');

  // Create and inject toolbar
  createToolbar();

  // Show first-run tooltip
  if (isFirstRun) {
    setTimeout(showFirstRunTooltip, 1000);
  }
}

// SVG Icons
const icons = {
  shuffle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Pro 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path d="M288 112C301.3 112 312 101.3 312 88C312 74.7 301.3 64 288 64C274.7 64 264 74.7 264 88C264 101.3 274.7 112 288 112zM288 32C318.9 32 344 57.1 344 88C344 118.9 318.9 144 288 144C257.1 144 232 118.9 232 88C232 57.1 257.1 32 288 32zM288 208C274.7 208 264 218.7 264 232L264 336.4C264 351.4 271 365.4 282.8 374.5L312 396.8L312 232C312 218.7 301.3 208 288 208zM344 421.3L372.7 443.2C389.6 456.1 400.6 475.1 403.4 496.2L415.9 589.9C417.1 598.7 410.9 606.7 402.2 607.9C393.5 609.1 385.4 602.9 384.2 594.2L371.7 500.5C370 487.9 363.4 476.4 353.3 468.7L263.5 400C243.7 384.9 232.1 361.4 232.1 336.5L232 232C232 201.1 257.1 176 288 176C313.5 176 337.1 189.7 349.8 211.8L379.5 263.8C388 278.8 404 288 421.2 288L480.1 288L480.1 176C480.1 167.2 487.3 160 496.1 160C504.9 160 512.1 167.2 512.1 176L512.1 592C512.1 600.8 504.9 608 496.1 608C487.3 608 480.1 600.8 480.1 592L480.1 320L421.2 320C392.5 320 366 304.6 351.7 279.7L344 266.3L344 421.3zM229.2 475.7L239.8 438.5L266.5 461.4L259.9 484.5C256.2 497.6 249.2 509.5 239.5 519.1L155.3 603.3C149.1 609.5 138.9 609.5 132.7 603.3C126.5 597.1 126.5 586.9 132.7 580.7L217 496.4C222.8 490.6 227 483.5 229.2 475.6zM160 192C142.3 192 128 206.3 128 224L128 320L160 320L160 192zM96 224C96 188.7 124.7 160 160 160C177.7 160 192 174.3 192 192L192 320C192 337.7 177.7 352 160 352L128 352C110.3 352 96 337.7 96 320L96 224z"/></svg>',
  thumbsUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>',
  thumbsDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
};

// Create toolbar HTML
function createToolbar() {
  const toolbar = document.createElement('div');
  toolbar.id = 'drift-toolbar';

  // Get page title (truncate if too long)
  const pageTitle = document.title.length > 50 ? document.title.substring(0, 47) + '...' : document.title;

  // Build toolbar HTML
  let toolbarHTML = `
    <button id="drift-btn" title="Drift to a random site!">
      <span class="drift-icon">${icons.shuffle}</span>
      <span>Drift</span>
    </button>
    <button id="drift-like-btn" title="Like this site">
      <span class="drift-icon">${icons.thumbsUp}</span>
    </button>
    <button id="drift-dislike-btn" title="Dislike this site">
      <span class="drift-icon">${icons.thumbsDown}</span>
    </button>
    <button id="drift-submit-btn" title="Submit current page">
      <span class="drift-icon">${icons.plus}</span>
      <span>Submit</span>
    </button>
    <span id="drift-page-title" title="${document.title}">${pageTitle}</span>
  `;

  // Approval mode toggle for mods/admins
  if (currentUser && (currentUser.role === 'mod' || currentUser.role === 'admin')) {
    toolbarHTML += `
      <button id="drift-approval-mode-btn" class="${approvalMode ? 'active' : ''}" title="Toggle Approval Mode">
        <span class="drift-icon">${icons.check}</span>
        <span>${approvalMode ? 'Approval ON' : 'Approval Mode'}</span>
        ${pendingCount > 0 ? `<span class="drift-badge">${pendingCount}</span>` : ''}
      </button>
    `;
  }

  // User indicator / login button
  if (currentUser) {
    toolbarHTML += `
      <button id="drift-user-btn" title="Logged in as ${currentUser.username}">
        <span class="drift-icon">${icons.user}</span>
        <span>${currentUser.username}</span>
      </button>
    `;
  } else {
    toolbarHTML += `
      <button id="drift-login-btn" title="Login">
        <span class="drift-icon">${icons.user}</span>
        <span>Login</span>
      </button>
    `;
  }

  toolbarHTML += `
    <button id="drift-share-btn" title="Share this page">
      <span class="drift-icon">${icons.share}</span>
    </button>
    <span class="hidden" id="drift-stats">Sites: ${stats.totalDrifts}</span>
    <button id="drift-settings-btn" title="Open settings popup">
      <span class="drift-icon">${icons.settings}</span>
    </button>
    <button id="drift-collapse-btn" title="Hide toolbar (Alt+D to restore)">
      <span class="drift-icon">${icons.x}</span>
    </button>
  `;

  toolbar.innerHTML = toolbarHTML;

  // Create pull-down tab
  const pullTab = document.createElement('div');
  pullTab.id = 'drift-pull-tab';
  pullTab.innerHTML = `<span class="drift-icon">${icons.chevronDown}</span>`;
  pullTab.title = 'Show Drift toolbar';

  document.body.appendChild(toolbar);
  document.body.appendChild(pullTab);

  // Protect toolbar
  protectToolbar(toolbar, pullTab);

  // Add event listeners
  document.getElementById('drift-btn').addEventListener('click', handleDrift);
  const submitBtn = document.getElementById('drift-submit-btn');
  if (submitBtn) submitBtn.addEventListener('click', handleSubmitClick);
  document.getElementById('drift-like-btn').addEventListener('click', handleLike);
  document.getElementById('drift-dislike-btn').addEventListener('click', handleDislike);
  document.getElementById('drift-share-btn').addEventListener('click', handleShare);
  document.getElementById('drift-settings-btn').addEventListener('click', openSettingsPopup);
  document.getElementById('drift-collapse-btn').addEventListener('click', toggleToolbar);
  pullTab.addEventListener('click', toggleToolbar);

  // Approval mode toggle for mods/admins
  if (currentUser && (currentUser.role === 'mod' || currentUser.role === 'admin')) {
    document.getElementById('drift-approval-mode-btn').addEventListener('click', toggleApprovalMode);
  }

  if (currentUser) {
    document.getElementById('drift-user-btn').addEventListener('click', handleUserClick);
  } else {
    document.getElementById('drift-login-btn').addEventListener('click', showAuthModal);
  }

  // Apply saved toolbar visibility
  if (!toolbarVisible) {
    toolbar.classList.add('hidden');
    document.body.style.marginTop = '0';
  } else {
    adjustPageContent();
  }
}

// Protect toolbar from removal
function protectToolbar(toolbar, pullTab) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node === toolbar || node.id === 'drift-toolbar') {
          console.log('[Drift] Toolbar removed, re-injecting...');
          setTimeout(() => {
            if (!document.getElementById('drift-toolbar')) {
              init();
            }
          }, 100);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: false });
}

// Adjust page content
function adjustPageContent() {
  document.body.style.marginTop = '48px';
}

// Handle Drift button click
async function handleDrift() {
  console.log('[Drift] Drift button clicked, approval mode:', approvalMode);
  const excludeUrls = driftHistory.map(item => item.url);
  
  // Also exclude the current page URL to prevent drifting to the same page
  excludeUrls.push(window.location.href);

  // Get random URL from background script
  chrome.runtime.sendMessage(
    {
      action: 'getDriftUrl',
      excludeUrls,
      approvalMode // Pass approval mode flag
    },
    (response) => {
      console.log('[Drift] getDriftUrl response:', response);
      if (response && response.url) {
        const urlData = response.url;
        currentUser = response.user || null;
        pendingCount = response.pendingCount || 0;
        currentUrl = urlData;

        console.log('[Drift] Navigating to:', urlData.url);

        // Save to history (only if not in approval mode)
        if (!approvalMode) {
          driftHistory.push({
            url: urlData.url,
            timestamp: Date.now(),
            liked: null
          });

          // Update stats
          stats.totalDrifts++;

          // Save to storage
          chrome.storage.local.set({ driftHistory, stats });

          // Update UI
          updateStats();
        }

        // Save pending URL data for review on next page (persists across navigation)
        if (urlData.status === 'pending') {
          chrome.storage.local.set({ pendingUrlForReview: urlData });
        }

        // Navigate
        window.location.href = urlData.url;
      } else {
        console.error('[Drift] No URL received from background');
        // Check response pendingCount (not stale local variable) to show correct message
        const actualPendingCount = response?.pendingCount || 0;
        if (approvalMode && actualPendingCount === 0) {
          showNotification('✅ No pending URLs to review!');
        } else if (approvalMode && actualPendingCount > 0) {
          showNotification('⚠️ Could not load pending URLs. Try refreshing the page.');
        } else if (response && response.error) {
          console.error('[Drift] Error:', response.error);
        }
      }
    }
  );
}

// Toggle approval mode
function toggleApprovalMode() {
  approvalMode = !approvalMode;
  console.log('[Drift] Approval mode toggled:', approvalMode);

  // Persist approval mode to storage so it survives navigation
  chrome.storage.local.set({ approvalMode });

  // Update button appearance
  const btn = document.getElementById('drift-approval-mode-btn');
  if (approvalMode) {
    btn.classList.add('active');
    btn.innerHTML = `
      <span class="drift-icon">${icons.check}</span>
      <span>Approval ON</span>
      ${pendingCount > 0 ? `<span class="drift-badge">${pendingCount}</span>` : ''}
    `;
    showNotification('🔍 Approval Mode: Only pending URLs will be shown');
  } else {
    btn.classList.remove('active');
    btn.innerHTML = `
      <span class="drift-icon">${icons.check}</span>
      <span>Approval Mode</span>
      ${pendingCount > 0 ? `<span class="drift-badge">${pendingCount}</span>` : ''}
    `;
    showNotification('✨ Normal Mode: Random URLs from all categories');
  }
}

// Handle Submit button click
function handleSubmitClick() {
  if (!currentUser) {
    showAuthModal();
    return;
  }

  showSubmitModal();
}

// Handle User button click
function handleUserClick() {
  showUserMenu();
}

// Handle Like button
async function handleLike() {
  const currentUrl = window.location.href;

  // Find in history
  const historyItem = driftHistory.find(item => item.url === currentUrl);
  if (historyItem) {
    historyItem.liked = true;
  }

  // Update stats
  stats.totalLikes++;

  // Save to storage
  await chrome.storage.local.set({ driftHistory, stats });

  // Visual feedback
  const btn = document.getElementById('drift-like-btn');
  btn.classList.add('active');
  setTimeout(() => btn.classList.remove('active'), 1000);

  updateStats();
}

// Handle Dislike button
async function handleDislike() {
  const currentUrl = window.location.href;

  // Find in history
  const historyItem = driftHistory.find(item => item.url === currentUrl);
  if (historyItem) {
    historyItem.liked = false;
  }

  // Update stats
  stats.totalDislikes++;

  // Save to storage
  await chrome.storage.local.set({ driftHistory, stats });

  // Visual feedback
  const btn = document.getElementById('drift-dislike-btn');
  btn.classList.add('active');
  setTimeout(() => btn.classList.remove('active'), 1000);

  updateStats();
}

// Handle Share button
async function handleShare() {
  const currentUrl = window.location.href;
  const btn = document.getElementById('drift-share-btn');

  try {
    if (navigator.share) {
      await navigator.share({
        title: document.title,
        url: currentUrl
      });
    } else {
      await navigator.clipboard.writeText(currentUrl);
      const originalHTML = btn.innerHTML;
      btn.innerHTML = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('copied');
      }, 2000);
    }
  } catch (error) {
    console.error('Share failed:', error);
  }
}

// Toggle toolbar
function toggleToolbar() {
  const toolbar = document.getElementById('drift-toolbar');
  toolbarVisible = !toolbarVisible;

  if (toolbarVisible) {
    toolbar.classList.remove('hidden');
    document.body.style.marginTop = '48px';
  } else {
    toolbar.classList.add('hidden');
    document.body.style.marginTop = '0';
  }

  chrome.storage.local.set({ toolbarVisible });
}

// Update stats display
function updateStats() {
  const statsEl = document.getElementById('drift-stats');
  if (statsEl) {
    statsEl.textContent = `Sites: ${stats.totalDrifts}`;
  }
}

// Show first-run tooltip
function showFirstRunTooltip() {
  const tooltip = document.createElement('div');
  tooltip.id = 'drift-tooltip';
  tooltip.textContent = 'Click Drift to begin! ';
  document.body.appendChild(tooltip);

  setTimeout(() => {
    tooltip.remove();
    chrome.storage.local.set({ firstRun: false });
  }, 5000);
}

// Open settings popup
function openSettingsPopup() {
  // Direct user to click extension icon
  const tooltip = document.createElement('div');
  tooltip.id = 'drift-settings-tooltip';
  tooltip.textContent = '← Click Drift icon in extensions bar';
  tooltip.style.cssText = `
    position: fixed;
    top: 56px;
    right: 60px;
    background-color: var(--drift-primary);
    color: var(--drift-bg);
    padding: 8px 12px;
    border-radius: 4px;
    font-family: 'Karla', sans-serif;
    font-size: 12px;
    z-index: 2147483646;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  `;

  document.body.appendChild(tooltip);
  setTimeout(() => tooltip.remove(), 3000);
}

// Show auth modal
function showAuthModal() {
  // Don't open if already open
  if (document.getElementById('drift-auth-modal')) return;
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'drift-auth-modal';
  modal.className = 'drift-modal';
  modal.innerHTML = `
    <div class="drift-modal-content">
      <div class="drift-modal-header">
        <h2>Welcome to Drift</h2>
        <button id="drift-auth-close" class="drift-close-btn">${icons.x}</button>
      </div>
      <div class="drift-tabs">
        <button id="drift-tab-login" class="drift-tab active">Login</button>
        <button id="drift-tab-register" class="drift-tab">Register</button>
      </div>
      <div id="drift-login-form" class="drift-auth-form">
        <input type="email" id="drift-login-email" placeholder="Email" />
        <input type="password" id="drift-login-password" placeholder="Password" />
        <div id="drift-login-error" class="drift-error"></div>
        <button id="drift-login-submit" class="drift-primary-btn">Login</button>
      </div>
      <div id="drift-register-form" class="drift-auth-form" style="display: none;">
        <input type="email" id="drift-register-email" placeholder="Email" />
        <input type="text" id="drift-register-username" placeholder="Username" />
        <input type="password" id="drift-register-password" placeholder="Password (8+ chars)" />
        <div id="drift-register-error" class="drift-error"></div>
        <button id="drift-register-submit" class="drift-primary-btn">Register</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  document.getElementById('drift-auth-close').addEventListener('click', () => modal.remove());
  document.getElementById('drift-tab-login').addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('drift-tab-register').addEventListener('click', () => switchAuthTab('register'));
  document.getElementById('drift-login-submit').addEventListener('click', handleLogin);
  document.getElementById('drift-register-submit').addEventListener('click', handleRegister);

  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function switchAuthTab(tab) {
  if (tab === 'login') {
    document.getElementById('drift-tab-login').classList.add('active');
    document.getElementById('drift-tab-register').classList.remove('active');
    document.getElementById('drift-login-form').style.display = 'block';
    document.getElementById('drift-register-form').style.display = 'none';
  } else {
    document.getElementById('drift-tab-register').classList.add('active');
    document.getElementById('drift-tab-login').classList.remove('active');
    document.getElementById('drift-register-form').style.display = 'block';
    document.getElementById('drift-login-form').style.display = 'none';
  }
}

async function handleLogin() {
  const email = document.getElementById('drift-login-email').value;
  const password = document.getElementById('drift-login-password').value;
  const errorEl = document.getElementById('drift-login-error');

  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields';
    return;
  }

  // Call auth via background script
  chrome.runtime.sendMessage(
    { action: 'login', email, password },
    (response) => {
      if (response.success) {
        currentUser = response.user;
        document.getElementById('drift-auth-modal').remove();
        location.reload(); // Reload to update toolbar
      } else {
        errorEl.textContent = response.error;
      }
    }
  );
}

async function handleRegister() {
  const email = document.getElementById('drift-register-email').value;
  const username = document.getElementById('drift-register-username').value;
  const password = document.getElementById('drift-register-password').value;
  const errorEl = document.getElementById('drift-register-error');

  console.log('[Drift] Register attempt:', { email, username });

  if (!email || !username || !password) {
    errorEl.textContent = 'Please fill in all fields';
    return;
  }

  console.log('[Drift] Sending register message to background...');
  chrome.runtime.sendMessage(
    { action: 'register', email, username, password },
    (response) => {
      console.log('[Drift] Register response:', response);
      if (response && response.success) {
        currentUser = response.user;
        document.getElementById('drift-auth-modal').remove();
        location.reload();
      } else {
        errorEl.textContent = response ? response.error : 'No response from background script';
      }
    }
  );
}

// Show submit modal
function showSubmitModal() {
  // Don't open if already open
  if (document.getElementById('drift-submit-modal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'drift-submit-modal';
  modal.className = 'drift-modal';
  modal.innerHTML = `
    <div class="drift-modal-content">
      <div class="drift-modal-header">
        <h2>Submit URL</h2>
        <button id="drift-submit-close" class="drift-close-btn">${icons.x}</button>
      </div>
      <div class="drift-submit-form">
        <label>URL</label>
        <input type="url" id="drift-submit-url" value="${window.location.href}" />
        <label>Title</label>
        <input type="text" id="drift-submit-title" value="${document.title}" />
        <label>Tags (comma-separated)</label>
        <input type="text" id="drift-submit-tags" placeholder="e.g., technology, ai, tools" />
        <div id="drift-submit-error" class="drift-error"></div>
        <button id="drift-submit-submit" class="drift-primary-btn">Submit for Review</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('drift-submit-close').addEventListener('click', () => modal.remove());
  document.getElementById('drift-submit-submit').addEventListener('click', handleSubmitUrl);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function handleSubmitUrl() {
  const url = document.getElementById('drift-submit-url').value;
  const title = document.getElementById('drift-submit-title').value;
  const tags = document.getElementById('drift-submit-tags').value;
  const errorEl = document.getElementById('drift-submit-error');

  if (!url || !title) {
    errorEl.textContent = 'URL and title are required';
    return;
  }

  chrome.runtime.sendMessage(
    {
      action: 'submitUrl',
      url,
      title,
      tags
    },
    (response) => {
      if (response.success) {
        document.getElementById('drift-submit-modal').remove();
        showNotification('✅ URL submitted! Waiting for moderator approval.');
      } else {
        errorEl.textContent = response.error;
      }
    }
  );
}

// Show user menu
function showUserMenu() {
  // Don't open if already open
  if (document.getElementById('drift-user-modal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'drift-user-modal';
  modal.className = 'drift-modal';
  modal.innerHTML = `
    <div class="drift-modal-content">
      <div class="drift-modal-header">
        <h2>${currentUser.username}</h2>
        <button id="drift-user-close" class="drift-close-btn">${icons.x}</button>
      </div>
      <div class="drift-user-info">
        <p><strong>Role:</strong> ${currentUser.role}</p>
        ${pendingCount > 0 && (currentUser.role === 'mod' || currentUser.role === 'admin') ? `<p><strong>Pending URLs:</strong> ${pendingCount}</p>` : ''}
        <button id="drift-logout-btn" class="drift-secondary-btn">Logout</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('drift-user-close').addEventListener('click', () => modal.remove());
  document.getElementById('drift-logout-btn').addEventListener('click', handleLogout);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function handleLogout() {
  chrome.runtime.sendMessage(
    { action: 'logout' },
    () => {
      location.reload();
    }
  );
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'drift-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    font-family: 'Karla', sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}

// Check if current URL is pending and show approval overlay
async function checkPendingUrl() {
  // Wait a bit for navigation to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  // Retrieve pending URL data from storage (persisted across navigation)
  const data = await chrome.storage.local.get(['pendingUrlForReview', 'currentUser']);
  const pendingUrl = data.pendingUrlForReview;
  const user = data.currentUser || currentUser;

  // Check if this page matches the pending URL we navigated to
  if (!pendingUrl || pendingUrl.url !== window.location.href) return;

  if (pendingUrl.status === 'pending') {
    // Show pending banner for regular users who submitted this
    if (!user || (user.id === pendingUrl.submitter_id && user.role === 'user')) {
      showPendingBanner();
    }
    // Show approval overlay for mods/admins
    else if (user && (user.role === 'mod' || user.role === 'admin')) {
      showApprovalOverlay(pendingUrl);
    }
  }
}

function showPendingBanner() {
  const banner = document.createElement('div');
  banner.id = 'drift-pending-banner';
  banner.textContent = '⏳ PENDING - This is your submission waiting for approval';
  banner.style.cssText = `
    position: fixed;
    top: 48px;
    left: 0;
    right: 0;
    background: #ff9800;
    color: white;
    padding: 12px;
    text-align: center;
    font-family: 'Karla', sans-serif;
    font-size: 14px;
    font-weight: 600;
    z-index: 2147483645;
  `;
  document.body.appendChild(banner);
}

function showApprovalOverlay(urlData) {
  // Don't open if already open
  if (document.getElementById('drift-approval-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'drift-approval-overlay';
  overlay.innerHTML = `
    <div class="drift-approval-content">
      <h3>PENDING SUBMISSION</h3>
      <p><strong>Submitted by ID:</strong> ${urlData.submitter_id}</p>
      <p><strong>Tags:</strong> ${urlData.tags ? urlData.tags.join(', ') : 'None'}</p>
      <div class="drift-approval-actions">
        <button id="drift-approve-btn" class="drift-approve-btn">
          <span class="drift-icon">${icons.check}</span> Approve
        </button>
        <button id="drift-reject-btn" class="drift-reject-btn">
          <span class="drift-icon">${icons.x}</span> Reject
        </button>
      </div>
    </div>
  `;
  overlay.style.cssText = `
    position: fixed;
    top: 48px;
    left: 0;
    right: 0;
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 20px;
    text-align: center;
    font-family: 'Karla', sans-serif;
    z-index: 2147483645;
  `;

  document.body.appendChild(overlay);

  document.getElementById('drift-approve-btn').addEventListener('click', () => handleApproveUrl(urlData.id));
  document.getElementById('drift-reject-btn').addEventListener('click', () => handleRejectUrl(urlData.id));
}

function handleApproveUrl(urlId) {
  chrome.runtime.sendMessage(
    { action: 'approveUrl', urlId },
    (response) => {
      if (response.success) {
        document.getElementById('drift-approval-overlay').remove();
        // Clear the pending URL from storage
        chrome.storage.local.remove('pendingUrlForReview');
        showNotification('✅ URL approved!');
      } else {
        showNotification('❌ ' + response.error);
      }
    }
  );
}

function handleRejectUrl(urlId) {
  chrome.runtime.sendMessage(
    { action: 'rejectUrl', urlId },
    (response) => {
      if (response.success) {
        document.getElementById('drift-approval-overlay').remove();
        // Clear the pending URL from storage
        chrome.storage.local.remove('pendingUrlForReview');
        showNotification('✅ URL rejected');
      } else {
        showNotification('❌ ' + response.error);
      }
    }
  );
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleToolbar') {
    toggleToolbar();
  } else if (request.action === 'updateTheme') {
    document.body.setAttribute('data-theme', request.theme);
  }
});

// Initialize when DOM is ready
let initialized = false;

function safeInit() {
  if (initialized) return;
  if (document.getElementById('drift-toolbar')) return;
  initialized = true;
  init();
  checkPendingUrl();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInit);
} else {
  safeInit();
}
