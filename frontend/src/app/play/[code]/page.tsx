import type { Metadata } from "next";

import { PlayerGame } from "@/components/player-game";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Play" };

export default async function PlayGamePage({ params }: PageProps<"/play/[code]">) {
  await requireRole("player");
  const { code } = await params;

  return <PlayerGame key={code} code={code.toUpperCase()} />;
}
