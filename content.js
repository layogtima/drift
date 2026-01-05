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
  shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>',
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
