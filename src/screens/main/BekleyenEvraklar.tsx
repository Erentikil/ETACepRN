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
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Colors } from '../../constants/Colors';
import { paraTL } from '../../utils/format';
import { EvrakTipi, AlimSatim } from '../../models';
import type { BekleyenEvrakKaydi } from '../../models';

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
  const navigation = useNavigation<NavProp>();
  const [evraklar, setEvraklar] = useState<BekleyenEvrakKaydi[]>([]);
  const [filtreli, setFiltreli] = useState<BekleyenEvrakKaydi[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const yukle = useCallback(async (metin?: string) => {
    setYukleniyor(true);
    try {
      const liste = await bekleyenEvraklariAl();
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
            await evrakiSil(kayit.id);
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
            await tumEvraklariSil();
            setEvraklar([]);
            setFiltreli([]);
          },
        },
      ]
    );
  };

  const handleEvrakAc = (kayit: BekleyenEvrakKaydi) => {
    navigation.navigate('HizliIslemler', { taslakEvrak: kayit });
  };

  const renderEvrak = ({ item }: { item: BekleyenEvrakKaydi }) => (
    <ReanimatedSwipeable
      renderRightActions={() => (
        <TouchableOpacity style={styles.silBtn} onPress={() => handleSil(item)}>
          <Ionicons name="trash-outline" size={22} color={Colors.white} />
          <Text style={styles.silBtnText}>Sil</Text>
        </TouchableOpacity>
      )}
    >
      <TouchableOpacity style={styles.kart} onPress={() => handleEvrakAc(item)} activeOpacity={0.8}>
        <View style={styles.kartUst}>
          <View style={styles.evrakTipiBadge}>
            <Text style={styles.evrakTipiText}>{evrakTipiAdi(item.evrakTipi, item.alimSatim)}</Text>
          </View>
          <Text style={styles.tarih}>{tarihFormat(item.tarih)}</Text>
        </View>
        <Text style={styles.cariUnvan} numberOfLines={1}>
          {item.cariUnvan || <Text style={{ color: Colors.gray }}>Cari seçilmedi</Text>}
        </Text>
        <View style={styles.kartAlt}>
          <Text style={styles.fisTipi}>{item.fisTipiAdi}</Text>
          <Text style={styles.toplam}>{paraTL(item.genelToplam)}</Text>
        </View>
        <Text style={styles.kalemSayisi}>{item.kalemler.length} kalem</Text>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );

  return (
    <View style={styles.ekran}>
      {/* Arama + Temizle */}
      <View style={styles.ustBar}>
        <View style={styles.aramaRow}>
          <Ionicons name="search-outline" size={18} color={Colors.gray} />
          <TextInput
            style={styles.aramaInput}
            placeholder="Cari kodu, unvan veya evrak tipi ara..."
            placeholderTextColor={Colors.gray}
            value={aramaMetni}
            onChangeText={handleArama}
          />
          {aramaMetni.length > 0 && (
            <TouchableOpacity onPress={() => handleArama('')}>
              <Ionicons name="close-circle" size={18} color={Colors.gray} />
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
          <View style={styles.bosEkran}>
            <Ionicons name="document-text-outline" size={48} color={Colors.border} />
            <Text style={styles.bosMetin}>
              {yukleniyor ? 'Yükleniyor...' : 'Bekleyen evrak bulunamadı'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: '#f5f5f5' },
  ustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aramaRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  aramaInput: { flex: 1, fontSize: 14, color: Colors.black, paddingVertical: 0 },
  temizleBtn: { padding: 6 },
  listePadding: { padding: 10, paddingBottom: 20 },
  kart: {
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.primary + '15',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  evrakTipiText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  tarih: { fontSize: 11, color: Colors.gray },
  cariUnvan: { fontSize: 15, fontWeight: '600', color: Colors.darkGray, marginBottom: 8 },
  kartAlt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fisTipi: { fontSize: 12, color: Colors.gray },
  toplam: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  kalemSayisi: { fontSize: 11, color: Colors.gray, marginTop: 4 },
  silBtn: {
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    borderRadius: 12,
    marginLeft: 6,
    gap: 4,
  },
  silBtnText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  bosEkran: { alignItems: 'center', paddingTop: 80, gap: 12 },
  bosMetin: { fontSize: 14, color: Colors.gray },
});
