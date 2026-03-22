# Project Map (Driver-Master)

الهدف من الفولدر ده: أي حد يشتغل على المشروع يعرف بسرعة:
- النظام متقسم إزاي
- كل Feature مكانها فين
- نعدّل فين حسب الطلب
- نشغّل إيه بدون لخبطة

## Files Index
- `01-architecture.md` → الصورة الكبيرة (Apps/Libraries/Data Flow)
- `02-domain-and-roles.md` → الدومين + الأدوار الحالية والمستقبلية
- `03-change-map.md` → لو عايز تعمل Feature معينة تعدّل فين بالضبط
- `04-runbook.md` → أوامر التشغيل والتجهيز السريع

## Golden Rules
1. أي API contract يبدأ من `lib/api-spec/openapi.yaml` ثم codegen.
2. أي DB تغيير يبدأ من `lib/db/src/schema/*` + migrations.
3. موبايل السائق في `artifacts/mobile`.
4. السيرفر في `artifacts/api-server`.
5. قبل أي merge: شغّل typecheck على مستوى الـ monorepo.
