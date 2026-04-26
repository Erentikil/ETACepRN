import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useColors } from '../../contexts/ThemeContext';
import { useT } from '../../i18n/I18nContext';
import { toast } from '../../components/Toast';
import { paraTL } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import { onayListesiniAl, onayEvraginiAl, evrakOnayiDegistir } from '../../api/onayApi';
import type { OnayListesiBilgileri, SepetNormalBilgileri, SepetKalem, BekleyenEvrakKaydi } from '../../models';
import type { DrawerParamList } from '../../navigation/types';
import EmptyState from '../../components/EmptyState';

type Bolum = { title: string; data: OnayListesiBilgileri[] };

function durumRengi(onaylamaDurumu: number): string {
  if (onaylamaDurumu === 1) return '#43a047';            // Onaylandı — yeşil
  if (onaylamaDurumu === 2) return '#e53935';            // Reddedildi — kırmızı
  if ([0, 3].includes(onaylamaDurumu)) return '#e65100'; // Bekliyor/Güncelle — turuncu
  if ([4, 7, 8].includes(onaylamaDurumu)) return '#e53935'; // İptal — kırmızı
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

function snbToSepetKalem(snb: SepetNormalBilgileri): SepetKalem {
  return {
    stokKodu: snb.stokKodu,
    stokCinsi: snb.stokCinsi,
    barkod: snb.barkod,
    birim: snb.birim,
    miktar: snb.miktar,
    birimFiyat: snb.fiyat,
    kdvOrani: snb.kdvOrani,
    kalemIndirim1: snb.kalemIndirim1,
    kalemIndirim2: snb.kalemIndirim2,
    kalemIndirim3: snb.kalemIndirim3,
    kalemIndirim4: snb.kalemIndirim4,
    kalemIndirim5: snb.kalemIndirim5,
    seciliFiyatNo: snb.fiyatNo,
    aciklama: snb.aciklama,
  };
}

export default function OnayIslemleri() {
  const Colors = useColors();
  const t = useT();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const { yetkiBilgileri, calisilanSirket } = useAppStore();
  const isAdmin = yetkiBilgileri?.admin ?? false;
  const kullaniciKodu = yetkiBilgileri?.kullaniciKodu ?? '';

  const [tumListe, setTumListe] = useState<OnayListesiBilgileri[]>([]);
  const [bolumler, setBolumler] = useState<Bolum[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [islemYapiliyor, setIslemYapiliyor] = useState(false);
  const [acikGruplar, setAcikGruplar] = useState<Set<string>>(new Set());

  const listeYukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const sonuc = await onayListesiniAl(kullaniciKodu, calisilanSirket);
      if (sonuc.sonuc) {
        const liste = sonuc.data ?? [];
        setTumListe(liste);
        setBolumler(grupla(liste));
        setAcikGruplar(new Set());
      } else {
        toast.error(sonuc.mesaj || t('onay.listeAlinamadi'));
      }
    } catch (e: any) {
      toast.error(e?.message || t('common.baglantiHatasi'));
    } finally {
      setYukleniyor(false);
    }
  }, [kullaniciKodu, calisilanSirket]);

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

  const sepeteAc = async (item: OnayListesiBilgileri) => {
    setIslemYapiliyor(true);
    try {
      const sonuc = await onayEvraginiAl(item.guidId, calisilanSirket);
      if (!sonuc.data) {
        toast.error(sonuc.mesaj || t('onay.evrakDetayiAlinamadi'));
        return;
      }
      const evrak = sonuc.data;
      const sbb = evrak.sbb;
      const kalemler: SepetKalem[] = (evrak.snbListe ?? []).map(snbToSepetKalem);
      const taslak: BekleyenEvrakKaydi = {
        id: '',
        tarih: new Date().toISOString(),
        genelToplam: evrak.genelToplam ?? 0,
        cariKodu: sbb.cariKodu,
        cariUnvan: sbb.cariUnvan,
        evrakTipi: sbb.evrakTipi,
        alimSatim: sbb.alimSatim,
        fisTipiBaslikNo: sbb.fisTipi,
        fisTipiAdi: sbb.fisTipAciklama,
        anaDepo: sbb.anaDepoKodu,
        karsiDepo: sbb.karsiDepoKodu,
        kalemler,
        onayGuidId: item.guidId,
        onayDurumu: item.onayDurumu,
        genelIndirimYuzde: sbb.indirimOran ?? 0,
        genelIndirimTutar: sbb.indirimTutar ?? 0,
        aciklama1: evrak.aciklama1 ?? '',
        aciklama2: evrak.aciklama2 ?? '',
      };
      navigation.navigate('HizliIslemlerV2', { taslakEvrak: taslak });
    } catch (e: any) {
      toast.error(e?.message || t('common.baglantiHatasi'));
    } finally {
      setIslemYapiliyor(false);
    }
  };

  const durumGuncelle = async (item: OnayListesiBilgileri, durum: number, not: string) => {
    setIslemYapiliyor(true);
    try {
      const sonuc = await evrakOnayiDegistir(
        { guidID: item.guidId },
        [],
        [],
        durum,
        item.onaylayan ?? '',
        not,
        calisilanSirket
      );
      if (!sonuc.sonuc) {
        toast.error(sonuc.mesaj || t('onay.islemBasarisiz'));
        return;
      }
      toast.success(t('onay.evrakSilindi'));
      const yeniListe = tumListe.filter((i) => i.guidId !== item.guidId);
      setTumListe(yeniListe);
      const q = aramaMetni.toLowerCase().trim();
      const filtrelenmis = q ? yeniListe.filter((i) => i.cariUnvani.toLowerCase().includes(q)) : yeniListe;
      setBolumler(grupla(filtrelenmis));
    } catch (e: any) {
      toast.error(e?.message || t('common.baglantiHatasi'));
    } finally {
      setIslemYapiliyor(false);
    }
  };

  const silmeIste = (item: OnayListesiBilgileri) => {
    const onaylamaDurumu = item.onaylamaDurumu ?? item.onayDurumu ?? 0;
    if ([0, 3, 4].includes(onaylamaDurumu)) {
      Alert.alert(
        t('onay.evrakSilBaslik'),
        t('onay.evrakSilOnay'),
        [
          { text: t('common.vazgec'), style: 'cancel' },
          {
            text: t('common.tamam'),
            style: 'destructive',
            onPress: () =>
              durumGuncelle(
                item, 8,
                t('onay.musteriIptalNot') + item.not
              ),
          },
        ]
      );
    } else if ([2, 5, 6].includes(onaylamaDurumu)) {
      Alert.alert(
        t('onay.listedenCikarBaslik'),
        t('onay.listedenCikarOnay'),
        [
          { text: t('common.vazgec'), style: 'cancel' },
          { text: t('common.tamam'), style: 'destructive', onPress: () => durumGuncelle(item, 7, item.not) },
        ]
      );
    } else {
      toast.error(t('onay.cikarilamaz'));
    }
  };

  const renderKart = (item: OnayListesiBilgileri, idx: number) => {
    const isGuncelle = item.onayDurumu === 3 || item.onayDurumu === 4;
    const isOnaylandi = item.onayDurumu === 1;
    const isTappable = isGuncelle || isOnaylandi;

    return (
    <ReanimatedSwipeable
      key={item.guidId || idx}
      renderRightActions={() => (
        <TouchableOpacity style={styles.silBtn} onPress={() => silmeIste(item)}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.silBtnText}>{t('onay.sil')}</Text>
        </TouchableOpacity>
      )}
    >
      <TouchableOpacity
        style={[styles.kart, { backgroundColor: Colors.card }]}
        onPress={isTappable ? () => sepeteAc(item) : undefined}
        activeOpacity={isTappable ? 0.75 : 1}
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
          <Text style={[styles.toplam, { color: Colors.primary }]}>{paraTL(item.genelToplam ?? 0)}</Text>
        </View>

        {item.not ? (
          <View style={[styles.notSatir, { borderTopColor: Colors.border }]}>
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
  };

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

      {isAdmin && (
        <View style={styles.adminBar}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#fff" />
          <Text style={styles.adminBarText}>{t('onay.adminGorunumu')}</Text>
        </View>
      )}

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
            icon="checkmark-done-circle-outline"
            baslik={t('onay.listeBos')}
            aciklama={t('onay.listeBosAciklama')}
          />
        ) : (
          bolumler.map((bolum) => {
            const acik = acikGruplar.has(bolum.title);
            const renk = bolum.data[0] ? durumRengi(bolum.data[0].onaylamaDurumu ?? bolum.data[0].onayDurumu ?? 0) : Colors.primary;
            return (
              <View key={bolum.title} style={styles.grupKapsayici}>
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

      {islemYapiliyor && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
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
  adminBarText: { color: '#fff', fontSize: 12, fontWeight: '600' },

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

  silBtn: {
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    borderRadius: 10,
    marginLeft: 6,
    gap: 2,
  },
  silBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
