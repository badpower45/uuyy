# 03) Change Map (لو طلب جديد، نعدّل فين؟)

## A) تعديل في شكل/UX الموبايل
- Screens: `artifacts/mobile/app/**`
- Reusable UI: `artifacts/mobile/components/**`
- Theme/colors: `artifacts/mobile/constants/colors.ts`

## B) منطق الطلبات/الحالة/التدفق
- State orchestration: `artifacts/mobile/context/AppContext.tsx`
- API calls from mobile: `artifacts/mobile/lib/api.ts`
- Server order endpoints: `artifacts/api-server/src/routes/orders.ts`

## C) خرائط + Routing + ETA
- Mobile map screen: `artifacts/mobile/app/(tabs)/map.tsx`
- Map platform components:
  - `artifacts/mobile/components/MapView.native.tsx`
  - `artifacts/mobile/components/MapView.web.tsx`
- Server routing logic: `artifacts/api-server/src/routes/routing.ts`

## D) السائقين والأرباح
- Driver endpoints: `artifacts/api-server/src/routes/drivers.ts`
- DB tables:
  - `lib/db/src/schema/drivers.ts`
  - `lib/db/src/schema/earnings.ts`

## E) قاعدة البيانات
- Drizzle schema: `lib/db/src/schema/*.ts`
- SQL migrations: `migrations/*.sql`
- Seed data: `scripts/src/seed.ts`

## F) API Contracts / Type-safe clients
1. عدّل: `lib/api-spec/openapi.yaml`
2. شغّل codegen
3. راجع generated outputs في:
   - `lib/api-zod/src/generated/**`
   - `lib/api-client-react/src/generated/**`

## G) إضافة endpoint جديد (أفضل مسار)
1. أضف schema/table لو لزم في `lib/db`
2. أضف route في `artifacts/api-server/src/routes/*`
3. اربط route في `routes/index.ts`
4. حدّث openapi في `lib/api-spec/openapi.yaml`
5. شغّل codegen
6. استهلك endpoint في mobile/web client
