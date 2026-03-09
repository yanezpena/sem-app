import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/Colors";
import { Font } from "@/constants/Theme";
import { useColorScheme } from "@/components/useColorScheme";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import type { Category } from "shared";

type CategoryWithCount = Category & { _count?: { expenses: number } };

export default function CategoriesScreen() {
  const { user, token } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState<"add" | "edit" | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<CategoryWithCount | null>(null);

  const { data: categories = [], isLoading, error, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(token!),
    enabled: !!user && !!token,
  });

  const typedCategories = categories as CategoryWithCount[];

  const createMutation = useMutation({
    mutationFn: (name: string) => createCategory(token!, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setModalOpen(null);
      setNameInput("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCategory(token!, id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setModalOpen(null);
      setEditingCategory(null);
      setNameInput("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteConfirm(null);
    },
    onError: (err: Error) => {
      Alert.alert("Cannot delete", err.message);
    },
  });

  const handleAdd = useCallback(() => {
    setEditingCategory(null);
    setNameInput("");
    setModalOpen("add");
  }, []);

  const handleEdit = useCallback((cat: CategoryWithCount) => {
    setEditingCategory(cat);
    setNameInput(cat.name);
    setModalOpen("edit");
  }, []);

  const handleSaveAdd = useCallback(() => {
    const name = nameInput.trim();
    if (!name) return;
    createMutation.mutate(name);
  }, [nameInput, createMutation]);

  const handleSaveEdit = useCallback(() => {
    const name = nameInput.trim();
    if (!name || !editingCategory) return;
    updateMutation.mutate({ id: editingCategory.id, name });
  }, [nameInput, editingCategory, updateMutation]);

  const handleDeletePress = useCallback((cat: CategoryWithCount) => {
    const count = cat._count?.expenses ?? 0;
    if (count > 0) {
      Alert.alert(
        "Cannot delete",
        `This category is used by ${count} expense${count !== 1 ? "s" : ""}. Remove or change the category from those expenses first.`
      );
      return;
    }
    setDeleteConfirm(cat);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id);
  }, [deleteConfirm, deleteMutation]);

  if (!user) return null;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} accessibilityLabel="Loading categories" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.error, { color: colors.error }]}>
          {error instanceof Error ? error.message : "Could not load categories."}
        </Text>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.surface }]}
          onPress={() => refetch()}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={[styles.retryText, { color: colors.tint }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const renderItem = ({ item }: { item: CategoryWithCount }) => {
    const expenseCount = item._count?.expenses ?? 0;
    const canDelete = expenseCount === 0;

    return (
      <View style={[styles.row, { borderColor: colors.border }]}>
        <View style={styles.rowMain}>
          <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
          {expenseCount > 0 && (
            <Text style={[styles.rowCount, { color: colors.textMuted }]}>
              Used by {expenseCount} expense{expenseCount !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
        <View style={styles.rowActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => handleEdit(item)}
            accessibilityLabel="Edit category"
            accessibilityRole="button"
          >
            <Ionicons name="pencil" size={22} color={colors.tint} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => handleDeletePress(item)}
            accessibilityLabel={canDelete ? "Delete category" : "Category in use, cannot delete"}
            accessibilityRole="button"
          >
            <Ionicons
              name="trash-outline"
              size={22}
              color={canDelete ? colors.error : colors.textMuted}
            />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Categories</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage categories for your expenses. You cannot delete a category that is used by any expense.
        </Text>
      </View>

      <Pressable
        style={[styles.addBtn, { backgroundColor: colors.tint }]}
        onPress={handleAdd}
        accessibilityRole="button"
        accessibilityLabel="Add category"
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addBtnText}>Add category</Text>
      </Pressable>

      <FlatList
        data={typedCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No categories yet. Add one above.
          </Text>
        }
      />

      {/* Add / Edit modal */}
      <Modal
        visible={modalOpen !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalOpen(null)} />
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {modalOpen === "add" ? "New category" : "Edit category"}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Category name"
              placeholderTextColor={colors.textMuted}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              accessibilityLabel="Category name"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]}
                onPress={() => setModalOpen(null)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: colors.tint }]}
                onPress={modalOpen === "add" ? handleSaveAdd : handleSaveEdit}
                disabled={
                  !nameInput.trim() ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                <Text style={styles.modalBtnTextSave}>
                  {modalOpen === "add" ? "Create" : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirm */}
      <Modal
        visible={!!deleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirm(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDeleteConfirm(null)} />
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete category?</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              {deleteConfirm
                ? `"${deleteConfirm.name}" will be removed. This cannot be undone.`
                : ""}
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]}
                onPress={() => setDeleteConfirm(null)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: colors.error }]}
                onPress={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                <Text style={styles.modalBtnTextSave}>
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontFamily: Font.bold, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 8 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontFamily: Font.semiBold },
  listContent: { paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  rowMain: { flex: 1 },
  rowName: { fontSize: 16, fontFamily: Font.medium },
  rowCount: { fontSize: 13, marginTop: 2 },
  rowActions: { flexDirection: "row", gap: 8 },
  iconBtn: { padding: 8 },
  empty: { textAlign: "center", marginTop: 24 },
  error: { textAlign: "center" },
  retryBtn: { marginTop: 16, padding: 12, borderRadius: 8 },
  retryText: { fontSize: 16, fontFamily: Font.semiBold },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontFamily: Font.bold, marginBottom: 16 },
  modalMessage: { fontSize: 16, marginBottom: 24, lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  modalBtnCancel: { borderWidth: 1 },
  modalBtnSave: {},
  modalBtnText: { fontSize: 16, fontFamily: Font.semiBold },
  modalBtnTextSave: { color: "#fff", fontSize: 16, fontFamily: Font.semiBold },
});
