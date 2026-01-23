# Email Verification & Password Reset Implementation Plan

## Overview
Add email verification for new signups and forgot/reset password flow using Resend for transactional emails.

## Files to Modify/Create

### API (Backend)
| File | Action |
|------|--------|
| `api/migrations/0003_email_auth.sql` | **CREATE** - New migration for email auth tables |
| `api/src/email.js` | **CREATE** - Resend email service module |
| `api/src/auth.js` | **MODIFY** - Add new auth handlers |
| `api/src/index.js` | **MODIFY** - Add new routes |
| `api/src/db.js` | **MODIFY** - Add token DB functions |
| `api/wrangler.toml` | **MODIFY** - Document RESEND_API_KEY secret |
| `api/package.json` | **MODIFY** - Update db:migrate to run all migrations |

### Website
| File | Action |
|------|--------|
| `website/verify-email.html` | **CREATE** - Verification link landing page |
| `website/reset-password.html` | **CREATE** - Password reset form page |

### Extension
| File | Action |
|------|--------|
| `extension/auth.js` | **MODIFY** - Add forgot password & resend verification functions |
| `extension/popup.html` | **MODIFY** - Add forgot password link, unverified state UI |

---

## 1. Database Migration (`api/migrations/0003_email_auth.sql`)

```sql
-- Add email_verified to users
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

-- Email verification tokens
CREATE TABLE email_verification_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_verification_user ON email_verification_tokens(user_id);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_reset_user ON password_reset_tokens(user_id);
```

---

## 2. Email Service Module (`api/src/email.js`)

- Initialize Resend with API key from `env.RESEND_API_KEY`
- `sendVerificationEmail(email, token)` - Send verification link
- `sendPasswordResetEmail(email, token)` - Send reset link
- Base URL: `https://drift.surf`
- From address: `noreply@drift.surf` (requires domain verification in Resend)

**Email Templates:**
- Verification: Link to `https://drift.surf/verify-email.html?token=xxx`
- Password Reset: Link to `https://drift.surf/reset-password.html?token=xxx`

---

## 3. New API Endpoints

### `POST /auth/send-verification`
- Requires auth (Bearer token)
- Creates new verification token (24h expiry)
- Sends verification email via Resend
- Returns `{ success: true }`

### `GET /auth/verify-email?token=xxx`
- Public endpoint (no auth required)
- Validates token exists and not expired
- Sets `email_verified = 1` on user
- Deletes token
- Returns `{ success: true }` or redirect

