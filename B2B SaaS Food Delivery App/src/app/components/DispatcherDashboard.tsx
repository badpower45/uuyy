import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Zap, Bell, LogOut, Search, AlertTriangle,
  Clock, CheckCircle2, ArrowLeftRight, User, X, Star, ChevronUp, ChevronDown,
} from "lucide-react";
import { getDrivers, saveDrivers } from "../../lib/store";
import type { Driver as StoreDriver, DriverRank } from "../../lib/store";
import { supabase } from "../../lib/supabase";

/* ─── Local order type ─── */
type OrderStatus = "pending" | "assigned";
interface Order {
  id: string; restaurant: string; customer: string;
  address: string; value: string; time: string;
  status: OrderStatus; driverId?: string; lat: number; lng: number;
}

const rankCfg: Record<DriverRank,{ label:string; color:string; bg:string; hex:string }> = {
  gold:  { label:"ذهبي",   color:"text-amber-700",  bg:"bg-amber-100 border-amber-200",   hex:"#f59e0b" },
  silver:{ label:"فضي",    color:"text-gray-600",   bg:"bg-gray-100 border-gray-200",     hex:"#9ca3af" },
  bronze:{ label:"برونزي", color:"text-orange-700", bg:"bg-orange-100 border-orange-200", hex:"#f97316" },
};

/* ─── Icon factories ─── */
function makeIcon(html: string, size = 34): L.DivIcon {
  return L.divIcon({ html, className:"", iconSize:[size,size], iconAnchor:[size/2,size/2], popupAnchor:[0,-size/2] });
}
const restaurantIcon = () => makeIcon(`<div style="background:#f97316;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;border:2px solid rgba(255,255,255,.5);box-shadow:0 4px 16px rgba(249,115,22,.5)">🍽️</div>`);
const driverIcon = (d: StoreDriver) => {
  const bg = d.status==="busy" ? "#3b82f6" : rankCfg[d.rank].hex;
  const warn = d.warning
    ? `<div style="position:absolute;top:-4px;left:-4px;width:13px;height:13px;border-radius:50%;background:#ef4444;border:1.5px solid white;font-size:8px;color:white;display:flex;align-items:center;justify-content:center;font-weight:bold">!</div>` : "";
  return makeIcon(
    `<div style="position:relative;width:30px;height:30px">
      <div style="width:30px;height:30px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid rgba(255,255,255,.5);box-shadow:0 4px 12px ${bg}88">🛵</div>
      ${warn}
    </div>`, 30
  );
};
const orderIcon = (status: OrderStatus) => makeIcon(
  `<div style="width:20px;height:20px;border-radius:50%;background:${status==="assigned"?"#10b981":"#ef4444"};border:3px solid rgba(255,255,255,.6);box-shadow:0 4px 12px #00000055"></div>`, 20
);

