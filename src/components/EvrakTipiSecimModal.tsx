import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../contexts/ThemeContext';

interface Secenek {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  secenekler: Secenek[];
  secilenDeger?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export default function EvrakTipiSecimModal({ visible, secenekler, secilenDeger, onSelect, onClose }: Props) {
  const Colors = useColors();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.kart, { backgroundColor: Colors.card }]}>
          <View style={styles.baslik}>
            <Text style={[styles.baslikMetin, { color: Colors.primary }]}>Evrak Tipi Seçin</Text>
            <TouchableOpacity onPress={onClose} style={styles.kapatBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {secenekler.map((s, i) => {
              const secili = s.value === secilenDeger;
              return (
                <TouchableOpacity
                  key={s.value}
                  style={[
                    styles.satir,
                    { borderColor: Colors.border },
                    i < secenekler.length - 1 && styles.satirAlt,
                    secili && { backgroundColor: Colors.primary + '12' },
                  ]}
                  onPress={() => { onSelect(s.value); onClose(); }}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.satirMetin, { color: secili ? Colors.primary : Colors.text }, secili && { fontWeight: '700' }]}>
                    {s.label}
                  </Text>
                  {secili && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={[styles.vazgecBtn, { borderTopColor: Colors.border }]} onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.vazgecMetin, { color: Colors.textSecondary }]}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  kart: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '75%',
  },
  baslik: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  baslikMetin: {
    fontSize: 17,
    fontWeight: '700',
  },
  kapatBtn: {
    padding: 4,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  satirAlt: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  satirMetin: {
    fontSize: 15,
  },
  vazgecBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  vazgecMetin: {
    fontSize: 15,
    fontWeight: '600',
  },
});
