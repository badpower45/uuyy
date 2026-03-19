# Backend Deployment Checklist

## Pre-Deployment (Local)
- [ ] Clone repository
- [ ] `pnpm install`
- [ ] Copy `.env.example` to `.env.local`
- [ ] Update `DATABASE_URL` in `.env.local`
- [ ] `./run-migrations.sh` (or Drizzle push)
- [ ] `pnpm --filter @workspace/scripts run seed` (optional: demo data)
- [ ] `pnpm run typecheck` (all packages)
- [ ] `pnpm --filter @workspace/api-server run dev` (test locally)

## Supabase Setup
- [ ] Create Supabase project
- [ ] Copy PostgreSQL connection string
- [ ] Update timezone to UTC/Africa/Cairo
- [ ] Copy Project URL & Anon Key
- [ ] Whitelist Vercel IP if needed

## Vercel Deployment
- [ ] Link GitHub repository to Vercel
- [ ] Import project as "Other"
- [ ] Override build command: `pnpm run typecheck && pnpm run build && pnpm --filter @workspace/api-server run build`
- [ ] Override start command: `node artifacts/api-server/dist/index.cjs`
- [ ] Add environment variables:
  - `DATABASE_URL` (Supabase connection)
  - `NODE_ENV` = production
  - `PORT` = 8000
- [ ] Deploy
- [ ] Test `/api/health` endpoint

## Post-Deployment
- [ ] Verify API health check works
- [ ] Check logs for errors
- [ ] Monitor connection pool usage (Supabase dashboard)
- [ ] Test key endpoints from web/mobile
- [ ] Setup monitoring/alerts (optional)

## Frontend Integration
- [ ] Update web app `.env` with API_BASE_URL
- [ ] Update mobile app `.env` with API_BASE_URL
- [ ] Test driver app can reach API
- [ ] Test web portals can reach API

## Monitoring
- [ ] Vercel Logs dashboard
- [ ] Supabase Query Performance
- [ ] Database connection count
- [ ] Error rates
