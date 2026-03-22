# Web Project Map (B2B SaaS Food Delivery App)

الهدف: توثيق سريع يخلّي أي تعديل واضح ومباشر بدون تَوهان.

## الملفات
- `01-architecture.md` → المعمارية الحالية + الـ stack
- `02-roles-and-screens.md` → الأدوار والشاشات الموجودة
- `03-change-map.md` → كل Feature تتعدل فين
- `04-runbook.md` → تشغيل وتجهيز سريع

## Snapshot
- المشروع Web SPA مبني بـ React + Vite + React Router.
- حالة البيانات الحالية Demo/Prototype via `localStorage`.
- فيه 4 بوابات: `admin` / `dispatcher` / `restaurant` / `driver`.
- فيه تجهيز مبدئي للـ Supabase types + migrations لكن الاتصال غير مفعّل فعليًا حاليًا.
