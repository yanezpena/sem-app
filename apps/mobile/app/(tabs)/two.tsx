import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Button,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../contexts/AuthContext";
import { createExpense } from "@/lib/api";
import type { CreateExpenseDto } from "shared";

const CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Entertainment",
  "Health",
  "Other",
];

export default function AddExpenseScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenseDto) => createExpense(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setAmount("");
      setDescription("");
      setCategory("");
      router.replace("/(tabs)");
    },
  });

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      return;
    }
    createMutation.mutate({
      amount: num,
      description: description.trim() || undefined,
      category: category.trim() || undefined,
    });
  };

  if (!user) {
    return null;
  }

  const isValid = amount && parseFloat(amount) > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Expense</Text>

        <Text style={styles.label}>Amount ($)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Coffee, Groceries"
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Category (optional)</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              title={cat}
              onPress={() => setCategory(category === cat ? "" : cat)}
              color={category === cat ? "#2563eb" : "#94a3b8"}
            />
          ))}
        </View>

        {createMutation.isError && (
          <Text style={styles.error}>
            {(createMutation.error as Error).message}
          </Text>
        )}

        <Button
          title={createMutation.isPending ? "Adding..." : "Add Expense"}
          onPress={handleSubmit}
          disabled={!isValid || createMutation.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  error: { color: "#c00", marginBottom: 16 },
});