### `POST /auth/forgot-password`
- Public endpoint
- Body: `{ email }`
- If email exists: create reset token (1h expiry), send email
- Always returns `{ success: true }` (security: don't reveal if email exists)

### `POST /auth/reset-password`
- Public endpoint
- Body: `{ token, password }`
- Validates token, updates password hash, marks token used
- Returns `{ success: true }` or error

---

## 4. Auth Flow Changes

### Registration Flow
1. User registers → account created with `email_verified = 0`
2. Verification email sent automatically
3. User can use ALL features normally (no restrictions)
4. Extension shows subtle "verify email" reminder
5. User clicks email link → verified, reminder disappears

### Password Reset Flow
1. User clicks "Forgot password?" in extension or on website
2. Enters email → API sends reset link
3. User clicks link → lands on `reset-password.html`
4. User enters new password → API updates password
5. User redirected to login

---

## 5. Extension UI Updates (`extension/popup.html`)

- Add "Forgot password?" link below login form
- Show verification status in user profile area:
  - If `!user.emailVerified`: Show warning badge + "Resend verification" button
- Add `forgotPassword(email)` and `resendVerification()` functions to `auth.js`

---

## 6. Website Pages

### `verify-email.html`
- Reads `token` from URL params
- Calls `GET /auth/verify-email?token=xxx`
- Shows success message or error
- Links back to main site

### `reset-password.html`
- Reads `token` from URL params
- Form: new password + confirm password
- Calls `POST /auth/reset-password`
- Shows success + link to extension

---

## 7. Migration Script Improvement (DONE)

Updated `api/package.json` to use D1's built-in migration management:

```json
"db:migrate": "wrangler d1 migrations apply drift-db-prod --remote",
"db:migrate:local": "wrangler d1 migrations apply drift-db-prod"
```

D1's `migrations apply` command:
- Tracks which migrations have been applied (in `d1_migrations` table)
- Only runs pending migrations
- Runs them in order based on filename

---

## 8. Configuration

### Resend Setup
1. Create account at resend.com
2. Add and verify domain `drift.surf` (DNS records)
3. Create API key
4. Add to Cloudflare: `wrangler secret put RESEND_API_KEY`

### Token Expiry
- Verification tokens: 24 hours
- Password reset tokens: 1 hour

---

## 9. Security Considerations

- Reset tokens are one-time use (marked `used = 1` after use)
- Don't reveal if email exists in forgot-password response
- Rate limiting (future enhancement - not in initial scope)
- Tokens are 32-byte random hex (same pattern as session tokens)

---

## Implementation Order

1. **Database migration** - Add tables and column
2. **Email module** - Create Resend integration
3. **API endpoints** - Add all 4 new routes
4. **Website pages** - Create verification & reset pages
5. **Extension UI** - Add forgot password link and verification status
6. **Testing** - End-to-end flow testing

---

## Verification Plan

### Manual Testing
1. **Registration + Verification:**
   - Register new account
   - Check email received with correct link
   - Click link → verify page shows success
   - Login → user marked as verified

2. **Password Reset:**
   - Click "Forgot password?"
   - Enter email → check email received
   - Click link → reset page loads
   - Enter new password → success message
   - Login with new password → works

3. **Edge Cases:**
   - Expired tokens show appropriate error
   - Invalid tokens rejected
   - Resend verification works for unverified users
   - Already verified users see correct state

### API Testing (curl)
```bash
# Test forgot password
curl -X POST https://api.drift.surf/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test verify email
curl "https://api.drift.surf/auth/verify-email?token=xxx"

# Test reset password
curl -X POST https://api.drift.surf/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"xxx","password":"newpassword123"}'
```

---

## Deployment Steps

### 1. Run Database Migration

```bash
cd api
npm run db:migrate
```

This runs `wrangler d1 migrations apply drift-db-prod --remote` which:
- Tracks which migrations have been applied (in a `d1_migrations` table)
- Only runs pending migrations
- Runs them in order based on filename

For local development, use:
```bash
npm run db:migrate:local
```

### 2. Set Up Resend

1. Go to [resend.com](https://resend.com) and create an account (or log in)
2. Navigate to **Domains** and add `drift.surf`
3. Add the required DNS records (MX, TXT for SPF/DKIM) to your domain registrar
4. Wait for domain verification (usually a few minutes)
5. Go to **API Keys** and create a new key

### 3. Add Resend API Key Secret

```bash
cd api
wrangler secret put RESEND_API_KEY
# Paste the API key when prompted
```

### 4. Deploy API

```bash
cd api
wrangler deploy
```

### 5. Deploy Website

Push the new HTML pages to your website hosting:
- `website/verify-email.html`
- `website/reset-password.html`

### 6. Load Updated Extension

If testing locally:
1. Go to `chrome://extensions/`
2. Click "Reload" on the Drift extension

For production:
- Package and submit to Chrome Web Store

---

## Post-Deployment Checklist

- [ ] Database migration applied successfully
- [ ] Resend domain verified
- [ ] RESEND_API_KEY secret added
- [ ] API deployed
- [ ] Website pages deployed
- [ ] Test registration sends verification email
- [ ] Test verification link works
- [ ] Test forgot password sends reset email
- [ ] Test password reset flow works
- [ ] Test resend verification button in extension
- [ ] Test "Forgot password?" link in extension

