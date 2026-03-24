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
import { Colors } from '../../constants/Colors';
import type { StokListesiBilgileri } from '../../models';
import type { DrawerParamList } from '../../navigation/types';
import EmptyState from '../../components/EmptyState';

type RoutePropType = RouteProp<DrawerParamList, 'StokRapor'>;

function f(n: number) {
  return (n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StokRapor() {
  const route = useRoute<RoutePropType>();
  const { calisilanSirket, yetkiBilgileri } = useAppStore();
  const mod = route.params?.mod ?? 'bakiye'; // 'bakiye' veya 'fiyat'

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
      <View style={styles.merkez}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.yukleniyorText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Arama */}
      <View style={styles.aramaRow}>
        <Ionicons name="search-outline" size={16} color={Colors.gray} />
        <TextInput
          style={styles.aramaInput}
          placeholder="Stok kodu, cinsi veya barkod ara..."
          placeholderTextColor={Colors.gray}
          value={arama}
          onChangeText={setArama}
        />
        {arama.length > 0 && (
          <TouchableOpacity onPress={() => setArama('')}>
            <Ionicons name="close-circle" size={16} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Başlık */}
      <View style={styles.baslikRow}>
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
          <View style={styles.satir}>
            <View style={{ flex: 3 }}>
              <Text style={styles.stokKodu}>{item.stokKodu}</Text>
              <Text style={styles.stokCinsi} numberOfLines={1}>{item.stokCinsi}</Text>
            </View>
            <Text style={[styles.birim, { flex: 1, textAlign: 'center' }]}>{item.birim}</Text>
            <Text
              style={[
                styles.deger,
                { flex: 1.5, textAlign: 'right' },
                mod === 'fiyat' && styles.fiyatRenk,
              ]}
            >
              {mod === 'bakiye' ? f(item.bakiye ?? 0) : f(item.fiyat ?? 0)}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.ayirac} />}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <EmptyState icon="cube-outline" baslik="Stok bulunamadı" aciklama="Arama kriterlerine uygun stok bulunmamaktadır" />
        }
        ListHeaderComponent={
          <Text style={styles.sayac}>Toplam {filtreli.length} stok</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  merkez: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20 },
  yukleniyorText: { color: Colors.gray, fontSize: 14 },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aramaInput: { flex: 1, fontSize: 14, color: Colors.black, paddingVertical: 2 },
  baslikRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  baslikText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  sayac: { color: Colors.gray, fontSize: 12, paddingHorizontal: 14, paddingVertical: 6 },
  liste: { paddingBottom: 20 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  stokKodu: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  stokCinsi: { fontSize: 11, color: Colors.darkGray, marginTop: 1 },
  birim: { fontSize: 12, color: Colors.gray },
  deger: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  fiyatRenk: { color: Colors.error },
  ayirac: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  bosText: { color: Colors.gray, fontSize: 14 },
});
