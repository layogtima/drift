// Drift Extension - Authentication Module

// API base URL
// const API_BASE_URL = 'http://localhost:8787'; // Change to 'https://api.drift.surf' for production
const API_BASE_URL = 'https://api.drift.surf'; // Change to 'https://api.drift.surf' for production

// Get stored auth token
export async function getAuthToken() {
  const data = await chrome.storage.local.get('authToken');
  return data.authToken || null;
}

// Store auth token
export async function setAuthToken(token) {
  await chrome.storage.local.set({ authToken: token });
}

// Remove auth token
export async function clearAuthToken() {
  await chrome.storage.local.remove('authToken');
}

// Get current user
export async function getCurrentUser() {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        await clearAuthToken();
        return null;
      }
      throw new Error('Failed to get user info');
    }

    const data = await response.json();

    // Store user info in local storage
    await chrome.storage.local.set({ currentUser: data.user });

    return data.user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Register new user
export async function register(email, username, password) {
  console.log('[Auth] Register called:', { email, username, apiUrl: API_BASE_URL });
  try {
    console.log('[Auth] Sending POST to', `${API_BASE_URL}/auth/register`);
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, username, password })
    });

    console.log('[Auth] Response status:', response.status);
    const data = await response.json();
    console.log('[Auth] Response data:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Store token and user info
    await setAuthToken(data.token);
    await chrome.storage.local.set({ currentUser: data.user });

    // Clear URL cache so it gets refreshed with the new auth token
    await chrome.storage.local.remove(['urlCache', 'cacheTimestamp']);

    console.log('[Auth] Registration successful, user:', data.user);
    return { success: true, user: data.user };
  } catch (error) {
    console.error('[Auth] Register error:', error);
    return { success: false, error: error.message };
  }
}

// Login existing user
export async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store token and user info
    await setAuthToken(data.token);
    await chrome.storage.local.set({ currentUser: data.user });

    // Clear URL cache so it gets refreshed with the new auth token
    await chrome.storage.local.remove(['urlCache', 'cacheTimestamp']);

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Logout user
export async function logout() {
  try {
    const token = await getAuthToken();
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage regardless of API call result
    await clearAuthToken();
    await chrome.storage.local.remove('currentUser');
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return user !== null;
}

// Check if user is mod or admin
export async function isModerator() {
  const user = await getCurrentUser();
  return user && (user.role === 'mod' || user.role === 'admin');
}

// Check if user is admin
export async function isAdmin() {
  const user = await getCurrentUser();
  return user && user.role === 'admin';
}
