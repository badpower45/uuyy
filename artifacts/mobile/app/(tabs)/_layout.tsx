import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

function ClassicTabLayout() {
  const safeAreaInsets = useSafeAreaInsets();
  const { userRole } = useApp();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const firstTab =
    userRole === "admin"
      ? { name: "super-admin", title: "السوبر أدمن", sf: "person.3.fill", icon: "shield" as const }
      : userRole === "restaurant"
        ? { name: "restaurant", title: "المطعم", sf: "building.2.fill", icon: "shopping-bag" as const }
        : { name: "index", title: "الرئيسية", sf: "house", icon: "home" as const };

  const secondTab =
    userRole === "restaurant"
      ? { title: "الخريطة", sf: "map.fill", icon: "map" as const }
      : userRole === "admin"
        ? { title: "المتابعة", sf: "map.fill", icon: "map" as const }
        : { title: "الطلب", sf: "map", icon: "map" as const };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.card,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: Colors.card }]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name={firstTab.name}
        options={{
          title: firstTab.title,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name={firstTab.sf as any} tintColor={color} size={24} />
            ) : (
              <Feather name={firstTab.icon} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: secondTab.title,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name={secondTab.sf as any} tintColor={color} size={24} />
            ) : (
              <Feather name={secondTab.icon} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "المحفظة",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="creditcard" tintColor={color} size={24} />
            ) : (
              <Feather name="credit-card" size={22} color={color} />
            ),
        }}
      />

      {/* Hidden routes (for role switching without remount issues) */}
      {firstTab.name !== "index" && <Tabs.Screen name="index" options={{ href: null }} />}
      {firstTab.name !== "super-admin" && (
        <Tabs.Screen name="super-admin" options={{ href: null }} />
      )}
      {firstTab.name !== "restaurant" && (
        <Tabs.Screen name="restaurant" options={{ href: null }} />
      )}
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}
