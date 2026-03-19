import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, {
  Marker,
  Circle,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  restaurantName?: string;
  customerName?: string;
  latitude?: number;
  longitude?: number;
  isTracking?: boolean;
  accuracy?: number | null;
}

// Cairo center as fallback
const DEFAULT_LAT = 30.0444;
const DEFAULT_LNG = 31.2357;

// Offset helpers for demo markers around driver's location
const RESTAURANT_OFFSET = { lat: 0.008, lng: -0.005 };
const CUSTOMER_OFFSET = { lat: -0.012, lng: 0.009 };

export default function NativeMapView({
  restaurantName = "المطعم",
  customerName = "العميل",
  latitude,
  longitude,
  isTracking,
  accuracy,
}: Props) {
  const mapRef = useRef<MapView>(null);

  const driverLat = latitude ?? DEFAULT_LAT;
  const driverLng = longitude ?? DEFAULT_LNG;

  const restaurantLat = driverLat + RESTAURANT_OFFSET.lat;
  const restaurantLng = driverLng + RESTAURANT_OFFSET.lng;

  const customerLat = driverLat + CUSTOMER_OFFSET.lat;
  const customerLng = driverLng + CUSTOMER_OFFSET.lng;

  // Animate map to driver when location updates
  useEffect(() => {
    if (latitude && longitude && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        800
      );
    }
  }, [latitude, longitude]);

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
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
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

        {/* Restaurant marker */}
        <Marker
          coordinate={{ latitude: restaurantLat, longitude: restaurantLng }}
          anchor={{ x: 0.5, y: 1 }}
          zIndex={5}
        >
          <View style={styles.restaurantMarker}>
            <Feather name="shopping-bag" size={14} color="#fff" />
          </View>
        </Marker>

        {/* Customer marker */}
        <Marker
          coordinate={{ latitude: customerLat, longitude: customerLng }}
          anchor={{ x: 0.5, y: 1 }}
          zIndex={5}
        >
          <View style={styles.customerMarker}>
            <Feather name="home" size={14} color="#fff" />
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
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
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
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
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
  gpsBadgeWaiting: {
    borderColor: Colors.border,
  },
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

// Dark map style for react-native-maps
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0f1923" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1923" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];
