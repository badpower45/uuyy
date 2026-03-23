import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
    const modalAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (incomingOrder) {
        setShowModal(true);
        Animated.spring(modalAnim, {
          toValue: 1,
          tension: 90,
          friction: 10,
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

    if (!driver) return null;

    const topPadding = Platform.OS === "web" ? 58 : insets.top + 6;
    const rankColor = RANK_COLORS[driver.rank] || Colors.gold;
    const isDebt = driver.balance < 0;

    const locationLabel = isTrackingLocation && driverLocation
      ? `${driverLocation.latitude.toFixed(4)}, ${driverLocation.longitude.toFixed(4)}`
      : locationPermission === "denied"
        ? "لا يوجد إذن للموقع"
        : "في انتظار GPS";

    const handleToggle = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

    return (
      <View style={styles.container}>
        <View style={styles.bgGlow1} />
        <View style={styles.bgGlow2} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: topPadding, paddingBottom: Math.max(96, insets.bottom + 72) }}
        >
          <View style={styles.headerRow}>
            <Pressable style={styles.iconBtn} onPress={() => { logout(); router.replace("/"); }}>
              <Feather name="log-out" size={18} color={Colors.textSecondary} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <View style={[styles.rankPill, { borderColor: rankColor + "66", backgroundColor: rankColor + "22" }]}> 
                <Feather name="award" size={11} color={rankColor} />
                <Text style={[styles.rankText, { color: rankColor }]}> {RANK_LABELS[driver.rank]} • {driver.rating}★ </Text>
              </View>
              <Text style={styles.tenantText}>{tenantId}</Text>
            </View>

            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{driver.avatar}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.onlineCard}>
              <View style={styles.onlineInfo}>
                <View style={styles.liveRow}>
                  <View style={[styles.liveDot, { backgroundColor: isOnline ? Colors.success : Colors.danger }]} />
                  <Text style={styles.liveTitle}>{isOnline ? "متصل الآن" : "غير متصل"}</Text>
                </View>
                <Text style={styles.liveSubtitle}>{isOnline ? "جاهز لاستقبال الطلبات" : "فعّل الحالة لبدء استقبال الطلبات"}</Text>
                <Text style={styles.gpsText}>{locationLabel}</Text>
              </View>

              <Pressable style={[styles.toggle, { backgroundColor: isOnline ? Colors.success : Colors.card2 }]} onPress={handleToggle}>
                <View style={[styles.knob, isOnline && { transform: [{ translateX: -18 }] }]} />
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ملخص سريع</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.metricCard}>
                <Feather name="truck" size={16} color={Colors.primary} />
                <Text style={styles.metricValue}>{driver.totalTrips}</Text>
                <Text style={styles.metricLabel}>رحلات</Text>
              </View>
              <View style={styles.metricCard}>
                <Feather name="star" size={16} color={Colors.gold} />
                <Text style={styles.metricValue}>{driver.rating}</Text>
                <Text style={styles.metricLabel}>تقييم</Text>
              </View>
              <View style={styles.metricCard}>
                <Feather name="credit-card" size={16} color={isDebt ? Colors.danger : Colors.success} />
                <Text style={[styles.metricValue, { color: isDebt ? Colors.danger : Colors.success }]}> 
                  {isDebt ? "-" : "+"}{Math.abs(driver.balance).toFixed(1)}
                </Text>
                <Text style={styles.metricLabel}>الرصيد</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.quickActions}>
              <Pressable style={styles.quickBtn} onPress={() => router.navigate("/(tabs)/orders")}> 
                <Feather name="inbox" size={16} color={Colors.text} />
                <Text style={styles.quickBtnText}>الطلبات</Text>
              </Pressable>
              <Pressable style={styles.quickBtn} onPress={() => router.navigate("/(tabs)/map")}> 
                <Feather name="map" size={16} color={Colors.text} />
                <Text style={styles.quickBtnText}>الخريطة</Text>
              </Pressable>
              <Pressable style={styles.quickBtn} onPress={() => router.navigate("/(tabs)/wallet")}> 
                <Feather name="bar-chart-2" size={16} color={Colors.text} />
                <Text style={styles.quickBtnText}>التقارير</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <Modal visible={showModal} transparent animationType="none">
          <View style={styles.overlay}>
            <Animated.View
              style={[
                styles.modal,
                {
                  opacity: modalAnim,
                  transform: [
                    {
                      translateY: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [360, 0] }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>طلب جديد #{incomingOrder?.id}</Text>
              <Text style={styles.modalSub}>{incomingOrder?.restaurantName}</Text>
              <Text style={styles.modalAddress}>{incomingOrder?.customerAddress}</Text>

              <View style={styles.modalMetaRow}>
                <Text style={styles.modalMeta}>{incomingOrder?.distance}</Text>
                <Text style={[styles.modalMeta, { color: Colors.success }]}>{incomingOrder?.fare} ج.م</Text>
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.rejectBtn} onPress={handleDecline}>
                  <Text style={styles.rejectText}>رفض</Text>
                </Pressable>
                <Pressable style={styles.acceptBtn} onPress={handleAccept}>
                  <Text style={styles.acceptText}>قبول</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    bgGlow1: {
      position: "absolute",
      top: -80,
      right: -80,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: Colors.primary,
      opacity: 0.1,
    },
    bgGlow2: {
      position: "absolute",
      bottom: -70,
      left: -70,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: "#3b82f6",
      opacity: 0.09,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      marginBottom: 14,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: { alignItems: "center", gap: 4 },
    driverName: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 18 },
    rankPill: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      flexDirection: "row",
      gap: 5,
      alignItems: "center",
    },
    rankText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
    tenantText: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 11 },
    avatarCircle: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: Colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
    section: { paddingHorizontal: 18, marginBottom: 14 },
    sectionTitle: {
      color: Colors.text,
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      marginBottom: 10,
      textAlign: "right",
    },
    onlineCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.card,
      padding: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    onlineInfo: { flex: 1, alignItems: "flex-end", marginRight: 8 },
    liveRow: { flexDirection: "row", gap: 6, alignItems: "center" },
    liveDot: { width: 8, height: 8, borderRadius: 4 },
    liveTitle: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 15 },
    liveSubtitle: { color: Colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
    gpsText: { color: Colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 5 },
    toggle: {
      width: 46,
      height: 28,
      borderRadius: 16,
      paddingHorizontal: 4,
      justifyContent: "center",
    },
    knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
    summaryGrid: { flexDirection: "row", gap: 10 },
    metricCard: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.card,
    },
    metricValue: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 16 },
    metricLabel: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 11 },
    quickActions: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.card,
      padding: 10,
      flexDirection: "row",
      gap: 8,
    },
    quickBtn: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: Colors.card2,
      minHeight: 46,
      paddingHorizontal: 8,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
    },
    quickBtnText: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 12 },

    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modal: {
      backgroundColor: Colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: 16,
      paddingBottom: 24,
    },
    modalHandle: {
      width: 44,
      height: 4,
      borderRadius: 3,
      backgroundColor: Colors.border,
      alignSelf: "center",
      marginBottom: 12,
    },
    modalTitle: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "right" },
    modalSub: { color: Colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "right", marginTop: 6 },
    modalAddress: { color: Colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "right", marginTop: 4 },
    modalMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
    modalMeta: { color: Colors.textSecondary, fontFamily: "Inter_700Bold", fontSize: 14 },
    modalActions: { flexDirection: "row", gap: 8, marginTop: 14 },
    rejectBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.danger + "66",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.danger + "18",
    },
    rejectText: { color: Colors.danger, fontFamily: "Inter_700Bold", fontSize: 14 },
    acceptBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: Colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    acceptText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  });

