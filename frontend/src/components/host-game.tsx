"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/button";
import { FormError } from "@/components/field";
import {
  ChoiceList,
  GameMessage,
  Leaderboard,
  PhaseHeading,
  QuestionHeader,
  Reconnecting,
} from "@/components/game-parts";
import { plural } from "@/lib/format";
import type { GameQuestion, GameState } from "@/lib/types";
import { useGame, useSecondsLeft } from "@/lib/use-game";

export function HostGame({ code }: { code: string }) {
  const router = useRouter();
  const { game, error, connected, closedReason, clockOffset, send } = useGame(code);
  const question = game?.status === "question" ? game.question : null;
  const secondsLeft = useSecondsLeft(question?.ends_at, clockOffset);
  const timeUp = question !== null && secondsLeft === 0;

  // The host's screen is the game clock: nothing on the server waits in memory for time to run out.
  useEffect(() => {
    if (question && timeUp) send({ type: "end_question", question: question.index });
  }, [question, timeUp, send]);

  if (closedReason) {
    return (
      <GameMessage title="Game closed">
        <p>{closedReason}</p>
        <ButtonLink href="/quizzes">Back to quizzes</ButtonLink>
      </GameMessage>
    );
  }
  if (!game) return <GameMessage title="Connecting…" />;
  const revealed = game.status === "reveal" ? game.question : null;

  function cancel() {
    if (send({ type: "cancel" })) router.push("/quizzes");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Reconnecting connected={connected} />
      <FormError message={error} />
      {game.status === "lobby" ? (
        <HostLobby game={game} onStart={() => send({ type: "start" })} onCancel={cancel} />
      ) : null}
      {question ? (
        <HostQuestion
          game={game}
          question={question}
          secondsLeft={secondsLeft}
          onEnd={() => send({ type: "end_question", question: question.index })}
        />
      ) : null}
      {revealed ? (
        <HostReveal game={game} question={revealed} onNext={() => send({ type: "next", question: revealed.index })} />
      ) : null}
      {game.status === "finished" ? <HostResults game={game} /> : null}
    </div>
  );
}

type HostLobbyProps = { game: GameState; onStart: () => void; onCancel: () => void };

function HostLobby({ game, onStart, onCancel }: HostLobbyProps) {
  return (
    <>
      <PhaseHeading className="text-sm text-muted">{game.quiz_title}</PhaseHeading>
      <div className="mt-4 rounded-lg border border-border px-6 py-12 text-center">
        <p className="text-sm text-muted">Players join under Play with this code</p>
        <p className="mt-3 font-mono text-5xl font-semibold tracking-[0.25em] sm:text-7xl">{game.code}</p>
      </div>
      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="font-medium">{plural(game.players.length, "player")}</h2>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={game.players.length === 0} onClick={onStart}>
            Start game
          </Button>
        </div>
      </div>
      <div aria-live="polite" className="mt-4">
        {game.players.length === 0 ? (
          <p className="text-sm text-muted">Waiting for players to join…</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {game.players.map((player) => (
              <li key={player.id} className="rounded-full border border-border px-3 py-1 text-sm">
                {player.nickname}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

type HostQuestionProps = { game: GameState; question: GameQuestion; secondsLeft: number; onEnd: () => void };

function HostQuestion({ game, question, secondsLeft, onEnd }: HostQuestionProps) {
  const answered = game.players.filter((player) => player.answered).length;
  return (
    <>
      <QuestionHeader game={game} secondsLeft={secondsLeft} />
      <PhaseHeading className="mt-6 text-3xl font-semibold tracking-tight text-balance">{question.text}</PhaseHeading>
      <div className="mt-8">
        <ChoiceList choices={question.choices} />
      </div>
      <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
        <p aria-live="polite" className="text-sm text-muted">
          {answered} of {plural(game.players.length, "player")} answered
        </p>
        <Button type="button" variant="secondary" onClick={onEnd}>
          End question
        </Button>
      </div>
    </>
  );
}

type HostRevealProps = { game: GameState; question: GameQuestion; onNext: () => void };

function HostReveal({ game, question, onNext }: HostRevealProps) {
  const isLast = question.index + 1 >= game.question_count;
  return (
    <>
      <QuestionHeader game={game} />
      <PhaseHeading className="mt-6 text-3xl font-semibold tracking-tight text-balance">{question.text}</PhaseHeading>
      <div className="mt-8">
        <ChoiceList choices={question.choices} />
      </div>
      <h2 className="mt-12 font-medium">Leaderboard</h2>
      <div className="mt-3">
        <Leaderboard players={game.players} limit={5} />
      </div>
      <div className="mt-8 flex justify-end">
        <Button type="button" onClick={onNext}>
          {isLast ? "Show results" : "Next question"}
        </Button>
      </div>
    </>
  );
}

function HostResults({ game }: { game: GameState }) {
  return (
    <>
      <p className="text-sm text-muted">{game.quiz_title}</p>
      <PhaseHeading className="mt-2 text-3xl font-semibold tracking-tight">Final results</PhaseHeading>
      <div className="mt-8">
        <Leaderboard players={game.players} />
      </div>
      <div className="mt-8">
        <ButtonLink href="/quizzes">Back to quizzes</ButtonLink>
      </div>
    </>
  );
}
