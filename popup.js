// Drift Popup Script
// Handles settings panel UI and data display

// Load and display data
async function loadData() {
  const data = await chrome.storage.local.get([
    'stats',
    'preferences',
    'categoryWeights'
  ]);

  const stats = data.stats || { totalDrifts: 0, totalLikes: 0, totalDislikes: 0 };
  const preferences = data.preferences || { openInNewTab: false, toolbarPosition: 'top', defaultCategory: 'all', theme: 'light' };

  // Update stats
  document.getElementById('total-drifts').textContent = stats.totalDrifts;
  document.getElementById('total-likes').textContent = stats.totalLikes;
  document.getElementById('total-dislikes').textContent = stats.totalDislikes;

  // Update preferences
  const themeToggle = document.getElementById('theme-toggle');
  if (preferences.theme === 'dark') {
    themeToggle.classList.add('active');
  }
  
  const openInNewTabToggle = document.getElementById('open-in-new-tab');
  if (preferences.openInNewTab) {
    openInNewTabToggle.classList.add('active');
  }
  
  document.getElementById('default-category').value = preferences.defaultCategory;
}

// Save theme preference
document.getElementById('theme-toggle').addEventListener('click', async function() {
  const data = await chrome.storage.local.get('preferences');
  const preferences = data.preferences || {};
  const newTheme = preferences.theme === 'dark' ? 'light' : 'dark';
  preferences.theme = newTheme;
  await chrome.storage.local.set({ preferences });
  
  // Update toggle visual
  this.classList.toggle('active');
  
  // Notify all tabs to update theme
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'updateTheme', theme: newTheme }).catch(() => {});
    });
  });
});

// Save preferences when changed
document.getElementById('open-in-new-tab').addEventListener('click', async function() {
  const data = await chrome.storage.local.get('preferences');
  const preferences = data.preferences || {};
  preferences.openInNewTab = !preferences.openInNewTab;
  await chrome.storage.local.set({ preferences });
  
  // Update toggle visual
  this.classList.toggle('active');
});

document.getElementById('default-category').addEventListener('change', async (e) => {
  const data = await chrome.storage.local.get('preferences');
  const preferences = data.preferences || {};
  preferences.defaultCategory = e.target.value;
  await chrome.storage.local.set({ preferences });
});

// Initialize
loadData();
