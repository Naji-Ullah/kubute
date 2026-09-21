import type { Metadata } from "next";

import { JoinForm } from "@/components/join-form";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Join a game" };

export default async function PlayPage() {
  await requireRole("player");

  return (
    <div className="mx-auto w-full max-w-sm px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Join a game</h1>
      <p className="mt-2 text-sm text-muted">Enter the code on the host’s screen.</p>
      <div className="mt-8">
        <JoinForm />
      </div>
    </div>
  );
}
