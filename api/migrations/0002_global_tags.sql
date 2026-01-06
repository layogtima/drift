-- Drift Database Schema
-- Migration 0002: Global Tags System
-- Creates dedicated tags table and migrates existing tag data

-- Create tags table with metadata
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,           -- normalized lowercase tag name
  display_name TEXT NOT NULL,          -- display version (e.g., "AI" vs "ai")
  description TEXT,                    -- optional description
  color TEXT,                          -- optional hex color for UI
  created_at INTEGER NOT NULL,
  created_by INTEGER,                  -- user who first created this tag
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create index on tags for faster lookups
CREATE INDEX idx_tags_name ON tags(name);

-- Populate tags table from existing url_tags (unique tags only)
-- Uses LOWER() to normalize and picks the first occurrence for display_name
INSERT INTO tags (name, display_name, created_at)
SELECT DISTINCT 
  LOWER(tag) as name, 
  tag as display_name, 
  (strftime('%s', 'now') * 1000) as created_at
FROM url_tags
GROUP BY LOWER(tag);

-- Create new junction table with proper foreign key to tags
CREATE TABLE url_tags_new (
  url_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (url_id, tag_id),
  FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Migrate existing URL-tag associations
INSERT INTO url_tags_new (url_id, tag_id)
SELECT ut.url_id, t.id
FROM url_tags ut
JOIN tags t ON LOWER(ut.tag) = t.name;

-- Drop old junction table
DROP TABLE url_tags;

-- Rename new table to url_tags
ALTER TABLE url_tags_new RENAME TO url_tags;

-- Create index on junction table for faster tag-based queries
CREATE INDEX idx_url_tags_tag_id ON url_tags(tag_id);
CREATE INDEX idx_url_tags_url_id ON url_tags(url_id);
