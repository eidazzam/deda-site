'use client';

const TOKEN_KEY = 'deda_admin_token';
const USERNAME_KEY = 'deda_admin_username';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getAdminUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(USERNAME_KEY);
}

export function setAdminSession(token: string, username: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USERNAME_KEY, username);
}

export function clearAdminSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USERNAME_KEY);
}
