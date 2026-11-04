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

## Coach practice during UAT

The full two-repository macOS and Windows setup is in the [Budget Buddy UAT guide](https://github.com/Zurusfig/b-buddy/blob/feat/routed-coach-personas/docs/UAT_SETUP.md).

With Budget Buddy connected, sign in to a demo persona and open `http://localhost:3000/?uat=1`.
Open **Ask Buddy** and choose **Practice** to try prompts against that account's real transactions.
The chat shows the normal reply and **How I got this** receipt. Practice questions are logged with
the authenticated persona but no UAT task ID. They appear as **Free question** in the report's Run
explorer and do not count toward its grades or recorded UAT statistics. Switch to **Recorded UAT**
for official tasks; choosing a mode starts a fresh chat and clears the selected task.

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
