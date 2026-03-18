import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import * as Location from "expo-location";
import { Platform } from "react-native";

export type OrderStatus =
  | "to_restaurant"
  | "picked_up"
  | "to_customer"
  | "delivered";

export type RankTier = "bronze" | "silver" | "gold" | "platinum";

export interface DriverLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

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
  driverLocation: DriverLocation | null;
  locationPermission: "granted" | "denied" | "undetermined";
  isTrackingLocation: boolean;
  login: (phone: string, password: string) => boolean;
  logout: () => void;
  toggleOnline: () => void;
  acceptOrder: () => void;
  declineOrder: () => void;
  advanceOrderStatus: () => void;
  requestLocationPermission: () => Promise<boolean>;
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
  { date: "السبت", trips: 8, earnings: 320, cashCollected: 580, commission: 80 },
  { date: "الأحد", trips: 12, earnings: 480, cashCollected: 890, commission: 120 },
  { date: "الاثنين", trips: 6, earnings: 240, cashCollected: 410, commission: 60 },
  { date: "الثلاثاء", trips: 15, earnings: 600, cashCollected: 1100, commission: 150 },
  { date: "الأربعاء", trips: 10, earnings: 400, cashCollected: 720, commission: 100 },
  { date: "الخميس", trips: 9, earnings: 360, cashCollected: 640, commission: 90 },
  { date: "الجمعة", trips: 11, earnings: 440, cashCollected: 800, commission: 110 },
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
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      return new Promise((resolve) => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLocationPermission("granted");
              setDriverLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                heading: pos.coords.heading,
                speed: pos.coords.speed,
                timestamp: pos.timestamp,
              });
              resolve(true);
            },
            () => {
              setLocationPermission("denied");
              resolve(false);
            }
          );
        } else {
          setLocationPermission("denied");
          resolve(false);
        }
      });
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      setLocationPermission("granted");
      return true;
    } else {
      setLocationPermission("denied");
      return false;
    }
  }, []);

  const startLocationTracking = useCallback(async () => {
    if (Platform.OS === "web") {
      if ("geolocation" in navigator) {
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            setDriverLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              timestamp: pos.timestamp,
            });
            setIsTrackingLocation(true);
          },
          () => setIsTrackingLocation(false),
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
        (locationSubscription.current as any) = { watchId, isWeb: true };
      }
      return;
    }

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      const granted = await requestLocationPermission();
      if (!granted) return;
    }

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 4000,
          distanceInterval: 10,
        },
        (loc) => {
          setDriverLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            heading: loc.coords.heading,
            speed: loc.coords.speed,
            timestamp: loc.timestamp,
          });
          setIsTrackingLocation(true);
        }
      );
      locationSubscription.current = sub;
    } catch {
      setIsTrackingLocation(false);
    }
  }, [requestLocationPermission]);

  const stopLocationTracking = useCallback(() => {
    if (locationSubscription.current) {
      if ((locationSubscription.current as any).isWeb) {
        navigator.geolocation.clearWatch((locationSubscription.current as any).watchId);
      } else {
        locationSubscription.current.remove();
      }
      locationSubscription.current = null;
    }
    setIsTrackingLocation(false);
  }, []);

  useEffect(() => {
    if (isOnline) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
    return () => {
      stopLocationTracking();
    };
  }, [isOnline]);

  const login = useCallback((phone: string, password: string): boolean => {
    if (phone.length >= 10 && password.length >= 4) {
      setIsAuthenticated(true);
      setDriver(MOCK_DRIVER);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    stopLocationTracking();
    setIsAuthenticated(false);
    setDriver(null);
    setIsOnline(false);
    setActiveOrder(null);
    setIncomingOrder(null);
    setDriverLocation(null);
  }, [stopLocationTracking]);

  const toggleOnline = useCallback(() => {
    setIsOnline((prev) => {
      const next = !prev;
      if (next && !activeOrder) {
        setTimeout(() => {
          setIncomingOrder(MOCK_INCOMING);
        }, 4000);
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
    const statusFlow: OrderStatus[] = ["to_restaurant", "picked_up", "to_customer", "delivered"];
    const currentIndex = statusFlow.indexOf(activeOrder.status);
    if (currentIndex < statusFlow.length - 1) {
      setActiveOrder({ ...activeOrder, status: statusFlow[currentIndex + 1] });
    } else {
      setActiveOrder(null);
      setDriver((prev) => prev ? { ...prev, totalTrips: prev.totalTrips + 1 } : prev);
      if (isOnline) {
        setTimeout(() => { setIncomingOrder(MOCK_INCOMING); }, 5000);
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
    driverLocation,
    locationPermission,
    isTrackingLocation,
    login,
    logout,
    toggleOnline,
    acceptOrder,
    declineOrder,
    advanceOrderStatus,
    requestLocationPermission,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
