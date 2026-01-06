# Global Tags Implementation Plan

> Plan for implementing a dedicated tags table with global tag management

---

## Current State

The current schema has `url_tags` as a simple junction table:

```sql
CREATE TABLE url_tags (
  url_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (url_id, tag),
  FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
);
```

**Problems with current approach:**
- Tags are just strings with no metadata
- No way to list all available tags
- No tag descriptions or categories
- Duplicate tags with different cases/spellings (e.g., "AI" vs "ai")
- No way to track tag popularity or usage count

---

## Proposed Schema Changes

### New `tags` Table

```sql
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

CREATE INDEX idx_tags_name ON tags(name);
```

### Updated `url_tags` Table

```sql
CREATE TABLE url_tags (
  url_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,             -- reference to tags table instead of text
  PRIMARY KEY (url_id, tag_id),
  FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_url_tags_tag ON url_tags(tag_id);
```

---

## Migration Strategy

Since we have existing data, we need a migration that:

1. Creates the new `tags` table
2. Populates it with unique tags from existing `url_tags`
3. Creates a new `url_tags_new` table with proper foreign keys
4. Migrates data from old to new junction table
5. Drops old table and renames new one

### Migration File: `0002_global_tags.sql`

```sql
-- Create tags table
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_at INTEGER NOT NULL,
  created_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Populate from existing url_tags (unique tags only)
INSERT INTO tags (name, display_name, created_at)
SELECT DISTINCT LOWER(tag), tag, strftime('%s', 'now') * 1000
FROM url_tags;

-- Create new junction table
CREATE TABLE url_tags_new (
  url_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (url_id, tag_id),
  FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Migrate existing associations
INSERT INTO url_tags_new (url_id, tag_id)
SELECT ut.url_id, t.id
FROM url_tags ut
JOIN tags t ON LOWER(ut.tag) = t.name;

-- Drop old table and rename
DROP TABLE url_tags;
ALTER TABLE url_tags_new RENAME TO url_tags;

-- Create index
CREATE INDEX idx_url_tags_tag ON url_tags(tag_id);
CREATE INDEX idx_tags_name ON tags(name);
```

---

## API Changes

### New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tags` | GET | List all global tags |
| `/tags` | POST | Create new tag (mod/admin) |
| `/tags/:id` | PATCH | Update tag (mod/admin) |
| `/tags/:id` | DELETE | Delete tag (admin only) |

### Updated Endpoints

| Endpoint | Change |
|----------|--------|
| `GET /urls` | Include tag objects with id, name, display_name |
| `POST /urls` | Accept tag IDs or create new tags by name |
| `PATCH /urls/:id` | Accept tag IDs for updating associations |

### Response Format Changes

**Before:**
```json
{
  "url": "https://example.com",
  "tags": ["technology", "ai"]
}
```

**After:**
```json
{
  "url": "https://example.com",
  "tags": [
    { "id": 1, "name": "technology", "display_name": "Technology" },
    { "id": 2, "name": "ai", "display_name": "AI" }
  ]
}
```

---

## Extension Changes

### Submit Form
- Fetch available tags from `/tags` endpoint
- Show autocomplete/dropdown with existing tags (let's have tags be a list of checkboxes)
- Allow creating new tags by typing (creates on submit)

### Tag Filtering (Future)
- Add tag filter to Drift button
- "Drift within tag" feature

---

## Implementation Order

1. **Database Migration**
   - Create `0002_global_tags.sql`
   - Run migration on local and production

2. **API Updates**
   - Add `GET /tags` endpoint
   - Update `getUrls()` to return tag objects
   - Update `createUrl()` to handle tag IDs
   - Add tag CRUD endpoints for mods/admins

3. **Extension Updates**
   - Fetch tags on init
   - Update submit form with tag dropdown
   - Update UI to show tag badges

---

## Open Questions

1. **Tag creation permissions:** Should regular users be able to create new tags, or only select from existing ones?
   - Option A: Anyone can create tags (more flexible)
   - Option B: Only mods/admins can create tags (more controlled): this
   - Option C: Users can suggest, mods approve

2. **Tag limits:** Should we limit how many tags can be on a URL? (e.g., max 5) 3

3. **Tag categories:** Do we need tag categories/groups? (e.g., "Topic: AI", "Type: Tool") no. let's keep it simple

---

## Estimated Effort

| Task | Estimate |
|------|----------|
| Migration file | 30 min |
| API endpoints | 2 hours |
| Extension UI | 2 hours |
| Testing | 1 hour |
| **Total** | ~5.5 hours |
