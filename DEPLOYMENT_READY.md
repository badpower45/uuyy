# 🚀 Driver-Master Backend - Deployment Ready!

## Current Status ✅

- ✅ Production build ready: `artifacts/api-server/dist/index.cjs` (1.3MB)
- ✅ All 5 database migrations present and verified
- ✅ Supabase project linked: `avoeyxfwwazkvbtdypxc` (eu-west-1)
- ✅ Deployment scripts prepared
- ⏳ **Pending:** DATABASE_URL configuration

---

## 🔑 Step 1: Get Supabase Database Password (5 minutes)

### Option A: Supabase Web Dashboard (Recommended)

1. Open: https://app.supabase.com/projects/avoeyxfwwazkvbtdypxc/settings/database
2. Scroll to "Connection String" section
3. Click on the password field or view full connection string
4. You'll see: `postgresql://postgres:YOUR_PASSWORD@db.avoeyxfwwazkvbtdypxc.supabase.co:5432/postgres`

### Option B: Supabase CLI (Requires Docker)

```bash
supabase db pull
```

*(Note: This requires Docker Desktop to be running)*

---

## 📝 Step 2: Update Environment Variables (1 minute)

### Option A: Update .env File

Edit `.env` and replace `PASSWORD_HERE` with your actual Supabase password:

```bash
# Before:
DATABASE_URL=postgresql://postgres:PASSWORD_HERE@db.avoeyxfwwazkvbtdypxc.supabase.co:5432/postgres

# After:
DATABASE_URL=postgresql://postgres:your_actual_password@db.avoeyxfwwazkvbtdypxc.supabase.co:5432/postgres
```

### Option B: Set Environment Variable in Terminal

```bash
export DATABASE_URL='postgresql://postgres:your_actual_password@db.avoeyxfwwazkvbtdypxc.supabase.co:5432/postgres'
```

---

## ✅ Step 3: Verify Database Connection (2 minutes)

```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT version();"

# You should see: PostgreSQL 17.6.1.084 on...
```

---

## 🗄️ Step 4: Execute Database Migrations (5 minutes)

This creates all necessary tables in the correct order:

```bash
# Make script executable (if not already)
chmod +x ./run-migrations.sh

# Run migrations
./run-migrations.sh
```

**What this does:**
1. Creates `drivers` table with enums (driver_rank, driver_status)
2. Creates `orders` table + restaurants + order_status enum
3. Creates `driver_locations` table + GPS tracking view
4. Creates `earnings` table + transaction views
5. Creates `tracking_sessions` table

**Expected output:**
```
✓ Running migration 001_create_drivers.sql...
✓ Running migration 002_create_orders.sql...
✓ Running migration 003_create_driver_locations.sql...
✓ Running migration 004_create_earnings.sql...
✓ Running migration 005_create_tracking_sessions.sql...
✓ All migrations completed successfully!
```

---

## 🧪 Step 5: Test Backend Locally (Optional but Recommended)

```bash
# Start development server
pnpm --filter @workspace/api-server run dev

# In another terminal, test the health endpoint:
curl http://localhost:8000/api/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-19T..."}
```

---

## 🚀 Step 6: Deploy to Vercel (10 minutes)

### 1. Commit and Push Changes

```bash
git add .
git commit -m "Deploy: Backend ready for Vercel with DB migrations"
git push origin main
```

### 2. Import on Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select GitHub repository: `badpower45/uuyy`
4. Click "Import"

### 3. Configure Build & Environment

**Build Settings:**
- Framework: "Other"
- Build Command: `pnpm run typecheck && pnpm run build && pnpm --filter @workspace/api-server run build`
- Output Directory: `artifacts/api-server/dist`

**Environment Variables:**
- `DATABASE_URL`: `postgresql://postgres:your_password@db.avoeyxfwwazkvbtdypxc.supabase.co:5432/postgres`
- `NODE_ENV`: `production`
- `PORT`: `3000` (Vercel auto-assigns)

**Start Command:**
- `node artifacts/api-server/dist/index.cjs`

### 4. Deploy

Click "Deploy" and wait for completion (~2-3 minutes).

---

## ✔️ Step 7: Verify Deployment

Once deployed, test these endpoints:

```bash
# Replace VERCEL_URL with your actual Vercel domain
VERCEL_URL="https://your-project.vercel.app"

# 1. Health check
curl $VERCEL_URL/api/health

# 2. Get drivers (if seed data exists)
curl $VERCEL_URL/api/drivers

# 3. Check logs in Vercel dashboard
# https://vercel.com/badpower45/uuyy/deployments
```

**Expected responses:**
- `/api/health`: `{"status":"ok","timestamp":"..."}`
- `/api/drivers`: Array of drivers or empty array
- No errors in Vercel logs

---

## 📋 Quick Checklist

- [ ] Get DATABASE_URL password from Supabase dashboard
- [ ] Update `.env` file with actual password
- [ ] Run `./run-migrations.sh` to create tables
- [ ] Test locally: `pnpm --filter @workspace/api-server run dev`
- [ ] Commit and push: `git push origin main`
- [ ] Deploy on Vercel
- [ ] Test `/api/health` endpoint on Vercel
- [ ] Verify database tables in Supabase

---

## 🆘 Troubleshooting

### Migration fails with "permission denied"

```bash
# Make script executable
chmod +x ./run-migrations.sh
```

### "can't connect to database"

- Verify DATABASE_URL is set: `echo $DATABASE_URL`
- Check password is correct
- Ensure Supabase project is active (check dashboard)

### Vercel deployment fails

- Check build logs: https://vercel.com/badpower45/uuyy/deployments
- Verify `vercel.json` exists
- Ensure all environment variables are set
- Check Node.js version compatibility

### API endpoints returning 404

- Verify `/api/health` responds first
- Check Vercel logs for errors
- Ensure environment variables are loaded: `node -e "console.log(process.env.DATABASE_URL)"`

---

## 📚 Related Documentation

- [BACKEND_QUICK_START.md](./BACKEND_QUICK_START.md) - 3-hour implementation guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Pre/post deployment tasks
- [GET_DATABASE_URL.md](./GET_DATABASE_URL.md) - Supabase connection details
- [docs/project-map/BACKEND_ARCHITECTURE.md](./docs/project-map/BACKEND_ARCHITECTURE.md) - Full API architecture

---

## 🎯 Next Steps After Deployment

1. **Frontend Integration**: Update React/Expo apps to use Vercel backend URL
2. **Seed Data**: Create drivers, restaurants, and orders for testing
3. **Monitoring**: Set up Vercel analytics and error tracking
4. **Production**: Configure custom domain and SSL

---

**Status:** ✅ Ready for Deployment  
**Project:** Driver-Master Backend  
**Repository:** https://github.com/badpower45/uuyy  
**Supabase:** avoeyxfwwazkvbtdypxc (eu-west-1)  
**Target:** Vercel Serverless Functions
