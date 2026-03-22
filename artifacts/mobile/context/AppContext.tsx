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
  clearBackgroundTrackingContext,
  setBackgroundTrackingContext,
  setLocationUpdateCallback,
} from "@/tasks/locationTask";
import {
  apiClient,
  getApiBaseUrl,
  setApiTenantContext,
  type ApiDriver,
  type ApiWeeklyEarning,
  type ApiOrderTracking,
  type ApiOrderRoute,
} from "@/lib/api";

export type OrderStatus =
  | "to_restaurant"
  | "picked_up"
  | "to_customer"
  | "delivered";

export type RankTier = "bronze" | "silver" | "gold" | "platinum";
export type UserRole = "driver" | "restaurant" | "admin";

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
  commission: number;
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
  tenantId: string;
  userRole: UserRole;
  driver: Driver | null;
  isOnline: boolean;
  activeOrder: Order | null;
  incomingOrder: IncomingOrder | null;
  weeklyEarnings: WeeklyEarning[];
  driverLocation: DriverLocation | null;
  locationPermission: "granted" | "denied" | "undetermined";
  isTrackingLocation: boolean;
  isLoadingEarnings: boolean;
  routePolyline: [number, number][] | null;
  routeEta: string | null;
  routeSteps: Array<{ instruction: string; distanceM: number; durationSec: number }>;
  login: (phone: string, password: string, tenantId?: string, role?: UserRole) => boolean;
  logout: () => void;
  toggleOnline: () => void;
  adminSetOnline: (next: boolean) => void;
  adminUpdateDriver: (patch: Partial<Driver>) => void;
  adminCreateIncomingOrder: (payload: Partial<IncomingOrder>) => void;
  acceptOrder: () => void;
  declineOrder: () => void;
  restaurantMarkOrderReady: () => void;
  advanceOrderStatus: () => void;
  requestLocationPermission: () => Promise<boolean>;
  navigateToDestination: () => void;
  refreshEarnings: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function getDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusM = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * earthRadiusM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tenantId, setTenantId] = useState("pilot-main");
  const [userRole, setUserRole] = useState<UserRole>("driver");
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [incomingOrder, setIncomingOrder] = useState<IncomingOrder | null>(null);
  const [weeklyEarnings, setWeeklyEarnings] = useState<WeeklyEarning[]>([]);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [routePolyline, setRoutePolyline] = useState<[number, number][] | null>(null);
  const [routeEta, setRouteEta] = useState<string | null>(null);
  const [routeSteps, setRouteSteps] = useState<Array<{ instruction: string; distanceM: number; durationSec: number }>>([]);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const incomingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driverRef = useRef<Driver | null>(null);
  const activeOrderRef = useRef<Order | null>(null);
  const lastRouteRefreshRef = useRef<{
    orderId: string;
    status: OrderStatus;
    latitude: number;
    longitude: number;
    at: number;
  } | null>(null);

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
      console.warn("Failed to fetch earnings:", err);
      setWeeklyEarnings([]);
    } finally {
      setIsLoadingEarnings(false);
    }
  }, [driver]);

  useEffect(() => {
    driverRef.current = driver;
  }, [driver]);

  useEffect(() => {
    activeOrderRef.current = activeOrder;
  }, [activeOrder]);

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
      console.warn("Driver API unavailable:", err);
      return null;
    }
  }, []);

  // Refresh earnings when driver is set
  useEffect(() => {
    if (driver) {
      refreshEarnings();
    }
  }, [driver?.id]);

  // Fetch and store the OSRM route for the active order
  const fetchRoute = useCallback(async (orderId: number, driverLat: number, driverLng: number) => {
    try {
      const data: ApiOrderRoute = await apiClient.getOrderRoute({ driverLat, driverLng, orderId });
      if (data.route?.polyline?.length) {
        setRoutePolyline(data.route.polyline);
        setRouteEta(data.route.etaLabel);
        const activeLeg = data.route.legs[data.route.activeLegIndex] ?? data.route.legs[0];
        setRouteSteps(activeLeg?.steps ?? []);
        lastRouteRefreshRef.current = {
          orderId: String(orderId),
          status: data.status as OrderStatus,
          latitude: driverLat,
          longitude: driverLng,
          at: Date.now(),
        };
      }
    } catch (err) {
      console.warn("Failed to fetch route:", err);
    }
  }, []);

  // Poll for incoming orders every 8 seconds when online and no active order
  const startIncomingPoll = useCallback((drivId: number) => {
    if (incomingPollRef.current) clearInterval(incomingPollRef.current);
    const poll = async () => {
      try {
        const order = await apiClient.getIncomingOrder(drivId);
        if (order) {
          setIncomingOrder({
            id: String(order.id),
            restaurantName: order.restaurantName,
            restaurantAddress: order.restaurantAddress,
            restaurantLatitude: order.restaurantLatitude ?? 30.0626,
            restaurantLongitude: order.restaurantLongitude ?? 31.1992,
            customerAddress: order.customerAddress,
            customerLatitude: order.customerLatitude ?? 30.0754,
            customerLongitude: order.customerLongitude ?? 31.3366,
            distance: order.distanceKm ? `${order.distanceKm} كم` : "—",
            fare: order.fare,
          });
          if (incomingPollRef.current) clearInterval(incomingPollRef.current);
        }
      } catch (err) {
        console.warn("Incoming order poll error:", err);
      }
    };
    poll();
    incomingPollRef.current = setInterval(poll, 8000);
  }, []);

  const stopIncomingPoll = useCallback(() => {
    if (incomingPollRef.current) {
      clearInterval(incomingPollRef.current);
      incomingPollRef.current = null;
    }
  }, []);

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

  const lastSavedLocationRef = useRef<number>(0);
  const syncBackgroundTracking = useCallback(async () => {
    if (Platform.OS === "web") return;
    const currentDriver = driverRef.current;

    if (!isOnline || !currentDriver) {
      await clearBackgroundTrackingContext().catch(() => {});
      return;
    }

    await setBackgroundTrackingContext({
      apiBaseUrl: getApiBaseUrl(),
      driverId: currentDriver.id,
      orderId: activeOrderRef.current ? parseInt(activeOrderRef.current.id) : null,
    }).catch(() => {});
  }, [isOnline]);

  const pushLocationToBackend = useCallback((newLoc: DriverLocation) => {
    const currentDriver = driverRef.current;
    if (!currentDriver) return;

    const currentOrder = activeOrderRef.current;
    apiClient.saveLocation(currentDriver.id, {
      latitude: newLoc.latitude,
      longitude: newLoc.longitude,
      accuracy: newLoc.accuracy,
      heading: newLoc.heading,
      speed: newLoc.speed,
      orderId: currentOrder ? parseInt(currentOrder.id) : null,
    }).catch(() => {});
  }, []);

  const maybeRefreshActiveRoute = useCallback((newLoc: DriverLocation) => {
    const currentOrder = activeOrderRef.current;
    if (!currentOrder) return;
    if (currentOrder.status !== "to_restaurant" && currentOrder.status !== "to_customer") {
      return;
    }

    const lastRefresh = lastRouteRefreshRef.current;
    const now = Date.now();
    const needsRefresh =
      !lastRefresh ||
      lastRefresh.orderId !== currentOrder.id ||
      lastRefresh.status !== currentOrder.status ||
      now - lastRefresh.at > 15000 ||
      getDistanceMeters(
        { latitude: lastRefresh.latitude, longitude: lastRefresh.longitude },
        { latitude: newLoc.latitude, longitude: newLoc.longitude }
      ) > 70;

    if (!needsRefresh) return;
    fetchRoute(parseInt(currentOrder.id), newLoc.latitude, newLoc.longitude);
  }, [fetchRoute]);

  const applyDriverLocation = useCallback((newLoc: DriverLocation) => {
    setDriverLocation(newLoc);
    setIsTrackingLocation(true);

    const now = Date.now();
    if (now - lastSavedLocationRef.current > 5000) {
      lastSavedLocationRef.current = now;
      pushLocationToBackend(newLoc);
    }

    maybeRefreshActiveRoute(newLoc);
  }, [maybeRefreshActiveRoute, pushLocationToBackend]);

  const handleLocationUpdate = useCallback((loc: Location.LocationObject) => {
    applyDriverLocation({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      heading: loc.coords.heading,
      speed: loc.coords.speed,
      timestamp: loc.timestamp,
    });
  }, [applyDriverLocation]);

  const startLocationTracking = useCallback(async () => {
    if (Platform.OS === "web") {
      if ("geolocation" in navigator) {
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            applyDriverLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              timestamp: pos.timestamp,
            });
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
  }, [applyDriverLocation, requestLocationPermission, handleLocationUpdate]);

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
    if (Platform.OS !== "web") {
      clearBackgroundTrackingContext().catch(() => {});
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

  useEffect(() => {
    syncBackgroundTracking();
  }, [syncBackgroundTracking, activeOrder?.id, activeOrder?.status, driver?.id]);

  useEffect(() => {
    if (!activeOrder) return;
    if (userRole === "driver" && isTrackingLocation) return;

    let cancelled = false;
    const orderId = parseInt(activeOrder.id);

    const refreshTracking = async () => {
      try {
        const tracking: ApiOrderTracking = await apiClient.getOrderTracking(orderId);
        if (cancelled) return;

        if (tracking.driverLocation) {
          setDriverLocation({
            latitude: tracking.driverLocation.latitude,
            longitude: tracking.driverLocation.longitude,
            accuracy: tracking.driverLocation.accuracy,
            heading: tracking.driverLocation.heading,
            speed: tracking.driverLocation.speed,
            timestamp: new Date(tracking.driverLocation.recordedAt).getTime(),
          });
          setIsTrackingLocation(true);
        }

        if (tracking.route?.polyline?.length) {
          setRoutePolyline(tracking.route.polyline);
          setRouteEta(tracking.route.etaLabel);
          const activeLeg = tracking.route.legs[tracking.route.activeLegIndex] ?? tracking.route.legs[0];
          setRouteSteps(activeLeg?.steps ?? []);
        }
      } catch (err) {
        console.warn("Order tracking poll failed:", err);
      }
    };

    refreshTracking();
    const interval = setInterval(refreshTracking, 12000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeOrder?.id, isTrackingLocation, userRole]);

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

  const login = useCallback((phone: string, password: string, tenant?: string, role: UserRole = "driver"): boolean => {
    const normalizedTenant = tenant?.trim().toLowerCase() || "pilot-main";

    if (phone.length >= 10 && password.length >= 4 && normalizedTenant.length >= 3) {
      setTenantId(normalizedTenant);
      setUserRole(role);
      setApiTenantContext({ tenantId: normalizedTenant, role });
      setIsAuthenticated(true);

      // Set immediate local profile to avoid blank screens while API resolves.
      setDriver({
        id: 1,
        name: "سائق بايلوت",
        phone,
        avatar: "س",
        rank: "gold",
        balance: -85.5,
        creditLimit: 500,
        totalTrips: 0,
        rating: 4.8,
      });

      fetchDriver(phone).then((d) => {
        if (d) {
          setDriver(d);
          if (role === "driver") {
            setTimeout(() => {
              setIsOnline(true);
              startIncomingPoll(d.id);
            }, 1200);
          } else {
            setIsOnline(false);
            stopIncomingPoll();
          }
        }
      });
      return true;
    }
    return false;
  }, [fetchDriver, startIncomingPoll, stopIncomingPoll]);

  const logout = useCallback(() => {
    stopLocationTracking();
    stopIncomingPoll();
    setIsAuthenticated(false);
    setTenantId("pilot-main");
    setUserRole("driver");
    setApiTenantContext({ tenantId: "pilot-main", role: "driver" });
    setDriver(null);
    setIsOnline(false);
    setActiveOrder(null);
    setIncomingOrder(null);
    setDriverLocation(null);
    setWeeklyEarnings([]);
    setRoutePolyline(null);
    setRouteEta(null);
    setRouteSteps([]);
  }, [stopLocationTracking, stopIncomingPoll]);

  const toggleOnline = useCallback(() => {
    setIsOnline((prev) => {
      const next = !prev;
      if (next && !activeOrder && driver) {
        startIncomingPoll(driver.id);
      }
      if (!next) {
        stopIncomingPoll();
        setIncomingOrder(null);
      }
      return next;
    });
  }, [activeOrder, driver, startIncomingPoll, stopIncomingPoll]);

  const adminSetOnline = useCallback((next: boolean) => {
    setIsOnline(next);
    if (next && !activeOrder && driver) {
      startIncomingPoll(driver.id);
    }
    if (!next) {
      stopIncomingPoll();
      setIncomingOrder(null);
    }
  }, [activeOrder, driver, startIncomingPoll, stopIncomingPoll]);

  const adminUpdateDriver = useCallback((patch: Partial<Driver>) => {
    setDriver((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const adminCreateIncomingOrder = useCallback((payload: Partial<IncomingOrder>) => {
    const fallbackLat = driverLocation?.latitude ?? 30.0444;
    const fallbackLng = driverLocation?.longitude ?? 31.2357;

    const next: IncomingOrder = {
      id: payload.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      restaurantName: payload.restaurantName || "مطعم جديد",
      restaurantAddress: payload.restaurantAddress || "عنوان المطعم",
      restaurantLatitude: payload.restaurantLatitude ?? fallbackLat + 0.01,
      restaurantLongitude: payload.restaurantLongitude ?? fallbackLng - 0.01,
      customerAddress: payload.customerAddress || "عنوان العميل",
      customerLatitude: payload.customerLatitude ?? fallbackLat + 0.02,
      customerLongitude: payload.customerLongitude ?? fallbackLng + 0.01,
      distance: payload.distance || "—",
      fare: payload.fare ?? 0,
    };

    setIncomingOrder(next);
  }, [driverLocation]);

  const acceptOrder = useCallback(() => {
    if (!incomingOrder || !driver) return;
    const orderId = parseInt(incomingOrder.id);

    apiClient.acceptOrder(orderId, driver.id)
      .then((apiOrder) => {
        const order: Order = {
          id: String(apiOrder.id),
          restaurantName: apiOrder.restaurantName,
          restaurantAddress: apiOrder.restaurantAddress,
          restaurantLatitude: apiOrder.restaurantLatitude ?? incomingOrder.restaurantLatitude,
          restaurantLongitude: apiOrder.restaurantLongitude ?? incomingOrder.restaurantLongitude,
          customerName: apiOrder.customerName,
          customerPhone: apiOrder.customerPhone,
          customerAddress: apiOrder.customerAddress,
          customerLatitude: apiOrder.customerLatitude ?? incomingOrder.customerLatitude,
          customerLongitude: apiOrder.customerLongitude ?? incomingOrder.customerLongitude,
          distance: apiOrder.distanceKm ? `${apiOrder.distanceKm} كم` : incomingOrder.distance,
          fare: apiOrder.fare,
          cashToCollect: apiOrder.cashToCollect,
          commission: apiOrder.commission,
          status: "to_restaurant",
        };
        setActiveOrder(order);
        setIncomingOrder(null);
        stopIncomingPoll();

        // Fetch real OSRM route immediately
        const dLat = driverLocation?.latitude ?? order.restaurantLatitude;
        const dLng = driverLocation?.longitude ?? order.restaurantLongitude;
        fetchRoute(apiOrder.id, dLat, dLng);
      })
      .catch((err) => {
        console.warn("Accept order failed:", err);
      });
  }, [incomingOrder, driver, driverLocation, fetchRoute, stopIncomingPoll]);

  const declineOrder = useCallback(() => {
    if (incomingOrder) {
      apiClient.declineOrder(parseInt(incomingOrder.id)).catch(console.warn);
    }
    setIncomingOrder(null);
    // Resume polling after 10 seconds
    if (driver) {
      setTimeout(() => startIncomingPoll(driver.id), 10000);
    }
  }, [incomingOrder, driver, startIncomingPoll]);

  const restaurantMarkOrderReady = useCallback(() => {
    if (!activeOrder) return;
    if (activeOrder.status !== "to_restaurant") return;

    const orderId = parseInt(activeOrder.id);
    setActiveOrder({ ...activeOrder, status: "picked_up" });
    apiClient.advanceOrderStatus(orderId, "picked_up").catch(console.warn);
  }, [activeOrder]);

  const advanceOrderStatus = useCallback(() => {
    if (!activeOrder) return;
    const statusFlow: OrderStatus[] = ["to_restaurant", "picked_up", "to_customer", "delivered"];
    const currentIndex = statusFlow.indexOf(activeOrder.status);
    if (currentIndex < statusFlow.length - 1) {
      const nextStatus = statusFlow[currentIndex + 1];
      setActiveOrder({ ...activeOrder, status: nextStatus });

      const orderId = parseInt(activeOrder.id);
      apiClient.advanceOrderStatus(orderId, nextStatus).catch(console.warn);

      // Re-fetch route if moving to next navigation leg
      if (nextStatus === "to_customer") {
        const routeLat = driverLocation?.latitude ?? activeOrder.restaurantLatitude;
        const routeLng = driverLocation?.longitude ?? activeOrder.restaurantLongitude;
        fetchRoute(orderId, routeLat, routeLng);
      } else if (nextStatus === "picked_up") {
        setRoutePolyline(null);
        setRouteEta(null);
        setRouteSteps([]);
      }
    } else {
      const orderId = parseInt(activeOrder.id);
      // Order delivered
      apiClient.advanceOrderStatus(orderId, "delivered").catch(console.warn);
      if (driver) {
        apiClient.recordEarning(driver.id, {
          amount: activeOrder.fare,
          cashCollected: activeOrder.cashToCollect,
          commission: activeOrder.commission,
          orderId,
        }).catch(console.warn);
      }
      setActiveOrder(null);
      setRoutePolyline(null);
      setRouteEta(null);
      setRouteSteps([]);
      lastRouteRefreshRef.current = null;
      setDriver((prev) => prev ? { ...prev, totalTrips: prev.totalTrips + 1 } : prev);
      setTimeout(() => refreshEarnings(), 1000);
      if (isOnline && driver) {
        setTimeout(() => startIncomingPoll(driver.id), 5000);
      }
    }
  }, [activeOrder, isOnline, driver, driverLocation, fetchRoute, refreshEarnings, startIncomingPoll]);

  const value: AppContextType = {
    isAuthenticated,
    tenantId,
    userRole,
    driver,
    isOnline,
    activeOrder,
    incomingOrder,
    weeklyEarnings,
    driverLocation,
    locationPermission,
    isTrackingLocation,
    isLoadingEarnings,
    routePolyline,
    routeEta,
    routeSteps,
    login,
    logout,
    toggleOnline,
    adminSetOnline,
    adminUpdateDriver,
    adminCreateIncomingOrder,
    acceptOrder,
    declineOrder,
    restaurantMarkOrderReady,
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
