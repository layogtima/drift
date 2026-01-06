submitter (user id)
status (submitted, live, banned, flag)
url
likes and dislikes for url
url tag (one url can have multiple tags)
notes (moderator notes)
flag for url

blocklist ()

only signed up users can submit a link

currently the urls are in @data/urls.json

i will use cloudflare d1 to store the data.

let's discuss what we will need to do for the extension to communicate with the db and such.

ask me questions about anything i might be missing.

write all your questions in this doc.

then let's make an implementation plan here before implementing

---

## QUESTIONS FOR AMIT:

### 1. Authentication & User Management

- How do you want users to sign up/log in? (Google OAuth, email/password, magic link, etc.) email/password & magic link
- Should we use Cloudflare Access or build custom auth? what's easier?
- Do you want user profiles? What data should we store (email, username, join date, etc.)? yes [Amit]
- Should users be able to remain anonymous or is login required to use the extension? Drifting does not need login. Actions (like, dislike, submit needs login) [Amit]

### 2. Backend Architecture

- Should we build this with Cloudflare Workers + D1, or do you prefer a separate backend (Node.js, etc.)?
- Do you want to use Cloudflare's stack entirely? (Workers for API, D1 for DB, R2 for assets if needed) yes (don't think we need r2)
- What domain will this be hosted on? (drift.surf is in the manifest) (yes)

### 3. URL Submission & Moderation

- What's the submission flow? (Submit form in extension vs web dashboard?)
- Who can be moderators? How do they get moderator privileges? Admins will assign mods
- Should new submissions go into a "pending" queue or be live immediately for the submitter only? pending
- What happens when a URL is flagged? Auto-hide after X flags, or wait for moderator review? auto-hide after X flags (allow users to provide a flag reason choose from a list of options + "other")
- Should there be categories/tags dropdown when submitting, or should moderators assign them? when submitting (modeerators can change/add tags)

### 4. Likes/Dislikes - Personal vs Community

- Current implementation: likes/dislikes are personal and affect category weights
- Should we also track community-wide likes/dislikes for each URL?
- Should popular URLs be shown more frequently?
- Do you want to keep personal category weights separate from community ratings?

### 5. Data Migration

- What happens to existing URLs in urls.json? Should they all be imported as admin-submitted? yes
- Should existing user data (local stats, history) be migrated to server, or start fresh? start fresh
- Do you want users to be able to sync their local history to their account?

### 6. Real-time Sync & Offline Support

- How often should the extension sync with the server? (On every drift, hourly, daily?)
- Should the extension cache URLs locally for offline use?
- Should the extension fallback to local JSON if server is down?

### 7. Blocklist

- Who can add to blocklist? (Users for themselves, or moderators for everyone?)
- What gets blocked? (Domains, specific URLs, users?)
- Should blocked content be hidden or just marked?

### 8. Additional Features

- Do you want a web dashboard for:
  - Browsing all submitted URLs?
  - Moderator tools?
  - User stats/history?
  - Analytics?
- Should there be user reputation/karma based on submission quality?
- Do you want RSS/API access for third parties?
- Should URLs have a "report broken link" feature?

### 9. Database Schema Questions

- Should each URL have a timestamp for when it was submitted?
- Do you want to track view counts for each URL?
- Should there be URL expiration (remove dead links automatically)?
- Do you want to store URL metadata (screenshot, favicon, etc.)?

### 10. Privacy & Legal

- What data should be private vs public?
- Do you need GDPR compliance? (EU users)
- Should there be Terms of Service / Content Policy?
- Do you want user data export/deletion features?

---

## MINIMAL MVP IMPLEMENTATION PLAN

### Goal

Allow users to submit new URLs that go into a pending queue. Admins/mods see pending submissions when they drift and can approve/reject them with a single click.

### Phase 1: Backend Setup (Cloudflare Workers + D1)

**Folder structure:**
```
drift/
├── extension/          # Chrome extension (existing)
├── website/            # Landing page (existing)
├── api/                # NEW - Cloudflare Workers API
│   ├── src/
│   │   ├── index.js    # Main worker entry point
│   │   ├── auth.js     # Auth handlers
│   │   ├── urls.js     # URL handlers
│   │   └── db.js       # Database utilities
│   ├── migrations/
│   │   └── 0001_initial.sql
│   ├── wrangler.toml   # Cloudflare config
│   └── package.json
└── notes/              # Planning docs
```

#### 1.1 Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,  -- for email/password auth
  role TEXT DEFAULT 'user',  -- 'user', 'mod', 'admin'
  created_at INTEGER NOT NULL,  -- unix timestamp
  last_login INTEGER
);

