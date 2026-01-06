// Drift Background Service Worker
// Handles URL database fetching and message passing

// Default URL database (embedded fallback)
let urlDatabase = null;

// Fetch URL database from drift.surf (or local for development)
async function fetchUrlDatabase() {
  try {
    // For MVP, use local database
    const response = await fetch(chrome.runtime.getURL('data/urls.json'));
    urlDatabase = await response.json();
    console.log('✅ Drift: URL database loaded', urlDatabase.version);
    return urlDatabase;
  } catch (error) {
    console.error('❌ Drift: Failed to load URL database', error);
    return null;
  }
}

// Get random URL from category
function getRandomUrl(category = 'all', excludeUrls = []) {
  if (!urlDatabase) return null;

  let urls = [];
  
  // If "all" category, collect from all categories
  if (category === 'all') {
    Object.keys(urlDatabase.categories).forEach(cat => {
      if (cat !== 'all') {
        urls = urls.concat(urlDatabase.categories[cat]);
      }
    });
  } else {
    urls = urlDatabase.categories[category] || [];
  }

  // Filter out already-seen URLs
  const unseenUrls = urls.filter(item => !excludeUrls.includes(item.url));
  
  // If all URLs seen, reset and use all URLs
  const availableUrls = unseenUrls.length > 0 ? unseenUrls : urls;
  
  // Pick random URL
  if (availableUrls.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * availableUrls.length);
  return availableUrls[randomIndex];
}

// Apply category weights for frequency algorithm
function getWeightedRandomUrl(category, categoryWeights, excludeUrls) {
  // If specific category requested, just get from that category
  if (category !== 'all') {
    return getRandomUrl(category, excludeUrls);
  }

  // For "all", apply category weights
  const categories = Object.keys(urlDatabase.categories).filter(cat => cat !== 'all');
  const weightedCategories = [];

  categories.forEach(cat => {
    const weight = categoryWeights[cat] || 1.0;
    const count = Math.round(weight * 10); // Convert weight to count
    for (let i = 0; i < count; i++) {
      weightedCategories.push(cat);
    }
  });

  // Pick random weighted category
  const randomCat = weightedCategories[Math.floor(Math.random() * weightedCategories.length)];
  return getRandomUrl(randomCat, excludeUrls);
}

// Message listener from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getDriftUrl') {
    const { category, categoryWeights, excludeUrls } = request;
    const url = getWeightedRandomUrl(category, categoryWeights, excludeUrls);
    sendResponse({ url });
  }
  
  if (request.action === 'getCategories') {
    const categories = urlDatabase ? Object.keys(urlDatabase.categories) : [];
    sendResponse({ categories });
  }
  
  return true; // Keep channel open for async response
});

// Keyboard command listener
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-toolbar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleToolbar' });
    });
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('🌊 Drift installed! Welcome aboard.');
    
    // Initialize localStorage defaults
    chrome.storage.local.set({
      driftHistory: [],
      stats: {
        totalDrifts: 0,
        totalLikes: 0,
        totalDislikes: 0
      },
      preferences: {
        openInNewTab: false,
        toolbarPosition: 'top',
        defaultCategory: 'all'
      },
      categoryWeights: {
        technology: 1.0,
        science: 1.0,
        design: 1.0,
        art: 1.0,
        weird: 1.0,
        diy: 1.0,
        philosophy: 1.0
      },
      firstRun: true
    });
  }
  
  // Load URL database
  await fetchUrlDatabase();
});

// Load database on startup
fetchUrlDatabase();
