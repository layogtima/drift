// Authentication handlers
import * as db from './db.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.js';

// Simple password hashing (using Web Crypto API)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random session token
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate username (alphanumeric, underscore, hyphen, 3-20 chars)
function isValidUsername(username) {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
}

// POST /api/auth/register
export async function handleRegister(request, env) {
  try {
    const { email, username, password } = await request.json();

    // Validate inputs
    if (!email || !username || !password) {
      return new Response(JSON.stringify({ error: 'Email, username, and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!isValidUsername(username)) {
      return new Response(JSON.stringify({ error: 'Username must be 3-20 characters (letters, numbers, -, _)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if email already exists
    const existingEmail = await db.getUserByEmail(env.DB, email);
    if (existingEmail) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if username already exists
    const existingUsername = await db.getUserByUsername(env.DB, username);
    if (existingUsername) {
      return new Response(JSON.stringify({ error: 'Username already taken' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const userId = await db.createUser(env.DB, email, username, passwordHash);

    // Create session
    const token = generateToken();
    const session = await db.createSession(env.DB, userId, token);

    // Send verification email (don't block registration if it fails)
    try {
      if (env.RESEND_API_KEY) {
        const verificationToken = generateToken();
        await db.createVerificationToken(env.DB, userId, verificationToken);
        await sendVerificationEmail(env.RESEND_API_KEY, email, verificationToken, username);
      }
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue anyway - user can request resend later
    }

    return new Response(JSON.stringify({
      success: true,
      token: session.token,
      user: {
        id: userId,
        email,
        username,
        role: 'user',
        emailVerified: false
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ error: 'Registration failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/auth/login
export async function handleLogin(request, env) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user by email
    const user = await db.getUserByEmail(env.DB, email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify password
    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.password_hash) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update last login
    await env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?')
      .bind(Date.now(), user.id).run();

    // Create session
    const token = generateToken();
    const session = await db.createSession(env.DB, user.id, token);

    return new Response(JSON.stringify({
      success: true,
      token: session.token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: Boolean(user.email_verified)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/auth/logout
export async function handleLogout(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    await db.deleteSession(env.DB, token);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Logout failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET /api/auth/me
export async function handleGetMe(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const session = await db.getSession(env.DB, token);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await db.getUser(env.DB, session.user_id);

    return new Response(JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: Boolean(user.email_verified),
        createdAt: user.created_at
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get user info' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Middleware to authenticate requests
export async function authenticateRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const session = await db.getSession(env.DB, token);

  if (!session) {
    return null;
  }

  const user = await db.getUser(env.DB, session.user_id);
  return user;
}

// POST /auth/send-verification - Resend verification email
export async function handleSendVerification(request, env) {
  try {
    const user = await authenticateRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if already verified
    if (user.email_verified) {
      return new Response(JSON.stringify({ error: 'Email already verified' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if RESEND_API_KEY is configured
    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create and send verification token
    const verificationToken = generateToken();
    await db.createVerificationToken(env.DB, user.id, verificationToken);
    await sendVerificationEmail(env.RESEND_API_KEY, user.email, verificationToken, user.username);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return new Response(JSON.stringify({ error: 'Failed to send verification email' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET /auth/verify-email?token=xxx - Verify email with token
export async function handleVerifyEmail(request, env) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get and validate token
    const verificationToken = await db.getVerificationToken(env.DB, token);
    if (!verificationToken) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Mark user as verified
    await db.setEmailVerified(env.DB, verificationToken.user_id);

    // Delete the token
    await db.deleteVerificationToken(env.DB, token);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return new Response(JSON.stringify({ error: 'Verification failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /auth/forgot-password - Request password reset
export async function handleForgotPassword(request, env) {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Always return success to prevent email enumeration
    const successResponse = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // Check if user exists (silently fail if not)
    const user = await db.getUserByEmail(env.DB, email);
    if (!user) {
      return successResponse;
    }

    // Check if RESEND_API_KEY is configured
    if (!env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return successResponse;
    }

    // Create and send reset token
    const resetToken = generateToken();
    await db.createPasswordResetToken(env.DB, user.id, resetToken);
    await sendPasswordResetEmail(env.RESEND_API_KEY, user.email, resetToken, user.username);

    return successResponse;
  } catch (error) {
    console.error('Forgot password error:', error);
    // Still return success to prevent enumeration
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /auth/reset-password - Reset password with token
export async function handleResetPassword(request, env) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return new Response(JSON.stringify({ error: 'Token and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get and validate token
    const resetToken = await db.getPasswordResetToken(env.DB, token);
    if (!resetToken) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update password
    const passwordHash = await hashPassword(password);
    await db.updateUserPassword(env.DB, resetToken.user_id, passwordHash);

    // Mark token as used
    await db.markPasswordResetTokenUsed(env.DB, token);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return new Response(JSON.stringify({ error: 'Password reset failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
