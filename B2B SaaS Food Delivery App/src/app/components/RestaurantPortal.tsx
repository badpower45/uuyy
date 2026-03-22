import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Wallet, User, Phone, MapPin, DollarSign, Send, Bell,
  Package, CheckCircle2, LogOut, ShoppingBag, LayoutDashboard,
  Plus, UtensilsCrossed, Search, Edit2, Trash2, Eye,
  ChevronRight, TrendingUp, ArrowUpRight, X, RefreshCw,
  Truck, History, Menu,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

/* ─────────── Types ─────────── */
type OrderStatus = "pending" | "assigned" | "picked" | "on_way" | "delivered";
type Section = "dashboard" | "new-order" | "orders" | "history" | "menu" | "wallet";

interface ActiveOrder {
  dbId: number;
  id: string;
  customer: string;
  phone: string;
  address: string;
  value: number;
  status: OrderStatus;
  driver: string | null;
  eta: string;
  createdAt: string;
  x: number;
  y: number;
}

interface OrderLiveTracking {
  orderDbId: number;
  orderNumber: string;
  status: string;
  driverLat: number;
  driverLng: number;
  recordedAt: string;
  routePolyline: [number, number][];
}

type RestaurantGeo = {
  lat: number;
  lng: number;
} | null;

interface HistoryOrder {
  id: string;
  customer: string;
  address: string;
  value: number;
  status: "delivered" | "cancelled";
  driver: string;
  createdAt: string;
}

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  available: boolean;
  emoji: string;
}

interface WalletTx {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  createdAt: number;
}


