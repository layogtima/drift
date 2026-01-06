# 🌊 Drift

**Drift through the best parts of the internet!**

A Chrome extension that recreates the serendipitous discovery experience of the classic web. No login required, transparent algorithm, indie web focused.

## Features

- 🎲 **One-Click Discovery** - Hit "Drift!" to visit a random curated website
- 👍👎 **Smart Preferences** - Like/dislike to tune your feed with transparent category weighting
- 🗂️ **Category Filtering** - Browse Technology, Science, Design, Art, Weird, DIY, or Philosophy
- 📤 **Easy Sharing** - Share discoveries via clipboard or native share API
- ⚙️ **Customizable** - Toolbar position, new tab behavior, default categories
- 🔒 **Privacy-First** - All data stored locally, no tracking, no accounts

## Installation (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `stumble` folder
6. The Drift toolbar should now appear on any webpage!

## How to Use

1. **Drift**: Click the "🌊 Drift!" button to visit a random site from the current category
2. **Like/Dislike**: Use 👍/👎 to tune your preferences (boosts/reduces category frequency)
3. **Categories**: Select from dropdown to filter by interest
4. **Share**: Click 📤 to copy the current URL or use native sharing
5. **Settings**: Click ⚙️ to view stats and adjust preferences
6. **Keyboard Shortcut**: Press `Alt+D` (or `Cmd+Shift+D` on Mac) to toggle toolbar

## Project Structure

```
drift/
├── manifest.json       # Extension configuration (Manifest V3)
├── background.js       # Service worker for URL management
├── content.js          # Toolbar injection and interaction logic
├── toolbar.css         # Toolbar styling with dark mode
├── popup.html          # Settings/stats panel UI
├── popup.js            # Settings panel logic
├── data/
│   └── urls.json       # Curated URL database
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## The Algorithm (Fully Transparent)

**Category Weighting Rules:**
- Each category starts with 1.0x weight
- Liking a site → category weight +0.1 (max 2.0x)
- Disliking a site → category weight -0.1 (min 0.3x)
- Higher weights = more frequent appearances
- Even low-weight categories still appear occasionally (serendipity!)

**Example:**
- You like 5 Science sites → Science weight becomes 1.5x
- You dislike 3 Art sites → Art weight becomes 0.7x
- Next drift: ~60% Science, ~28% others, ~12% Art

## Contributing URLs

Want to add sites to the database? 

1. Edit `data/urls.json`
2. Add your site under the appropriate category
3. Submit a PR!

**Curation Guidelines:**
- ✅ Indie web, personal blogs, passion projects
- ✅ High-quality content, no clickbait
- ✅ Small creators and niche communities
- ❌ Corporate SEO content
- ❌ Paywalled or login-required sites

## Roadmap

- [ ] Deploy URL database to drift.surf (Cloudflare Pages)
- [ ] Community submission form
- [ ] Export/import drift history
- [ ] "Rediscover" mode (revisit liked sites)
- [ ] Dark mode toggle
- [ ] Custom category creation

## Technical Details

- **Manifest V3** compliant
- **localStorage** for all user data (privacy-first, no backend)
- **Content script injection** for toolbar (native browser UI not possible in modern Chrome)
- **Service worker** for background URL fetching

## Credits

Created with ❤️ for the indie web by [Amit](https://layogtima.com)

Inspired by the original StumbleUpon (RIP, killed by eBay)

---

**Visit [drift.surf](https://drift.surf) for more!**
