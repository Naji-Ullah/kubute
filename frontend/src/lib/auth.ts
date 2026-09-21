import "server-only";

import { redirect, unstable_rethrow } from "next/navigation";
import { cache } from "react";

import { ApiError } from "./api";
import { serverApi } from "./api.server";
import type { Role, User } from "./types";
import { homeFor } from "./user";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    return await serverApi<User>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return null;
    throw error;
  }
});

/** For public pages and site chrome: an unreachable API renders as signed out instead of failing the page. */
export async function getOptionalUser(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Could not load the current user", error);
    return null;
  }
}

export async function redirectIfSignedIn(): Promise<void> {
  const user = await getOptionalUser();
  if (user) redirect(homeFor(user).href);
}

export async function requireRole(role: Role): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(homeFor(user).href);
  return user;
}
