import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [tenantCode, setTenantCode] = useState("pilot-main");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tenantFocused, setTenantFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const topPadding = Platform.OS === "web" ? 56 : insets.top + 6;

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
    const success = login(phone.trim(), password.trim(), tenantCode.trim(), "driver");
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

      <View style={styles.glowTR} />
      <View style={styles.glowBL} />
      <View style={styles.glowCenter} />

      <View style={[styles.topBar, { paddingTop: topPadding }]}> 
        <View style={styles.metaPill}>
          <View style={styles.dotGreen} />
          <Text style={styles.metaText}>الخدمة مباشرة</Text>
        </View>
        <View style={styles.metaPill}>
          <Feather name="layers" size={11} color={Colors.textSecondary} />
          <Text style={styles.metaText}>Design System موحد</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(30, insets.bottom + 10) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBlock}>
            <View style={styles.logoWrap}>
              <View style={styles.logoSquare}>
                <Feather name="zap" size={30} color="#fff" />
              </View>
              <View style={styles.logoPing} />
            </View>
            <Text style={styles.brandName}>سويفت لوجستكس</Text>
            <Text style={styles.brandTag}>منصة توصيل الطعام الذكية</Text>
          </View>

          <View style={styles.roleRow}>
            <View style={[styles.roleCard, styles.roleCardActive]}>
              <View style={styles.roleIconActive}><Feather name="truck" size={14} color="#fff" /></View>
              <Text style={styles.roleLabelActive}>طيار</Text>
            </View>
            <View style={styles.roleCardMuted}>
              <View style={styles.roleIconMuted}><Feather name="navigation" size={14} color={Colors.textMuted} /></View>
              <Text style={styles.roleLabelMuted}>موزع</Text>
            </View>
            <View style={styles.roleCardMuted}>
              <View style={styles.roleIconMuted}><Feather name="shield" size={14} color={Colors.textMuted} /></View>
              <Text style={styles.roleLabelMuted}>أدمن</Text>
            </View>
          </View>

          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}> 
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>تسجيل الدخول</Text>
              <Text style={styles.cardSubtitle}>نفس لغة وتصميم نسخة الويب</Text>
            </View>

            <View style={styles.driverOnlyBadge}>
              <Feather name="user-check" size={13} color={Colors.primary} />
              <Text style={styles.driverOnlyBadgeText}>وضع السائق مفعل</Text>
            </View>

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
                  <Feather name="briefcase" size={18} color={tenantFocused ? Colors.primary : Colors.textMuted} />
                </View>
              </View>
            </View>

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
                <Pressable style={styles.fieldIcon} onPress={() => setShowPassword((v) => !v)}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={passFocused ? Colors.primary : Colors.textMuted} />
                </Pressable>
              </View>
            </View>

            <View style={styles.forgotRow}>
              <Pressable>
                <Text style={styles.forgotLink}>نسيت كلمة المرور؟</Text>
              </Pressable>
              <View style={styles.rememberRow}>
                <Text style={styles.rememberText}>تذكرني</Text>
                <View style={styles.checkbox}><Feather name="check" size={10} color={Colors.primary} /></View>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.loginBtn, pressed && styles.loginBtnPressed, loading && { opacity: 0.7 }]}
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

            <Text style={styles.helperText}>أول دخول غالبًا بكلمة مرور افتراضية: 1234</Text>
          </Animated.View>

          <Text style={styles.footerText}>بتسجيل دخولك، أنت توافق على شروط الخدمة وسياسة الخصوصية</Text>
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
  glowTR: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.primary,
    opacity: 0.11,
  },
  glowBL: {
    position: "absolute",
    bottom: -90,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#3b82f6",
    opacity: 0.1,
  },
  glowCenter: {
    position: "absolute",
    top: 220,
    left: -90,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    opacity: 0.05,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 100,
  },
  dotGreen: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  metaText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  brandBlock: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 16,
  },
  logoWrap: {
    position: "relative",
    marginBottom: 10,
  },
  logoSquare: {
    width: 74,
    height: 74,
    borderRadius: 18,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  logoPing: {
    position: "absolute",
    top: -5,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.background,
    backgroundColor: Colors.primary,
  },
  brandName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 5,
  },
  brandTag: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  roleCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    gap: 4,
  },
  roleCardActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.2)",
  },
  roleCardMuted: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    gap: 4,
  },
  roleIconActive: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconMuted: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  roleLabelActive: {
    fontSize: 11,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  roleLabelMuted: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
  },
  card: {
    backgroundColor: "rgba(17,24,39,0.86)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  driverOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    backgroundColor: "rgba(34,197,94,0.12)",
    alignSelf: "flex-start",
  },
  driverOnlyBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "right",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    minHeight: 50,
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
    minHeight: 50,
  },
  fieldIcon: {
    width: 42,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.1)",
  },
  forgotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 4,
  },
  rememberRow: {
    flexDirection: "row",
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
    backgroundColor: "#10b981",
    borderRadius: 14,
    minHeight: 50,
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
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 4,
  },
  loadingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  helperText: {
    marginTop: 10,
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  footerText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 17,
    paddingHorizontal: 12,
  },
});
