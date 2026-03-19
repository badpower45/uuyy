# بايلوت — Database Migrations

## How to run

```bash
# Set your database URL
export DATABASE_URL="postgresql://user:pass@host:5432/pilot_db"

# Run all migrations in order
psql $DATABASE_URL -f migrations/001_create_drivers.sql
psql $DATABASE_URL -f migrations/002_create_orders.sql
psql $DATABASE_URL -f migrations/003_create_driver_locations.sql
psql $DATABASE_URL -f migrations/004_create_earnings.sql
psql $DATABASE_URL -f migrations/005_create_tracking_sessions.sql
```

## Tables

| Table | Purpose |
|-------|---------|
| `drivers` | Driver accounts, balance, rank, online status |
| `restaurants` | Restaurant info and locations |
| `orders` | Delivery orders with full lifecycle tracking |
| `driver_locations` | Live GPS pings — every location update stored |
| `driver_transactions` | Earnings, commissions, settlements |
| `tracking_sessions` | Online/offline sessions for KPI tracking |

## Views

| View | Purpose |
|------|---------|
| `driver_latest_location` | Latest GPS position per driver (for dispatch map) |
| `driver_daily_earnings` | Aggregated daily earnings per driver |

## Live Location Flow

```
App starts GPS (expo-location) 
  → every 4s: location ping
  → POST /api/driver/location
  → INSERT INTO driver_locations
  → dispatch dashboard reads driver_latest_location view
```
