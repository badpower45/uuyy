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
            toValue: 1.08,
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
            <View style={[styles.rankBadge, { backgroundColor: rankColor + "22", borderColor: rankColor }]}>
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
              },
            ]}
          >
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {isOnline ? "متاح للعمل" : "غير متاح"}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isOnline
                  ? "أنت متصل وتستقبل الطلبات"
                  : "اضغط لتبدأ استقبال الطلبات"}
              </Text>
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
              <View style={[styles.balanceDot, { backgroundColor: isDebt ? Colors.danger : Colors.success }]} />
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
                  {Math.abs(driver.balance).toFixed(0)} / {driver.creditLimit} جنيه
                </Text>
              </View>
            )}
            {isNearLimit && (
              <View style={styles.warningBanner}>
                <Feather name="alert-triangle" size={14} color={Colors.danger} />
                <Text style={styles.warningText}>
                  تجاوزت 70٪ من حد الإيقاف التلقائي
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
              <Feather name="truck" size={22} color={Colors.primary} />
              <Text style={styles.statValue}>{driver.totalTrips}</Text>
              <Text style={styles.statLabel}>رحلة مكتملة</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="star" size={22} color={Colors.gold} />
              <Text style={styles.statValue}>{driver.rating}</Text>
              <Text style={styles.statLabel}>التقييم</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="zap" size={22} color={Colors.accent} />
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
                <Feather name="map-pin" size={16} color={Colors.textMuted} />
                <Text style={styles.metaValue}>{incomingOrder?.distance}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Feather name="dollar-sign" size={16} color={Colors.textMuted} />
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + "33",
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
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
    paddingHorizontal: 10,
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
    borderWidth: 2,
  },
  statusInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  statusTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  toggleBtn: {
    width: 64,
    height: 34,
    borderRadius: 17,
    marginLeft: 16,
    justifyContent: "center",
    padding: 3,
  },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.textMuted,
  },
  toggleKnobOn: {
    backgroundColor: "#fff",
    alignSelf: "flex-end",
  },
  walletCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  walletHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  walletLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    marginBottom: 12,
  },
  creditBar: {
    marginTop: 4,
  },
  creditBarBg: {
    height: 6,
    backgroundColor: Colors.card2,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  creditBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  creditText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "right",
  },
  warningBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: Colors.danger + "18",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.danger + "40",
  },
  warningText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
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
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
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
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flex: 1,
    textAlign: "right",
  },
  modalId: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  routeContainer: {
    backgroundColor: Colors.card2,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
    marginRight: 4,
    marginVertical: 4,
    alignSelf: "flex-end",
  },
  routeInfo: {
    flex: 1,
    alignItems: "flex-end",
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
  },
  routeAddress: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  orderMeta: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: Colors.card2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
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
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  metaValue: {
    fontSize: 16,
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
    backgroundColor: Colors.danger + "18",
    borderWidth: 2,
    borderColor: Colors.danger + "50",
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
