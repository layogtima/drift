# Plan: Tag-Based URL Filtering for Drift

## Summary

Add a quick filter dropdown to the left of `#drift-page-title` that lets users select tags. When drifting, only URLs with at least one selected tag will be shown (include/OR mode).

---

## Files to Modify

### 1. `extension/content.js` (~45KB)

| Location | Change |
|----------|--------|
| Line 14 | Add `let filterTagIds = [];` state variable |
| Lines 19-36 | Load `filterTagIds` from storage in `init()` |
| Lines 57-67 | Add filter icon SVG to `icons` object |
| Lines 79-120 (toolbar HTML) | Insert filter button **before** `#drift-page-title` |
| Lines 155-168 | Add click listener for filter button |
| Lines 215-228 (`handleDrift`) | Pass `filterTagIds` in message to background.js |
| After line ~940 | Add new functions (see below) |

**New functions to add:**
- `showFilterDropdown()` - displays tag checkboxes dropdown
- `handleFilterTagChange()` - toggles tag selection, saves to storage
- `handleClearFilter()` - clears all selected tags
- `updateFilterBadge()` - updates count badge on filter button

### 2. `extension/background.js` (~14KB)

| Location | Change |
|----------|--------|
| Lines 133-176 (`getRandomUrl`) | Add `filterTagIds` param, filter URLs by tag |
| Lines 179-198 (message handler) | Extract `filterTagIds` from request, pass to `getRandomUrl()` |

### 3. `extension/toolbar.css` (~26KB)

Add styles for:
- `#drift-filter-btn` - base button styles
- `#drift-filter-btn.active` - highlighted state when filter active
- `#drift-filter-count` - badge showing selected tag count
- `.drift-filter-actions` - clear button container

---

## Implementation Details

### Filter Button Placement

```html
<!-- Insert BEFORE #drift-page-title -->
<button id="drift-filter-btn" title="Filter by tags">
  <span class="drift-icon">${icons.filter}</span>
  <span id="drift-filter-count"></span>
</button>
<span id="drift-page-title" class="drift-page-title">...</span>
```

### Filter Icon SVG

```javascript
filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>'
```

### Tag Filtering Logic (background.js)

```javascript
// In getRandomUrl(), after existing status filters:
if (filterTagIds && filterTagIds.length > 0) {
  availableUrls = availableUrls.filter(item => {
    // URL must have at least one of the selected tags (OR logic)
    if (!item.tags || item.tags.length === 0) return false;
    const urlTagIds = item.tags.map(tag => tag.id);
    return filterTagIds.some(tagId => urlTagIds.includes(tagId));
  });
  console.log('[Drift BG] After tag filter:', availableUrls.length, 'URLs');
}
```

### Storage Pattern

```javascript
// Load on init
const data = await chrome.storage.local.get([...existing, 'filterTagIds']);
filterTagIds = data.filterTagIds || [];

// Save on change
chrome.storage.local.set({ filterTagIds });
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| No matching URLs | Show notification "No URLs match your filter" |
| Empty tag list from API | Hide or disable filter button |
| Approval mode | Tag filter does NOT apply (mods review all pending) |
| Filter persists | Already handled via `chrome.storage.local` |

---

## Data Flow

```
1. Init → Load filterTagIds from storage
2. User clicks filter button → Show dropdown with tag checkboxes
3. User toggles tag → Update filterTagIds array, save to storage, update badge
4. User clicks Drift → Send { action: 'getDriftUrl', excludeUrls, filterTagIds }
5. background.js → Filter cached URLs by tag, return random match
6. Navigate to URL
```

---

## Verification Steps

1. Load extension in Chrome (`chrome://extensions` → Load unpacked)
2. Click filter button → dropdown should show all available tags
3. Select 1-2 tags → badge should show count, button should highlight
4. Click Drift → should only navigate to URLs with matching tags
5. Clear filter → should drift to any URL again
6. Refresh page → filter selection should persist
7. Enable approval mode → filter should be ignored for pending URL review
