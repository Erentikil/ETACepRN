import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

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
  const [acik, setAcik] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View style={styles.kapsayici}>
      <TouchableOpacity
        style={[styles.trigger, acik && styles.triggerAcik]}
        onPress={() => setAcik((v) => !v)}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.triggerMetin, !selectedLabel && styles.placeholderMetin]}
          numberOfLines={1}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons
          name={acik ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.gray}
        />
      </TouchableOpacity>

      {acik && (
        <View style={styles.liste}>
          <ScrollView
            style={{ maxHeight: maxListHeight }}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={options.length > 5}
          >
            {options.map((opt, i) => {
              const secili = opt.value === value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.secenek,
                    i < options.length - 1 && styles.secenekAyrac,
                    secili && styles.secenekSecili,
                  ]}
                  onPress={() => {
                    onChange(opt.value);
                    setAcik(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[styles.secenekMetin, secili && styles.secenekMetinSecili]}
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
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  triggerAcik: {
    borderColor: Colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  triggerMetin: {
    flex: 1,
    fontSize: 14,
    color: Colors.black,
  },
  placeholderMetin: {
    color: Colors.gray,
  },
  liste: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: Colors.primary,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: Colors.white,
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
  secenekAyrac: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  secenekSecili: {
    backgroundColor: 'rgba(41,53,138,0.06)',
  },
  secenekMetin: {
    flex: 1,
    fontSize: 14,
    color: Colors.darkGray,
  },
  secenekMetinSecili: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
