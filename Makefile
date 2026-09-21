MANAGE := cd backend && .venv/bin/python manage.py

.PHONY: setup db up down db-reset migrate superuser backend frontend test

setup:
	python3 -m venv backend/.venv
	backend/.venv/bin/pip install -r backend/requirements-dev.txt
	test -f backend/.env || sed "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$$(openssl rand -hex 32)|" backend/.env.example > backend/.env
	test -f frontend/.env.local || cp frontend/.env.example frontend/.env.local
	cd frontend && npm install

db:
	docker compose up -d --wait postgres

up:
	docker compose --profile app up -d --build --wait

down:
	docker compose --profile app down

db-reset:
	docker compose --profile app down -v

migrate:
	$(MANAGE) migrate

superuser:
	$(MANAGE) createsuperuser

backend:
	cd backend && .venv/bin/uvicorn config.asgi:application --lifespan off --reload --reload-exclude .venv

frontend:
	cd frontend && npm run dev

test:
	$(MANAGE) test
