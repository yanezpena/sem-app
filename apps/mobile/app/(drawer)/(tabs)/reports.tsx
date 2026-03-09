import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";

const isWeb = Platform.OS === "web";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import { SymbolView } from "expo-symbols";

import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/Colors";
import { Font } from "@/constants/Theme";
import { useColorScheme } from "@/components/useColorScheme";
import { YearSelector } from "@/components/YearSelector";
import { fetchExpenses, fetchCategories } from "@/lib/api";
import { formatAmount, getYearRange, MONTH_NAMES } from "@/lib/formatters";
import type { Expense } from "shared";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type ReportMatrix = {
  categories: string[];
  grid: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
};

function buildMatrix(expenses: Expense[], categoryOrder: string[]): ReportMatrix {
  const catSet = new Set(categoryOrder);
  expenses.forEach((e) => {
    if (e.category?.name) catSet.add(e.category.name);
  });
  const categories = [...catSet];

  const grid: number[][] = Array.from({ length: 12 }, () =>
    Array(categories.length).fill(0)
  );
  const rowTotals = Array(12).fill(0);
  const colTotals = Array(categories.length).fill(0);

  for (const e of expenses) {
    const catName = e.category?.name;
    if (!catName) continue;
    const date = new Date(e.date);
    const monthIdx = date.getMonth();
    const colIdx = categories.indexOf(catName);
    if (colIdx >= 0) {
      grid[monthIdx][colIdx] += e.amount;
      rowTotals[monthIdx] += e.amount;
      colTotals[colIdx] += e.amount;
    }
  }

  const grandTotal = rowTotals.reduce((s, v) => s + v, 0);
  return { categories, grid, rowTotals, colTotals, grandTotal };
}

