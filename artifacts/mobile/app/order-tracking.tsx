import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import NativeMapView from "@/components/MapView";
import { apiClient, type ApiOrderTracking } from "@/lib/api";
import { useApp } from "@/context/AppContext";

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  assigned: "تم الإسناد",
  to_restaurant: "في الطريق للمطعم",
  picked_up: "تم الاستلام",
  to_customer: "في الطريق للعميل",
  delivered: "تم التسليم",
  cancelled: "تم الإلغاء",
};

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google Traffic",
  mapbox: "Mapbox Traffic",
  osrm: "OSRM Fallback",
};

function formatRecordedAt(value?: string | null) {
  if (!value) return "غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return date.toLocaleString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function OrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const { activeOrder } = useApp();

  const initialOrderId = String(params.orderId ?? activeOrder?.id ?? "");
  const [orderIdInput, setOrderIdInput] = useState(initialOrderId);
  const [trackedOrderId, setTrackedOrderId] = useState(initialOrderId);
  const [tracking, setTracking] = useState<ApiOrderTracking | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(initialOrderId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackedOrderId && initialOrderId) {
      setOrderIdInput(initialOrderId);
      setTrackedOrderId(initialOrderId);
      setIsLoading(true);
    }
  }, [initialOrderId, trackedOrderId]);

  const loadTracking = useCallback(async (orderId: string, silent: boolean) => {
    if (!orderId.trim()) {
      setTracking(null);
      setError("أدخل رقم الطلب أولًا");
      setIsLoading(false);
      return;
    }

    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const data = await apiClient.getOrderTracking(Number(orderId));
      setTracking(data);
    } catch (err) {
      setTracking(null);
      setError(err instanceof Error ? err.message : "فشل تحميل التتبع");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!trackedOrderId) {
      setIsLoading(false);
      return;
    }

    loadTracking(trackedOrderId, false);
    const interval = setInterval(() => {
      loadTracking(trackedOrderId, true);
    }, 12000);

    return () => clearInterval(interval);
  }, [trackedOrderId, loadTracking]);

  const activeLeg = tracking?.route?.legs[tracking.route.activeLegIndex] ?? tracking?.route?.legs[0] ?? null;
  const stepPreview = activeLeg?.steps.slice(0, 5) ?? [];

  const mapStatus = useMemo(() => {
    if (tracking?.status === "to_restaurant" || tracking?.status === "to_customer" || tracking?.status === "picked_up") {
      return tracking.status === "picked_up" ? "to_customer" : tracking.status;
    }
    return undefined;
  }, [tracking?.status]);

  const handleTrack = () => {
    const normalized = orderIdInput.trim();
    if (!normalized) {
      setError("أدخل رقم الطلب");
      return;
    }
    setTrackedOrderId(normalized);
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const driverCoords = tracking?.driverLocation;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => router.back()}>
            <Feather name="arrow-right" size={18} color={Colors.text} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>التتبع الحي للطلب</Text>
            <Text style={styles.subtitle}>يتحدث تلقائيًا من السيرفر كل 12 ثانية</Text>
          </View>
          <View style={styles.headerBtnGhost}>
            <Feather name="radio" size={16} color={Colors.primary} />
          </View>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.label}>رقم الطلب</Text>
          <View style={styles.searchRow}>
            <Pressable style={styles.searchBtn} onPress={handleTrack}>
              <Feather name="crosshair" size={16} color="#03120A" />
              <Text style={styles.searchBtnText}>تتبع الآن</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              value={orderIdInput}
              onChangeText={setOrderIdInput}
              keyboardType="number-pad"
              placeholder="مثال: 1024"
              placeholderTextColor={Colors.textMuted}
              textAlign="right"
            />
          </View>
          {trackedOrderId ? (
            <Text style={styles.helperText}>الطلب المتابع الآن: #{trackedOrderId}</Text>
          ) : (
            <Text style={styles.helperText}>افتح الشاشة من الطلب النشط أو أدخل رقم الطلب يدويًا</Text>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>جارٍ تحميل موقع السائق والمسار...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : tracking ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>#{tracking.orderId}</Text>
                </View>
                <View style={styles.liveRow}>
                  <View style={[styles.liveDot, { backgroundColor: tracking.trackingAvailable ? Colors.success : Colors.warning }]} />
                  <Text style={styles.liveText}>
                    {tracking.trackingAvailable ? "السائق متصل الآن" : "لا يوجد موقع حي بعد"}
                  </Text>
                </View>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{STATUS_LABELS[tracking.status] ?? tracking.status}</Text>
                  <Text style={styles.kpiLabel}>حالة الطلب</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{tracking.route?.etaLabel ?? "—"}</Text>
                  <Text style={styles.kpiLabel}>وقت الوصول</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>
                    {tracking.route ? PROVIDER_LABELS[tracking.route.provider] ?? tracking.route.provider : "—"}
                  </Text>
                  <Text style={styles.kpiLabel}>مزود التوجيه</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Feather name="clock" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>
                  آخر تحديث: {formatRecordedAt(tracking.driverLocation?.recordedAt)}
                  {isRefreshing ? " • تحديث..." : ""}
                </Text>
              </View>
            </View>

            <View style={[styles.mapCard, { padding: 0, overflow: "hidden" }]}>
              <View style={{ height: 320 }}>
                <NativeMapView
                  restaurantName={tracking.restaurantName}
                  customerName={tracking.customerName}
                  restaurantLatitude={tracking.restaurantLocation?.lat}
                  restaurantLongitude={tracking.restaurantLocation?.lng}
                  customerLatitude={tracking.customerLocation?.lat ?? undefined}
                  customerLongitude={tracking.customerLocation?.lng ?? undefined}
                  orderStatus={mapStatus as any}
                  latitude={driverCoords?.latitude}
                  longitude={driverCoords?.longitude}
                  isTracking={tracking.trackingAvailable}
                  accuracy={driverCoords?.accuracy}
                  heading={driverCoords?.heading}
                  routePolyline={tracking.route?.polyline ?? null}
                />
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>الوجهة الحالية</Text>
                <Text style={styles.infoValue}>{tracking.currentDestination?.label ?? "غير محددة"}</Text>
                <Text style={styles.infoSub}>
                  {tracking.currentDestination
                    ? `${tracking.currentDestination.latitude.toFixed(5)}, ${tracking.currentDestination.longitude.toFixed(5)}`
                    : "لا توجد إحداثيات"}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>موقع السائق</Text>
                <Text style={styles.infoValue}>
                  {driverCoords ? `${driverCoords.latitude.toFixed(5)}, ${driverCoords.longitude.toFixed(5)}` : "غير متاح"}
                </Text>
                <Text style={styles.infoSub}>
                  {driverCoords?.accuracy != null ? `دقة تقريبية ±${Math.round(driverCoords.accuracy)}م` : "في انتظار GPS"}
                </Text>
              </View>
            </View>

            <View style={styles.placeCard}>
              <View style={styles.placeRow}>
                <View style={[styles.placeIcon, { backgroundColor: Colors.warning + "20" }]}>
                  <Feather name="shopping-bag" size={15} color={Colors.warning} />
                </View>
                <View style={styles.placeContent}>
                  <Text style={styles.placeTitle}>{tracking.restaurantName}</Text>
                  <Text style={styles.placeAddress}>{tracking.restaurantAddress}</Text>
                </View>
              </View>

              <View style={styles.placeDivider} />

              <View style={styles.placeRow}>
                <View style={[styles.placeIcon, { backgroundColor: Colors.accent + "20" }]}>
                  <Feather name="home" size={15} color={Colors.accent} />
                </View>
                <View style={styles.placeContent}>
                  <Text style={styles.placeTitle}>{tracking.customerName}</Text>
                  <Text style={styles.placeAddress}>{tracking.customerAddress}</Text>
                </View>
              </View>
            </View>

            <View style={styles.stepsCard}>
              <View style={styles.stepsHeader}>
                <Text style={styles.stepsTitle}>الخطوات الحالية على الطريق</Text>
                <Text style={styles.stepsMeta}>
                  {activeLeg ? `${activeLeg.distanceKm} كم • ${Math.round(activeLeg.durationMinutes)} د` : "—"}
                </Text>
              </View>

              {stepPreview.length ? (
                stepPreview.map((step, index) => (
                  <View key={`${step.instruction}-${index}`} style={styles.stepRow}>
                    <View style={styles.stepIndex}>
                      <Text style={styles.stepIndexText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepInstruction}>{step.instruction}</Text>
                      <Text style={styles.stepMeta}>
                        {step.distanceM} م • {Math.max(1, Math.round(step.durationSec / 60))} د
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySteps}>لم تصل خطوات ملاحة بعد لهذا الطلب</Text>
              )}
            </View>
          </>
        ) : (
          <View style={styles.loadingCard}>
            <Feather name="map-pin" size={18} color={Colors.textMuted} />
            <Text style={styles.loadingText}>لا يوجد طلب متابع حاليًا</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 42, gap: 14 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  headerTextWrap: { flex: 1, alignItems: "flex-end", paddingHorizontal: 12 },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerBtnGhost: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary + "14",
    borderWidth: 1,
    borderColor: Colors.primary + "35",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "right" },
  subtitle: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "right", marginTop: 4 },
  searchCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 16,
  },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "right", marginBottom: 10 },
  searchRow: { flexDirection: "row-reverse", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card2,
    color: Colors.text,
    paddingHorizontal: 14,
    fontFamily: "Inter_600SemiBold",
  },
  searchBtn: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  searchBtnText: { color: "#03120A", fontFamily: "Inter_700Bold", fontSize: 13 },
  helperText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted, textAlign: "right", marginTop: 10 },
  loadingCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  loadingText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "center" },
  errorCard: {
    backgroundColor: Colors.danger + "14",
    borderWidth: 1,
    borderColor: Colors.danger + "35",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text, textAlign: "right" },
  heroCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  heroTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  orderBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text },
  liveRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  kpiRow: { flexDirection: "row-reverse", gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.card2,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "flex-end",
  },
  kpiValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "right" },
  kpiLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "right", marginTop: 4 },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  metaText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "right" },
  mapCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
  },
  infoGrid: { flexDirection: "row-reverse", gap: 10 },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 14,
    alignItems: "flex-end",
  },
  infoTitle: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "right" },
  infoValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "right", marginTop: 8 },
  infoSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "right", marginTop: 6 },
  placeCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 16,
  },
  placeRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  placeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  placeContent: { flex: 1, alignItems: "flex-end" },
  placeTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "right" },
  placeAddress: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "right", marginTop: 4 },
  placeDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
  stepsCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 16,
  },
  stepsHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  stepsTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "right" },
  stepsMeta: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary, textAlign: "right" },
  stepRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  stepIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepIndexText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.primary },
  stepContent: { flex: 1, alignItems: "flex-end" },
  stepInstruction: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, textAlign: "right" },
  stepMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "right", marginTop: 4 },
  emptySteps: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted, textAlign: "center" },
});
