# Plan

A live quiz app, built to practise Kubernetes end to end. The app logic stays simple; the Kubernetes setup is the actual project.

## The app

**Host** (has an account): logs in, builds a quiz, clicks "Host" and gets a 6-character code. The lobby fills with players live. The host starts the game; each question shows with a timer, then the correct answer and the leaderboard, then the next question. It ends on a podium.

**Player** (no account): enters the code and a nickname, answers on their phone, and sees whether they were right and their rank.

### Data model

```
User ─< Quiz ─< Question ─< Choice
Quiz ─< Game ─< Player ─< Answer >─ Choice
```

A `Game` holds its `code`, `status` (lobby / question / reveal / finished), `current_question` and `question_ends_at`.

**Scoring:** a correct answer earns 500–1000 points, more for answering faster. A wrong or late answer earns 0.

### Pages

`/` (enter code), `/login`, `/quizzes`, `/quizzes/new`, `/quizzes/[id]`, `/host/[code]`, `/play/[code]`

### REST API (Django + DRF)

- Auth: register, login, logout, me
- Quiz CRUD
- `POST /games` creates a game, `POST /games/{code}/join` joins one, `GET /games/{code}` returns current state (used after a refresh or reconnect)

### WebSocket: `/ws/games/{code}`

- Host sends `start`, `end_question`, `next`
- Player sends `answer`
- Server sends `player_joined`, `question_started`, `question_ended` (correct answer + leaderboard), `game_finished`

### Where the work happens

A player's answer goes to a WebSocket pod, which stores it in Postgres. At the end of each question a Celery worker calculates scores and updates the leaderboard in Redis. It then broadcasts the results through Redis to every WebSocket pod, and each pod passes them to its own players.

### Auth

Hosts use Django session cookies. This works because the browser always talks to one origin, and the cookie also rides along on the WebSocket connection, so no JWTs are needed. Players get a token in an httpOnly cookie when they join, which lets them reconnect after a pod dies.

## Rules that make this work in Kubernetes

1. **No game state in pod memory.** It lives in Postgres and Redis, so any pod can die or scale out without breaking a game.
2. **One backend image, many roles.** API, WebSocket server, Celery worker, CronJobs and the migrate Job all run the same image with a different command.
3. **The browser only talks to one origin.** Frontend and backend sit behind the same address: no CORS, and cookies just work.

## Build order

Each app step unlocks one Kubernetes lesson.

| # | App work | Kubernetes lesson |
|---|---|---|
| 1 | Dockerfiles for backend and frontend | Local cluster with kind, Deployment, Service, ConfigMap/Secret, probes, Postgres StatefulSet + PVC, migrate Job, routing `/` and `/api` through the Gateway API |
| 2 | Auth + quiz CRUD | Rolling updates, requests/limits, autoscaling (HPA) on CPU |
| 3 | Live game over WebSockets, 1 replica | Separate WebSocket Deployment, WebSocket upgrade and idle timeouts at the Gateway |
| 4 | Scale WebSockets to 3 replicas; broadcasts break, so add Redis | Redis in the cluster, pub/sub between pods, why sticky sessions aren't the fix |
| 5 | Celery: scoring + game-over email to the host | Worker Deployment, scaling on queue length with KEDA |
| 6 | Cleanup of stale games, weekly stats | CronJob |
| 7 | Client reconnect + graceful shutdown | `preStop`, `terminationGracePeriodSeconds`, PodDisruptionBudget |
| 8 | Metric for open connections | Prometheus, autoscaling on connection count |
| 9 | — | Helm or Kustomize, GitHub Actions → GHCR, Argo CD, TLS with cert-manager |

In step 4, don't add Redis up front: run 3 replicas without it and watch half the players miss questions.

Routing uses the **Gateway API** (Envoy Gateway). ingress-nginx was retired in March 2026.

**Out of scope on purpose:** images in questions, teams, quiz sharing, UI polish.
