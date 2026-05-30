const TOKEN_KEY = "campus-marche-token";

// sessionStorage is tab-scoped — each tab has its own independent session,
// so multiple accounts can be open simultaneously in different tabs.
export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY) ?? window.localStorage.getItem(TOKEN_KEY);
}

export function hasAuthToken() {
  return Boolean(getAuthToken());
}

export function setAuthToken(token: string) {
  window.sessionStorage.setItem(TOKEN_KEY, token);
  // Keep localStorage in sync so existing logged-in sessions survive a refresh
  // on tabs that had localStorage set before this change.
  try { window.localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}

export function clearAuthToken() {
  window.sessionStorage.removeItem(TOKEN_KEY);
  try { window.localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isEnvAdminToken(): boolean {
  const token = getAuthToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  return payload?.isEnvAdmin === true;
}
