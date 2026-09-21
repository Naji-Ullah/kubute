# Kubute

A live quiz app, built as a Kubernetes playground. Next.js + Tailwind frontend, Django + DRF backend, Postgres.

## Setup

Needs Docker, Node 20.9+ and Python 3.12+.

```bash
make setup      # venv + deps, backend/.env (random secret key), frontend/.env.local
make db         # Postgres on localhost:5432
make migrate
make superuser  # optional, for /admin
```

## Run

```bash
make backend    # http://localhost:8000 (API and WebSockets)
make frontend   # http://localhost:3000
```

Open http://localhost:3000. Hosts sign up at `/signup/host`, players at `/signup/player`, and everyone logs in at `/login`.

To play: a host builds a quiz at `/quizzes`, opens it and clicks **Host game** to get a 6-character code. Players go to **Play**, enter the code and wait in the lobby until the host starts. Each question has a timer; faster right answers score more. Finished games show up in each player's `/history`. `/status` shows whether Django and Postgres are reachable.

To try it alone, use two browsers (or a normal and a private window): one logged in as the host, one as a player.

| Command | What it does |
| --- | --- |
| `make up` | Run the whole stack from the production images behind a gateway on http://localhost:8080 |
| `make down` | Stop all containers (data kept in a volume) |
| `make db-reset` | Stop all containers and delete the database |
| `make test` | Run backend tests |

## Postgres in DBeaver

New connection → PostgreSQL:

| Field | Value |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| Database | `kubute` |
| Username | `kubute` |
| Password | `kubute` |

## How it fits together

```
browser ──> gateway ──/api, /admin, /static──> Django API (gunicorn) ──> Postgres
                   ├─/ws───────────────────> Django WebSockets (daphne) ──> Postgres
                   └─everything else───────> Next.js ──(server components)──> Django API
```

- The browser only ever calls `/api/...` on its own origin. In `npm run dev` a Next.js rewrite forwards it to Django; under `make up` the Caddy gateway does; in the cluster the Gateway API does.
- Auth is Django sessions: an httpOnly session cookie plus CSRF protection. Server components forward the session cookie when they call Django.
- Server components call Django directly using `API_URL`, which becomes the in-cluster Service URL.
- All backend config comes from environment variables (`backend/.env` locally, a ConfigMap/Secret in the cluster). The `POSTGRES_*` names match the official Postgres image, so one Secret can feed both.
- Live games run over a WebSocket at `/ws/games/{code}` (Django Channels). Every move goes through `games/services.py`, which locks the game row and stores the result in Postgres, so a restarted server loses nothing. The host's browser is the game clock: when time runs out it ends the question, so the server never holds a timer in memory.
- There is one WebSocket server for now, so Channels broadcasts in memory. A second replica will need Redis (PLAN.md step 4).
- `/api/health/live` is for the liveness probe and `/api/health/ready` for the readiness probe (it checks Postgres).

```
backend/
  Dockerfile  production image: gunicorn for the API, daphne for WebSockets, static files via WhiteNoise
  config/     settings, urls, wsgi/asgi
  core/       health endpoints
  users/      User model (host/player roles), auth API under /api/auth
  quizzes/    quiz builder API under /api/quizzes (hosts only; played quizzes are read-only)
  games/      live games: POST /api/games, WebSocket /ws/games/{code}, rules in services.py; history at /api/games/history
frontend/
  Dockerfile       production image (Next standalone server)
  src/lib/         API clients (browser: CSRF; server: forwards cookies), auth helpers
  src/lib/use-game.ts  WebSocket hook: game state, reconnects, synced countdown
  next.config.ts   dev-only /api and /ws rewrites, standalone output
gateway/
  Caddyfile        local stand-in for the cluster Gateway routes
```
