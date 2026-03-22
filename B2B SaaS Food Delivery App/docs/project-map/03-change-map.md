# 03) Change Map

## A) تعديل الـ Login / الدخول
- `src/app/components/LoginPage.tsx`
- لو auth حقيقي: اربط مع API/Supabase بدل local checks

## B) لوحة الأدمن
- `src/app/components/AdminDashboard.tsx`
- CRUD الحالي بيعتمد على `src/lib/store.ts`

## C) لوحة الديسباتشر + الخرائط
- `src/app/components/DispatcherDashboard.tsx`
- إدارة marker/assignment logic
- أي real-time backend integration يبدأ هنا + data layer

## D) بوابة المطعم
- `src/app/components/RestaurantPortal.tsx`
- Orders/menu/wallet كلها state محلي داخل component

## E) واجهة الطيار
- `src/app/components/DriverTracker.tsx`
- GPS/simulation + status + map

## F) البيانات والمخزن
- `src/lib/store.ts` (المصدر الحالي)
- `src/lib/supabase.ts` (types + migration order)
- `src/migrations/*.sql` (schema SQL)

## G) Navigation / route changes
- `src/app/routes.ts`

## H) Styling global
- `src/styles/index.css`
- `src/styles/theme.css`
- `src/styles/tailwind.css`
