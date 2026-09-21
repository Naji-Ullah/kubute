"use client";

import { useRouter } from "next/navigation";
import { memo, useReducer, useState, useTransition, type Dispatch, type FormEvent } from "react";

import { Button, ButtonLink } from "@/components/button";
import { Field, FormError, inputClass } from "@/components/field";
import { ApiError, FALLBACK_ERROR, firstMessage, isRecord } from "@/lib/api";
import { clientApi } from "@/lib/api.client";
import {
  MAX_CHOICES,
  MAX_QUESTIONS,
  MIN_CHOICES,
  TIME_LIMITS,
  draftReducer,
  toDraft,
  toPayload,
  type DraftAction,
  type DraftQuestion,
} from "@/lib/quiz-draft";
import type { Quiz } from "@/lib/types";

type EditorErrors = { form?: string; title?: string; questions: (string | undefined)[] };

function indexedMessages(errors: Record<string, unknown>): (string | undefined)[] {
  const messages: (string | undefined)[] = [];
  for (const [index, value] of Object.entries(errors)) {
    messages[Number(index)] = firstMessage(value);
  }
  return messages;
}

function toEditorErrors(error: unknown): EditorErrors {
  if (!(error instanceof ApiError) || !isRecord(error.body)) {
    return { form: FALLBACK_ERROR, questions: [] };
  }
  const { detail, title, questions, ...rest } = error.body;
  const errors: EditorErrors = isRecord(questions)
    ? { form: firstMessage(detail), title: firstMessage(title), questions: indexedMessages(questions) }
    : { form: firstMessage(detail) ?? firstMessage(questions), title: firstMessage(title), questions: [] };
  if (!errors.form && !errors.title && !errors.questions.some(Boolean)) {
    errors.form = firstMessage(rest) ?? FALLBACK_ERROR;
  }
  return errors;
}

export function QuizEditor({ quiz }: { quiz?: Quiz }) {
  const router = useRouter();
  const [draft, dispatch] = useReducer(draftReducer, quiz, toDraft);
  const [errors, setErrors] = useState<EditorErrors>({ questions: [] });
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = toPayload(draft);
    startTransition(async () => {
      try {
        await clientApi(quiz ? `/quizzes/${quiz.id}` : "/quizzes", { method: quiz ? "PUT" : "POST", body });
      } catch (error) {
        setErrors(toEditorErrors(error));
        return;
      }
      router.push("/quizzes");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <FormError message={errors.form} />
      <Field
        label="Title"
        name="title"
        value={draft.title}
        onChange={(event) => dispatch({ type: "setTitle", value: event.target.value })}
        required
        maxLength={120}
        error={errors.title}
      />
      <ol className="space-y-6">
        {draft.questions.map((question, index) => (
          <li key={question.key}>
            <QuestionCard
              question={question}
              index={index}
              error={errors.questions[index]}
              canRemove={draft.questions.length > 1}
              dispatch={dispatch}
            />
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="secondary"
        disabled={draft.questions.length >= MAX_QUESTIONS}
        onClick={() => dispatch({ type: "addQuestion" })}
      >
        Add question
      </Button>
      <div className="flex gap-3 border-t border-border pt-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save quiz"}
        </Button>
        <ButtonLink href="/quizzes" variant="ghost">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}

type QuestionCardProps = {
  question: DraftQuestion;
  index: number;
  error?: string;
  canRemove: boolean;
  dispatch: Dispatch<DraftAction>;
};

const QuestionCard = memo(function QuestionCard({ question, index, error, canRemove, dispatch }: QuestionCardProps) {
  const id = `question-${index}`;
  const timeLimits = TIME_LIMITS.includes(question.timeLimit)
    ? TIME_LIMITS
    : [...TIME_LIMITS, question.timeLimit].toSorted((a, b) => a - b);

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-5 rounded-lg border border-border p-5">
      <div className="flex items-center justify-between">
        <h2 id={`${id}-heading`} className="text-sm font-medium">
          Question {index + 1}
        </h2>
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 text-muted"
            onClick={() => dispatch({ type: "removeQuestion", question: index })}
          >
            Remove
          </Button>
        ) : null}
      </div>

      <FormError message={error} />
      <Field
        label="Question"
        name={`${id}-text`}
        value={question.text}
        onChange={(event) => dispatch({ type: "setQuestionText", question: index, value: event.target.value })}
        required
        maxLength={300}
      />

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium">Answers</legend>
        <p className="text-sm text-muted">Select the correct one.</p>
        {question.choices.map((choice, choiceIndex) => (
          <div key={choice.key} className="flex items-center gap-3">
            <input
              type="radio"
              name={`${id}-correct`}
              checked={question.correct === choiceIndex}
              onChange={() => dispatch({ type: "setCorrect", question: index, choice: choiceIndex })}
              aria-label={`Answer ${choiceIndex + 1} is correct`}
              className="size-4 shrink-0 accent-foreground"
            />
            <input
              value={choice.text}
              onChange={(event) =>
                dispatch({ type: "setChoiceText", question: index, choice: choiceIndex, value: event.target.value })
              }
              name={`${id}-choice-${choiceIndex}`}
              aria-label={`Answer ${choiceIndex + 1}`}
              placeholder={`Answer ${choiceIndex + 1}`}
              required
              maxLength={120}
              className={inputClass}
            />
            {question.choices.length > MIN_CHOICES ? (
              <Button
                type="button"
                variant="ghost"
                aria-label={`Remove answer ${choiceIndex + 1}`}
                className="w-10 shrink-0 px-0 text-muted"
                onClick={() => dispatch({ type: "removeChoice", question: index, choice: choiceIndex })}
              >
                ×
              </Button>
            ) : null}
          </div>
        ))}
        {question.choices.length < MAX_CHOICES ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 text-muted"
            onClick={() => dispatch({ type: "addChoice", question: index })}
          >
            Add answer
          </Button>
        ) : null}
      </fieldset>

      <label className="flex items-center gap-3 text-sm">
        <span className="font-medium">Time limit</span>
        <select
          value={question.timeLimit}
          onChange={(event) => dispatch({ type: "setTimeLimit", question: index, value: Number(event.target.value) })}
          className="h-9 rounded-md border border-border bg-background px-2 outline-none focus:border-foreground"
        >
          {timeLimits.map((seconds) => (
            <option key={seconds} value={seconds}>
              {seconds} seconds
            </option>
          ))}
        </select>
      </label>
    </section>
  );
});
