// Client-side API helper with JWT access token + refresh-on-401

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data?.accessToken) {
      setAccessToken(json.data.accessToken);
      return json.data.accessToken as string;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; status: number }> {
  const headers = new Headers(options.headers);
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(path, { ...options, headers, credentials: "include" });

  if (res.status === 401 && !path.includes("/api/auth/")) {
    // try refresh once
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(path, { ...options, headers, credentials: "include" });
    }
  }

  let json: { success?: boolean; data?: T; error?: string } = {};
  try {
    json = await res.json();
  } catch {
    return { success: false, error: "Invalid response", status: res.status };
  }
  return {
    success: json.success ?? res.ok,
    data: json.data,
    error: json.error,
    status: res.status,
  };
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  del: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
