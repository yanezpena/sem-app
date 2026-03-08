import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SymbolView } from "expo-symbols";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

const isWeb = Platform.OS === "web";

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
  label?: string;
}

export function YearSelector({
  selectedYear,
  onYearChange,
  minYear = 2020,
  maxYear = 2030,
  label = "Select Year",
}: YearSelectorProps) {
  const [showYearPicker, setShowYearPicker] = useState(false);
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme].tint;
  const pickerDate = new Date(selectedYear, 0, 1);

  const handleYearSelect = (year: number) => {
    const clamped = Math.min(maxYear, Math.max(minYear, year));
    onYearChange(clamped);
  };

  return (
    <View style={styles.selectorCard}>
      <Text style={[styles.selectorLabel, { color: Colors[colorScheme].text }]}>{label}</Text>
      <View style={styles.selectorRow}>
        <Pressable
          style={styles.monthNavBtn}
          onPress={() => handleYearSelect(selectedYear - 1)}
          accessibilityLabel="Previous year"
          accessibilityRole="button"
        >
          <SymbolView name="chevron.left" tintColor={tintColor} size={24} />
        </Pressable>
        <Pressable
          style={styles.monthDisplay}
          onPress={() => setShowYearPicker(true)}
          accessibilityLabel={`Selected year: ${selectedYear}. Tap to change`}
          accessibilityRole="button"
        >
          <Text style={[styles.monthDisplayText, { color: Colors[colorScheme].text }]}>{selectedYear}</Text>
          <SymbolView name="chevron.down" tintColor={tintColor} size={14} />
        </Pressable>
        <Pressable
          style={styles.monthNavBtn}
          onPress={() => handleYearSelect(selectedYear + 1)}
          accessibilityLabel="Next year"
          accessibilityRole="button"
        >
          <SymbolView name="chevron.right" tintColor={tintColor} size={24} />
        </Pressable>
      </View>
      <Pressable
        style={[styles.pickMonthBtn, { backgroundColor: "#eef2ff" }]}
        onPress={() => setShowYearPicker(true)}
        accessibilityLabel="Pick year"
        accessibilityRole="button"
      >
        <SymbolView name="calendar" tintColor={tintColor} size={18} />
        <Text style={[styles.pickMonthBtnText, { color: tintColor }]}>Pick year</Text>
      </Pressable>

      {showYearPicker && isWeb && (
        <View style={styles.monthPickerContainer}>
          {React.createElement("input", {
            type: "number",
            min: minYear,
            max: maxYear,
            value: selectedYear,
            onChange: (e: { target: { value: string } }) => {
              const val = parseInt((e.target as HTMLInputElement).value, 10);
              if (!isNaN(val) && val >= minYear && val <= maxYear) {
                handleYearSelect(val);
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
          <Pressable style={styles.monthPickerDoneBtn} onPress={() => setShowYearPicker(false)}>
            <Text style={styles.monthPickerDoneText}>Done</Text>
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
            if (date) handleYearSelect(date.getFullYear());
          }}
        />
      )}

      {showYearPicker && Platform.OS === "ios" && (
        <Modal visible transparent animationType="slide">
          <Pressable style={styles.monthPickerOverlay} onPress={() => setShowYearPicker(false)}>
            <Pressable style={styles.monthPickerContent} onPress={(e) => e.stopPropagation()}>
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
                  if (date) handleYearSelect(date.getFullYear());
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  selectorCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectorLabel: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
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
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pickMonthBtnText: { fontSize: 14, fontWeight: "600" },
  monthPickerContainer: {
    marginTop: 12,
    backgroundColor: "#ffffff",
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
    backgroundColor: "#ffffff",
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
});
