// Thin fetch wrapper. Reads JWT from localStorage so the entire app can call
// the NestJS backend with one helper. Throws on non-2xx so callers can rely on
// try/catch instead of branching on `res.ok`.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const BASE_URL = API_BASE_URL;

export class ApiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("wbk_token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(
      (body && (body.message || body.error)) || res.statusText,
      res.status,
      body,
    );
  }
  return body as T;
}
