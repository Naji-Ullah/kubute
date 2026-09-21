import type { Quiz } from "./types";

export const MIN_CHOICES = 2;
export const MAX_CHOICES = 4;
export const MAX_QUESTIONS = 50;
export const TIME_LIMITS = [10, 20, 30, 60, 90, 120];
const DEFAULT_TIME_LIMIT = 20;

export type DraftChoice = { key: number; text: string };

export type DraftQuestion = {
  key: number;
  text: string;
  timeLimit: number;
  correct: number;
  choices: DraftChoice[];
};

export type Draft = { title: string; questions: DraftQuestion[]; nextKey: number };

export type QuizPayload = {
  title: string;
  questions: { text: string; time_limit: number; choices: { text: string; is_correct: boolean }[] }[];
};

export type DraftAction =
  | { type: "setTitle"; value: string }
  | { type: "addQuestion" }
  | { type: "removeQuestion"; question: number }
  | { type: "setQuestionText"; question: number; value: string }
  | { type: "setTimeLimit"; question: number; value: number }
  | { type: "setCorrect"; question: number; choice: number }
  | { type: "addChoice"; question: number }
  | { type: "removeChoice"; question: number; choice: number }
  | { type: "setChoiceText"; question: number; choice: number; value: string };

function blankQuestion(key: number): DraftQuestion {
  return {
    key,
    text: "",
    timeLimit: DEFAULT_TIME_LIMIT,
    correct: 0,
    choices: Array.from({ length: MAX_CHOICES }, (_, i) => ({ key: key + i + 1, text: "" })),
  };
}

const KEYS_PER_QUESTION = MAX_CHOICES + 1;

export function toDraft(quiz?: Quiz): Draft {
  if (!quiz) {
    return { title: "", questions: [blankQuestion(0)], nextKey: KEYS_PER_QUESTION };
  }
  let key = 0;
  const questions = quiz.questions.map((question) => ({
    key: key++,
    text: question.text,
    timeLimit: question.time_limit,
    correct: Math.max(0, question.choices.findIndex((choice) => choice.is_correct)),
    choices: question.choices.map((choice) => ({ key: key++, text: choice.text })),
  }));
  return { title: quiz.title, questions, nextKey: key };
}

export function toPayload(draft: Draft): QuizPayload {
  return {
    title: draft.title,
    questions: draft.questions.map((question) => ({
      text: question.text,
      time_limit: question.timeLimit,
      choices: question.choices.map((choice, index) => ({
        text: choice.text,
        is_correct: index === question.correct,
      })),
    })),
  };
}

function updateQuestion(draft: Draft, index: number, update: (question: DraftQuestion) => DraftQuestion): Draft {
  return { ...draft, questions: draft.questions.map((q, i) => (i === index ? update(q) : q)) };
}

function correctAfterRemoving(correct: number, removed: number): number {
  if (removed === correct) return 0;
  return removed < correct ? correct - 1 : correct;
}

export function draftReducer(draft: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case "setTitle":
      return { ...draft, title: action.value };
    case "addQuestion":
      return {
        ...draft,
        questions: [...draft.questions, blankQuestion(draft.nextKey)],
        nextKey: draft.nextKey + KEYS_PER_QUESTION,
      };
    case "removeQuestion":
      return { ...draft, questions: draft.questions.filter((_, i) => i !== action.question) };
    case "setQuestionText":
      return updateQuestion(draft, action.question, (q) => ({ ...q, text: action.value }));
    case "setTimeLimit":
      return updateQuestion(draft, action.question, (q) => ({ ...q, timeLimit: action.value }));
    case "setCorrect":
      return updateQuestion(draft, action.question, (q) => ({ ...q, correct: action.choice }));
    case "addChoice":
      return {
        ...updateQuestion(draft, action.question, (q) => ({
          ...q,
          choices: [...q.choices, { key: draft.nextKey, text: "" }],
        })),
        nextKey: draft.nextKey + 1,
      };
    case "removeChoice":
      return updateQuestion(draft, action.question, (q) => ({
        ...q,
        correct: correctAfterRemoving(q.correct, action.choice),
        choices: q.choices.filter((_, i) => i !== action.choice),
      }));
    case "setChoiceText":
      return updateQuestion(draft, action.question, (q) => ({
        ...q,
        choices: q.choices.map((c, i) => (i === action.choice ? { ...c, text: action.value } : c)),
      }));
  }
}
