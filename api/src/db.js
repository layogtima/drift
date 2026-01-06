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

  if (userRole === 'admin' || userRole === 'mod') {
    // Mods/admins see all live URLs + all pending URLs
    query = `
      SELECT u.*, GROUP_CONCAT(t.tag, ',') as tags
      FROM urls u
      LEFT JOIN url_tags t ON u.id = t.url_id
      WHERE u.status IN ('live', 'pending')
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
  } else if (userId) {
    // Regular logged-in users see live URLs + their own pending URLs
    query = `
      SELECT u.*, GROUP_CONCAT(t.tag, ',') as tags
      FROM urls u
      LEFT JOIN url_tags t ON u.id = t.url_id
      WHERE u.status = 'live' OR (u.status = 'pending' AND u.submitter_id = ?)
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    bindings = [userId];
  } else {
    // Anonymous users see only live URLs
    query = `
      SELECT u.*, GROUP_CONCAT(t.tag, ',') as tags
      FROM urls u
      LEFT JOIN url_tags t ON u.id = t.url_id
      WHERE u.status = 'live'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
  }

  const results = await db.prepare(query).bind(...bindings).all();

  // Parse tags from comma-separated string to array
  return results.results.map(url => ({
    ...url,
    tags: url.tags ? url.tags.split(',') : []
  }));
}

export async function getUrlById(db, urlId) {
  const url = await db.prepare('SELECT * FROM urls WHERE id = ?').bind(urlId).first();

  if (!url) return null;

  // Get tags
  const tags = await db.prepare('SELECT tag FROM url_tags WHERE url_id = ?').bind(urlId).all();

  return {
    ...url,
    tags: tags.results.map(t => t.tag)
  };
}

export async function createUrl(db, url, title, submitterId, tags = []) {
  const createdAt = Date.now();

  // Insert URL
  const result = await db.prepare(
    'INSERT INTO urls (url, title, submitter_id, created_at) VALUES (?, ?, ?, ?) RETURNING id'
  ).bind(url, title, submitterId, createdAt).first();

  const urlId = result.id;

  // Insert tags
  if (tags.length > 0) {
    const tagInserts = tags.map(tag =>
      db.prepare('INSERT INTO url_tags (url_id, tag) VALUES (?, ?)').bind(urlId, tag.toLowerCase().trim())
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

export async function updateUrlTags(db, urlId, tags) {
  // Delete existing tags
  await db.prepare('DELETE FROM url_tags WHERE url_id = ?').bind(urlId).run();

  // Insert new tags
  if (tags.length > 0) {
    const tagInserts = tags.map(tag =>
      db.prepare('INSERT INTO url_tags (url_id, tag) VALUES (?, ?)').bind(urlId, tag.toLowerCase().trim())
    );
    await db.batch(tagInserts);
  }
}

export async function getPendingCount(db) {
  const result = await db.prepare('SELECT COUNT(*) as count FROM urls WHERE status = ?').bind('pending').first();
  return result.count;
}
