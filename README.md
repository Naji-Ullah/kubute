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
make backend    # http://localhost:8000
make frontend   # http://localhost:3000
```

Open http://localhost:3000. It shows whether Django and Postgres are reachable.

| Command | What it does |
| --- | --- |
| `make up` | Run the whole stack from the production images (same images Kubernetes will run) |
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
browser ──> Next.js :3000 ──/api/*──> Django :8000 ──> Postgres :5432
```

- The browser only ever calls `/api/...` on its own origin. In `npm run dev` a Next.js rewrite forwards that to Django; in the cluster the Gateway does it instead, so production builds don't include the rewrite.
- Server components call Django directly using `API_URL`, which becomes the in-cluster Service URL.
- All backend config comes from environment variables (`backend/.env` locally, a ConfigMap/Secret in the cluster). The `POSTGRES_*` names match the official Postgres image, so one Secret can feed both.
- `/api/health/live` is for the liveness probe and `/api/health/ready` for the readiness probe (it checks Postgres).

```
backend/
  Dockerfile  production image (gunicorn, static files via WhiteNoise)
  config/     settings, urls, wsgi/asgi
  core/       health endpoints
  users/      custom User model
frontend/
  Dockerfile       production image (Next standalone server)
  src/lib/api.ts   fetch helper (server vs browser base URL)
  next.config.ts   dev-only /api rewrite, standalone output
```
