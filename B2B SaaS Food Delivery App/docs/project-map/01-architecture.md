# 01) Architecture

## Tech Stack
- Build tool: Vite
- UI: React
- Routing: `react-router` (browser router)
- Maps: Leaflet + `react-leaflet` (مع استيراد مباشر لـ `leaflet`)
- Notifications: `sonner`
- UI kits: Radix + MUI (مع components كثيرة)
- Styling: Tailwind + CSS files داخل `src/styles`

## App Boot Flow
1. `src/main.tsx` → render `App`
2. `src/app/App.tsx` → `RouterProvider` + `Toaster`
3. `src/app/routes.ts` → route per role screen

## Current Data Layer
- `src/lib/store.ts`
  - مصدر بيانات محلي via `localStorage`
  - Drivers/Restaurants CRUD بسيط
  - login mock للـ driver/restaurant
- `src/lib/supabase.ts`
  - Types + migration order
  - Supabase client commented (غير مفعّل)

## Migrations
موجودة في `src/migrations`:
- `001_users.sql` حتى `008_subscriptions.sql`

## Important Observation
المشروع الحالي Prototype وظيفي للـ UI/flows أكتر من كونه production backend-integrated app.
