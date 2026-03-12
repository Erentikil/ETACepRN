import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { stokListesiniAl } from '../../api/hizliIslemlerApi';
import UrunMiktariBelirleModal from '../../components/UrunMiktariBelirleModal';
import { Colors } from '../../constants/Colors';
import { EvrakTipi, AlimSatim } from '../../models';
import type {
  StokListesiBilgileri,
  CariKartBilgileri,
  SepetKalem,
  SepetBaslik,
  FisTipiBaslik,
} from '../../models';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<DrawerParamList, 'HizliIslemler'>;

// MAUI'deki evrak tipi seçenekleri
type EvrakSecenegi = {
  label: string;
  evrakTipi: EvrakTipi;
  alimSatim: AlimSatim;
  evrakTipiAdi: string; // "Fatura" | "İrsaliye" | "Sipariş" | "Stok"
  alimSatimAdi: string; // "Alış" | "Satış" | "Giriş" | "Çıkış" | "Sayım"
};

const TUM_SECENEKLER: EvrakSecenegi[] = [
  { label: 'Fatura Satış',   evrakTipi: EvrakTipi.Fatura,   alimSatim: AlimSatim.Satim,  evrakTipiAdi: 'Fatura',   alimSatimAdi: 'Satış' },
  { label: 'Fatura Alış',    evrakTipi: EvrakTipi.Fatura,   alimSatim: AlimSatim.Alim,   evrakTipiAdi: 'Fatura',   alimSatimAdi: 'Alış' },
  { label: 'İrsaliye Satış', evrakTipi: EvrakTipi.Irsaliye, alimSatim: AlimSatim.Satim,  evrakTipiAdi: 'İrsaliye', alimSatimAdi: 'Satış' },
  { label: 'İrsaliye Alış',  evrakTipi: EvrakTipi.Irsaliye, alimSatim: AlimSatim.Alim,   evrakTipiAdi: 'İrsaliye', alimSatimAdi: 'Alış' },
  { label: 'Sipariş Satış',  evrakTipi: EvrakTipi.Siparis,  alimSatim: AlimSatim.Satim,  evrakTipiAdi: 'Sipariş',  alimSatimAdi: 'Satış' },
  { label: 'Sipariş Alış',   evrakTipi: EvrakTipi.Siparis,  alimSatim: AlimSatim.Alim,   evrakTipiAdi: 'Sipariş',  alimSatimAdi: 'Alış' },
  { label: 'Stok Giriş',     evrakTipi: EvrakTipi.Stok,     alimSatim: AlimSatim.Alim,   evrakTipiAdi: 'Stok',     alimSatimAdi: 'Giriş' },
  { label: 'Stok Çıkış',     evrakTipi: EvrakTipi.Stok,     alimSatim: AlimSatim.Satim,  evrakTipiAdi: 'Stok',     alimSatimAdi: 'Çıkış' },
  { label: 'Sayım',          evrakTipi: EvrakTipi.Stok,     alimSatim: AlimSatim.Sayim,  evrakTipiAdi: 'Stok',     alimSatimAdi: 'Sayım' },
];

function defaultEvrakSecenek(defaultEvrakTipi: string): EvrakSecenegi {
  switch (defaultEvrakTipi) {
    case 'Fatura':   return TUM_SECENEKLER[0];
    case 'İrsaliye': return TUM_SECENEKLER[2];
    case 'Sipariş':  return TUM_SECENEKLER[4];
    case 'Stok':     return TUM_SECENEKLER[6];
    default:         return TUM_SECENEKLER[0];
  }
}

function sepetToplamHesapla(kalemler: SepetKalem[], kdvDurum: number): number {
  return kalemler.reduce((toplam, k) => {
    const kdvHaric =
      k.miktar *
      k.birimFiyat *
      (1 - k.kalemIndirim1 / 100) *
      (1 - k.kalemIndirim2 / 100) *
      (1 - k.kalemIndirim3 / 100);
    const kdv = kdvHaric * (k.kdvOrani / 100);
    return toplam + (kdvDurum === 1 ? kdvHaric : kdvHaric + kdv);
  }, 0);
}

