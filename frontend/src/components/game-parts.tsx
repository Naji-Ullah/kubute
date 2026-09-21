"use client";

import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";

import { formatNumber, plural } from "@/lib/format";
import type { GameChoice, GamePlayer, GameState } from "@/lib/types";

const CHOICE_LETTERS = ["A", "B", "C", "D"];

export function ChoiceLetter({ index }: { index: number }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-current/20 font-mono text-sm">
      {CHOICE_LETTERS[index]}
    </span>
  );
}

/** Takes focus when a new phase of the game appears, so keyboard and screen reader users follow along. */
export function PhaseHeading({ className = "", ...props }: ComponentProps<"h1">) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return <h1 ref={ref} tabIndex={-1} className={`outline-none ${className}`} {...props} />;
}

export function GameMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children ? <div className="mt-4 space-y-6 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Reconnecting({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <p role="status" className="mb-6 rounded-md border border-border px-3 py-2 text-sm text-muted">
      Connection lost. Reconnecting…
    </p>
  );
}

export function QuestionHeader({ game, secondsLeft }: { game: GameState; secondsLeft?: number }) {
  if (!game.question) return null;
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted">
      <span>
        Question {game.question.index + 1} of {game.question_count}
      </span>
      {secondsLeft === undefined ? null : (
        <span role="timer" className="font-mono text-2xl text-foreground tabular-nums">
          {secondsLeft}
        </span>
      )}
    </div>
  );
}

export function ChoiceList({ choices, picked }: { choices: GameChoice[]; picked?: number }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {choices.map((choice, index) => (
        <li
          key={choice.id}
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            choice.correct ? "border-foreground bg-subtle font-medium" : "border-border"
          } ${choice.correct === false ? "text-muted" : ""}`}
        >
          <ChoiceLetter index={index} />
          <span className="min-w-0 flex-1">{choice.text}</span>
          {picked === choice.id ? <span className="text-sm text-muted">Your answer</span> : null}
          {choice.correct ? <span className="text-sm">Correct</span> : null}
          {choice.picks === null ? null : (
            <span className="text-sm text-muted tabular-nums">{plural(choice.picks, "pick")}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

type LeaderboardProps = { players: GamePlayer[]; you?: number | null; limit?: number };

export function Leaderboard({ players, you, limit }: LeaderboardProps) {
  const shown = limit === undefined ? players : players.slice(0, limit);
  return (
    <ol className="divide-y divide-border border-y border-border">
      {shown.map((player) => (
        <li key={player.id} className={`flex items-center gap-4 py-3 ${player.id === you ? "font-semibold" : ""}`}>
          <span className="w-6 font-mono text-sm text-muted tabular-nums">{player.rank}</span>
          <span className="min-w-0 flex-1 truncate">
            {player.nickname}
            {player.id === you ? <span className="font-normal text-muted"> (you)</span> : null}
          </span>
          {player.points ? (
            <span className="text-sm font-normal text-muted tabular-nums">+{formatNumber(player.points)}</span>
          ) : null}
          <span className="tabular-nums">{formatNumber(player.score)}</span>
        </li>
      ))}
    </ol>
  );
}
