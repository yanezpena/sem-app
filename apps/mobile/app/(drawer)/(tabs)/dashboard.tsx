import React, { useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { fetchExpenses } from "@/lib/api";
import { formatAmount, getYearRange, MONTH_NAMES } from "@/lib/formatters";
import type { Expense } from "shared";

function monthlyTotals(expenses: Expense[]): number[] {
  const totals = Array(12).fill(0);
  for (const e of expenses) {
    const monthIdx = new Date(e.date).getMonth();
    totals[monthIdx] += e.amount;
  }
  return totals;
}

const CHART_HEIGHT = 160;

function MonthBarChart({
  data,
  maxVal,
  color,
  barWidth,
}: {
  data: number[];
  maxVal: number;
  color: string;
  barWidth: number;
}) {
  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.barsContainer}>
        {MONTH_NAMES.map((label, i) => {
          const rawH = maxVal > 0 ? (data[i] / maxVal) * CHART_HEIGHT : 0;
          const h = data[i] > 0 ? Math.max(rawH, 6) : 0;
          return (
            <View key={label} style={chartStyles.barWrapper}>
              <View
                style={[
                  chartStyles.bar,
                  {
                    height: h,
                    width: Math.max(barWidth - 4, 10),
                    backgroundColor: color,
                  },
                ]}
              />
              <Text style={chartStyles.barLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { paddingHorizontal: 4 },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: CHART_HEIGHT + 36,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 0,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 6,
  },
});

export default function DashboardScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const barWidth = Math.max((width - 56) / 12 - 4, 14);

  const now = new Date();
  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;

  const { startDate: prevStart, endDate: prevEnd } = getYearRange(previousYear);
  const { startDate: currStart, endDate: currEnd } = getYearRange(currentYear);

  const {
    data: prevExpenses = [],
    isLoading: prevLoading,
    isError: prevError,
    error: prevErr,
    refetch: refetchPrev,
  } = useQuery({
    queryKey: ["expenses", "dashboard", prevStart, prevEnd],
    queryFn: () => fetchExpenses(token!, { startDate: prevStart, endDate: prevEnd }),
    enabled: !!user && !!token,
  });

  const {
    data: currExpenses = [],
    isLoading: currLoading,
    isError: currError,
    error: currErr,
    refetch: refetchCurr,
  } = useQuery({
    queryKey: ["expenses", "dashboard", currStart, currEnd],
    queryFn: () => fetchExpenses(token!, { startDate: currStart, endDate: currEnd }),
    enabled: !!user && !!token,
  });

  const prevTotals = useMemo(() => monthlyTotals(prevExpenses), [prevExpenses]);
  const currTotals = useMemo(() => monthlyTotals(currExpenses), [currExpenses]);

  const prevMax = useMemo(
    () => Math.max(...prevTotals, 1),
    [prevTotals]
  );
  const currMax = useMemo(
    () => Math.max(...currTotals, 1),
    [currTotals]
  );

  const prevTotal = useMemo(
    () => prevExpenses.reduce((s, e) => s + e.amount, 0),
    [prevExpenses]
  );
  const currTotal = useMemo(
    () => currExpenses.reduce((s, e) => s + e.amount, 0),
    [currExpenses]
  );

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const isLoading = prevLoading || currLoading;
  const hasError = prevError || currError;
  const errorMsg = prevErr || currErr;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" accessibilityLabel="Loading dashboard" />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {errorMsg instanceof Error ? errorMsg.message : "Could not load dashboard."}
        </Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => {
            refetchPrev();
            refetchCurr();
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
      <Text style={styles.title}>Expense Dashboard</Text>
      <Text style={styles.subtitle}>Monthly totals by year</Text>

      {/* Previous year chart */}
      <View style={[styles.chartCard, styles.chartCardPrev]}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{previousYear}</Text>
          <Text style={[styles.chartTotal, styles.chartTotalPrev]}>{formatAmount(prevTotal)}</Text>
        </View>
        <MonthBarChart
          data={prevTotals}
          maxVal={prevMax}
          color="#64748b"
          barWidth={barWidth}
        />
      </View>

      {/* Current year chart */}
      <View style={[styles.chartCard, styles.chartCardCurr]}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{currentYear}</Text>
          <Text style={styles.chartTotal}>{formatAmount(currTotal)}</Text>
        </View>
        <MonthBarChart
          data={currTotals}
          maxVal={currMax}
          color="#6366f1"
          barWidth={barWidth}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    marginBottom: 24,
  },
  chartCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    boxShadow: [
      { color: "rgba(0, 0, 0, 0.06)", offsetX: 0, offsetY: 2, blurRadius: 12 },
    ],
    elevation: 4,
  },
  chartCardPrev: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chartCardCurr: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
  },
  chartTotal: {
    fontSize: 20,
    fontWeight: "800",
    color: "#6366f1",
  },
  chartTotalPrev: {
    color: "#475569",
  },
  error: { color: "#c00", textAlign: "center" },
  retryBtn: { marginTop: 16, padding: 12, backgroundColor: "#eef2ff", borderRadius: 8 },
  retryText: { color: "#6366f1", fontSize: 16, fontWeight: "600" },
});
