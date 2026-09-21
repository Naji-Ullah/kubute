"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/button";
import { clientApi } from "@/lib/api.client";

export function LogoutButton() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function logout() {
    startTransition(async () => {
      try {
        await clientApi("/auth/logout", { method: "POST" });
      } catch {
        setFailed(true);
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="ghost" disabled={pending} onClick={logout}>
      {failed ? "Log out failed, retry" : "Log out"}
    </Button>
  );
}
