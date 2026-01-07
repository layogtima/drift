# Changelog

All notable changes to Drift will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-01-07

### ✨ What's New
- **User Accounts** - Sign in to submit URLs and help grow the collection (browsing is still free!)
- **Enhanced User Panel** - Now shows your stats: total drifts, likes, and dislikes
- **Submit URLs** - Found something cool? Share it with the community via the Submit button
- **Moderation Queue** - Moderators can review and approve submitted URLs
- **Role Badges** - See who's a user, mod, or admin
- **Copy to Clipboard** - Quick URL sharing with visual feedback

### 🎨 Design Updates
- **Complete SCSS Refactor** - Cleaner, more maintainable code (zero `!important` declarations!)
- **Better Visual Hierarchy** - Improved spacing, colors, and typography throughout
- **Dropdown Improvements** - Smoother animations and better positioning
- **Approval Mode** - Moderators get a dedicated workflow for reviewing submissions

### 🔧 Technical Improvements
- **Cloudflare Workers Backend** - Fast, global API for authentication and URL management
- **Manifest V3** - Modern Chrome extension architecture
- **Local-First Storage** - Your browsing data stays on your device
- **Modular SCSS** - Component-based styling for easier updates

### 📱 Website
- **Landing Page** - Clean, serif design at drift.surf
- **Privacy Policy** - Transparent about what we collect (spoiler: not much!)
- **Contact Page** - Easy ways to reach us with feedback

### 🐛 Bug Fixes
- Fixed dropdown positioning on some websites
- Improved tab switching in auth forms
- Better error handling for API calls

---

## How to Update

The extension will auto-update through the Chrome Web Store once published. For development installs, pull the latest code and reload the extension at `chrome://extensions/`.

---

**Questions?** Reach us at drift@codeuncode.com
