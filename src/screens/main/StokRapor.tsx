import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { toast } from '../../components/Toast';
import { useAppStore } from '../../store/appStore';
import { stokListesiniAl } from '../../api/hizliIslemlerApi';
import { useColors } from '../../contexts/ThemeContext';
import type { StokListesiBilgileri } from '../../models';
import type { DrawerParamList } from '../../navigation/types';
import EmptyState from '../../components/EmptyState';

type RoutePropType = RouteProp<DrawerParamList, 'StokRapor'>;

function f(n: number) {
  return (n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StokRapor() {
  const Colors = useColors();
  const route = useRoute<RoutePropType>();
  const { calisilanSirket, yetkiBilgileri } = useAppStore();
  const mod = route.params?.mod ?? 'bakiye';

  const [liste, setListe] = useState<StokListesiBilgileri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [arama, setArama] = useState('');

  useEffect(() => {
    if (!calisilanSirket) return;
    (async () => {
      try {
        const sonuc = await stokListesiniAl(
          yetkiBilgileri?.kullaniciKodu ?? '',
          calisilanSirket
        );
        if (sonuc.sonuc) {
          setListe(sonuc.data ?? []);
        } else {
          toast.error(sonuc.mesaj || 'Stok listesi alınamadı.');
        }
      } catch (err: any) {
        toast.error(err.message || 'Stok listesi yüklenirken hata oluştu.');
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [calisilanSirket]);

  const filtreli = useMemo(() => {
    const q = arama.toLowerCase().trim();
    if (!q) return liste;
    return liste.filter(
      (s) =>
        s.stokKodu.toLowerCase().includes(q) ||
        s.stokCinsi.toLowerCase().includes(q) ||
        s.barkod.toLowerCase().includes(q)
    );
  }, [arama, liste]);

  if (yukleniyor) {
    return (
      <View style={[styles.merkez, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.yukleniyorText, { color: Colors.textSecondary }]}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* Arama */}
      <View style={[styles.aramaRow, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
        <TextInput
          style={[styles.aramaInput, { color: Colors.text }]}
          placeholder="Stok kodu, cinsi veya barkod ara..."
          placeholderTextColor={Colors.textSecondary}
          value={arama}
          onChangeText={setArama}
        />
        {arama.length > 0 && (
          <TouchableOpacity onPress={() => setArama('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Başlık */}
      <View style={[styles.baslikRow, { backgroundColor: Colors.primary }]}>
        <Text style={[styles.baslikText, { flex: 3 }]}>Stok</Text>
        <Text style={[styles.baslikText, { flex: 1, textAlign: 'center' }]}>Birim</Text>
        <Text style={[styles.baslikText, { flex: 1.5, textAlign: 'right' }]}>
          {mod === 'bakiye' ? 'Bakiye' : 'Fiyat'}
        </Text>
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(item) => item.stokKodu}
        renderItem={({ item }) => (
          <View style={[styles.satir, { backgroundColor: Colors.card }]}>
            <View style={{ flex: 3 }}>
              <Text style={[styles.stokKodu, { color: Colors.primary }]}>{item.stokKodu}</Text>
              <Text style={[styles.stokCinsi, { color: Colors.textSecondary }]} numberOfLines={1}>{item.stokCinsi}</Text>
            </View>
            <Text style={[styles.birim, { flex: 1, textAlign: 'center', color: Colors.textSecondary }]}>{item.birim}</Text>
            <Text
              style={[
                styles.deger,
                { flex: 1.5, textAlign: 'right', color: Colors.primary },
                mod === 'fiyat' && { color: Colors.error },
              ]}
            >
              {mod === 'bakiye' ? f(item.bakiye ?? 0) : f(item.fiyat ?? 0)}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={[styles.ayirac, { backgroundColor: Colors.border }]} />}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <EmptyState icon="cube-outline" baslik="Stok bulunamadı" aciklama="Arama kriterlerine uygun stok bulunmamaktadır" />
        }
        ListHeaderComponent={
          <Text style={[styles.sayac, { color: Colors.textSecondary }]}>Toplam {filtreli.length} stok</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  merkez: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20 },
  yukleniyorText: { fontSize: 14 },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  aramaInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  baslikRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  baslikText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sayac: { fontSize: 12, paddingHorizontal: 14, paddingVertical: 6 },
  liste: { paddingBottom: 20 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  stokKodu: { fontSize: 13, fontWeight: '700' },
  stokCinsi: { fontSize: 11, marginTop: 1 },
  birim: { fontSize: 12 },
  deger: { fontSize: 13, fontWeight: '700' },
  ayirac: { height: 1, marginHorizontal: 14 },
});
