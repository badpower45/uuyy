# 02) Supabase Setup Guide

## Step 1: إنشاء مشروع Supabase
1. اذهب إلى https://app.supabase.com
2. Sign up / Sign in
3. Create new project
4. Choose region (أقرب منطقة للمستخدمين)
5. Set strong database password
6. Confirm creation (takes 1-2 minutes)

## Step 2: جمع Credentials
بعد إنشاء المشروع:
1. اذهب إلى Settings → Database
2. انسخ **Connection String** (PostgreSQL):
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
   ```
3. اذهب إلى Settings → API
4. انسخ **Project URL** و **anon public key**

## Step 3: Testing Connection
```bash
# Test from local machine
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
```

عند النجاح هتشوف PostgreSQL prompt:
```
postgres=>
```

## Step 4: Timezone Configuration
Supabase default timezone = UTC. تأكد أنك تستخدمها في كل القراءات.

للـ Cairo timezone في الـ queries:
```sql
SELECT created_at AT TIME ZONE 'Africa/Cairo' FROM orders;
```

## Important Notes
- لا تشارك password مع أحد
- استخدم environment variables دائمًا
- Connection pooling: Supabase يوفره (روابط up to 100 connections)
