"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { isRecord } from "./api";
import type { GameMove, GameState } from "./types";

type ServerMessage =
  | { type: "state"; game: GameState; you: number | null }
  | { type: "answered"; player: number }
  | { type: "error"; message: string };

type Session = {
  game: GameState | null;
  you: number | null;
  clockOffset: number;
  error?: string;
};

const INITIAL_SESSION: Session = { game: null, you: null, clockOffset: 0 };

function sessionReducer(session: Session, message: ServerMessage & { receivedAt: number }): Session {
  switch (message.type) {
    case "state":
      return {
        game: message.game,
        you: message.you,
        clockOffset: Date.parse(message.game.server_time) - message.receivedAt,
      };
    case "answered": {
      if (!session.game) return session;
      const players = session.game.players.map((p) => (p.id === message.player ? { ...p, answered: true } : p));
      return { ...session, game: { ...session.game, players } };
    }
    case "error":
      return { ...session, error: message.message };
    default:
      // A newer server may send messages this build doesn't know yet (e.g. during a rolling deploy).
      return session;
  }
}

function parseMessage(data: string): ServerMessage | null {
  try {
    const message: unknown = JSON.parse(data);
    return isRecord(message) && typeof message.type === "string" ? (message as ServerMessage) : null;
  } catch {
    return null;
  }
}

// Application close codes from the server; anything else is a dropped connection worth retrying.
const CLOSE_REASONS: Record<number, string> = {
  4401: "Log in to join this game.",
  4403: "You can’t join this game. It may have already started.",
  4404: "There’s no game with that code.",
  4410: "The host cancelled this game.",
};
const RETRY_DELAYS_MS = [1000, 2000, 5000, 10000];

export function useGame(code: string) {
  const [session, dispatch] = useReducer(sessionReducer, INITIAL_SESSION);
  const [connected, setConnected] = useState(false);
  const [closedReason, setClosedReason] = useState<string>();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let socket: WebSocket;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let disposed = false;

    function connect() {
      const scheme = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${scheme}://${window.location.host}/ws/games/${encodeURIComponent(code)}`);
      socketRef.current = socket;
      socket.onopen = () => {
        if (disposed) return;
        attempts = 0;
        setConnected(true);
      };
      socket.onmessage = (event: MessageEvent<string>) => {
        const message = parseMessage(event.data);
        if (disposed || !message) return;
        dispatch({ ...message, receivedAt: Date.now() });
      };
      socket.onclose = (event) => {
        if (disposed) return;
        setConnected(false);
        if (event.code >= 4000) {
          setClosedReason(CLOSE_REASONS[event.code] ?? "This game is no longer available.");
          return;
        }
        retryTimer = setTimeout(connect, RETRY_DELAYS_MS[Math.min(attempts++, RETRY_DELAYS_MS.length - 1)]);
      };
    }

    connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      socket.close();
    };
  }, [code]);

  /** Returns false when the move couldn't be sent because the connection is down. */
  const send = useCallback((move: GameMove): boolean => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(move));
    return true;
  }, []);

  return { ...session, connected, closedReason, send };
}

export function useSecondsLeft(endsAt: string | undefined, clockOffset: number): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!endsAt) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((Date.parse(endsAt) - clockOffset - now) / 1000));
}
