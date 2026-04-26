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
import { useColors } from '../../contexts/ThemeContext';
import { useT } from '../../i18n/I18nContext';
import type { CariKartBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';
import SkeletonLoader from '../../components/SkeletonLoader';

function f(n: number) {
  return (n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CariBakiye() {
  const Colors = useColors();
  const t = useT();
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
        toast.error(sonuc.mesaj || t('bakiye.cariListesiAlinamadi'));
      }
    } catch (err: any) {
      toast.error(err.message || t('bakiye.cariListesiHata'));
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
    () => filtreli.reduce((acc, c) => acc + (c.bakiye ?? 0), 0),
    [filtreli]
  );

  if (yukleniyor) {
    return <SkeletonLoader satirSayisi={6} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* Arama */}
      <View style={[styles.aramaRow, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
        <TextInput
          style={[styles.aramaInput, { color: Colors.text }]}
          placeholder={t('bakiye.aramaPlaceholder')}
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

      {/* Toplam */}
      <View style={[styles.toplamRow, { backgroundColor: Colors.primary }]}>
        <Text style={styles.toplamLabel}>{t('bakiye.toplamBakiye')} ({t('bakiye.cariSayisi', { n: filtreli.length })})</Text>
        <Text style={[styles.toplamDeger, toplamBakiye < 0 && { color: Colors.success }]}>
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
          <View style={[styles.satir, { backgroundColor: Colors.card }]}>
            <View style={styles.satırSol}>
              <Text style={[styles.cariKodu, { color: Colors.primary }]}>{item.cariKodu}</Text>
              <Text style={[styles.cariUnvan, { color: Colors.textSecondary }]} numberOfLines={1}>{item.cariUnvan}</Text>
            </View>
            <Text
              style={[
                styles.bakiye,
                { color: Colors.text },
                (item.bakiye ?? 0) > 0 && { color: Colors.error },
                (item.bakiye ?? 0) < 0 && { color: Colors.success },
              ]}
            >
              {f(item.bakiye ?? 0)}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={[styles.ayirac, { backgroundColor: Colors.border }]} />}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <EmptyState icon="wallet-outline" baslik={t('bakiye.cariBulunamadi')} aciklama={t('bakiye.cariBulunamadiAciklama')} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  aramaInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  toplamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toplamLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  toplamDeger: { color: '#fff', fontSize: 15, fontWeight: '700' },
  liste: { paddingBottom: 20 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cariKodu: { fontSize: 13, fontWeight: '700' },
  cariUnvan: { fontSize: 12, marginTop: 2 },
  bakiye: { fontSize: 14, fontWeight: '700' },
  ayirac: { height: 1, marginHorizontal: 14 },
});
