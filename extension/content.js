// Drift Content Script
// Injects toolbar and handles user interactions

// State
let toolbarVisible = true;
let currentCategory = 'all';
let driftHistory = [];
let categoryWeights = {};
let stats = {};
let preferences = {};
let isFirstRun = false;

// Initialize
async function init() {
  // Load data from storage
  const data = await chrome.storage.local.get([
    'driftHistory',
    'stats',
    'preferences',
    'categoryWeights',
    'firstRun',
    'toolbarVisible'
  ]);

  driftHistory = data.driftHistory || [];
  stats = data.stats || { totalDrifts: 0, totalLikes: 0, totalDislikes: 0 };
  preferences = data.preferences || { openInNewTab: false, toolbarPosition: 'top', defaultCategory: 'all', theme: 'light' };
  categoryWeights = data.categoryWeights || {};
  isFirstRun = data.firstRun || false;
  toolbarVisible = data.toolbarVisible !== undefined ? data.toolbarVisible : true;
  currentCategory = preferences.defaultCategory;

  // Apply theme
  document.body.setAttribute('data-theme', preferences.theme || 'light');

  // Create and inject toolbar
  createToolbar();
  
  // Show first-run tooltip
  if (isFirstRun) {
    setTimeout(showFirstRunTooltip, 1000);
  }
}

// SVG Icons as inline strings
const icons = {
  shuffle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Pro 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path d="M288 112C301.3 112 312 101.3 312 88C312 74.7 301.3 64 288 64C274.7 64 264 74.7 264 88C264 101.3 274.7 112 288 112zM288 32C318.9 32 344 57.1 344 88C344 118.9 318.9 144 288 144C257.1 144 232 118.9 232 88C232 57.1 257.1 32 288 32zM288 208C274.7 208 264 218.7 264 232L264 336.4C264 351.4 271 365.4 282.8 374.5L312 396.8L312 232C312 218.7 301.3 208 288 208zM344 421.3L372.7 443.2C389.6 456.1 400.6 475.1 403.4 496.2L415.9 589.9C417.1 598.7 410.9 606.7 402.2 607.9C393.5 609.1 385.4 602.9 384.2 594.2L371.7 500.5C370 487.9 363.4 476.4 353.3 468.7L263.5 400C243.7 384.9 232.1 361.4 232.1 336.5L232 232C232 201.1 257.1 176 288 176C313.5 176 337.1 189.7 349.8 211.8L379.5 263.8C388 278.8 404 288 421.2 288L480.1 288L480.1 176C480.1 167.2 487.3 160 496.1 160C504.9 160 512.1 167.2 512.1 176L512.1 592C512.1 600.8 504.9 608 496.1 608C487.3 608 480.1 600.8 480.1 592L480.1 320L421.2 320C392.5 320 366 304.6 351.7 279.7L344 266.3L344 421.3zM229.2 475.7L239.8 438.5L266.5 461.4L259.9 484.5C256.2 497.6 249.2 509.5 239.5 519.1L155.3 603.3C149.1 609.5 138.9 609.5 132.7 603.3C126.5 597.1 126.5 586.9 132.7 580.7L217 496.4C222.8 490.6 227 483.5 229.2 475.6zM160 192C142.3 192 128 206.3 128 224L128 320L160 320L160 192zM96 224C96 188.7 124.7 160 160 160C177.7 160 192 174.3 192 192L192 320C192 337.7 177.7 352 160 352L128 352C110.3 352 96 337.7 96 320L96 224z"/></svg>',
  thumbsUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>',
  thumbsDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
};

