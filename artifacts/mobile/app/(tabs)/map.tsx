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
  const { activeOrder, advanceOrderStatus } = useApp();
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

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  if (!activeOrder) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
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
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <NativeMapView
          restaurantName={activeOrder.restaurantName}
          customerName={activeOrder.customerName}
        />

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
                  width: i === stepIndex ? 14 : 10,
                  height: i === stepIndex ? 14 : 10,
                  borderRadius: i === stepIndex ? 7 : 5,
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
                <Feather name="shopping-bag" size={16} color={Colors.primary} />
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
                <Feather name="user" size={16} color={Colors.accent} />
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
                <Feather name="phone" size={18} color={Colors.success} />
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
              <Text style={styles.cashLabel}>الكاش</Text>
              <Text style={[styles.cashValue, { color: Colors.success }]}>
                {activeOrder.cashToCollect} جنيه
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Button */}
        <View style={[styles.actionContainer, { paddingBottom: bottomPadding + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
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
  stepsOverlay: {
    position: "absolute",
    top: 12,
    right: 16,
    flexDirection: "row-reverse",
    gap: 6,
    backgroundColor: Colors.card + "CC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
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
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  sheetHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  sheetHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  orderIdBadge: {
    backgroundColor: Colors.card2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderIdText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  infoCards: {
    backgroundColor: Colors.card2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  infoCardIcon: {
    width: 36,
    height: 36,
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
    marginBottom: 2,
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
    marginVertical: 12,
  },
  cashCard: {
    flexDirection: "row-reverse",
    backgroundColor: Colors.card2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cashItem: {
    flex: 1,
    alignItems: "center",
  },
  cashLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 4,
  },
  cashValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  cashDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  actionContainer: {
    paddingTop: 12,
  },
  actionBtn: {
    height: 58,
    borderRadius: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  actionBtnText: {
    fontSize: 18,
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
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyHint: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary + "18",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  emptyHintText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
});
