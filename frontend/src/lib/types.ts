export type Role = "host" | "player";

export type User = {
  id: number;
  username: string;
  name: string;
  nickname: string;
  role: Role;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type QuizSummary = {
  id: number;
  title: string;
  question_count: number;
  updated_at: string;
};

export type Choice = { id: number; text: string; is_correct: boolean };

export type Question = { id: number; text: string; time_limit: number; choices: Choice[] };

export type Quiz = {
  id: number;
  title: string;
  questions: Question[];
  created_at: string;
  updated_at: string;
};
