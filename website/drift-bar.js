// Drift Bar for Website
// Simplified demo version - just drift, like/dislike, copy, and collapse
// For full features (auth, submit), install the extension!

const API_BASE_URL = 'https://api.drift.surf';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// State
let toolbarVisible = true;
let driftHistory = [];
let stats = {};
let currentUrl = null;
let urlDatabase = null;
let cacheTimestamp = null;

// SVG Icons (same as extension)
const icons = {
  shuffle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Pro 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path d="M288 112C301.3 112 312 101.3 312 88C312 74.7 301.3 64 288 64C274.7 64 264 74.7 264 88C264 101.3 274.7 112 288 112zM288 32C318.9 32 344 57.1 344 88C344 118.9 318.9 144 288 144C257.1 144 232 118.9 232 88C232 57.1 257.1 32 288 32zM288 208C274.7 208 264 218.7 264 232L264 336.4C264 351.4 271 365.4 282.8 374.5L312 396.8L312 232C312 218.7 301.3 208 288 208zM344 421.3L372.7 443.2C389.6 456.1 400.6 475.1 403.4 496.2L415.9 589.9C417.1 598.7 410.9 606.7 402.2 607.9C393.5 609.1 385.4 602.9 384.2 594.2L371.7 500.5C370 487.9 363.4 476.4 353.3 468.7L263.5 400C243.7 384.9 232.1 361.4 232.1 336.5L232 232C232 201.1 257.1 176 288 176C313.5 176 337.1 189.7 349.8 211.8L379.5 263.8C388 278.8 404 288 421.2 288L480.1 288L480.1 176C480.1 167.2 487.3 160 496.1 160C504.9 160 512.1 167.2 512.1 176L512.1 592C512.1 600.8 504.9 608 496.1 608C487.3 608 480.1 600.8 480.1 592L480.1 320L421.2 320C392.5 320 366 304.6 351.7 279.7L344 266.3L344 421.3zM229.2 475.7L239.8 438.5L266.5 461.4L259.9 484.5C256.2 497.6 249.2 509.5 239.5 519.1L155.3 603.3C149.1 609.5 138.9 609.5 132.7 603.3C126.5 597.1 126.5 586.9 132.7 580.7L217 496.4C222.8 490.6 227 483.5 229.2 475.6zM160 192C142.3 192 128 206.3 128 224L128 320L160 320L160 192zM96 224C96 188.7 124.7 160 160 160C177.7 160 192 174.3 192 192L192 320C192 337.7 177.7 352 160 352L128 352C110.3 352 96 337.7 96 320L96 224z"/></svg>',
  thumbsUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>',
  thumbsDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>',
  share: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Pro 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path d="M256 128C256 110.3 270.3 96 288 96L420.1 96C428.6 96 436.7 99.4 442.7 105.4L502.6 165.3C508.6 171.3 512 179.4 512 187.9L512 384C512 401.7 497.7 416 480 416L288 416C270.3 416 256 401.7 256 384L256 128zM288 64C252.7 64 224 92.7 224 128L224 384C224 419.3 252.7 448 288 448L480 448C515.3 448 544 419.3 544 384L544 187.9C544 170.9 537.3 154.6 525.3 142.6L465.4 82.7C453.4 70.7 437.1 64 420.1 64L288 64zM160 192C124.7 192 96 220.7 96 256L96 512C96 547.3 124.7 576 160 576L352 576C387.3 576 416 547.3 416 512L416 496L384 496L384 512C384 529.7 369.7 544 352 544L160 544C142.3 544 128 529.7 128 512L128 256C128 238.3 142.3 224 160 224L176 224L176 192L160 192z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
};

// Initialize
async function init() {
  // Load from localStorage
  const historyJson = localStorage.getItem('drift_history');
  const statsJson = localStorage.getItem('drift_stats');
  const visibleStr = localStorage.getItem('drift_toolbar_visible');
  
  driftHistory = historyJson ? JSON.parse(historyJson) : [];
  stats = statsJson ? JSON.parse(statsJson) : { totalDrifts: 0, totalLikes: 0, totalDislikes: 0 };
  toolbarVisible = visibleStr !== null ? visibleStr === 'true' : true;
  
  // Fetch URL database
  await fetchUrlDatabase();
  
  // Create toolbar
  createToolbar();
}

