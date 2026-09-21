import "server-only";

import { cookies } from "next/headers";

import { parseResponse } from "./api";

export async function serverApi<T>(path: string): Promise<T> {
  const apiUrl = process.env.API_URL ?? "http://localhost:8000";
  const res = await fetch(`${apiUrl}/api${path}`, {
    cache: "no-store",
    headers: { cookie: (await cookies()).toString() },
  });
  return parseResponse<T>(res);
}
