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

The API will be available at `http://localhost:8787/api/*`

## Deploy

```bash
npm run deploy
```

The API will be deployed to `https://drift.surf/api/*`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Create account
  - Body: `{ email, username, password }`
  - Returns: `{ success, token, user }`

- `POST /api/auth/login` - Login
  - Body: `{ email, password }`
  - Returns: `{ success, token, user }`

- `POST /api/auth/logout` - Logout
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ success }`

- `GET /api/auth/me` - Get current user
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ user }`

### URLs

- `GET /api/urls` - Get URLs (filtered by user role)
  - Headers: `Authorization: Bearer <token>` (optional)
  - Returns: `{ urls, pendingCount, user }`

- `POST /api/urls` - Submit new URL
  - Headers: `Authorization: Bearer <token>` (required)
  - Body: `{ url, title, tags }`
  - Returns: `{ success, urlId, message }`

- `POST /api/urls/:id/approve` - Approve pending URL (mod/admin only)
  - Headers: `Authorization: Bearer <token>` (required)
  - Returns: `{ success, message }`

- `POST /api/urls/:id/reject` - Reject pending URL (mod/admin only)
  - Headers: `Authorization: Bearer <token>` (required)
  - Returns: `{ success, message }`

- `PATCH /api/urls/:id` - Update URL (mod/admin only)
  - Headers: `Authorization: Bearer <token>` (required)
  - Body: `{ title?, tags? }`
  - Returns: `{ success, message }`

### Admin

- `POST /api/admin/import-legacy` - Import URLs from legacy urls.json (admin only)
  - Headers: `Authorization: Bearer <token>` (required)
  - Body: `{ urls: [{ url, title, category?, tags? }] }`
  - Returns: `{ success, imported, skipped, message }`

### Health

- `GET /api/health` - Health check
  - Returns: `{ status, version }`

## Database Schema

See `migrations/0001_initial.sql` for the complete schema.

Tables:
- `users` - User accounts
- `urls` - Submitted URLs
- `url_tags` - Tags for URLs (many-to-many)
- `sessions` - Authentication sessions

## Testing Locally

You can test the API with curl:

```bash
# Register
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Login
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get URLs
curl http://localhost:8787/api/urls

# Submit URL (requires token from login)
curl -X POST http://localhost:8787/api/urls \
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
