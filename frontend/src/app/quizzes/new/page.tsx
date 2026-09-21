import type { Metadata } from "next";

import { QuizEditor } from "@/components/quiz-editor";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "New quiz" };

export default async function NewQuizPage() {
  await requireRole("host");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">New quiz</h1>
      <div className="mt-8">
        <QuizEditor />
      </div>
    </div>
  );
}
