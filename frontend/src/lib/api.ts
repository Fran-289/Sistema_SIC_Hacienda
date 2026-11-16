const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api";

const TOKEN_KEY = "sic_token";
const USER_KEY = "sic_user";
const REMEMBER_EMAIL_KEY = "sic_remember_email";

function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowSeconds;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;

  let token = localStorage.getItem(TOKEN_KEY);

  // Migrar sesión previa de sessionStorage a localStorage para soporte multi-pestaña
  if (!token) {
    const legacySessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (legacySessionToken) {
      localStorage.setItem(TOKEN_KEY, legacySessionToken);
      const legacyUser = sessionStorage.getItem(USER_KEY);
      if (legacyUser) {
        localStorage.setItem(USER_KEY, legacyUser);
      }
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      token = legacySessionToken;
    }
  }

  if (token && !isTokenValid(token)) {
    removeToken();
    return null;
  }
  return token;
}

export function setSession(token: string, user: any, remember = false, email?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);

  if (remember && email) {
    localStorage.setItem(REMEMBER_EMAIL_KEY, email);
  } else if (!remember) {
    localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }
}

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REMEMBER_EMAIL_KEY) || "";
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): any {
  if (typeof window === "undefined") return null;
  if (!getToken()) return null;
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUser(user: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (response.status === 401 && !endpoint.includes("/auth/login")) {
    removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Sesión expirada. Inicie sesión nuevamente.");
  }

  const contentType = response.headers.get("content-type");
  let data: any = null;

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Error al comunicarse con el servidor");
  }

  return data;
}

export async function downloadApiFile(endpoint: string, fallbackFilename: string) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers,
  });

  if (response.status === 401) {
    removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Sesión expirada. Inicie sesión nuevamente.");
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const errData = await response.json();
      throw new Error(errData?.error || "No se pudo descargar el archivo");
    }
    throw new Error("No se pudo descargar el archivo");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  let filename = fallbackFilename;
  if (disposition) {
    const match = disposition.match(/filename="?([^";]+)"?/i);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
