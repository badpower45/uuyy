import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

function ClassicTabLayout() {
  const safeAreaInsets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: Colors.card,
        },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: "Inter_700Bold",
          fontSize: 16,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.card,
          borderTopWidth: 0,
          elevation: 0,
          height: 66 + safeAreaInsets.bottom,
          paddingBottom: safeAreaInsets.bottom + 8,
          paddingTop: 8,
          marginHorizontal: 14,
          marginBottom: 10,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: Colors.border,
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
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name={"house" as any} tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "الطلب",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name={"map" as any} tintColor={color} size={24} />
            ) : (
              <Feather name="map" size={22} color={color} />
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
      <Tabs.Screen name="super-admin" options={{ href: null }} />
      <Tabs.Screen name="restaurant" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}
