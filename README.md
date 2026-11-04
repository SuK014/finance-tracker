# NgernTong

Personal finance tracker: transactions, accounts, portfolio, net worth, goals and subscriptions.
Next.js web app (`frontend/`) plus an Express + Prisma API (`backend/`) on PostgreSQL.

## Setup

You need **Node 22**, **make** (Git Bash on Windows works) and a **PostgreSQL** database.
A free [Supabase](https://supabase.com) or [Neon](https://neon.tech) project is the quickest option.

```sh
git clone https://github.com/SuK014/finance-tracker.git
cd finance-tracker
make setup        # installs both apps and creates backend/.env and frontend/.env.local
```

Then edit `backend/.env`:

- `DATABASE_URL`: your Postgres connection string
- `JWT_SECRET`: any long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `GEMINI_API_KEY` (optional): only needed for e-slip scanning and voice entry

```sh
make migrate      # creates the tables
make dev          # API on :3001, web on :3000
```

Open http://localhost:3000 and sign up. Each account only sees its own data.

To open it from a phone on the same Wi-Fi, set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to
`http://<computer-LAN-IP>:3001` and add `http://<computer-LAN-IP>:3000` to `CORS_ORIGIN` in `backend/.env`.

## Commands

| Command | What it does |
| --- | --- |
| `make setup` | First-time setup (install + env files) |
| `make migrate` | Apply database migrations |
| `make dev` | Run API and web together |
| `make build` / `make start` | Production build / run it |
| `make test` | Typecheck, build and Playwright e2e tests |

## Notes

- Dates are stored as real moments and shown in Thai time (UTC+7).
- Never commit `.env` files; they are git-ignored. Use the `.env.example` files as the reference.
