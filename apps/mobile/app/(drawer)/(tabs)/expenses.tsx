import React, { useState } from "react";
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
  Platform,
} from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import { Text, View } from "@/components/Themed";
import { PhotoWithTooltip } from "@/components/PhotoWithTooltip";
import { fetchExpenses, deleteExpense } from "@/lib/api";
import { useAuth } from "../../_contexts/AuthContext";
import { SymbolView } from "expo-symbols";
import type { Expense } from "shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

function getYearRange(year: number) {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

const isWeb = Platform.OS === "web";

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
  const { user, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const { startDate, endDate } = getYearRange(selectedYear);
  const pickerDate = new Date(selectedYear, 0, 1);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login");
    }
  }, [user]);

  const {
    data: expenses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["expenses", startDate, endDate],
    queryFn: () => fetchExpenses(token!, { startDate, endDate }),
    enabled: !!user && !!token,
  });

  const [photoModalUri, setPhotoModalUri] = useState<string | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setDeleteConfirmExpense(null);
    },
  });

  const handleDeletePress = (expense: Expense) => {
    setDeleteConfirmExpense(expense);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmExpense) {
      deleteMutation.mutate(deleteConfirmExpense.id);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmExpense(null);
  };

  if (!user) return null;

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
        <Text style={styles.total}>Total: {formatAmount(total)}</Text>
      </View>

      <View style={styles.selectorCard}>
        <Text style={styles.selectorLabel}>Select Year</Text>
        <View style={styles.selectorRow}>
          <Pressable
            style={styles.monthNavBtn}
            onPress={() => setSelectedYear((y) => y - 1)}
          >
            <SymbolView name="chevron.left" tintColor="#6366f1" size={24} />
          </Pressable>
          <Pressable
            style={styles.monthDisplay}
            onPress={() => setShowYearPicker(true)}
          >
            <Text style={styles.monthDisplayText}>{selectedYear}</Text>
            <SymbolView name="chevron.down" tintColor="#6366f1" size={14} />
          </Pressable>
          <Pressable
            style={styles.monthNavBtn}
            onPress={() => setSelectedYear((y) => y + 1)}
          >
            <SymbolView name="chevron.right" tintColor="#6366f1" size={24} />
          </Pressable>
        </View>
        <Pressable
          style={styles.pickMonthBtn}
          onPress={() => setShowYearPicker(true)}
        >
          <SymbolView name="calendar" tintColor="#6366f1" size={18} />
          <Text style={styles.pickMonthBtnText}>Pick year</Text>
        </Pressable>

        {showYearPicker && isWeb && (
          <View style={styles.monthPickerContainer}>
            {React.createElement("input", {
              type: "number",
              min: 2020,
              max: 2030,
              value: selectedYear,
              onChange: (e: { target: { value: string } }) => {
                const val = parseInt((e.target as HTMLInputElement).value, 10);
                if (!isNaN(val) && val >= 2020 && val <= 2030) {
                  setSelectedYear(val);
                }
              },
              style: {
                width: "100%",
                padding: 16,
                fontSize: 18,
                border: "none",
                borderTop: "1px solid #e2e8f0",
                outline: "none",
                boxSizing: "border-box",
              },
            })}
            <Pressable
              style={styles.monthPickerDoneBtn}
              onPress={() => setShowYearPicker(false)}
            >
              <RNText style={styles.monthPickerDoneText}>Done</RNText>
            </Pressable>
          </View>
        )}

        {showYearPicker && Platform.OS === "android" && (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowYearPicker(false);
              if (date) setSelectedYear(date.getFullYear());
            }}
          />
        )}

        {showYearPicker && Platform.OS === "ios" && (
          <Modal visible transparent animationType="slide">
            <Pressable
              style={styles.monthPickerOverlay}
              onPress={() => setShowYearPicker(false)}
            >
              <Pressable
                style={styles.monthPickerContent}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.monthPickerHeader}>
                  <Text style={styles.monthPickerTitle}>Select year</Text>
                  <Pressable onPress={() => setShowYearPicker(false)} hitSlop={16}>
                    <RNText style={styles.monthPickerDoneText}>Done</RNText>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={pickerDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => {
                    if (date) setSelectedYear(date.getFullYear());
                  }}
                />
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </View>

      <FlatList
        data={expenses ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const receiptFullUri = item.receiptUrl
            ? item.receiptUrl.startsWith("http")
              ? item.receiptUrl
              : `${API_URL}${item.receiptUrl}`
            : null;
          return (
            <RNView style={styles.item}>
              {item.receiptUrl ? (
                <PhotoWithTooltip
                  uri={receiptFullUri!}
                  style={styles.itemThumbnailWrap}
                  imageStyle={styles.itemThumbnail}
                  tooltipText="Click to view full size"
                  onPress={() => setPhotoModalUri(receiptFullUri!)}
                />
              ) : (
                <RNView style={styles.itemThumbnailWrap}>
                  <RNView style={styles.itemThumbnailPlaceholder}>
                    <SymbolView
                      name={{
                        ios: "photo.badge.xmark",
                        android: "image_not_supported",
                        web: "image_not_supported",
                      }}
                      tintColor="#b91c1c"
                      size={24}
                    />
                  </RNView>
                </RNView>
              )}
              <Pressable
                style={styles.itemMain}
                onPress={() => router.push(`/expense/${item.id}`)}
              >
                <Text style={styles.itemAmount}>{formatAmount(item.amount)}</Text>
                {item.description && (
                  <Text style={styles.itemDesc}>{item.description}</Text>
                )}
                {item.category && (
                  <Text style={styles.itemCategory}>{item.category.name}</Text>
                )}
                <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
              </Pressable>
              <Pressable
                style={styles.itemDeleteBtn}
                onPress={() => handleDeletePress(item)}
                hitSlop={12}
              >
                <SymbolView
                  name={{
                    ios: "trash",
                    android: "delete",
                    web: "delete",
                  }}
                  tintColor="#b91c1c"
                  size={22}
                />
              </Pressable>
            </RNView>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No expenses yet. Tap "Add" to log one.
          </Text>
        }
      />
      {deleteConfirmExpense ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={handleDeleteCancel}
        >
          <RNView style={styles.confirmOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleDeleteCancel} />
            <Pressable style={styles.confirmCard} onPress={() => {}}>
              <RNText style={styles.confirmTitle}>Delete expense?</RNText>
              <RNText style={styles.confirmMessage}>
                {`Remove "${deleteConfirmExpense.description || formatAmount(deleteConfirmExpense.amount)}"${deleteConfirmExpense.category ? ` (${deleteConfirmExpense.category.name})` : ""}? This cannot be undone.`}
              </RNText>
              <RNView style={styles.confirmButtons}>
                <Pressable style={styles.confirmCancelBtn} onPress={handleDeleteCancel}>
                  <RNText style={styles.confirmCancelText}>Cancel</RNText>
                </Pressable>
                <Pressable
                  style={[styles.confirmDeleteBtn, deleteMutation.isPending && styles.confirmBtnDisabled]}
                  onPress={handleDeleteConfirm}
                  disabled={deleteMutation.isPending}
                >
                  <RNText style={styles.confirmDeleteText}>
                    {deleteMutation.isPending ? "Deleting…" : "Delete"}
                  </RNText>
                </Pressable>
              </RNView>
            </Pressable>
          </RNView>
        </Modal>
      ) : null}
      {photoModalUri ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setPhotoModalUri(null)}
        >
          <Pressable
            style={styles.photoModalOverlay}
            onPress={() => setPhotoModalUri(null)}
          >
            <RNView style={styles.photoModalContent}>
              <Image
                source={{ uri: photoModalUri }}
                style={styles.photoModalImage}
                resizeMode="contain"
              />
            </RNView>
            <Pressable
              style={styles.photoModalClose}
              onPress={() => setPhotoModalUri(null)}
            >
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
  selectorCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectorLabel: { fontSize: 14, fontWeight: "600", marginBottom: 12, color: "#64748b" },
  selectorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthNavBtn: { padding: 8 },
  monthDisplay: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  monthDisplayText: { fontSize: 18, fontWeight: "600" },
  pickMonthBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#eef2ff",
  },
  pickMonthBtnText: { fontSize: 14, fontWeight: "600", color: "#6366f1" },
  monthPickerContainer: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden" as const,
  },
  monthPickerDoneBtn: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: "center" as const,
  },
  monthPickerDoneText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#6366f1",
  },
  monthPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  monthPickerContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  monthPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  monthPickerTitle: { fontSize: 17, fontWeight: "600" },
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
  itemThumbnailWrap: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  itemThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  itemThumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#fecaca",
    alignItems: "center",
    justifyContent: "center",
  },
  itemMain: { flex: 1 },
  itemDeleteBtn: {
    padding: 8,
    marginLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },
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
  photoModalContent: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
  },
  photoModalImage: {
    width: "100%",
    height: "100%",
  },
  photoModalClose: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  photoModalCloseInner: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#6366f1",
    borderRadius: 12,
  },
  photoModalCloseText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 16,
    color: "#555",
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  confirmCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  confirmDeleteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#b91c1c",
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  error: { color: "#c00", textAlign: "center" },
  hint: { marginTop: 8, color: "#666" },
});
