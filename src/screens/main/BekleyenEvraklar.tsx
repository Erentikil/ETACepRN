import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import {
  bekleyenEvraklariAl,
  evrakiSil,
  tumEvraklariSil,
} from '../../utils/bekleyenEvraklarStorage';
import { aktifSepetAl } from '../../utils/aktifSepetStorage';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useColors } from '../../contexts/ThemeContext';
import { paraTL } from '../../utils/format';
import { EvrakTipi, AlimSatim } from '../../models';
import type { BekleyenEvrakKaydi } from '../../models';
import EmptyState from '../../components/EmptyState';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useAppStore } from '../../store/appStore';

type NavProp = CompositeNavigationProp<
  DrawerNavigationProp<DrawerParamList, 'BekleyenEvraklar'>,
  StackNavigationProp<RootStackParamList>
>;

function evrakTipiAdi(tipi: EvrakTipi, alSat: AlimSatim): string {
  if (tipi === EvrakTipi.Stok && alSat === AlimSatim.Alim) return 'Stok Giriş';
  if (tipi === EvrakTipi.Stok && alSat === AlimSatim.Satim) return 'Stok Çıkış';
  if (tipi === EvrakTipi.Stok && alSat === AlimSatim.Sayim) return 'Sayım';
  const tipler: Record<number, string> = {
    [EvrakTipi.Fatura]: 'Fatura',
    [EvrakTipi.Irsaliye]: 'İrsaliye',
    [EvrakTipi.Siparis]: 'Sipariş',
  };
  const alSatlar: Record<number, string> = {
    [AlimSatim.Alim]: 'Alış',
    [AlimSatim.Satim]: 'Satış',
  };
  return `${tipler[tipi] ?? ''} ${alSatlar[alSat] ?? ''}`.trim();
}

