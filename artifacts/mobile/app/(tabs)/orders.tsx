import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { driver, incomingOrder, activeOrder, isOnline } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const renderOrderCard = (order: any, type: "incoming" | "active") => {
    if (!order) return null;

    return (
      <View key={type} style={[styles.card, { marginBottom: 12 }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderType}>
            {type === "incoming" ? "📬 طلب جديد" : "🚗 الطلب الحالي"}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: type === "incoming" ? Colors.warning : Colors.success },
            ]}
          >
            <Text style={styles.statusText}>
              {type === "incoming" ? "جديد" : "نشط"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.label}>المطعم</Text>
              <Text style={styles.value}>{order.restaurantName}</Text>
              <Text style={styles.detail}>{order.restaurantAddress}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Feather name="home" size={16} color={Colors.danger} />
            <View style={styles.infoContent}>
              <Text style={styles.label}>العميل</Text>
              <Text style={styles.value}>{order.customerAddress}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Feather name="dollar-sign" size={16} color={Colors.success} />
            <View style={styles.infoContent}>
              <Text style={styles.label}>السعر</Text>
              <Text style={[styles.value, { color: Colors.success }]}>
                {order.fare} ج.م
              </Text>
            </View>
          </View>

          {order.distance && (
            <View style={styles.infoRow}>
              <Feather name="navigation" size={16} color={Colors.info} />
              <View style={styles.infoContent}>
                <Text style={styles.label}>المسافة</Text>
                <Text style={styles.value}>{order.distance}</Text>
              </View>
            </View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: type === "incoming" ? Colors.warning : Colors.primary },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <Feather name="arrow-right" size={18} color="white" />
          <Text style={styles.actionButtonText}>
            {type === "incoming" ? "عرض الطلب" : "متابعة"}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Status Indicator */}
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: isOnline ? Colors.success : Colors.textMuted },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? Colors.success : Colors.textMuted },
            ]}
          />
          <Text style={styles.statusIndicatorText}>
            {isOnline ? "متصل وجاهز لاستقبال الطلبات" : "غير متصل"}
          </Text>
        </View>

        {/* Driver Info */}
        {driver && (
          <View style={styles.driverCard}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <View style={styles.driverStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>الطلبات</Text>
                <Text style={styles.statValue}>{driver.totalTrips}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>التقييم</Text>
                <Text style={styles.statValue}>⭐ {driver.rating}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>الرصيد</Text>
                <Text style={[styles.statValue, { color: Colors.success }]}>
                  {driver.balance} ج.م
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Orders */}
        <View style={styles.ordersSection}>
          <Text style={styles.sectionTitle}>الطلبات</Text>

          {activeOrder ? (
            <>
              {renderOrderCard(activeOrder, "active")}
              {incomingOrder && renderOrderCard(incomingOrder, "incoming")}
            </>
          ) : incomingOrder ? (
            renderOrderCard(incomingOrder, "incoming")
          ) : (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyStateText}>
                {isOnline ? "لا توجد طلبات جديدة حالياً" : "قم بتفعيل الإنترنت أولاً"}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {isOnline
                  ? "ستظهر الطلبات الجديدة هنا تلقائياً"
                  : "فعّل الاتصال بالإنترنت لاستقبال الطلبات"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusIndicatorText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  driverCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  driverStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  ordersSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  orderType: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  orderInfo: {
    gap: 10,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  infoContent: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  detail: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 16,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
});