// Fetch URL database from API (public URLs only)
async function fetchUrlDatabase() {
  try {
    console.log('🌊 Drift: Fetching URLs from API...');
    
    const response = await fetch(`${API_BASE_URL}/urls`);
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    
    urlDatabase = {
      urls: data.urls.filter(url => url.status === 'live'), // Only show live URLs (no pending)
      version: '3.0',
      lastUpdated: new Date().toISOString()
    };
    
    cacheTimestamp = Date.now();
    localStorage.setItem('drift_url_cache', JSON.stringify(urlDatabase));
    localStorage.setItem('drift_cache_timestamp', cacheTimestamp.toString());
    
    console.log(`✅ Loaded ${urlDatabase.urls.length} URLs from API`);
    return urlDatabase;
  } catch (error) {
    console.error('❌ API fetch failed:', error);
    
    // Try cached data
    const cachedDb = localStorage.getItem('drift_url_cache');
    const cachedTs = localStorage.getItem('drift_cache_timestamp');
    if (cachedDb && cachedTs) {
      console.log('📦 Using cached data');
      urlDatabase = JSON.parse(cachedDb);
      cacheTimestamp = parseInt(cachedTs);
      return urlDatabase;
    }
    
    return null;
  }
}

// Check cache validity
function isCacheValid() {
  if (!cacheTimestamp || !urlDatabase) return false;
  return (Date.now() - cacheTimestamp) < CACHE_DURATION;
}

// Get URLs with refresh if needed
async function getUrls() {
  if (!urlDatabase || !isCacheValid()) {
    await fetchUrlDatabase();
  }
  return urlDatabase;
}

// Get random URL (simple version - just live URLs, no auth filtering)
function getRandomUrl(excludeUrls = []) {
  if (!urlDatabase || !urlDatabase.urls) return null;
  
  // Filter to URLs we haven't seen yet
  const availableUrls = urlDatabase.urls.filter(item => !excludeUrls.includes(item.url));
  
  // If all URLs seen, reset and use all
  const urlsToChooseFrom = availableUrls.length > 0 ? availableUrls : urlDatabase.urls;
  if (urlsToChooseFrom.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * urlsToChooseFrom.length);
  return urlsToChooseFrom[randomIndex];
}

// Get current iframe URL
function getCurrentIframeUrl() {
  const iframe = document.getElementById('drift-iframe');
  if (!iframe) return '';
  try {
    return iframe.src || '';
  } catch (e) {
    return iframe.getAttribute('src') || '';
  }
}

// Get iframe page title
function getIframeTitle() {
  const iframe = document.getElementById('drift-iframe');
  if (!iframe) return 'Nothing loaded yet';
  const currentSrc = getCurrentIframeUrl();
  if (!currentSrc) return 'Nothing loaded yet';
  
  // Find title from URL database if possible
  if (currentUrl && currentUrl.title) {
    return currentUrl.title;
  }
  
  return currentSrc;
}

// Create toolbar (simplified - no auth or submit)
function createToolbar() {
  const toolbar = document.getElementById('drift-toolbar');
  if (!toolbar) return;
  
  const pageTitle = getIframeTitle();
  const truncatedTitle = pageTitle.length > 50 ? pageTitle.substring(0, 47) + '...' : pageTitle;
  
  const toolbarHTML = `
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
    <span id="drift-page-title" title="${pageTitle}">${truncatedTitle}</span>
    <button id="drift-copy-btn" title="Copy current URL">
      <span class="drift-icon">${icons.share}</span>
    </button>
    <span class="hidden" id="drift-stats">Sites: ${stats.totalDrifts}</span>
  `;
  
  toolbar.innerHTML = `
    <div class="drift-toolbar-main">
      ${toolbarHTML}
    </div>
  `;
  
  // Add event listeners
  document.getElementById('drift-btn').addEventListener('click', handleDrift);
  document.getElementById('drift-like-btn').addEventListener('click', handleLike);
  document.getElementById('drift-dislike-btn').addEventListener('click', handleDislike);
  document.getElementById('drift-copy-btn').addEventListener('click', handleCopy);
  
}

