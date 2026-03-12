import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { evrakKaydet } from '../../api/hizliIslemlerApi';
import { Colors } from '../../constants/Colors';
import { EvrakTipi, AlimSatim } from '../../models';
import type { SepetKalem, SepetBaslik } from '../../models';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'SepetListesi'>;

function evrakTipiAdi(tipi: EvrakTipi, alSat: AlimSatim): string {
  const tipler: Record<number, string> = {
    [EvrakTipi.Fatura]:   'Fatura',
    [EvrakTipi.Irsaliye]: 'İrsaliye',
    [EvrakTipi.Siparis]:  'Sipariş',
    [EvrakTipi.Stok]:     'Stok',
  };
  const alSatlar: Record<number, string> = {
    [AlimSatim.Alim]:  'Alış',
    [AlimSatim.Satim]: 'Satış',
    [AlimSatim.Sayim]: 'Sayım',
  };
  if (tipi === EvrakTipi.Stok && alSat === AlimSatim.Alim) return 'Stok Giriş';
  if (tipi === EvrakTipi.Stok && alSat === AlimSatim.Satim) return 'Stok Çıkış';
  return `${tipler[tipi] ?? ''} ${alSatlar[alSat] ?? ''}`.trim();
}

function kalemHesapla(k: SepetKalem, kdvDurum: number) {
  const kdvHaric =
    k.miktar *
    k.birimFiyat *
    (1 - k.kalemIndirim1 / 100) *
    (1 - k.kalemIndirim2 / 100) *
    (1 - k.kalemIndirim3 / 100);
  const kdvTutar = kdvHaric * (k.kdvOrani / 100);
  const kalemToplam = kdvDurum === 1 ? kdvHaric : kdvHaric + kdvTutar;
  return { kdvHaric, kdvTutar, kalemToplam };
}

