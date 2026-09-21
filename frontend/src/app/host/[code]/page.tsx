import type { Metadata } from "next";

import { HostGame } from "@/components/host-game";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Host" };

export default async function HostGamePage({ params }: PageProps<"/host/[code]">) {
  await requireRole("host");
  const { code } = await params;

  return <HostGame key={code} code={code.toUpperCase()} />;
}
