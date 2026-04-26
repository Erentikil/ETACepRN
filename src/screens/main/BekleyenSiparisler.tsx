import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { bekleyenSiparisleriAl } from '../../api/hizliIslemlerApi';
import { useColors } from '../../contexts/ThemeContext';
import { useT } from '../../i18n/I18nContext';
import { toast } from '../../components/Toast';
import { paraTL, miktarFormat } from '../../utils/format';
import type { BekleyenSiparisBilgileri, CariKartBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';
import SkeletonLoader from '../../components/SkeletonLoader';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<DrawerParamList, 'BekleyenSiparisler'>;

function formatTarih(tarih: string): string {
  try {
    const d = new Date(tarih);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return tarih;
  }
}

export default function BekleyenSiparisler() {
  const Colors = useColors();
  const t = useT();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { calisilanSirket, pendingCari, clearPendingCari } = useAppStore();

  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [siparisler, setSiparisler] = useState<BekleyenSiparisBilgileri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  // CariSecim'den dönünce seçilen cariyi al (route params — "+" butonu akışı)
  useEffect(() => {
    if (route.params?.secilenCari) {
      setSecilenCari(route.params.secilenCari);
    }
  }, [route.params?.secilenCari]);

  // CariSecim'den geri dönünce (pendingCari — normal seçim akışı)
  useFocusEffect(
    useCallback(() => {
      if (pendingCari?.target === 'BekleyenSiparisler') {
        setSecilenCari(pendingCari.cari);
        clearPendingCari();
      }
    }, [pendingCari])
  );

  const siparisleriYukle = useCallback(async (cari: CariKartBilgileri) => {
    setYukleniyor(true);
    try {
      const sonuc = await bekleyenSiparisleriAl(cari.cariKodu, calisilanSirket);
      if (sonuc.sonuc) {
        setSiparisler(sonuc.data ?? []);
      } else {
        toast.error(sonuc.mesaj || t('bekleyen.siparisAlinamadi'));
      }
    } catch {
      toast.error(t('common.baglantiHatasi'));
    } finally {
      setYukleniyor(false);
    }
  }, [calisilanSirket]);

  // Cari seçilince otomatik yükle
  useEffect(() => {
    if (secilenCari) {
      siparisleriYukle(secilenCari);
    }
  }, [secilenCari]);

  const cariSec = () => {
    navigation.navigate('CariSecim', { returnScreen: 'BekleyenSiparisler' });
  };

  const renderSiparis = ({ item }: { item: BekleyenSiparisBilgileri }) => {
    const tamamlandi = item.kalanMiktar === 0;
    return (
      <View style={[styles.kart, { backgroundColor: Colors.card }, tamamlandi && { backgroundColor: '#f0fdf4' }]}>
        <View style={styles.kartUst}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stokKodu, { color: Colors.textSecondary }]}>{item.stokKodu}</Text>
            <Text style={[styles.stokCinsi, { color: Colors.text }]} numberOfLines={2}>{item.stokCinsi}</Text>
          </View>
          <View style={[styles.tarihBadge, { backgroundColor: `${Colors.primary}18` }]}>
            <Text style={[styles.tarihText, { color: Colors.primary }]}>{formatTarih(item.tarih)}</Text>
          </View>
        </View>

        <View style={[styles.satirlar, { backgroundColor: Colors.background, borderBottomColor: Colors.border }]}>
          <MiktarSatiri
            etiket="Sipariş"
            deger={item.siparisMiktari}
            birim={item.birim}
            renk={Colors.text}
            etiketRenk={Colors.textSecondary}
            borderRenk={Colors.border}
          />
          <MiktarSatiri
            etiket="Teslim Edilen"
            deger={item.teslimEdilenMiktar}
            birim={item.birim}
            renk="#43a047"
            etiketRenk={Colors.textSecondary}
            borderRenk={Colors.border}
          />
          <MiktarSatiri
            etiket="Kalan"
            deger={item.kalanMiktar}
            birim={item.birim}
            renk={tamamlandi ? '#43a047' : '#e53935'}
            etiketRenk={Colors.textSecondary}
            borderRenk={Colors.border}
          />
        </View>

        <View style={styles.kartAlt}>
          <Text style={[styles.fiyatText, { color: Colors.textSecondary }]}>
            {paraTL(item.fiyat)} / {item.birim}
          </Text>
          <Text style={[styles.tutarText, { color: Colors.primary }]}>
            Tutar: {paraTL(item.tutar)}
          </Text>
        </View>

        {tamamlandi && (
          <View style={styles.tamamBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#43a047" />
            <Text style={styles.tamamText}>{t('bekleyen.tamamlandi')}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      {/* Cari seçim */}
      {route.params?.kaynakEkran !== 'CariSecim' && route.params?.kaynakEkran !== 'Tahsilatlar' && <TouchableOpacity style={[styles.cariBtn, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]} onPress={cariSec}>
        <Ionicons
          name="person-outline"
          size={18}
          color={secilenCari ? Colors.primary : Colors.textSecondary}
        />
        <Text style={[styles.cariText, { color: Colors.textSecondary }, secilenCari && { color: Colors.text, fontWeight: '600' }]}>
          {secilenCari ? secilenCari.cariUnvan : t('stok.cariSeciniz')}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
      </TouchableOpacity>}

      {/* Özet bilgi */}
      {secilenCari && !yukleniyor && siparisler.length > 0 && (
        <View style={[styles.ozetBar, { backgroundColor: Colors.primary }]}>
          <Text style={styles.ozetText}>
            {siparisler.length} sipariş satırı
          </Text>
          <Text style={styles.ozetText}>
            Bekleyen: {siparisler.filter((s) => s.kalanMiktar > 0).length}
          </Text>
        </View>
      )}

      {!secilenCari ? (
        <View style={styles.bosEkran}>
          <Ionicons name="person-add-outline" size={56} color={Colors.border} />
          <Text style={[styles.bosMetin, { color: Colors.textSecondary }]}>{t('bekleyen.siparisGormekIcin')}</Text>
          <TouchableOpacity style={[styles.cariSecBtn, { backgroundColor: Colors.primary }]} onPress={cariSec}>
            <Text style={styles.cariSecBtnText}>{t('bekleyen.cariSec')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={siparisler}
          keyExtractor={(item, idx) => `${item.stokKodu}-${idx}`}
          renderItem={renderSiparis}
          contentContainerStyle={styles.listePadding}
          ItemSeparatorComponent={() => <View style={styles.ayirac} />}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={() => secilenCari && siparisleriYukle(secilenCari)}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            yukleniyor ? (
              <SkeletonLoader satirSayisi={5} />
            ) : (
              <EmptyState icon="checkmark-done-circle-outline" baslik={t('bekleyen.siparisBulunamadi')} aciklama={t('bekleyen.siparisBulunamadiAciklama')} />
            )
          }
        />
      )}
    </View>
  );
}

function MiktarSatiri({
  etiket,
  deger,
  birim,
  renk,
  etiketRenk,
  borderRenk,
}: {
  etiket: string;
  deger: number;
  birim: string;
  renk: string;
  etiketRenk?: string;
  borderRenk?: string;
}) {
  return (
    <View style={[styles.miktarSatir, borderRenk ? { borderBottomColor: borderRenk } : undefined]}>
      <Text style={[styles.miktarEtiket, etiketRenk ? { color: etiketRenk } : undefined]}>{etiket}</Text>
      <Text style={[styles.miktarDeger, { color: renk }]}>
        {miktarFormat(deger)} {birim}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },

  cariBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  cariText: { flex: 1, fontSize: 14 },

  ozetBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  ozetText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },

  listePadding: { padding: 10, paddingTop: 8 },
  ayirac: { height: 8 },

  kart: {
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  kartUst: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  stokKodu: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  stokCinsi: { fontSize: 15, fontWeight: '700', marginTop: 2 },

  tarihBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tarihText: { fontSize: 11, fontWeight: '600' },

  satirlar: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  miktarSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  miktarEtiket: { fontSize: 13 },
  miktarDeger: { fontSize: 13, fontWeight: '700' },

  kartAlt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fiyatText: { fontSize: 13 },
  tutarText: { fontSize: 14, fontWeight: '700' },

  tamamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  tamamText: { fontSize: 12, color: '#43a047', fontWeight: '600' },

  bosEkran: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  bosMetin: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  cariSecBtn: {
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 4,
  },
  cariSecBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
