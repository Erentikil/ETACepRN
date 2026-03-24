import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { paraTL, miktarFormat } from '../utils/format';

interface SonEklenenItem {
  stokKodu: string;
  stokCinsi: string;
  miktar: number;
  birim: string;
  tutar: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onBarkodOkut: (barkod: string) => void;
  sonEklenen?: SonEklenenItem | null;
  miktarliGiris: boolean;
  onMiktarliGirisDegistir: (val: boolean) => void;
}

export default function ElTerminaliModal({
  visible, onClose, onBarkodOkut,
  sonEklenen, miktarliGiris, onMiktarliGirisDegistir,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const [barkod, setBarkod] = useState('');

  useEffect(() => {
    if (visible) {
      setBarkod('');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    const val = barkod.trim();
    if (!val) return;
    onBarkodOkut(val);
    setBarkod('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [barkod, onBarkodOkut]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <View style={styles.container}>
        {/* Başlık */}
        <View style={styles.header}>
          <Ionicons name="phone-portrait-outline" size={20} color={Colors.white} />
          <Text style={styles.baslik}>El Terminali</Text>
          <TouchableOpacity style={styles.kapatBtn} onPress={onClose}>
            <Ionicons name="close" size={26} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Miktarlı giriş toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Miktarlı Giriş</Text>
          <Switch
            value={miktarliGiris}
            onValueChange={onMiktarliGirisDegistir}
            trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
            thumbColor={miktarliGiris ? Colors.primary : Colors.gray}
          />
        </View>

        {/* Barkod input + ara butonu */}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Barkod giriniz..."
            placeholderTextColor={Colors.gray}
            value={barkod}
            onChangeText={setBarkod}
            onSubmitEditing={handleSubmit}
            blurOnSubmit={false}
            returnKeyType="search"
            autoFocus
          />
          <TouchableOpacity style={styles.araBtn} onPress={handleSubmit}>
            <Ionicons name="search" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Son eklenen ürün */}
        {sonEklenen ? (
          <View style={styles.sonEklenenKart}>
            <View style={styles.sonEklenenBaslik}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success ?? '#4CAF50'} />
              <Text style={styles.sonEklenenBaslikText}>Son Eklenen</Text>
            </View>
            <Text style={styles.sonEklenenCinsi} numberOfLines={2}>{sonEklenen.stokCinsi}</Text>
            <Text style={styles.sonEklenenKodu}>{sonEklenen.stokKodu}</Text>
            <View style={styles.sonEklenenAlt}>
              <Text style={styles.sonEklenenMiktar}>{miktarFormat(sonEklenen.miktar)} {sonEklenen.birim}</Text>
              <Text style={styles.sonEklenenFiyat}>{paraTL(sonEklenen.tutar)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.bosState}>
            <Ionicons name="scan-outline" size={48} color={Colors.gray} />
            <Text style={styles.bosText}>Barkod okutarak ürün ekleyin</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray ?? '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    gap: 10,
  },
  baslik: {
    flex: 1,
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  kapatBtn: {
    padding: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  araBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 12,
  },
  sonEklenenKart: {
    backgroundColor: Colors.white,
    marginHorizontal: 12,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sonEklenenBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sonEklenenBaslikText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success ?? '#4CAF50',
  },
  sonEklenenCinsi: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  sonEklenenKodu: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  sonEklenenAlt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sonEklenenMiktar: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  sonEklenenFiyat: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  bosState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bosText: {
    fontSize: 15,
    color: Colors.gray,
  },
});
