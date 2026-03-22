# 04) Environment Variables Setup

## Local Development
Create `.env.local` in root:
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/driver_db"

# Server
PORT=8000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173,http://localhost:19006"
```

Then run:
```bash
source .env.local
pnpm --filter @workspace/api-server run dev
```

## Vercel Deployment
1. Go to Vercel project Settings
2. Go to Environment Variables
3. Add these:

```
DATABASE_URL = postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
PORT = 8000
NODE_ENV = production
```

## Build & Start Commands for Vercel
```
Build: pnpm run build && pnpm --filter @workspace/api-server run build
Start: node /artifacts/api-server/dist/index.cjs
```

## Frontend (Web + Mobile) Env Variables

### Web App (.env)
```
VITE_API_BASE_URL=https://your-api.vercel.app/api
VITE_SUPABASE_URL=https://[PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
```

### Mobile App (.env)
```
EXPO_PUBLIC_DOMAIN=your-api.vercel.app
EXPO_PUBLIC_API_BASE_URL=https://your-api.vercel.app/api
EXPO_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
```

## Vercel Environment Matrix

| Variable | Dev | Staging | Production |
|----------|-----|---------|-----------|
| DATABASE_URL | local | supabase-dev | supabase-prod |
| NODE_ENV | development | staging | production |
| PORT | 8000 | auto | auto |
| CORS_ORIGIN | localhost web/mobile | preview domains | production web/mobile domains |

## Important Security Notes
- **Never commit .env files**
- Use Vercel's UI for secrets, not git
- Rotate passwords regularly
- Use connection pooling (Supabase default = 100)
- Restrict database user permissions if possible
