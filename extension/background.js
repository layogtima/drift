// Drift Background Service Worker
// Handles URL database fetching from API and message passing

import { getAuthToken, getCurrentUser, login, register, logout } from './auth.js';

// const API_BASE_URL = 'http://localhost:8787'; // Change to 'https://api.drift.surf' for production
const API_BASE_URL = 'https://api.drift.surf'; // Change to 'https://api.drift.surf' for production

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

let urlDatabase = null;
let cacheTimestamp = null;

// Fetch URL database from API
async function fetchUrlDatabase() {
  try {
    console.log('🌊 Drift: Fetching URLs from API...');

    // Get auth token (optional - works without auth too)
    const token = await getAuthToken();

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/urls`, { headers });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform API response to match expected format
    urlDatabase = {
      urls: data.urls,
      pendingCount: data.pendingCount || 0,
      user: data.user || null,
      version: '3.0',
      lastUpdated: new Date().toISOString()
    };

    // Cache the response
    cacheTimestamp = Date.now();
    await chrome.storage.local.set({
      urlCache: urlDatabase,
      cacheTimestamp: cacheTimestamp
    });

    console.log(`✅ Drift: Loaded ${urlDatabase.urls.length} URLs from API`);
    if (urlDatabase.user) {
      console.log(`👤 Logged in as: ${urlDatabase.user.username} (${urlDatabase.user.role})`);
    }

    return urlDatabase;
  } catch (error) {
    console.error('❌ Drift: API fetch failed:', error);

    // Try to use cached data
    const cached = await chrome.storage.local.get(['urlCache', 'cacheTimestamp']);
    if (cached.urlCache && cached.cacheTimestamp) {
      console.log('📦 Drift: Using cached data');
      urlDatabase = cached.urlCache;
      cacheTimestamp = cached.cacheTimestamp;
      return urlDatabase;
    }

    // Fallback to local JSON file
    console.log('📄 Drift: Falling back to local database');
    return await fetchLocalDatabase();
  }
}

// Fallback: Load local JSON database
async function fetchLocalDatabase() {
  try {
    const response = await fetch(chrome.runtime.getURL('data/urls.json'));
    const data = await response.json();

    // Transform legacy format to new format
    const urls = [];
    Object.entries(data.categories || {}).forEach(([category, categoryUrls]) => {
      if (category !== 'all') {
        categoryUrls.forEach(item => {
          urls.push({
            id: urls.length + 1,
            url: item.url,
            title: item.title,
            description: item.description,
            tags: [category],
            status: 'live',
            submitter_id: null
          });
        });
      }
    });

    urlDatabase = {
      urls,
      pendingCount: 0,
      user: null,
      version: data.version || '2.0',
      lastUpdated: data.lastUpdated
    };

    console.log(`✅ Drift: Loaded ${urls.length} URLs from local fallback`);
    return urlDatabase;
  } catch (error) {
    console.error('❌ Drift: Failed to load local database', error);
    return null;
  }
}

// Check if cache is valid
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

// Get random URL
function getRandomUrl(excludeUrls = [], approvalMode = false) {
  if (!urlDatabase || !urlDatabase.urls) return null;

  // If in approval mode, only show pending URLs
  if (approvalMode) {
    // In approval mode, show ALL pending URLs (don't exclude based on history)
    // Mods need to see all pending URLs to approve them
    const pendingUrls = urlDatabase.urls.filter(item => item.status === 'pending');
    console.log('[Drift BG] Approval mode - total pending URLs:', pendingUrls.length);

    if (pendingUrls.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * pendingUrls.length);
    return pendingUrls[randomIndex];
  }

  // Normal mode: Filter to only live URLs (or pending if user submitted them)
  const availableUrls = urlDatabase.urls.filter(item => {
    // Don't show URLs that have been seen
    if (excludeUrls.includes(item.url)) return false;

    // Show live URLs
    if (item.status === 'live') return true;

    // Show pending URLs if user is mod/admin or if they submitted it
    if (item.status === 'pending') {
      if (urlDatabase.user) {
        return urlDatabase.user.role === 'mod' ||
               urlDatabase.user.role === 'admin' ||
               item.submitter_id === urlDatabase.user.id;
      }
    }

    return false;
  });

  // If all URLs seen, reset and use all available
  const urlsToChooseFrom = availableUrls.length > 0 ? availableUrls : urlDatabase.urls.filter(item => item.status === 'live');

  if (urlsToChooseFrom.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * urlsToChooseFrom.length);
  return urlsToChooseFrom[randomIndex];
}

// Message listener from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getDriftUrl') {
    (async () => {
      console.log('[Drift BG] getDriftUrl request received');
      
      // Force refresh if in approval mode to get latest pending URLs
      if (request.approvalMode) {
        console.log('[Drift BG] Approval mode - forcing cache refresh');
        cacheTimestamp = null;
      }
      
      await getUrls(); // Ensure URLs are loaded
      console.log('[Drift BG] URL database loaded:', urlDatabase ? `${urlDatabase.urls?.length} URLs, pendingCount: ${urlDatabase.pendingCount}` : 'null');
      const { excludeUrls, approvalMode } = request;
      console.log('[Drift BG] Approval mode:', approvalMode);
      const url = getRandomUrl(excludeUrls, approvalMode);
      console.log('[Drift BG] Random URL selected:', url);
      sendResponse({ url, user: urlDatabase?.user, pendingCount: urlDatabase?.pendingCount });
    })();
    return true; // Keep channel open for async response
  }

  if (request.action === 'refreshUrls') {
    (async () => {
      cacheTimestamp = null; // Force refresh
      await fetchUrlDatabase();
      sendResponse({ success: true, urlCount: urlDatabase?.urls?.length || 0 });
    })();
    return true;
  }

  if (request.action === 'getTags') {
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/tags`);
        const data = await response.json();
        sendResponse({ success: true, tags: data.tags || [] });
      } catch (error) {
        console.error('[Drift BG] Get tags error:', error);
        sendResponse({ success: false, error: 'Failed to fetch tags' });
      }
    })();
    return true;
  }

  if (request.action === 'submitUrl') {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          sendResponse({ success: false, error: 'Not logged in' });
          return;
        }

        const { url, title, tagIds } = request;

        const response = await fetch(`${API_BASE_URL}/urls`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ url, title, tagIds })
        });

        const data = await response.json();

        if (!response.ok) {
          sendResponse({ success: false, error: data.error });
          return;
        }

        // Refresh URL database
        cacheTimestamp = null;
        await fetchUrlDatabase();

        sendResponse({ success: true, message: data.message });
      } catch (error) {
        console.error('Submit URL error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'approveUrl') {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          sendResponse({ success: false, error: 'Not logged in' });
          return;
        }

        const { urlId } = request;

        const response = await fetch(`${API_BASE_URL}/urls/${urlId}/approve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          sendResponse({ success: false, error: data.error });
          return;
        }

        // Refresh URL database
        cacheTimestamp = null;
        await fetchUrlDatabase();

        sendResponse({ success: true, message: data.message });
      } catch (error) {
        console.error('Approve URL error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'rejectUrl') {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          sendResponse({ success: false, error: 'Not logged in' });
          return;
        }

        const { urlId } = request;

        const response = await fetch(`${API_BASE_URL}/urls/${urlId}/reject`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          sendResponse({ success: false, error: data.error });
          return;
        }

        // Refresh URL database
        cacheTimestamp = null;
        await fetchUrlDatabase();

        sendResponse({ success: true, message: data.message });
      } catch (error) {
        console.error('Reject URL error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  // Auth actions
  if (request.action === 'login') {
    (async () => {
      console.log('[Drift BG] Login request received:', request.email);
      try {
        const result = await login(request.email, request.password);
        console.log('[Drift BG] Login result:', result);

        // Refresh URL database to get user info and pending URLs
        if (result.success) {
          cacheTimestamp = null;
          await fetchUrlDatabase();
        }

        sendResponse(result);
      } catch (error) {
        console.error('[Drift BG] Login error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'register') {
    (async () => {
      console.log('[Drift BG] Register request received:', request.email, request.username);
      try {
        const result = await register(request.email, request.username, request.password);
        console.log('[Drift BG] Register result:', result);

        // Refresh URL database to get user info
        if (result.success) {
          cacheTimestamp = null;
          await fetchUrlDatabase();
        }

        sendResponse(result);
      } catch (error) {
        console.error('[Drift BG] Register error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'logout') {
    (async () => {
      console.log('[Drift BG] Logout request received');
      try {
        await logout();
        sendResponse({ success: true });
      } catch (error) {
        console.error('[Drift BG] Logout error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  return false;
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

    // Initialize localStorage defaults (remove categoryWeights)
    chrome.storage.local.set({
      driftHistory: [],
      stats: {
        totalDrifts: 0,
        totalLikes: 0,
        totalDislikes: 0
      },
      preferences: {
        openInNewTab: false,
        toolbarPosition: 'top'
      },
      firstRun: true
    });
  }

  // Load URL database
  await fetchUrlDatabase();
});

// Load database on startup
fetchUrlDatabase();
