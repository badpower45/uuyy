import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

export type OrderStatus =
  | "to_restaurant"
  | "picked_up"
  | "to_customer"
  | "delivered";

export type RankTier = "bronze" | "silver" | "gold" | "platinum";

export interface Order {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  distance: string;
  fare: number;
  cashToCollect: number;
  status: OrderStatus;
}

export interface IncomingOrder {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  customerAddress: string;
  distance: string;
  fare: number;
}

export interface WeeklyEarning {
  date: string;
  trips: number;
  earnings: number;
  cashCollected: number;
  commission: number;
}

export interface Driver {
  name: string;
  phone: string;
  avatar: string;
  rank: RankTier;
  balance: number;
  creditLimit: number;
  totalTrips: number;
  rating: number;
}

interface AppContextType {
  isAuthenticated: boolean;
  driver: Driver | null;
  isOnline: boolean;
  activeOrder: Order | null;
  incomingOrder: IncomingOrder | null;
  weeklyEarnings: WeeklyEarning[];
  login: (phone: string, password: string) => boolean;
  logout: () => void;
  toggleOnline: () => void;
  acceptOrder: () => void;
  declineOrder: () => void;
  advanceOrderStatus: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MOCK_DRIVER: Driver = {
  name: "محمد أحمد",
  phone: "01012345678",
  avatar: "م",
  rank: "gold",
  balance: -85.5,
  creditLimit: 500,
  totalTrips: 247,
  rating: 4.8,
};

const MOCK_WEEKLY: WeeklyEarning[] = [
  {
    date: "السبت",
    trips: 8,
    earnings: 320,
    cashCollected: 580,
    commission: 80,
  },
  {
    date: "الأحد",
    trips: 12,
    earnings: 480,
    cashCollected: 890,
    commission: 120,
  },
  {
    date: "الاثنين",
    trips: 6,
    earnings: 240,
    cashCollected: 410,
    commission: 60,
  },
  {
    date: "الثلاثاء",
    trips: 15,
    earnings: 600,
    cashCollected: 1100,
    commission: 150,
  },
  {
    date: "الأربعاء",
    trips: 10,
    earnings: 400,
    cashCollected: 720,
    commission: 100,
  },
  {
    date: "الخميس",
    trips: 9,
    earnings: 360,
    cashCollected: 640,
    commission: 90,
  },
  {
    date: "الجمعة",
    trips: 11,
    earnings: 440,
    cashCollected: 800,
    commission: 110,
  },
];

const MOCK_INCOMING: IncomingOrder = {
  id: "ORD-8821",
  restaurantName: "مطعم الأصالة",
  restaurantAddress: "شارع التحرير، الدقي",
  customerAddress: "مدينة نصر، شارع عباس العقاد",
  distance: "4.2 كم",
  fare: 55,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [incomingOrder, setIncomingOrder] = useState<IncomingOrder | null>(null);
  const [showIncoming, setShowIncoming] = useState(false);

  const login = useCallback((phone: string, password: string): boolean => {
    if (phone.length >= 10 && password.length >= 4) {
      setIsAuthenticated(true);
      setDriver(MOCK_DRIVER);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setDriver(null);
    setIsOnline(false);
    setActiveOrder(null);
    setIncomingOrder(null);
  }, []);

  const toggleOnline = useCallback(() => {
    setIsOnline((prev) => {
      const next = !prev;
      if (next && !activeOrder) {
        setTimeout(() => {
          setIncomingOrder(MOCK_INCOMING);
        }, 3000);
      }
      if (!next) {
        setIncomingOrder(null);
      }
      return next;
    });
  }, [activeOrder]);

  const acceptOrder = useCallback(() => {
    if (!incomingOrder) return;
    const order: Order = {
      id: incomingOrder.id,
      restaurantName: incomingOrder.restaurantName,
      restaurantAddress: incomingOrder.restaurantAddress,
      customerName: "سارة محمود",
      customerPhone: "01098765432",
      customerAddress: incomingOrder.customerAddress,
      distance: incomingOrder.distance,
      fare: incomingOrder.fare,
      cashToCollect: incomingOrder.fare + 15,
      status: "to_restaurant",
    };
    setActiveOrder(order);
    setIncomingOrder(null);
  }, [incomingOrder]);

  const declineOrder = useCallback(() => {
    setIncomingOrder(null);
  }, []);

  const advanceOrderStatus = useCallback(() => {
    if (!activeOrder) return;
    const statusFlow: OrderStatus[] = [
      "to_restaurant",
      "picked_up",
      "to_customer",
      "delivered",
    ];
    const currentIndex = statusFlow.indexOf(activeOrder.status);
    if (currentIndex < statusFlow.length - 1) {
      setActiveOrder({
        ...activeOrder,
        status: statusFlow[currentIndex + 1],
      });
    } else {
      setActiveOrder(null);
      setDriver((prev) =>
        prev ? { ...prev, totalTrips: prev.totalTrips + 1 } : prev
      );
      if (isOnline) {
        setTimeout(() => {
          setIncomingOrder(MOCK_INCOMING);
        }, 5000);
      }
    }
  }, [activeOrder, isOnline]);

  const value: AppContextType = {
    isAuthenticated,
    driver,
    isOnline,
    activeOrder,
    incomingOrder,
    weeklyEarnings: MOCK_WEEKLY,
    login,
    logout,
    toggleOnline,
    acceptOrder,
    declineOrder,
    advanceOrderStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
