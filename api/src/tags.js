// Tags API Handlers

import { authenticateRequest } from './auth.js';

// Get all tags (public)
export async function handleGetTags(request, env) {
  try {
    const result = await env.DB.prepare(`
      SELECT t.id, t.name, t.display_name, t.description, t.color,
             COUNT(ut.url_id) as url_count
      FROM tags t
      LEFT JOIN url_tags ut ON t.id = ut.tag_id
      GROUP BY t.id
      ORDER BY t.display_name ASC
    `).all();

    return new Response(JSON.stringify({
      tags: result.results || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get tags error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch tags' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Create new tag (mod/admin only)
export async function handleCreateTag(request, env) {
  try {
    const user = await authenticateRequest(request, env);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user.role !== 'mod' && user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only moderators and admins can create tags' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { name, display_name, description, color } = await request.json();

    if (!name || !display_name) {
      return new Response(JSON.stringify({ error: 'Name and display_name are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const normalizedName = name.toLowerCase().trim();

    // Check if tag already exists
    const existing = await env.DB.prepare(
      'SELECT id FROM tags WHERE name = ?'
    ).bind(normalizedName).first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Tag already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create tag
    const result = await env.DB.prepare(`
      INSERT INTO tags (name, display_name, description, color, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      normalizedName,
      display_name.trim(),
      description || null,
      color || null,
      Date.now(),
      user.id
    ).run();

    return new Response(JSON.stringify({
      success: true,
      tag: {
        id: result.meta.last_row_id,
        name: normalizedName,
        display_name: display_name.trim(),
        description,
        color
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create tag error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create tag' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update tag (mod/admin only)
export async function handleUpdateTag(request, env, tagId) {
  try {
    const user = await authenticateRequest(request, env);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user.role !== 'mod' && user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only moderators and admins can update tags' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { display_name, description, color } = await request.json();

    // Check if tag exists
    const existing = await env.DB.prepare(
      'SELECT * FROM tags WHERE id = ?'
    ).bind(tagId).first();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Tag not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update tag
    await env.DB.prepare(`
      UPDATE tags SET 
        display_name = COALESCE(?, display_name),
        description = COALESCE(?, description),
        color = COALESCE(?, color)
      WHERE id = ?
    `).bind(
      display_name || null,
      description !== undefined ? description : null,
      color || null,
      tagId
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Tag updated'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update tag error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update tag' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Delete tag (admin only)
export async function handleDeleteTag(request, env, tagId) {
  try {
    const user = await authenticateRequest(request, env);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can delete tags' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if tag exists
    const existing = await env.DB.prepare(
      'SELECT * FROM tags WHERE id = ?'
    ).bind(tagId).first();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Tag not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete tag (url_tags will be cleaned up via CASCADE)
    await env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(tagId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Tag deleted'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete tag error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete tag' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
