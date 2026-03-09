import React from "react";
import { Drawer } from "expo-router/drawer";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Pressable, View, Text, StyleSheet, Platform, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

import Colors from "@/constants/Colors";
import { Font } from "@/constants/Theme";
import { useColorScheme } from "@/components/useColorScheme";

const AppIcon = require("../../assets/images/icon.png");

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
      <View style={[styles.drawerHeader, { borderBottomColor: Colors[colorScheme].border }]}>
        <Image source={AppIcon} style={styles.drawerIcon} resizeMode="contain" />
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
      <Pressable
        style={styles.drawerItem}
        onPress={() => {
          closeDrawer();
          navigation.navigate("(tabs)", { screen: "categories" });
        }}
      >
        <Ionicons name="folder-open" size={22} color={Colors[colorScheme].text} />
        <Text style={[styles.drawerItemText, { color: Colors[colorScheme].text }]}>Categories</Text>
      </Pressable>
      <View style={styles.drawerSpacer} />
      <Pressable
        style={[styles.drawerItem, styles.drawerItemLogout, { borderTopColor: Colors[colorScheme].border }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out" size={22} color={Colors[colorScheme].error} />
        <Text style={[styles.drawerItemText, { color: Colors[colorScheme].error }]}>Log out</Text>
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
            <Image source={AppIcon} style={styles.headerIcon} resizeMode="contain" />
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
  headerIcon: { width: 28, height: 28 },
  headerTitleText: { fontSize: 18, fontFamily: Font.semiBold },
  drawerContent: { flex: 1, paddingTop: Platform.OS === "ios" ? 48 : 24 },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  drawerIcon: { width: 40, height: 40 },
  drawerTitleRow: { marginLeft: 12, flex: 1 },
  drawerTitle: { fontSize: 18, fontFamily: Font.bold },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 16,
  },
  drawerItemText: { fontSize: 16, fontFamily: Font.medium },
  drawerSpacer: { flex: 1 },
  drawerItemLogout: { borderTopWidth: 1 },
});