/* ─────────── Status Config ─────────── */
const statusConfig: Record<OrderStatus, {
  label: string; color: string; bg: string;
  next?: OrderStatus; nextLabel?: string; progress: number;
}> = {
  pending:   { label: "بانتظار طيار",   color: "text-amber-600",   bg: "bg-amber-50 border-amber-100",   progress: 1 },
  assigned:  { label: "تم تعيين طيار",  color: "text-blue-600",    bg: "bg-blue-50 border-blue-100",     next: "picked",    nextLabel: "تأكيد الاستلام",  progress: 2 },
  picked:    { label: "تم الاستلام",     color: "text-purple-600",  bg: "bg-purple-50 border-purple-100", next: "on_way",    nextLabel: "بدء التوصيل",     progress: 3 },
  on_way:    { label: "في الطريق",       color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", next: "delivered", nextLabel: "تأكيد التسليم", progress: 4 },
  delivered: { label: "تم التسليم",      color: "text-gray-500",    bg: "bg-gray-50 border-gray-100",                                                             progress: 5 },
};

/* ─────────── Sidebar Items ─────────── */
const sidebarItems = [
  { key: "dashboard",  label: "لوحة التحكم",      icon: LayoutDashboard },
  { key: "new-order",  label: "طلب جديد",          icon: Plus },
  { key: "orders",     label: "الطلبات النشطة",     icon: Package },
  { key: "history",    label: "سجل الطلبات",        icon: History },
  { key: "menu",       label: "إدارة المنيو",       icon: UtensilsCrossed },
  { key: "wallet",     label: "المحفظة",            icon: Wallet },
];

export default function RestaurantPortal() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /* Orders state */
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [history, setHistory] = useState<HistoryOrder[]>([]);
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(sessionStorage.getItem("swift_restaurant_id"));
  const [restaurantName, setRestaurantName] = useState("مطعمك");
  const [restaurantGeo, setRestaurantGeo] = useState<RestaurantGeo>(null);
  const [orderTrackingMap, setOrderTrackingMap] = useState<Record<string, OrderLiveTracking>>({});

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  /* Menu state */
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [menuForm, setMenuForm] = useState({ name: "", category: "", price: "", emoji: "🍽️" });

  /* Search */
  const [orderSearch, setOrderSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  /* New order form */
  const [form, setForm] = useState({ name: "", phone: "", address: "", value: "", notes: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* Wallet filter */
  const [txFilter, setTxFilter] = useState<"all" | "credit" | "debit">("all");

  /* ──── Derived ──── */
  const pendingCount  = orders.filter(o => o.status === "pending").length;
  const todayHistory  = history.filter(h => h.createdAt.startsWith("اليوم"));
  const todayRevenue  = todayHistory.filter(h => h.status === "delivered").reduce((s, h) => s + h.value, 0);
  const successRate   = Math.round((history.filter(h => h.status === "delivered").length / (history.length || 1)) * 100);

  const filteredOrders  = orders.filter(o => !orderSearch || o.id.includes(orderSearch) || o.customer.includes(orderSearch));
  const filteredHistory = history.filter(h => !historySearch || h.id.includes(historySearch) || h.customer.includes(historySearch));
  const filteredMenu    = menuItems.filter(m => !menuSearch || m.name.includes(menuSearch) || m.category.includes(menuSearch));
  const filteredTxs     = walletTxs.filter(tx => txFilter === "all" || tx.type === txFilter);
  const menuCategories  = [...new Set(menuItems.map(m => m.category))];
  const walletBalance = walletTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const lastWalletUpdate = walletTxs.length
    ? new Date(Math.max(...walletTxs.map((tx) => tx.createdAt))).toLocaleString("ar-EG")
    : "—";
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayDeposits = walletTxs
    .filter((tx) => tx.type === "credit" && tx.createdAt >= todayStart.getTime())
    .reduce((sum, tx) => sum + tx.amount, 0);
  const todayFees = Math.abs(
    walletTxs
      .filter((tx) => tx.type === "debit" && tx.createdAt >= todayStart.getTime())
      .reduce((sum, tx) => sum + tx.amount, 0),
  );

  const mapOrder = (row: any): ActiveOrder => ({
    dbId: Number(row.id ?? 0),
    id: row.external_id,
    customer: row.customer_name,
    phone: row.customer_phone,
    address: row.customer_address,
    value: Number(row.fare ?? 0),
    status: row.status,
    driver: row.drivers?.name ?? null,
    eta: "—",
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString("ar-EG") : "—",
    x: Number(row.customer_latitude ?? 30.0444),
    y: Number(row.customer_longitude ?? 31.2357),
  });

  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://driver-master-api.vercel.app/api").replace(/\/$/, "");

  const loadLiveTracking = async (currentOrders: ActiveOrder[]) => {
    const candidateOrders = currentOrders.filter((o) =>
      ["assigned", "picked", "on_way"].includes(o.status) && Number.isFinite(o.dbId) && o.dbId > 0,
    );

    if (!candidateOrders.length) {
      setOrderTrackingMap({});
      return;
    }

    const results = await Promise.all(
      candidateOrders.map(async (order) => {
        try {
          const res = await fetch(`${API_BASE_URL}/orders/${order.dbId}/tracking`);
          if (!res.ok) return null;
          const data = await res.json();
          if (!data?.trackingAvailable || !data?.driverLocation) return null;

          const polyline: [number, number][] = Array.isArray(data?.route?.polyline)
            ? data.route.polyline
                .map((point: any) => {
                  if (!Array.isArray(point) || point.length !== 2) return null;
                  const lng = Number(point[0]);
                  const lat = Number(point[1]);
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                  return [lat, lng] as [number, number];
                })
                .filter(Boolean)
            : [];

          return {
            orderNumber: order.id,
            data: {
              orderDbId: order.dbId,
              orderNumber: order.id,
              status: data.status,
              driverLat: Number(data.driverLocation.latitude),
              driverLng: Number(data.driverLocation.longitude),
              recordedAt: String(data.driverLocation.recordedAt ?? ""),
              routePolyline: polyline,
            } as OrderLiveTracking,
          };
        } catch {
          return null;
        }
      }),
    );

    const nextMap: Record<string, OrderLiveTracking> = {};
    for (const item of results) {
      if (!item) continue;
      nextMap[item.orderNumber] = item.data;
    }
    setOrderTrackingMap(nextMap);
  };

  useEffect(() => {
    if (section !== "orders") return;
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [restaurantGeo?.lat ?? 30.0444, restaurantGeo?.lng ?? 31.2357],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      routesLayerRef.current = null;
    };
  }, [section, restaurantGeo?.lat, restaurantGeo?.lng]);

  useEffect(() => {
    if (section !== "orders") return;
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const routesLayer = routesLayerRef.current;
    if (!map || !markersLayer || !routesLayer) return;

    markersLayer.clearLayers();
    routesLayer.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    if (restaurantGeo) {
      const restIcon = L.divIcon({
        className: "",
        html: `<div style="width:34px;height:34px;border-radius:50%;background:#f97316;border:3px solid #fff;box-shadow:0 4px 12px rgba(249,115,22,.45);display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;">🍽️</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([restaurantGeo.lat, restaurantGeo.lng], { icon: restIcon })
        .addTo(markersLayer)
        .bindPopup(`<div dir="rtl"><b>${restaurantName}</b><br/>موقع المطعم</div>`);
      bounds.push([restaurantGeo.lat, restaurantGeo.lng]);
    }

    filteredOrders.forEach((order) => {
      if (!Number.isFinite(order.x) || !Number.isFinite(order.y)) return;
      const orderLat = order.x;
      const orderLng = order.y;

      const statusColor =
        order.status === "on_way"
          ? "#10b981"
          : order.status === "picked"
            ? "#a855f7"
            : order.status === "assigned"
              ? "#3b82f6"
              : "#f59e0b";

      const customerIcon = L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;border-radius:50%;background:${statusColor};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker([orderLat, orderLng], { icon: customerIcon })
        .addTo(markersLayer)
        .bindPopup(`<div dir="rtl"><b>${order.id}</b><br/>${order.customer}<br/>${order.address}</div>`);

      bounds.push([orderLat, orderLng]);

      const tracking = orderTrackingMap[order.id];
      if (tracking && Number.isFinite(tracking.driverLat) && Number.isFinite(tracking.driverLng)) {
        const driverIcon = L.divIcon({
          className: "",
          html: `<div style="width:26px;height:26px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 3px 10px rgba(37,99,235,.45);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;">🛵</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        L.marker([tracking.driverLat, tracking.driverLng], { icon: driverIcon })
          .addTo(markersLayer)
          .bindPopup(
            `<div dir="rtl"><b>الطيار</b><br/>${tracking.orderNumber}<br/>${new Date(tracking.recordedAt || Date.now()).toLocaleTimeString("ar-EG")}</div>`,
          );

        bounds.push([tracking.driverLat, tracking.driverLng]);

        const routePoints = tracking.routePolyline.length
          ? tracking.routePolyline
          : [
              [tracking.driverLat, tracking.driverLng] as [number, number],
              [orderLat, orderLng] as [number, number],
            ];

        L.polyline(routePoints, {
          color: "#22c55e",
          weight: 3,
          opacity: 0.7,
          dashArray: "7 5",
        }).addTo(routesLayer);
      }
    });

    if (bounds.length) {
      const group = L.latLngBounds(bounds);
      map.fitBounds(group, { padding: [30, 30], maxZoom: 14 });
    }
  }, [section, filteredOrders, orderTrackingMap, restaurantGeo, restaurantName]);

  useEffect(() => {
    if (!orders.length) {
      setOrderTrackingMap({});
      return;
    }

    let stopped = false;
    const refresh = async () => {
      await loadLiveTracking(orders);
    };

    void refresh();
    const timer = setInterval(() => {
      if (stopped) return;
      void refresh();
    }, 10000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [orders]);

  const reloadFromDb = useMemo(() => async () => {
    if (!supabase) return;

    let currentRestaurantId = restaurantId;
    if (!currentRestaurantId) {
      const { data: firstRestaurant } = await supabase
        .from("restaurants")
        .select("id,name")
        .limit(1)
        .maybeSingle();

      if (!firstRestaurant?.id) return;
      currentRestaurantId = firstRestaurant.id;
      setRestaurantId(firstRestaurant.id);
      setRestaurantName(firstRestaurant.name ?? "مطعمك");
      sessionStorage.setItem("swift_restaurant_id", firstRestaurant.id);
    }

    const [profileRes, ordersRes, menuRes, walletRes] = await Promise.all([
      supabase
        .from("restaurants")
        .select("name,latitude,longitude")
        .eq("id", currentRestaurantId)
        .maybeSingle(),
      supabase
        .from("orders")
        .select("id,external_id,customer_name,customer_phone,customer_address,customer_latitude,customer_longitude,fare,status,created_at,driver_id,drivers(name)")
        .eq("restaurant_id", currentRestaurantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("menu_items")
        .select("id,name,category,price,available,emoji")
        .eq("restaurant_id", currentRestaurantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("wallet_transactions")
        .select("id,amount,type,description,created_at")
        .eq("restaurant_id", currentRestaurantId)
        .order("created_at", { ascending: false }),
    ]);

    if (!profileRes.error && profileRes.data) {
      if (profileRes.data.name) {
        setRestaurantName(profileRes.data.name);
      }

      const lat = Number(profileRes.data.lat ?? profileRes.data.latitude);
      const lat = Number(profileRes.data.latitude);
      const lng = Number(profileRes.data.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setRestaurantGeo({ lat, lng });
      }
    }

    if (!ordersRes.error && ordersRes.data) {
      const active = ordersRes.data.filter((o: any) => ["pending", "assigned", "picked", "on_way"].includes(o.status));
      const done = ordersRes.data.filter((o: any) => ["delivered", "cancelled"].includes(o.status));

      setOrders(active.map(mapOrder));
      setHistory(
        done.map((o: any) => ({
          id: o.external_id,
          customer: o.customer_name,
          address: o.customer_address,
          value: Number(o.fare ?? 0),
          status: o.status,
          driver: o.drivers?.name ?? "—",
          createdAt: o.created_at ? new Date(o.created_at).toLocaleString("ar-EG") : "—",
        })),
      );
    }

    if (!menuRes.error && menuRes.data) {
      setMenuItems(
        menuRes.data.map((m: any) => ({
          id: Number.parseInt(String(m.id).replace(/\D/g, "").slice(-9) || "0", 10) || Date.now(),
          name: m.name,
          category: m.category,
          price: Number(m.price ?? 0),
          available: Boolean(m.available),
          emoji: m.emoji ?? "🍽️",
        })),
      );
    }

    if (!walletRes.error && walletRes.data) {
      setWalletTxs(
        walletRes.data.map((w: any, idx: number) => ({
          id: idx + 1,
          date: w.created_at ? new Date(w.created_at).toLocaleString("ar-EG") : "—",
          description: w.description,
          amount: Number(w.amount ?? 0) * (w.type === "debit" ? -1 : 1),
          type: w.type,
          createdAt: w.created_at ? new Date(w.created_at).getTime() : 0,
        })),
      );
    }
  }, [restaurantId]);

  useEffect(() => {
    void reloadFromDb();
    const t = setInterval(() => {
      void reloadFromDb();
    }, 5000);
    return () => clearInterval(t);
  }, [reloadFromDb]);

  /* ──── Submit new order ──── */
  const submitOrder = async () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim())  errors.name    = "مطلوب";
    if (!form.phone.trim()) errors.phone   = "مطلوب";
    if (!form.address.trim()) errors.address = "مطلوب";
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0) errors.value = "أدخل قيمة صحيحة";
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    if (!supabase || !restaurantId) {
      toast.error("قاعدة البيانات غير متصلة");
      return;
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    try {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          external_id: orderNumber,
          restaurant_id: restaurantId,
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          customer_address: form.address.trim(),
          fare: Number(form.value),
          status: "pending",
        });

      if (error) {
        console.error("Order creation error:", error);
        toast.error(`فشل إنشاء الطلب: ${error.message}`);
        return;
      }

      void reloadFromDb();
      setForm({ name: "", phone: "", address: "", value: "", notes: "" });
      setFormErrors({});
      setSection("orders");
      toast.success(`✅ تم إنشاء الطلب ${orderNumber}`);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("خطأ غير متوقع عند إنشاء الطلب");
    }
  };

  /* ──── Advance status ──── */
  const advanceStatus = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const cfg = statusConfig[order.status];
    if (!cfg.next) return;

    if (!supabase) return;

    supabase
      .from("orders")
      .update({ status: cfg.next })
      .eq("external_id", orderId)
      .then(({ error }) => {
        if (error) {
          toast.error("فشل تحديث حالة الطلب");
          return;
        }
        void reloadFromDb();
        toast.success(`تم تحديث حالة الطلب ${order.id} إلى: ${statusConfig[cfg.next!].label}`);
      });
  };

  /* ──── Menu CRUD ──── */
  const toggleAvailability = (id: number) => {
    if (!supabase || !restaurantId) return;
    const item = menuItems.find((m) => m.id === id);
    if (!item) return;

    supabase
      .from("menu_items")
      .update({ available: !item.available })
      .eq("restaurant_id", restaurantId)
      .eq("name", item.name)
      .then(() => void reloadFromDb());
  };
  const deleteMenuItem = (id: number) => {
    if (!supabase || !restaurantId) return;
    const item = menuItems.find((m) => m.id === id);
    if (!item) return;

    supabase
      .from("menu_items")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("name", item.name)
      .then(({ error }) => {
        if (!error) {
          void reloadFromDb();
          toast.success("تم حذف الصنف");
        }
      });
  };
  const openAddMenu = () => {
    setMenuForm({ name: "", category: "", price: "", emoji: "🍽️" });
    setEditingMenuId(null);
    setShowMenuModal(true);
  };
  const openEditMenu = (item: MenuItem) => {
    setMenuForm({ name: item.name, category: item.category, price: String(item.price), emoji: item.emoji });
    setEditingMenuId(item.id);
    setShowMenuModal(true);
  };
  const saveMenuItem = () => {
    if (!menuForm.name || !menuForm.category || !menuForm.price) { toast.error("يرجى ملء جميع الحقول"); return; }
    if (!supabase || !restaurantId) {
      toast.error("قاعدة البيانات غير متصلة");
      return;
    }

    const existingItem = editingMenuId ? menuItems.find((m) => m.id === editingMenuId) : null;
    const payload = {
      restaurant_id: restaurantId,
      name: menuForm.name,
      category: menuForm.category,
      price: Number(menuForm.price),
      emoji: menuForm.emoji,
      available: true,
    };

    const action = existingItem
      ? supabase
          .from("menu_items")
          .update(payload)
          .eq("restaurant_id", restaurantId)
          .eq("name", existingItem.name)
      : supabase.from("menu_items").insert(payload);

    action.then(({ error }) => {
      if (error) {
        toast.error("فشل حفظ الصنف");
        return;
      }
      void reloadFromDb();
      toast.success(existingItem ? "تم تحديث الصنف" : "تم إضافة صنف جديد");
      setShowMenuModal(false);
      setMenuForm({ name: "", category: "", price: "", emoji: "🍽️" });
      setEditingMenuId(null);
    });
  };

  /* ─────────── Render ─────────── */
  return (
    <div className="min-h-screen flex bg-[#f5f6fa]" dir="rtl">

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ═══════════ Sidebar ═══════════ */}
      <aside className={`
        fixed inset-y-0 right-0 w-64 bg-white border-l border-border flex flex-col z-50 transition-transform duration-300
        lg:relative lg:translate-x-0 lg:z-auto lg:shrink-0
        ${mobileSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-bl from-orange-400 to-orange-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{restaurantName}</div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> متصل
              </div>
            </div>
          </div>
          <button onClick={() => setMobileSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {sidebarItems.map(item => (
            <button
              key={item.key}
              onClick={() => setSection(item.key as Section)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                section === item.key
                  ? "bg-orange-50 text-orange-700 border border-orange-100"
                  : "text-muted-foreground hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {item.key === "orders" && pendingCount > 0 && (
                <span className="mr-auto bg-red-500 text-white text-[9px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-bl from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs" style={{ fontWeight: 700 }}>م</div>
            <div>
              <div className="text-sm" style={{ fontWeight: 500 }}>{restaurantName}</div>
              <div className="text-xs text-muted-foreground">مدير المطعم</div>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-gray-50 transition-all"
          >
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ═══════════ Main ═══════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="h-14 md:h-16 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-gray-50 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm md:text-base" style={{ fontWeight: 600 }}>
                {sidebarItems.find(s => s.key === section)?.label}
              </h2>
              <div className="text-[10px] md:text-xs text-muted-foreground">{restaurantName} — بوابة الإدارة</div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> مزامنة مباشرة
            </div>
            <button
              onClick={() => setSection("wallet")}
              className="flex items-center gap-2 bg-gradient-to-l from-emerald-50 to-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-700" style={{ fontWeight: 600 }}>{walletBalance.toLocaleString("ar-EG")} ج.م</span>
            </button>
            <button className="relative p-2 rounded-xl hover:bg-gray-50">
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 lg:pb-6">

          {/* ╔══════════════════════════════╗ */}
          {/* ║       DASHBOARD              ║ */}
          {/* ╚══════════════════════════════╝ */}
          {section === "dashboard" && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: "طلبات اليوم",  value: orders.length + todayHistory.length, icon: Package,    color: "orange",  change: "+٨%" },
                  { label: "إيرادات اليوم", value: `${todayRevenue + orders.reduce((s,o)=>s+o.value,0)} ج.م`, icon: DollarSign, color: "emerald", change: "+١٢%" },
                  { label: "نشطة الآن",    value: orders.filter(o => o.status !== "pending").length, icon: Truck, color: "blue", change: "" },
                  { label: "نسبة النجاح",  value: `${successRate}%`, icon: TrendingUp, color: "emerald", change: "+٢%" },
                ].map((kpi, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-border hover:shadow-md hover:shadow-gray-100 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2.5 rounded-xl border ${
                        kpi.color === "orange"  ? "bg-orange-50 border-orange-100"   :
                        kpi.color === "emerald" ? "bg-emerald-50 border-emerald-100" :
                        "bg-blue-50 border-blue-100"
                      }`}>
                        <kpi.icon className={`w-5 h-5 ${
                          kpi.color === "orange"  ? "text-orange-500"  :
                          kpi.color === "emerald" ? "text-emerald-600" :
                          "text-blue-600"
                        }`} />
                      </div>
                      {kpi.change && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          kpi.color === "orange"  ? "bg-orange-50 text-orange-600"   :
                          kpi.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                          "bg-blue-50 text-blue-600"
                        }`}>{kpi.change}</span>
                      )}
                    </div>
                    <div className="text-2xl mb-1" style={{ fontWeight: 700 }}>{kpi.value}</div>
                    <div className="text-sm text-muted-foreground">{kpi.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent orders */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-border">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 style={{ fontWeight: 600 }}>الطلبات النشطة</h3>
                    <button onClick={() => setSection("orders")} className="text-xs text-orange-600 flex items-center gap-1 hover:text-orange-700">
                      عرض الكل <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {orders.length === 0
                    ? <div className="p-8 text-center text-muted-foreground text-sm">لا توجد طلبات نشطة</div>
                    : <div className="divide-y divide-border">
                      {orders.slice(0, 5).map(order => {
                        const st = statusConfig[order.status];
                        return (
                          <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>
                                {order.id.split("-")[1]}
                              </div>
                              <div>
                                <div className="text-sm" style={{ fontWeight: 500 }}>{order.customer}</div>
                                <div className="text-xs text-muted-foreground">{order.address}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">{order.value} ج.م</span>
                              <span className={`text-xs px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>{st.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  }
                </div>

                {/* Quick actions + Wallet card */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-border p-5">
                    <h3 style={{ fontWeight: 600 }} className="mb-4">إجراءات سريعة</h3>
                    <div className="space-y-2">
                      <button onClick={() => setSection("new-order")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500 text-white text-sm hover:bg-orange-600 transition-colors">
                        <Plus className="w-4 h-4" /> إنشاء طلب جديد
                      </button>
                      <button onClick={() => setSection("orders")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 text-gray-700 text-sm hover:bg-gray-100 transition-colors border border-border">
                        <Eye className="w-4 h-4" /> متابعة الطلبات
                      </button>
                      <button onClick={() => setSection("menu")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 text-gray-700 text-sm hover:bg-gray-100 transition-colors border border-border">
                        <UtensilsCrossed className="w-4 h-4" /> إدارة المنيو
                      </button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-bl from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm">رصيد المحفظة</span>
                    </div>
                    <div className="text-3xl mb-1" style={{ fontWeight: 700 }}>{walletBalance.toLocaleString("ar-EG")} ج.م</div>
                    <button onClick={() => setSection("wallet")} className="text-xs text-white/70 hover:text-white flex items-center gap-1 mt-2 transition-colors">
                      عرض المعاملات <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ╔══════════════════════════════╗ */}
          {/* ║       NEW ORDER              ║ */}
          {/* ╚══════════════════════════════╝ */}
          {section === "new-order" && (
            <div className="max-w-xl">
              <div className="bg-white rounded-2xl border border-border p-6">
                <h2 className="text-lg mb-6 flex items-center gap-2" style={{ fontWeight: 600 }}>
                  <Package className="w-5 h-5 text-orange-600" />
                  إنشاء طلب توصيل جديد
                </h2>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm mb-1.5 text-muted-foreground">اسم العميل *</label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        value={form.name}
                        onChange={e => { setForm({ ...form, name: e.target.value }); setFormErrors(p => ({ ...p, name: "" })); }}
                        placeholder="أدخل اسم العميل"
                        className={`w-full pr-10 pl-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none text-sm transition-all ${formErrors.name ? "border-red-400" : "border-border focus:border-orange-500"}`}
                      />
                      {formErrors.name && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.name}</span>}
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm mb-1.5 text-muted-foreground">رقم الهاتف *</label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        value={form.phone}
                        onChange={e => { setForm({ ...form, phone: e.target.value }); setFormErrors(p => ({ ...p, phone: "" })); }}
                        placeholder="٠١٠XXXXXXXX"
                        className={`w-full pr-10 pl-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none text-sm transition-all ${formErrors.phone ? "border-red-400" : "border-border focus:border-orange-500"}`}
                      />
                      {formErrors.phone && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.phone}</span>}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm mb-1.5 text-muted-foreground">عنوان التوصيل *</label>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                      <textarea
                        value={form.address}
                        onChange={e => { setForm({ ...form, address: e.target.value }); setFormErrors(p => ({ ...p, address: "" })); }}
                        placeholder="الحي، الشارع، رقم المبنى، الدور"
                        rows={3}
                        className={`w-full pr-10 pl-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none text-sm resize-none transition-all ${formErrors.address ? "border-red-400" : "border-border focus:border-orange-500"}`}
                      />
                      {formErrors.address && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.address}</span>}
                    </div>
                  </div>

                  {/* Value */}
                  <div>
                    <label className="block text-sm mb-1.5 text-muted-foreground">قيمة الطلب (ج.م) *</label>
                    <div className="relative">
                      <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        value={form.value}
                        onChange={e => { setForm({ ...form, value: e.target.value }); setFormErrors(p => ({ ...p, value: "" })); }}
                        placeholder="0.00"
                        type="number"
                        min="0"
                        className={`w-full pr-10 pl-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none text-sm transition-all ${formErrors.value ? "border-red-400" : "border-border focus:border-orange-500"}`}
                      />
                      {formErrors.value && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.value}</span>}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm mb-1.5 text-muted-foreground">ملاحظات (اختياري)</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="أي تعليمات خاصة بالتوصيل..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-sm resize-none transition-all"
                    />
                  </div>

                  <button
                    onClick={submitOrder}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-l from-orange-500 to-orange-600 text-white flex items-center justify-center gap-2 hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25"
                  >
                    <Send className="w-4 h-4" />
                    طلب التوصيل الآن
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ╔══════════════════════════════╗ */}
          {/* ║       ACTIVE ORDERS          ║ */}
          {/* ╚══════════════════════════════╝ */}
          {section === "orders" && (
            <div className="space-y-5">
              {/* Top bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    placeholder="بحث بالعميل أو رقم الطلب..."
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    className="pr-9 pl-4 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:border-orange-500 w-64"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(statusConfig) as [OrderStatus, typeof statusConfig[OrderStatus]][]).map(([key, st]) => {
                    const cnt = orders.filter(o => o.status === key).length;
                    if (!cnt) return null;
                    return (
                      <span key={key} className={`text-xs px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>
                        {st.label} ({cnt})
                      </span>
                    );
                  })}
                </div>
                <button onClick={() => setSection("new-order")} className="mr-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm hover:bg-orange-600 transition-colors">
                  <Plus className="w-4 h-4" /> طلب جديد
                </button>
              </div>

              {/* Mini map */}
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 style={{ fontWeight: 600 }} className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-600" /> خريطة الطلبات المباشرة
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> تحديث لحظي
                  </div>
                </div>
                <div className="relative h-72 bg-slate-900 overflow-hidden">
                  <div ref={mapContainerRef} className="absolute inset-0" />

                  <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-[450]">
                    {[
                      { color: "bg-amber-400", label: "معلق" },
                      { color: "bg-blue-500", label: "معيّن" },
                      { color: "bg-purple-500", label: "استلام" },
                      { color: "bg-emerald-500", label: "في الطريق" },
                    ].map((l) => (
                      <div key={l.label} className="flex items-center gap-1 bg-black/65 text-white px-2 py-1 rounded-full text-[10px]">
                        <div className={`w-2 h-2 rounded-full ${l.color}`} />
                        {l.label}
                      </div>
                    ))}
                    <div className="flex items-center gap-1 bg-black/65 text-emerald-300 px-2 py-1 rounded-full text-[10px]">
                      🛵 مواقع الطيارين الحية: {Object.keys(orderTrackingMap).length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders cards */}
              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-border p-12 text-center">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <div className="text-muted-foreground">لا توجد طلبات نشطة</div>
                  <button onClick={() => setSection("new-order")} className="mt-3 text-sm text-orange-600 hover:text-orange-700">إنشاء طلب جديد ←</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredOrders.map(order => {
                    const st = statusConfig[order.status];
                    const steps = ["pending", "assigned", "picked", "on_way", "delivered"];
                    const stepIdx = steps.indexOf(order.status);
                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-border p-5 hover:shadow-md transition-all">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-orange-600" style={{ fontWeight: 700 }}>{order.id}</span>
                              <span className={`text-xs px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>{st.label}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{order.createdAt}</div>
                          </div>
                          <div className="text-base" style={{ fontWeight: 700 }}>{order.value} ج.م</div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span style={{ fontWeight: 500 }}>{order.customer}</span>
                            <span className="text-muted-foreground text-xs">— {order.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 shrink-0" /> {order.address}
                          </div>
                          {order.driver && (
                            <div className="flex items-center gap-2 text-sm">
                              <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
                              {order.driver}
                              {order.eta !== "—" && <span className="text-xs text-muted-foreground">— وصول خلال {order.eta}</span>}
                            </div>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-1 mb-4">
                          {steps.map((_, i) => (
                            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= stepIdx ? "bg-orange-500" : "bg-gray-100"}`} />
                          ))}
                        </div>

                        {/* Action */}
                        {st.next ? (
                          <button
                            onClick={() => advanceStatus(order.id)}
                            className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> {st.nextLabel}
                          </button>
                        ) : order.status === "pending" ? (
                          <div className="text-center text-xs text-muted-foreground py-2">بانتظار تعيين طيار من الموزع...</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ╔══════════════════════════════╗ */}
          {/* ║       HISTORY                ║ */}
          {/* ╚══════════════════════════════╝ */}
          {section === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    placeholder="بحث برقم الطلب أو اسم العميل..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="pr-9 pl-4 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:border-orange-500 w-72"
                  />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>الإجمالي: <span style={{ fontWeight: 600 }}>{filteredHistory.length}</span></span>
                  <span>•</span>
                  <span className="text-emerald-600">مكتمل: <span style={{ fontWeight: 600 }}>{filteredHistory.filter(h => h.status === "delivered").length}</span></span>
                  <span>•</span>
                  <span className="text-red-500">ملغي: <span style={{ fontWeight: 600 }}>{filteredHistory.filter(h => h.status === "cancelled").length}</span></span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      {["رقم الطلب", "العميل", "العنوان", "الطيار", "القيمة", "الحالة", "التاريخ"].map(h => (
                        <th key={h} className="text-right py-3.5 px-5 text-muted-foreground" style={{ fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0
                      ? <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">لا توجد نتائج</td></tr>
                      : filteredHistory.map(order => (
                        <tr key={order.id} className="border-b border-border last:border-b-0 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-5 text-orange-600" style={{ fontWeight: 600 }}>{order.id}</td>
                          <td className="py-3.5 px-5" style={{ fontWeight: 500 }}>{order.customer}</td>
                          <td className="py-3.5 px-5 text-muted-foreground">{order.address}</td>
                          <td className="py-3.5 px-5 text-muted-foreground">{order.driver}</td>
                          <td className="py-3.5 px-5" style={{ fontWeight: 600 }}>{order.value} ج.م</td>
                          <td className="py-3.5 px-5">
                            {order.status === "delivered"
                              ? <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs border border-emerald-100"><CheckCircle2 className="w-3 h-3" /> تم التسليم</span>
                              : <span className="inline-flex items-center gap-1.5 text-red-500 bg-red-50 px-2.5 py-1 rounded-full text-xs border border-red-100"><X className="w-3 h-3" /> ملغي</span>
                            }
                          </td>
                          <td className="py-3.5 px-5 text-muted-foreground text-xs">{order.createdAt}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ╔══════════════════════════════╗ */}
          {/* ║       MENU                   ║ */}
          {/* ╚══════════════════════════════╝ */}
          {section === "menu" && (
            <div className="space-y-5">
              {/* Top bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    placeholder="بحث في المنيو..."
                    value={menuSearch}
                    onChange={e => setMenuSearch(e.target.value)}
                    className="pr-9 pl-4 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:border-orange-500 w-64"
                  />
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>متاح: <span className="text-emerald-600" style={{ fontWeight: 600 }}>{menuItems.filter(m => m.available).length}</span></span>
                  <span>•</span>
                  <span>غير متاح: <span className="text-red-500" style={{ fontWeight: 600 }}>{menuItems.filter(m => !m.available).length}</span></span>
                </div>
                <button
                  onClick={openAddMenu}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm hover:bg-orange-600 transition-colors"
                >
                  <Plus className="w-4 h-4" /> إضافة صنف
                </button>
              </div>

              {/* Items by category */}
              {menuCategories
                .filter(cat => filteredMenu.some(m => m.category === cat))
                .map(cat => (
                  <div key={cat}>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-sm" style={{ fontWeight: 600 }}>{cat}</h3>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">{filteredMenu.filter(m => m.category === cat).length} أصناف</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {filteredMenu.filter(m => m.category === cat).map(item => (
                        <div
                          key={item.id}
                          className={`bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${item.available ? "border-border" : "border-red-100 opacity-70"}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-2xl">
                              {item.emoji}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditMenu(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteMenuItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="text-sm mb-0.5" style={{ fontWeight: 600 }}>{item.name}</div>
                          <div className="text-orange-600 text-sm mb-3" style={{ fontWeight: 700 }}>{item.price} ج.م</div>
                          <button
                            onClick={() => toggleAvailability(item.id)}
                            className={`w-full py-1.5 rounded-xl text-xs transition-all border ${
                              item.available
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                                : "bg-red-50 text-red-500 border-red-100 hover:bg-red-100"
                            }`}
                          >
                            {item.available ? "✓ متاح" : "✗ غير متاح"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
              {filteredMenu.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <UtensilsCrossed className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  لا توجد عناصر
                </div>
              )}

              {/* Menu Modal */}
              {showMenuModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                    <div className="flex items-center justify-between mb-5">
                      <h3 style={{ fontWeight: 600 }}>{editingMenuId ? "تعديل الصنف" : "إضافة صنف جديد"}</h3>
                      <button onClick={() => setShowMenuModal(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-sm mb-1.5 text-muted-foreground">الإيموجي</label>
                          <input
                            value={menuForm.emoji}
                            onChange={e => setMenuForm({ ...menuForm, emoji: e.target.value })}
                            className="w-full px-3 py-3 rounded-xl border border-border bg-gray-50 focus:border-orange-500 outline-none text-xl text-center"
                          />
                        </div>
                        <div className="flex-[3]">
                          <label className="block text-sm mb-1.5 text-muted-foreground">اسم الصنف *</label>
                          <input
                            value={menuForm.name}
                            onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                            placeholder="اسم الصنف"
                            className="w-full px-4 py-3 rounded-xl border border-border bg-gray-50 focus:border-orange-500 outline-none text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm mb-1.5 text-muted-foreground">الفئة *</label>
                        <input
                          value={menuForm.category}
                          onChange={e => setMenuForm({ ...menuForm, category: e.target.value })}
                          placeholder="مثال: ساندويتشات، مشروبات"
                          list="menu-cats"
                          className="w-full px-4 py-3 rounded-xl border border-border bg-gray-50 focus:border-orange-500 outline-none text-sm"
                        />
                        <datalist id="menu-cats">
                          {menuCategories.map(c => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-sm mb-1.5 text-muted-foreground">السعر (ج.م) *</label>
                        <input
                          value={menuForm.price}
                          onChange={e => setMenuForm({ ...menuForm, price: e.target.value })}
                          placeholder="0.00"
                          type="number"
                          min="0"
                          className="w-full px-4 py-3 rounded-xl border border-border bg-gray-50 focus:border-orange-500 outline-none text-sm"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowMenuModal(false)} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-gray-50 transition-colors">
                          إلغاء
                        </button>
                        <button onClick={saveMenuItem} className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-sm hover:bg-orange-600 transition-colors">
                          {editingMenuId ? "حفظ التعديلات" : "إضافة الصنف"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ╔══════════════════════════════╗ */}
          {/* ║       WALLET                 ║ */}
          {/* ╚══════════════════════════════╝ */}
          {section === "wallet" && (
            <div className="space-y-5">
              {/* Balance Card */}
              <div className="bg-gradient-to-l from-emerald-500 to-emerald-700 rounded-2xl p-7 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 opacity-80 mb-3">
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm">رصيد المحفظة الحالي</span>
                    </div>
                    <div className="text-4xl mb-1" style={{ fontWeight: 700 }}>{walletBalance.toLocaleString("ar-EG")} ج.م</div>
                    <div className="text-sm opacity-60 mt-1">آخر تحديث: {lastWalletUpdate}</div>
                  </div>
                  <div className="opacity-10">
                    <Wallet className="w-20 h-20" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {[
                    { label: "إجمالي الإيداعات اليوم", value: `${todayDeposits.toLocaleString("ar-EG")} ج.م` },
                    { label: "رسوم التوصيل اليوم",      value: `${todayFees.toLocaleString("ar-EG")} ج.م` },
                    { label: "طلبات مفوترة اليوم",      value: `${todayHistory.filter(h => h.status === "delivered").length} طلب` },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/15 rounded-xl px-4 py-3 text-center">
                      <div className="text-xs opacity-80 mb-1">{s.label}</div>
                      <div style={{ fontWeight: 700 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions */}
              <div className="bg-white rounded-2xl border border-border">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 style={{ fontWeight: 600 }}>سجل المعاملات</h3>
                  <div className="flex gap-2">
                    {([["all", "الكل"], ["credit", "إيداعات"], ["debit", "خصومات"]] as const).map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setTxFilter(val)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                          txFilter === val
                            ? val === "credit" ? "bg-emerald-500 text-white" : val === "debit" ? "bg-red-500 text-white" : "bg-gray-800 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {filteredTxs.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          tx.type === "credit" ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"
                        }`}>
                          <ArrowUpRight className={`w-4 h-4 ${tx.type === "credit" ? "text-emerald-600" : "text-red-500 rotate-180"}`} />
                        </div>
                        <div>
                          <div className="text-sm" style={{ fontWeight: 500 }}>{tx.description}</div>
                          <div className="text-xs text-muted-foreground">{tx.date}</div>
                        </div>
                      </div>
                      <div className={`text-sm ${tx.type === "credit" ? "text-emerald-600" : "text-red-500"}`} style={{ fontWeight: 700 }}>
                        {tx.type === "credit" ? "+" : ""}{tx.amount} ج.م
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ═══════════ Mobile Bottom Nav ═══════════ */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-border h-16 flex items-stretch lg:hidden z-30">
        {sidebarItems.map(item => (
          <button
            key={item.key}
            onClick={() => { setSection(item.key as Section); setMobileSidebarOpen(false); }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all ${
              section === item.key ? "text-orange-600" : "text-gray-400"
            }`}
          >
            <item.icon className={`w-4 h-4 transition-transform ${section === item.key ? "scale-110" : ""}`} />
            <span className="text-[8px]" style={{ fontWeight: section === item.key ? 600 : 400 }}>
              {item.label.replace("إدارة ", "").split(" ").pop()}
            </span>
            {item.key === "orders" && pendingCount > 0 && (
              <span className="absolute top-2 right-1/2 translate-x-3 bg-red-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
