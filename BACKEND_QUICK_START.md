# 🚀 QUICK START: Backend Deployment (Complete Guide)

هذا الملف يلخص كل خطوة بترتيب زمني كامل.

---

## Phase 1: Local Setup (30 دقيقة)

### 1.1 تجهيز البيئة المحلية
```bash
# استنسخ المشروع
git clone [repo]
cd Driver-Master

# اعمل نسخة من .env.example
cp .env.example .env.local

# عدّل DATABASE_URL داخل .env.local
# الآن أنت تحتاج قاعدة بيانات محلية أو ستستخدم Supabase في الخطوة التالية
```

### 1.2 شغّل التجهيز التلقائي
```bash
./setup-backend.sh
```

---

## Phase 2: Database Setup (1-2 ساعة)

### 2.1 إنشاء Supabase Project
1. اذهب إلى https://app.supabase.com
2. اضغط "Create new project"
3. اختر "Organization" (أو اعمل واحدة)
4. سمّ المشروع: `driver-master`
5. اختر region (مثلًا: Europe/US East حسب المستخدمين)
6. اعمل password قوي
7. اضغط "Create"
8. انتظر 1-2 دقيقة

### 2.2 احصل على Connection String
1. بعد الإنشاء، اذهب إلى **Settings** → **Database**
2. انسخ **Connection string** (PostgreSQL variant):
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
   ```
3. ضع الـ string في `.env.local`:
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
   ```

### 2.3 شغّل Migrations
```bash
# اجلب متغيرات البيئة
export $(cat .env.local | grep -v '^#' | xargs)

# شغّل جميع الـ SQL migrations بالترتيب
./run-migrations.sh
```

**Output المتوقع:**
```
🗄️  Running all migrations...
▶️  Running 001_create_drivers.sql...
✅ 001_create_drivers.sql
▶️  Running 002_create_orders.sql...
✅ 002_create_orders.sql
...
✅ All migrations completed!
```

### 2.4 (اختياري) أضف Demo Data
```bash
pnpm --filter @workspace/scripts run seed
```

---

## Phase 3: Local Testing (30 دقيقة)

### 3.1 شغّل الـ API locally
```bash
export $(cat .env.local | grep -v '^#' | xargs)
pnpm --filter @workspace/api-server run dev
```

**Output المتوقع:**
```
Server listening on port 8000
```

### 3.2 اختبر الـ Health Endpoint
```bash
curl http://localhost:8000/api/health
```

**Response:**
```json
{ "status": "ok" }
```

### 3.3 اختبر Driver Endpoint
```bash
curl http://localhost:8000/api/drivers/by-phone/01012345678
```

**Response (إذا كان السائق موجود):**
```json
{
  "id": 1,
  "name": "محمد أحمد",
  "phone": "01012345678",
  ...
}
```

---

## Phase 4: Vercel Deployment (20 دقيقة)

### 4.1 ربط GitHub مع Vercel
1. اذهب إلى https://vercel.com/dashboard
2. اضغط "Add New..." → "Project"
3. اختر "Import Git Repository"
4. اختر repo `Driver-Master`
5. اضغط "Import"

### 4.2 Configure Build Settings
1. اختر "Other" (ليس Next.js/Vite/etc)
2. في **Build Command**:
   ```
   pnpm run typecheck && pnpm run build && pnpm --filter @workspace/api-server run build
   ```
3. في **Start Command**:
   ```
   node artifacts/api-server/dist/index.cjs
   ```
4. في **Install Command**:
   ```
   pnpm install --frozen-lockfile
   ```

### 4.3 Add Environment Variables
في Settings → Environment Variables:
```
DATABASE_URL = postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
NODE_ENV = production
PORT = 8000
```

### 4.4 Deploy
1. اضغط "Deploy"
2. انتظر build (3-5 دقائق)
3. انتظر deployment completion

**Success Message:**
```
✅ Successfully deployed to production
```

### 4.5 اختبر Production Endpoint
```bash
curl https://[PROJECT-NAME].vercel.app/api/health
```

**Response:**
```json
{ "status": "ok" }
```

---

## Phase 5: Connect Frontend (30 دقيقة)

### 5.1 Update Web App
في `B2B SaaS Food Delivery App/.env`:
```
VITE_API_BASE_URL=https://[PROJECT-NAME].vercel.app/api
```

### 5.2 Update Mobile App
في `artifacts/mobile/.env` أو expo.json:
```
EXPO_PUBLIC_DOMAIN=[PROJECT-NAME].vercel.app
```

### 5.3 Test Full Flow
1. شغّل Web app: `npm run dev`
2. شغّل Mobile app: `pnpm --filter @workspace/mobile run dev`
3. اختبر الـ login + orders + map

---

## Troubleshooting

### Build fails: "DATABASE_URL not set"
**Solution:** اضف `DATABASE_URL` في Vercel environment variables

### 502 Bad Gateway
**Solution:** 
- تحقق من logs في Vercel dashboard
- تأكد PostgreSQL connection string صحيح
- تأكد migrations تمت بنجاح

### "Cannot find module @workspace/db"
**Solution:**
```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run build
```

### Mobile/Web cannot reach API
**Solution:**
- تأكد API URL في frontend env files
- تأكد CORS enabled في Express
- تأكد Vercel deployment URL صحيح

---

## Timeline Summary

| Phase | Duration | Checklist |
|-------|----------|-----------|
| Local Setup | 30 min | ✅ Dependencies, .env |
| Supabase | 1-2 hrs | ✅ Project, connection, migrations |
| Local Testing | 30 min | ✅ Health, drivers, orders |
| Vercel Deploy | 20 min | ✅ Build, env vars, test |
| Frontend | 30 min | ✅ Connect, test |
| **TOTAL** | **~3 hours** | ✅ Full production ready |

---

## Important Notes

1. **Never commit .env files** to git
2. Use Vercel UI for secrets, not git
3. Migrations must run in order (001 → 005)
4. PostgreSQL timezone = UTC (or Africa/Cairo)
5. Connection pool = 100 (Supabase default)
6. Cold start on Vercel ≈ 1-2 seconds first request

---

## Next Steps (After Deployment)

1. **Monitoring**
   - Setup Vercel logs/alerts
   - Monitor Supabase query performance
   - Setup error tracking (e.g., Sentry)

2. **Performance**
   - Add Redis cache layer
   - Optimize N+1 queries
   - Implement connection pooling

3. **Security**
   - Add authentication middleware
   - Rate limiting
   - HTTPS only
   - SQL injection prevention

4. **CI/CD**
   - Add GitHub Actions for tests
   - Auto-deploy on merge to main
   - Environment-specific deployments
