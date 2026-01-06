# Drift API

Cloudflare Workers backend for Drift - community URL submission and moderation system.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create D1 database:
```bash
npm run db:create
```

This will create the database and give you a database ID. Copy it and update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "drift-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

3. Run migrations:
```bash
npm run db:migrate
```

4. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:8787/*`

## Deploy

```bash
npm run deploy
```

The API will be deployed to `https://api.drift.surf/*`

## API Endpoints

### Authentication

- `POST /auth/register` - Create account
  - Body: `{ email, username, password }`
  - Returns: `{ success, token, user }`

- `POST /auth/login` - Login
  - Body: `{ email, password }`
  - Returns: `{ success, token, user }`

- `POST /auth/logout` - Logout
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ success }`

- `GET /auth/me` - Get current user
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ user }`

### URLs

- `GET /urls` - Get URLs (filtered by user role)
  - Headers: `Authorization: Bearer <token>` (optional)
  - Returns: `{ urls, pendingCount, user }`

- `POST /urls` - Submit new URL
  - Headers: `Authorization: Bearer <token>` (required)
  - Body: `{ url, title, tags }`
  - Returns: `{ success, urlId, message }`

- `POST /urls/:id/approve` - Approve pending URL (mod/admin only)
  - Headers: `Authorization: Bearer <token>` (required)
  - Returns: `{ success, message }`

- `POST /urls/:id/reject` - Reject pending URL (mod/admin only)
  - Headers: `Authorization: Bearer <token>` (required)
  - Returns: `{ success, message }`

- `PATCH /urls/:id` - Update URL (mod/admin only)
  - Headers: `Authorization: Bearer <token>` (required)
  - Body: `{ title?, tags? }`
  - Returns: `{ success, message }`

### Admin

- `POST /admin/import-legacy` - Import URLs from legacy urls.json (admin only)
  - Headers: `Authorization: Bearer <token>` (required)
  - Body: `{ urls: [{ url, title, category?, tags? }] }`
  - Returns: `{ success, imported, skipped, message }`

### Health

- `GET /health` - Health check
  - Returns: `{ status, version }`

## Database Schema

See `migrations/0001_initial.sql` for the complete schema.

Tables:
- `users` - User accounts
- `urls` - Submitted URLs
- `url_tags` - Tags for URLs (many-to-many)
- `sessions` - Authentication sessions

## Importing Legacy URLs

**Option 1: Using the import script (recommended)**

```bash
node import-urls.js <admin-email> <admin-password>
```

This will:
1. Login as admin to get auth token
2. Read the `extension/data/urls.json` file
3. Transform it to match the API format (categories → tags)
4. POST to `/admin/import-legacy`
5. Show import results (imported vs skipped duplicates)

By default, the script imports to production (`https://api.drift.surf`). To import to local dev server, edit `import-urls.js` and uncomment line 6.

**Option 2: Using curl directly**

```bash
# First, login to get admin token
TOKEN=$(curl -s -X POST https://api.drift.surf/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-admin@email.com","password":"your-password"}' \
  | jq -r '.token')

# Then import (requires Node.js for JSON transformation)
curl -X POST https://api.drift.surf/admin/import-legacy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @<(node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('./extension/data/urls.json'));
    const urls = [];
    Object.entries(data.categories).forEach(([cat, items]) => {
      if (cat !== 'all') {
        items.forEach(item => urls.push({...item, category: cat, tags: cat}));
      }
    });
    console.log(JSON.stringify({urls}));
  ")
```

For local dev server, replace `https://api.drift.surf` with `http://localhost:8787`.

## Testing Locally

You can test the API with curl:

```bash
# Register
curl -X POST http://localhost:8787/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Login
curl -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get URLs
curl http://localhost:8787/urls

# Submit URL (requires token from login)
curl -X POST http://localhost:8787/urls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"url":"https://example.com","title":"Example Site","tags":"example,test"}'
```

## Development

The API is structured as follows:

- `src/index.js` - Main router and CORS handling
- `src/auth.js` - Authentication handlers
- `src/urls.js` - URL management handlers
- `src/db.js` - Database utility functions

## Security

- Passwords are hashed using SHA-256
- Sessions expire after 30 days
- CORS is configured to only allow requests from drift.surf and chrome-extension:// origins
- All write operations require authentication
- Mod/admin operations are role-checked