// Create toolbar HTML
function createToolbar() {
  const toolbar = document.createElement('div');
  toolbar.id = 'drift-toolbar';
  
  // Get page title (truncate if too long)
  const pageTitle = document.title.length > 50 ? document.title.substring(0, 47) + '...' : document.title;
  
  toolbar.innerHTML = `
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
    <select id="drift-category-select">
      <option value="all">All Categories</option>
      <option value="technology">Technology</option>
      <option value="science">Science</option>
      <option value="design">Design</option>
      <option value="art">Art</option>
      <option value="weird">Weird</option>
      <option value="diy">DIY</option>
      <option value="philosophy">Philosophy</option>
    </select>
    <span id="drift-page-title" title="${document.title}">${pageTitle}</span>
    <button id="drift-share-btn" title="Share this page">
      <span class="drift-icon">${icons.share}</span>
    </button>
    <span id="drift-stats">Sites: ${stats.totalDrifts}</span>
    <button id="drift-settings-btn" title="Open settings popup">
      <span class="drift-icon">${icons.settings}</span>
    </button>
    <button id="drift-collapse-btn" title="Hide toolbar (Alt+D to restore)">
      <span class="drift-icon">${icons.x}</span>
    </button>
  `;
  
  // Create pull-down tab (shown when toolbar is hidden)
  const pullTab = document.createElement('div');
  pullTab.id = 'drift-pull-tab';
  pullTab.innerHTML = `<span class="drift-icon">${icons.chevronDown}</span>`;
  pullTab.title = 'Show Drift toolbar';
  
  document.body.appendChild(toolbar);
  document.body.appendChild(pullTab);
  
  // Protect toolbar from removal by other scripts
  protectToolbar(toolbar, pullTab);
  
  // Add event listeners
  document.getElementById('drift-btn').addEventListener('click', handleDrift);
  document.getElementById('drift-like-btn').addEventListener('click', handleLike);
  document.getElementById('drift-dislike-btn').addEventListener('click', handleDislike);
  document.getElementById('drift-category-select').addEventListener('change', handleCategoryChange);
  document.getElementById('drift-share-btn').addEventListener('click', handleShare);
  document.getElementById('drift-settings-btn').addEventListener('click', openSettingsPopup);
  document.getElementById('drift-collapse-btn').addEventListener('click', toggleToolbar);
  pullTab.addEventListener('click', toggleToolbar);
  
  // Set current category
  document.getElementById('drift-category-select').value = currentCategory;
  
  // Apply saved toolbar visibility state
  if (!toolbarVisible) {
    toolbar.classList.add('hidden');
    document.body.style.marginTop = '0';
  } else {
    adjustPageContent();
  }
}

// Protect toolbar from being removed by page scripts
function protectToolbar(toolbar, pullTab) {
  // Freeze elements to prevent modifications
  try {
    Object.freeze(toolbar);
    Object.freeze(pullTab);
  } catch (e) {
    // Some properties might not be freezable, that's okay
  }
  
  // Watch for removal attempts with MutationObserver
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        // If toolbar was removed, re-inject it
        if (node === toolbar || node.id === 'drift-toolbar') {
          console.log('[Drift] Toolbar removed by page script, re-injecting...');
          setTimeout(() => {
            if (!document.getElementById('drift-toolbar')) {
              init(); // Re-initialize
            }
          }, 100);
        }
        if (node === pullTab || node.id === 'drift-pull-tab') {
          setTimeout(() => {
            if (!document.getElementById('drift-pull-tab')) {
              const newPullTab = document.createElement('div');
              newPullTab.id = 'drift-pull-tab';
              newPullTab.innerHTML = `<span class="drift-icon">${icons.chevronDown}</span>`;
              newPullTab.title = 'Show Drift toolbar';
              newPullTab.addEventListener('click', toggleToolbar);
              document.body.appendChild(newPullTab);
            }
          }, 100);
        }
      });
    });
  });
  
  // Observe body for child removals
  observer.observe(document.body, {
    childList: true,
    subtree: false
  });
}

// Open settings in extension popup
function openSettingsPopup() {
  // Content scripts can't programmatically open browser action popup
  // Show tooltip directing user to click the extension icon
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
  
  setTimeout(() => {
    tooltip.remove();
  }, 3000);
}

// Adjust page content to not be hidden by toolbar
function adjustPageContent() {
  // Simple approach: just add margin to body
  // Accept that some sites with fixed navs might overlap
  // Our z-index is high enough to stay on top
  document.body.style.marginTop = '48px';
}

