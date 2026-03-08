import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Pressable,
  Image,
  Text,
  StyleSheet,
  Platform,
  type NativeSyntheticEvent,
} from "react-native";
import { createPortal } from "react-dom";

const isWeb = Platform.OS === "web";
const CURSOR_OFFSET = 8;

interface PhotoWithTooltipProps {
  uri: string;
  style?: object;
  imageStyle?: object;
  tooltipText?: string;
  onPress?: () => void;
  resizeMode?: "cover" | "contain";
}

export function PhotoWithTooltip({
  uri,
  style,
  imageStyle,
  tooltipText = "Click to view full size",
  onPress,
  resizeMode = "cover",
}: PhotoWithTooltipProps) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseMove = (e: NativeSyntheticEvent<{ pageX: number; pageY: number }>) => {
    const { pageX, pageY } = e.nativeEvent;
    setPos({ x: pageX + CURSOR_OFFSET, y: pageY + CURSOR_OFFSET });
  };

  const handleLongPress = () => {
    setHovered(true);
    longPressTimer.current = setTimeout(() => {
      setHovered(false);
      longPressTimer.current = null;
    }, 1500);
  };

  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const showTooltip = hovered;

  return (
    <Pressable
      style={[styles.wrap, style]}
      onPress={onPress}
      onHoverIn={isWeb ? () => setHovered(true) : undefined}
      onHoverOut={isWeb ? () => setHovered(false) : undefined}
      onMouseMove={isWeb ? handleMouseMove : undefined}
      onLongPress={!isWeb ? handleLongPress : undefined}
    >
      <Image
        source={{ uri }}
        style={[styles.image, imageStyle]}
        resizeMode={resizeMode}
      />
      {showTooltip &&
        (isWeb && typeof document !== "undefined"
          ? createPortal(
              <View style={[styles.tooltipFixed, { left: pos.x, top: pos.y }]} pointerEvents="none" collapsable={false}>
                <Text style={styles.tooltipText} numberOfLines={1}>
                  {tooltipText}
                </Text>
              </View>,
              document.body
            )
          : (
              <View style={[styles.tooltipAbove, { pointerEvents: "none" }]}>
                <Text style={styles.tooltipText} numberOfLines={1}>
                  {tooltipText}
                </Text>
              </View>
            ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative" as const,
    overflow: "visible" as const,
  },
  image: { width: "100%", height: "100%" },
  tooltipFixed: {
    position: "fixed" as const,
    zIndex: 9999,
  },
  tooltipAbove: {
    position: "absolute" as const,
    top: -32,
    left: 0,
    right: 0,
    alignItems: "center" as const,
    zIndex: 10,
  },
  tooltipText: {
    backgroundColor: "rgba(0,0,0,0.85)",
    color: "#fff",
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    overflow: "hidden" as const,
  },
});
