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
    'firstRun'
  ]);

  driftHistory = data.driftHistory || [];
  stats = data.stats || { totalDrifts: 0, totalLikes: 0, totalDislikes: 0 };
  preferences = data.preferences || { openInNewTab: false, toolbarPosition: 'top', defaultCategory: 'all', theme: 'light' };
  categoryWeights = data.categoryWeights || {};
  isFirstRun = data.firstRun || false;
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

// Create toolbar HTML
function createToolbar() {
  const toolbar = document.createElement('div');
  toolbar.id = 'drift-toolbar';
  
  toolbar.innerHTML = `
    <button id="drift-btn" title="Drift to a random site!">
      → Drift
    </button>
    <button id="drift-like-btn" title="Like this site">
      ↑ Like
    </button>
    <button id="drift-dislike-btn" title="Dislike this site">
      ↓ Dislike
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
    <button id="drift-share-btn" title="Share this page">
      ↗ Share
    </button>
    <span id="drift-stats">Sites: ${stats.totalDrifts}</span>
    <button id="drift-settings-btn" title="Settings">
      ≡
    </button>
    <button id="drift-collapse-btn" title="Hide toolbar (Alt+D to restore)">
      ×
    </button>
  `;
  
  // Create pull-down tab (shown when toolbar is hidden)
  const pullTab = document.createElement('div');
  pullTab.id = 'drift-pull-tab';
  pullTab.textContent = '↓';
  pullTab.title = 'Show Drift toolbar';
  
  // Create popup panel
  const popup = document.createElement('div');
  popup.id = 'drift-popup';
  popup.innerHTML = `
    <div class="drift-popup-section">
      <div class="drift-popup-title">Stats</div>
      <div class="drift-stat-row">
        <span class="drift-stat-label">Total drifts:</span>
        <span class="drift-stat-value" id="stat-total-drifts">${stats.totalDrifts}</span>
      </div>
      <div class="drift-stat-row">
        <span class="drift-stat-label">Liked:</span>
        <span class="drift-stat-value" id="stat-total-likes">${stats.totalLikes}</span>
      </div>
      <div class="drift-stat-row">
        <span class="drift-stat-label">Disliked:</span>
        <span class="drift-stat-value" id="stat-total-dislikes">${stats.totalDislikes}</span>
      </div>
    </div>
    <div class="drift-popup-section">
      <div class="drift-popup-title">Preferences</div>
      <div class="drift-setting-row">
        <span class="drift-setting-label">Open in new tab</span>
        <div class="drift-toggle" id="toggle-new-tab" data-active="${preferences.openInNewTab}"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(toolbar);
  document.body.appendChild(pullTab);
  document.body.appendChild(popup);
  
  // Add event listeners
  document.getElementById('drift-btn').addEventListener('click', handleDrift);
  document.getElementById('drift-like-btn').addEventListener('click', handleLike);
  document.getElementById('drift-dislike-btn').addEventListener('click', handleDislike);
  document.getElementById('drift-category-select').addEventListener('change', handleCategoryChange);
  document.getElementById('drift-share-btn').addEventListener('click', handleShare);
  document.getElementById('drift-settings-btn').addEventListener('click', toggleSettings);
  document.getElementById('drift-collapse-btn').addEventListener('click', toggleToolbar);
  pullTab.addEventListener('click', toggleToolbar);
  document.getElementById('toggle-new-tab').addEventListener('click', toggleNewTab);
  
  // Set current category
  document.getElementById('drift-category-select').value = currentCategory;
  
  // Set toggle states
  updateToggleState('toggle-new-tab', preferences.openInNewTab);
  
  // Adjust page content position to account for toolbar
  adjustPageContent();
}

// Toggle settings popup
function toggleSettings() {
  const popup = document.getElementById('drift-popup');
  popup.classList.toggle('open');
  
  // Close when clicking outside
  if (popup.classList.contains('open')) {
    setTimeout(() => {
      document.addEventListener('click', closeSettingsOnClickOutside);
    }, 0);
  }
}

// Close settings when clicking outside
function closeSettingsOnClickOutside(e) {
  const popup = document.getElementById('drift-popup');
  const settingsBtn = document.getElementById('drift-settings-btn');
  
  if (!popup.contains(e.target) && !settingsBtn.contains(e.target)) {
    popup.classList.remove('open');
    document.removeEventListener('click', closeSettingsOnClickOutside);
  }
}

// Toggle new tab preference
async function toggleNewTab() {
  preferences.openInNewTab = !preferences.openInNewTab;
  await chrome.storage.local.set({ preferences });
  updateToggleState('toggle-new-tab', preferences.openInNewTab);
}

// Update toggle switch visual state
function updateToggleState(toggleId, isActive) {
  const toggle = document.getElementById(toggleId);
  if (toggle) {
    if (isActive) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
    toggle.setAttribute('data-active', isActive);
  }
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
    // Close settings if open
    const popup = document.getElementById('drift-popup');
    popup.classList.remove('open');
  }
}

// Update stats display
function updateStats() {
  const statsEl = document.getElementById('drift-stats');
  if (statsEl) {
    statsEl.textContent = `Sites: ${stats.totalDrifts}`;
  }
  
  // Update stats in popup
  const totalDriftsEl = document.getElementById('stat-total-drifts');
  const totalLikesEl = document.getElementById('stat-total-likes');
  const totalDislikesEl = document.getElementById('stat-total-dislikes');
  
  if (totalDriftsEl) totalDriftsEl.textContent = stats.totalDrifts;
  if (totalLikesEl) totalLikesEl.textContent = stats.totalLikes;
  if (totalDislikesEl) totalDislikesEl.textContent = stats.totalDislikes;
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
