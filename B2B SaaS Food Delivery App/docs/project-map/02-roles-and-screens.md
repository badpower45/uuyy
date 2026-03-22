# 02) Roles & Screens

## Routes
- `/` → `LoginPage`
- `/admin` → `AdminDashboard`
- `/restaurant` → `RestaurantPortal`
- `/dispatcher` → `DispatcherDashboard`
- `/driver` → `DriverTracker`

## Role Behavior (current)
1. **Admin**
   - Credentials demo ثابتة
   - إدارة مطاعم/طيارين
   - إحصائيات ورسوم بيانية

2. **Dispatcher**
   - خريطة لايف (Leaflet)
   - إسناد الطلبات للطيارين
   - محاكاة حركة الطيارين

3. **Restaurant**
   - إنشاء طلبات
   - متابعة الطلبات والحالات
   - إدارة menu + wallet view

4. **Driver**
   - تتبع موقع (GPS أو simulation)
   - تغيير status
   - عرض order demo

## Auth Reality
- لا يوجد auth backend فعلي الآن.
- `admin/dispatcher` بتحقق ثابت داخل الصفحة.
- `driver/restaurant` عبر `localStorage store` + `sessionStorage`.
