import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";

interface Props {
  latitude?: number;
  longitude?: number;
  restaurantName?: string;
  customerName?: string;
  restaurantLatitude?: number;
  restaurantLongitude?: number;
  customerLatitude?: number;
  customerLongitude?: number;
  isTracking?: boolean;
  accuracy?: number | null;
  orderStatus?: string;
  routePolyline?: [number, number][] | null;
}

const CAIRO_LAT = 30.0444;
const CAIRO_LNG = 31.2357;

export default function WebMapView({
  latitude,
  longitude,
  restaurantName,
  customerName,
  restaurantLatitude,
  restaurantLongitude,
  customerLatitude,
  customerLongitude,
  orderStatus,
  routePolyline,
}: Props) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const lRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const restMarkerRef = useRef<any>(null);
  const custMarkerRef = useRef<any>(null);
  const routeRef = useRef<any>(null);
  const routeGlowRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    // Inject Leaflet CSS from CDN
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const init = async () => {
      if (mapRef.current) return;

      const L = (await import("leaflet")).default;
      lRef.current = L;

      const lat = latitude ?? CAIRO_LAT;
      const lng = longitude ?? CAIRO_LNG;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      // CartoDB Dark Matter tiles — free, no API key
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 20 }
      ).addTo(map);

      // Small attribution bottom-left
      L.control
        .attribution({ prefix: "© OpenStreetMap © CARTO", position: "bottomleft" })
        .addTo(map);

      const makeIcon = (emoji: string, bg: string) =>
        L.divIcon({
          html: `
            <div style="
              width:44px;height:44px;border-radius:50%;
              background:${bg};border:3px solid #fff;
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 0 18px ${bg}99;font-size:20px;
              position:relative;
            ">
              ${emoji}
              <div style="
                position:absolute;bottom:-10px;left:50%;
                transform:translateX(-50%);
                width:0;height:0;
                border-left:7px solid transparent;
                border-right:7px solid transparent;
                border-top:10px solid ${bg};
              "></div>
            </div>`,
          iconSize: [44, 54],
          iconAnchor: [22, 54],
          popupAnchor: [0, -54],
          className: "",
        });

      const restLat = restaurantLatitude ?? lat + 0.008;
      const restLng = restaurantLongitude ?? lng - 0.005;
      const custLat = customerLatitude ?? lat - 0.012;
      const custLng = customerLongitude ?? lng + 0.009;

      driverMarkerRef.current = L.marker([lat, lng], {
        icon: makeIcon("🚗", "#22C55E"),
      })
        .addTo(map)
        .bindPopup("موقعك الحالي");

      restMarkerRef.current = L.marker([restLat, restLng], {
        icon: makeIcon("🍽️", "#F59E0B"),
      })
        .addTo(map)
        .bindPopup(restaurantName ?? "المطعم");

      custMarkerRef.current = L.marker([custLat, custLng], {
        icon: makeIcon("📦", "#3B82F6"),
      })
        .addTo(map)
        .bindPopup(customerName ?? "العميل");

      // Dashed route polyline
      routeRef.current = L.polyline(
        [
          [lat, lng],
          [restLat, restLng],
          [custLat, custLng],
        ],
        { color: "#22C55E", weight: 3, opacity: 0.7, dashArray: "10 8" }
      ).addTo(map);

      mapRef.current = map;

      // Fit map to all markers on init
      const L2 = L;
      const bounds = L2.latLngBounds([
        [lat, lng],
        [restLat, restLng],
        [custLat, custLng],
      ]);
      map.fitBounds(bounds, { padding: [60, 60] });
    };

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        lRef.current = null;
        driverMarkerRef.current = null;
        restMarkerRef.current = null;
        custMarkerRef.current = null;
        routeRef.current = null;
        routeGlowRef.current = null;
      }
    };
  }, []);

  // Draw real OSRM polyline when route data changes
  useEffect(() => {
    if (!mapRef.current || !lRef.current || !routePolyline?.length) return;
    const L = lRef.current;
    const map = mapRef.current;

    // Remove old layers
    if (routeGlowRef.current) { map.removeLayer(routeGlowRef.current); routeGlowRef.current = null; }
    if (routeRef.current) { map.removeLayer(routeRef.current); routeRef.current = null; }

    // OSRM returns [lng, lat] — flip to [lat, lng] for Leaflet
    const latLngs: [number, number][] = routePolyline.map(([lng2, lat2]) => [lat2, lng2]);

    const routeColor = orderStatus === "to_restaurant" ? "#F59E0B" : "#22C55E";

    // Glow effect (wide, soft)
    routeGlowRef.current = L.polyline(latLngs, {
      color: routeColor,
      weight: 14,
      opacity: 0.15,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    // Main line
    routeRef.current = L.polyline(latLngs, {
      color: routeColor,
      weight: 4.5,
      opacity: 0.92,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    // Fit to route with padding
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [80, 80], animate: true });
  }, [routePolyline, orderStatus]);

  // Update driver marker when GPS changes
  useEffect(() => {
    if (!mapRef.current || latitude == null || longitude == null) return;
    const pos: [number, number] = [latitude, longitude];
    driverMarkerRef.current?.setLatLng(pos);

    // Only pan if no real route is displayed
    if (!routePolyline?.length) {
      mapRef.current.panTo(pos, { animate: true, duration: 0.8 });
    }
  }, [latitude, longitude, routePolyline]);

  return (
    <View style={styles.container}>
      <View ref={containerRef} style={styles.map} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
});
