import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../contexts/ThemeContext';

interface Secenek {
  label: string;
  value: string;
}

interface Props {
  value: string;
  options: Secenek[];
  placeholder?: string;
  onChange: (value: string) => void;
  maxListHeight?: number;
}

export default function DropdownSecim({
  value,
  options,
  placeholder = 'Seçiniz...',
  onChange,
  maxListHeight = 220,
}: Props) {
  const Colors = useColors();
  const [acik, setAcik] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View style={styles.kapsayici}>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: Colors.border, backgroundColor: Colors.inputBackground }, acik && { borderColor: Colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
        onPress={() => setAcik((v) => !v)}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.triggerMetin, { color: Colors.black }, !selectedLabel && { color: Colors.textSecondary }]}
          numberOfLines={1}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons
          name={acik ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>

      {acik && (
        <View style={[styles.liste, { borderColor: Colors.primary, backgroundColor: Colors.card }]}>
          <ScrollView
            style={{ maxHeight: maxListHeight }}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={options.length > 5}
            nestedScrollEnabled
          >
            {options.map((opt, i) => {
              const secili = opt.value === value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.secenek,
                    i < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
                    secili && styles.secenekSecili,
                  ]}
                  onPress={() => {
                    onChange(opt.value);
                    setAcik(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[styles.secenekMetin, { color: Colors.text }, secili && { color: Colors.primary, fontWeight: '600' }]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                  {secili && (
                    <Ionicons name="checkmark" size={16} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    zIndex: 10,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  triggerMetin: {
    flex: 1,
    fontSize: 14,
  },
  liste: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
  },
  secenek: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  secenekSecili: {
    backgroundColor: 'rgba(41,53,138,0.06)',
  },
  secenekMetin: {
    flex: 1,
    fontSize: 14,
  },
});
