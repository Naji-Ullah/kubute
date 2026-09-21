"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/button";
import { FALLBACK_ERROR, toFormErrors } from "@/lib/api";
import { clientApi } from "@/lib/api.client";

export function HostGameButton({ quizId }: { quizId: number }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function hostGame() {
    startTransition(async () => {
      try {
        const game = await clientApi<{ code: string }>("/games", { method: "POST", body: { quiz: quizId } });
        router.push(`/host/${game.code}`);
      } catch (err) {
        setError(toFormErrors(err).form ?? FALLBACK_ERROR);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" disabled={pending} onClick={hostGame}>
        {pending ? "Starting…" : "Host game"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
