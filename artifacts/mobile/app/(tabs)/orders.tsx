import React, { useState } from "react";
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

function OrderCard({ title, tone, order }: { title: string; tone: "incoming" | "active"; order: any }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.badge, { backgroundColor: tone === "incoming" ? Colors.warning : Colors.success }]}>
          <Text style={styles.badgeText}>{tone === "incoming" ? "جديد" : "نشط"}</Text>
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>

      <View style={styles.sep} />

      <View style={styles.row}>
        <Feather name="shopping-bag" size={15} color={Colors.primary} />
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowLabel}>المطعم</Text>
          <Text style={styles.rowValue}>{order.restaurantName}</Text>
          <Text style={styles.rowSub}>{order.restaurantAddress}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Feather name="home" size={15} color={Colors.accent} />
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowLabel}>العميل</Text>
          <Text style={styles.rowValue}>{order.customerAddress}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.metaText}>{order.distance || "—"}</Text>
        <Text style={[styles.metaText, { color: Colors.success }]}>{order.fare} ج.م</Text>
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { driver, incomingOrder, activeOrder, isOnline } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.livePill}>
            <View style={[styles.liveDot, { backgroundColor: isOnline ? Colors.success : Colors.danger }]} />
            <Text style={styles.liveText}>{isOnline ? "متصل" : "غير متصل"}</Text>
          </View>

          <Text style={styles.headerTitle}>صفحة الطلبات</Text>
          {driver ? <Text style={styles.headerSub}>السائق: {driver.name} • {driver.totalTrips} رحلة</Text> : <Text style={styles.headerSub}>—</Text>}
        </View>

        {!!activeOrder && <OrderCard title="الطلب الحالي" tone="active" order={activeOrder} />}
        {!!incomingOrder && <OrderCard title="طلب جديد" tone="incoming" order={incomingOrder} />}

        {!activeOrder && !incomingOrder && (
          <View style={styles.emptyCard}>
            <Feather name="inbox" size={42} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>لا توجد طلبات الآن</Text>
            <Text style={styles.emptySub}>{isOnline ? "أي طلب جديد سيظهر هنا تلقائيًا" : "فعّل الاتصال أولًا لاستقبال الطلبات"}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: "flex-end",
  },
  livePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { color: Colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 11 },
  headerTitle: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 20 },
  headerSub: { color: Colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },

  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10 },
  cardTitle: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 15 },
  sep: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10 },
  rowTextWrap: { flex: 1 },
  rowLabel: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 11 },
  rowValue: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 2 },
  rowSub: { color: Colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  metaText: { color: Colors.textSecondary, fontFamily: "Inter_700Bold", fontSize: 13 },

  emptyCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
  },
  emptyTitle: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 10 },
  emptySub: { color: Colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 6, textAlign: "center" },
});
