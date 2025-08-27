// components/PressableScale.js
import React, { memo, useEffect, useRef } from 'react';
import { Pressable, Animated, AccessibilityInfo, Platform, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

const withOpacity = (hexOrRgb, opacity = 1) => {
  if (typeof hexOrRgb !== 'string') return `rgba(255,255,255,${opacity})`;
  if (hexOrRgb.startsWith('rgba')) return hexOrRgb.replace(/rgba\(([^)]+)\)/, `rgba($1, ${opacity})`);
  if (hexOrRgb.startsWith('#')) {
    const c = hexOrRgb.replace('#','');
    const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return hexOrRgb;
};

/**
 * Props:
 * - onDark:  true se o botão estiver sobre fundo escuro → ripple claro
 * - rounded: raio do recorte (default 12)
 * - rippleColor / rippleRadius: opcionais para personalizar
 */
function PressableScale({
  children,
  onPress,
  style,
  disabled,
  min = 0.98,
  max = 1.0,
  hitSlop = { top: 8, bottom: 8, left: 8, right: 8 },
  accessibilityLabel,
  onDark = false,
  rounded = 12,
  rippleColor,
  rippleRadius,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const overlay = useRef(new Animated.Value(0)).current; // highlight iOS
  const reduce = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(v => (reduce.current = !!v));
  }, []);

  const pressIn = () => {
    if (!reduce.current) Animated.timing(scale, { toValue: min, duration: 90, useNativeDriver: true }).start();
    if (Platform.OS === 'ios') Animated.timing(overlay, { toValue: 1, duration: 90, useNativeDriver: true }).start();
  };

  const pressOut = () => {
    if (!reduce.current) Animated.spring(scale, { toValue: max, useNativeDriver: true, friction: 6, tension: 140 }).start();
    if (Platform.OS === 'ios') Animated.timing(overlay, { toValue: 0, duration: 160, useNativeDriver: true }).start();
  };

  const handlePress = async (e) => {
    if (disabled) return;
    const sr = await AccessibilityInfo.isScreenReaderEnabled?.();
    if (!sr) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  const ripple = rippleColor ?? (onDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)');

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={handlePress}
      hitSlop={hitSlop}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: ripple, radius: rippleRadius, borderless: false }}
      // Clip perfeito do ripple
      style={[{ overflow: 'hidden', borderRadius: rounded }, style]}
      {...rest}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
        {/* highlight suave iOS */}
        {Platform.OS === 'ios' ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: onDark ? withOpacity('#fff', 0.08) : withOpacity('#000', 0.06), opacity: overlay },
            ]}
          />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export default memo(PressableScale);
