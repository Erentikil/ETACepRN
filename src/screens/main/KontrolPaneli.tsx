import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useColors } from '../../contexts/ThemeContext';
import { useT } from '../../i18n/I18nContext';
import { toast } from '../../components/Toast';
import { paraTL } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import { onayListesiniAl } from '../../api/onayApi';
import type { OnayListesiBilgileri } from '../../models';
import type { RootStackParamList } from '../../navigation/types';
import EmptyState from '../../components/EmptyState';

type Bolum = { title: string; data: OnayListesiBilgileri[] };

function durumRengi(onayDurumu: number): string {
  if (onayDurumu === 2) return '#43a047';                    // Onaylandı — yeşil
  if ([0, 3].includes(onayDurumu)) return '#e65100';         // Bekliyor/Güncelle — turuncu
  if ([1, 4, 7, 8].includes(onayDurumu)) return '#e53935';   // Reddedildi/İptal — kırmızı
  return '#757575';
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

export default function KontrolPaneli() {
  const Colors = useColors();
  const t = useT();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { calisilanSirket } = useAppStore();

  const [tumListe, setTumListe] = useState<OnayListesiBilgileri[]>([]);
  const [bolumler, setBolumler] = useState<Bolum[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  // Kapalı grupları tut — varsayılan olarak hepsi kapalı
  const [acikGruplar, setAcikGruplar] = useState<Set<string>>(new Set());

  const listeYukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const sonuc = await onayListesiniAl('YOK', calisilanSirket);
      if (sonuc.sonuc) {
        const liste = sonuc.data ?? [];
        setTumListe(liste);
        setBolumler(grupla(liste));
        setAcikGruplar(new Set()); // yeniden yüklemede kapalı sıfırla
      } else {
        toast.error(sonuc.mesaj || t('onay.listeAlinamadi'));
      }
    } catch (e: any) {
      toast.error(e?.message || t('common.baglantiHatasi'));
    } finally {
      setYukleniyor(false);
    }
  }, [calisilanSirket]);

  useFocusEffect(useCallback(() => { listeYukle(); }, [listeYukle]));

  const aramaUygula = useCallback((metin: string) => {
    setAramaMetni(metin);
    const q = metin.toLowerCase().trim();
    const filtrelenmis = q
      ? tumListe.filter((i) => i.cariUnvani.toLowerCase().includes(q))
      : tumListe;
    setBolumler(grupla(filtrelenmis));
  }, [tumListe]);

  const grupToggle = (title: string) => {
    setAcikGruplar((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const renderKart = (item: OnayListesiBilgileri, idx: number) => (
    <TouchableOpacity
      key={item.guidId || idx}
      style={[styles.kart, { backgroundColor: Colors.card }]}
      onPress={() => navigation.navigate('KontrolPaneliDetay', { item })}
      activeOpacity={0.8}
    >
      <View style={styles.kartUst}>
        <View style={[styles.evrakBadge, { backgroundColor: `${Colors.primary}18` }]}>
          <Text style={[styles.evrakBadgeText, { color: Colors.primary }]}>{item.evrakTipi}</Text>
        </View>
        <Text style={[styles.fisTipi, { color: Colors.textSecondary }]} numberOfLines={1}>{item.fisTipi}</Text>
        <View style={[styles.durumBadge, { backgroundColor: durumRengi((item.onaylamaDurumu ?? item.onayDurumu ?? 0)) }]}>
          <Text style={styles.durumText}>{item.durum}</Text>
        </View>
      </View>

      <Text style={[styles.cariUnvan, { color: Colors.text }]} numberOfLines={1}>{item.cariUnvani}</Text>

      <View style={styles.kartAlt}>
        <View style={styles.kartAltSol}>
          <Text style={[styles.bilgiKucuk, { color: Colors.textSecondary }]}>
            <Text style={[styles.bilgiEtiket, { color: Colors.text }]}>{t('onay.kullanici')}: </Text>
            {item.kullaniciKodu}
          </Text>
          {item.sirketAdi ? (
            <Text style={[styles.bilgiKucuk, { color: Colors.textSecondary }]}>
              <Text style={[styles.bilgiEtiket, { color: Colors.text }]}>{t('onay.sirket')}: </Text>
              {item.sirketAdi}
            </Text>
          ) : null}
          <Text style={[styles.bilgiKucuk, { color: Colors.textSecondary }]}>
            <Text style={[styles.bilgiEtiket, { color: Colors.text }]}>{t('onay.tarih')}: </Text>
            {formatTarih(item.tarih)}
          </Text>
          {item.onaylayan ? (
            <Text style={[styles.bilgiKucuk, { color: Colors.textSecondary }]}>
              <Text style={[styles.bilgiEtiket, { color: Colors.text }]}>{t('onay.onaylayan')}: </Text>
              {item.onaylayan}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.toplam, { color: Colors.primary }]}>{paraTL(item.genelToplam)}</Text>
      </View>

      {item.not ? (
        <View style={[styles.notSatir, { borderTopColor: Colors.border }]}>
          <Text style={styles.notMetin} numberOfLines={1}>{item.not}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  if (yukleniyor && bolumler.length === 0) {
    return (
      <View style={[styles.ekran, styles.merkezle, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      {/* Arama */}
      <View style={[styles.aramaRow, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          style={[styles.aramaInput, { color: Colors.text }]}
          placeholder={t('onay.aramaPlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          value={aramaMetni}
          onChangeText={aramaUygula}
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => aramaUygula('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollIcerik}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={listeYukle}
            colors={[Colors.primary]}
          />
        }
      >
        {bolumler.length === 0 ? (
          <EmptyState
            icon="grid-outline"
            baslik={t('kontrolPaneli.bos')}
            aciklama={t('kontrolPaneli.bosAciklama')}
          />
        ) : (
          bolumler.map((bolum) => {
            const acik = acikGruplar.has(bolum.title);
            // Gruptaki herhangi bir item'dan rengi al
            const renk = bolum.data[0] ? durumRengi(bolum.data[0].onayDurumu) : Colors.primary;
            return (
              <View key={bolum.title} style={styles.grupKapsayici}>
                {/* Grup başlığı */}
                <TouchableOpacity
                  style={[styles.grupBaslik, { backgroundColor: Colors.card, borderColor: Colors.border, borderLeftColor: renk }]}
                  onPress={() => grupToggle(bolum.title)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.durumNokta, { backgroundColor: renk }]} />
                  <Text style={[styles.grupBaslikMetin, { color: Colors.text }]}>{bolum.title}</Text>
                  <View style={[styles.sayacBadge, { backgroundColor: renk }]}>
                    <Text style={styles.sayacMetin}>{bolum.data.length}</Text>
                  </View>
                  <Ionicons
                    name={acik ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Grup içeriği */}
                {acik && (
                  <View style={styles.grupIcerik}>
                    {bolum.data.map((item, idx) => (
                      <View key={item.guidId || idx} style={idx > 0 ? styles.kartAyirac : undefined}>
                        {renderKart(item, idx)}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  merkezle: { alignItems: 'center', justifyContent: 'center' },

  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    marginBottom: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 6,
  },
  aramaInput: { flex: 1, fontSize: 14, paddingVertical: 2 },

  scrollIcerik: { padding: 10, paddingBottom: 24, gap: 8 },

  // Grup accordion
  grupKapsayici: {},
  grupBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    gap: 8,
  },
  durumNokta: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  grupBaslikMetin: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  sayacBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sayacMetin: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  grupIcerik: {
    marginTop: 4,
    gap: 6,
  },

  // Kartlar
  kartAyirac: { marginTop: 6 },
  kart: {
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
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  evrakBadgeText: { fontSize: 11, fontWeight: '700' },
  fisTipi: { flex: 1, fontSize: 12 },
  durumBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durumText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  cariUnvan: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  kartAlt: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  kartAltSol: { flex: 1, gap: 2 },
  bilgiKucuk: { fontSize: 11 },
  bilgiEtiket: { fontWeight: '600' },
  toplam: { fontSize: 16, fontWeight: '700' },
  notSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  notMetin: { flex: 1, fontSize: 12, color: '#e65100', fontStyle: 'italic' },
});