/* ─── Map hook ─── */
function useDispatcherMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  drivers: StoreDriver[],
  orders: Order[],
  restaurants: Array<{ name: string; lat: number; lng: number }>,
) {
  const mapRef     = useRef<L.Map | null>(null);
  const dMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const oMarkersRef = useRef<L.Layer[]>([]);
  const linesRef   = useRef<L.Polyline[]>([]);
  const rMarkersRef = useRef<L.Layer[]>([]);

  /* Init once */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center:[30.0444,31.2357], zoom:12, zoomControl:true, attributionControl:false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom:19 }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; dMarkersRef.current.clear(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    rMarkersRef.current.forEach((m) => map.removeLayer(m));
    rMarkersRef.current = [];

    restaurants.forEach((r) => {
      const marker = L.marker([r.lat, r.lng], { icon: restaurantIcon() }).addTo(map)
        .bindPopup(`<div dir="rtl" style="font-family:sans-serif;min-width:120px"><b>${r.name}</b><br><span style="color:#f97316;font-size:11px">مطعم</span></div>`);
      rMarkersRef.current.push(marker);
    });
  }, [restaurants]);

  /* Update driver markers */
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    drivers.forEach(d => {
      const existing = dMarkersRef.current.get(d.id);
      if (existing) {
        existing.setLatLng([d.lat, d.lng]);
        existing.setIcon(driverIcon(d));
      } else {
        const m = L.marker([d.lat,d.lng], { icon:driverIcon(d) }).addTo(map)
          .bindPopup(`<div dir="rtl" style="font-family:sans-serif;min-width:140px">
            <b>${d.name}</b><br>
            <span style="color:${d.status==="busy"?"#3b82f6":"#10b981"};font-size:11px">${d.status==="busy"?"مشغول":"متاح"} · ${rankCfg[d.rank].label}</span><br>
            <span style="color:#888;font-size:10px">★${d.rating} · ${d.orders} طلب</span>
            ${d.warning?'<br><span style="color:#ef4444;font-size:10px">⚠️ حد ائتمان</span>':""}
          </div>`);
        dMarkersRef.current.set(d.id, m);
      }
    });
    // Remove deleted drivers
    dMarkersRef.current.forEach((m, id) => {
      if (!drivers.find(d => d.id === id)) { map.removeLayer(m); dMarkersRef.current.delete(id); }
    });
  }, [drivers]);

  /* Update order markers + lines */
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    oMarkersRef.current.forEach(m => map.removeLayer(m));
    linesRef.current.forEach(l => map.removeLayer(l));
    oMarkersRef.current = []; linesRef.current = [];

    orders.forEach(o => {
      const m = L.marker([o.lat,o.lng], { icon:orderIcon(o.status) }).addTo(map)
        .bindPopup(`<div dir="rtl" style="font-family:sans-serif;min-width:130px">
          <b>${o.id}</b><br><span style="font-size:11px">${o.customer}</span><br>
          <span style="color:#888;font-size:10px">${o.address}</span>
        </div>`);
      oMarkersRef.current.push(m);
    });

    orders.filter(o => o.status==="assigned" && o.driverId).forEach(o => {
      const drv = drivers.find(d => d.id === o.driverId);
      if (!drv) return;
      const l = L.polyline([[drv.lat,drv.lng],[o.lat,o.lng]], { color:"#10b981", weight:2, dashArray:"8 5", opacity:0.7 }).addTo(map);
      linesRef.current.push(l);
    });
  }, [orders, drivers]);
}

