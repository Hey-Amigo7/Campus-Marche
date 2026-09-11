const TOKEN_KEY = "campus-marche-token";

// sessionStorage is tab-scoped — each tab has its own independent session,
// so multiple accounts can be open simultaneously in different tabs.
export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY) ?? window.localStorage.getItem(TOKEN_KEY);
}

export function hasAuthToken() {
  const token = getAuthToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (payload?.exp && typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) {
    clearAuthToken();
    return false;
  }
  return true;
}

export function setAuthToken(token: string) {
  // sessionStorage: tab-scoped, not persisted across browser restarts (safer than localStorage).
  // We no longer write to localStorage because localStorage is readable by any JS on the page,
  // making it an XSS target. The cookie covers server-side middleware reads.
  window.sessionStorage.setItem(TOKEN_KEY, token);
  // 7 days — matches JWT expiry so the cookie doesn't outlive the token
  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `cm_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearAuthToken() {
  window.sessionStorage.removeItem(TOKEN_KEY);
  try { window.localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  document.cookie = 'cm_token=; path=/; max-age=0; SameSite=Lax';
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
