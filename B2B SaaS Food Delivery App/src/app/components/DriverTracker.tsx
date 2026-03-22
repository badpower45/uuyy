import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Navigation, Power, LogOut, MapPin, Package,
  Star, Wallet,
} from "lucide-react";
import {
  getDrivers, updateDriverLocation, updateDriverStatus,
} from "../../lib/store";
import type { Driver, DriverStatus } from "../../lib/store";

const STATUS_LABEL: Record<DriverStatus, string> = {
  available: "متاح",
  busy: "في توصيل",
  offline: "غير متصل",
};
const STATUS_COLOR: Record<DriverStatus, string> = {
  available: "bg-emerald-500",
  busy: "bg-blue-500",
  offline: "bg-gray-500",
};

/* ─── Leaflet Map Hook ─── */
function useDriverMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  lat: number,
  lng: number,
  ready: boolean,
) {
  const mapRef    = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const ringRef   = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !ready) return;
    const map = L.map(containerRef.current, {
      center: [lat, lng], zoom: 15,
      zoomControl: false, attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

    ringRef.current = L.circle([lat, lng], {
      radius: 80, color: "#10b981", fillColor: "#10b981", fillOpacity: 0.12, weight: 1.5,
    }).addTo(map);

    markerRef.current = L.circleMarker([lat, lng], {
      radius: 10, color: "#fff", weight: 3, fillColor: "#10b981", fillOpacity: 1,
    }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; ringRef.current = null; };
  }, [ready]);                                // init once when ready

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    ringRef.current?.setLatLng([lat, lng]);
    mapRef.current.panTo([lat, lng], { animate: true, duration: 1.2 });
  }, [lat, lng]);
}

/* ═══════════════════════════════════════════
   Component
══════��════════════════════════════════════ */
export default function DriverTracker() {
  const navigate   = useNavigate();
  const driverId   = sessionStorage.getItem("swift_driver_id") ?? "";

  const [driver, setDriver]         = useState<Driver | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lat, setLat]               = useState(30.0444);
  const [lng, setLng]               = useState(31.2357);
  const [accuracy, setAccuracy]     = useState<number | null>(null);
  const [mapReady, setMapReady]     = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const watchIdRef      = useRef<number | null>(null);

  useDriverMap(mapContainerRef, lat, lng, mapReady);

  /* Load driver */
  useEffect(() => {
    const drv = getDrivers().find(d => d.id === driverId);
    if (!drv) { navigate("/"); return; }
    setDriver(drv);
    setLat(drv.lat); setLng(drv.lng);
    // small delay so DOM is ready before map init
    setTimeout(() => setMapReady(true), 100);
  }, [driverId, navigate]);

  /* Push location to store when pos changes */
  useEffect(() => {
    if (driverId && isTracking) updateDriverLocation(driverId, lat, lng);
  }, [lat, lng, driverId, isTracking]);

  /* Refresh driver data from store every 5 s */
  useEffect(() => {
    const t = setInterval(() => {
      const drv = getDrivers().find(d => d.id === driverId);
      if (drv) setDriver(drv);
    }, 5000);
    return () => clearInterval(t);
  }, [driverId]);

  /* Cleanup on unmount */
  useEffect(() => () => {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  /* ─── Tracking ─── */
  const startTracking = () => {
    setIsTracking(true);
    updateDriverStatus(driverId, "available");
    setDriver(prev => prev ? { ...prev, status: "available" } : prev);

    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم GPS");
      setIsTracking(false);
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setAccuracy(pos.coords.accuracy);
      },
      () => {
        toast.error("تعذّر الوصول للـ GPS");
        setIsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 },
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setIsTracking(false);
    updateDriverStatus(driverId, "offline");
    setDriver(prev => prev ? { ...prev, status: "offline" } : prev);
  };

  const changeStatus = (status: DriverStatus) => {
    if (status === "offline" && isTracking) stopTracking();
    else {
      updateDriverStatus(driverId, status);
      setDriver(prev => prev ? { ...prev, status } : prev);
    }
  };

  if (!driver) return (
    <div className="h-[100dvh] bg-[#0f1117] flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">جارٍ التحميل...</p>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0f1117] overflow-hidden" dir="rtl">

      {/* ── Header ── */}
      <div className="bg-[#1a1d27] border-b border-white/10 px-4 flex items-center justify-between shrink-0" style={{ paddingTop: "env(safe-area-inset-top, 12px)", paddingBottom: 12 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-xl">🛵</span>
          </div>
          <div>
            <div className="text-white text-sm" style={{ fontWeight: 700 }}>{driver.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[driver.status]} ${isTracking ? "animate-pulse" : ""}`} />
              <span className="text-xs text-gray-400">{STATUS_LABEL[driver.status]}</span>
              {driver.rank === "gold"   && <span className="text-[10px] text-amber-400">⭐ ذهبي</span>}
              {driver.rank === "silver" && <span className="text-[10px] text-gray-400">🥈 فضي</span>}
              {driver.rank === "bronze" && <span className="text-[10px] text-orange-400">🥉 برونزي</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isTracking && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              GPS حي
            </div>
          )}
          <button onClick={() => { stopTracking(); navigate("/"); }} className="p-2 rounded-xl hover:bg-white/5 active:bg-white/10">
            <LogOut className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Coordinates overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0f1117]/80 backdrop-blur-sm text-gray-400 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 z-[500]">
          <MapPin className="w-3 h-3 text-emerald-400" />
          {lat.toFixed(4)}°N، {lng.toFixed(4)}°E
          {accuracy != null && <span className="text-emerald-500/70">±{Math.round(accuracy)}م</span>}
        </div>

        {/* Zoom controls */}
        <div className="absolute top-4 left-4 flex flex-col gap-1 z-[500]">
          <button onClick={() => mapContainerRef.current && (L.DomUtil.get as any)} className="hidden" />
        </div>
      </div>

      {/* ── Bottom Sheet ── */}
      <div className="bg-[#1a1d27] border-t border-white/10 rounded-t-3xl shrink-0 px-5 pt-4 pb-safe space-y-4"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 16px) + 16px)` }}>

        {/* Drag handle */}
        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto" />

        {/* ── Tracking Button ── */}
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${
            isTracking
              ? "bg-red-500/15 text-red-400 border border-red-500/25"
              : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
          }`}
        >
          {isTracking
            ? <><Power className="w-5 h-5" /><span style={{ fontWeight: 700 }}>إيقاف التتبع</span></>
            : <><Navigation className="w-5 h-5" /><span style={{ fontWeight: 700 }}>بدء التتبع</span></>
          }
        </button>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Wallet,  label: "الأرباح",  value: `${driver.wallet.toLocaleString()} ج` },
            { icon: Package, label: "الطلبات",  value: driver.orders },
            { icon: Star,    label: "التقييم",  value: driver.rating },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
              <s.icon className="w-4 h-4 text-gray-500 mx-auto mb-1.5" />
              <div className="text-white text-sm" style={{ fontWeight: 700 }}>{s.value}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Status Toggle ── */}
        <div className="flex gap-2">
          {(["available", "busy", "offline"] as const).map(s => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={`flex-1 py-3 rounded-xl text-xs transition-all active:scale-95 ${
                driver.status === s
                  ? s === "available" ? "bg-emerald-500 text-white"
                  : s === "busy"      ? "bg-blue-500 text-white"
                  :                     "bg-gray-600 text-white"
                  : "bg-white/5 text-gray-500 border border-white/5"
              }`}
              style={{ fontWeight: driver.status === s ? 700 : 400 }}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}