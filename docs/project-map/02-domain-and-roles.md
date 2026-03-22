# 02) Domain & Roles

## Business Domain
منظومة توصيل مطاعم:
- المطعم ينشئ/يدير الطلبات
- الديسباتشر يوزع الطلبات على السائقين
- السائق ينفذ الرحلة (مطعم -> عميل)
- السوبر أدمن يشرف على النظام كاملًا

## Current Implemented Focus
- موبايل السائق (driver app) موجود فعليًا ويشتغل على:
  - incoming/active order
  - map + route + ETA
  - earnings weekly
  - live location tracking

## Planned Product Shape (كما اتفقنا)
- `Driver`: موبايل Native (Expo)
- `SuperAdmin`, `Restaurant`, `Dispatcher`: Web app responsive (mobile-first)
  - ممكن لاحقًا تنزل كتطبيق عبر PWA أو wrapper (Capacitor)

## RBAC (Recommended)
- `super_admin`: full access (users, restaurants, drivers, settlements, configs)
- `dispatcher`: assign/reassign, monitor live map, manage incidents
- `restaurant`: own orders/menu/branches only
- `driver`: own shifts, own orders, own earnings only

## Suggested Next Modules (for web roles)
1. Auth + session + role checks
2. Restaurant portal (orders CRUD)
3. Dispatcher board (live map + assignment)
4. Super admin console (global controls/reports)
