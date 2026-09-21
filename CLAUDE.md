# Kubute

Live quiz app (Kahoot-style) built as a Kubernetes learning project. The app stays simple; the Kubernetes setup is the real project. The roadmap is in [PLAN.md](PLAN.md).

Stack: Next.js 16 + Tailwind v4 (`frontend/`), Django 6.1 + DRF (`backend/`), Postgres 17. Redis, Celery and Django Channels come in later phases.

## Commands

```bash
make db                    # Postgres in Docker
make migrate               # apply migrations
make backend               # Django dev server :8000
make frontend              # Next dev server :3000
make test                  # backend tests (real Postgres)
make up / make down        # production images behind the gateway on :8080 / stop everything
cd frontend && npm run lint && npx tsc --noEmit
```

## Project rules

These override generic advice in the skills below when they conflict.

- **One settings file, configured by env vars.** `backend/config/settings.py` reads everything via `django-environ`. No `settings/dev.py` / `prod.py` split: the same image runs everywhere with different env.
- **Logs go to stdout.** Never log to files.
- **Tests run against real Postgres**, not SQLite.
- **API URLs have no trailing slash** (`/api/health/ready`). Use `DefaultRouter(trailing_slash=False)` for DRF routers.
- **No state in process memory.** Game state lives in Postgres or Redis so any pod can die or scale.
- **One backend image, many roles.** API, WebSocket server, Celery worker, migrate Job and CronJobs all use the same image with a different command.
- **The browser only calls same-origin `/api/...`.** In dev a Next rewrite forwards `/api`; the Caddy gateway (`make up`) and the cluster Gateway route `/api`, `/admin` and `/static` to Django and everything else to Next. Server components call Django through `API_URL`. Never expose the API URL through `NEXT_PUBLIC_*`.
- **Auth is Django sessions.** httpOnly session cookie, CSRF header on every unsafe request (`clientApi` handles it). Never store credentials in `localStorage`.
- **Scheduled work runs as Kubernetes CronJobs** that call management commands, not Celery Beat.
- **Cluster routing uses the Gateway API.** ingress-nginx is retired; don't add Ingress manifests for it.
- **Images:** multi-stage, non-root, pinned base image tags, no secrets in layers.
- **Current versions win.** Skills may show older APIs (e.g. `CheckConstraint(check=)` is now `condition=`; Next 16 uses `proxy.ts`, not `middleware.ts`). For Next.js, check `frontend/node_modules/next/dist/docs/`.

## Skills: use them every time you touch these areas

| Area | Skills |
|---|---|
| Django models, views, DRF | `django-patterns`, `django-security` |
| Backend tests | `django-tdd` |
| Celery tasks | `django-celery` |
| React components, Next.js pages | `react-patterns`, `vercel-react-best-practices`, `nextjs-turbopack` |
| Dockerfiles, Compose | `docker-patterns` |
| Kubernetes manifests | `kubernetes-patterns` |
| Schema, queries, indexes | `postgres-patterns` |
| Redis, pub/sub, leaderboards | `redis-patterns` |

## Before finishing a change

1. Run the checks: `make test` for backend changes; `npm run lint` and `npx tsc --noEmit` for frontend changes.
2. Run the matching reviewer agents on the diff and fix every CRITICAL and HIGH finding:
   - `.py` changes: `django-reviewer` and `python-reviewer`
   - `.ts` / `.tsx` changes: `typescript-reviewer`, plus `react-reviewer` for `.tsx`
3. If Django setup, migrations or dependencies break, use `django-build-resolver`.

Skills and agents in `.claude/` are from github.com/MHassan0000/Skills, copied from commit a4404a75.
