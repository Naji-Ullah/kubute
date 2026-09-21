import type { Role, User } from "./types";

const HOMES: Record<Role, { href: string; label: string }> = {
  host: { href: "/quizzes", label: "Quizzes" },
  player: { href: "/history", label: "History" },
};

export function displayName(user: User): string {
  return user.role === "player" ? user.nickname : user.name || user.username;
}

export function homeFor(user: User): { href: string; label: string } {
  return HOMES[user.role];
}
