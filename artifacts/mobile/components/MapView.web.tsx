import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  latitude?: number;
  longitude?: number;
  isTracking?: boolean;
  accuracy?: number | null;
}

export default function WebMapView({ latitude, longitude, isTracking, accuracy }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.mapBg}>
        {/* Simulated grid lines */}
        {[...Array(6)].map((_, i) => (
          <View key={`h${i}`} style={[styles.gridH, { top: `${i * 20}%` as any }]} />
        ))}
        {[...Array(6)].map((_, i) => (
          <View key={`v${i}`} style={[styles.gridV, { left: `${i * 20}%` as any }]} />
        ))}

        {/* Center marker */}
        <View style={styles.markerWrap}>
          <View style={styles.markerPing} />
          <View style={styles.marker}>
            <Feather name="navigation" size={18} color="#fff" />
          </View>
        </View>

        {/* Location info overlay */}
        {isTracking && latitude && longitude ? (
          <View style={styles.coordBox}>
            <View style={styles.coordRow}>
              <View style={styles.activeDot} />
              <Text style={styles.coordTitle}>تتبع GPS نشط</Text>
            </View>
            <Text style={styles.coordValue}>
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Text>
            {accuracy !== null && accuracy !== undefined && (
              <Text style={styles.coordAccuracy}>
                دقة: ±{Math.round(accuracy)} متر
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.coordBox}>
            <View style={styles.coordRow}>
              <Feather name="map-pin" size={12} color={Colors.textMuted} />
              <Text style={styles.coordWaiting}>في انتظار بيانات الموقع...</Text>
            </View>
          </View>
        )}

        <Text style={styles.mapNote}>الخريطة التفاعلية متاحة على الجهاز المحمول</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  mapBg: {
    flex: 1,
    backgroundColor: "#0F1923",
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  markerWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  markerPing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    opacity: 0.15,
  },
  marker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  coordBox: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(17,24,39,0.92)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 200,
  },
  coordRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  coordTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  coordValue: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    textAlign: "right",
    marginBottom: 2,
  },
  coordAccuracy: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "right",
  },
  coordWaiting: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  mapNote: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
