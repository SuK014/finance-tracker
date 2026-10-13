.PHONY: help install dev dev-api dev-web build build-api build-web start lint test test-e2e check migrate

help:
	@echo make install   - npm install in frontend and backend
	@echo make dev       - run API (:3001) and web (:3000) together
	@echo make build     - production build of both
	@echo make start     - run the production builds
	@echo make test      - lint + typecheck + build + Playwright e2e
	@echo make migrate   - apply Prisma migrations to DATABASE_URL

install:
	npm --prefix backend install
	npm --prefix frontend install

# Run with -j2 so both servers start in parallel
dev:
	$(MAKE) -j2 dev-api dev-web

dev-api:
	npm --prefix backend run dev

dev-web:
	npm --prefix frontend run dev

build: build-api build-web

build-api:
	npm --prefix backend run build

build-web:
	npm --prefix frontend run build

start:
	$(MAKE) -j2 start-api start-web

start-api:
	npm --prefix backend run start

start-web:
	npm --prefix frontend run start

lint:
	npm --prefix frontend run lint

check:
	cd backend && npx tsc --noEmit
	cd frontend && npx tsc --noEmit

test-e2e:
	cd frontend && npx playwright test

test: check build test-e2e

migrate:
	cd backend && npx prisma migrate deploy
