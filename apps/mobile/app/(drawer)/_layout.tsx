import React from "react";
import { Drawer } from "expo-router/drawer";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Pressable, View, Text, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

function CustomDrawerContent({ navigation }: DrawerContentComponentProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();

  const closeDrawer = () => navigation.closeDrawer();

  const handleLogout = () => {
    closeDrawer();
    logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={[styles.drawerContent, { backgroundColor: Colors[colorScheme].background }]}>
      <View style={styles.drawerHeader}>
        <SymbolView
          name={{ ios: "banknote", android: "attach_money", web: "attach_money" }}
          tintColor={Colors[colorScheme].tint}
          size={40}
        />
        <View style={styles.drawerTitleRow}>
          <Text style={[styles.drawerTitle, { color: Colors[colorScheme].text }]}>Expense Tracker</Text>
        </View>
      </View>
      <Pressable
        style={styles.drawerItem}
        onPress={() => {
          closeDrawer();
          navigation.navigate("(tabs)", { screen: "add" });
        }}
      >
        <Ionicons name="add-circle" size={22} color={Colors[colorScheme].text} />
        <Text style={[styles.drawerItemText, { color: Colors[colorScheme].text }]}>Add Expense</Text>
      </Pressable>
      <Pressable
        style={styles.drawerItem}
        onPress={() => {
          closeDrawer();
          navigation.navigate("(tabs)", { screen: "dashboard" });
        }}
      >
        <Ionicons name="stats-chart" size={22} color={Colors[colorScheme].text} />
        <Text style={[styles.drawerItemText, { color: Colors[colorScheme].text }]}>Dashboard</Text>
      </Pressable>
      <Pressable
        style={styles.drawerItem}
        onPress={() => {
          closeDrawer();
          navigation.navigate("(tabs)", { screen: "expenses" });
        }}
      >
        <Ionicons name="list" size={22} color={Colors[colorScheme].text} />
        <Text style={[styles.drawerItemText, { color: Colors[colorScheme].text }]}>Expenses</Text>
      </Pressable>
      <Pressable
        style={styles.drawerItem}
        onPress={() => {
          closeDrawer();
          navigation.navigate("(tabs)", { screen: "reports" });
        }}
      >
        <Ionicons name="document-text" size={22} color={Colors[colorScheme].text} />
        <Text style={[styles.drawerItemText, { color: Colors[colorScheme].text }]}>Reports</Text>
      </Pressable>
      <View style={styles.drawerSpacer} />
      <Pressable
        style={[styles.drawerItem, styles.drawerItemLogout]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out" size={22} color="#dc2626" />
        <Text style={[styles.drawerItemText, { color: "#dc2626" }]}>Log out</Text>
      </Pressable>
    </View>
  );
}

export default function DrawerLayout() {
  const colorScheme = useColorScheme();

  return (
    <Drawer
      initialRouteName="(tabs)"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors[colorScheme].background },
        headerTintColor: Colors[colorScheme].text,
        headerTitle: () => (
          <View style={styles.headerTitle}>
            <SymbolView
              name={{ ios: "banknote.fill", android: "attach_money", web: "attach_money" }}
              tintColor={Colors[colorScheme].tint}
              size={24}
            />
            <Text style={[styles.headerTitleText, { color: Colors[colorScheme].text }]}>Expense Tracker</Text>
          </View>
        ),
        headerTitleAlign: "center",
        drawerStyle: { backgroundColor: Colors[colorScheme].background },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: "Home",
          title: "Expense Tracker",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="expense/[id]"
        options={{
          drawerLabel: "Edit Expense",
          title: "Edit Expense",
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitleText: { fontSize: 18, fontWeight: "600" },
  drawerContent: { flex: 1, paddingTop: Platform.OS === "ios" ? 48 : 24 },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  drawerTitleRow: { marginLeft: 12, flex: 1 },
  drawerTitle: { fontSize: 18, fontWeight: "700" },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 16,
  },
  drawerItemText: { fontSize: 16, fontWeight: "500" },
  drawerSpacer: { flex: 1 },
  drawerItemLogout: { borderTopWidth: 1, borderTopColor: "#e5e7eb" },
});
