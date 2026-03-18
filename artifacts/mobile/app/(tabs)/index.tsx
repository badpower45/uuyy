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
  bronze: "الفئة البرونزية",
  silver: "الفئة الفضية",
  gold: "الفئة الذهبية",
  platinum: "الفئة البلاتينية",
};

const RANK_COLORS: Record<string, string> = {
  bronze: Colors.bronze,
  silver: Colors.silver,
  gold: Colors.gold,
  platinum: "#B0E0FF",
};

const RANK_ICONS: Record<string, string> = {
  bronze: "award",
  silver: "award",
  gold: "award",
  platinum: "star",
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { driver, isOnline, toggleOnline, incomingOrder, acceptOrder, declineOrder, logout } = useApp();
  const [showModal, setShowModal] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isOnline]);

  useEffect(() => {
    if (incomingOrder) {
      setShowModal(true);
      Animated.spring(modalAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowModal(false));
    }
  }, [incomingOrder]);

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Feather name="log-out" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <View style={[styles.rankBadge, { backgroundColor: rankColor + "1A", borderColor: rankColor + "40" }]}>
              <Feather name={RANK_ICONS[driver.rank] as any} size={12} color={rankColor} />
              <Text style={[styles.rankText, { color: rankColor }]}>
                {RANK_LABELS[driver.rank]}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{driver.avatar}</Text>
            </View>
          </View>
        </View>

        {/* Status Toggle */}
        <View style={styles.section}>
          <Animated.View
            style={[
              styles.statusCard,
              {
                transform: [{ scale: pulseAnim }],
                borderColor: isOnline ? Colors.online : Colors.offline,
                backgroundColor: isOnline ? Colors.online + "0A" : Colors.offline + "0A",
                borderRightWidth: 4,
                borderRightColor: isOnline ? Colors.online : Colors.offline,
              },
            ]}
          >
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {isOnline ? "متاح للعمل" : "غير متاح"}
              </Text>
              <View style={styles.statusSubtitleRow}>
                {isOnline && <View style={styles.statusDot} />}
                <Text style={styles.statusSubtitle}>
                  {isOnline
                    ? "أنت متصل وتستقبل الطلبات"
                    : "اضغط لتبدأ استقبال الطلبات"}
                </Text>
              </View>
            </View>
            <Pressable
              style={[
                styles.toggleBtn,
                { backgroundColor: isOnline ? Colors.online : Colors.card2 },
              ]}
              onPress={handleToggle}
            >
              <View
                style={[
                  styles.toggleKnob,
                  isOnline && styles.toggleKnobOn,
                ]}
              />
            </Pressable>
          </Animated.View>
        </View>

        {/* Wallet Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المحفظة</Text>
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <Text style={styles.walletLabel}>الرصيد الحالي</Text>
              <Feather name="credit-card" size={20} color={Colors.textSecondary} />
            </View>
            <Text
              style={[
                styles.balanceAmount,
                { color: isDebt ? Colors.danger : Colors.success },
              ]}
            >
              {isDebt ? "-" : "+"}{Math.abs(driver.balance).toFixed(2)} جنيه
            </Text>
            {isDebt && (
              <View style={styles.creditBar}>
                <View style={styles.creditBarBg}>
                  <View
                    style={[
                      styles.creditBarFill,
                      {
                        width: `${Math.min(debtRatio * 100, 100)}%` as any,
                        backgroundColor: isNearLimit ? Colors.danger : Colors.warning,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.creditText}>
                  المسحوب {Math.abs(driver.balance).toFixed(0)} / الحد {driver.creditLimit}
                </Text>
              </View>
            )}
            {isNearLimit && (
              <View style={styles.warningBanner}>
                <Feather name="alert-triangle" size={16} color={Colors.danger} />
                <Text style={styles.warningText}>
                  اقتربت من الحد الأقصى للمديونية، يرجى التسوية
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إحصائيات</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: Colors.primary + "1A" }]}>
                <Feather name="truck" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{driver.totalTrips}</Text>
              <Text style={styles.statLabel}>رحلة مكتملة</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: Colors.gold + "1A" }]}>
                <Feather name="star" size={20} color={Colors.gold} />
              </View>
              <Text style={styles.statValue}>{driver.rating}</Text>
              <Text style={styles.statLabel}>التقييم</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: Colors.accent + "1A" }]}>
                <Feather name="zap" size={20} color={Colors.accent} />
              </View>
              <Text style={styles.statValue}>89%</Text>
              <Text style={styles.statLabel}>معدل القبول</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Incoming Order Modal */}
      <Modal visible={showModal} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                transform: [
                  {
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
                opacity: modalAnim,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalPulse} />
              <Text style={styles.modalTitle}>طلب جديد!</Text>
              <Text style={styles.modalId}>#{incomingOrder?.id}</Text>
            </View>

            <View style={styles.routeContainer}>
              <View style={styles.routeRow}>
                <View style={styles.routeDot} />
                <View style={styles.routeInfo}>
                  <Text style={styles.routeType}>الاستلام من</Text>
                  <Text style={styles.routeName}>{incomingOrder?.restaurantName}</Text>
                  <Text style={styles.routeAddress}>{incomingOrder?.restaurantAddress}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: Colors.danger }]} />
                <View style={styles.routeInfo}>
                  <Text style={styles.routeType}>التوصيل إلى</Text>
                  <Text style={styles.routeAddress}>{incomingOrder?.customerAddress}</Text>
                </View>
              </View>
            </View>

            <View style={styles.orderMeta}>
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={18} color={Colors.primary} />
                <Text style={styles.metaValue}>{incomingOrder?.distance}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Feather name="dollar-sign" size={18} color={Colors.success} />
                <Text style={[styles.metaValue, { color: Colors.success }]}>
                  {incomingOrder?.fare} جنيه
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.declineBtn]}
                onPress={handleDecline}
              >
                <Feather name="x" size={22} color={Colors.danger} />
                <Text style={[styles.modalBtnText, { color: Colors.danger }]}>
                  رفض
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.acceptBtn]}
                onPress={handleAccept}
              >
                <Feather name="check" size={22} color="#000" />
                <Text style={[styles.modalBtnText, { color: "#000" }]}>
                  قبول
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "web" ? 34 : 100,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerCenter: {
    flex: 3,
    alignItems: "center",
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + "22",
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  driverName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  rankBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  rankText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textAlign: "right",
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  statusInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  statusTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  statusSubtitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.online,
    shadowColor: Colors.online,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  statusSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  toggleBtn: {
    width: 68,
    height: 36,
    borderRadius: 18,
    marginLeft: 16,
    justifyContent: "center",
    padding: 3,
  },
  toggleKnob: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.textMuted,
  },
  toggleKnobOn: {
    backgroundColor: "#000",
    alignSelf: "flex-end",
  },
  walletCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  walletHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  walletLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  balanceAmount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    marginBottom: 16,
  },
  creditBar: {
    marginTop: 4,
  },
  creditBarBg: {
    height: 8,
    backgroundColor: Colors.card2,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  creditBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  creditText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textAlign: "left",
  },
  warningBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: Colors.danger + "15",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.danger + "40",
  },
  warningText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
    flex: 1,
    textAlign: "right",
  },
  statsRow: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
    padding: 16,
    paddingBottom: 40,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  modalPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flex: 1,
    textAlign: "right",
  },
  modalId: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  routeContainer: {
    backgroundColor: Colors.card2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: Colors.border,
    marginRight: 5,
    marginVertical: 4,
    alignSelf: "flex-end",
  },
  routeInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  routeType: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginBottom: 4,
  },
  routeName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  orderMeta: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: Colors.card2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  metaItem: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  metaDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  metaValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  modalActions: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  declineBtn: {
    backgroundColor: Colors.danger + "1A",
    borderWidth: 2,
    borderColor: Colors.danger + "40",
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  modalBtnText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
});
