# Plan

A live quiz app, built to practise Kubernetes end to end. The app logic stays simple; the Kubernetes setup is the actual project.

## The app

**Host** (has an account): logs in, builds a quiz, clicks "Host" and gets a 6-character code. The lobby fills with players live. The host starts the game; each question shows with a timer, then the correct answer and the leaderboard, then the next question. It ends on a podium.

**Player** (has an account with a name, username and nickname): enters the code, answers on their phone, sees whether they were right and their rank, and can look back at past games.

### Data model

```
User ─< Quiz ─< Question ─< Choice
Quiz ─< Game ─< Participant ─< Answer >─ Choice
```

A `Game` holds its `code`, `status` (lobby / question / reveal / finished), `question_index` and `question_ends_at`.

**Scoring:** a correct answer earns 500–1000 points, more for answering faster. A wrong or late answer earns 0.

### Pages

`/`, `/login`, `/signup/host`, `/signup/player`, `/quizzes`, `/quizzes/new`, `/quizzes/[id]`, `/host/[code]`, `/play` (enter code), `/play/[code]`, `/history`

### REST API (Django + DRF)

- Auth: register, login, logout, me
- Quiz CRUD
- `POST /games` creates a game and returns its code
- `GET /games/history` lists a player's finished games

Players join by opening the game's WebSocket while it is in the lobby, and the current state arrives over the socket on every (re)connect, so there is no separate join or state endpoint.

### WebSocket: `/ws/games/{code}`

- Host sends `start`, `end_question`, `next`, `cancel`
- Player sends `answer`
- Server sends `state` (a full snapshot on connect and on every change: someone joins, a question starts, the reveal with the correct answer and leaderboard, the final results), `answered` (someone answered), and `error`
- Close codes 4401/4403/4404 mean "not logged in / not allowed / no such game", 4410 means the host cancelled; the client reconnects after any other close

### Where the work happens

A player's answer goes to whichever backend pod holds their WebSocket, which stores it in Postgres. At the end of each question a Celery worker calculates scores and updates the leaderboard in Redis. It then broadcasts the results through Redis to every backend pod, and each pod passes them to its own players.

The backend serves the API and WebSockets from one uvicorn process per pod. Until Redis arrives it must run as a single replica: Channels broadcasts in memory, so players connected to another pod would miss updates.

### Auth

Hosts and players both use Django session cookies. This works because the browser always talks to one origin, and the cookie also rides along on the WebSocket connection, so no JWTs are needed and a player can reconnect after a pod dies.

## Rules that make this work in Kubernetes

1. **No game state in pod memory.** It lives in Postgres and Redis, so any pod can die or scale out without breaking a game.
2. **One backend image, many roles.** The API and WebSocket server (one uvicorn process), Celery worker, CronJobs and the migrate Job all run the same image with a different command.
3. **The browser only talks to one origin.** Frontend and backend sit behind the same address: no CORS, and cookies just work.

## Build order

Each app step unlocks one Kubernetes lesson.

| # | App work | Kubernetes lesson |
|---|---|---|
| 1 | Dockerfiles for backend and frontend | Local cluster with kind, Deployment, Service, ConfigMap/Secret, probes, Postgres StatefulSet + PVC, migrate Job, routing `/` and `/api` through the Gateway API |
| 2 | Auth + quiz CRUD | Rolling updates, requests/limits |
| 3 | Live game over WebSockets, served by the same backend pods (1 replica) | Routing `/ws` through the Gateway, WebSocket upgrade and idle timeouts, why a rollout drops players |
| 4 | Scale the backend to 3 replicas; broadcasts break, so add Redis | Redis in the cluster, pub/sub between pods, why sticky sessions aren't the fix, then autoscaling (HPA) on CPU |
| 5 | Celery: scoring + game-over email to the host | Worker Deployment, scaling on queue length with KEDA |
| 6 | Cleanup of stale games, weekly stats | CronJob |
| 7 | Client reconnect + graceful shutdown | `preStop`, `terminationGracePeriodSeconds`, PodDisruptionBudget |
| 8 | Metric for open connections | Prometheus, autoscaling on connection count |
| 9 | — | Helm or Kustomize, GitHub Actions → GHCR, Argo CD, TLS with cert-manager |

In step 4, don't add Redis up front: run 3 replicas without it and watch half the players miss questions.

Routing uses the **Gateway API** (Envoy Gateway). ingress-nginx was retired in March 2026.

**Out of scope on purpose:** images in questions, teams, quiz sharing, UI polish.
