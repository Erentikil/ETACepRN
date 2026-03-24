import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onBarkodOkut: (barkod: string) => void;
}

export default function ElTerminaliModal({ visible, onClose, onBarkodOkut }: Props) {
  const inputRef = useRef<TextInput>(null);
  const barkodRef = useRef('');

  // Modal açılınca input'a odaklan
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      barkodRef.current = '';
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    const barkod = barkodRef.current.trim();
    if (!barkod) return;
    onBarkodOkut(barkod);
    barkodRef.current = '';
    inputRef.current?.clear();
    // Tekrar odaklan — sonraki okuma için
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [onBarkodOkut]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="#1a1a2e" barStyle="light-content" />
      <View style={styles.container}>
        {/* Başlık */}
        <View style={styles.header}>
          <Ionicons name="phone-portrait-outline" size={24} color={Colors.white} />
          <Text style={styles.baslik}>El Terminali</Text>
          <TouchableOpacity style={styles.kapatBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* İçerik */}
        <View style={styles.icerik}>
          <Ionicons name="scan-outline" size={80} color="rgba(255,255,255,0.15)" />
          <Text style={styles.aciklama}>
            Barkod okutmak için el terminalini kullanın
          </Text>

          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Barkod bekleniyor..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            onChangeText={(text) => { barkodRef.current = text; }}
            onSubmitEditing={handleSubmit}
            blurOnSubmit={false}
            returnKeyType="send"
            autoFocus
            showSoftInputOnFocus={false}
          />

          <Text style={styles.ipucu}>
            Barkod okutulduğunda otomatik olarak işlenecektir
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    gap: 10,
  },
  baslik: {
    flex: 1,
    color: Colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  kapatBtn: {
    padding: 4,
  },
  icerik: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  aciklama: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    color: Colors.white,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ipucu: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    textAlign: 'center',
  },
});
