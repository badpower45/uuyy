import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, {
  Marker,
  Circle,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { OrderStatus } from "@/context/AppContext";

interface Props {
  restaurantName?: string;
  customerName?: string;
  restaurantLatitude?: number;
  restaurantLongitude?: number;
  customerLatitude?: number;
  customerLongitude?: number;
  orderStatus?: OrderStatus;
  latitude?: number;
  longitude?: number;
  isTracking?: boolean;
  accuracy?: number | null;
}

const DEFAULT_LAT = 30.0444;
const DEFAULT_LNG = 31.2357;

export default function NativeMapView({
  restaurantName = "المطعم",
  customerName = "العميل",
  restaurantLatitude,
  restaurantLongitude,
  customerLatitude,
  customerLongitude,
  orderStatus,
  latitude,
  longitude,
  isTracking,
  accuracy,
}: Props) {
  const mapRef = useRef<MapView>(null);

  const driverLat = latitude ?? DEFAULT_LAT;
  const driverLng = longitude ?? DEFAULT_LNG;

  // Use real coordinates if available, else offset from driver
  const restLat = restaurantLatitude ?? (driverLat + 0.008);
  const restLng = restaurantLongitude ?? (driverLng - 0.005);
  const custLat = customerLatitude ?? (driverLat - 0.012);
  const custLng = customerLongitude ?? (driverLng + 0.009);

  // Determine current destination for smart camera focus
  const isToRestaurant = orderStatus === "to_restaurant";
  const isToCustomer = orderStatus === "to_customer";
  const destLat = isToRestaurant ? restLat : isToCustomer ? custLat : driverLat;
  const destLng = isToRestaurant ? restLng : isToCustomer ? custLng : driverLng;

  // Animate map to show both driver and current destination
  useEffect(() => {
    if (!mapRef.current) return;

    if (latitude && longitude) {
      if (orderStatus === "to_restaurant" || orderStatus === "to_customer") {
        // Fit both driver and destination
        mapRef.current.fitToCoordinates(
          [
            { latitude: driverLat, longitude: driverLng },
            { latitude: destLat, longitude: destLng },
          ],
          {
            edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
            animated: true,
          }
        );
      } else {
        mapRef.current.animateToRegion(
          { latitude: driverLat, longitude: driverLng, latitudeDelta: 0.03, longitudeDelta: 0.03 },
          800
        );
      }
    }
  }, [latitude, longitude, orderStatus]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        mapType="standard"
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: driverLat,
          longitude: driverLng,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
      >
        {/* Driver accuracy circle */}
        {isTracking && accuracy && (
          <Circle
            center={{ latitude: driverLat, longitude: driverLng }}
            radius={accuracy}
            fillColor={Colors.primary + "20"}
            strokeColor={Colors.primary + "60"}
            strokeWidth={1}
          />
        )}

        {/* Driver marker */}
        <Marker
          coordinate={{ latitude: driverLat, longitude: driverLng }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={10}
        >
          <View style={styles.driverMarker}>
            <View style={styles.driverMarkerInner}>
              <Feather name="navigation" size={14} color="#fff" />
            </View>
          </View>
        </Marker>

        {/* Restaurant marker — highlighted when it's the current destination */}
        <Marker
          coordinate={{ latitude: restLat, longitude: restLng }}
          anchor={{ x: 0.5, y: 1 }}
          zIndex={isToRestaurant ? 9 : 5}
        >
          <View style={[
            styles.restaurantMarker,
            isToRestaurant && styles.activeMarker,
          ]}>
            <Feather name="shopping-bag" size={14} color="#fff" />
            {isToRestaurant && (
              <View style={styles.pulseRing} />
            )}
          </View>
        </Marker>

        {/* Customer marker — highlighted when it's the current destination */}
        <Marker
          coordinate={{ latitude: custLat, longitude: custLng }}
          anchor={{ x: 0.5, y: 1 }}
          zIndex={isToCustomer ? 9 : 5}
        >
          <View style={[
            styles.customerMarker,
            isToCustomer && styles.activeMarkerCustomer,
          ]}>
            <Feather name="home" size={14} color="#fff" />
            {isToCustomer && (
              <View style={[styles.pulseRing, { borderColor: Colors.accent }]} />
            )}
          </View>
        </Marker>
      </MapView>

      {/* GPS status badge */}
      {isTracking ? (
        <View style={styles.gpsBadge}>
          <View style={styles.gpsDot} />
          <Text style={styles.gpsText}>
            GPS • {driverLat.toFixed(4)}, {driverLng.toFixed(4)}
          </Text>
        </View>
      ) : (
        <View style={[styles.gpsBadge, styles.gpsBadgeWaiting]}>
          <Feather name="map-pin" size={10} color={Colors.textMuted} />
          <Text style={[styles.gpsText, { color: Colors.textMuted }]}>
            في انتظار الموقع...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  driverMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary + "40",
    alignItems: "center",
    justifyContent: "center",
  },
  driverMarkerInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  restaurantMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.warning,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  customerMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  activeMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: Colors.warning,
    borderWidth: 3,
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  activeMarkerCustomer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: Colors.accent,
    borderWidth: 3,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  pulseRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.warning,
    opacity: 0.5,
  },
  gpsBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(10,13,17,0.88)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.primary + "50",
  },
  gpsBadgeWaiting: { borderColor: Colors.border },
  gpsDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  gpsText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
});

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0f1923" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1923" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];
