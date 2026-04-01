import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useColors } from '../contexts/ThemeContext';

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
  const Colors = useColors();
  const isPrimary = variant === 'primary';
  const isAccent = variant === 'accent';

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        isPrimary && { backgroundColor: Colors.primary },
        isAccent && { backgroundColor: Colors.accent },
        !isPrimary && !isAccent && { backgroundColor: 'transparent', borderWidth: 2, borderColor: Colors.primary },
        (disabled || yukleniyor) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || yukleniyor}
      activeOpacity={0.8}
    >
      {yukleniyor ? (
        <ActivityIndicator color={isPrimary || isAccent ? '#fff' : Colors.primary} />
      ) : (
        <Text
          style={[
            styles.text,
            !isPrimary && !isAccent && { color: Colors.primary },
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
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
