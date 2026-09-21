import { parseResponse } from "./api";

type RequestOptions = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown };

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}

async function csrfToken(): Promise<string> {
  const existing = readCookie("csrftoken");
  if (existing) return existing;
  await fetch("/api/auth/csrf");
  return readCookie("csrftoken") ?? "";
}

export async function clientApi<T = void>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (method !== "GET") headers.set("X-CSRFToken", await csrfToken());

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parseResponse<T>(res);
}
