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
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import { SymbolView } from "expo-symbols";

import { useAuth } from "@/contexts/AuthContext";
import { fetchExpenses, fetchCategories } from "@/lib/api";
import type { Expense } from "shared";

function getYearRange(year: number) {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  const isWeb = Platform.OS === "web";
  const pickerDate = new Date(selectedYear, 0, 1);

  const { startDate, endDate } = getYearRange(selectedYear);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", "report", startDate, endDate],
    queryFn: () => fetchExpenses(token!, { startDate, endDate }),
    enabled: !!user && !!token,
  });

  const { data: categoriesList = [] } = useQuery({
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
    const rows: string[][] = [];
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Expenses by Month & Category</Text>

      {/* Year selector */}
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

        {/* Web: HTML5 number input for year */}
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
              <Text style={styles.monthPickerDoneText}>Done</Text>
            </Pressable>
          </View>
        )}

        {/* Android: native date picker */}
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

        {/* iOS: spinner in modal */}
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
                    <Text style={styles.monthPickerDoneText}>Done</Text>
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

      {isLoading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{selectedYear}</Text>
            <Text style={styles.summaryTotal}>
              {formatAmount(matrix.grandTotal)}
            </Text>
            <Text style={styles.summaryCount}>
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {matrix.categories.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total by Category</Text>
              {matrix.categories
                .map((cat, i) => ({ name: cat, amount: matrix.colTotals[i] }))
                .sort((a, b) => b.amount - a.amount)
                .map(({ name, amount }) => (
                  <View key={name} style={styles.categoryRow}>
                    <Text style={styles.categoryName}>{name}</Text>
                    <Text style={styles.categoryAmount}>
                      {formatAmount(amount)}
                    </Text>
                  </View>
                ))}
            </View>
          )}

          {/* Export buttons */}
          <View style={styles.exportSection}>
            <Text style={styles.exportTitle}>Download</Text>
            <View style={styles.exportButtons}>
              <Pressable
                style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
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
                style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
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
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  selectorCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
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
  loader: { marginTop: 48 },
  summaryCard: {
    backgroundColor: "#eef2ff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  summaryTitle: { fontSize: 14, fontWeight: "600", color: "#6366f1", marginBottom: 4 },
  summaryTotal: { fontSize: 28, fontWeight: "700" },
  summaryCount: { fontSize: 14, color: "#64748b", marginTop: 4 },
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#64748b", marginBottom: 12 },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  categoryName: { fontSize: 15, fontWeight: "500" },
  categoryAmount: { fontSize: 15, fontWeight: "600" },
  exportSection: { marginTop: 8 },
  exportTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12, color: "#64748b" },
  exportButtons: { flexDirection: "row", gap: 12 },
  exportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    borderRadius: 12,
  },
  exportBtnDisabled: { opacity: 0.7 },
  exportBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
