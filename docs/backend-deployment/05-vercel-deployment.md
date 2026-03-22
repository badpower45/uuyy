# 05) Vercel Deployment Guide

## Prerequisites
- Vercel account (https://vercel.com)
- GitHub repo linked
- Supabase project ready + DATABASE_URL

## Step 1: Create Vercel Project
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Select: **Other**
5. Click "Deploy"

## Step 2: Configure Build & Start

In Vercel Settings:

### Build Command
```bash
pnpm run typecheck && pnpm run build && pnpm --filter @workspace/api-server run build
```

### Start Command
```bash
node artifacts/api-server/dist/index.cjs
```

### Output Directory
```
artifacts/api-server/dist
```

### Install Command
```bash
pnpm install --frozen-lockfile
```

## Step 3: Add Environment Variables
Go to Settings → Environment Variables

Add:
- `DATABASE_URL` = your Supabase connection string
- `NODE_ENV` = `production`
- `PORT` = `8000`

## Step 4: Deploy
Click "Deploy" and wait for build to complete.

## Monitoring
After deployment:
1. Check Logs (Functions tab)
2. Test endpoint: `https://[PROJECT-NAME].vercel.app/api/health`
3. Should return: `{ "status": "ok" }`

## Troubleshooting

### Build fails: "DATABASE_URL not set"
- Add DATABASE_URL to Environment Variables
- Rebuild project

### 502 Bad Gateway
- Check logs for crashes
- Verify DATABASE_URL is correct
- Check PostgreSQL connection pool usage

### "Cannot find module"
- Check all dependencies are in package.json
- Ensure `@workspace/db` is listed in api-server dependencies
- Rebuild: clear cache in Vercel Settings

## Previews & Production
- Vercel creates automatic preview deployments on PRs
- Production = main branch deployments
- Each deployment gets unique URL

## Custom Domain
1. Go to Settings → Domains
2. Add your domain
3. Update DNS records (Vercel shows instructions)