-- URLs table
CREATE TABLE urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  submitter_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending', 'live', 'rejected', 'banned'
  created_at INTEGER NOT NULL,
  approved_at INTEGER,
  approved_by INTEGER,  -- user_id of mod/admin who approved
  moderator_notes TEXT,
  FOREIGN KEY (submitter_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- URL Tags (many-to-many)
CREATE TABLE url_tags (
  url_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (url_id, tag),
  FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
);

-- Sessions (for auth)
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 1.2 API Endpoints (Cloudflare Workers)

**Auth endpoints:**

- `POST /api/auth/register` - Create account (email, username, password)
- `POST /api/auth/login` - Login and get session token
- `POST /api/auth/logout` - Invalidate session
- `GET /api/auth/me` - Get current user info

**URL endpoints:**

- `GET /api/urls` - Get URLs based on user role:
  - Regular users: live URLs + their own pending submissions
  - Mods/admins: live URLs + all pending submissions
- `POST /api/urls` - Submit new URL (requires auth, body: {url, title, tags})
- `POST /api/urls/:id/approve` - Approve pending URL (requires mod/admin)
- `POST /api/urls/:id/reject` - Reject pending URL (requires mod/admin)
- `PATCH /api/urls/:id` - Update URL title/tags (requires mod/admin)

**Data migration:**

- `POST /api/admin/import-legacy` - Import URLs from urls.json (admin only)
  - Converts category names to tags (e.g., category "technology" → tag "technology")
  - All existing URLs get status='live' and submitter_id=admin

### Phase 2: Extension Changes

#### 2.1 New UI Components

**In toolbar (content.js):**

- Add "Submit" button next to Drift button
- Add login/user indicator (shows username or "Login" button)
- For mods/admins: Show "Pending: X" badge
- When viewing pending URLs:
  - Regular users (own submissions): Show "PENDING - Awaiting approval" banner
  - Mods/admins: Show approve/reject buttons in overlay

**Submit form modal:**

- URL input (editable, auto-filled with current page URL)
- Title input (editable, auto-filled with page title)
- Tags input (comma-separated, e.g., "ai, tools, productivity")
- Submit button

**Auth modal:**

- Login form (email + password)
- Register form (email + username + password)
- "Not logged in" indicator in toolbar

#### 2.2 Code Changes

**extension/background.js:**

- Replace `fetch(chrome.runtime.getURL('data/urls.json'))` with API call to `GET https://drift.surf/api/urls`
- Add auth token management
- Implement caching strategy:
  - Cache API response in chrome.storage.local with timestamp
  - Use cached data if < 1 hour old
  - On API failure, fall back to cache, then to local extension/data/urls.json
  - Refresh cache when user drifts (if expired)

**extension/content.js:**

- Remove category dropdown (no longer needed - using tags only)
- Add submit button and modal
- Show approve/reject UI for mods/admins when pending URL is shown
- Add login state indicator
- Handle auth flow

**extension/auth.js (NEW):**

- Login/register/logout functions
- Token storage in chrome.storage.local
- Auto-refresh tokens
- API_BASE_URL = 'https://drift.surf/api'

#### 2.3 Flow for Regular Users

**Submitting a URL:**
1. User clicks "Submit" button
2. If not logged in → Show auth modal
3. If logged in → Show submit form pre-filled with current page
4. User fills form and clicks submit
5. Extension calls `POST /api/urls`
6. Success message: "Submitted! Waiting for moderator approval"
7. URL goes into pending queue

**Viewing own pending submission:**
1. User clicks "Drift"
2. Extension fetches URLs (includes their pending submissions)
3. If random URL is user's own pending submission:
   - Navigate to the URL
   - Show banner: "⏳ PENDING - This is your submission waiting for approval"
   - No approve/reject buttons (only mods see those)

#### 2.4 Flow for Mods/Admins

1. Mod clicks "Drift" button
2. Extension calls `GET /api/urls` (includes pending URLs for mods)
3. If random URL is pending, show it with overlay:
   ```
   ┌─────────────────────────────────┐
   │ PENDING SUBMISSION              │
   │ Submitted by: @username         │
   │ Tags: ai, tools, productivity   │
   │                                 │
   │ [✓ Approve]  [✗ Reject]        │
   └─────────────────────────────────┘
   ```
4. Mod clicks Approve → `POST /api/urls/:id/approve`
5. URL status changes to 'live'
6. Success message: "Approved! Now visible to all users"
7. Mod drifts to next URL

### Phase 3: Deployment

1. **Backend (Cloudflare):**
   - `cd api/`
   - `wrangler d1 create drift-db`
   - Run schema migrations: `wrangler d1 execute drift-db --file=migrations/0001_initial.sql`
   - Deploy: `wrangler deploy`
   - API will be live at `https://drift.surf/api/*`

2. **Extension:**
   - Import legacy URLs from extension/data/urls.json to database (via import-legacy endpoint)
   - Test locally: Load unpacked from `extension/` folder
   - Publish to Chrome Web Store when ready

3. **Website (optional):**
   - Already deployed on Cloudflare Pages (drift.surf)

### Out of Scope for MVP (Future phases)

- Magic link authentication (just email/password for now)
- Likes/dislikes sync to server (keep local for now)
- Flagging system
- Blocklist
- Web dashboard
- Community-wide ratings
- Analytics
- User profiles/history page

### MVP Decisions ✓

1. **Auth:** Custom auth (email/password, session tokens)
2. **Submit form:** In extension (modal overlay)
3. **Fallback:** YES - Fall back to local urls.json if API is down
4. **Caching:** Cache API responses for 1 hour
5. **Pending visibility:** YES - Submitters can see their own pending URLs
6. **Mod badge:** YES - Show pending count in toolbar for mods
7. **Rate limiting:** No limit for MVP

**Out of scope for MVP:**
- Notification system for approved/rejected submissions
- Community-wide likes/dislikes tracking
- Blocklist feature
