import type { User } from "./types";

export function displayName(user: User): string {
  return user.role === "player" ? user.nickname : user.name || user.username;
}

export function homePath(user: User): string {
  return user.role === "host" ? "/quizzes" : "/";
}
