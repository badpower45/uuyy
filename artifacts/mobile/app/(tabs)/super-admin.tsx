import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import NativeMapView from "@/components/MapView";

export default function SuperAdminScreen() {
  const insets = useSafeAreaInsets();
  const {
    tenantId,
    userRole,
    driver,
    isOnline,
    driverLocation,
    isTrackingLocation,
    incomingOrder,
    activeOrder,
    weeklyEarnings,
    routePolyline,
    adminSetOnline,
    adminUpdateDriver,
    adminCreateIncomingOrder,
  } = useApp();

  const [restaurantName, setRestaurantName] = useState("مطعم الأصالة");
  const [restaurantAddress, setRestaurantAddress] = useState("الدقي - شارع التحرير");
  const [customerAddress, setCustomerAddress] = useState("مدينة نصر - عباس العقاد");
  const [fare, setFare] = useState("65");
  const [distance, setDistance] = useState("4.8 كم");
  const [balanceInput, setBalanceInput] = useState(driver ? String(driver.balance) : "0");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const summary = useMemo(() => {
    const earnings = weeklyEarnings.reduce((s, d) => s + d.earnings, 0);
    const trips = weeklyEarnings.reduce((s, d) => s + d.trips, 0);
    return { earnings, trips };
  }, [weeklyEarnings]);

  const restLat = activeOrder?.restaurantLatitude ?? incomingOrder?.restaurantLatitude;
  const restLng = activeOrder?.restaurantLongitude ?? incomingOrder?.restaurantLongitude;
  const custLat = activeOrder?.customerLatitude ?? incomingOrder?.customerLatitude;
  const custLng = activeOrder?.customerLongitude ?? incomingOrder?.customerLongitude;
  const trackedOrderId = activeOrder?.id ?? incomingOrder?.id;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>لوحة السوبر أدمن</Text>
            <Text style={styles.subTitle}>{tenantId} • {userRole}</Text>
          </View>
          <View style={[styles.statusChip, { borderColor: isOnline ? Colors.success : Colors.danger }]}> 
            <Text style={[styles.statusText, { color: isOnline ? Colors.success : Colors.danger }]}>
              {isOnline ? "Driver Online" : "Driver Offline"}
            </Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <KpiCard label="إجمالي رحلات الأسبوع" value={String(summary.trips)} icon="truck" />
          <KpiCard label="إجمالي أرباح الأسبوع" value={`${summary.earnings} ج`} icon="bar-chart-2" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>متابعة مخرجات السائق</Text>
          <Text style={styles.line}>الاسم: {driver?.name ?? "—"}</Text>
          <Text style={styles.line}>الموبايل: {driver?.phone ?? "—"}</Text>
          <Text style={styles.line}>الموقع الحالي: {driverLocation ? `${driverLocation.latitude.toFixed(5)}, ${driverLocation.longitude.toFixed(5)}` : "غير متاح"}</Text>
          <Text style={styles.line}>تتبع GPS: {isTrackingLocation ? "شغال" : "متوقف"}</Text>
          <Text style={styles.line}>طلب وارد: {incomingOrder ? incomingOrder.id : "لا يوجد"}</Text>
          <Text style={styles.line}>طلب نشط: {activeOrder ? `${activeOrder.id} (${activeOrder.status})` : "لا يوجد"}</Text>
        </View>

        <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
          <View style={{ height: 260 }}>
            <NativeMapView
              restaurantName={activeOrder?.restaurantName ?? incomingOrder?.restaurantName}
              customerName={activeOrder?.customerName ?? "العميل"}
              restaurantLatitude={restLat}
              restaurantLongitude={restLng}
              customerLatitude={custLat}
              customerLongitude={custLng}
              orderStatus={activeOrder?.status}
              latitude={driverLocation?.latitude}
              longitude={driverLocation?.longitude}
              isTracking={isTrackingLocation}
              accuracy={driverLocation?.accuracy}
              heading={driverLocation?.heading}
              routePolyline={routePolyline}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>مدخلات الأدمن (تنعكس داخل التطبيق)</Text>

          {trackedOrderId ? (
            <Pressable
              style={styles.liveTrackBtn}
              onPress={() => router.push({ pathname: "/order-tracking" as any, params: { orderId: trackedOrderId } })}
            >
              <Feather name="radio" size={15} color={Colors.primary} />
              <Text style={styles.liveTrackText}>فتح شاشة التتبع الحي</Text>
            </Pressable>
          ) : null}

          <Text style={styles.label}>اسم المطعم</Text>
          <TextInput style={styles.input} value={restaurantName} onChangeText={setRestaurantName} />

          <Text style={styles.label}>عنوان المطعم</Text>
          <TextInput style={styles.input} value={restaurantAddress} onChangeText={setRestaurantAddress} />

          <Text style={styles.label}>عنوان العميل</Text>
          <TextInput style={styles.input} value={customerAddress} onChangeText={setCustomerAddress} />

          <View style={styles.inlineRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>المسافة</Text>
              <TextInput style={styles.input} value={distance} onChangeText={setDistance} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>أجرة الطلب</Text>
              <TextInput style={styles.input} value={fare} onChangeText={setFare} keyboardType="numeric" />
            </View>
          </View>

          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              adminCreateIncomingOrder({
                restaurantName,
                restaurantAddress,
                customerAddress,
                fare: Number(fare) || 0,
                distance,
              });
            }}
          >
            <Feather name="send" size={16} color="#000" />
            <Text style={styles.primaryBtnText}>إنشاء طلب تجريبي ومشاركته</Text>
          </Pressable>

          <View style={styles.divider} />

          <Text style={styles.label}>رصيد السائق</Text>
          <TextInput style={styles.input} value={balanceInput} onChangeText={setBalanceInput} keyboardType="numeric" />

          <View style={styles.actionsRow}>
            <Pressable style={styles.ghostBtn} onPress={() => adminSetOnline(!isOnline)}>
              <Text style={styles.ghostText}>{isOnline ? "تحويل Offline" : "تحويل Online"}</Text>
            </Pressable>
            <Pressable
              style={styles.ghostBtn}
              onPress={() => adminUpdateDriver({ balance: Number(balanceInput) || 0 })}
            >
              <Text style={styles.ghostText}>تحديث الرصيد</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View style={styles.kpiCard}>
      <Feather name={icon} size={16} color={Colors.primary} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, textAlign: "right" },
  subTitle: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary, textAlign: "right", marginTop: 2 },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: Colors.card,
  },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  kpiRow: { flexDirection: "row-reverse", gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 12,
    alignItems: "flex-end",
    gap: 4,
  },
  kpiValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  kpiLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary, textAlign: "right" },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.text, textAlign: "right", marginBottom: 10 },
  line: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary, textAlign: "right", marginBottom: 6 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary, textAlign: "right", marginBottom: 6 },
  liveTrackBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "55",
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 12,
  },
  liveTrackText: { color: Colors.primary, fontFamily: "Inter_700Bold", fontSize: 12 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    color: Colors.text,
    paddingHorizontal: 12,
    textAlign: "right",
    marginBottom: 10,
    fontFamily: "Inter_400Regular",
  },
  inlineRow: { flexDirection: "row-reverse", alignItems: "center" },
  primaryBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 8,
  },
  primaryBtnText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 13 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  actionsRow: { flexDirection: "row-reverse", gap: 8 },
  ghostBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + "66",
    backgroundColor: Colors.primary + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: { color: Colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
