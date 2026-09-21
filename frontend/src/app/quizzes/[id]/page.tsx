import type { Metadata } from "next";

import { DeleteQuizButton } from "@/components/delete-quiz-button";
import { QuizEditor } from "@/components/quiz-editor";
import { serverApiOrNotFound } from "@/lib/api.server";
import { requireRole } from "@/lib/auth";
import type { Quiz } from "@/lib/types";

export const metadata: Metadata = { title: "Edit quiz" };

export default async function EditQuizPage({ params }: PageProps<"/quizzes/[id]">) {
  await requireRole("host");
  const { id } = await params;
  const quiz = await serverApiOrNotFound<Quiz>(`/quizzes/${encodeURIComponent(id)}`);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{quiz.is_played ? "Quiz" : "Edit quiz"}</h1>
          {quiz.is_played ? (
            <p className="mt-2 text-sm text-muted">This quiz has been played, so it’s read-only.</p>
          ) : null}
        </div>
        {quiz.is_played ? null : <DeleteQuizButton quizId={quiz.id} />}
      </div>
      <div className="mt-8">
        <QuizEditor quiz={quiz} />
      </div>
    </div>
  );
}
