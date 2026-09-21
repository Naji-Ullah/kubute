import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { redirectIfSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: "Join as a player" };

export default async function PlayerSignupPage() {
  await redirectIfSignedIn();

  return (
    <AuthShell
      title="Join as a player"
      description="Your nickname is what other players see on the leaderboard."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <AuthForm
        endpoint="/auth/register/player"
        fields={["name", "username", "nickname", "newPassword"]}
        submitLabel="Create account"
      />
    </AuthShell>
  );
}