export default function ReportsScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  const { startDate, endDate } = getYearRange(selectedYear);

  const {
    data: expenses = [],
    isLoading: expensesLoading,
    isError: expensesError,
    error: expensesErr,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ["expenses", "report", startDate, endDate],
    queryFn: () => fetchExpenses(token!, { startDate, endDate }),
    enabled: !!user && !!token,
  });

  const {
    data: categoriesList = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    error: categoriesErr,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(token!),
    enabled: !!user && !!token,
  });

  const categoryOrder = useMemo(
    () => categoriesList.map((c) => c.name),
    [categoriesList]
  );

  const matrix = useMemo(
    () => buildMatrix(expenses, categoryOrder),
    [expenses, categoryOrder]
  );

  const generateMatrixCSV = () => {
    const headers = ["Month", ...matrix.categories, "Total"];
    const rows: string[] = [];
    for (let m = 0; m < 12; m++) {
      const row = [
        MONTH_NAMES[m],
        ...matrix.grid[m].map((v) => (v === 0 ? "" : v.toFixed(2))),
        matrix.rowTotals[m].toFixed(2),
      ];
      rows.push(row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    }
    const totalRow = [
      "Total",
      ...matrix.colTotals.map((v) => (v === 0 ? "" : v.toFixed(2))),
      matrix.grandTotal.toFixed(2),
    ];
    rows.push(totalRow.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    return [headers.join(","), ...rows].join("\n");
  };

  const handleExportCSV = async () => {
    setExporting("csv");
    try {
      const csv = generateMatrixCSV();
      const filename = `expense-matrix-${selectedYear}.csv`;

      if (isWeb && typeof document !== "undefined") {
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const path = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(path, {
            mimeType: "text/csv",
            dialogTitle: "Save expense report",
            UTI: "public.comma-separated-values-text",
          });
        } else {
          Alert.alert("Export complete", `CSV saved to ${path}`);
        }
      }
    } catch (e) {
      Alert.alert("Export failed", (e as Error).message);
    } finally {
      setExporting(null);
    }
  };

  const generateMatrixHTML = () => {
    const headerCells = [
      "<th style='text-align:left;padding:6px 8px'>Month</th>",
      ...matrix.categories.map(
        (c) => `<th style='text-align:right;padding:6px 8px'>${escapeHtml(c)}</th>`
      ),
      "<th style='text-align:right;padding:6px 8px;font-weight:700'>Total</th>",
    ].join("");
    const dataRows = [];
    for (let m = 0; m < 12; m++) {
      const cells = [
        `<td style='font-weight:600'>${MONTH_NAMES[m]}</td>`,
        ...matrix.grid[m].map(
          (v) =>
            `<td style='text-align:right'>${v === 0 ? "-" : escapeHtml(formatAmount(v))}</td>`
        ),
        `<td style='text-align:right;font-weight:600'>${escapeHtml(formatAmount(matrix.rowTotals[m]))}</td>`,
      ];
      dataRows.push(`<tr>${cells.join("")}</tr>`);
    }
    const totalCells = [
      "<td style='font-weight:700'>Total</td>",
      ...matrix.colTotals.map(
        (v) =>
          `<td style='text-align:right;font-weight:600'>${v === 0 ? "-" : escapeHtml(formatAmount(v))}</td>`
      ),
      `<td style='text-align:right;font-weight:700'>${escapeHtml(formatAmount(matrix.grandTotal))}</td>`,
    ];
    dataRows.push(`<tr style='background:#f1f5f9'>${totalCells.join("")}</tr>`);
    return `
      <h2 style='margin-bottom:4px'>Expenses by Month & Category</h2>
      <p style='color:#666;margin-bottom:16px'>${selectedYear}</p>
      <table style='width:100%;border-collapse:collapse;font-size:11px'>
        <thead><tr style='background:#e5e7eb'>${headerCells}</tr></thead>
        <tbody>${dataRows.join("")}</tbody>
      </table>
      <p style='font-weight:700;font-size:14px;margin-top:12px'>Grand Total: ${escapeHtml(formatAmount(matrix.grandTotal))}</p>
    `;
  };

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      const filename = `expense-matrix-${selectedYear}.pdf`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui; padding: 24px; }
            table { border: 1px solid #ddd; }
            th, td { border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1 style="font-size:20px;margin-bottom:8px">Expense Report by Month & Category</h1>
          ${generateMatrixHTML()}
        </body>
        </html>
      `;

      if (isWeb && typeof document !== "undefined") {
        const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js");
        const autoTable = (await import("jspdf-autotable")).default;
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(18);
        doc.text("Expense Report by Month & Category", 14, 20);
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`${selectedYear}`, 14, 28);
        doc.setTextColor(0, 0, 0);
        const headers = ["Month", ...matrix.categories, "Total"];
        const body: string[][] = [];
        for (let m = 0; m < 12; m++) {
          body.push([
            MONTH_NAMES[m],
            ...matrix.grid[m].map((v) => (v === 0 ? "-" : formatAmount(v))),
            formatAmount(matrix.rowTotals[m]),
          ]);
        }
        body.push([
          "Total",
          ...matrix.colTotals.map((v) => (v === 0 ? "-" : formatAmount(v))),
          formatAmount(matrix.grandTotal),
        ]);
        autoTable(doc, {
          head: [headers],
          body,
          startY: 34,
          theme: "grid",
          headStyles: { fillColor: [229, 231, 235], fontStyle: "bold" },
          styles: { fontSize: 9 },
          columnStyles: { 0: { cellWidth: 24 }, [headers.length - 1]: { fontStyle: "bold" } },
          didParseCell: (data) => {
            if (data.row.index === body.length - 1) {
              data.cell.styles.fillColor = [241, 245, 249];
              data.cell.styles.fontStyle = "bold";
            }
          },
        });
        const pdfBlob = doc.output("blob");
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Save expense report",
          });
        } else {
          Alert.alert("Export complete", "PDF saved");
        }
      }
    } catch (e) {
      Alert.alert("Export failed", (e as Error).message);
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const isLoading = expensesLoading || categoriesLoading;
  const hasError = expensesError || categoriesError;
  const errorMsg = expensesErr || categoriesErr;

  if (hasError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>
          {errorMsg instanceof Error ? errorMsg.message : "Could not load report data."}
        </Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => {
            refetchExpenses();
            refetchCategories();
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Expenses by Month & Category</Text>

      <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />

      {isLoading ? (
        <ActivityIndicator size="large" style={styles.loader} color={colors.tint} />
      ) : (
        <>
          <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.tint }]}>
            <Text style={[styles.summaryTitle, { color: colors.tint }]}>{selectedYear}</Text>
            <Text style={[styles.summaryTotal, { color: colors.text }]}>
              {formatAmount(matrix.grandTotal)}
            </Text>
            <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {matrix.categories.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Total by Category</Text>
              {matrix.categories
                .map((cat, i) => ({ name: cat, amount: matrix.colTotals[i] }))
                .sort((a, b) => b.amount - a.amount)
                .map(({ name, amount }) => (
                  <View key={name} style={[styles.categoryRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{name}</Text>
                    <Text style={[styles.categoryAmount, { color: colors.text }]}>{formatAmount(amount)}</Text>
                  </View>
                ))}
            </View>
          )}

          {/* Export buttons */}
          <View style={styles.exportSection}>
            <Text style={[styles.exportTitle, { color: colors.textSecondary }]}>Download</Text>
            <View style={styles.exportButtons}>
              <Pressable
                style={[styles.exportBtn, { backgroundColor: colors.tint }, exporting && styles.exportBtnDisabled]}
                onPress={handleExportPDF}
                disabled={!!exporting}
              >
                {exporting === "pdf" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <SymbolView name="doc.fill" tintColor="#fff" size={22} />
                    <Text style={styles.exportBtnText}>PDF</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.exportBtn, { backgroundColor: colors.tint }, exporting && styles.exportBtnDisabled]}
                onPress={handleExportCSV}
                disabled={!!exporting}
              >
                {exporting === "csv" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <SymbolView name="tablecells" tintColor="#fff" size={22} />
                    <Text style={styles.exportBtnText}>CSV</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View style={{ height: 32 }} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  centered: { justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 24, fontFamily: Font.bold, marginBottom: 20 },
  errorText: { textAlign: "center" },
  retryBtn: { marginTop: 16, padding: 12, borderRadius: 8 },
  retryText: { fontSize: 16, fontFamily: Font.semiBold },
  loader: { marginTop: 48 },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  summaryTitle: { fontSize: 14, fontFamily: Font.semiBold, marginBottom: 4 },
  summaryTotal: { fontSize: 28, fontFamily: Font.bold },
  summaryCount: { fontSize: 14, marginTop: 4 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 14, fontFamily: Font.semiBold, marginBottom: 12 },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  categoryName: { fontSize: 15, fontFamily: Font.medium },
  categoryAmount: { fontSize: 15, fontFamily: Font.semiBold },
  exportSection: { marginTop: 8 },
  exportTitle: { fontSize: 14, fontFamily: Font.semiBold, marginBottom: 12 },
  exportButtons: { flexDirection: "row", gap: 12 },
  exportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exportBtnDisabled: { opacity: 0.7 },
  exportBtnText: { color: "#fff", fontSize: 16, fontFamily: Font.semiBold },
});
