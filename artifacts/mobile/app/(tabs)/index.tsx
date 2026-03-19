import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const RANK_LABELS: Record<string, string> = {
  bronze: "برونزي",
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
};

const RANK_COLORS: Record<string, string> = {
  bronze: Colors.bronze,
  silver: Colors.silver,
  gold: Colors.gold,
  platinum: "#B0E0FF",
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    driver,
    tenantId,
    userRole,
    isOnline,
    toggleOnline,
    incomingOrder,
    acceptOrder,
    declineOrder,
    logout,
    driverLocation,
    isTrackingLocation,
    requestLocationPermission,
    locationPermission,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isOnline) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      dotAnim.setValue(1);
    }
  }, [isOnline]);

  useEffect(() => {
    if (incomingOrder) {
      setShowModal(true);
      Animated.spring(modalAnim, {
        toValue: 1,
        tension: 90,
        friction: 8,
        useNativeDriver: true,
      }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setShowModal(false));
    }
  }, [incomingOrder]);

  const handleToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!isOnline && locationPermission === "undetermined") {
      await requestLocationPermission();
    }
    toggleOnline();
  };

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptOrder();
    router.navigate("/(tabs)/map");
  };

  const handleDecline = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    declineOrder();
  };

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  if (!driver) return null;

  const isDebt = driver.balance < 0;
  const debtRatio = Math.abs(driver.balance) / driver.creditLimit;
  const isNearLimit = debtRatio > 0.7;
  const rankColor = RANK_COLORS[driver.rank] || Colors.gold;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const locationLabel = isTrackingLocation && driverLocation
    ? `${driverLocation.latitude.toFixed(4)}, ${driverLocation.longitude.toFixed(4)}`
    : locationPermission === "denied"
    ? "لا يوجد إذن للموقع"
    : "في انتظار الموقع...";

  return (
    <View style={[styles.root, { paddingTop: topPadding }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 80 : 110 },
        ]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={handleLogout} style={styles.iconBtn}>
            <Feather name="log-out" size={18} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerMid}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <View style={[styles.rankPill, { borderColor: rankColor + "50", backgroundColor: rankColor + "15" }]}>
              <Feather name="award" size={11} color={rankColor} />
              <Text style={[styles.rankLabel, { color: rankColor }]}>
                {RANK_LABELS[driver.rank]} • {driver.rating} ★
              </Text>
            </View>
            <View style={styles.workspacePill}>
              <Feather name="briefcase" size={11} color={Colors.primary} />
              <Text style={styles.workspaceText}>{tenantId} • {userRole}</Text>
            </View>
          </View>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarText}>{driver.avatar}</Text>
          </View>
        </View>

        {/* ── Online / Offline Toggle Card ── */}
        <View style={styles.px}>
          <View style={[
            styles.statusCard,
            { borderColor: isOnline ? Colors.online + "50" : Colors.border },
          ]}>
            {/* Side accent */}
            <View style={[
              styles.sideAccent,
              { backgroundColor: isOnline ? Colors.online : Colors.offline },
            ]} />

            <View style={styles.statusBody}>
              <View style={styles.statusLeft}>
                <View style={styles.statusTitleRow}>
                  <Animated.View style={[
                    styles.statusDot,
                    {
                      backgroundColor: isOnline ? Colors.online : Colors.offline,
                      opacity: dotAnim,
                    },
                  ]} />
                  <Text style={[
                    styles.statusTitle,
                    { color: isOnline ? Colors.online : Colors.text },
                  ]}>
                    {isOnline ? "متاح للعمل" : "غير متاح"}
                  </Text>
                </View>
                <Text style={styles.statusSub}>
                  {isOnline
                    ? "أنت متصل وتستقبل الطلبات"
                    : "اضغط للبدء في استقبال الطلبات"}
                </Text>

                {/* GPS status sub-row */}
                {isOnline && (
                  <View style={styles.gpsRow}>
                    <Feather
                      name="map-pin"
                      size={11}
                      color={isTrackingLocation ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={[
                      styles.gpsText,
                      { color: isTrackingLocation ? Colors.primary : Colors.textMuted },
                    ]}>
                      {isTrackingLocation ? "GPS نشط • " : ""}{locationLabel}
                    </Text>
                  </View>
                )}
              </View>

              {/* Toggle switch */}
              <Pressable
                style={[
                  styles.toggle,
                  { backgroundColor: isOnline ? Colors.online : Colors.card2 },
                ]}
                onPress={handleToggle}
              >
                <View style={[styles.knob, isOnline && styles.knobOn]} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Wallet Card ── */}
        <View style={styles.px}>
          <Text style={styles.sectionLabel}>المحفظة</Text>
          <View style={styles.walletCard}>
            <View style={[
              styles.walletAccent,
              { backgroundColor: isDebt ? Colors.danger : Colors.success },
            ]} />
            <View style={styles.walletInner}>
              <View style={styles.walletTop}>
                <View style={[
                  styles.walletIcon,
                  { backgroundColor: isDebt ? Colors.danger + "18" : Colors.success + "18" },
                ]}>
                  <Feather
                    name="credit-card"
                    size={18}
                    color={isDebt ? Colors.danger : Colors.success}
                  />
                </View>
                <Text style={styles.walletLabel}>الرصيد الحالي</Text>
              </View>
              <Text style={[
                styles.balanceText,
                { color: isDebt ? Colors.danger : Colors.success },
              ]}>
                {isDebt ? "−" : "+"}{Math.abs(driver.balance).toFixed(2)}
                <Text style={styles.currency}> جنيه</Text>
              </Text>

              {isDebt && (
                <>
                  <View style={styles.progressBg}>
                    <View style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(debtRatio * 100, 100)}%` as any,
                        backgroundColor: debtRatio > 0.7 ? Colors.danger : Colors.warning,
                      },
                    ]} />
                  </View>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressLabel}>
                      الحد: {driver.creditLimit} جنيه
                    </Text>
                    <Text style={[
                      styles.progressLabel,
                      { color: debtRatio > 0.7 ? Colors.danger : Colors.warning },
                    ]}>
                      {Math.round(debtRatio * 100)}% مستخدم
                    </Text>
                  </View>
                </>
              )}

              {isNearLimit && (
                <View style={styles.warnBanner}>
                  <Feather name="alert-triangle" size={14} color={Colors.danger} />
                  <Text style={styles.warnText}>
                    اقتربت من الحد الأقصى — يرجى التسوية
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.px}>
          <Text style={styles.sectionLabel}>الإحصائيات</Text>
          <View style={styles.statsRow}>
            {[
              { icon: "truck", value: String(driver.totalTrips), label: "رحلة مكتملة", color: Colors.primary },
              { icon: "star", value: String(driver.rating), label: "التقييم", color: Colors.gold },
              { icon: "zap", value: "89%", label: "معدل القبول", color: Colors.accent },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.color + "18" }]}>
                  <Feather name={s.icon as any} size={18} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Incoming Order Modal ── */}
      <Modal visible={showModal} transparent animationType="none">
        <View style={styles.overlay}>
          <Animated.View style={[
            styles.modalCard,
            {
              transform: [{
                translateY: modalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [500, 0],
                }),
              }],
              opacity: modalAnim,
            },
          ]}>
            {/* Drag handle */}
            <View style={styles.handle} />

            <View style={styles.modalHeader}>
              <View style={styles.newOrderBadge}>
                <View style={styles.newOrderDot} />
                <Text style={styles.newOrderText}>طلب جديد</Text>
              </View>
              <Text style={styles.modalId}>#{incomingOrder?.id}</Text>
            </View>

            <View style={styles.routeCard}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.routeType}>الاستلام من</Text>
                  <Text style={styles.routeName}>{incomingOrder?.restaurantName}</Text>
                  <Text style={styles.routeAddr}>{incomingOrder?.restaurantAddress}</Text>
                </View>
              </View>
              <View style={styles.routeVLine} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: Colors.danger }]} />
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.routeType}>التوصيل إلى</Text>
                  <Text style={styles.routeAddr}>{incomingOrder?.customerAddress}</Text>
                </View>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{incomingOrder?.distance}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Feather name="dollar-sign" size={16} color={Colors.success} />
                <Text style={[styles.metaText, { color: Colors.success }]}>
                  {incomingOrder?.fare} جنيه
                </Text>
              </View>
            </View>

            <View style={styles.modalBtns}>
              <Pressable style={styles.declineBtn} onPress={handleDecline}>
                <Feather name="x" size={20} color={Colors.danger} />
                <Text style={[styles.btnLabel, { color: Colors.danger }]}>رفض</Text>
              </Pressable>
              <Pressable style={styles.acceptBtn} onPress={handleAccept}>
                <Feather name="check" size={20} color="#000" />
                <Text style={[styles.btnLabel, { color: "#000" }]}>قبول</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {},
  px: { paddingHorizontal: 20, marginBottom: 20 },

  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerMid: { flex: 1, alignItems: "center" },
  driverName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  rankPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
  },
  rankLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  workspacePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    backgroundColor: Colors.primary + "14",
  },
  workspaceText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + "20",
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.primary },

  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textAlign: "right",
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  statusCard: {
    flexDirection: "row-reverse",
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  sideAccent: { width: 4, alignSelf: "stretch" },
  statusBody: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 18,
  },
  statusLeft: { flex: 1, alignItems: "flex-end" },
  statusTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  statusTitle: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
  },
  statusSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "right",
  },
  gpsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  gpsText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  toggle: {
    width: 60,
    height: 32,
    borderRadius: 16,
    marginLeft: 14,
    justifyContent: "center",
    padding: 3,
  },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.textMuted,
  },
  knobOn: {
    backgroundColor: "#000",
    alignSelf: "flex-end",
  },

  walletCard: {
    flexDirection: "row-reverse",
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  walletAccent: { width: 4 },
  walletInner: { flex: 1, padding: 20 },
  walletTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  walletIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  walletLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  balanceText: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    marginBottom: 12,
  },
  currency: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  progressBg: {
    height: 7,
    backgroundColor: Colors.card2,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabelRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  warnBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: Colors.danger + "12",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.danger + "30",
  },
  warnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
    flex: 1,
    textAlign: "right",
  },

  statsRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  newOrderBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  newOrderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  newOrderText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  modalId: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  routeCard: {
    backgroundColor: Colors.card2,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  routeRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
  },
  routeDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginTop: 3,
  },
  routeVLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
    marginRight: 4.5,
    marginVertical: 4,
    alignSelf: "flex-end",
  },
  routeType: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginBottom: 2,
  },
  routeName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 2,
  },
  routeAddr: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: "row-reverse",
    backgroundColor: Colors.card2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    alignItems: "center",
  },
  metaItem: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  metaText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  modalBtns: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    height: 54,
    borderRadius: 13,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: Colors.danger + "15",
    borderWidth: 1.5,
    borderColor: Colors.danger + "40",
  },
  acceptBtn: {
    flex: 2,
    height: 54,
    borderRadius: 13,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnLabel: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
});
