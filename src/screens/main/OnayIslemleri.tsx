import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Colors } from '../../constants/Colors';
import { toast } from '../../components/Toast';
import { paraTL } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import { onayListesiniAl, onaylamaDurumunuGuncelle } from '../../api/onayApi';
import type { OnayListesiBilgileri } from '../../models';
import type { RootStackParamList } from '../../navigation/types';
import EmptyState from '../../components/EmptyState';

type Bolum = { title: string; data: OnayListesiBilgileri[] };

// onayDurumu → renk
function durumRengi(onayDurumu: number): string {
  if (onayDurumu === 2) return '#43a047';          // Onaylandı — yeşil
  if ([0, 3, 4].includes(onayDurumu)) return '#e65100'; // Bekliyor — turuncu
  if ([1, 7, 8].includes(onayDurumu)) return '#e53935'; // İptal — kırmızı
  return Colors.gray;
}

function formatTarih(tarih: string): string {
  try {
    const d = new Date(tarih);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return tarih;
  }
}

function grupla(liste: OnayListesiBilgileri[]): Bolum[] {
  const map = new Map<string, OnayListesiBilgileri[]>();
  for (const item of liste) {
    const key = item.durum || 'Diğer';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

export default function OnayIslemleri() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { yetkiBilgileri, calisilanSirket } = useAppStore();
  const isAdmin = yetkiBilgileri?.admin ?? false;
  const kullaniciKodu = isAdmin ? 'YOK' : (yetkiBilgileri?.kullaniciKodu ?? '');

  const [tumListe, setTumListe] = useState<OnayListesiBilgileri[]>([]);
  const [bolumler, setBolumler] = useState<Bolum[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [islemYapiliyor, setIslemYapiliyor] = useState(false);

  const listeYukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const sonuc = await onayListesiniAl(kullaniciKodu, calisilanSirket);
      if (sonuc.sonuc) {
        const liste = sonuc.data ?? [];
        setTumListe(liste);
        setBolumler(grupla(liste));
      } else {
        toast.error(sonuc.mesaj || 'Onay listesi alınamadı.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Bağlantı hatası.');
    } finally {
      setYukleniyor(false);
    }
  }, [kullaniciKodu, calisilanSirket]);

  useFocusEffect(useCallback(() => { listeYukle(); }, [listeYukle]));

  // Arama filtresi
  const aramaUygula = useCallback((metin: string) => {
    setAramaMetni(metin);
    const q = metin.toLowerCase().trim();
    const filtrelenmis = q
      ? tumListe.filter((i) => i.cariUnvani.toLowerCase().includes(q))
      : tumListe;
    setBolumler(grupla(filtrelenmis));
  }, [tumListe]);

  // Onay durumu güncelle
  const durumGuncelle = async (item: OnayListesiBilgileri, durum: number, not: string) => {
    setIslemYapiliyor(true);
    try {
      const sonuc = await onaylamaDurumunuGuncelle(
        item.guidId, durum, item.onaylayan, not, calisilanSirket
      );
      if (!sonuc.sonuc) {
        toast.error(sonuc.mesaj || 'İşlem gerçekleştirilemedi.');
      }
      await listeYukle();
    } catch (e: any) {
      toast.error(e?.message || 'Bağlantı hatası.');
    } finally {
      setIslemYapiliyor(false);
    }
  };

  // Kaydırarak sil
  const silmeIste = (item: OnayListesiBilgileri) => {
    const { onayDurumu } = item;
    if ([0, 3, 4].includes(onayDurumu)) {
      Alert.alert(
        'Evrak Sil',
        'Seçilmiş evrak kayıtlardan silinecektir. Emin misiniz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Tamam',
            style: 'destructive',
            onPress: () =>
              durumGuncelle(
                item, 8,
                '(Müşteri tarafından evrak iptal edildi.) ' + item.not
              ),
          },
        ]
      );
    } else if ([2, 5, 6].includes(onayDurumu)) {
      Alert.alert(
        'Listeden Çıkar',
        'Seçili evrak listeden çıkarılacaktır. Emin misiniz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Tamam', style: 'destructive', onPress: () => durumGuncelle(item, 7, item.not) },
        ]
      );
    } else {
      toast.error('Seçili evrak listeden çıkarılamaz.');
    }
  };

  // Öğeye dokunma
  const ogeyeDokun = (item: OnayListesiBilgileri) => {
    if (isAdmin) {
      navigation.navigate('OnayDuzenleme', { item });
    } else {
      toast.info(`${item.cariUnvani}\n${item.evrakTipi} — ${item.fisTipi}\nKullanıcı: ${item.kullaniciKodu}\nŞirket: ${item.sirketAdi}\nTarih: ${formatTarih(item.tarih)}\nToplam: ${paraTL(item.genelToplam)}\nDurum: ${item.durum}\nOnaylayan: ${item.onaylayan || '—'}`);
    }
  };

  const renderItem = ({ item }: { item: OnayListesiBilgileri }) => (
    <ReanimatedSwipeable
      renderRightActions={() => (
        <TouchableOpacity style={styles.silBtn} onPress={() => silmeIste(item)}>
          <Ionicons name="trash-outline" size={22} color={Colors.white} />
          <Text style={styles.silBtnText}>Sil</Text>
        </TouchableOpacity>
      )}
    >
      <TouchableOpacity style={styles.kart} onPress={() => ogeyeDokun(item)} activeOpacity={0.8}>
        {/* Üst satır */}
        <View style={styles.kartUst}>
          <View style={styles.evrakBadge}>
            <Text style={styles.evrakBadgeText}>{item.evrakTipi}</Text>
          </View>
          <Text style={styles.fisTipi} numberOfLines={1}>{item.fisTipi}</Text>
          <View style={[styles.durumBadge, { backgroundColor: durumRengi(item.onayDurumu) }]}>
            <Text style={styles.durumText}>{item.durum}</Text>
          </View>
        </View>

        {/* Cari unvan */}
        <Text style={styles.cariUnvan} numberOfLines={1}>{item.cariUnvani}</Text>

        {/* Alt bilgiler */}
        <View style={styles.kartAlt}>
          <View style={styles.kartAltSol}>
            <Text style={styles.bilgiKucuk}>
              <Text style={styles.bilgiEtiket}>Kullanıcı: </Text>
              {item.kullaniciKodu}
            </Text>
            {item.sirketAdi ? (
              <Text style={styles.bilgiKucuk}>
                <Text style={styles.bilgiEtiket}>Şirket: </Text>
                {item.sirketAdi}
              </Text>
            ) : null}
            <Text style={styles.bilgiKucuk}>
              <Text style={styles.bilgiEtiket}>Tarih: </Text>
              {formatTarih(item.tarih)}
            </Text>
            {item.onaylayan ? (
              <Text style={styles.bilgiKucuk}>
                <Text style={styles.bilgiEtiket}>Onaylayan: </Text>
                {item.onaylayan}
              </Text>
            ) : null}
          </View>
          <Text style={styles.toplam}>{paraTL(item.genelToplam)}</Text>
        </View>

        {/* Not satırı */}
        {item.not ? (
          <View style={styles.notSatir}>
            <Text style={styles.notMetin} numberOfLines={1}>{item.not}</Text>
            <TouchableOpacity
              onPress={() => toast.info(item.not || '—')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="information-circle-outline" size={18} color="#e65100" />
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );

  const renderSectionHeader = ({ section }: { section: Bolum }) => (
    <View style={styles.bolumBaslik}>
      <Text style={styles.bolumBaslikText}>{section.title}</Text>
      <Text style={styles.bolumSayac}>{section.data.length}</Text>
    </View>
  );

  return (
    <View style={styles.ekran}>
      {/* Arama */}
      <View style={styles.aramaRow}>
        <Ionicons name="search-outline" size={18} color={Colors.gray} />
        <TextInput
          style={styles.aramaInput}
          placeholder="Cari ünvana göre ara..."
          placeholderTextColor={Colors.gray}
          value={aramaMetni}
          onChangeText={aramaUygula}
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => aramaUygula('')}>
            <Ionicons name="close-circle" size={18} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {isAdmin && (
        <View style={styles.adminBar}>
          <Ionicons name="shield-checkmark-outline" size={14} color={Colors.white} />
          <Text style={styles.adminBarText}>Admin görünümü — tüm kullanıcılar</Text>
        </View>
      )}

      {(yukleniyor || islemYapiliyor) && bolumler.length === 0 ? (
        <View style={styles.merkezle}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={bolumler}
          keyExtractor={(item, idx) => item.guidId || String(idx)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listePadding}
          ItemSeparatorComponent={() => <View style={styles.ayirac} />}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={listeYukle}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState icon="checkmark-done-circle-outline" baslik="Onay listesi boş" aciklama="Bekleyen onay işlemi bulunmamaktadır" />
          }
        />
      )}

      {/* İşlem yapılıyor overlay */}
      {islemYapiliyor && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.white} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: '#f5f5f5' },

  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 10,
    marginBottom: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  aramaInput: { flex: 1, fontSize: 14, color: Colors.black ?? '#000', paddingVertical: 2 },

  adminBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5c6bc0',
    marginHorizontal: 10,
    marginBottom: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adminBarText: { color: Colors.white, fontSize: 12, fontWeight: '600' },

  listePadding: { paddingHorizontal: 10, paddingBottom: 16 },
  ayirac: { height: 6 },

  bolumBaslik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 4,
  },
  bolumBaslikText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  bolumSayac: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  kart: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  kartUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  evrakBadge: {
    backgroundColor: '#e8eaf6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  evrakBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  fisTipi: { flex: 1, fontSize: 12, color: Colors.gray },
  durumBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durumText: { fontSize: 11, color: Colors.white, fontWeight: '700' },

  cariUnvan: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkGray,
    marginBottom: 8,
  },

  kartAlt: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  kartAltSol: { flex: 1, gap: 2 },
  bilgiKucuk: { fontSize: 11, color: Colors.gray },
  bilgiEtiket: { fontWeight: '600', color: Colors.darkGray },
  toplam: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },

  notSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 4,
  },
  notMetin: { flex: 1, fontSize: 12, color: '#e65100', fontStyle: 'italic' },

  silBtn: {
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    borderRadius: 10,
    marginLeft: 6,
    gap: 2,
  },
  silBtnText: { color: Colors.white, fontSize: 11, fontWeight: '600' },

  merkezle: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  bosMetin: { fontSize: 14, color: Colors.gray },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
