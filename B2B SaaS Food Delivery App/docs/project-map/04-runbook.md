# 04) Runbook

## Install
```bash
npm i
```

## Dev
```bash
npm run dev
```

## Build
```bash
npm run build
```

## Current status checklist
1. المشروع شغال كـ SPA prototype.
2. source of truth الحالي = `localStorage`.
3. Supabase client غير مفعّل (commented) في `src/lib/supabase.ts`.
4. migration files موجودة لكن محتاجة DB execution خارج المشروع.

## Suggested next hardening steps
1. تفعيل auth/session حقيقي.
2. نقل state من localStorage إلى API/DB.
3. توحيد enums بين frontend والـ backend.
4. إضافة role guards على routes بدل الاعتماد على navigate فقط.
5. إضافة tests (routing + critical flows).
