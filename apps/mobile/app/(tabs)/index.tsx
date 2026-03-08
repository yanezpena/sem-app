import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Button,
  Pressable,
  Alert,
} from "react-native";
import { useEffect } from "react";
import { Link, useRouter } from "expo-router";

import { Text, View } from "@/components/Themed";
import { fetchExpenses, deleteExpense } from "@/lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { Expense } from "shared";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function ExpensesScreen() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user]);

  const {
    data: expenses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => fetchExpenses(token!),
    enabled: !!user && !!token,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      "Delete expense",
      `Remove "${expense.description || formatAmount(expense.amount)}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(expense.id),
        },
      ]
    );
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          Could not load expenses. Is the API running?
        </Text>
        <Text style={styles.hint}>Run: pnpm api</Text>
      </View>
    );
  }

  const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <View style={styles.headerRow}>
          <Text style={styles.total}>Total: {formatAmount(total)}</Text>
          <Button title="Log out" onPress={logout} />
        </View>
      </View>
      <FlatList
        data={expenses ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.item}
            onLongPress={() => handleDelete(item)}
          >
            <View style={styles.itemMain}>
              <Text style={styles.itemAmount}>{formatAmount(item.amount)}</Text>
              {item.description && (
                <Text style={styles.itemDesc}>{item.description}</Text>
              )}
              {item.category && (
                <Text style={styles.itemCategory}>{item.category}</Text>
              )}
            </View>
            <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No expenses yet. Tap "Add" to log one.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  title: { fontSize: 24, fontWeight: "bold" },
  total: { fontSize: 16, fontWeight: "600" },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemMain: { flex: 1 },
  itemAmount: { fontWeight: "600", fontSize: 16 },
  itemDesc: { color: "#666", marginTop: 2 },
  itemCategory: { color: "#999", fontSize: 12, marginTop: 2 },
  itemDate: { color: "#666", fontSize: 12 },
  empty: { marginTop: 24, textAlign: "center", color: "#666" },
  error: { color: "#c00", textAlign: "center" },
  hint: { marginTop: 8, color: "#666" },
});
