import Link from "next/link";
import { Suspense } from "react";

import { ButtonLink } from "@/components/button";
import { LogoutButton } from "@/components/logout-button";
import { getOptionalUser } from "@/lib/auth";
import { displayName, navFor } from "@/lib/user";

async function AccountNav() {
  const user = await getOptionalUser();

  if (user) {
    return (
      <>
        {navFor(user).map((link) => (
          <ButtonLink key={link.href} href={link.href} variant="ghost">
            {link.label}
          </ButtonLink>
        ))}
        <span className="px-3 text-muted">{displayName(user)}</span>
        <LogoutButton />
      </>
    );
  }
  return (
    <>
      <ButtonLink href="/login" variant="ghost">
        Log in
      </ButtonLink>
      <ButtonLink href="/signup/host">Get started</ButtonLink>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-semibold tracking-tight">
          kubute
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Suspense>
            <AccountNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