export default function SepetListesi() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { yetkiBilgileri, calisilanSirket } = useAppStore();

  const [sepet, setSepet] = useState<SepetBaslik>(route.params.sepet);
  const [kaydetYukleniyor, setKaydetYukleniyor] = useState(false);

  const kdvDurum = yetkiBilgileri?.kdvDurum ?? 0;

  // Toplamlar
  const toplamKdvHaric = sepet.kalemler.reduce((t, k) => t + kalemHesapla(k, kdvDurum).kdvHaric, 0);
  const toplamKdv = sepet.kalemler.reduce((t, k) => t + kalemHesapla(k, kdvDurum).kdvTutar, 0);
  const genelToplam = sepet.kalemler.reduce((t, k) => t + kalemHesapla(k, kdvDurum).kalemToplam, 0);

  const kalemSil = (stokKodu: string) => {
    setSepet((prev) => ({
      ...prev,
      kalemler: prev.kalemler.filter((k) => k.stokKodu !== stokKodu),
    }));
  };

  const handleKaydet = async () => {
    if (sepet.kalemler.length === 0) {
      Alert.alert('Uyarı', 'Sepet boş.');
      return;
    }
    setKaydetYukleniyor(true);
    try {
      const sonuc = await evrakKaydet(sepet, calisilanSirket);
      if (sonuc.sonuc) {
        Alert.alert('Başarılı', sonuc.mesaj || 'Evrak kaydedildi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Hata', sonuc.mesaj || 'Evrak kaydedilemedi.');
      }
    } catch {
      Alert.alert('Hata', 'Evrak kaydedilirken bir hata oluştu.');
    } finally {
      setKaydetYukleniyor(false);
    }
  };

  const renderKalem = ({ item }: { item: SepetKalem }) => {
    const { kdvHaric, kdvTutar, kalemToplam } = kalemHesapla(item, kdvDurum);
    const indirimVar = item.kalemIndirim1 > 0 || item.kalemIndirim2 > 0 || item.kalemIndirim3 > 0;
    return (
      <View style={styles.kalemKart}>
        <View style={styles.kalemUst}>
          <View style={styles.kalemBilgi}>
            <Text style={styles.kalemKodu}>{item.stokKodu}</Text>
            <Text style={styles.kalemCinsi}>{item.stokCinsi}</Text>
          </View>
          <TouchableOpacity onPress={() => kalemSil(item.stokKodu)} style={styles.silBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
        <View style={styles.kalemAlt}>
          <Text style={styles.kalemMiktar}>
            {item.miktar.toFixed(2)} {item.birim} × {item.birimFiyat.toFixed(2)} ₺
          </Text>
          {indirimVar && (
            <Text style={styles.kalemIndirim}>
              İnd: {item.kalemIndirim1}% / {item.kalemIndirim2}% / {item.kalemIndirim3}%
            </Text>
          )}
          <View style={styles.kalemSatirlar}>
            {kdvDurum !== -1 && (
              <Text style={styles.kalemKdvHaric}>KDV Hariç: {kdvHaric.toFixed(2)} ₺</Text>
            )}
            {kdvDurum !== -1 && (
              <Text style={styles.kalemKdv}>KDV %{item.kdvOrani}: {kdvTutar.toFixed(2)} ₺</Text>
            )}
            <Text style={styles.kalemToplam}>{kalemToplam.toFixed(2)} ₺</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.ekran}>
      {/* Evrak bilgi kartı */}
      <View style={styles.evrakKart}>
        <View style={styles.evrakRow}>
          <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
          <Text style={styles.evrakTipiText}>
            {evrakTipiAdi(sepet.evrakTipi, sepet.alimSatim)}
          </Text>
          {sepet.fisTipiAdi ? (
            <Text style={styles.fisTipiText}>· {sepet.fisTipiAdi}</Text>
          ) : null}
        </View>
        <View style={styles.evrakRow}>
          <Ionicons name="person-outline" size={16} color={Colors.gray} />
          <Text style={styles.cariText}>
            {sepet.cariUnvan || <Text style={{ color: Colors.gray }}>Cari seçilmedi</Text>}
          </Text>
        </View>
      </View>

      {/* Kalemler listesi */}
      <FlatList
        data={sepet.kalemler}
        keyExtractor={(item, idx) => item.stokKodu || String(idx)}
        renderItem={renderKalem}
        contentContainerStyle={styles.listePadding}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.bosEkran}>
            <Ionicons name="cart-outline" size={48} color={Colors.border} />
            <Text style={styles.bosMetin}>Sepet boş</Text>
          </View>
        }
      />

      {/* Alt toplam kartı */}
      {sepet.kalemler.length > 0 && (
        <View style={styles.toplamKart}>
          {kdvDurum !== -1 && (
            <View style={styles.toplamSatir}>
              <Text style={styles.toplamEtiket}>KDV Hariç Toplam</Text>
              <Text style={styles.toplamDeger}>{toplamKdvHaric.toFixed(2)} ₺</Text>
            </View>
          )}
          {kdvDurum !== -1 && (
            <View style={styles.toplamSatir}>
              <Text style={styles.toplamEtiket}>KDV Toplam</Text>
              <Text style={styles.toplamDeger}>{toplamKdv.toFixed(2)} ₺</Text>
            </View>
          )}
          <View style={[styles.toplamSatir, styles.genelToplamSatir]}>
            <Text style={styles.genelToplamEtiket}>GENEL TOPLAM</Text>
            <Text style={styles.genelToplamDeger}>{genelToplam.toFixed(2)} ₺</Text>
          </View>
        </View>
      )}

      {/* Kaydet butonu */}
      <TouchableOpacity
        style={[styles.kaydetBtn, (kaydetYukleniyor || sepet.kalemler.length === 0) && styles.kaydetBtnPasif]}
        onPress={handleKaydet}
        disabled={kaydetYukleniyor || sepet.kalemler.length === 0}
      >
        <Ionicons name="save-outline" size={20} color={Colors.white} />
        <Text style={styles.kaydetBtnText}>
          {kaydetYukleniyor ? 'KAYDEDİLİYOR...' : 'KAYDET'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: '#f5f5f5' },
  evrakKart: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 6,
  },
  evrakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  evrakTipiText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  fisTipiText: { fontSize: 13, color: Colors.darkGray },
  cariText: { fontSize: 14, color: Colors.darkGray, flex: 1 },
  listePadding: { padding: 10, paddingBottom: 4 },
  kalemKart: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kalemUst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  kalemBilgi: { flex: 1 },
  kalemKodu: { fontSize: 11, color: Colors.gray, fontWeight: '600' },
  kalemCinsi: { fontSize: 15, fontWeight: '600', color: Colors.darkGray, marginTop: 2 },
  silBtn: { padding: 4 },
  kalemAlt: { gap: 3 },
  kalemMiktar: { fontSize: 13, color: Colors.darkGray },
  kalemIndirim: { fontSize: 12, color: Colors.accent ?? '#ffa500' },
  kalemSatirlar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  kalemKdvHaric: { fontSize: 12, color: Colors.gray },
  kalemKdv: { fontSize: 12, color: Colors.gray },
  kalemToplam: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginLeft: 'auto' },
  bosEkran: { alignItems: 'center', paddingTop: 60, gap: 12 },
  bosMetin: { fontSize: 14, color: Colors.gray },
  toplamKart: {
    backgroundColor: Colors.white,
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  toplamSatir: { flexDirection: 'row', justifyContent: 'space-between' },
  toplamEtiket: { fontSize: 14, color: Colors.darkGray },
  toplamDeger: { fontSize: 14, color: Colors.darkGray, fontWeight: '500' },
  genelToplamSatir: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
    paddingTop: 8,
  },
  genelToplamEtiket: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  genelToplamDeger: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  kaydetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    margin: 10,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  kaydetBtnPasif: { opacity: 0.5 },
  kaydetBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
});