/* ════════════════════════════════════════
   COMPONENT
════════════════════════════════════════ */
export default function DispatcherDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders]                       = useState<Order[]>([]);
  const [drivers, setDrivers]                     = useState<StoreDriver[]>([]);
  const [restaurants, setRestaurants]             = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [activeTab, setActiveTab]                 = useState<"orders"|"drivers">("orders");
  const [searchOrders, setSearchOrders]           = useState("");
  const [searchDrivers, setSearchDrivers]         = useState("");
  const [assigningOrderId, setAssigningOrderId]   = useState<string|null>(null);
  const [completedToday, setCompletedToday]       = useState(0);
  const [panelOpen, setPanelOpen]                 = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  useDispatcherMap(mapContainerRef, drivers, orders, restaurants);

  /* Load from DB + poll every 3s */
  useEffect(() => {
    const refresh = async () => {
      setDrivers(getDrivers());

      if (!supabase) return;
      const [ordersRes, restsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("external_id,customer_name,customer_address,fare,created_at,status,driver_id,customer_latitude,customer_longitude,restaurants(name)")
          .in("status", ["pending", "assigned"])
          .order("created_at", { ascending: false }),
        supabase.from("restaurants").select("name,latitude,longitude"),
      ]);

      if (!restsRes.error && restsRes.data) {
        setRestaurants(restsRes.data.map((r: any) => ({ name: r.name, lat: Number(r.latitude ?? 30.0444), lng: Number(r.longitude ?? 31.2357) })));
      }

      if (!ordersRes.error && ordersRes.data) {
        setOrders(
          ordersRes.data.map((o: any) => ({
            id: o.external_id,
            restaurant: o.restaurants?.name ?? "مطعم",
            customer: o.customer_name,
            address: o.customer_address,
            value: `${Number(o.fare ?? 0).toLocaleString("ar-EG")} ج.م`,
            time: o.created_at ? new Date(o.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—",
            status: o.status,
            driverId: o.driver_id != null ? String(o.driver_id) : undefined,
            lat: Number(o.customer_latitude ?? 30.0444),
            lng: Number(o.customer_longitude ?? 31.2357),
          })),
        );
      }

      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered")
        .gte("created_at", `${today}T00:00:00`);
      setCompletedToday(count ?? 0);
    };

    void refresh();
    const t = setInterval(() => {
      void refresh();
    }, 3000);
    return () => clearInterval(t);
  }, []);

  /* Derived */
  const pendingOrders    = orders.filter(o => o.status==="pending");
  const assignedOrders   = orders.filter(o => o.status==="assigned");
  const busyDriverIds    = new Set(assignedOrders.map((o) => o.driverId).filter(Boolean));
  const availableDrivers = drivers.filter(d => d.status==="available" && !busyDriverIds.has(d.id));
  const busyDrivers      = drivers.filter(d => d.status==="busy" || busyDriverIds.has(d.id));

  const filteredOrders  = orders.filter(o =>
    !searchOrders || o.id.includes(searchOrders) || o.restaurant.includes(searchOrders) || o.customer.includes(searchOrders)
  );
  const filteredAvail   = availableDrivers.filter(d =>
    !searchDrivers || d.name.includes(searchDrivers)
  );

  const startAssigning = (orderId: string) => { setAssigningOrderId(orderId); setActiveTab("drivers"); setPanelOpen(true); };
  const cancelAssigning = () => setAssigningOrderId(null);

  const confirmAssignment = async (driverId: string) => {
    if (!assigningOrderId) return;
    const order  = orders.find(o => o.id === assigningOrderId);
    const driver = drivers.find(d => d.id === driverId);
    if (!order || !driver) return;

    if (supabase) {
      const { error } = await supabase
        .from("orders")
        .update({ status: "assigned", driver_id: Number(driverId), assigned_at: new Date().toISOString() })
        .eq("external_id", assigningOrderId);

      if (error) {
        toast.error("فشل تعيين الطيار", { description: error.message });
        return;
      }
    }

    setOrders(prev => prev.map(o => o.id===assigningOrderId ? { ...o, status:"assigned" as const, driverId } : o));
    const updated = getDrivers().map(d => d.id===driverId ? { ...d, status:"busy" as const } : d);
    saveDrivers(updated);
    setDrivers([...updated]);
    setAssigningOrderId(null); setActiveTab("orders");
    toast.success(`✅ تم تعيين ${driver.name} للطلب ${order.id}`, { description:`${order.customer} — ${order.address}` });
  };

  const completeOrder = async (orderId: string) => {
    const order = orders.find(o => o.id===orderId); if (!order) return;

    if (supabase) {
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered", delivered_at: new Date().toISOString() })
        .eq("external_id", orderId);

      if (error) {
        toast.error("فشل إنهاء الطلب", { description: error.message });
        return;
      }
    }

    setOrders(prev => prev.filter(o => o.id!==orderId));
    if (order.driverId) {
      const updated = getDrivers().map(d => d.id===order.driverId ? { ...d, status:"available" as const, orders:d.orders+1 } : d);
      saveDrivers(updated); setDrivers([...updated]);
    }
    setCompletedToday(p => p+1);
    toast.success(`🎉 تم إتمام الطلب ${orderId}!`);
  };

  /* ─── Render ─── */
  return (
    <div className="h-[100dvh] flex flex-col bg-[#0f1117] overflow-hidden" dir="rtl">

      {/* ── Header ── */}
      <header className="bg-[#1a1d27] border-b border-white/10 flex items-center justify-between px-3 md:px-5 shrink-0" style={{ height:52 }}>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-bl from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white text-xs md:text-sm" style={{ fontWeight:600 }}>موزع الطلبات</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-[10px] md:text-xs border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{drivers.filter(d=>d.status!=="offline").length} متصل</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-5">
          {[
            { label:"معلقة",   value:pendingOrders.length,    color:"text-amber-400" },
            { label:"توصيل",   value:assignedOrders.length,   color:"text-blue-400" },
            { label:"متاحين",  value:availableDrivers.length, color:"text-emerald-400" },
            { label:"مكتملة",  value:completedToday,          color:"text-white" },
          ].map((s,i) => (
            <div key={i} className="flex items-center gap-5">
              {i>0 && <div className="w-px h-4 bg-white/10" />}
              <div className="text-center">
                <div className={`text-sm ${s.color}`} style={{ fontWeight:700 }}>{s.value}</div>
                <div className="text-[9px] text-gray-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile stats */}
        <div className="flex md:hidden items-center gap-3">
          <span className="text-amber-400 text-xs" style={{ fontWeight:700 }}>{pendingOrders.length}⏳</span>
          <span className="text-emerald-400 text-xs" style={{ fontWeight:700 }}>{availableDrivers.length}🛵</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button className="relative p-1.5 md:p-2 rounded-lg hover:bg-white/5">
            <Bell className="w-4 h-4 text-gray-400" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
          </button>
          <button onClick={() => navigate("/")} className="p-1.5 md:p-2 rounded-lg hover:bg-white/5">
            <LogOut className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col md:flex-row-reverse overflow-hidden min-h-0">

        {/* ── Map ── */}
        <div className="flex-1 relative min-h-0">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Legend */}
          <div className="hidden md:block absolute bottom-4 right-4 bg-[#1a1d27]/90 backdrop-blur-md rounded-xl p-3 border border-white/10 text-[10px] text-gray-400 space-y-1.5 z-[500]">
            {[
              { color:"#f59e0b", label:"طيار ذهبي" },
              { color:"#9ca3af", label:"طيار فضي" },
              { color:"#f97316", label:"طيار برونزي" },
              { color:"#3b82f6", label:"مشغول" },
              { color:"#ef4444", label:"طلب معلق" },
              { color:"#10b981", label:"طلب معيّن" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:l.color }} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Mobile panel toggle */}
          <button
            onClick={() => setPanelOpen(p => !p)}
            className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] bg-[#1a1d27]/95 text-white px-5 py-2.5 rounded-full border border-white/20 text-xs flex items-center gap-2 shadow-xl active:scale-95 transition-all"
          >
            {panelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            {panelOpen ? "إخفاء اللوحة" : `اللوحة (${pendingOrders.length} معلقة)`}
          </button>
        </div>

        {/* ── Side Panel ── */}
        <div className={`bg-[#1a1d27] border-white/10 flex flex-col overflow-hidden transition-all duration-300
          md:w-80 md:border-l md:flex-shrink-0 md:h-auto
          ${panelOpen ? "h-[62vh] border-t" : "h-0 md:h-auto"}`}>

          {/* Assignment banner */}
          {assigningOrderId && (
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2.5 flex items-center justify-between shrink-0">
              <div>
                <div className="text-xs text-emerald-400" style={{ fontWeight:600 }}>وضع التعيين</div>
                <div className="text-[10px] text-gray-400">اختر طياراً للطلب {assigningOrderId}</div>
              </div>
              <button onClick={cancelAssigning} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-3.5 h-3.5 text-gray-400" /></button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-white/10 shrink-0">
            {[
              { key:"orders",  label:`الطلبات (${orders.length})` },
              { key:"drivers", label:`الطيارين (${availableDrivers.length} متاح)` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as "orders"|"drivers")}
                className={`flex-1 py-3 text-xs md:text-sm transition-all ${activeTab===tab.key?"text-emerald-400 border-b-2 border-emerald-400":"text-gray-500 hover:text-gray-300"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-3 py-2.5 shrink-0">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                placeholder="بحث..."
                value={activeTab==="orders" ? searchOrders : searchDrivers}
                onChange={e => activeTab==="orders" ? setSearchOrders(e.target.value) : setSearchDrivers(e.target.value)}
                className="w-full pr-9 pl-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-auto px-3 pb-3 space-y-2">

            {/* Orders tab */}
            {activeTab==="orders" && (
              filteredOrders.length===0
                ? <div className="text-center py-10 text-gray-500 text-sm">لا توجد طلبات</div>
                : filteredOrders.map(order => (
                  <div key={order.id} className={`bg-white/5 rounded-xl p-3.5 border transition-all ${order.status==="assigned"?"border-emerald-500/25":"border-white/5 hover:border-white/10"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs ${order.status==="pending"?"text-amber-400":"text-emerald-400"}`} style={{ fontWeight:600 }}>{order.id}</span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />منذ {order.time}</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="text-sm text-white" style={{ fontWeight:500 }}>{order.restaurant}</div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1"><User className="w-2.5 h-2.5 shrink-0" />{order.customer} — {order.address}</div>
                      <div className="text-xs text-amber-400" style={{ fontWeight:600 }}>{order.value}</div>
                    </div>
                    {order.status==="pending" ? (
                      <button onClick={() => startAssigning(order.id)}
                        className="w-full py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 border border-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95">
                        <ArrowLeftRight className="w-3 h-3" /> تعيين طيار
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-1.5 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          {drivers.find(d=>d.id===order.driverId)?.name || "طيار مكلف"}
                        </div>
                        <button onClick={() => completeOrder(order.id)}
                          className="w-full py-2 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 border border-blue-500/20 transition-all active:scale-95">
                          ✓ إتمام الطلب
                        </button>
                      </div>
                    )}
                  </div>
                ))
            )}

            {/* Drivers tab */}
            {activeTab==="drivers" && (
              assigningOrderId ? (
                /* Assignment mode — show available only */
                filteredAvail.length===0
                  ? <div className="text-center py-10 text-gray-500 text-sm">لا يوجد طيارين متاحين</div>
                  : filteredAvail.map(driver => {
                    const rc = rankCfg[driver.rank];
                    return (
                      <div key={driver.id} className="bg-white/5 rounded-xl p-3.5 border border-emerald-500/25 hover:border-emerald-500/50 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${driver.rank==="gold"?"bg-amber-500/20":driver.rank==="silver"?"bg-gray-500/20":"bg-orange-500/20"}`}>🛵</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white" style={{ fontWeight:500 }}>{driver.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${rc.bg} ${rc.color}`}>{rc.label}</span>
                              <span className="text-[10px] text-yellow-400 flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-yellow-400" />{driver.rating}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">المحفظة: <span className={driver.warning?"text-red-400":"text-white"} style={{ fontWeight:500 }}>{driver.wallet.toLocaleString()} ج.م</span></span>
                          <button onClick={() => confirmAssignment(driver.id)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-xs hover:bg-emerald-600 transition-colors active:scale-95">
                            ✓ تعيين
                          </button>
                        </div>
                      </div>
                    );
                  })
              ) : (
                /* Normal mode */
                <>
                  <div className="text-[10px] text-gray-500 pt-1" style={{ fontWeight:600 }}>متاحين ({availableDrivers.length})</div>
                  {filteredAvail.map(driver => {
                    const rc = rankCfg[driver.rank];
                    return (
                      <div key={driver.id} className="bg-white/5 rounded-xl p-3.5 border border-white/5 hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center gap-3 mb-2.5">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${driver.rank==="gold"?"bg-amber-500/20":driver.rank==="silver"?"bg-gray-500/20":"bg-orange-500/20"}`}>🛵</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white" style={{ fontWeight:500 }}>{driver.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${rc.bg} ${rc.color}`}>{rc.label}</span>
                              {driver.warning && <span className="text-[10px] text-red-400 flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />حد ائتمان</span>}
                              {driver.isTracking && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />GPS</span>}
                            </div>
                          </div>
                          <div className="text-[10px] text-yellow-400 flex items-center gap-0.5 shrink-0">
                            <Star className="w-2.5 h-2.5 fill-yellow-400" />{driver.rating}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">المحفظة: <span className={driver.warning?"text-red-400":"text-white"} style={{ fontWeight:500 }}>{driver.wallet.toLocaleString()} ج.م</span></span>
                          {pendingOrders.length>0 && (
                            <button onClick={() => startAssigning(pendingOrders[0].id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 border border-emerald-500/20 transition-colors active:scale-95">
                              تعيين لطلب
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {busyDrivers.length>0 && (
                    <>
                      <div className="text-[10px] text-gray-500 pt-2" style={{ fontWeight:600 }}>مشغولين ({busyDrivers.length})</div>
                      {busyDrivers.map(driver => (
                        <div key={driver.id} className="bg-white/5 rounded-xl p-3.5 border border-blue-500/20 opacity-75">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">🛵</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white" style={{ fontWeight:500 }}>{driver.name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">في التوصيل</span>
                                {driver.isTracking && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />مباشر</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