export default function HizliIslemler() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();

  const { yetkiBilgileri, ftBaslikListesi, calisilanSirket } = useAppStore();

  const [stokListesi, setStokListesi] = useState<StokListesiBilgileri[]>([]);
  const [filtreli, setFiltreli] = useState<StokListesiBilgileri[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [secilenEvrak, setSecilenEvrak] = useState<EvrakSecenegi>(
    defaultEvrakSecenek(yetkiBilgileri?.defaultEvrakTipi ?? 'Fatura')
  );
  const [seciliFisTipi, setSeciliFisTipi] = useState<FisTipiBaslik | null>(null);
  const [sepetKalemleri, setSepetKalemleri] = useState<SepetKalem[]>([]);
  const [modalUrunu, setModalUrunu] = useState<StokListesiBilgileri | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  // CariSecim'den geri dönünce seçilen cariyi al
  useEffect(() => {
    if (route.params?.secilenCari) {
      setSecilenCari(route.params.secilenCari);
    }
  }, [route.params?.secilenCari]);

  // İlk yüklemede ve evrak tipi değişince stok listesini çek
  const stokListesiniYukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const sonuc = await stokListesiniAl(yetkiBilgileri?.kullaniciKodu ?? '', calisilanSirket);
      
      if (sonuc.sonuc) {
        setStokListesi(sonuc.data);
        setFiltreli(sonuc.data);
      } else {
        Alert.alert('Hata', sonuc.mesaj || 'Stok listesi alınamadı.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Stok listesi yüklenirken bir hata oluştu.');
    } finally {
      setYukleniyor(false);
    }
  }, [calisilanSirket, yetkiBilgileri?.kullaniciKodu]);

  useEffect(() => {
    // İlk yükleme: ftBaslikListesi'nden eşleşen fiş tipini seç
    const eslesen = ftBaslikListesi.find(
      (f) =>
        f.evrakTipi === secilenEvrak.evrakTipi &&
        f.alimSatim === secilenEvrak.alimSatim
    );
    setSeciliFisTipi(eslesen ?? null);
    stokListesiniYukle();
  }, [secilenEvrak]);

  // Arama filtresi
  useEffect(() => {
    if (!aramaMetni.trim()) {
      setFiltreli(stokListesi);
      return;
    }
    const q = aramaMetni.toLowerCase();
    setFiltreli(
      stokListesi.filter(
        (s) =>
          s.stokKodu.toLowerCase().includes(q) ||
          s.stokCinsi.toLowerCase().includes(q) ||
          s.barkod.toLowerCase().includes(q)
      )
    );
  }, [aramaMetni, stokListesi]);

  // Evrak tipi seçimi ActionSheet
  const evrakTipiSec = () => {
    if (!yetkiBilgileri) return;
    const izinli = TUM_SECENEKLER.filter((s) => {
      if (s.evrakTipi === EvrakTipi.Fatura   && !yetkiBilgileri.faturaYetkisi)      return false;
      if (s.evrakTipi === EvrakTipi.Irsaliye && !yetkiBilgileri.irsaliyeYetkisi)    return false;
      if (s.evrakTipi === EvrakTipi.Siparis  && !yetkiBilgileri.siparisAcmaYetkisi) return false;
      if (s.evrakTipi === EvrakTipi.Stok     && !yetkiBilgileri.stokYetkisi)        return false;
      return true;
    });

    Alert.alert(
      'Evrak Tipi Seçin',
      undefined,
      [
        ...izinli.map((s) => ({
          text: s.label,
          onPress: () => {
            setSecilenEvrak(s);
            setSepetKalemleri([]); // evrak tipi değişince sepeti sıfırla
          },
        })),
        { text: 'Vazgeç', style: 'cancel' as const },
      ]
    );
  };

  // Sepete ekleme
  const kalemEkle = (kalem: SepetKalem) => {
    setSepetKalemleri((prev) => {
      const idx = prev.findIndex((k) => k.stokKodu === kalem.stokKodu);
      if (idx >= 0) {
        const guncellenmis = [...prev];
        guncellenmis[idx] = {
          ...guncellenmis[idx],
          miktar: guncellenmis[idx].miktar + kalem.miktar,
        };
        return guncellenmis;
      }
      return [...prev, kalem];
    });
    setModalUrunu(null);
  };

  const sepetToplam = sepetToplamHesapla(sepetKalemleri, yetkiBilgileri?.kdvDurum ?? 0);

  const sepeteGit = () => {
    const sepet: SepetBaslik = {
      cariKodu: secilenCari?.cariKodu ?? '',
      cariUnvan: secilenCari?.cariUnvan ?? '',
      evrakTipi: secilenEvrak.evrakTipi,
      alimSatim: secilenEvrak.alimSatim,
      fisTipiBaslikNo: seciliFisTipi?.fisTipiBaslikNo ?? 0,
      fisTipiAdi: seciliFisTipi?.fisTipiBaslikAdi ?? secilenEvrak.label,
      kalemler: sepetKalemleri,
    };
    navigation.navigate('SepetListesi', { sepet });
  };

  const renderStokSatiri = ({ item }: { item: StokListesiBilgileri }) => (
    <TouchableOpacity style={styles.stokSatiri} onPress={() => setModalUrunu(item)}>
      <View style={styles.stokBilgi}>
        <Text style={styles.stokKodu}>{item.stokKodu}</Text>
        <Text style={styles.stokCinsi} numberOfLines={1}>{item.stokCinsi}</Text>
        {item.barkod ? (
          <Text style={styles.stokBarkod}>{item.barkod}</Text>
        ) : null}
      </View>
      <View style={styles.stokSag}>
        <Text style={styles.stokFiyat}>{item.fiyat.toFixed(2)} ₺</Text>
        <Text style={styles.stokBakiye}>{item.bakiye.toFixed(2)} {item.birim}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.ekran}>
      {/* Evrak tipi + Barkod */}
      <View style={styles.ustBar}>
        <TouchableOpacity style={styles.evrakTipiBtn} onPress={evrakTipiSec}>
          <Ionicons name="document-text-outline" size={18} color={Colors.white} />
          <Text style={styles.evrakTipiText}>{secilenEvrak.label}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.barkodBtn}
          onPress={() => Alert.alert('Barkod', 'Kamera entegrasyonu yakında eklenecek.')}
        >
          <Ionicons name="barcode-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Cari seçim */}
      <TouchableOpacity
        style={styles.cariBtn}
        onPress={() => navigation.navigate('CariSecim')}
      >
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

      {/* Arama */}
      <View style={styles.aramaRow}>
        <Ionicons name="search-outline" size={18} color={Colors.gray} style={styles.aramaIcon} />
        <TextInput
          style={styles.aramaInput}
          placeholder="Stok kodu, ürün adı veya barkod ara..."
          placeholderTextColor={Colors.gray}
          value={aramaMetni}
          onChangeText={setAramaMetni}
          returnKeyType="search"
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => setAramaMetni('')}>
            <Ionicons name="close-circle" size={18} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stok listesi başlık */}
      <View style={styles.listeBaslik}>
        <Text style={[styles.listeBaslikText, { flex: 1.2 }]}>KOD</Text>
        <Text style={[styles.listeBaslikText, { flex: 2 }]}>CİNS</Text>
        <Text style={[styles.listeBaslikText, { flex: 1, textAlign: 'right' }]}>FİYAT</Text>
      </View>

      {/* Stok listesi */}
      <FlatList
        data={filtreli}
        keyExtractor={(item, idx) => item.stokKodu || String(idx)}
        renderItem={renderStokSatiri}
        style={styles.liste}
        ItemSeparatorComponent={() => <View style={styles.ayirac} />}
        refreshControl={
          <RefreshControl refreshing={yukleniyor} onRefresh={stokListesiniYukle} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.bosEkran}>
            <Ionicons name="cube-outline" size={48} color={Colors.border} />
            <Text style={styles.bosMetin}>
              {yukleniyor ? 'Yükleniyor...' : 'Stok bulunamadı'}
            </Text>
          </View>
        }
      />

      {/* Sepet butonu */}
      <TouchableOpacity
        style={[styles.sepetBtn, sepetKalemleri.length === 0 && styles.sepetBtnPasif]}
        onPress={sepeteGit}
        disabled={sepetKalemleri.length === 0}
      >
        <Ionicons name="cart-outline" size={22} color={Colors.white} />
        <Text style={styles.sepetBtnText}>
          SEPET ({sepetToplam.toFixed(2)} ₺)
        </Text>
        {sepetKalemleri.length > 0 && (
          <View style={styles.sepetBadge}>
            <Text style={styles.sepetBadgeText}>{sepetKalemleri.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Miktar modal */}
      <UrunMiktariBelirleModal
        urun={modalUrunu}
        kdvDurum={yetkiBilgileri?.kdvDurum ?? 0}
        fiyatDegistirmeYetkisi={yetkiBilgileri?.fiyatDegistirmeYetkisi ?? false}
        kalemIndirimYetkisi={yetkiBilgileri?.kalemIndirimYapmaYetkisi ?? false}
        onConfirm={kalemEkle}
        onClose={() => setModalUrunu(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: Colors.lightGray ?? '#f5f5f5' },
  ustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  evrakTipiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  evrakTipiText: {
    flex: 1,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  barkodBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
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
  cariText: {
    flex: 1,
    fontSize: 14,
    color: Colors.gray,
  },
  cariTextSecili: {
    color: Colors.darkGray,
    fontWeight: '600',
  },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  aramaIcon: { marginRight: 2 },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.black,
    paddingVertical: 2,
  },
  listeBaslik: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    marginHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  listeBaslikText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  liste: { flex: 1, paddingHorizontal: 10 },
  stokSatiri: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  stokBilgi: { flex: 3.2 },
  stokKodu: { fontSize: 11, color: Colors.gray, fontWeight: '600' },
  stokCinsi: { fontSize: 14, color: Colors.darkGray, fontWeight: '500', marginTop: 2 },
  stokBarkod: { fontSize: 11, color: Colors.gray, marginTop: 1 },
  stokSag: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  stokFiyat: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  stokBakiye: { fontSize: 11, color: Colors.gray, marginTop: 2 },
  ayirac: { height: 4 },
  bosEkran: { alignItems: 'center', paddingTop: 60, gap: 12 },
  bosMetin: { fontSize: 14, color: Colors.gray },
  sepetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    margin: 10,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  sepetBtnPasif: { opacity: 0.5 },
  sepetBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sepetBadge: {
    backgroundColor: Colors.accent ?? '#ffa500',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  sepetBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
});
