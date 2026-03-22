# 01) Backend Overview

## الفلسفة المعمارية
- **Express.js 5** API server
- **PostgreSQL** via Drizzle ORM
- **Monorepo** مع shared libraries
- **TypeScript** strict mode
- **esbuild** for production bundle
- **Traffic-aware routing** عبر `Google Routes API` أو `Mapbox driving-traffic` مع fallback إلى `OSRM`

## Directory Structure

```
artifacts/api-server/
├── src/
│   ├── index.ts          # Server boot (PORT required)
│   ├── app.ts            # Express app setup (CORS + middleware)
│   ├── routes/
│   │   ├── index.ts      # Mount all routers
│   │   ├── health.ts     # GET /api/health
│   │   ├── drivers.ts    # Driver endpoints
│   │   ├── orders.ts     # Order management
│   │   └── routing.ts    # live tracking + multi-provider routing + eta
│   ├── lib/
│   │   └── routing.ts    # Google/Mapbox/OSRM routing abstraction
│   └── middlewares/      # Auth/validation (currently empty)
├── build.ts              # esbuild bundler script
├── tsconfig.json         # TypeScript config
└── package.json

lib/db/
├── src/
│   ├── index.ts          # Drizzle + Pool connection
│   └── schema/
│       ├── index.ts      # Re-exports all models
│       ├── drivers.ts    # Driver table + types
│       ├── earnings.ts   # Transactions
│       ├── orders.ts     # Orders table
│       └── restaurants.ts # Restaurants
├── drizzle.config.ts     # Drizzle Kit config
└── package.json

migrations/
├── 001_create_drivers.sql
├── 002_create_orders.sql
├── 003_create_driver_locations.sql
├── 004_create_earnings.sql
└── 005_create_tracking_sessions.sql
```

## Dependencies
### Runtime
- **express@5**: Web framework
- **drizzle-orm**: ORM
- **pg**: PostgreSQL driver
- **cors**: Cross-origin handling
- **cookie-parser**: Session cookies

### Dev
- **esbuild**: Production bundler
- **tsx**: TypeScript runner
- **typescript**: Type checking

## Build Output
- esbuild bundler يخرج `dist/index.cjs` (CJS format)
- Externals: كل الـ dependencies اللي مش في allowlist
- Minified: production-ready
- Platform: node

## Database Connection
```typescript
// في lib/db/src/index.ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

يتطلب: `DATABASE_URL` environment variable.

## Routes Summary
- `GET /api/health` → health check
- `GET /api/drivers/by-phone/:phone` → get driver
- `GET /api/drivers/:id/earnings/weekly` → earnings
- `POST /api/drivers/:id/location` → GPS ping
- `GET /api/orders/:id/tracking` → latest driver location + current route + ETA
- `GET /api/orders/incoming` → next pending order
- `GET /api/orders/active/:driverId` → active order
- `POST /api/orders/:id/accept` → assign order
- `PATCH /api/orders/:id/financials` → control fare/cash/commission
- `PATCH /api/orders/:id/status` → advance status
- `POST /api/routing/order-route` → full route driver→restaurant→customer
- `GET /api/routing/eta` → ETA calculation

## Environment Variables (Required for Production)
```
PORT=8000
DATABASE_URL=postgresql://user:pass@host:5432/db
NODE_ENV=production
ROUTING_PROVIDER=auto
GOOGLE_MAPS_API_KEY=
MAPBOX_ACCESS_TOKEN=
```

## Production Considerations
1. Database: PostgreSQL ≥13
2. Timezone: UTC for timestamps
3. Connection pooling: pg Pool handles it
4. CORS: Open to frontend domain
5. Error handling: Basic 500/400 responses
6. Logging: Console output only (structured logging needed for production)
