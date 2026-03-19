import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Alert,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, type UserRole } from "@/context/AppContext";
import Colors from "@/constants/colors";

const ROLES = [
  { id: "driver" as UserRole, label: "السائق" },
  { id: "restaurant" as UserRole, label: "المطعم" },
  { id: "admin" as UserRole, label: "المشرف" },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [tenantCode, setTenantCode] = useState("pilot-main");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>("driver");
  const [tenantFocused, setTenantFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!tenantCode.trim() || !phone.trim() || !password.trim()) {
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("بيانات ناقصة", "أدخل كود الشركة ورقم الهاتف وكلمة المرور");
      return;
    }

    if (tenantCode.trim().length < 3) {
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("كود شركة غير صحيح", "كود الشركة لازم يكون 3 حروف أو أكثر");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const success = login(phone.trim(), password.trim(), tenantCode.trim(), activeRole);
    setLoading(false);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } else {
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("بيانات غير صحيحة", "تأكد من رقم الهاتف وكلمة المرور");
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Background glows */}
      <View style={styles.glowTR} />
      <View style={styles.glowBL} />
      <View style={styles.glowCenter} />

      {/* Status bar row */}
      <View style={[styles.topBar, { paddingTop: topPadding + 8 }]}>
        <View style={styles.statusPill}>
          <View style={styles.dotGreen} />
          <Text style={styles.statusText}>متصل بالشبكة</Text>
        </View>
        <View style={styles.statusPill}>
          <Feather name="users" size={11} color={Colors.textSecondary} />
          <Text style={styles.statusText}>١٢٤ طيار نشط</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + brand */}
          <View style={styles.brandBlock}>
            <View style={styles.logoWrap}>
              <View style={styles.logoCircle}>
                <Feather name="truck" size={32} color="#fff" />
              </View>
              <View style={styles.logoPing} />
            </View>
            <Text style={styles.brandName}>بايلوت</Text>
            <Text style={styles.brandTag}>منصة توصيل ذكية في الوقت الحقيقي</Text>
          </View>

          <View style={styles.saasBadge}>
            <Feather name="layers" size={13} color={Colors.primary} />
            <Text style={styles.saasBadgeText}>وضع SaaS متعدد الشركات</Text>
          </View>

          {/* Login card */}
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
            {/* Card header */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>تسجيل الدخول</Text>
              <Text style={styles.cardSubtitle}>أدخل بياناتك للوصول إلى لوحة التحكم</Text>
            </View>

            {/* Role selector */}
            <View style={styles.roleRow}>
              {ROLES.map((role) => {
                const isActive = activeRole === role.id;
                return (
                  <Pressable
                    key={role.id}
                    style={[styles.roleTab, isActive && styles.roleTabActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActiveRole(role.id);
                    }}
                  >
                    <Text style={[styles.roleTabText, isActive && styles.roleTabTextActive]}>
                      {role.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Tenant */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>كود الشركة (Workspace)</Text>
              <View style={[styles.inputRow, tenantFocused && styles.inputRowFocused]}>
                <TextInput
                  style={styles.textInput}
                  value={tenantCode}
                  onChangeText={setTenantCode}
                  placeholder="pilot-main"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textAlign="right"
                  selectionColor={Colors.primary}
                  editable={!loading}
                  onFocus={() => setTenantFocused(true)}
                  onBlur={() => setTenantFocused(false)}
                />
                <View style={styles.fieldIcon}>
                  <Feather
                    name="briefcase"
                    size={18}
                    color={tenantFocused ? Colors.primary : Colors.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>رقم الهاتف</Text>
              <View style={[styles.inputRow, phoneFocused && styles.inputRowFocused]}>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="01xxxxxxxxx"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  textAlign="right"
                  selectionColor={Colors.primary}
                  editable={!loading}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                />
                <View style={styles.fieldIcon}>
                  <Feather name="phone" size={18} color={phoneFocused ? Colors.primary : Colors.textMuted} />
                </View>
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>كلمة المرور</Text>
              <View style={[styles.inputRow, passFocused && styles.inputRowFocused]}>
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  textAlign="right"
                  selectionColor={Colors.primary}
                  editable={!loading}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                />
                <Pressable
                  style={styles.fieldIcon}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={passFocused ? Colors.primary : Colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            {/* Forgot row */}
            <View style={styles.forgotRow}>
              <Pressable>
                <Text style={styles.forgotLink}>نسيت كلمة المرور؟</Text>
              </Pressable>
              <View style={styles.rememberRow}>
                <Text style={styles.rememberText}>تذكرني</Text>
                <View style={styles.checkbox}>
                  <Feather name="check" size={10} color={Colors.primary} />
                </View>
              </View>
            </View>

            {/* Login button */}
            <Pressable
              style={({ pressed }) => [
                styles.loginBtn,
                pressed && styles.loginBtnPressed,
                loading && { opacity: 0.7 },
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <Text style={styles.loginBtnText}>جارٍ تسجيل الدخول</Text>
                  <View style={styles.loadingDots}>
                    <View style={[styles.loadingDot, { opacity: 0.4 }]} />
                    <View style={[styles.loadingDot, { opacity: 0.7 }]} />
                    <View style={styles.loadingDot} />
                  </View>
                </View>
              ) : (
                <Text style={styles.loginBtnText}>تسجيل الدخول</Text>
              )}
            </Pressable>

            {/* Demo hint */}
            <View style={styles.demoHint}>
              <Feather name="info" size={13} color={Colors.textMuted} />
              <Text style={styles.demoText}>
                نموذج تجريبي: كود شركة + رقم هاتف (10 أرقام) + كلمة مرور (4 أحرف+)
              </Text>
            </View>
          </Animated.View>

          {/* Footer */}
          <Text style={styles.footerText}>
            بتسجيل دخولك، أنت توافق على شروط الخدمة وسياسة الخصوصية
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  splashCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  splashContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingBar: {
    width: 180,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginTop: 32,
    overflow: "hidden",
  },
  loadingBarFill: {
    width: "70%",
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  loadingLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 12,
    textAlign: "center",
  },
  glowTR: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.primary,
    opacity: 0.12,
    ...(Platform.OS === "web" ? { filter: "blur(70px)" } : {}),
  } as any,
  glowBL: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    opacity: 0.08,
    ...(Platform.OS === "web" ? { filter: "blur(60px)" } : {}),
  } as any,
  glowCenter: {
    position: "absolute",
    top: "40%",
    left: "50%",
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    opacity: 0.05,
    ...(Platform.OS === "web" ? { filter: "blur(80px)" } : {}),
  } as any,
  topBar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  statusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dotGreen: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  brandBlock: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 28,
  },
  saasBadge: {
    flexDirection: "row-reverse",
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary + "18",
    borderWidth: 1,
    borderColor: Colors.primary + "50",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  saasBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  logoWrap: {
    position: "relative",
    marginBottom: 14,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logoPing: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    opacity: 0.3,
  },
  brandName: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  brandTag: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 16,
  },
  cardHeader: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "right",
  },
  roleRow: {
    flexDirection: "row-reverse",
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 3,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 8,
  },
  roleTabActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  roleTabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  roleTabTextActive: {
    color: "#000",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "right",
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 52,
    overflow: "hidden",
  },
  inputRowFocused: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    textAlign: "right",
    paddingHorizontal: 14,
    height: "100%",
  },
  fieldIcon: {
    width: 46,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  forgotRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 2,
  },
  rememberRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
  },
  rememberText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: Colors.primary + "20",
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotLink: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  loginBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  loginBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#000",
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  loadingDots: {
    flexDirection: "row-reverse",
    gap: 4,
  },
  loadingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#000",
  },
  demoHint: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  demoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "right",
  },
  footerText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 17,
    paddingHorizontal: 20,
  },
});
