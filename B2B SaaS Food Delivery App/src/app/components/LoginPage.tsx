import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Lock, Zap, Phone, Shield, Store, Navigation2, Bike } from "lucide-react";
import { loginDriver, loginRestaurant } from "../../lib/store";
import { supabase } from "../../lib/supabase";

const roles = [
  { value: "admin",      label: "أدمن",     icon: Shield,     color: "from-emerald-500 to-emerald-600" },
  { value: "dispatcher", label: "موزع",     icon: Navigation2, color: "from-blue-500 to-blue-600" },
  { value: "restaurant", label: "مطعم",     icon: Store,      color: "from-orange-500 to-orange-600" },
  { value: "driver",     label: "طيار",     icon: Bike,       color: "from-purple-500 to-purple-600" },
];

const WEB_ROLE_CREDENTIALS: Record<string, { password: string; route: string; success: string }> = {
  "admin@swift.com": {
    password: "admin123",
    route: "/admin",
    success: "مرحباً بك في لوحة الأدمن 👋",
  },
  "dispatcher@swift.com": {
    password: "dispatcher123",
    route: "/dispatcher",
    success: "مرحباً بك في شاشة التوزيع",
  },
};

const DEFAULT_PIN = "1234";

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole]         = useState("admin");
  const [identifier, setId]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [onlineDrivers, setOnlineDrivers] = useState(0);
  const [activeRestaurants, setActiveRestaurants] = useState(0);

  const isPhoneRole = role === "driver" || role === "restaurant";
  const currentRole = roles.find(r => r.value === role)!;
  const normalizedIdentifier = identifier.trim().toLowerCase();

  useEffect(() => {
    if (!supabase) return;

    const loadStats = async () => {
      const [driversRes, restaurantsRes] = await Promise.all([
        supabase
          .from("drivers")
          .select("id", { count: "exact", head: true })
          .in("status", ["available", "busy"]),
        supabase
          .from("restaurants")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
      ]);

      if (!driversRes.error) setOnlineDrivers(driversRes.count ?? 0);
      if (!restaurantsRes.error) setActiveRestaurants(restaurantsRes.count ?? 0);
    };

    void loadStats();
    const t = setInterval(() => {
      void loadStats();
    }, 10000);

    return () => clearInterval(t);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!supabase) {
      toast.error("Supabase غير مفعّل في البيئة الحالية");
      setLoading(false);
      return;
    }

    if (role === "admin" || role === "dispatcher") {
      const expected = WEB_ROLE_CREDENTIALS[normalizedIdentifier];
      if (expected && expected.password === password) {
        toast.success(expected.success);
        navigate(expected.route);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id,email,role")
        .eq("email", normalizedIdentifier)
        .eq("role", role)
        .maybeSingle();

      if (!error && data && expected && expected.password === password) {
        toast.success(expected.success);
        navigate(expected.route);
      } else {
        toast.error("بيانات الدخول غير صحيحة");
      }
    } else if (role === "driver") {
      let driver = loginDriver(identifier, password);

      if (!driver && password.trim() === DEFAULT_PIN) {
        const { data, error } = await supabase
          .from("drivers")
          .select("id,name,phone")
          .eq("phone", identifier.trim())
          .maybeSingle();

        if (!error && data) {
          driver = { id: data.id, name: data.name, phone: data.phone } as any;
        }
      }

      if (driver) {
        sessionStorage.setItem("swift_driver_id", driver.id);
        toast.success(`أهلاً ${driver.name}! 🛵`);
        navigate("/driver");
      } else {
        toast.error("رقم الهاتف أو PIN غير صحيح", { description: `لو أول دخول جرّب PIN الافتراضي ${DEFAULT_PIN}` });
      }
    } else if (role === "restaurant") {
      let restaurant = loginRestaurant(identifier, password);

      if (!restaurant && password.trim() === DEFAULT_PIN) {
        const { data, error } = await supabase
          .from("restaurants")
          .select("id,name,phone")
          .eq("phone", identifier.trim())
          .maybeSingle();

        if (!error && data) {
          restaurant = { id: data.id, name: data.name, phone: data.phone } as any;
        }
      }

      if (restaurant) {
        sessionStorage.setItem("swift_restaurant_id", restaurant.id);
        toast.success(`أهلاً ${restaurant.name}! 🍽️`);
        navigate("/restaurant");
      } else {
        toast.error("رقم الهاتف أو PIN غير صحيح", { description: `لو أول دخول جرّب PIN الافتراضي ${DEFAULT_PIN}` });
      }
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#0f1117] px-5 py-8"
      dir="rtl"
      style={{ paddingTop: "env(safe-area-inset-top, 32px)", paddingBottom: "env(safe-area-inset-bottom, 32px)" }}
    >
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10 space-y-6">

        {/* Logo */}
        <div className="text-center space-y-2 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-bl from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-white text-xl" style={{ fontWeight: 700 }}>سويفت لوجستكس</h1>
          <p className="text-gray-500 text-sm">منصة توصيل الطعام الذكية</p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-4 gap-2">
          {roles.map(r => {
            const active = role === r.value;
            return (
              <button
                key={r.value}
                onClick={() => { setRole(r.value); setId(""); setPassword(""); }}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all active:scale-95 ${
                  active
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white/3 border-white/8 text-gray-600 hover:border-white/15"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${active ? `bg-gradient-to-bl ${r.color}` : "bg-white/5"}`}>
                  <r.icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-600"}`} />
                </div>
                <span className={`text-[11px] ${active ? "" : ""}`} style={{ fontWeight: active ? 600 : 400 }}>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              {isPhoneRole ? "رقم الهاتف" : "البريد الإلكتروني"}
            </label>
            <div className="relative">
              <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type={isPhoneRole ? "tel" : "email"}
                value={identifier}
                onChange={e => setId(e.target.value)}
                placeholder={isPhoneRole ? "01xxxxxxxxx" : "example@swift.com"}
                required
                className="w-full pr-11 pl-4 py-4 rounded-2xl bg-white/6 border border-white/10 text-white text-sm outline-none focus:border-emerald-500/60 focus:bg-white/8 transition-all placeholder:text-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">
              {isPhoneRole ? "PIN (4 أرقام)" : "كلمة المرور"}
            </label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isPhoneRole ? "••••" : "••••••••"}
                maxLength={isPhoneRole ? 4 : undefined}
                inputMode={isPhoneRole ? "numeric" : undefined}
                required
                className="w-full pr-11 pl-4 py-4 rounded-2xl bg-white/6 border border-white/10 text-white text-sm outline-none focus:border-emerald-500/60 focus:bg-white/8 transition-all placeholder:text-gray-700"
              />
            </div>
            {isPhoneRole && (
              <p className="text-[11px] text-gray-500 mt-2">أول دخول للمطعم/الطيار يكون عادة بـ PIN افتراضي: {DEFAULT_PIN}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl text-white transition-all active:scale-95 ${
              loading ? "opacity-60" : ""
            } bg-gradient-to-l ${currentRole.color} shadow-lg`}
            style={{ fontWeight: 700 }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جارٍ الدخول...
              </span>
            ) : "دخول"}
          </button>
        </form>

        {/* Live indicators */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-gray-700">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{onlineDrivers} طيارين متصلين</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />{activeRestaurants} مطاعم نشطة</span>
        </div>
      </div>
    </div>
  );
}
