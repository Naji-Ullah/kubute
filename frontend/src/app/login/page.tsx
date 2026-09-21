import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { redirectIfSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  await redirectIfSignedIn();

  return (
    <AuthShell
      title="Log in"
      description="Hosts and players both log in here."
      footer={
        <>
          New here?{" "}
          <Link href="/signup/host" className="text-foreground underline underline-offset-4">
            Host a quiz
          </Link>{" "}
          or{" "}
          <Link href="/signup/player" className="text-foreground underline underline-offset-4">
            join as a player
          </Link>
          .
        </>
      }
    >
      <AuthForm endpoint="/auth/login" fields={["username", "password"]} submitLabel="Log in" />
    </AuthShell>
  );
}
