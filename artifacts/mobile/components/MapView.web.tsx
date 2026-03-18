import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export default function WebMapView() {
  return (
    <View style={styles.container}>
      <Feather name="map" size={48} color={Colors.textMuted} />
      <Text style={styles.text}>الخريطة متاحة على الجهاز المحمول</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
    gap: 12,
  },
  text: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
