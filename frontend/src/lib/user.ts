import type { User } from "./types";

export function displayName(user: User): string {
  return user.role === "player" ? user.nickname : user.name || user.username;
}
