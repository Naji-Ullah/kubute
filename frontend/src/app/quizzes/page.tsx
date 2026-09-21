import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/button";
import { Pagination, parsePage } from "@/components/pagination";
import { serverApiOrNotFound } from "@/lib/api.server";
import { requireRole } from "@/lib/auth";
import { formatDate, plural } from "@/lib/format";
import type { Paginated, QuizSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Quizzes" };

export default async function QuizzesPage({ searchParams }: PageProps<"/quizzes">) {
  await requireRole("host");
  const page = parsePage((await searchParams).page);
  const quizzes = await serverApiOrNotFound<Paginated<QuizSummary>>(`/quizzes?page=${page}`);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Quizzes</h1>
        <ButtonLink href="/quizzes/new">New quiz</ButtonLink>
      </div>

      {quizzes.count === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <p className="font-medium">No quizzes yet</p>
          <p className="mt-1 text-sm text-muted">Create your first quiz to host a game.</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {quizzes.results.map((quiz) => (
            <li key={quiz.id}>
              <Link
                href={`/quizzes/${quiz.id}`}
                className="flex items-center justify-between gap-4 py-4 transition hover:text-muted"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{quiz.title}</span>
                  {quiz.is_played ? (
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                      Played
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm text-muted">
                  {plural(quiz.question_count, "question")} · {formatDate(quiz.updated_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath="/quizzes"
        page={page}
        hasPrevious={quizzes.previous !== null}
        hasNext={quizzes.next !== null}
      />
    </div>
  );
}
