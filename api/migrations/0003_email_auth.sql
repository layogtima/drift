-- Drift Database Schema
-- Migration 0003: Email Verification & Password Reset
-- Adds email verification tracking and token tables for auth flows

-- Add email_verified column to users (0 = not verified, 1 = verified)
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

-- Email verification tokens
-- Used for new user email confirmation
CREATE TABLE email_verification_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_verification_user ON email_verification_tokens(user_id);
CREATE INDEX idx_verification_expires ON email_verification_tokens(expires_at);

-- Password reset tokens
-- Used for forgot password flow
CREATE TABLE password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_reset_user ON password_reset_tokens(user_id);
CREATE INDEX idx_reset_expires ON password_reset_tokens(expires_at);
