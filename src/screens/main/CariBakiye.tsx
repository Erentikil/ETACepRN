import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { toast } from '../../components/Toast';
import { cariListesiniAl } from '../../api/hizliIslemlerApi';
import { Colors } from '../../constants/Colors';
import type { CariKartBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';
import SkeletonLoader from '../../components/SkeletonLoader';

function f(n: number) {
  return (n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CariBakiye() {
  const { calisilanSirket, yetkiBilgileri } = useAppStore();
  const [liste, setListe] = useState<CariKartBilgileri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [arama, setArama] = useState('');

  const veriYukle = async () => {
    setYukleniyor(true);
    try {
      const sonuc = await cariListesiniAl(
        calisilanSirket,
        yetkiBilgileri?.saticiBazliCariKart ?? false,
        yetkiBilgileri?.kullaniciKodu ?? '',
        yetkiBilgileri?.saticiKontrolKolonu ?? ''
      );
      if (sonuc.sonuc) {
        setListe(sonuc.data ?? []);
      } else {
        toast.error(sonuc.mesaj || 'Cari listesi alınamadı.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Cari listesi yüklenirken hata oluştu.');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    veriYukle();
  }, [calisilanSirket]);

  const filtreli = useMemo(() => {
    const q = arama.toLowerCase().trim();
    if (!q) return liste;
    return liste.filter(
      (c) =>
        c.cariKodu.toLowerCase().includes(q) ||
        c.cariUnvan.toLowerCase().includes(q)
    );
  }, [arama, liste]);

  const toplamBakiye = useMemo(
    () => filtreli.reduce((t, c) => t + (c.bakiye ?? 0), 0),
    [filtreli]
  );

  if (yukleniyor) {
    return (
      <SkeletonLoader satirSayisi={6} />
    );
  }

  return (
    <View style={styles.container}>
      {/* Arama */}
      <View style={styles.aramaRow}>
        <Ionicons name="search-outline" size={16} color={Colors.gray} />
        <TextInput
          style={styles.aramaInput}
          placeholder="Cari kodu veya unvan ara..."
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

      {/* Toplam */}
      <View style={styles.toplamRow}>
        <Text style={styles.toplamLabel}>Toplam Bakiye ({filtreli.length} cari)</Text>
        <Text style={[styles.toplamDeger, toplamBakiye < 0 && styles.negatif]}>
          {f(toplamBakiye)} TL
        </Text>
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(item) => item.cariKodu}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={veriYukle}
            colors={[Colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.satir}>
            <View style={styles.satırSol}>
              <Text style={styles.cariKodu}>{item.cariKodu}</Text>
              <Text style={styles.cariUnvan} numberOfLines={1}>{item.cariUnvan}</Text>
            </View>
            <Text
              style={[
                styles.bakiye,
                (item.bakiye ?? 0) > 0 && styles.pozitif,
                (item.bakiye ?? 0) < 0 && styles.negatif,
              ]}
            >
              {f(item.bakiye ?? 0)}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.ayirac} />}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <EmptyState icon="wallet-outline" baslik="Cari bulunamadı" aciklama="Bakiye bilgisi bulunmamaktadır" />
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
  toplamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toplamLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  toplamDeger: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  liste: { paddingBottom: 20 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  satırSol: { flex: 1 },
  cariKodu: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  cariUnvan: { fontSize: 12, color: Colors.darkGray, marginTop: 2 },
  bakiye: { fontSize: 14, fontWeight: '700', color: Colors.darkGray },
  pozitif: { color: Colors.error },
  negatif: { color: Colors.success },
  ayirac: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  bosText: { color: Colors.gray, fontSize: 14 },
});
