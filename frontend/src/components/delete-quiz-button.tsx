"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/button";
import { FALLBACK_ERROR, toFormErrors } from "@/lib/api";
import { clientApi } from "@/lib/api.client";

export function DeleteQuizButton({ quizId }: { quizId: number }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function deleteQuiz() {
    if (!window.confirm("Delete this quiz? This can’t be undone.")) return;
    startTransition(async () => {
      try {
        await clientApi(`/quizzes/${quizId}`, { method: "DELETE" });
      } catch (err) {
        setError(toFormErrors(err).form ?? FALLBACK_ERROR);
        return;
      }
      router.push("/quizzes");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="ghost" disabled={pending} onClick={deleteQuiz}>
        {pending ? "Deleting…" : "Delete quiz"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