// Handle Drift button click
async function handleDrift() {
  const excludeUrls = driftHistory.map(item => item.url);
  
  // Get random URL from background script
  chrome.runtime.sendMessage(
    {
      action: 'getDriftUrl',
      category: currentCategory,
      categoryWeights,
      excludeUrls
    },
    (response) => {
      if (response && response.url) {
        const urlData = response.url;
        
        // Save to history
        driftHistory.push({
          url: urlData.url,
          timestamp: Date.now(),
          category: currentCategory,
          liked: null
        });
        
        // Update stats
        stats.totalDrifts++;
        
        // Save to storage
        chrome.storage.local.set({ driftHistory, stats });
        
        // Update UI
        updateStats();
        
        // Navigate
        if (preferences.openInNewTab) {
          window.open(urlData.url, '_blank');
        } else {
          window.location.href = urlData.url;
        }
      }
    }
  );
}

// Handle Like button
async function handleLike() {
  const currentUrl = window.location.href;
  
  // Find in history
  const historyItem = driftHistory.find(item => item.url === currentUrl);
  if (historyItem) {
    historyItem.liked = true;
    
    // Update category weight (increase by 0.1)
    const category = historyItem.category;
    if (category && category !== 'all') {
      categoryWeights[category] = Math.min((categoryWeights[category] || 1.0) + 0.1, 2.0);
    }
  }
  
  // Update stats
  stats.totalLikes++;
  
  // Save to storage
  await chrome.storage.local.set({ driftHistory, stats, categoryWeights });
  
  // Visual feedback
  const btn = document.getElementById('drift-like-btn');
  btn.classList.add('active');
  setTimeout(() => {
    btn.classList.remove('active');
  }, 1000);
  
  updateStats();
}

// Handle Dislike button
async function handleDislike() {
  const currentUrl = window.location.href;
  
  // Find in history
  const historyItem = driftHistory.find(item => item.url === currentUrl);
  if (historyItem) {
    historyItem.liked = false;
    
    // Update category weight (decrease by 0.1)
    const category = historyItem.category;
    if (category && category !== 'all') {
      categoryWeights[category] = Math.max((categoryWeights[category] || 1.0) - 0.1, 0.3);
    }
  }
  
  // Update stats
  stats.totalDislikes++;
  
  // Save to storage
  await chrome.storage.local.set({ driftHistory, stats, categoryWeights });
  
  // Visual feedback
  const btn = document.getElementById('drift-dislike-btn');
  btn.classList.add('active');
  setTimeout(() => {
    btn.classList.remove('active');
  }, 1000);
  
  updateStats();
}

// Handle category change
function handleCategoryChange(e) {
  currentCategory = e.target.value;
  preferences.defaultCategory = currentCategory;
  chrome.storage.local.set({ preferences });
}

// Handle Share button
async function handleShare() {
  const currentUrl = window.location.href;
  const btn = document.getElementById('drift-share-btn');
  
  try {
    // Try native share API first (mobile/newer browsers)
    if (navigator.share) {
      await navigator.share({
        title: document.title,
        url: currentUrl
      });
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(currentUrl);
      
      // Visual feedback
      const originalContent = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      
      setTimeout(() => {
        btn.textContent = originalContent;
        btn.classList.remove('copied');
      }, 2000);
    }
  } catch (error) {
    console.error('Share failed:', error);
  }
}

// Toggle toolbar visibility
function toggleToolbar() {
  const toolbar = document.getElementById('drift-toolbar');
  const body = document.body;
  toolbarVisible = !toolbarVisible;
  
  if (toolbarVisible) {
    toolbar.classList.remove('hidden');
    body.style.marginTop = '48px';
  } else {
    toolbar.classList.add('hidden');
    body.style.marginTop = '0';
  }
  
  // Save toolbar visibility state
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
  
  // Remove after 5 seconds or first drift
  setTimeout(() => {
    tooltip.remove();
    chrome.storage.local.set({ firstRun: false });
  }, 5000);
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
// Use a flag to prevent double initialization
let initialized = false;

function safeInit() {
  if (initialized) return;
  if (document.getElementById('drift-toolbar')) return; // Already exists
  initialized = true;
  init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInit);
} else {
  // DOM already loaded
  safeInit();
}
