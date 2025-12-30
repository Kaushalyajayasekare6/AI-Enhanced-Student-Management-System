// Authentication utility functions

const TOKEN_KEY = "token";
const ROLE_KEY = "role";
const USERNAME_KEY = "username";

/**
 * Save auth data to localStorage
 */
export const setAuth = (token, role, username) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(USERNAME_KEY, username);
};

/**
 * Clear auth data
 */
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USERNAME_KEY);
};

/**
 * Get stored JWT token
 */
export const getStoredToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Get stored role
 */
export const getStoredRole = () => {
  return localStorage.getItem(ROLE_KEY);
};

/**
 * Get stored username
 */
export const getStoredUsername = () => {
  return localStorage.getItem(USERNAME_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const token = getStoredToken();
  return !!token && !isTokenExpired();
};

/**
 * Check if JWT token is expired
 * (frontend check – backend is final authority)
 */
export const isTokenExpired = () => {
  const token = getStoredToken();
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000; // seconds → ms
    return Date.now() >= exp;
  } catch (error) {
    return true;
  }
};
