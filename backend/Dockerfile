# syntax=docker/dockerfile:1

FROM python:3.14-slim-trixie AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /opt/venv
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    /opt/venv/bin/pip install -r requirements.txt


FROM python:3.14-slim-trixie

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --no-create-home app

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY . .

# Settings require these at import time; collectstatic never connects to the database.
RUN DJANGO_SECRET_KEY=collectstatic POSTGRES_DB=_ POSTGRES_USER=_ POSTGRES_PASSWORD=_ \
    python manage.py collectstatic --noinput

USER app
EXPOSE 8000
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--lifespan", "off", "--timeout-graceful-shutdown", "30"]
