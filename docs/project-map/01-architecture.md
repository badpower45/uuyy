# 01) Architecture

## Monorepo
- Package manager: `pnpm` workspaces
- Root workspace packages:
  - `artifacts/*` (apps)
  - `lib/*` (shared libs)
  - `scripts` (utility scripts)

## Apps
1. `artifacts/mobile` (`@workspace/mobile`)
   - React Native + Expo Router
   - Driver app (map, order flow, wallet)

2. `artifacts/api-server` (`@workspace/api-server`)
   - Express 5 API
   - Routes: health, drivers, orders, routing

3. `artifacts/mockup-sandbox`
   - Vite React UI playground (mockups/components)

## Shared Libraries
- `lib/db`:
  - Drizzle ORM + PostgreSQL tables/schemas
- `lib/api-spec`:
  - OpenAPI source of truth
- `lib/api-zod`:
  - generated Zod schemas
- `lib/api-client-react`:
  - generated React client/hooks

## Main Runtime Data Flow
Driver App (`mobile`) -> API (`api-server`) -> DB (`lib/db` + Postgres)

### Active order flow (current)
1. Driver online -> mobile polls `/orders/incoming`
2. Accept -> `/orders/:id/accept`
3. Status progression -> `/orders/:id/status`
4. Route/ETA -> `/routing/order-route` + `/routing/eta`
5. GPS ping -> `/drivers/:id/location`

## Important Entry Points
- API boot: `artifacts/api-server/src/index.ts`
- API app setup: `artifacts/api-server/src/app.ts`
- API routes mount: `artifacts/api-server/src/routes/index.ts`
- Mobile global state: `artifacts/mobile/context/AppContext.tsx`
- Mobile map screen: `artifacts/mobile/app/(tabs)/map.tsx`
- Mobile API adapter: `artifacts/mobile/lib/api.ts`
