// Database utility functions

export async function getUser(db, userId) {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  return result;
}

export async function getUserByEmail(db, email) {
  const result = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  return result;
}

export async function getUserByUsername(db, username) {
  const result = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  return result;
}

export async function createUser(db, email, username, passwordHash) {
  const createdAt = Date.now();
  const result = await db.prepare(
    'INSERT INTO users (email, username, password_hash, created_at) VALUES (?, ?, ?, ?) RETURNING id'
  ).bind(email, username, passwordHash, createdAt).first();

  return result.id;
}

export async function createSession(db, userId, token) {
  const createdAt = Date.now();
  const expiresAt = createdAt + (30 * 24 * 60 * 60 * 1000); // 30 days

  await db.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, userId, createdAt, expiresAt).run();

  return { token, expiresAt };
}

export async function getSession(db, token) {
  const result = await db.prepare(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, Date.now()).first();

  return result;
}

export async function deleteSession(db, token) {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

export async function cleanupExpiredSessions(db) {
  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now()).run();
}

// URL functions
export async function getUrls(db, userId, userRole) {
  let query;
  let bindings = [];

  // Base query to get URLs (tags fetched separately for proper object structure)
  if (userRole === 'admin' || userRole === 'mod') {
    // Mods/admins see all live URLs + all pending URLs
    query = `
      SELECT u.*
      FROM urls u
      WHERE u.status IN ('live', 'pending')
      ORDER BY u.created_at DESC
    `;
  } else if (userId) {
    // Regular logged-in users see live URLs + their own pending URLs
    query = `
      SELECT u.*
      FROM urls u
      WHERE u.status = 'live' OR (u.status = 'pending' AND u.submitter_id = ?)
      ORDER BY u.created_at DESC
    `;
    bindings = [userId];
  } else {
    // Anonymous users see only live URLs
    query = `
      SELECT u.*
      FROM urls u
      WHERE u.status = 'live'
      ORDER BY u.created_at DESC
    `;
  }

  const results = await db.prepare(query).bind(...bindings).all();

  // Fetch tags for each URL with full tag objects
  const urlsWithTags = await Promise.all(results.results.map(async (url) => {
    const tagsResult = await db.prepare(`
      SELECT t.id, t.name, t.display_name
      FROM tags t
      JOIN url_tags ut ON t.id = ut.tag_id
      WHERE ut.url_id = ?
    `).bind(url.id).all();

    return {
      ...url,
      tags: tagsResult.results || []
    };
  }));

  return urlsWithTags;
}

export async function getUrlById(db, urlId) {
  const url = await db.prepare('SELECT * FROM urls WHERE id = ?').bind(urlId).first();

  if (!url) return null;

  // Get tags with full tag objects
  const tagsResult = await db.prepare(`
    SELECT t.id, t.name, t.display_name
    FROM tags t
    JOIN url_tags ut ON t.id = ut.tag_id
    WHERE ut.url_id = ?
  `).bind(urlId).all();

  return {
    ...url,
    tags: tagsResult.results || []
  };
}

// tagIds is an array of tag IDs (integers)
export async function createUrl(db, url, title, submitterId, tagIds = []) {
  const createdAt = Date.now();

  // Insert URL
  const result = await db.prepare(
    'INSERT INTO urls (url, title, submitter_id, created_at) VALUES (?, ?, ?, ?) RETURNING id'
  ).bind(url, title, submitterId, createdAt).first();

  const urlId = result.id;

  // Insert tag associations (max 3)
  const limitedTagIds = tagIds.slice(0, 3);
  if (limitedTagIds.length > 0) {
    const tagInserts = limitedTagIds.map(tagId =>
      db.prepare('INSERT INTO url_tags (url_id, tag_id) VALUES (?, ?)').bind(urlId, tagId)
    );
    await db.batch(tagInserts);
  }

  return urlId;
}

export async function updateUrlStatus(db, urlId, status, approvedBy = null) {
  const approvedAt = status === 'live' ? Date.now() : null;

  await db.prepare(
    'UPDATE urls SET status = ?, approved_at = ?, approved_by = ? WHERE id = ?'
  ).bind(status, approvedAt, approvedBy, urlId).run();
}

// tagIds is an array of tag IDs (integers)
export async function updateUrlTags(db, urlId, tagIds) {
  // Delete existing tag associations
  await db.prepare('DELETE FROM url_tags WHERE url_id = ?').bind(urlId).run();

  // Insert new tag associations (max 3)
  const limitedTagIds = tagIds.slice(0, 3);
  if (limitedTagIds.length > 0) {
    const tagInserts = limitedTagIds.map(tagId =>
      db.prepare('INSERT INTO url_tags (url_id, tag_id) VALUES (?, ?)').bind(urlId, tagId)
    );
    await db.batch(tagInserts);
  }
}

export async function getPendingCount(db) {
  const result = await db.prepare('SELECT COUNT(*) as count FROM urls WHERE status = ?').bind('pending').first();
  return result.count;
}
