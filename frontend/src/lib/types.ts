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
  is_played: boolean;
  updated_at: string;
};

export type Choice = { id: number; text: string; is_correct: boolean };

export type Question = { id: number; text: string; time_limit: number; choices: Choice[] };

export type Quiz = {
  id: number;
  title: string;
  questions: Question[];
  is_played: boolean;
  created_at: string;
  updated_at: string;
};

export type HistoryEntry = {
  id: number;
  game_code: string;
  quiz_title: string;
  finished_at: string;
  score: number;
  correct_answers: number;
  final_rank: number | null;
  player_count: number;
  question_count: number;
};