function tarihFormat(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function BekleyenEvraklar() {
  const Colors = useColors();
  const navigation = useNavigation<NavProp>();
  const { calisilanSirket } = useAppStore();
  const [evraklar, setEvraklar] = useState<BekleyenEvrakKaydi[]>([]);
  const [filtreli, setFiltreli] = useState<BekleyenEvrakKaydi[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const yukle = useCallback(async (metin?: string) => {
    setYukleniyor(true);
    try {
      const liste = await bekleyenEvraklariAl(calisilanSirket);
      // Yeniden eskiye sırala
      const sirali = [...liste].reverse();
      setEvraklar(sirali);
      filtrele(sirali, metin ?? aramaMetni);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      yukle();
    }, [])
  );

  const filtrele = (liste: BekleyenEvrakKaydi[], metin: string) => {
    if (!metin.trim()) {
      setFiltreli(liste);
      return;
    }
    const q = metin.toLowerCase();
    setFiltreli(
      liste.filter(
        (e) =>
          e.cariKodu.toLowerCase().includes(q) ||
          e.cariUnvan.toLowerCase().includes(q) ||
          evrakTipiAdi(e.evrakTipi, e.alimSatim).toLowerCase().includes(q)
      )
    );
  };

  const handleArama = (metin: string) => {
    setAramaMetni(metin);
    filtrele(evraklar, metin);
  };

  const handleSil = (kayit: BekleyenEvrakKaydi) => {
    Alert.alert(
      'Uyarı',
      `"${kayit.cariUnvan || evrakTipiAdi(kayit.evrakTipi, kayit.alimSatim)}" evrakını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await evrakiSil(kayit.id, calisilanSirket);
            const guncellenmis = evraklar.filter((e) => e.id !== kayit.id);
            setEvraklar(guncellenmis);
            filtrele(guncellenmis, aramaMetni);
          },
        },
      ]
    );
  };

  const handleTumunuTemizle = () => {
    if (evraklar.length === 0) return;
    Alert.alert(
      'Uyarı',
      'Tüm bekleyen evraklar silinecektir. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            await tumEvraklariSil(calisilanSirket);
            setEvraklar([]);
            setFiltreli([]);
          },
        },
      ]
    );
  };

  const handleEvrakAc = async (kayit: BekleyenEvrakKaydi) => {
    const sepet = await aktifSepetAl(calisilanSirket);
    const sepetDolu = sepet && sepet.kalemler.length > 0;

    const devamEt = () => {
      Alert.alert(
        'Evrak Aç',
        'Bu evrak sepete aktarılacak ve taslaktan silinecektir. Devam etmek istiyor musunuz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Devam', onPress: () => navigation.navigate('HizliIslemlerV2', { taslakEvrak: kayit }) },
        ]
      );
    };

    if (sepetDolu) {
      Alert.alert(
        'Sepet Dolu',
        'Sepetinizde ürünler bulunmaktadır. Devam ederseniz mevcut sepet silinecektir. Emin misiniz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Devam', onPress: devamEt },
        ]
      );
    } else {
      devamEt();
    }
  };

  const renderEvrak = ({ item }: { item: BekleyenEvrakKaydi }) => (
    <ReanimatedSwipeable
      renderRightActions={() => (
        <TouchableOpacity style={[styles.silBtn, { backgroundColor: Colors.error }]} onPress={() => handleSil(item)}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.silBtnText}>Sil</Text>
        </TouchableOpacity>
      )}
    >
      <TouchableOpacity style={[styles.kart, { backgroundColor: Colors.card }]} onPress={() => handleEvrakAc(item)} activeOpacity={0.8}>
        <View style={styles.kartUst}>
          <View style={[styles.evrakTipiBadge, { backgroundColor: Colors.primary + '15' }]}>
            <Text style={[styles.evrakTipiText, { color: Colors.primary }]}>{evrakTipiAdi(item.evrakTipi, item.alimSatim)}</Text>
          </View>
          <Text style={[styles.tarih, { color: Colors.textSecondary }]}>{tarihFormat(item.tarih)}</Text>
        </View>
        <Text style={[styles.cariUnvan, { color: Colors.text }]} numberOfLines={1}>
          {item.cariUnvan || <Text style={{ color: Colors.textSecondary }}>Cari seçilmedi</Text>}
        </Text>
        <View style={styles.kartAlt}>
          <Text style={[styles.fisTipi, { color: Colors.textSecondary }]}>{item.fisTipiAdi}</Text>
          <Text style={[styles.toplam, { color: Colors.primary }]}>{paraTL(item.genelToplam)}</Text>
        </View>
        <Text style={[styles.kalemSayisi, { color: Colors.textSecondary }]}>{item.kalemler.length} kalem</Text>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      {/* Arama + Temizle */}
      <View style={[styles.ustBar, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <View style={[styles.aramaRow, { backgroundColor: Colors.inputBackground }]}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
          <TextInput
            style={[styles.aramaInput, { color: Colors.text }]}
            placeholder="Cari kodu, unvan veya evrak tipi ara..."
            placeholderTextColor={Colors.textSecondary}
            value={aramaMetni}
            onChangeText={handleArama}
          />
          {aramaMetni.length > 0 && (
            <TouchableOpacity onPress={() => handleArama('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.temizleBtn} onPress={handleTumunuTemizle}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(item) => item.id}
        renderItem={renderEvrak}
        contentContainerStyle={styles.listePadding}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={
          <RefreshControl refreshing={yukleniyor} onRefresh={() => yukle(aramaMetni)} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          yukleniyor ? (
            <SkeletonLoader satirSayisi={5} />
          ) : (
            <EmptyState icon="document-text-outline" baslik="Bekleyen evrak bulunamadı" aciklama="Taslak olarak kaydedilmiş evrak bulunmamaktadır" />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  ustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  aramaRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  aramaInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  temizleBtn: { padding: 6 },
  listePadding: { padding: 10, paddingBottom: 20 },
  kart: {
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  evrakTipiBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  evrakTipiText: { fontSize: 12, fontWeight: '700' },
  tarih: { fontSize: 11 },
  cariUnvan: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  kartAlt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fisTipi: { fontSize: 12 },
  toplam: { fontSize: 16, fontWeight: '700' },
  kalemSayisi: { fontSize: 11, marginTop: 4 },
  silBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    borderRadius: 12,
    marginLeft: 6,
    gap: 4,
  },
  silBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  bosEkran: { alignItems: 'center', paddingTop: 80, gap: 12 },
  bosMetin: { fontSize: 14 },
});
