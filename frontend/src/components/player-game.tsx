"use client";

import { useState } from "react";

import { ButtonLink } from "@/components/button";
import { FormError } from "@/components/field";
import {
  ChoiceLetter,
  ChoiceList,
  GameMessage,
  Leaderboard,
  PhaseHeading,
  QuestionHeader,
  Reconnecting,
} from "@/components/game-parts";
import { formatNumber, ordinal, plural } from "@/lib/format";
import type { GamePlayer, GameQuestion, GameState } from "@/lib/types";
import { useGame, useSecondsLeft } from "@/lib/use-game";

type Pick = { question: number; choice: number };

export function PlayerGame({ code }: { code: string }) {
  const { game, you, error, connected, closedReason, clockOffset, send } = useGame(code);
  const [pick, setPick] = useState<Pick>();
  const question = game?.status === "question" ? game.question : null;
  const secondsLeft = useSecondsLeft(question?.ends_at, clockOffset);

  if (closedReason) {
    return (
      <GameMessage title="Game closed">
        <p>{closedReason}</p>
        <ButtonLink href="/play">Join another game</ButtonLink>
      </GameMessage>
    );
  }
  if (!game) return <GameMessage title="Joining…" />;

  const me = game.players.find((player) => player.id === you);
  const picked = pick && pick.question === game.question?.index ? pick.choice : undefined;
  const answered = picked !== undefined || Boolean(me?.answered);
  const revealed = game.status === "reveal" ? game.question : null;

  function answer(choice: number) {
    if (question && send({ type: "answer", question: question.index, choice })) {
      setPick({ question: question.index, choice });
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-12">
      <Reconnecting connected={connected} />
      <FormError message={error} />
      {game.status === "lobby" ? <PlayerLobby game={game} me={me} /> : null}
      {question ? (
        <PlayerQuestion
          game={game}
          question={question}
          secondsLeft={secondsLeft}
          picked={picked}
          answered={answered}
          locked={!connected || answered || secondsLeft === 0}
          onAnswer={answer}
        />
      ) : null}
      {revealed ? <PlayerReveal game={game} question={revealed} me={me} picked={picked} /> : null}
      {game.status === "finished" ? <PlayerResults game={game} me={me} /> : null}
    </div>
  );
}

function PlayerLobby({ game, me }: { game: GameState; me?: GamePlayer }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-muted">{game.quiz_title}</p>
      <PhaseHeading className="mt-2 text-3xl font-semibold tracking-tight">You’re in</PhaseHeading>
      <p className="mt-4 text-muted">
        Playing as <span className="font-medium text-foreground">{me?.nickname}</span>. The game starts when the
        host is ready.
      </p>
      <p aria-live="polite" className="mt-8 text-sm text-muted">
        {plural(game.players.length, "player")} in the lobby
      </p>
    </div>
  );
}

type PlayerQuestionProps = {
  game: GameState;
  question: GameQuestion;
  secondsLeft: number;
  picked?: number;
  answered: boolean;
  locked: boolean;
  onAnswer: (choice: number) => void;
};

function PlayerQuestion({ game, question, secondsLeft, picked, answered, locked, onAnswer }: PlayerQuestionProps) {
  let status = "";
  if (answered) status = "Answer locked in. Waiting for the others…";
  else if (secondsLeft === 0) status = "Time’s up.";

  return (
    <>
      <QuestionHeader game={game} secondsLeft={secondsLeft} />
      <PhaseHeading id="question-text" className="mt-6 text-2xl font-semibold tracking-tight text-balance">
        {question.text}
      </PhaseHeading>
      <div role="group" aria-labelledby="question-text" className="mt-8 grid gap-3">
        {question.choices.map((choice, index) => (
          <button
            key={choice.id}
            type="button"
            disabled={locked}
            aria-pressed={picked === choice.id}
            onClick={() => onAnswer(choice.id)}
            className={`flex min-h-16 items-center gap-3 rounded-lg border p-4 text-left transition disabled:cursor-default ${
              picked === choice.id
                ? "border-foreground bg-foreground text-background"
                : "border-border enabled:hover:bg-subtle disabled:opacity-50"
            }`}
          >
            <ChoiceLetter index={index} />
            <span>{choice.text}</span>
          </button>
        ))}
      </div>
      <p role="status" className="mt-6 min-h-5 text-center text-sm text-muted">
        {status}
      </p>
    </>
  );
}

type PlayerRevealProps = { game: GameState; question: GameQuestion; me?: GamePlayer; picked?: number };

function PlayerReveal({ game, question, me, picked }: PlayerRevealProps) {
  const points = me?.points ?? 0;
  let result = "No answer";
  if (me?.answered) result = points > 0 ? "Correct" : "Not quite";

  return (
    <>
      <QuestionHeader game={game} />
      <div className="mt-6 rounded-lg border border-border px-6 py-10 text-center">
        <PhaseHeading className="text-3xl font-semibold tracking-tight">{result}</PhaseHeading>
        <p className="mt-2 text-muted">{points > 0 ? `+${formatNumber(points)} points` : "No points this round"}</p>
        {me ? (
          <p className="mt-6 text-sm">
            You’re {ordinal(me.rank)} with {formatNumber(me.score)} points
          </p>
        ) : null}
      </div>
      <h2 className="mt-10 font-medium">{question.text}</h2>
      <div className="mt-4">
        <ChoiceList choices={question.choices} picked={picked} />
      </div>
    </>
  );
}

function PlayerResults({ game, me }: { game: GameState; me?: GamePlayer }) {
  return (
    <>
      <div className="text-center">
        <p className="text-sm text-muted">{game.quiz_title}</p>
        <PhaseHeading className="mt-2 text-3xl font-semibold tracking-tight">
          {me ? `You finished ${ordinal(me.rank)}` : "Game over"}
        </PhaseHeading>
        {me ? (
          <p className="mt-2 text-muted">
            {formatNumber(me.score)} points · {plural(game.players.length, "player")}
          </p>
        ) : null}
      </div>
      <div className="mt-10">
        <Leaderboard players={game.players} you={me?.id} />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/history">Your history</ButtonLink>
        <ButtonLink href="/play" variant="secondary">
          Join another game
        </ButtonLink>
      </div>
    </>
  );
}
