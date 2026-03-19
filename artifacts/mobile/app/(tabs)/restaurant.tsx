import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import NativeMapView from "@/components/MapView";

export default function RestaurantScreen() {
  const insets = useSafeAreaInsets();
  const {
    tenantId,
    incomingOrder,
    activeOrder,
    driverLocation,
    isTrackingLocation,
    routePolyline,
    restaurantMarkOrderReady,
  } = useApp();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const restaurantName = activeOrder?.restaurantName ?? incomingOrder?.restaurantName ?? "مطعمك";
  const restaurantAddress = activeOrder?.restaurantAddress ?? incomingOrder?.restaurantAddress ?? "أضف عنوان المطعم";

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>لوحة المطعم</Text>
          <Text style={styles.subTitle}>{tenantId} • متابعة الطلبات والتحضير</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{restaurantName}</Text>
            <View style={styles.livePill}>
              <View style={[styles.dot, { backgroundColor: isTrackingLocation ? Colors.success : Colors.textMuted }]} />
              <Text style={styles.liveText}>{isTrackingLocation ? "السائق متصل" : "السائق غير متصل"}</Text>
            </View>
          </View>
          <Text style={styles.subInfo}>{restaurantAddress}</Text>
          <Text style={styles.subInfo}>الطلب الوارد: {incomingOrder?.id ?? "لا يوجد"}</Text>
          <Text style={styles.subInfo}>الطلب النشط: {activeOrder ? `${activeOrder.id} (${activeOrder.status})` : "لا يوجد"}</Text>
        </View>

        <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
          <View style={{ height: 260 }}>
            <NativeMapView
              restaurantName={activeOrder?.restaurantName ?? incomingOrder?.restaurantName}
              customerName={activeOrder?.customerName ?? "العميل"}
              restaurantLatitude={activeOrder?.restaurantLatitude ?? incomingOrder?.restaurantLatitude}
              restaurantLongitude={activeOrder?.restaurantLongitude ?? incomingOrder?.restaurantLongitude}
              customerLatitude={activeOrder?.customerLatitude ?? incomingOrder?.customerLatitude}
              customerLongitude={activeOrder?.customerLongitude ?? incomingOrder?.customerLongitude}
              orderStatus={activeOrder?.status}
              latitude={driverLocation?.latitude}
              longitude={driverLocation?.longitude}
              isTracking={isTrackingLocation}
              accuracy={driverLocation?.accuracy}
              routePolyline={routePolyline}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تنفيذ سريع من المطعم</Text>
          <Text style={styles.subInfo}>لما الطلب يبقى في الطريق للمطعم، اضغط "الطلب جاهز" عشان حالة الرحلة تتحدث فورًا.</Text>

          <Pressable
            style={[styles.readyBtn, !(activeOrder?.status === "to_restaurant") && styles.readyBtnDisabled]}
            disabled={activeOrder?.status !== "to_restaurant"}
            onPress={restaurantMarkOrderReady}
          >
            <Feather name="check-circle" size={16} color="#000" />
            <Text style={styles.readyBtnText}>الطلب جاهز للاستلام</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "right" },
  subTitle: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "right", marginTop: 2 },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
  },
  rowBetween: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "right" },
  subInfo: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "right", marginTop: 6 },
  livePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  readyBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 8,
  },
  readyBtnDisabled: { opacity: 0.45 },
  readyBtnText: { color: "#000", fontSize: 13, fontFamily: "Inter_700Bold" },
});
