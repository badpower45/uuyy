import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  LayoutDashboard, Store, Truck, CreditCard, DollarSign,
  Bell, Search, Zap, TrendingUp, Clock, CheckCircle2,
  LogOut, Menu, X, AlertTriangle, Star,
  ArrowUpRight, Package, Wallet, Eye, Ban,
  Plus, UserPlus, ChevronDown, KeyRound, Copy,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  getDrivers, saveDrivers, getRestaurants, saveRestaurants,
  addDriver, addRestaurant,
} from "../../lib/store";
import type { Driver, Restaurant, DriverRank, SubscriptionType, RestaurantStatus, DriverStatus } from "../../lib/store";
import { supabase } from "../../lib/supabase";

/* ─── Local types ─── */
type AdminSection = "overview" | "restaurants" | "drivers" | "subscriptions" | "finance";
interface Settlement { id: number; name: string; type: string; amount: number; status: "paid"|"unpaid"; date: string; }
interface WalletTx { amount: number; type: "credit" | "debit"; created_at: string; }
interface EarningTx { amount: number; cash_collected: number; commission: number; created_at: string; }
const subPlans = [
  { key:"basic",      label:"أساسي",   price:"٢٩٩ ج.م/شهر",   color:"gray",    features:["٥٠ طلب/يوم","تقارير أساسية","دعم بالبريد"] },
  { key:"pro",        label:"احترافي", price:"٧٩٩ ج.م/شهر",   color:"emerald", features:["٢٠٠ طلب/يوم","تقارير متقدمة","دعم فوري","API Access"] },
  { key:"enterprise", label:"مؤسسي",  price:"١,٩٩٩ ج.م/شهر", color:"amber",   features:["غير محدود","لوحة تحليلات","مدير حساب","API+Webhooks"] },
];

/* ─── Config ─── */
const rankCfg: Record<DriverRank,{ label:string; color:string; bg:string }> = {
  gold:  { label:"ذهبي",   color:"text-amber-700",  bg:"bg-amber-100 border-amber-200" },
  silver:{ label:"فضي",    color:"text-gray-600",   bg:"bg-gray-100 border-gray-200" },
  bronze:{ label:"برونزي", color:"text-orange-700", bg:"bg-orange-100 border-orange-200" },
};
const rStatusCfg: Record<RestaurantStatus,{ label:string; color:string; bg:string }> = {
  active:   { label:"نشط",     color:"text-emerald-700", bg:"bg-emerald-50 border-emerald-200" },
  inactive: { label:"غير نشط", color:"text-gray-600",    bg:"bg-gray-100 border-gray-200" },
  suspended:{ label:"موقوف",   color:"text-red-700",     bg:"bg-red-50 border-red-200" },
};
const dStatusCfg: Record<DriverStatus,{ label:string; color:string; dot:string }> = {
  available:{ label:"متاح",     color:"text-emerald-600", dot:"bg-emerald-500" },
  busy:     { label:"مشغول",    color:"text-blue-600",    dot:"bg-blue-500" },
  offline:  { label:"غير متصل", color:"text-gray-500",    dot:"bg-gray-400" },
};
const subCfg: Record<SubscriptionType,{ label:string; color:string; bg:string }> = {
  basic:     { label:"أساسي",   color:"text-gray-600",    bg:"bg-gray-100 border-gray-200" },
  pro:       { label:"احترافي", color:"text-emerald-700", bg:"bg-emerald-50 border-emerald-200" },
  enterprise:{ label:"مؤسسي",  color:"text-amber-700",   bg:"bg-amber-50 border-amber-200" },
};
const menuItems = [
  { key:"overview",      label:"لوحة التحكم", icon:LayoutDashboard },
  { key:"restaurants",   label:"المطاعم",     icon:Store },
  { key:"drivers",       label:"الطيارين",    icon:Truck },
  { key:"subscriptions", label:"الاشتراكات",  icon:CreditCard },
  { key:"finance",       label:"المالية",     icon:DollarSign },
];

