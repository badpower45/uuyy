import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { driver, weeklyEarnings, isLoadingEarnings, refreshEarnings, seedMockWalletData } = useApp();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isSeedingMock, setIsSeedingMock] = useState(false);

  if (!driver) return null;

  const topPadding = Platform.OS === "web" ? 58 : insets.top + 6;

  const totalEarnings = weeklyEarnings.reduce((s, d) => s + d.earnings, 0);
  const totalTrips = weeklyEarnings.reduce((s, d) => s + d.trips, 0);
  const totalCash = weeklyEarnings.reduce((s, d) => s + d.cashCollected, 0);
  const totalCommission = weeklyEarnings.reduce((s, d) => s + d.commission, 0);
  const maxEarnings = Math.max(1, ...weeklyEarnings.map((d) => d.earnings));

  const isDebt = driver.balance < 0;
  const debtRatio = Math.abs(driver.balance) / driver.creditLimit;
  const isNearLimit = debtRatio > 0.7;
  const isAtLimit = debtRatio >= 1.0;

  const handleDaySelect = (index: number) => {
    Haptics.selectionAsync();
    setSelectedDay(selectedDay === index ? null : index);
  };

  const handleSeedMockData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSeedingMock(true);
    try {
      await seedMockWalletData();
    } finally {
      setIsSeedingMock(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : 100 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isLoadingEarnings}
            onRefresh={refreshEarnings}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>المحفظة والتقارير</Text>
          <Text style={styles.headerSubtitle}>ملخص أسبوعي مباشر</Text>
          <Pressable
            onPress={handleSeedMockData}
            disabled={isSeedingMock || isLoadingEarnings}
            style={({ pressed }) => [
              styles.mockSeedBtn,
              (isSeedingMock || isLoadingEarnings) && { opacity: 0.65 },
              pressed && { opacity: 0.86, transform: [{ scale: 0.98 }] },
            ]}
          >
            {isSeedingMock ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="database" size={15} color="#fff" />
            )}
            <Text style={styles.mockSeedBtnText}>تحميل بيانات تجريبية</Text>
          </Pressable>
        </View>

        {/* Balance Card */}
        <View style={styles.section}>
          <View
            style={[
              styles.balanceCard,
              {
                borderColor: isAtLimit
                  ? Colors.danger
                  : isNearLimit
                  ? Colors.warning
                  : Colors.border,
                borderRightWidth: 4,
                borderRightColor: isDebt ? Colors.danger : Colors.success,
              },
            ]}
          >
            <View style={styles.balanceTop}>
              <View style={styles.balanceLeft}>
                <Text style={styles.balanceLabel}>الرصيد الحالي</Text>
                <Text
                  style={[
                    styles.balanceAmount,
                    { color: isDebt ? Colors.danger : Colors.success },
                  ]}
                >
                  {isDebt ? "-" : "+"}{Math.abs(driver.balance).toFixed(2)} جنيه
                </Text>
              </View>
              <View
                style={[
                  styles.balanceIcon,
                  {
                    backgroundColor: isDebt
                      ? Colors.danger + "22"
                      : Colors.success + "22",
                  },
                ]}
              >
                <Feather
                  name={isDebt ? "trending-down" : "trending-up"}
                  size={28}
                  color={isDebt ? Colors.danger : Colors.success}
                />
              </View>
            </View>

            {isDebt && (
              <>
                <View style={styles.limitBar}>
                  <View style={styles.limitBarBg}>
                    <View
                      style={[
                        styles.limitBarFill,
                        {
                          width: `${Math.min(debtRatio * 100, 100)}%` as any,
                          backgroundColor: isAtLimit
                            ? Colors.danger
                            : isNearLimit
                            ? Colors.warning
                            : Colors.success,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.limitLabels}>
                    <Text style={styles.limitLabel}>
                      {Math.abs(driver.balance).toFixed(0)} جنيه مسحوب
                    </Text>
                    <Text style={styles.limitLabel}>
                      الحد {driver.creditLimit} جنيه
                    </Text>
                  </View>
                </View>

                {isAtLimit && (
                  <View style={[styles.alertBanner, { backgroundColor: Colors.danger + "20", borderColor: Colors.danger }]}>
                    <Feather name="alert-octagon" size={18} color={Colors.danger} />
                    <Text style={[styles.alertText, { color: Colors.danger }]}>
                      تجاوزت حد الإيقاف التلقائي — حسابك متوقف مؤقتاً
                    </Text>
                  </View>
                )}

                {isNearLimit && !isAtLimit && (
                  <View style={[styles.alertBanner, { backgroundColor: Colors.warning + "20", borderColor: Colors.warning }]}>
                    <Feather name="alert-triangle" size={18} color={Colors.warning} />
                    <Text style={[styles.alertText, { color: Colors.warning }]}>
                      تنبيه: اقتربت من حد الإيقاف التلقائي
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Weekly Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ملخص الأسبوع</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Feather name="truck" size={24} color={Colors.primary} />
              <Text style={styles.summaryValue}>{totalTrips}</Text>
              <Text style={styles.summaryLabel}>رحلة</Text>
            </View>
            <View style={styles.summaryCard}>
              <Feather name="dollar-sign" size={24} color={Colors.success} />
              <Text style={[styles.summaryValue, { color: Colors.success }]}>
                {totalEarnings}
              </Text>
              <Text style={styles.summaryLabel}>أرباح</Text>
            </View>
            <View style={styles.summaryCard}>
              <Feather name="credit-card" size={24} color={Colors.accent} />
              <Text style={[styles.summaryValue, { color: Colors.accent }]}>
                {totalCash}
              </Text>
              <Text style={styles.summaryLabel}>كاش</Text>
            </View>
            <View style={styles.summaryCard}>
              <Feather name="percent" size={24} color={Colors.danger} />
              <Text style={[styles.summaryValue, { color: Colors.danger }]}>
                {totalCommission}
              </Text>
              <Text style={styles.summaryLabel}>عمولة</Text>
            </View>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الأرباح اليومية</Text>
          <View style={styles.chartCard}>
            <View style={styles.barsContainer}>
              {weeklyEarnings.map((day, i) => {
                const isSelected = selectedDay === i;
                const barHeight = maxEarnings > 0 ? (day.earnings / maxEarnings) * 100 : 0;
                return (
                  <Pressable
                    key={i}
                    style={styles.barWrapper}
                    onPress={() => handleDaySelect(i)}
                  >
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${barHeight}%` as any,
                            backgroundColor: isSelected
                              ? Colors.primary
                              : Colors.primary + "55",
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.barLabel,
                        isSelected && { color: Colors.primary, fontFamily: "Inter_700Bold" },
                      ]}
                    >
                      {day.date.slice(0, 3)}
                    </Text>
                    {isSelected && (
                      <Text style={styles.barValue}>{day.earnings}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {selectedDay !== null && (
              <View style={styles.dayDetail}>
                <Text style={styles.dayDetailTitle}>
                  {weeklyEarnings[selectedDay].date}
                </Text>
                <View style={styles.dayDetailRow}>
                  <View style={styles.dayDetailItem}>
                    <Text style={styles.dayDetailLabel}>رحلات</Text>
                    <Text style={styles.dayDetailValue}>
                      {weeklyEarnings[selectedDay].trips}
                    </Text>
                  </View>
                  <View style={styles.dayDetailItem}>
                    <Text style={styles.dayDetailLabel}>أرباح</Text>
                    <Text style={[styles.dayDetailValue, { color: Colors.success }]}>
                      {weeklyEarnings[selectedDay].earnings} ج
                    </Text>
                  </View>
                  <View style={styles.dayDetailItem}>
                    <Text style={styles.dayDetailLabel}>كاش</Text>
                    <Text style={[styles.dayDetailValue, { color: Colors.accent }]}>
                      {weeklyEarnings[selectedDay].cashCollected} ج
                    </Text>
                  </View>
                  <View style={styles.dayDetailItem}>
                    <Text style={styles.dayDetailLabel}>عمولة</Text>
                    <Text style={[styles.dayDetailValue, { color: Colors.danger }]}>
                      {weeklyEarnings[selectedDay].commission} ج
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Daily Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تفاصيل الأيام</Text>
          {weeklyEarnings.map((day, i) => (
            <Pressable
              key={i}
              style={[
                styles.dayRow,
                selectedDay === i && { borderColor: Colors.primary, backgroundColor: Colors.primary + "11" },
              ]}
              onPress={() => handleDaySelect(i)}
            >
              <View style={styles.dayRowLeft}>
                <Text style={styles.dayRowTrips}>{day.trips} رحلة</Text>
                <Text
                  style={[styles.dayRowEarnings, { color: Colors.success }]}
                >
                  +{day.earnings} ج
                </Text>
              </View>
              <View style={styles.dayRowCenter}>
                <View style={styles.dayRowMeta}>
                  <Feather name="credit-card" size={14} color={Colors.textMuted} />
                  <Text style={styles.dayRowMetaText}>{day.cashCollected} ج</Text>
                </View>
                <View style={styles.dayRowMeta}>
                  <Feather name="minus-circle" size={14} color={Colors.danger} />
                  <Text style={[styles.dayRowMetaText, { color: Colors.danger }]}>
                    {day.commission} ج
                  </Text>
                </View>
              </View>
              <Text style={styles.dayRowDate}>{day.date}</Text>
            </Pressable>
          ))}

          {!weeklyEarnings.length && (
            <View style={styles.emptyCard}>
              {isLoadingEarnings ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Feather name="bar-chart-2" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>لا توجد بيانات هذا الأسبوع</Text>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bgGlow: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.primary,
    opacity: 0.08,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  mockSeedBtn: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "stretch",
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mockSeedBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "right",
    marginBottom: 10,
  },
  balanceCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  balanceTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  balanceLeft: {
    alignItems: "flex-end",
  },
  balanceLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
  },
  balanceIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  limitBar: {
    marginTop: 8,
  },
  limitBarBg: {
    height: 10,
    backgroundColor: Colors.card2,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 10,
  },
  limitBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  limitLabels: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  limitLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  alertBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 10,
    borderWidth: 1,
  },
  alertText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    textAlign: "right",
  },
  summaryGrid: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barsContainer: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    height: 140,
    gap: 10,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barTrack: {
    width: "100%",
    height: 110,
    justifyContent: "flex-end",
    borderRadius: 8,
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
    minHeight: 6,
  },
  barLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 8,
  },
  barValue: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    marginTop: 4,
  },
  dayDetail: {
    backgroundColor: Colors.card2,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayDetailTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "right",
    marginBottom: 12,
  },
  dayDetailRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  dayDetailItem: {
    flex: 1,
    alignItems: "center",
  },
  dayDetailLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginBottom: 6,
  },
  dayDetailValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  dayRow: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayRowLeft: {
    flex: 1,
    alignItems: "flex-end",
  },
  dayRowTrips: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dayRowEarnings: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  dayRowCenter: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  dayRowMeta: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  dayRowMetaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  dayRowDate: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "left",
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
