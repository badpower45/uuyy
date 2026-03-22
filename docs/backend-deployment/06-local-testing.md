# 06) Local Testing Guide

## Setup Local Dev Environment

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Local Database (Option A: Docker)
```bash
# Start PostgreSQL container
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=localpass \
  -e POSTGRES_DB=driver_db \
  -p 5432:5432 \
  postgres:15

# Connection string
export DATABASE_URL="postgresql://postgres:localpass@localhost:5432/driver_db"
```

### 3. Run Migrations Locally
```bash
# Run all migrations
for i in 001 002 003 004 005; do
  psql "$DATABASE_URL" -f "migrations/${i}*.sql"
done

# or use Drizzle
pnpm --filter @workspace/db run push
```

### 4. Seed Demo Data
```bash
export DATABASE_URL="postgresql://postgres:localpass@localhost:5432/driver_db"
pnpm --filter @workspace/scripts run seed
```

## Start API Server

### Development Mode
```bash
export DATABASE_URL="postgresql://postgres:localpass@localhost:5432/driver_db"
export PORT=8000
pnpm --filter @workspace/api-server run dev
```

Server runs on `http://localhost:8000`

### Production Mode (Local Testing)
```bash
# Build
pnpm --filter @workspace/api-server run build

# Run
PORT=8000 node artifacts/api-server/dist/index.cjs
```

## Test Endpoints

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Get Driver
```bash
curl http://localhost:8000/api/drivers/by-phone/01012345678
```

### Get Weekly Earnings
```bash
curl http://localhost:8000/api/drivers/1/earnings/weekly
```

### Get Incoming Order
```bash
curl http://localhost:8000/api/orders/incoming
```

### Get Route
```bash
curl -X POST http://localhost:8000/api/routing/order-route \
  -H "Content-Type: application/json" \
  -d '{
    "driverLat": 30.0500,
    "driverLng": 31.2100,
    "orderId": 1
  }'
```

### Save Driver Location
```bash
curl -X POST http://localhost:8000/api/drivers/1/location \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 30.0500,
    "longitude": 31.2100,
    "accuracy": 5,
    "heading": 90,
    "speed": 15
  }'
```

## Typecheck Everything
```bash
pnpm run typecheck
```

## Monorepo Package Dependencies
```bash
# Check what api-server depends on
pnpm --filter @workspace/api-server list

# Check what db exports
pnpm --filter @workspace/db list
```

## Common Issues

### "DATABASE_URL not set"
```bash
# Make sure to export before running
export DATABASE_URL="postgresql://..."
```

### "Module not found: @workspace/db"
```bash
# Typecheck first to build types
pnpm run typecheck

# Then dev
pnpm --filter @workspace/api-server run dev
```

### Connection timeout
```bash
# Check Docker container running
docker ps | grep postgres

# Check port 5432 is available
lsof -i :5432
```

### Port 8000 already in use
```bash
# Find and kill process
lsof -i :8000
kill -9 [PID]

# Or use different port
PORT=8001 pnpm --filter @workspace/api-server run dev
```

## Performance Testing
```bash
# Basic load test (100 requests)
ab -n 100 -c 10 http://localhost:8000/api/health

# Using httpie
for i in {1..10}; do
  http POST localhost:8000/api/orders/incoming
done
```

## Database Browser
```bash
# Connect to database
psql "$DATABASE_URL"

# Common queries
SELECT * FROM drivers LIMIT 5;
SELECT * FROM orders;
SELECT * FROM driver_latest_location;
SELECT * FROM driver_daily_earnings;
```

## Cleanup
```bash
# Stop Docker container
docker stop postgres

# Remove container
docker rm postgres
```
