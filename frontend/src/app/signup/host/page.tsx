import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { redirectIfSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: "Host a quiz" };

export default async function HostSignupPage() {
  await redirectIfSignedIn();

  return (
    <AuthShell
      title="Host a quiz"
      description="Create an account to build quizzes and run games."
      footer={
        <>
          Playing instead?{" "}
          <Link href="/signup/player" className="text-foreground underline underline-offset-4">
            Join as a player
          </Link>
        </>
      }
    >
      <AuthForm endpoint="/auth/register/host" fields={["username", "newPassword"]} submitLabel="Create account" />
    </AuthShell>
  );
}
