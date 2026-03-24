import React, { useCallback, useImperativeHandle, useRef, useState, forwardRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CONFIG: Record<ToastType, ToastConfig> = {
  success: { color: Colors.success, icon: 'checkmark-circle' },
  error:   { color: Colors.error,   icon: 'close-circle' },
  warning: { color: Colors.accent,  icon: 'warning' },
  info:    { color: Colors.primary, icon: 'information-circle' },
};

interface ToastHandle {
  show: (type: ToastType, message: string, duration?: number) => void;
}

// Module-level ref — allows calling from outside React tree
let globalRef: ToastHandle | null = null;

const ToastInner = forwardRef<ToastHandle>((_, ref) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-150);
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<ToastType>('info');
  const [message, setMessage] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    translateY.value = withTiming(-150, { duration: 250 }, () => {
      runOnJS(setVisible)(false);
    });
  }, []);

  const show = useCallback((t: ToastType, msg: string, duration = 3000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setType(t);
    setMessage(msg);
    setVisible(true);
    translateY.value = -150;
    translateY.value = withTiming(0, { duration: 300 });
    timerRef.current = setTimeout(hide, duration);
  }, [hide]);

  useImperativeHandle(ref, () => ({ show }), [show]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  const cfg = CONFIG[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + 8 },
        animStyle,
      ]}
    >
      <TouchableOpacity
        style={[styles.toast, { backgroundColor: cfg.color }]}
        activeOpacity={0.9}
        onPress={hide}
      >
        <Ionicons name={cfg.icon} size={22} color="#fff" />
        <Text style={styles.message} numberOfLines={3}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

export function ToastProvider() {
  const ref = useRef<ToastHandle>(null);

  useEffect(() => {
    globalRef = ref.current;
    return () => { globalRef = null; };
  });

  return <ToastInner ref={ref} />;
}

export function showToast(type: ToastType, message: string, duration?: number) {
  globalRef?.show(type, message, duration);
}

export const toast = {
  success: (msg: string, duration?: number) => showToast('success', msg, duration),
  error:   (msg: string, duration?: number) => showToast('error', msg, duration),
  warning: (msg: string, duration?: number) => showToast('warning', msg, duration),
  info:    (msg: string, duration?: number) => showToast('info', msg, duration),
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    paddingHorizontal: 12,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
