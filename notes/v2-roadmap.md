# Drift v2 Roadmap

> Features planned for the next version after MVP

---

## Priority 1: Core Improvements

### Authentication Enhancements
- [ ] Magic link authentication (passwordless login via email)
- [ ] "Remember me" / persistent sessions
- [ ] Password reset flow

### Likes/Dislikes System
- [ ] Sync likes/dislikes to server (currently local only)
- [ ] Community-wide ratings per URL
- [ ] Weighted random selection based on ratings (popular URLs shown more)

### Flagging System
- [ ] Users can flag inappropriate URLs
- [ ] Flag reasons: "Broken link", "Spam", "Inappropriate", "Other"
- [ ] Auto-hide URLs after X flags (configurable threshold)
- [ ] Flag review queue for moderators

---

## Priority 2: Moderation Tools

### Web Dashboard
- [ ] Browse all submitted URLs (with filters/search)
- [ ] Moderator queue for pending/flagged URLs
- [ ] Bulk approve/reject actions
- [ ] User management (assign mod roles)
- [ ] Analytics (submissions per day, approval rate, etc.)

### Blocklist
- [ ] User-level blocklist (hide specific URLs/domains for yourself)
- [ ] Global blocklist for mods (ban domains site-wide)
- [ ] Import/export blocklist

### Moderator Notes
- [ ] Add notes when approving/rejecting URLs
- [ ] Rejection reasons visible to submitter
- [ ] Internal mod notes (not visible to submitter)

---

## Priority 3: User Experience

### Notifications
- [ ] Notify users when their submission is approved/rejected
- [ ] Email notifications (optional)
- [ ] In-extension notification badge

### User Profiles
- [ ] View submission history
- [ ] See approved/rejected stats
- [ ] User karma/reputation based on approval rate
- [ ] Public profile page (optional)

### URL Metadata
- [ ] Auto-fetch favicon for URLs
- [ ] Store URL screenshots (using Cloudflare Browser Rendering)
- [ ] "Report broken link" feature
- [ ] Auto-check for dead links periodically

---

## Priority 4: Advanced Features

### Discovery Improvements
- [ ] Tag-based filtering (drift within specific tags only)
- [ ] "Surprise me" mode (truly random, no weighting)
- [ ] Collections/playlists curated by users
- [ ] "Similar sites" suggestions

### Social Features
- [ ] Share URL to social media (with Drift branding)
- [ ] Public feed of recently approved URLs
- [ ] RSS feed for new URLs
- [ ] API access for third parties

### Analytics & Insights
- [ ] Personal stats (sites visited, likes/dislikes ratio)
- [ ] Time spent per category
- [ ] Most liked categories
- [ ] Weekly email digest of top URLs

---

## Technical Debt

- [ ] Add rate limiting to API endpoints
- [ ] Add request validation middleware
- [ ] Improve error handling and user-facing messages
- [ ] Add automated tests for API
- [ ] Add E2E tests for extension
- [ ] Set up CI/CD pipeline
- [ ] GDPR compliance (data export, deletion)

---

## Ideas (Not Yet Prioritized)

- Browser history integration (suggest URLs based on browsing)
- Firefox/Safari extension ports
- Mobile app (React Native)
- Chrome new tab page integration
- Keyboard shortcuts for approve/reject
- Dark mode for approval overlay
- URL categories hierarchy (parent/child tags)
