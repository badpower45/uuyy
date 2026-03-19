# Getting Your DATABASE_URL from Supabase

Your Supabase project is linked and active. Follow these steps to get the PostgreSQL connection string:

## Step 1: Go to Supabase Dashboard
**URL:** https://app.supabase.com/projects/avoeyxfwwazkvbtdypxc/settings/database

## Step 2: Get Connection String
- Scroll to "Connection String" section
- Select "URI" tab (not Pool)
- You'll see: `postgresql://postgres:[YOUR_PASSWORD]@db.avoeyxfwwazkvbtdypxc.supabase.co:5432/postgres`

## Step 3: Copy the Full Connection String
The format is:
```
postgresql://postgres:YOUR_DB_PASSWORD@db.avoeyxfwwazkvbtdypxc.supabase.co:5432/postgres
```

**Note:** Replace `YOUR_DB_PASSWORD` with the actual password from the dashboard.

## Step 4: Set Environment Variable in Terminal
```bash
export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@db.avoeyxfwwazkvbtdypxc.supabase.co:5432/postgres'
```

## Step 5: Verify Connection
```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

## Step 6: Run Migrations
Once DATABASE_URL is set, execute:
```bash
./run-migrations.sh
```

This will create all database tables in order:
1. 001_create_drivers.sql
2. 002_create_orders.sql
3. 003_create_driver_locations.sql
4. 004_create_earnings.sql
5. 005_create_tracking_sessions.sql

---

**Project Reference:** avoeyxfwwazkvbtdypxc  
**Region:** eu-west-1 (Ireland)  
**Engine:** PostgreSQL 17.6.1.084
