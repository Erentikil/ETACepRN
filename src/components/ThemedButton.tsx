import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Colors } from '../constants/Colors';

interface Props {
  baslik: string;
  onPress: () => void;
  yukleniyor?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outlined' | 'accent';
  style?: ViewStyle;
}

export default function ThemedButton({
  baslik,
  onPress,
  yukleniyor = false,
  disabled = false,
  variant = 'primary',
  style,
}: Props) {
  const isPrimary = variant === 'primary';
  const isAccent = variant === 'accent';

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        isPrimary && styles.primary,
        isAccent && styles.accent,
        !isPrimary && !isAccent && styles.outlined,
        (disabled || yukleniyor) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || yukleniyor}
      activeOpacity={0.8}
    >
      {yukleniyor ? (
        <ActivityIndicator color={isPrimary || isAccent ? Colors.white : Colors.primary} />
      ) : (
        <Text
          style={[
            styles.text,
            !isPrimary && !isAccent && styles.outlinedText,
          ]}
        >
          {baslik}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  accent: {
    backgroundColor: Colors.accent,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  outlinedText: {
    color: Colors.primary,
  },
});
