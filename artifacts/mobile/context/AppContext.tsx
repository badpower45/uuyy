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
import { Platform, Linking, Alert } from "react-native";
import {
  BACKGROUND_LOCATION_TASK,
  setLocationUpdateCallback,
} from "@/tasks/locationTask";
import { apiClient, type ApiDriver, type ApiWeeklyEarning } from "@/lib/api";

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
  restaurantLatitude: number;
  restaurantLongitude: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerLatitude: number;
  customerLongitude: number;
  distance: string;
  fare: number;
  cashToCollect: number;
  status: OrderStatus;
}

export interface IncomingOrder {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLatitude: number;
  restaurantLongitude: number;
  customerAddress: string;
  customerLatitude: number;
  customerLongitude: number;
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
  id: number;
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
  isLoadingEarnings: boolean;
  login: (phone: string, password: string) => boolean;
  logout: () => void;
  toggleOnline: () => void;
  acceptOrder: () => void;
  declineOrder: () => void;
  advanceOrderStatus: () => void;
  requestLocationPermission: () => Promise<boolean>;
  navigateToDestination: () => void;
  refreshEarnings: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Cairo area coordinates for demo
const MOCK_INCOMING: IncomingOrder = {
  id: "ORD-8821",
  restaurantName: "مطعم الأصالة",
  restaurantAddress: "شارع التحرير، الدقي",
  restaurantLatitude: 30.0626,
  restaurantLongitude: 31.1992,
  customerAddress: "مدينة نصر، شارع عباس العقاد",
  customerLatitude: 30.0754,
  customerLongitude: 31.3366,
  distance: "4.2 كم",
  fare: 55,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [incomingOrder, setIncomingOrder] = useState<IncomingOrder | null>(null);
  const [weeklyEarnings, setWeeklyEarnings] = useState<WeeklyEarning[]>([]);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Fetch weekly earnings from real API
  const refreshEarnings = useCallback(async () => {
    if (!driver) return;
    setIsLoadingEarnings(true);
    try {
      const data = await apiClient.getWeeklyEarnings(driver.id);
      setWeeklyEarnings(
        data.map((d: ApiWeeklyEarning) => ({
          date: d.date,
          trips: d.trips,
          earnings: d.earnings,
          cashCollected: d.cashCollected,
          commission: d.commission,
        }))
      );
    } catch (err) {
      console.warn("Failed to fetch earnings, using fallback:", err);
      // Fallback mock data
      setWeeklyEarnings([
        { date: "السبت", trips: 8, earnings: 320, cashCollected: 580, commission: 80 },
        { date: "الأحد", trips: 12, earnings: 480, cashCollected: 890, commission: 120 },
        { date: "الاثنين", trips: 6, earnings: 240, cashCollected: 410, commission: 60 },
        { date: "الثلاثاء", trips: 15, earnings: 600, cashCollected: 1100, commission: 150 },
        { date: "الأربعاء", trips: 10, earnings: 400, cashCollected: 720, commission: 100 },
        { date: "الخميس", trips: 9, earnings: 360, cashCollected: 640, commission: 90 },
        { date: "الجمعة", trips: 11, earnings: 440, cashCollected: 800, commission: 110 },
      ]);
    } finally {
      setIsLoadingEarnings(false);
    }
  }, [driver]);

  // Fetch driver from API on login
  const fetchDriver = useCallback(async (phone: string): Promise<Driver | null> => {
    try {
      const data: ApiDriver = await apiClient.getDriverByPhone(phone);
      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        avatar: data.avatarLetter,
        rank: data.rank,
        balance: data.balance,
        creditLimit: data.creditLimit,
        totalTrips: data.totalTrips,
        rating: data.rating,
      };
    } catch (err) {
      console.warn("Driver API unavailable, using mock:", err);
      return {
        id: 1,
        name: "محمد أحمد",
        phone,
        avatar: "م",
        rank: "gold",
        balance: -85.5,
        creditLimit: 500,
        totalTrips: 247,
        rating: 4.8,
      };
    }
  }, []);

  // Refresh earnings when driver is set
  useEffect(() => {
    if (driver) {
      refreshEarnings();
    }
  }, [driver?.id]);

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

