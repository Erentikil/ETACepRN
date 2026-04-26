import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../contexts/ThemeContext';
import { useT } from '../i18n/I18nContext';
import type { BarkodBilgileri, StokListesiBilgileri } from '../models';

interface Props {
  visible: boolean;
  stok: StokListesiBilgileri | null;
  barkodListesi: BarkodBilgileri[];
  stokListesi: StokListesiBilgileri[];
  onSelect: (variant: BarkodBilgileri) => void;
  onClose: () => void;
}

export default function RenkBedenSecimModal({
  visible,
  stok,
  barkodListesi,
  stokListesi,
  onSelect,
  onClose,
}: Props) {
  const Colors = useColors();
  const t = useT();
  const [arama, setArama] = useState('');

  const filtrelenmis = useMemo(() => {
    if (!stok) return [];

    // Barkod listesindeki varyantlar
    const barkodVariantlari = barkodListesi.filter(
      (b) => b.stokKodu === stok.stokKodu
    );

    // Stok listesindeki ayni stokKodu'na sahip kayitlar (farkli barkod = farkli varyant)
    const stokVariantlari = stokListesi.filter(
      (s) => s.stokKodu === stok.stokKodu
    );

    // Barkod bazli dedup -- barkodListesi'nde zaten olan barkodlari ekleme
    const mevcutBarkodlar = new Set(
      barkodVariantlari.map((b) => b.barkod)
    );

    const stoktenEklenen: BarkodBilgileri[] = stokVariantlari
      .filter((s) => s.barkod && !mevcutBarkodlar.has(s.barkod))
      .map((s) => ({
        barkod: s.barkod,
        stokKodu: s.stokKodu,
        birim: s.birim,
        renkKodu: s.renkKodu,
        bedenKodu: s.bedenKodu,
        renk: s.renk || '',
        beden: s.beden || '',
        katsayi: s.carpan || 1,
      }));

    const tumVariantlar = [...barkodVariantlari, ...stoktenEklenen];

    if (!arama.trim()) return tumVariantlar;
    const q = arama.toLowerCase();
    return tumVariantlar.filter(
      (b) =>
        b.renk.toLowerCase().includes(q) ||
        b.beden.toLowerCase().includes(q) ||
        String(b.renkKodu).includes(q) ||
        String(b.bedenKodu).includes(q) ||
        b.barkod.toLowerCase().includes(q)
    );
  }, [stok, barkodListesi, stokListesi, arama]);

  const handleClose = () => {
    setArama('');
    onClose();
  };

  const handleSelect = (item: BarkodBilgileri) => {
    setArama('');
    onSelect(item);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { backgroundColor: Colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: Colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.baslik, { color: Colors.primary }]}>{t('modal.renkBedenSecimi')}</Text>
              {stok && (
                <Text style={[styles.stokBilgi, { color: Colors.textSecondary }]} numberOfLines={1}>
                  {stok.stokKodu} - {stok.stokCinsi}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Arama */}
          <View style={[styles.aramaRow, { backgroundColor: Colors.inputBackground }]}>
            <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
            <TextInput
              style={[styles.aramaInput, { color: Colors.black }]}
              placeholder={t('modal.renkBedenAra')}
              placeholderTextColor={Colors.textSecondary}
              value={arama}
              onChangeText={setArama}
              returnKeyType="search"
            />
            {arama.length > 0 && (
              <TouchableOpacity onPress={() => setArama('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Baslik satiri */}
          <View style={[styles.listeBaslik, { backgroundColor: Colors.primary }]}>
            <Text style={[styles.baslikText, { flex: 1.5 }]}>{t('modal.renk')}</Text>
            <Text style={[styles.baslikText, { flex: 1 }]}>{t('modal.beden')}</Text>
            <Text style={[styles.baslikText, { flex: 2, textAlign: 'right' }]}>{t('modal.barkod')}</Text>
          </View>

          {/* Liste */}
          <FlatList
            data={filtrelenmis}
            keyExtractor={(item, idx) => `${item.barkod}-${idx}`}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.satir} onPress={() => handleSelect(item)}>
                <View style={{ flex: 1.5 }}>
                  <Text style={[styles.renkKodu, { color: Colors.primary }]}>
                    {item.renkKodu > 0 ? `${item.renkKodu}-${item.renk}` : '-'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bedenKodu, { color: Colors.text }]}>
                    {item.bedenKodu > 0 ? `${item.bedenKodu}-${item.beden}` : '-'}
                  </Text>
                </View>
                <Text style={[styles.barkodText, { flex: 2, textAlign: 'right', color: Colors.textSecondary }]} numberOfLines={1}>
                  {item.barkod}
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={[styles.ayirac, { backgroundColor: Colors.border }]} />}
            style={styles.liste}
            ListEmptyComponent={
              <View style={styles.bosListe}>
                <Ionicons name="color-palette-outline" size={40} color={Colors.border} />
                <Text style={[styles.bosMetin, { color: Colors.textSecondary }]}>{t('modal.renkBedenYok')}</Text>
              </View>
            }
          />

          {/* Alt bilgi */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: Colors.textSecondary }]}>
              {filtrelenmis.length} varyant
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  baslik: {
    fontSize: 17,
    fontWeight: '700',
  },
  stokBilgi: {
    fontSize: 12,
    marginTop: 2,
  },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  aramaInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 2,
  },
  listeBaslik: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 12,
    borderRadius: 6,
  },
  baslikText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  liste: {
    paddingHorizontal: 12,
    marginTop: 4,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  renkKodu: {
    fontSize: 14,
    fontWeight: '600',
  },
  bedenKodu: {
    fontSize: 14,
    fontWeight: '600',
  },
  barkodText: {
    fontSize: 12,
  },
  ayirac: {
    height: 1,
  },
  bosListe: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 10,
  },
  bosMetin: {
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
