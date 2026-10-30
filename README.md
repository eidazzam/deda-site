# Deda — Premium Egyptian Fashion

eCommerce platform for Deda, a Cairo-based fashion label.

## Stack

- **Frontend** — Next.js 15 (App Router) · TypeScript · Tailwind · Zustand · Framer Motion
- **Backend** — Fastify · TypeScript · Prisma
- **Database** — PostgreSQL 16
- **Infra** — Docker Compose · Nginx (reverse proxy + static uploads)

## Repo layout

```
.
├── frontend/           Next.js application
├── backend/            Fastify API + Prisma
├── nginx/              Nginx config (production)
├── scripts/            Backup, deploy, and utility scripts
├── docker-compose.yml  Production orchestration
├── .env.example        Environment variables template
└── legacy-snapshot/    Previous single-file build, kept locally (gitignored)
```

## Quick start (local development)

```bash
# 1. Copy env file
cp .env.example .env
# edit .env and set the passwords/secrets

# 2. Start the database
docker compose up -d postgres

# 3. Install backend deps and run migrations
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run dev    # API on http://localhost:3001

# 4. In another terminal, run the frontend
cd frontend
npm install
npm run dev    # Web on http://localhost:3000
```

## Production deployment

See `scripts/deploy.md` (added in Phase 8).

Live: `https://dedawomenswear.shop`

## Conventions

- Single language per commit message — English, lowercase, imperative
- All amounts in EGP
- Image naming: `products/{slug}/{color}-{index}.webp`
- API responses use `{ data, error }` envelope
