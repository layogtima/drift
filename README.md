# 🌊 Drift

**Drift through the best parts of the internet!**

A Chrome extension that recreates the serendipitous discovery experience of the classic web. Click once, discover something wonderful.

[![Website](https://img.shields.io/badge/website-drift.surf-2aa198)](https://drift.surf)
[![Privacy](https://img.shields.io/badge/privacy-first-859900)](https://drift.surf/privacy.html)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## ✨ Features

- 🎲 **One-Click Discovery** - Hit "Drift!" to visit a random curated website
- 👍👎 **Like/Dislike** - Shape your experience (all stored locally!)
- 🗂️ **Category Filtering** - Technology, Science, Design, Art, Weird, DIY, or Philosophy
- 📤 **Submit URLs** - Help grow the collection with community moderation
- 👤 **User Accounts (Optional)** - Sign in to submit sites, but browsing is always free
- ⚙️ **Customizable** - Theme preferences, toolbar controls
- 🔒 **Privacy-First** - Everything stays on your device unless you opt-in

## 🚀 Installation

### From Chrome Web Store
Coming soon! Extension is currently under review.

### Development Install
1. Clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `extension` folder
6. The Drift toolbar should now appear on any webpage!

## 📖 How to Use

1. **Drift**: Click the "🌊 Drift!" button to visit a random site
2. **Like/Dislike**: Use 👍/👎 to tune your feed
3. **Categories**: Select a category to filter discoveries
4. **Submit**: Found something cool? Click "Submit" to share it
5. **Settings**: Click your username to view stats
6. **Keyboard Shortcut**: `Alt+D` (or `Cmd+Shift+D` on Mac) to toggle toolbar

## 🏗️ Project Structure

```
drift/
├── extension/
│   ├── manifest.json       # Extension config (Manifest V3)
│   ├── background.js       # Service worker & API calls
│   ├── content.js          # Toolbar injection & UI
│   ├── auth.js             # Authentication logic
│   ├── toolbar.css         # Compiled styles
│   ├── scss/               # SCSS source files
│   │   ├── toolbar.scss    # Main SCSS entry
│   │   ├── _variables.scss # Design tokens
│   │   ├── _mixins.scss    # Reusable patterns
│   │   ├── _base.scss      # Theme & animations
│   │   ├── _toolbar.scss   # Main toolbar
│   │   ├── _buttons.scss   # Button components
│   │   ├── _dropdowns.scss # Dropdown system
│   │   ├── _user-panel.scss# User menu & stats
│   │   └── _action-bar.scss# Approval overlay
│   ├── popup.html/js       # Extension popup
│   └── icons/              # Extension icons
├── website/
│   ├── index.html          # Landing page
│   ├── privacy.html        # Privacy policy
│   └── contact.html        # Contact page
└── api/                    # Cloudflare Workers backend
    └── src/
        └── index.ts        # API routes
```

## 🎨 Design System

Drift uses a custom SCSS architecture with:
- **Solarized color palette** for accessibility
- **EB Garamond serif** typography for that letter-like feel
- **Zero `!important` declarations** (proper specificity via `html body` nesting)
- **Modular components** for easy maintenance

Compile SCSS: `sass extension/scss/toolbar.scss extension/toolbar.css --style=compressed`

## 🔐 Privacy & Data

- **Local-first**: Drift history, likes/dislikes stored in your browser
- **No tracking**: We don't see what you drift to
- **Optional accounts**: Only needed for URL submission
- **Transparent**: Read our [privacy policy](https://drift.surf/privacy.html)

## 🤝 Contributing

### Submit URLs
1. Use the "Submit" button in the toolbar (requires account), or
2. Email suggestions to drift@codeuncode.com

### Code Contributions
1. Fork the repo
2. Create a feature branch
3. Submit a PR with clear description

**Curation Guidelines:**
- ✅ Indie web, personal blogs, passion projects
- ✅ High-quality content, creative work
- ✅ Small creators, niche communities
- ❌ Corporate SEO spam
- ❌ Paywalled or login-required content

## 🛠️ Tech Stack

- **Frontend**: Vanilla JS, SCSS, Tailwind (website)
- **Extension**: Manifest V3, Chrome APIs
- **Backend**: Cloudflare Workers, D1 Database
- **Hosting**: Cloudflare Pages

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## 🙏 Credits

Created with ❤️ for the indie web by [Code Uncode](https://codeuncode.com)

Inspired by the original StumbleUpon (RIP 🪦)

## 📬 Contact

- **Website**: [drift.surf](https://drift.surf)
- **Email**: drift@codeuncode.com
- **GitHub**: [layogtima/drift](https://github.com/layogtima/drift)

---

**Ready to drift? [Install the extension](https://drift.surf) and rediscover the joy of online serendipity!** ✨
