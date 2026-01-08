// Drift Authentication Helper for Website
// Adapted from extension/auth.js to use localStorage instead of chrome.storage

const API_BASE_URL = 'https://api.drift.surf';

// Get auth token from localStorage
export function getAuthToken() {
  return localStorage.getItem('drift_auth_token');
}

// Get current user from localStorage
export function getCurrentUser() {
  const userJson = localStorage.getItem('drift_current_user');
  return userJson ? JSON.parse(userJson) : null;
}

// Login
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
      return { success: false, error: data.error || 'Login failed' };
    }

    // Store token and user
    localStorage.setItem('drift_auth_token', data.token);
    localStorage.setItem('drift_current_user', JSON.stringify(data.user));

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Register
export async function register(email, username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Registration failed' };
    }

    // Store token and user
    localStorage.setItem('drift_auth_token', data.token);
    localStorage.setItem('drift_current_user', JSON.stringify(data.user));

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Register error:', error);
    return { success: false, error: error.message };
  }
}

// Logout
export async function logout() {
  localStorage.removeItem('drift_auth_token');
  localStorage.removeItem('drift_current_user');
  return { success: true };
}