  const handleLocationUpdate = useCallback((loc: Location.LocationObject) => {
    setDriverLocation({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      heading: loc.coords.heading,
      speed: loc.coords.speed,
      timestamp: loc.timestamp,
    });
    setIsTrackingLocation(true);
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

    setLocationUpdateCallback(handleLocationUpdate);

    try {
      const TaskManager = require("expo-task-manager");
      const bgStatus = await Location.requestBackgroundPermissionsAsync();
      const taskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (bgStatus.status === "granted" && !taskRegistered) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 4000,
          distanceInterval: 10,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "بايلوت — تتبع موقعك",
            notificationBody: "موقعك يُشارك مع العملاء أثناء التوصيل",
            notificationColor: "#22C55E",
          },
        });
        setIsTrackingLocation(true);
        return;
      }
    } catch {
      // Background not available (Expo Go) — fall through to foreground
    }

    try {
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 10 },
        handleLocationUpdate
      );
      locationSubscription.current = sub;
    } catch {
      setIsTrackingLocation(false);
    }
  }, [requestLocationPermission, handleLocationUpdate]);

  const stopLocationTracking = useCallback(async () => {
    if (locationSubscription.current) {
      if ((locationSubscription.current as any).isWeb) {
        navigator.geolocation.clearWatch((locationSubscription.current as any).watchId);
      } else {
        locationSubscription.current.remove();
      }
      locationSubscription.current = null;
    }
    if (Platform.OS !== "web") {
      try {
        const TaskManager = require("expo-task-manager");
        const taskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (taskRegistered) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }
      } catch {
        // Ignore cleanup errors
      }
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

  // Smart navigation: open Google Maps / Apple Maps with the right destination
  const navigateToDestination = useCallback(() => {
    if (!activeOrder) return;

    const isToRestaurant = activeOrder.status === "to_restaurant";
    const destLat = isToRestaurant
      ? activeOrder.restaurantLatitude
      : activeOrder.customerLatitude;
    const destLng = isToRestaurant
      ? activeOrder.restaurantLongitude
      : activeOrder.customerLongitude;
    const label = isToRestaurant
      ? activeOrder.restaurantName
      : activeOrder.customerName;

    const driverLat = driverLocation?.latitude;
    const driverLng = driverLocation?.longitude;

    let url: string;
    if (Platform.OS === "ios") {
      // Apple Maps with directions
      if (driverLat && driverLng) {
        url = `maps://?saddr=${driverLat},${driverLng}&daddr=${destLat},${destLng}&dirflg=d`;
      } else {
        url = `maps://?daddr=${destLat},${destLng}&dirflg=d`;
      }
    } else {
      // Google Maps
      if (driverLat && driverLng) {
        url = `https://www.google.com/maps/dir/?api=1&origin=${driverLat},${driverLng}&destination=${destLat},${destLng}&travelmode=driving`;
      } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
      }
    }

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        const fallback = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
        Linking.openURL(fallback);
      }
    });
  }, [activeOrder, driverLocation]);

  const login = useCallback((phone: string, password: string): boolean => {
    if (phone.length >= 10 && password.length >= 4) {
      setIsAuthenticated(true);
      fetchDriver(phone).then((d) => {
        if (d) setDriver(d);
      });
      setTimeout(() => {
        setIsOnline(true);
        setTimeout(() => {
          setIncomingOrder(MOCK_INCOMING);
        }, 3500);
      }, 2000);
      return true;
    }
    return false;
  }, [fetchDriver]);

  const logout = useCallback(() => {
    stopLocationTracking();
    setIsAuthenticated(false);
    setDriver(null);
    setIsOnline(false);
    setActiveOrder(null);
    setIncomingOrder(null);
    setDriverLocation(null);
    setWeeklyEarnings([]);
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
      restaurantLatitude: incomingOrder.restaurantLatitude,
      restaurantLongitude: incomingOrder.restaurantLongitude,
      customerName: "سارة محمود",
      customerPhone: "01098765432",
      customerAddress: incomingOrder.customerAddress,
      customerLatitude: incomingOrder.customerLatitude,
      customerLongitude: incomingOrder.customerLongitude,
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
      // Order delivered — record earning
      if (driver) {
        const commission = activeOrder.fare * 0.25;
        apiClient.recordEarning(driver.id, {
          amount: activeOrder.fare,
          cashCollected: activeOrder.cashToCollect,
          commission,
        }).catch(console.warn);
      }
      setActiveOrder(null);
      setDriver((prev) => prev ? { ...prev, totalTrips: prev.totalTrips + 1 } : prev);
      // Refresh earnings after delivery
      setTimeout(() => refreshEarnings(), 1000);
      if (isOnline) {
        setTimeout(() => { setIncomingOrder(MOCK_INCOMING); }, 5000);
      }
    }
  }, [activeOrder, isOnline, driver, refreshEarnings]);

  const value: AppContextType = {
    isAuthenticated,
    driver,
    isOnline,
    activeOrder,
    incomingOrder,
    weeklyEarnings,
    driverLocation,
    locationPermission,
    isTrackingLocation,
    isLoadingEarnings,
    login,
    logout,
    toggleOnline,
    acceptOrder,
    declineOrder,
    advanceOrderStatus,
    requestLocationPermission,
    navigateToDestination,
    refreshEarnings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
