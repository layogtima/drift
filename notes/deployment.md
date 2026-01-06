# Drift Production Deployment Guide

> Deploy the Drift API to Cloudflare Workers and update the extension for production

---

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) with `drift.surf` domain
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated
- Node.js 18+

```bash
# Login to Cloudflare (if not already)
npx wrangler login
```

---

## Step 1: Create Production D1 Database

The local database is separate from production. Create a production database:

```bash
cd api

# Create production database
npx wrangler d1 create drift-db-prod
```

Copy the database ID from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "drift-db-prod"
database_id = "YOUR_PRODUCTION_DATABASE_ID"  # ← Update this
```

---

## Step 2: Run Migrations on Production

```bash
cd api

# Apply all pending migrations to production database
npx wrangler d1 migrations apply drift-db-prod --remote
```

Verify tables were created:

```bash
npx wrangler d1 execute drift-db-prod --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

---

## Step 3: Deploy API to Cloudflare Workers

```bash
cd api

# Deploy to production
npx wrangler deploy
```

The API will be available at: `https://api.drift.surf/*`

Verify it's working:

```bash
curl https://api.drift.surf/health
# Should return: {"status":"ok","version":"1.0.0"}
```

---

## Step 4: Create Admin User

Register yourself as a user, then manually set admin role:

```bash
# 1. Register via curl
curl -X POST https://api.drift.surf/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","username":"admin","password":"YOUR_SECURE_PASSWORD"}'

# 2. Promote to admin (get user ID from response, e.g., id=1)
npx wrangler d1 execute drift-db-prod --remote \
  --command="UPDATE users SET role = 'admin' WHERE id = 1;"
```

---

## Step 5: Import Legacy URLs

Get your admin token by logging in:

```bash
curl -X POST https://api.drift.surf/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"YOUR_SECURE_PASSWORD"}'
```

Copy the `token` from the response, then import URLs:

```bash
cd /Users/shreshthmohan/Projects/people/amit-goyal/drift

# Transform urls.json and import (requires jq)
cat extension/data/urls.json | jq '{urls: [.categories | to_entries[] | select(.key != "all") | .value[] | {url: .url, title: .title, tags: [.key]}] | unique_by(.url)}' | curl -X POST https://api.drift.surf/admin/import-legacy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d @-
```

---

## Step 6: Update Extension for Production

Change the API URL in both files:

### `extension/auth.js` (line 4)
```javascript
const API_BASE_URL = 'https://api.drift.surf';
```

### `extension/background.js` (line 6)
```javascript
const API_BASE_URL = 'https://api.drift.surf';
```

---

## Step 7: Test the Extension

1. Reload the extension in Chrome (`chrome://extensions` → Refresh)
2. Open any webpage
3. Register/login via the toolbar
4. Submit a URL
5. Check pending count appears for admin users

---

## Step 8: Publish to Chrome Web Store (Optional)

1. Zip the extension folder:
   ```bash
   cd extension
   zip -r ../drift-extension.zip . -x "*.DS_Store"
   ```

2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the zip file
4. Fill in store listing details
5. Submit for review

---

## Troubleshooting

### Check API Logs
```bash
npx wrangler tail
```

### Check Database Content
```bash
# View all users
npx wrangler d1 execute drift-db-prod --remote --command="SELECT id, email, username, role FROM users;"

# View pending URLs
npx wrangler d1 execute drift-db-prod --remote --command="SELECT id, url, title, status FROM urls WHERE status = 'pending';"
```

### Reset Database (⚠️ Destructive)
```bash
# Drop all tables and re-run migrations
npx wrangler d1 execute drift-db-prod --remote --command="DROP TABLE IF EXISTS sessions; DROP TABLE IF EXISTS url_tags; DROP TABLE IF EXISTS urls; DROP TABLE IF EXISTS users;"
npx wrangler d1 migrations apply drift-db-prod --remote
```

---

## Environment Checklist

| Item | Local | Production |
|------|-------|------------|
| API URL | `http://localhost:8787/api` | `https://api.drift.surf` |
| Database | `drift-db` (local) | `drift-db-prod` (remote) |
| Wrangler command | `npm run dev` | `npx wrangler deploy` |

---

## Quick Reference

```bash
# Start local dev
cd api && npm run dev

# Deploy to production
cd api && npx wrangler deploy

# View production logs
npx wrangler tail

# Run SQL on production
npx wrangler d1 execute drift-db-prod --remote --command="YOUR SQL HERE"
```