// Setup iframe error detection
function setupIframeErrorDetection(iframe, url) {
  let hasLoaded = false;
  let retryAttempted = false;
  
  // Timeout to detect if iframe doesn't load
  const loadTimeout = setTimeout(() => {
    if (!hasLoaded && !retryAttempted) {
      console.log('[Drift] Iframe failed to load, trying next URL...');
      retryAttempted = true;
      showNotification('⚠️ Site blocked iframe embedding, loading next...');
      setTimeout(() => handleDrift(), 500); // Try next URL
    }
  }, 5000); // 5 second timeout
  
  // Success handler
  const onLoad = () => {
    hasLoaded = true;
    clearTimeout(loadTimeout);
    console.log('[Drift] Iframe loaded successfully');
    
    // Update address bar to match iframe URL
    try {
      const urlObj = new URL(url);
      window.history.pushState({ driftUrl: url }, '', `?url=${encodeURIComponent(url)}`);
    } catch (e) {
      console.error('Failed to update address bar:', e);
    }
    
    iframe.removeEventListener('load', onLoad);
    iframe.removeEventListener('error', onError);
  };
  
  // Error handler
  const onError = () => {
    clearTimeout(loadTimeout);
    if (!retryAttempted) {
      console.log('[Drift] Iframe error detected, trying next URL...');
      retryAttempted = true;
      showNotification('⚠️ Site blocked iframe embedding, loading next...');
      setTimeout(() => handleDrift(), 500);
    }
    iframe.removeEventListener('load', onLoad);
    iframe.removeEventListener('error', onError);
  };
  
  iframe.addEventListener('load', onLoad);
  iframe.addEventListener('error', onError);
}

// Update toolbar (for refreshing after auth changes)
function updateToolbar() {
  createToolbar();
}

// Handle Drift button click
async function handleDrift() {
  console.log('[Drift] Drift button clicked');
  const excludeUrls = driftHistory.map(item => item.url);
  const currentIframeUrl = getCurrentIframeUrl();
  if (currentIframeUrl) excludeUrls.push(currentIframeUrl);
  
  await getUrls();
  const url = getRandomUrl(excludeUrls);
  
  if (url) {
    currentUrl = url;
    console.log('[Drift] Loading:', url.url);
    
    // Show iframe container
    const container = document.getElementById('drift-container');
    if (container) container.style.display = 'block';
    
    // Update iframe
    const iframe = document.getElementById('drift-iframe');
    if (iframe) {
      iframe.src = url.url;
      // Setup error detection and auto-skip
      setupIframeErrorDetection(iframe, url.url);
    }
    
    // Save to history
    driftHistory.push({
      url: url.url,
      timestamp: Date.now(),
      liked: null
    });
    stats.totalDrifts++;
    localStorage.setItem('drift_history', JSON.stringify(driftHistory));
    localStorage.setItem('drift_stats', JSON.stringify(stats));
    
    // Update toolbar to reflect new page
    setTimeout(() => updateToolbar(), 500);
  } else {
    showNotification('🎉 You\'ve seen all the sites! More coming soon.');
  }
}



// Handle Like
async function handleLike() {
  const currentIframeUrl = getCurrentIframeUrl();
  if (!currentIframeUrl) return;
  
  const historyItem = driftHistory.find(item => item.url === currentIframeUrl);
  if (historyItem) historyItem.liked = true;
  
  stats.totalLikes++;
  localStorage.setItem('drift_history', JSON.stringify(driftHistory));
  localStorage.setItem('drift_stats', JSON.stringify(stats));
  
  const btn = document.getElementById('drift-like-btn');
  btn.classList.add('active');
  setTimeout(() => btn.classList.remove('active'), 1000);
}

// Handle Dislike
async function handleDislike() {
  const currentIframeUrl = getCurrentIframeUrl();
  if (!currentIframeUrl) return;
  
  const historyItem = driftHistory.find(item => item.url === currentIframeUrl);
  if (historyItem) historyItem.liked = false;
  
  stats.totalDislikes++;
  localStorage.setItem('drift_history', JSON.stringify(driftHistory));
  localStorage.setItem('drift_stats', JSON.stringify(stats));
  
  const btn = document.getElementById('drift-dislike-btn');
  btn.classList.add('active');
  setTimeout(() => btn.classList.remove('active'), 1000);
}

// Handle Copy
async function handleCopy() {
  const currentIframeUrl = getCurrentIframeUrl();
  if (!currentIframeUrl) return;
  
  const btn = document.getElementById('drift-copy-btn');
  
  try {
    await navigator.clipboard.writeText(currentIframeUrl);
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="drift-icon">' + icons.check + '</span>';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
    }, 2000);
  } catch (error) {
    console.error('Copy failed:', error);
  }
}

// Show notifications
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'drift-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    background: var(--drift-primary);
    color: var(--drift-bg);
    padding: 12px 20px;
    border-radius: 6px;
    font-family: 'EB Garamond', serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 2147483646;
    animation: drift-notification-slide 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// Start the app
init();
