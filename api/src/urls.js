// URL handlers
import * as db from './db.js';
import { authenticateRequest } from './auth.js';

// GET /api/urls
export async function handleGetUrls(request, env) {
  try {
    // Get user if authenticated (optional)
    const user = await authenticateRequest(request, env);

    const urls = await db.getUrls(
      env.DB,
      user ? user.id : null,
      user ? user.role : null
    );

    // Get pending count for mods/admins
    let pendingCount = 0;
    if (user && (user.role === 'admin' || user.role === 'mod')) {
      pendingCount = await db.getPendingCount(env.DB);
    }

    return new Response(JSON.stringify({
      urls,
      pendingCount,
      user: user ? { id: user.id, username: user.username, role: user.role } : null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('GetUrls error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch URLs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/urls
export async function handleSubmitUrl(request, env) {
  try {
    // Authentication required
    const user = await authenticateRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { url, title, tags } = await request.json();

    // Validate inputs
    if (!url || !title) {
      return new Response(JSON.stringify({ error: 'URL and title are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if URL already exists
    const existing = await env.DB.prepare('SELECT id FROM urls WHERE url = ?').bind(url).first();
    if (existing) {
      return new Response(JSON.stringify({ error: 'URL already submitted' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse tags
    const tagArray = tags ? tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

    // Create URL
    const urlId = await db.createUrl(env.DB, url, title, user.id, tagArray);

    return new Response(JSON.stringify({
      success: true,
      urlId,
      message: 'URL submitted successfully. Waiting for moderator approval.'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('SubmitUrl error:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/urls/:id/approve
export async function handleApproveUrl(request, env, urlId) {
  try {
    // Authentication required (mod or admin only)
    const user = await authenticateRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user.role !== 'admin' && user.role !== 'mod') {
      return new Response(JSON.stringify({ error: 'Admin or moderator role required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if URL exists
    const url = await db.getUrlById(env.DB, urlId);
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'URL is not pending' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Approve URL
    await db.updateUrlStatus(env.DB, urlId, 'live', user.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'URL approved successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('ApproveUrl error:', error);
    return new Response(JSON.stringify({ error: 'Failed to approve URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/urls/:id/reject
export async function handleRejectUrl(request, env, urlId) {
  try {
    // Authentication required (mod or admin only)
    const user = await authenticateRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user.role !== 'admin' && user.role !== 'mod') {
      return new Response(JSON.stringify({ error: 'Admin or moderator role required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if URL exists
    const url = await db.getUrlById(env.DB, urlId);
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'URL is not pending' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Reject URL
    await db.updateUrlStatus(env.DB, urlId, 'rejected', user.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'URL rejected successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('RejectUrl error:', error);
    return new Response(JSON.stringify({ error: 'Failed to reject URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PATCH /api/urls/:id
export async function handleUpdateUrl(request, env, urlId) {
  try {
    // Authentication required (mod or admin only)
    const user = await authenticateRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user.role !== 'admin' && user.role !== 'mod') {
      return new Response(JSON.stringify({ error: 'Admin or moderator role required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { title, tags } = await request.json();

    // Check if URL exists
    const url = await db.getUrlById(env.DB, urlId);
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update title if provided
    if (title) {
      await env.DB.prepare('UPDATE urls SET title = ? WHERE id = ?')
        .bind(title, urlId).run();
    }

    // Update tags if provided
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      await db.updateUrlTags(env.DB, urlId, tagArray);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'URL updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('UpdateUrl error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/admin/import-legacy
export async function handleImportLegacy(request, env) {
  try {
    // Authentication required (admin only)
    const user = await authenticateRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return new Response(JSON.stringify({ error: 'Invalid format. Expected { urls: [...] }' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let imported = 0;
    let skipped = 0;

    for (const item of urls) {
      try {
        // Check if URL already exists
        const existing = await env.DB.prepare('SELECT id FROM urls WHERE url = ?').bind(item.url).first();
        if (existing) {
          skipped++;
          continue;
        }

        // Create URL with 'live' status (pre-approved)
        const createdAt = Date.now();
        const result = await env.DB.prepare(
          'INSERT INTO urls (url, title, submitter_id, status, created_at, approved_at, approved_by) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id'
        ).bind(item.url, item.title, user.id, 'live', createdAt, createdAt, user.id).first();

        // Add tags (convert category to tag if present)
        const tags = item.tags || (item.category ? [item.category] : []);
        if (tags.length > 0) {
          const tagInserts = tags.map(tag =>
            env.DB.prepare('INSERT INTO url_tags (url_id, tag) VALUES (?, ?)').bind(result.id, tag.toLowerCase().trim())
          );
          await env.DB.batch(tagInserts);
        }

        imported++;
      } catch (err) {
        console.error('Failed to import URL:', item.url, err);
        skipped++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      imported,
      skipped,
      message: `Imported ${imported} URLs, skipped ${skipped}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('ImportLegacy error:', error);
    return new Response(JSON.stringify({ error: 'Failed to import legacy URLs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
