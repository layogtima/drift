-- Drift Database Schema
-- Migration 0001: Initial schema

-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'mod', 'admin')),
  created_at INTEGER NOT NULL,
  last_login INTEGER
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- URLs table
CREATE TABLE urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  submitter_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'live', 'rejected', 'banned')),
  created_at INTEGER NOT NULL,
  approved_at INTEGER,
  approved_by INTEGER,
  moderator_notes TEXT,
  FOREIGN KEY (submitter_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Create indexes for faster queries
CREATE INDEX idx_urls_status ON urls(status);
CREATE INDEX idx_urls_submitter ON urls(submitter_id);
CREATE INDEX idx_urls_created ON urls(created_at DESC);

-- URL Tags (many-to-many)
CREATE TABLE url_tags (
  url_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (url_id, tag),
  FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
);

-- Create index on tags for faster filtering
CREATE INDEX idx_tags_tag ON url_tags(tag);

-- Sessions (for authentication)
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on user_id for session lookups
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
