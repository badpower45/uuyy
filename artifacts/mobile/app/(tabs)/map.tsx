import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";
import NativeMapView from "@/components/MapView";

const STATUS_STEPS = [
  {
    key: "to_restaurant",
    label: "في الطريق للمطعم",
    icon: "navigation",
    color: Colors.warning,
    nextLabel: "وصلت للمطعم",
  },
  {
    key: "picked_up",
    label: "تم استلام الطلب",
    icon: "package",
    color: Colors.primary,
    nextLabel: "في الطريق للعميل",
  },
  {
    key: "to_customer",
    label: "في الطريق للعميل",
    icon: "navigation",
    color: Colors.accent,
    nextLabel: "تم التسليم",
  },
  {
    key: "delivered",
    label: "تم التسليم",
    icon: "check-circle",
    color: Colors.success,
    nextLabel: "اكتمل",
  },
];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { activeOrder, advanceOrderStatus, driverLocation, isTrackingLocation, navigateToDestination, routePolyline, routeEta, routeSteps } = useApp();
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const currentStep = STATUS_STEPS.find((s) => s.key === activeOrder?.status);
  const stepIndex = STATUS_STEPS.findIndex((s) => s.key === activeOrder?.status);

  const handleAdvance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    advanceOrderStatus();
  };

  const handleCall = () => {
    if (activeOrder?.customerPhone) {
      Linking.openURL(`tel:${activeOrder.customerPhone}`);
    }
  };

  const handleNavigate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigateToDestination();
  };

  const handleOpenTracking = () => {
    if (!activeOrder) return;
    router.push({ pathname: "/order-tracking" as any, params: { orderId: activeOrder.id } });
  };

  const toggleSheet = () => {
    const toValue = sheetExpanded ? 0 : 1;
    setSheetExpanded(!sheetExpanded);
    Animated.spring(sheetAnim, {
      toValue,
      tension: 100,
      friction: 10,
      useNativeDriver: false,
    }).start();
  };

  const topPadding = Platform.OS === "web" ? 58 : insets.top + 6;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  // Tab bar height — must push content above the tab bar (position: absolute)
  const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 49 + insets.bottom;

  if (!activeOrder) {
    return (
      <View style={[styles.container, { paddingTop: topPadding, paddingBottom: TAB_BAR_HEIGHT }]}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Feather name="map" size={48} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>لا يوجد طلب نشط</Text>
          <Text style={styles.emptySubtitle}>
            ستظهر هنا تفاصيل طلبك عند قبول طلب جديد
          </Text>
          <View style={styles.emptyHint}>
            <Feather name="arrow-left" size={16} color={Colors.primary} />
            <Text style={styles.emptyHintText}>
              اذهب للرئيسية وتأكد أنك متاح
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const sheetHeight = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [320, 520],
  });

  return (
    <View style={[styles.container, { paddingTop: topPadding, paddingBottom: TAB_BAR_HEIGHT }]}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <NativeMapView
          restaurantName={activeOrder.restaurantName}
          customerName={activeOrder.customerName}
          restaurantLatitude={activeOrder.restaurantLatitude}
          restaurantLongitude={activeOrder.restaurantLongitude}
          customerLatitude={activeOrder.customerLatitude}
          customerLongitude={activeOrder.customerLongitude}
          orderStatus={activeOrder.status}
          latitude={driverLocation?.latitude}
          longitude={driverLocation?.longitude}
          isTracking={isTrackingLocation}
          accuracy={driverLocation?.accuracy}
          heading={driverLocation?.heading}
          routePolyline={routePolyline}
        />

        {/* GPS Live Badge */}
        {isTrackingLocation && driverLocation && (
          <View style={styles.gpsBadge}>
            <View style={styles.gpsDot} />
            <Text style={styles.gpsText}>
              {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        {/* ETA Badge — shown when a real route is active */}
        {routeEta != null && (
          <View style={styles.etaBadge}>
            <Feather name="clock" size={13} color={Colors.primary} />
            <Text style={styles.etaText}>{routeEta}</Text>
            {routeSteps && routeSteps.length > 0 && (
              <Text style={styles.etaStep} numberOfLines={1}>
                {routeSteps[0].instruction}
              </Text>
            )}
          </View>
        )}

        {/* Status Steps Overlay */}
        <View style={styles.stepsOverlay}>
          {STATUS_STEPS.map((step, i) => (
            <View
              key={step.key}
              style={[
                styles.stepDot,
                {
                  backgroundColor:
                    i <= stepIndex ? step.color : Colors.card2,
                  borderColor:
                    i === stepIndex ? step.color : Colors.border,
                  width: i === stepIndex ? 16 : 12,
                  height: i === stepIndex ? 16 : 12,
                  borderRadius: i === stepIndex ? 8 : 6,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
        {/* Sheet Handle */}
        <Pressable onPress={toggleSheet} style={styles.sheetHandle}>
          <View style={styles.handleBar} />
        </Pressable>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Order Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.orderIdBadge}>
              <Text style={styles.orderIdText}>#{activeOrder.id}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: (currentStep?.color || Colors.primary) + "22" },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: currentStep?.color || Colors.primary },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: currentStep?.color || Colors.primary },
                ]}
              >
                {currentStep?.label}
              </Text>
            </View>
          </View>

          {/* Restaurant & Customer Info */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <Feather name="shopping-bag" size={18} color={Colors.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>
                  {activeOrder.restaurantName}
                </Text>
                <Text style={styles.infoCardAddress}>
                  {activeOrder.restaurantAddress}
                </Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoCard}>
              <View
                style={[
                  styles.infoCardIcon,
                  { backgroundColor: Colors.accent + "22" },
                ]}
              >
                <Feather name="user" size={18} color={Colors.accent} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>
                  {activeOrder.customerName}
                </Text>
                <Text style={styles.infoCardAddress}>
                  {activeOrder.customerAddress}
                </Text>
              </View>
              <Pressable style={styles.callBtn} onPress={handleCall}>
                <Feather name="phone" size={20} color={Colors.success} />
              </Pressable>
            </View>
          </View>

          {/* Cash Info */}
          <View style={styles.cashCard}>
            <View style={styles.cashItem}>
              <Text style={styles.cashLabel}>المسافة</Text>
              <Text style={styles.cashValue}>{activeOrder.distance}</Text>
            </View>
            <View style={styles.cashDivider} />
            <View style={styles.cashItem}>
              <Text style={styles.cashLabel}>التوصيل</Text>
              <Text style={styles.cashValue}>{activeOrder.fare} جنيه</Text>
            </View>
            <View style={styles.cashDivider} />
            <View style={styles.cashItem}>
              <Text style={styles.cashLabel}>الكاش المطلوب</Text>
              <Text style={[styles.cashValue, { color: Colors.success }]}>
                {activeOrder.cashToCollect} جنيه
              </Text>
            </View>
          </View>

          <Pressable style={styles.trackBtn} onPress={handleOpenTracking}>
            <Feather name="radio" size={16} color={Colors.primary} />
            <Text style={styles.trackBtnText}>فتح شاشة التتبع الحي للطلب</Text>
          </Pressable>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actionContainer, { paddingBottom: bottomPadding + 16 }]}>
          <View style={styles.actionRow}>
            {/* Navigate button — smart destination */}
            {(activeOrder.status === "to_restaurant" || activeOrder.status === "to_customer") && (
              <Pressable
                style={({ pressed }) => [
                  styles.navBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                ]}
                onPress={handleNavigate}
              >
                <Feather name="navigation-2" size={22} color={Colors.primary} />
                <Text style={styles.navBtnText}>
                  {activeOrder.status === "to_restaurant" ? "توجه للمطعم" : "توجه للعميل"}
                </Text>
              </Pressable>
            )}

            {/* Main advance button */}
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                (activeOrder.status === "to_restaurant" || activeOrder.status === "to_customer")
                  ? { flex: 1 }
                  : { flex: 1 },
                { backgroundColor: currentStep?.color || Colors.primary },
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleAdvance}
            >
              <Feather
                name={(currentStep?.icon as any) || "check"}
                size={22}
                color="#000"
              />
              <Text style={styles.actionBtnText}>
                {stepIndex < STATUS_STEPS.length - 1
                  ? currentStep?.nextLabel
                  : "اكتمل الطلب"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapContainer: {
    flex: 1,
  },
  gpsBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(17,24,39,0.90)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.primary + "50",
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
  etaBadge: {
    position: "absolute",
    top: 48,
    left: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(17,24,39,0.93)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary + "60",
    maxWidth: 240,
  },
  etaText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  etaStep: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    flexShrink: 1,
  },
  stepsOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row-reverse",
    gap: 8,
    backgroundColor: Colors.card + "E6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepDot: {
    borderWidth: 2,
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  sheetHandle: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handleBar: {
    width: 48,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.border,
  },
  sheetHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  orderIdBadge: {
    backgroundColor: Colors.card2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderIdText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  infoCards: {
    backgroundColor: Colors.card2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  infoCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  infoCardContent: {
    flex: 1,
    alignItems: "flex-end",
  },
  infoCardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 4,
  },
  infoCardAddress: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.success + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  cashCard: {
    flexDirection: "row-reverse",
    backgroundColor: Colors.card2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trackBtn: {
    height: 42,
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
  trackBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  cashItem: {
    flex: 1,
    alignItems: "center",
  },
  cashLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginBottom: 6,
  },
  cashValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  cashDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  actionContainer: {
    paddingTop: 12,
  },
  actionRow: {
    flexDirection: "row-reverse",
    gap: 10,
    alignItems: "stretch",
  },
  navBtn: {
    width: 108,
    height: 50,
    borderRadius: 14,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: Colors.primary + "1A",
    borderWidth: 1.5,
    borderColor: Colors.primary + "60",
  },
  navBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  actionBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyHint: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.primary + "1A",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  emptyHintText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
});
