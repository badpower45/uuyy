# 03) Migrations Execution Guide

## Migration Order (MUST RUN IN SEQUENCE)
1. `001_create_drivers.sql` - Drivers + enums
2. `002_create_orders.sql` - Orders + Restaurants
3. `003_create_driver_locations.sql` - GPS tracking
4. `004_create_earnings.sql` - Transactions + views
5. `005_create_tracking_sessions.sql` - Session tracking

## Option A: Using psql CLI

```bash
# Set your DATABASE_URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"

# Run migrations in order
psql "$DATABASE_URL" -f migrations/001_create_drivers.sql
psql "$DATABASE_URL" -f migrations/002_create_orders.sql
psql "$DATABASE_URL" -f migrations/003_create_driver_locations.sql
psql "$DATABASE_URL" -f migrations/004_create_earnings.sql
psql "$DATABASE_URL" -f migrations/005_create_tracking_sessions.sql

echo "✅ All migrations completed!"
```

## Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Connect to project
supabase link --project-ref [PROJECT-ID]

# Run migrations
supabase migration up
```

## Option C: Using Drizzle Kit (Alternative)
```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://..."

# Push schema (Drizzle way)
pnpm --filter @workspace/db run push

# If conflicts, use force:
pnpm --filter @workspace/db run push-force
```

## Verification

```bash
# Connect to database
psql "$DATABASE_URL"

# List tables
\dt

# Check views
\dv

# Describe drivers table
\d drivers
```

### Expected Tables
- `drivers`
- `restaurants`
- `orders`
- `driver_locations`
- `driver_transactions`
- `tracking_sessions`

### Expected Views
- `driver_latest_location`
- `driver_daily_earnings`

## Enums Created
- `driver_rank` (bronze, silver, gold, platinum)
- `driver_status` (active, suspended, inactive)
- `order_status` (pending, assigned, to_restaurant, picked_up, to_customer, delivered, cancelled)
- `transaction_type` (earning, cash_collected, commission, settlement, bonus, penalty)

## Triggers Created
- `trg_drivers_updated_at` - Auto-updates drivers.updated_at
- `trg_orders_updated_at` - Auto-updates orders.updated_at

## Seed Sample Data (Optional)
After migrations, run:
```bash
export DATABASE_URL="postgresql://..."
pnpm --filter @workspace/scripts run seed
```

This populates:
- 6 demo drivers
- 5 demo restaurants
- 5 pending orders
- Weekly earnings for 7 days
