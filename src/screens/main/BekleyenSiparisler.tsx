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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { bekleyenSiparisleriAl } from '../../api/hizliIslemlerApi';
import { Colors } from '../../constants/Colors';
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
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { calisilanSirket } = useAppStore();

  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [siparisler, setSiparisler] = useState<BekleyenSiparisBilgileri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  // CariSecim'den dönünce seçilen cariyi al
  useEffect(() => {
    if (route.params?.secilenCari) {
      setSecilenCari(route.params.secilenCari);
    }
  }, [route.params?.secilenCari]);

  const siparisleriYukle = useCallback(async (cari: CariKartBilgileri) => {
    setYukleniyor(true);
    try {
      const sonuc = await bekleyenSiparisleriAl(cari.cariKodu, calisilanSirket);
      if (sonuc.sonuc) {
        setSiparisler(sonuc.data ?? []);
      } else {
        toast.error(sonuc.mesaj || 'Siparişler alınamadı.');
      }
    } catch {
      toast.error('Bağlantı hatası oluştu.');
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
      <View style={[styles.kart, tamamlandi && styles.kartTamamlandi]}>
        <View style={styles.kartUst}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stokKodu}>{item.stokKodu}</Text>
            <Text style={styles.stokCinsi} numberOfLines={2}>{item.stokCinsi}</Text>
          </View>
          <View style={styles.tarihBadge}>
            <Text style={styles.tarihText}>{formatTarih(item.tarih)}</Text>
          </View>
        </View>

        <View style={styles.satirlar}>
          <MiktarSatiri
            etiket="Sipariş"
            deger={item.siparisMiktari}
            birim={item.birim}
            renk={Colors.darkGray}
          />
          <MiktarSatiri
            etiket="Teslim Edilen"
            deger={item.teslimEdilenMiktar}
            birim={item.birim}
            renk="#43a047"
          />
          <MiktarSatiri
            etiket="Kalan"
            deger={item.kalanMiktar}
            birim={item.birim}
            renk={tamamlandi ? '#43a047' : '#e53935'}
          />
        </View>

        <View style={styles.kartAlt}>
          <Text style={styles.fiyatText}>
            {paraTL(item.fiyat)} / {item.birim}
          </Text>
          <Text style={styles.tutarText}>
            Tutar: {paraTL(item.tutar)}
          </Text>
        </View>

        {tamamlandi && (
          <View style={styles.tamamBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#43a047" />
            <Text style={styles.tamamText}>Tamamlandı</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.ekran}>
      {/* Cari seçim */}
      <TouchableOpacity style={styles.cariBtn} onPress={cariSec}>
        <Ionicons
          name="person-outline"
          size={18}
          color={secilenCari ? Colors.primary : Colors.gray}
        />
        <Text style={[styles.cariText, secilenCari && styles.cariTextSecili]}>
          {secilenCari ? secilenCari.cariUnvan : 'Lütfen cari seçiniz...'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
      </TouchableOpacity>

      {/* Özet bilgi */}
      {secilenCari && !yukleniyor && siparisler.length > 0 && (
        <View style={styles.ozetBar}>
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
          <Text style={styles.bosMetin}>Bekleyen siparişleri görmek için{'\n'}bir cari seçiniz</Text>
          <TouchableOpacity style={styles.cariSecBtn} onPress={cariSec}>
            <Text style={styles.cariSecBtnText}>Cari Seç</Text>
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
              <EmptyState icon="checkmark-done-circle-outline" baslik="Bekleyen sipariş bulunamadı" aciklama="Bu cari için bekleyen sipariş bulunmamaktadır" />
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
}: {
  etiket: string;
  deger: number;
  birim: string;
  renk: string;
}) {
  return (
    <View style={styles.miktarSatir}>
      <Text style={styles.miktarEtiket}>{etiket}</Text>
      <Text style={[styles.miktarDeger, { color: renk }]}>
        {miktarFormat(deger)} {birim}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: '#f5f5f5' },

  cariBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cariText: { flex: 1, fontSize: 14, color: Colors.gray },
  cariTextSecili: { color: Colors.darkGray, fontWeight: '600' },

  ozetBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kartTamamlandi: {
    backgroundColor: '#f0fdf4',
  },

  kartUst: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  stokKodu: { fontSize: 11, color: Colors.gray, fontWeight: '600', letterSpacing: 0.5 },
  stokCinsi: { fontSize: 15, fontWeight: '700', color: Colors.darkGray, marginTop: 2 },

  tarihBadge: {
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tarihText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  satirlar: {
    backgroundColor: '#f9f9f9',
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
    borderBottomColor: Colors.border,
  },
  miktarEtiket: { fontSize: 13, color: Colors.gray },
  miktarDeger: { fontSize: 13, fontWeight: '700' },

  kartAlt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fiyatText: { fontSize: 13, color: Colors.gray },
  tutarText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

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
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  cariSecBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 4,
  },
  cariSecBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
