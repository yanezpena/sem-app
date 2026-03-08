import React, { useState, useEffect } from "react";
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

const isWeb = Platform.OS === "web";
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SymbolView } from "expo-symbols";

import { Text as ThemedText } from "@/components/Themed";
import { PhotoWithTooltip } from "@/components/PhotoWithTooltip";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchExpense,
  updateExpense,
  deleteExpense,
  fetchCategories,
  uploadReceipt,
} from "@/lib/api";
import type { UpdateExpenseDto } from "shared";

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [photoModalUri, setPhotoModalUri] = useState<string | null>(null);

  const { data: expense, isLoading: expenseLoading } = useQuery({
    queryKey: ["expense", id],
    queryFn: () => fetchExpense(token!, id!),
    enabled: !!user && !!token && !!id,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(token!),
    enabled: !!user && !!token,
  });

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setNote(expense.description ?? "");
      setCategoryId(expense.categoryId ?? null);
      setDate(new Date(expense.date));
      setReceiptUrl(expense.receiptUrl ?? null);
    }
  }, [expense]);

  const uploadMutation = useMutation({
    mutationFn: ({ uri, fileName }: { uri: string; fileName?: string }) =>
      uploadReceipt(token!, uri, fileName),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateExpenseDto) => updateExpense(token!, id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense", id] });
      router.back();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteExpense(token!, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      router.replace("/(drawer)/(tabs)");
    },
  });

  const pickImage = async (useCamera: boolean) => {
    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera/photo access is required.");
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.uri;
      setReceiptUri(uri);
      const fileName = asset.fileName ?? (asset.uri?.split("/").pop()?.split("?")[0]) ?? "receipt.jpg";
      uploadMutation.mutate(
        { uri, fileName },
        {
          onSuccess: (data) => setReceiptUrl(data.url),
          onError: () => setReceiptUri(null),
        }
      );
    }
  };

  const handleUpdate = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    if (!categoryId) return;
    if (!date || isNaN(date.getTime())) return;
    const desc = note.trim() || categories.find((c) => c.id === categoryId)?.name;
    updateMutation.mutate({
      amount: num,
      description: desc ?? undefined,
      categoryId,
      date: date.toISOString().split("T")[0],
      receiptUrl: receiptUrl ?? null,
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (!user) return null;
  if (!id) {
    router.replace("/(drawer)/(tabs)");
    return null;
  }
  if (expenseLoading || !expense) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const amountNum = parseFloat(amount);
  const hasValidDate = date && !isNaN(date.getTime());
  const isValid = !isNaN(amountNum) && amountNum > 0 && !!categoryId && hasValidDate;
  const isMutating = updateMutation.isPending || deleteMutation.isPending || uploadMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.screenTitle}>Edit Expense</ThemedText>
        <ThemedText style={styles.screenSubtitle}>
          Amount, date, and category required. Notes and receipt optional.
        </ThemedText>

        {/* Receipt Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="camera" tintColor="#6366f1" size={20} />
            <ThemedText style={styles.cardTitle}>Receipt (optional)</ThemedText>
          </View>
          {receiptUri || receiptUrl ? (
            <View style={styles.receiptPreview}>
              <PhotoWithTooltip
                uri={
                  receiptUri
                    ? receiptUri
                    : receiptUrl!.startsWith("http")
                      ? receiptUrl!
                      : `${API_URL}${receiptUrl}`
                }
                style={{ width: "100%" }}
                imageStyle={styles.receiptImage}
                tooltipText="Click to view full size"
                onPress={() => {
                  const uri = receiptUri
                    ? receiptUri
                    : receiptUrl!.startsWith("http")
                      ? receiptUrl!
                      : `${API_URL}${receiptUrl}`;
                  setPhotoModalUri(uri);
                }}
              />
              {uploadMutation.isPending ? (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              ) : (
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => {
                    setReceiptUri(null);
                    setReceiptUrl(null);
                  }}
                >
                  <RNText style={styles.removeBtnText}>Remove</RNText>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.receiptButtons}>
              <Pressable style={styles.receiptBtn} onPress={() => pickImage(true)}>
                <SymbolView name="camera.fill" tintColor="#6366f1" size={28} />
                <RNText style={styles.receiptBtnText}>Take Photo</RNText>
              </Pressable>
              <Pressable style={styles.receiptBtn} onPress={() => pickImage(false)}>
                <SymbolView name="photo" tintColor="#6366f1" size={28} />
                <RNText style={styles.receiptBtnText}>Upload</RNText>
              </Pressable>
            </View>
          )}
        </View>

        {/* Amount Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="dollarsign" tintColor="#10b981" size={20} />
            <ThemedText style={styles.cardTitle}>Amount *</ThemedText>
          </View>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Date Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="calendar" tintColor="#f59e0b" size={20} />
            <ThemedText style={styles.cardTitle}>Date *</ThemedText>
          </View>
          <View style={styles.dateRow}>
            <TextInput
              style={styles.dateInput}
              value={date.toISOString().split("T")[0]}
              onChangeText={(text) => {
                const parsed = new Date(text);
                if (!isNaN(parsed.getTime())) setDate(parsed);
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />
            <Pressable
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <SymbolView name="calendar" tintColor="#6366f1" size={20} />
              <RNText style={styles.datePickerBtnText}>Pick</RNText>
            </Pressable>
          </View>
          {showDatePicker && Platform.OS === "android" && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(_, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
          {showDatePicker && isWeb && (
            <View style={styles.webDatePickerContainer}>
              {React.createElement("input", {
                type: "date",
                value: date.toISOString().split("T")[0],
                onChange: (e: { target: { value: string } }) => {
                  const val = (e.target as HTMLInputElement).value;
                  if (val) {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) setDate(d);
                  }
                },
                style: {
                  width: "100%",
                  padding: 16,
                  fontSize: 18,
                  border: "none",
                  outline: "none",
                  boxSizing: "border-box",
                },
              })}
              <Pressable
                style={styles.webDateDoneBtn}
                onPress={() => setShowDatePicker(false)}
              >
                <RNText style={styles.dateModalDone}>Done</RNText>
              </Pressable>
            </View>
          )}
          {showDatePicker && Platform.OS === "ios" && (
            <Modal visible transparent animationType="slide">
              <Pressable
                style={styles.dateModalOverlay}
                onPress={() => setShowDatePicker(false)}
              >
                <Pressable
                  style={styles.dateModalContent}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.dateModalHeader}>
                    <Pressable
                      onPress={() => setShowDatePicker(false)}
                      hitSlop={16}
                    >
                      <RNText style={styles.dateModalDone}>Done</RNText>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="spinner"
                    onChange={(_, selectedDate) => {
                      if (selectedDate) setDate(selectedDate);
                    }}
                  />
                </Pressable>
              </Pressable>
            </Modal>
          )}
        </View>

        {/* Note Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="note.text" tintColor="#8b5cf6" size={20} />
            <ThemedText style={styles.cardTitle}>Note (optional)</ThemedText>
          </View>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Any additional information"
            placeholderTextColor="#94a3b8"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* Category Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SymbolView name="tag" tintColor="#ec4899" size={20} />
            <ThemedText style={styles.cardTitle}>Category *</ThemedText>
          </View>
          {categoriesLoading ? (
            <ActivityIndicator size="small" />
          ) : (
            <View style={styles.categoryRow}>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    categoryId === cat.id && styles.categoryChipSelected,
                  ]}
                  onPress={() =>
                    setCategoryId(categoryId === cat.id ? null : cat.id)
                  }
                >
                  <RNText
                    style={
                      categoryId === cat.id
                        ? styles.categoryChipTextSelected
                        : styles.categoryChipText
                    }
                  >
                    {cat.name}
                  </RNText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {(updateMutation.isError || uploadMutation.isError) && (
          <ThemedText style={styles.error}>
            {(updateMutation.error ?? uploadMutation.error) instanceof Error
              ? (updateMutation.error ?? uploadMutation.error)!.message
              : "Something went wrong"}
          </ThemedText>
        )}

        <Pressable
          style={[
            styles.submitBtn,
            (!isValid || isMutating) && styles.submitBtnDisabled,
          ]}
          onPress={handleUpdate}
          disabled={!isValid || isMutating}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <SymbolView name="checkmark.circle.fill" tintColor="#fff" size={22} />
              <RNText style={styles.submitBtnText}>Save changes</RNText>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.deleteBtn, isMutating && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={isMutating}
        >
          <SymbolView name="trash" tintColor="#fff" size={20} />
          <RNText style={styles.deleteBtnText}>Delete expense</RNText>
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
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
            <View style={styles.photoModalContent}>
              <Image
                source={{ uri: photoModalUri }}
                style={styles.photoModalImage}
                resizeMode="contain"
              />
            </View>
            <Pressable
              style={styles.photoModalClose}
              onPress={() => setPhotoModalUri(null)}
            >
              <View style={styles.photoModalCloseInner}>
                <RNText style={styles.photoModalCloseText}>Close</RNText>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, paddingTop: 8 },
  screenTitle: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  screenSubtitle: { fontSize: 15, color: "#64748b", marginBottom: 24 },
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#475569" },
  receiptPreview: { position: "relative" },
  receiptImage: { width: "100%", height: 180, borderRadius: 12 },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
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
    position: "absolute" as const,
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center" as const,
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
  receiptButtons: { flexDirection: "row", gap: 12 },
  receiptBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    gap: 8,
  },
  receiptBtnText: { fontSize: 14, fontWeight: "600", color: "#6366f1" },
  amountInput: {
    fontSize: 28,
    fontWeight: "700",
    padding: 4,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#eef2ff",
  },
  datePickerBtnText: { fontSize: 14, fontWeight: "600", color: "#6366f1" },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dateModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  dateModalDone: { fontSize: 17, fontWeight: "600", color: "#6366f1" },
  webDatePickerContainer: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden" as const,
  },
  webDateDoneBtn: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: "center" as const,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  noteInput: { minHeight: 80, textAlignVertical: "top" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  categoryChipSelected: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  categoryChipText: { fontSize: 14, fontWeight: "500", color: "#475569" },
  categoryChipTextSelected: { fontSize: 14, fontWeight: "600", color: "#fff" },
  error: { color: "#dc2626", marginBottom: 16, fontSize: 14 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: "#94a3b8", opacity: 0.7 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#dc2626",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
  },
  deleteBtnDisabled: { opacity: 0.7 },
  deleteBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
