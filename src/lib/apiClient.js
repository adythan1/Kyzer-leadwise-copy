import { supabase } from "@/lib/supabase";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const apiGet = async (path) => {
  const response = await fetch(buildApiUrl(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || "Request failed.";
    throw new Error(message);
  }

  return payload;
};

export const apiPost = async (path, body, options = {}) => {
  const extraHeaders = options?.headers || {};
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body ?? {}),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || "Request failed.";
    throw new Error(message);
  }

  return payload;
};

const getAccessToken = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error("Authentication required.");
  }
  return data.session.access_token;
};

export const apiPostAuthed = async (path, body, options = {}) => {
  const accessToken = await getAccessToken();
  const existingHeaders = options?.headers || {};

  return apiPost(path, body, {
    ...options,
    headers: {
      ...existingHeaders,
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

export { buildApiUrl };
