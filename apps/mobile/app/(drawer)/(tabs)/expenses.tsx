import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Pressable,
  Image,
  View as RNView,
  Modal,
  Text as RNText,
} from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";

import { Text, View } from "@/components/Themed";
import { PhotoWithTooltip } from "@/components/PhotoWithTooltip";
import { YearSelector } from "@/components/YearSelector";
import { fetchExpenses, deleteExpense } from "@/lib/api";
import { formatAmount, formatDate, getYearRange } from "@/lib/formatters";
import { resolveReceiptUrl } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { SymbolView } from "expo-symbols";
import type { Expense } from "shared";

export default function ExpensesScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [photoModalUri, setPhotoModalUri] = useState<string | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);

  const { startDate, endDate } = getYearRange(selectedYear);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login");
    }
  }, [user, router]);

  const {
    data: expenses,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["expenses", startDate, endDate],
    queryFn: () => fetchExpenses(token!, { startDate, endDate }),
    enabled: !!user && !!token,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setDeleteConfirmExpense(null);
    },
  });

  const handleDeletePress = useCallback((expense: Expense) => {
    setDeleteConfirmExpense(expense);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirmExpense) {
      deleteMutation.mutate(deleteConfirmExpense.id);
    }
  }, [deleteConfirmExpense, deleteMutation]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmExpense(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Expense }) => {
      const receiptFullUri = resolveReceiptUrl(item.receiptUrl);
      return (
        <RNView style={styles.item}>
          {item.receiptUrl && receiptFullUri ? (
            <PhotoWithTooltip
              uri={receiptFullUri}
              style={styles.itemThumbnailWrap}
              imageStyle={styles.itemThumbnail}
              tooltipText="Click to view full size"
              onPress={() => setPhotoModalUri(receiptFullUri)}
            />
          ) : (
            <RNView style={styles.itemThumbnailWrap} accessibilityLabel="No receipt">
              <RNView style={styles.itemThumbnailPlaceholder}>
                <SymbolView
                  name={{ ios: "photo", android: "image_not_supported", web: "image_not_supported" }}
                  tintColor="#b91c1c"
                  size={24}
                />
              </RNView>
            </RNView>
          )}
          <Pressable
            style={styles.itemMain}
            onPress={() => router.push(`/expense/${item.id}`)}
            accessibilityLabel={`${formatAmount(item.amount)}, ${item.description || "No description"}, ${item.category?.name || "Uncategorized"}, ${formatDate(item.date)}`}
            accessibilityRole="button"
          >
            <Text style={styles.itemAmount}>{formatAmount(item.amount)}</Text>
            {item.description && <Text style={styles.itemDesc}>{item.description}</Text>}
            {item.category && <Text style={styles.itemCategory}>{item.category.name}</Text>}
            <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
          </Pressable>
          <Pressable
            style={styles.itemDeleteBtn}
            onPress={() => handleDeletePress(item)}
            hitSlop={12}
            accessibilityLabel="Delete expense"
            accessibilityRole="button"
          >
            <SymbolView name={{ ios: "trash", android: "delete", web: "delete" }} tintColor="#b91c1c" size={22} />
          </Pressable>
        </RNView>
      );
    },
    [handleDeletePress, router]
  );

  if (!user) return null;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" accessibilityLabel="Loading expenses" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {error instanceof Error ? error.message : "Could not load expenses."}
        </Text>
        <Pressable style={styles.retryBtn} onPress={() => refetch()} accessibilityRole="button" accessibilityLabel="Retry">
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <Text style={styles.total}>Total: {formatAmount(total)}</Text>
      </View>

      <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />

      <FlatList
        data={expenses ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses yet. Tap "Add" to log one.</Text>
        }
      />

      {deleteConfirmExpense ? (
        <Modal visible transparent animationType="fade" onRequestClose={handleDeleteCancel}>
          <RNView style={styles.confirmOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleDeleteCancel} accessibilityLabel="Cancel" />
            <Pressable style={styles.confirmCard} onPress={() => {}}>
              <RNText style={styles.confirmTitle}>Delete expense?</RNText>
              <RNText style={styles.confirmMessage}>
                {`Remove "${deleteConfirmExpense.description || formatAmount(deleteConfirmExpense.amount)}"${deleteConfirmExpense.category ? ` (${deleteConfirmExpense.category.name})` : ""}? This cannot be undone.`}
              </RNText>
              <RNView style={styles.confirmButtons}>
                <Pressable style={styles.confirmCancelBtn} onPress={handleDeleteCancel} accessibilityLabel="Cancel">
                  <RNText style={styles.confirmCancelText}>Cancel</RNText>
                </Pressable>
                <Pressable
                  style={[styles.confirmDeleteBtn, deleteMutation.isPending && styles.confirmBtnDisabled]}
                  onPress={handleDeleteConfirm}
                  disabled={deleteMutation.isPending}
                  accessibilityLabel={deleteMutation.isPending ? "Deleting" : "Delete"}
                >
                  <RNText style={styles.confirmDeleteText}>{deleteMutation.isPending ? "Deleting…" : "Delete"}</RNText>
                </Pressable>
              </RNView>
            </Pressable>
          </RNView>
        </Modal>
      ) : null}

      {photoModalUri ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPhotoModalUri(null)}>
          <Pressable style={styles.photoModalOverlay} onPress={() => setPhotoModalUri(null)} accessibilityLabel="Close photo">
            <RNView style={styles.photoModalContent}>
              <Image source={{ uri: photoModalUri }} style={styles.photoModalImage} resizeMode="contain" />
            </RNView>
            <Pressable style={styles.photoModalClose} onPress={() => setPhotoModalUri(null)} accessibilityLabel="Close">
              <RNView style={styles.photoModalCloseInner}>
                <RNText style={styles.photoModalCloseText}>Close</RNText>
              </RNView>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "bold" },
  total: { fontSize: 16, fontWeight: "600", marginTop: 4, color: "#666" },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemThumbnailWrap: { width: 48, height: 48, marginRight: 12 },
  itemThumbnail: { width: 48, height: 48, borderRadius: 8 },
  itemThumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#fecaca",
    alignItems: "center",
    justifyContent: "center",
  },
  itemMain: { flex: 1 },
  itemDeleteBtn: { padding: 8, marginLeft: 4, justifyContent: "center", alignItems: "center" },
  itemAmount: { fontWeight: "600", fontSize: 16 },
  itemDesc: { color: "#666", marginTop: 2 },
  itemCategory: { color: "#999", fontSize: 12, marginTop: 2 },
  itemDate: { color: "#666", fontSize: 12 },
  empty: { marginTop: 24, textAlign: "center", color: "#666" },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalContent: { width: "100%", flex: 1, justifyContent: "center" },
  photoModalImage: { width: "100%", height: "100%" },
  photoModalClose: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center" },
  photoModalCloseInner: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: "#6366f1", borderRadius: 12 },
  photoModalCloseText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmCard: { backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340 },
  confirmTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 8 },
  confirmMessage: { fontSize: 16, color: "#555", marginBottom: 24, lineHeight: 22 },
  confirmButtons: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  confirmCancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  confirmCancelText: { fontSize: 16, fontWeight: "600", color: "#666" },
  confirmDeleteBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: "#b91c1c" },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmDeleteText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  error: { color: "#c00", textAlign: "center" },
  retryBtn: { marginTop: 16, padding: 12, backgroundColor: "#eef2ff", borderRadius: 8 },
  retryText: { color: "#6366f1", fontSize: 16, fontWeight: "600" },
});
