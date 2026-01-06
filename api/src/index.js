// Drift API - Cloudflare Workers
import { handleRegister, handleLogin, handleLogout, handleGetMe } from './auth.js';
import { handleGetUrls, handleSubmitUrl, handleApproveUrl, handleRejectUrl, handleUpdateUrl, handleImportLegacy } from './urls.js';

// CORS headers
function getCorsHeaders(origin) {
  const allowedOrigins = [
    'https://drift.surf',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  // Allow all chrome-extension:// origins
  if (origin && origin.startsWith('chrome-extension://')) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };
  }

  // Check if origin is in allowed list
  if (origin && allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };
  }

  return {
    'Access-Control-Allow-Origin': 'https://drift.surf',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

// Handle OPTIONS (CORS preflight)
function handleOptions(request) {
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// Add CORS headers to response
function addCorsHeaders(response, request) {
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// Router
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return handleOptions(request);
  }

  try {
    // Auth routes
    if (path === '/api/auth/register' && method === 'POST') {
      return await handleRegister(request, env);
    }

    if (path === '/api/auth/login' && method === 'POST') {
      return await handleLogin(request, env);
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      return await handleLogout(request, env);
    }

    if (path === '/api/auth/me' && method === 'GET') {
      return await handleGetMe(request, env);
    }

    // URL routes
    if (path === '/api/urls' && method === 'GET') {
      return await handleGetUrls(request, env);
    }

    if (path === '/api/urls' && method === 'POST') {
      return await handleSubmitUrl(request, env);
    }

    // URL actions (approve, reject, update)
    const urlActionMatch = path.match(/^\/api\/urls\/(\d+)\/(approve|reject)$/);
    if (urlActionMatch && method === 'POST') {
      const urlId = parseInt(urlActionMatch[1]);
      const action = urlActionMatch[2];

      if (action === 'approve') {
        return await handleApproveUrl(request, env, urlId);
      } else if (action === 'reject') {
        return await handleRejectUrl(request, env, urlId);
      }
    }

    // URL update
    const urlUpdateMatch = path.match(/^\/api\/urls\/(\d+)$/);
    if (urlUpdateMatch && method === 'PATCH') {
      const urlId = parseInt(urlUpdateMatch[1]);
      return await handleUpdateUrl(request, env, urlId);
    }

    // Admin routes
    if (path === '/api/admin/import-legacy' && method === 'POST') {
      return await handleImportLegacy(request, env);
    }

    // Health check
    if (path === '/api/health' && method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', version: '1.0.0' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 404 Not Found
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Request error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Worker entry point
export default {
  async fetch(request, env, ctx) {
    const response = await handleRequest(request, env);
    return addCorsHeaders(response, request);
  }
};
