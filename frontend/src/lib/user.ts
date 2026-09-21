import type { Role, User } from "./types";

type NavLink = { href: string; label: string };

const NAV: Record<Role, [NavLink, ...NavLink[]]> = {
  host: [{ href: "/quizzes", label: "Quizzes" }],
  player: [
    { href: "/play", label: "Play" },
    { href: "/history", label: "History" },
  ],
};

export function displayName(user: User): string {
  return user.role === "player" ? user.nickname : user.name || user.username;
}

export function navFor(user: User): NavLink[] {
  return NAV[user.role];
}

export function homeFor(user: User): NavLink {
  return NAV[user.role][0];
}