/* ─── Tooltip ─── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl px-4 py-3 shadow-xl text-sm" dir="rtl">
      <div className="text-muted-foreground mb-1" style={{ fontWeight:500 }}>{label}</div>
      <div style={{ fontWeight:700 }}>{payload[0]?.value?.toLocaleString()} ج.م</div>
      <div className="text-muted-foreground text-xs">{payload[1]?.value} طلب</div>
    </div>
  );
};

/* ════════════════════════════════════════
   MODALS
════════════════════════════════════════ */
function DriverModal({ onClose, onSave }: { onClose:()=>void; onSave:(d:Driver)=>void | Promise<void> }) {
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [pin, setPin]         = useState("1234");
  const [rank, setRank]       = useState<DriverRank>("bronze");
  const [vehicle, setVehicle] = useState<"motorcycle"|"car">("motorcycle");
  const [saving, setSaving]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { toast.error("يرجى تعبئة جميع الحقول"); return; }

    try {
      setSaving(true);
      const d = await addDriver({ name:name.trim(), phone:phone.trim(), pin, rank, vehicleType:vehicle });
      await onSave(d);
      toast.success(`✅ تم تسجيل الطيار ${d.name} بنجاح!`);
      onClose();
    } catch (err: any) {
      toast.error("فشل حفظ الطيار في قاعدة البيانات", { description: err?.message ?? "تأكد من صلاحيات Supabase ثم حاول مرة أخرى" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in slide-in-from-bottom duration-200 sm:animate-none">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg" style={{ fontWeight:700 }}>تسجيل طيار جديد</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">الاسم</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="أحمد محمد"
              className="w-full px-4 py-3 rounded-xl border border-border bg-gray-50 outline-none focus:border-emerald-500 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1.5">رقم الهاتف</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01xxxxxxxxx" type="tel"
                className="w-full px-4 py-3 rounded-xl border border-border bg-gray-50 outline-none focus:border-emerald-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1.5">PIN الدخول</label>
              <input value={pin} onChange={e=>setPin(e.target.value)} placeholder="1234" maxLength={4} inputMode="numeric"
                className="w-full px-4 py-3 rounded-xl border border-border bg-gray-50 outline-none focus:border-emerald-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">الرتبة</label>
            <div className="flex gap-2">
              {(["bronze","silver","gold"] as const).map(r => (
                <button key={r} type="button" onClick={() => setRank(r)}
                  className={`flex-1 py-2.5 rounded-xl text-xs border transition-all ${rank===r ? `${rankCfg[r].bg} ${rankCfg[r].color}` : "border-border text-gray-500 hover:bg-gray-50"}`}
                  style={{ fontWeight: rank===r ? 600 : 400 }}>
                  {rankCfg[r].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">المركبة</label>
            <div className="flex gap-2">
              {[{ v:"motorcycle" as const, l:"دراجة نارية 🛵" }, { v:"car" as const, l:"سيارة 🚗" }].map(o => (
                <button key={o.v} type="button" onClick={() => setVehicle(o.v)}
                  className={`flex-1 py-2.5 rounded-xl text-xs border transition-all ${vehicle===o.v ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-border text-gray-500 hover:bg-gray-50"}`}
                  style={{ fontWeight: vehicle===o.v ? 600 : 400 }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-3.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontWeight:700 }}>
            {saving ? "جارٍ الحفظ..." : "✅ تسجيل الطيار"}
          </button>
        </form>
      </div>
    </div>
  );
}

function RestaurantModal({ onClose, onSave }: { onClose:()=>void; onSave:(r:Restaurant)=>void | Promise<void> }) {
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin]     = useState("1234");
  const [address, setAddress] = useState("");
  const [city, setCity]   = useState("القاهرة");
  const [sub, setSub]     = useState<SubscriptionType>("basic");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { toast.error("يرجى تعبئة جميع الحقول"); return; }

    try {
      setSaving(true);
      const r = await addRestaurant({ name:name.trim(), phone:phone.trim(), pin, address:address.trim(), city, subscription:sub });
      await onSave(r);
      toast.success(`✅ تم تسجيل ${r.name} بنجاح!`);
      onClose();
    } catch (err: any) {
      toast.error("فشل حفظ المطعم في قاعدة البيانات", { description: err?.message ?? "تأكد من صلاحيات Supabase ثم حاول مرة أخرى" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg" style={{ fontWeight:700 }}>تسجيل مطعم جديد</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">اسم المطعم</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="مطعم الشام"
              className="w-full px-4 py-3 rounded-xl border border-border bg-gray-50 outline-none focus:border-emerald-500 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1.5">رقم الهاتف</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01xxxxxxxxx" type="tel"
                className="w-full px-4 py-3 rounded-xl border border-border bg-gray-50 outline-none focus:border-emerald-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1.5">PIN الدخول</label>
              <input value={pin} onChange={e=>setPin(e.target.value)} placeholder="1234" maxLength={4} inputMode="numeric"
                className="w-full px-4 py-3 rounded-xl border border-border bg-gray-50 outline-none focus:border-emerald-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">العنوان</label>
            <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="شارع فيصل، الجيزة"
              className="w-full px-4 py-3 rounded-xl border border-border bg-gray-50 outline-none focus:border-emerald-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">المدينة</label>
            <div className="flex gap-2">
              {["القاهرة","الجيزة","الإسكندرية"].map(c => (
                <button key={c} type="button" onClick={() => setCity(c)}
                  className={`flex-1 py-2.5 rounded-xl text-xs border transition-all ${city===c ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-border text-gray-500 hover:bg-gray-50"}`}
                  style={{ fontWeight: city===c ? 600 : 400 }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">خطة الاشتراك</label>
            <div className="flex gap-2">
              {(["basic","pro","enterprise"] as const).map(s => (
                <button key={s} type="button" onClick={() => setSub(s)}
                  className={`flex-1 py-2.5 rounded-xl text-xs border transition-all ${sub===s ? `${subCfg[s].bg} ${subCfg[s].color}` : "border-border text-gray-500 hover:bg-gray-50"}`}
                  style={{ fontWeight: sub===s ? 600 : 400 }}>
                  {subCfg[s].label}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-3.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontWeight:700 }}>
            {saving ? "جارٍ الحفظ..." : "✅ تسجيل المطعم"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [section, setSection]             = useState<AdminSection>("overview");
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [drivers, setDrivers]             = useState<Driver[]>([]);
  const [restaurants, setRestaurants]     = useState<Restaurant[]>([]);
  const [settlements, setSettlements]     = useState<Settlement[]>([]);
  const [ordersStats, setOrdersStats]     = useState<Array<{ status: string; created_at: string; order_value: number }>>([]);
  const [walletTxs, setWalletTxs]         = useState<WalletTx[]>([]);
  const [earningTxs, setEarningTxs]       = useState<EarningTx[]>([]);
  const [restaurantCodes, setRestaurantCodes] = useState<Record<string, string>>({});
  const [searchDrivers, setSearchDrivers] = useState("");
  const [filterRank, setFilterRank]       = useState<"all"|DriverRank>("all");
  const [searchRest, setSearchRest]       = useState("");
  const [filterStatus, setFilterStatus]   = useState<"all"|RestaurantStatus>("all");
  const [settleSearch, setSettleSearch]   = useState("");
  const [showDriverModal, setShowDriverModal]     = useState(false);
  const [showRestModal, setShowRestModal]         = useState(false);

  const suggestRank = (ordersCount: number, rating: number): DriverRank => {
    if (ordersCount >= 180 && rating >= 4.7) return "gold";
    if (ordersCount >= 70 && rating >= 4.4) return "silver";
    return "bronze";
  };

  const fallbackSettlementsFromCache = (currentRestaurants: Restaurant[], currentDrivers: Driver[]): Settlement[] => ([
    ...currentRestaurants.map((r, idx) => ({
      id: idx + 1,
      name: r.name,
      type: "مطعم",
      amount: Math.abs(r.wallet),
      status: r.wallet > 0 ? "paid" : "unpaid",
      date: "—",
    } as Settlement)),
    ...currentDrivers.map((d, idx) => ({
      id: currentRestaurants.length + idx + 1,
      name: d.name,
      type: "طيار",
      amount: Math.abs(d.wallet),
      status: d.wallet >= 0 ? "paid" : "unpaid",
      date: "—",
    } as Settlement)),
  ]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("swift_restaurant_codes");
      if (raw) {
        setRestaurantCodes(JSON.parse(raw));
      }
    } catch {
      setRestaurantCodes({});
    }
  }, []);

  /* Load from store */
  const reload = async () => {
    const currentDrivers = getDrivers();
    const currentRestaurants = getRestaurants();
    const rankedDrivers = currentDrivers.map((d) => ({
      ...d,
      rank: suggestRank(d.orders, d.rating),
    }));
    const rankChanged = rankedDrivers.some((d, idx) => d.rank !== currentDrivers[idx]?.rank);
    if (rankChanged) {
      saveDrivers(rankedDrivers);
    }

    setDrivers(rankedDrivers);
    setRestaurants(currentRestaurants);
    setSettlements(fallbackSettlementsFromCache(currentRestaurants, rankedDrivers));

    if (!supabase) return;
    const [ordersRes, settlementsRes, walletRes, earningsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("status,created_at,fare")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("settlements")
        .select("id,entity_name,entity_type,amount,status,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("wallet_transactions")
        .select("amount,type,created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("earnings")
        .select("amount,cash_collected,commission,created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    if (!ordersRes.error && ordersRes.data) {
      setOrdersStats(
        ordersRes.data.map((o: any) => ({
          status: o.status,
          created_at: o.created_at,
          order_value: Number(o.fare ?? 0),
        })),
      );
    }

    if (!settlementsRes.error && settlementsRes.data?.length) {
      setSettlements(
        settlementsRes.data.map((s: any, idx: number) => ({
          id: Number.isFinite(Number(s.id)) ? Number(s.id) : idx + 1,
          name: s.entity_name ?? "—",
          type: s.entity_type === "restaurant" ? "مطعم" : "طيار",
          amount: Number(s.amount ?? 0),
          status: s.status === "paid" ? "paid" : "unpaid",
          date: s.created_at ? new Date(s.created_at).toLocaleDateString("ar-EG") : "—",
        })),
      );
    }

    if (!walletRes.error && walletRes.data) {
      setWalletTxs(
        walletRes.data.map((tx: any) => ({
          amount: Number(tx.amount ?? 0),
          type: tx.type === "debit" ? "debit" : "credit",
          created_at: tx.created_at,
        })),
      );
    }

    if (!earningsRes.error && earningsRes.data) {
      setEarningTxs(
        earningsRes.data.map((tx: any) => ({
          amount: Number(tx.amount ?? 0),
          cash_collected: Number(tx.cash_collected ?? 0),
          commission: Number(tx.commission ?? 0),
          created_at: tx.created_at,
        })),
      );
    }
  };
  useEffect(() => {
    void reload();
    const t = setInterval(() => {
      void reload();
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const orderStatusData = [
    { name:"مكتملة", value: ordersStats.filter((o) => o.status === "delivered").length, color:"#10b981" },
    { name:"في التوصيل", value: ordersStats.filter((o) => ["assigned", "picked", "on_way", "to_restaurant", "to_customer"].includes(o.status)).length, color:"#3b82f6" },
    { name:"معلقة", value: ordersStats.filter((o) => o.status === "pending").length, color:"#f59e0b" },
    { name:"ملغية", value: ordersStats.filter((o) => o.status === "cancelled").length, color:"#ef4444" },
  ];

  const revenueData = (() => {
    const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const now = new Date();
    const base = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      return {
        day: dayNames[d.getDay()],
        key: d.toISOString().slice(0, 10),
        revenue: 0,
        orders: 0,
      };
    });

    for (const o of ordersStats) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const hit = base.find((x) => x.key === key);
      if (!hit) continue;
      hit.orders += 1;
      if (o.status === "delivered") {
        hit.revenue += o.order_value;
      }
    }

    return base.map(({ key, ...rest }) => rest);
  })();

  /* Derived */
  const filteredDrivers = drivers.filter(d =>
    (!searchDrivers || d.name.includes(searchDrivers) || d.phone.includes(searchDrivers)) &&
    (filterRank === "all" || d.rank === filterRank)
  );
  const filteredRests = restaurants.filter(r =>
    (!searchRest || r.name.includes(searchRest) || r.city.includes(searchRest)) &&
    (filterStatus === "all" || r.status === filterStatus)
  );
  const filteredSettlements = settlements.filter(s => !settleSearch || s.name.includes(settleSearch));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyDelivered = ordersStats.filter(
    (o) => o.status === "delivered" && new Date(o.created_at).getTime() >= monthStart.getTime(),
  );
  const monthlyRevenue = monthlyDelivered.reduce((sum, o) => sum + o.order_value, 0);
  const monthlyCommission = monthlyRevenue * 0.05;
  const monthlyWalletCreditsFromWalletTx = walletTxs
    .filter((tx) => tx.type === "credit" && new Date(tx.created_at).getTime() >= monthStart.getTime())
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthlyWalletCreditsFromEarnings = earningTxs
    .filter((tx) => new Date(tx.created_at).getTime() >= monthStart.getTime())
    .reduce((sum, tx) => sum + tx.cash_collected, 0);

  const monthlyWalletCollected =
    monthlyWalletCreditsFromWalletTx > 0
      ? monthlyWalletCreditsFromWalletTx
      : monthlyWalletCreditsFromEarnings;

  const paySettlement = (id: number) => {
    setSettlements(p => p.map(s => s.id === id ? { ...s, status:"paid" } : s));
    const s = settlements.find(x => x.id === id);
    toast.success(`✅ تم تسوية حساب ${s?.name}`, { description:`${s?.amount.toLocaleString()} ج.م` });
  };

  const suspendRestaurant = (id: string) => {
    const updated = restaurants.map(r => r.id === id ? { ...r, status:"suspended" as const } : r);
    saveRestaurants(updated);
    setRestaurants(updated);
    toast.success("تم تعليق المطعم");
  };

  const updateRestaurantSubscription = (restaurantId: string, subscription: SubscriptionType) => {
    const updated = restaurants.map((r) =>
      r.id === restaurantId ? { ...r, subscription } : r,
    );
    setRestaurants(updated);
    saveRestaurants(updated);

    if (supabase) {
      void supabase
        .from("restaurants")
        .update({ subscription_type: subscription, updated_at: new Date().toISOString() })
        .eq("id", restaurantId);
    }

    toast.success("✅ تم تحديث خطة اشتراك المطعم");
  };

  const generateRestaurantCode = async (restaurantId: string, restaurantName: string) => {
    const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
    const code = `RST-${String(restaurantId).slice(0, 4).toUpperCase()}-${randomPart}`;
    const next = { ...restaurantCodes, [restaurantId]: code };
    setRestaurantCodes(next);
    localStorage.setItem("swift_restaurant_codes", JSON.stringify(next));

    try {
      await navigator.clipboard.writeText(code);
      toast.success(`✅ تم إنشاء كود ${restaurantName}`, { description: `تم نسخ الكود: ${code}` });
    } catch {
      toast.success(`✅ تم إنشاء كود ${restaurantName}`, { description: code });
    }
  };

  const nav = (s: AdminSection) => { setSection(s); setSidebarOpen(false); };

  /* ─── Overview ─── */
  const renderOverview = () => (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label:"المطاعم النشطة",   value:restaurants.filter(r=>r.status==="active").length,      icon:Store,      color:"emerald" },
          { label:"الطيارين النشطين", value:drivers.filter(d=>d.status!=="offline").length,          icon:Truck,      color:"blue" },
          { label:"إيرادات الأسبوع",  value:Math.round(revenueData.reduce((sum, d) => sum + d.revenue, 0)).toLocaleString("ar-EG"), icon:TrendingUp, color:"amber" },
          { label:"تسويات معلقة",     value:settlements.filter(s=>s.status==="unpaid").length,       icon:Clock,      color:"red" },
        ].map(kpi => {
          const c: Record<string,string> = {
            emerald:"bg-emerald-50 border-emerald-100 text-emerald-600",
            blue:"bg-blue-50 border-blue-100 text-blue-600",
            amber:"bg-amber-50 border-amber-100 text-amber-600",
            red:"bg-red-50 border-red-100 text-red-600",
          };
          return (
            <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-border hover:shadow-lg hover:shadow-gray-100 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl border ${c[kpi.color]}`}><kpi.icon className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl mb-1" style={{ fontWeight:700 }}>{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontWeight:600 }}>إيرادات الأسبوع</h3>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">آخر ٧ أيام</span>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={revenueData} margin={{ top:5,right:5,left:-20,bottom:0 }}>
              <defs>
                <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#eg)" />
              <Area type="monotone" dataKey="orders"  stroke="#3b82f6" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4">
          <h3 style={{ fontWeight:600 }} className="mb-4">توزيع الطلبات</h3>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                {orderStatusData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {orderStatusData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:d.color }} />
                <span className="text-[10px] text-muted-foreground">{d.name}</span>
                <span className="text-[10px] mr-auto" style={{ fontWeight:600 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent settlements */}
      <div className="bg-white rounded-2xl border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 style={{ fontWeight:600 }}>التسويات الأخيرة</h3>
          <button onClick={() => setSection("finance")} className="text-xs text-emerald-600 flex items-center gap-1">
            عرض الكل <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead><tr className="border-b border-border text-muted-foreground">
              {["الاسم","النوع","المبلغ","التاريخ","الحالة","إجراء"].map(h=>(
                <th key={h} className="text-right py-3 px-4" style={{ fontWeight:500 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {settlements.slice(0,5).map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                  <td className="py-3 px-4 whitespace-nowrap" style={{ fontWeight:500 }}>{s.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{s.type}</td>
                  <td className="py-3 px-4 whitespace-nowrap" style={{ fontWeight:600 }}>{s.amount.toLocaleString()} ج.م</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{s.date}</td>
                  <td className="py-3 px-4">
                    {s.status==="paid"
                      ? <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs border border-emerald-200"><CheckCircle2 className="w-3 h-3"/>تم</span>
                      : <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs border border-amber-200"><Clock className="w-3 h-3"/>معلق</span>}
                  </td>
                  <td className="py-3 px-4">
                    {s.status==="unpaid" && <button onClick={() => paySettlement(s.id)} className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs hover:bg-emerald-600 transition-colors whitespace-nowrap">تسوية</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ─── Restaurants ─── */
  const renderRestaurants = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"إجمالي",  value:restaurants.length,                                           color:"text-gray-700" },
          { label:"نشطة",    value:restaurants.filter(r=>r.status==="active").length,            color:"text-emerald-600" },
          { label:"غير نشطة",value:restaurants.filter(r=>r.status==="inactive").length,          color:"text-gray-500" },
          { label:"موقوفة",  value:restaurants.filter(r=>r.status==="suspended").length,         color:"text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-border text-center">
            <div className={`text-2xl ${s.color}`} style={{ fontWeight:700 }}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border">
        <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input placeholder="بحث..." value={searchRest} onChange={e=>setSearchRest(e.target.value)}
              className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-border bg-gray-50 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all","active","inactive","suspended"] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`px-3 py-2 rounded-xl text-xs transition-all ${filterStatus===f?"bg-emerald-500 text-white":"bg-gray-50 text-muted-foreground hover:bg-gray-100 border border-border"}`}>
                {f==="all"?"الكل":rStatusCfg[f as RestaurantStatus].label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowRestModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm hover:bg-orange-600 transition-colors whitespace-nowrap"
            style={{ fontWeight:600 }}>
            <Plus className="w-4 h-4" /> تسجيل مطعم
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead><tr className="border-b border-border text-muted-foreground">
              {["المطعم","المدينة","الاشتراك","الحالة","المحفظة","الطلبات","إجراءات"].map(h => (
                <th key={h} className="text-right py-3 px-4" style={{ fontWeight:500 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredRests.map(r => {
                const st = rStatusCfg[r.status];
                const sb = subCfg[r.subscription];
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">🍽️</div>
                        <span style={{ fontWeight:500 }} className="whitespace-nowrap">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{r.city}</td>
                    <td className="py-3.5 px-4"><span className={`text-xs px-2.5 py-1 rounded-full border ${sb.bg} ${sb.color}`}>{sb.label}</span></td>
                    <td className="py-3.5 px-4"><span className={`text-xs px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>{st.label}</span></td>
                    <td className="py-3.5 px-4" style={{ fontWeight:600 }}>{r.wallet.toLocaleString()} ج.م</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{r.orders}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex gap-1.5">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100"><Eye className="w-3.5 h-3.5 text-gray-500" /></button>
                        {r.status !== "suspended" && <button onClick={() => suspendRestaurant(r.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Ban className="w-3.5 h-3.5 text-red-500" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ─── Drivers ─── */
  const renderDrivers = () => (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        نظام الرتب مُفعّل تلقائيًا: يتم تحديث رتبة الطيار حسب عدد الطلبات والتقييم (ذهبي/فضي/برونزي).
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"إجمالي",  value:drivers.length,                                   color:"text-gray-700" },
          { label:"متاحين",  value:drivers.filter(d=>d.status==="available").length, color:"text-emerald-600" },
          { label:"مشغولين", value:drivers.filter(d=>d.status==="busy").length,      color:"text-blue-600" },
          { label:"تحذيرات", value:drivers.filter(d=>d.warning).length,              color:"text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-border text-center">
            <div className={`text-2xl ${s.color}`} style={{ fontWeight:700 }}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border">
        <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input placeholder="بحث..." value={searchDrivers} onChange={e=>setSearchDrivers(e.target.value)}
              className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-border bg-gray-50 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all","gold","silver","bronze"] as const).map(f => (
              <button key={f} onClick={() => setFilterRank(f)}
                className={`px-3 py-2 rounded-xl text-xs transition-all ${filterRank===f?"bg-emerald-500 text-white":"bg-gray-50 text-muted-foreground hover:bg-gray-100 border border-border"}`}>
                {f==="all"?"الكل":rankCfg[f as DriverRank].label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowDriverModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm hover:bg-emerald-600 transition-colors whitespace-nowrap"
            style={{ fontWeight:600 }}>
            <UserPlus className="w-4 h-4" /> تسجيل طيار
          </button>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {filteredDrivers.map(d => {
            const rc = rankCfg[d.rank];
            const sc = dStatusCfg[d.status];
            return (
              <div key={d.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base ${d.rank==="gold"?"bg-amber-100":d.rank==="silver"?"bg-gray-100":"bg-orange-100"}`}>🛵</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight:600 }} className="text-sm">{d.name}</span>
                      {d.warning && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${rc.bg} ${rc.color}`}>{rc.label}</span>
                      <span className={`text-[10px] flex items-center gap-1 ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>{sc.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-yellow-500 flex items-center gap-0.5 shrink-0">
                    <Star className="w-3 h-3 fill-yellow-400" />{d.rating}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2"><div className="text-sm" style={{ fontWeight:600 }}>{d.orders}</div><div className="text-[10px] text-muted-foreground">طلب</div></div>
                  <div className="bg-gray-50 rounded-lg p-2"><div className="text-sm" style={{ fontWeight:600 }}>{d.wallet.toLocaleString()}</div><div className="text-[10px] text-muted-foreground">ج.م</div></div>
                  <div className="bg-gray-50 rounded-lg p-2"><div className="text-sm" style={{ fontWeight:600 }}>{d.phone.slice(-4)}</div><div className="text-[10px] text-muted-foreground">آخر ٤</div></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead><tr className="border-b border-border text-muted-foreground">
              {["الطيار","الهاتف","الرتبة","الحالة","الطلبات","المحفظة","التقييم","إجراء"].map(h => (
                <th key={h} className="text-right py-3 px-4" style={{ fontWeight:500 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredDrivers.map(d => {
                const rc = rankCfg[d.rank];
                const sc = dStatusCfg[d.status];
                return (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight:500 }}>{d.name}</span>
                        {d.warning && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground text-xs">{d.phone}</td>
                    <td className="py-3.5 px-4"><span className={`text-xs px-2.5 py-1 rounded-full border ${rc.bg} ${rc.color}`}>{rc.label}</span></td>
                    <td className="py-3.5 px-4">
                      <span className={`flex items-center gap-1.5 text-xs ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>{sc.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{d.orders}</td>
                    <td className="py-3.5 px-4" style={{ fontWeight:600 }}>{d.wallet.toLocaleString()} ج.م</td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1 text-amber-500 text-xs"><Star className="w-3 h-3 fill-amber-400" />{d.rating}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100"><Eye className="w-3.5 h-3.5 text-gray-500" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ─── Subscriptions ─── */
  const renderSubscriptions = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {subPlans.map(plan => {
          const count = restaurants.filter(r => r.subscription === plan.key).length;
          const isEm = plan.color === "emerald";
          return (
            <div key={plan.key} className={`rounded-2xl border-2 p-5 ${isEm?"border-emerald-500 bg-gradient-to-bl from-emerald-50 to-white":plan.color==="amber"?"border-amber-300 bg-amber-50/50":"border-border bg-white"}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontWeight:700 }} className={isEm?"text-emerald-700":plan.color==="amber"?"text-amber-700":""}>{plan.label}</h3>
                {isEm && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white">الأكثر شيوعاً</span>}
              </div>
              <div className="text-2xl mb-3" style={{ fontWeight:700 }}>{plan.price}</div>
              <ul className="space-y-1.5 mb-4">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${isEm?"text-emerald-500":plan.color==="amber"?"text-amber-500":"text-gray-400"}`} />{f}
                  </li>
                ))}
              </ul>
              <div className="pt-3 border-t border-border/50">
                <div className="text-2xl" style={{ fontWeight:700 }}>{count}</div>
                <div className="text-xs text-muted-foreground">مطعم مشترك</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-2xl border border-border">
        <div className="p-4 border-b border-border"><h3 style={{ fontWeight:600 }}>قائمة المشتركين</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead><tr className="border-b border-border text-muted-foreground">
              {["المطعم","الخطة","المدينة","الحالة","الطلبات","كود المطعم","إجراء"].map(h=>(
                <th key={h} className="text-right py-3 px-4" style={{ fontWeight:500 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {restaurants.map(r => {
                const sb = subCfg[r.subscription]; const st = rStatusCfg[r.status];
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="py-3.5 px-4" style={{ fontWeight:500 }}>{r.name}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={r.subscription}
                        onChange={(e) => updateRestaurantSubscription(r.id, e.target.value as SubscriptionType)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white outline-none focus:border-emerald-500"
                      >
                        <option value="basic">أساسي</option>
                        <option value="pro">احترافي</option>
                        <option value="enterprise">مؤسسي</option>
                      </select>
                      <div className="mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sb.bg} ${sb.color}`}>{sb.label}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{r.city}</td>
                    <td className="py-3.5 px-4"><span className={`text-xs px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>{st.label}</span></td>
                    <td className="py-3.5 px-4 text-muted-foreground">{r.orders}</td>
                    <td className="py-3.5 px-4">
                      {restaurantCodes[r.id] ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-50 border border-border rounded-lg px-2 py-1 whitespace-nowrap">{restaurantCodes[r.id]}</span>
                          <button
                            onClick={() => void navigator.clipboard.writeText(restaurantCodes[r.id])}
                            className="p-1.5 rounded-lg hover:bg-gray-100"
                            title="نسخ الكود"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">غير مُنشأ</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => void generateRestaurantCode(r.id, r.name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        توليد كود
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ─── Finance ─── */
  const renderFinance = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label:"إجمالي الإيرادات",  value:`${monthlyRevenue.toLocaleString("ar-EG")} ج.م`, sub:"هذا الشهر",   icon:DollarSign, color:"emerald" },
          { label:"عمولة المنصة (٥%)", value:`${monthlyCommission.toLocaleString("ar-EG")} ج.م`,  sub:"من الإيرادات", icon:TrendingUp,  color:"blue" },
          { label:"تسويات معلقة",      value:`${settlements.filter(s=>s.status==="unpaid").length} حساب`, sub:"تحتاج تسوية", icon:Clock, color:"amber" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl border ${{emerald:"bg-emerald-50 border-emerald-100",blue:"bg-blue-50 border-blue-100",amber:"bg-amber-50 border-amber-100"}[c.color]}`}>
                <c.icon className={`w-5 h-5 ${{emerald:"text-emerald-600",blue:"text-blue-600",amber:"text-amber-600"}[c.color]}`} />
              </div>
              <span className="text-sm text-muted-foreground">{c.label}</span>
            </div>
            <div className="text-2xl" style={{ fontWeight:700 }}>{c.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-border p-4 text-sm text-muted-foreground">
        تم تحصيل <span className="text-emerald-700" style={{ fontWeight:700 }}>{monthlyWalletCollected.toLocaleString("ar-EG")} ج.م</span> داخل المحافظ خلال نفس الفترة.
        {monthlyWalletCreditsFromWalletTx <= 0 && monthlyWalletCreditsFromEarnings > 0 && (
          <span className="text-xs block mt-1">(المصدر: أرباح الطيارين من تطبيق الموبايل)</span>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-border">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <h3 style={{ fontWeight:600 }}>التسويات المالية</h3>
          <div className="flex-1">
            <div className="relative max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input placeholder="بحث..." value={settleSearch} onChange={e=>setSettleSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2 rounded-xl border border-border bg-gray-50 text-sm outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead><tr className="border-b border-border text-muted-foreground">
              {["الاسم","النوع","المبلغ","التاريخ","الحالة","إجراء"].map(h=>(
                <th key={h} className="text-right py-3 px-4" style={{ fontWeight:500 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredSettlements.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 whitespace-nowrap" style={{ fontWeight:500 }}>{s.name}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{s.type}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap" style={{ fontWeight:600 }}>{s.amount.toLocaleString()} ج.م</td>
                  <td className="py-3.5 px-4 text-xs text-muted-foreground">{s.date}</td>
                  <td className="py-3.5 px-4">
                    {s.status==="paid"
                      ? <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs border border-emerald-200"><CheckCircle2 className="w-3 h-3"/>تم</span>
                      : <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs border border-amber-200"><Clock className="w-3 h-3"/>معلق</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    {s.status==="unpaid" && <button onClick={() => paySettlement(s.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs hover:bg-emerald-600 transition-colors whitespace-nowrap">تسوية</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const sectionContent: Record<AdminSection, ()=>JSX.Element> = {
    overview: renderOverview, restaurants: renderRestaurants,
    drivers: renderDrivers, subscriptions: renderSubscriptions, finance: renderFinance,
  };

  /* ─── Render ─── */
  return (
    <div className="min-h-screen flex bg-[#f5f6fa]" dir="rtl">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 right-0 w-64 bg-white border-l border-border flex flex-col z-50 transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-auto ${sidebarOpen?"translate-x-0":"translate-x-full"}`}>
        <div className="p-5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-bl from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span style={{ fontWeight:600 }}>سويفت لوجستكس</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {menuItems.map(item => (
            <button key={item.key} onClick={() => nav(item.key as AdminSection)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${section===item.key?"bg-emerald-50 text-emerald-700 border border-emerald-100":"text-muted-foreground hover:bg-gray-50"}`}>
              <item.icon className="w-4 h-4 shrink-0" />{item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-bl from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs" style={{ fontWeight:700 }}>م</div>
            <div><div className="text-sm" style={{ fontWeight:500 }}>محمد أحمد</div><div className="text-xs text-muted-foreground">مدير النظام</div></div>
          </div>
          <button onClick={() => navigate("/")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-gray-50 transition-all">
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 md:h-16 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-gray-50">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm md:text-base" style={{ fontWeight:600 }}>{menuItems.find(m=>m.key===section)?.label}</h2>
              <div className="text-[10px] text-muted-foreground hidden md:block">لوحة تحكم النظام</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />مزامنة مباشرة
            </div>
            <button className="relative p-2 rounded-xl hover:bg-gray-50">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-auto pb-24 lg:pb-6">
          {sectionContent[section]()}
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-border flex items-stretch lg:hidden z-30" style={{ height:60, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        {menuItems.map(item => (
          <button key={item.key} onClick={() => nav(item.key as AdminSection)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all ${section===item.key?"text-emerald-600":"text-gray-400"}`}>
            <item.icon className={`w-5 h-5 transition-transform ${section===item.key?"scale-110":""}`} />
            <span className="text-[9px]" style={{ fontWeight:section===item.key?600:400 }}>{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>

      {/* ── Modals ── */}
      {showDriverModal && (
        <DriverModal
          onClose={() => setShowDriverModal(false)}
          onSave={d => { setDrivers(getDrivers()); }}
        />
      )}
      {showRestModal && (
        <RestaurantModal
          onClose={() => setShowRestModal(false)}
          onSave={r => { setRestaurants(getRestaurants()); }}
        />
      )}
    </div>
  );
}
