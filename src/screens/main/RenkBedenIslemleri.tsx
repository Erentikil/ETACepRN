import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { stokListesiniAl } from '../../api/hizliIslemlerApi';
import { barkodBilgileriniAl, evrakRBKaydet } from '../../api/renkBedenApi';
import { generateGuid } from '../../api/hizliIslemlerApi';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import UrunMiktariBelirleModal from '../../components/UrunMiktariBelirleModal';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import StokInfoModal from '../../components/StokInfoModal';
import FisTipiDepoSecimModal from '../../components/FisTipiDepoSecimModal';
import type { FisTipiDepoSecimSonuc } from '../../components/FisTipiDepoSecimModal';
import RenkBedenSecimModal from '../../components/RenkBedenSecimModal';
import { Colors } from '../../constants/Colors';
import { paraTL, miktarFormat } from '../../utils/format';
import { EvrakTipi, AlimSatim } from '../../models';
import type {
  StokListesiBilgileri,
  CariKartBilgileri,
  SepetKalem,
  SepetRBKalem,
  SepetBaslik,
  FisTipiBaslik,
  BarkodBilgileri,
} from '../../models';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<DrawerParamList, 'RenkBedenIslemleri'>;

type EvrakSecenegi = {
  label: string;
  evrakTipi: EvrakTipi;
  alimSatim: AlimSatim;
  evrakTipiAdi: string;
  alimSatimAdi: string;
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

function rbSepetToplamHesapla(kalemler: SepetRBKalem[], kdvDurum: number): number {
  return kalemler.reduce((toplam, k) => {
    const kdvHaric =
      k.miktar *
      k.fiyat *
      (1 - k.kalemIndirim1 / 100) *
      (1 - k.kalemIndirim2 / 100) *
      (1 - k.kalemIndirim3 / 100);
    const kdv = kdvHaric * (k.kdvOrani / 100);
    return toplam + (kdvDurum === 1 ? kdvHaric : kdvHaric + kdv);
  }, 0);
}

export default function RenkBedenIslemleri() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();

  const { yetkiBilgileri, ftBaslikListesi, calisilanSirket } = useAppStore();

  // Stok ve barkod listeleri
  const [stokListesi, setStokListesi] = useState<StokListesiBilgileri[]>([]);
  const [barkodListesi, setBarkodListesi] = useState<BarkodBilgileri[]>([]);
  const [filtreli, setFiltreli] = useState<StokListesiBilgileri[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');

  // Evrak & cari
  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [secilenEvrak, setSecilenEvrak] = useState<EvrakSecenegi>(
    defaultEvrakSecenek(yetkiBilgileri?.defaultEvrakTipi ?? 'Fatura')
  );
  const [seciliFisTipi, setSeciliFisTipi] = useState<FisTipiBaslik | null>(null);
  const [secilenAnaDepo, setSecilenAnaDepo] = useState(yetkiBilgileri?.anaDepo ?? '');
  const [secilenKarsiDepo, setSecilenKarsiDepo] = useState(yetkiBilgileri?.karsiDepo ?? '');

  // Sepet (RB kalemler)
  const [sepetKalemleri, setSepetKalemleri] = useState<SepetRBKalem[]>([]);

  // UI state
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kayitYapiliyor, setKayitYapiliyor] = useState(false);
  const [scannerAcik, setScannerAcik] = useState(false);
  const [infoStoku, setInfoStoku] = useState<StokListesiBilgileri | null>(null);
  const [pendingEvrak, setPendingEvrak] = useState<EvrakSecenegi | null>(null);

  // Renk-beden seçim modal
  const [rbModalStok, setRbModalStok] = useState<StokListesiBilgileri | null>(null);

  // Miktar modal — seçilen variant ile birlikte
  const [miktarModalStok, setMiktarModalStok] = useState<StokListesiBilgileri | null>(null);
  const [pendingVariant, setPendingVariant] = useState<BarkodBilgileri | null>(null);
  const [miktarliGiris, setMiktarliGiris] = useState(false);

  const sepetKalemlerRef = useRef(sepetKalemleri);
  useEffect(() => { sepetKalemlerRef.current = sepetKalemleri; }, [sepetKalemleri]);

  // Sayfaya girilince sıfırla (sepet boşsa)
  useFocusEffect(
    useCallback(() => {
      if (sepetKalemlerRef.current.length > 0) return;
      setSecilenCari(null);
      setSecilenEvrak(defaultEvrakSecenek(yetkiBilgileri?.defaultEvrakTipi ?? 'Fatura'));
      setSeciliFisTipi(null);
      setSepetKalemleri([]);
      setAramaMetni('');
      setSecilenAnaDepo(yetkiBilgileri?.anaDepo ?? '');
      setSecilenKarsiDepo(yetkiBilgileri?.karsiDepo ?? '');
    }, [yetkiBilgileri])
  );

  // CariSecim'den geri dönünce
  useEffect(() => {
    if (route.params?.secilenCari) {
      setSecilenCari(route.params.secilenCari);
    }
  }, [route.params?.secilenCari]);

  // Veri yükleme
  const verileriYukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [stokSonuc, barkodSonuc] = await Promise.all([
        stokListesiniAl(yetkiBilgileri?.kullaniciKodu ?? '', calisilanSirket),
        barkodBilgileriniAl(yetkiBilgileri?.kullaniciKodu ?? '', calisilanSirket),
      ]);

      if (stokSonuc.sonuc) {
        setStokListesi(stokSonuc.data ?? []);
        setFiltreli(stokSonuc.data ?? []);
        

      } else {
        Alert.alert('Hata', stokSonuc.mesaj || 'Stok listesi alınamadı.');
      }

      if (barkodSonuc.sonuc) {
        setBarkodListesi(barkodSonuc.data ?? []);
      } else {
        Alert.alert('Hata', barkodSonuc.mesaj || 'Barkod listesi alınamadı.');
      }
    } catch (e: any) {
      Alert.alert('Hata', `Veriler yüklenirken bir hata oluştu.\n\n${e?.message ?? e}`);
    } finally {
      setYukleniyor(false);
    }
  }, [calisilanSirket, yetkiBilgileri?.kullaniciKodu]);

  useEffect(() => {
    const eslesen = ftBaslikListesi.find(
      (f) =>
        f.evrakTipi === secilenEvrak.evrakTipiAdi &&
        f.alimSatim.trim() === secilenEvrak.alimSatimAdi
    );
    setSeciliFisTipi(eslesen ?? null);
    verileriYukle();
  }, [secilenEvrak]);

  // Arama filtresi
  useEffect(() => {
    if (!aramaMetni.trim()) {
      setFiltreli(stokListesi);
      return;
    }
    const q = aramaMetni.toLowerCase();
    // Önce stok kodu/cinsi/barkod ile ara
    let sonuc = stokListesi.filter(
      (s) =>
        s.stokKodu.toLowerCase().includes(q) ||
        s.stokCinsi.toLowerCase().includes(q) ||
        s.barkod.toLowerCase().includes(q)
    );
    // Bulunamazsa barkod tablosunda ara
    if (sonuc.length === 0) {
      const eslesen = barkodListesi
        .filter((b) => b.barkod.toLowerCase().includes(q))
        .map((b) => b.stokKodu);
      if (eslesen.length > 0) {
        const stokKodlari = new Set(eslesen);
        sonuc = stokListesi.filter((s) => stokKodlari.has(s.stokKodu));
      }
    }
    setFiltreli(sonuc);
  }, [aramaMetni, stokListesi, barkodListesi]);

  // Evrak tipi seçimi
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
            setPendingEvrak(s);
            setSepetKalemleri([]);
          },
        })),
        { text: 'Vazgeç', style: 'cancel' as const },
      ]
    );
  };

  // Fiş tipi + depo modal onay
  const handleFisTipiDepoConfirm = (sonuc: FisTipiDepoSecimSonuc) => {
    if (!pendingEvrak) return;
    setSecilenEvrak(pendingEvrak);
    {
      const eslesen = ftBaslikListesi.find(
        (f) => f.evrakTipi === pendingEvrak.evrakTipiAdi && f.alimSatim.trim() === pendingEvrak.alimSatimAdi
      );
      setSeciliFisTipi(eslesen ? {
        ...eslesen,
        ft: eslesen.ftListe.find((ft) => ft.fisTipiKodu === sonuc.fisTipiKodu) ?? eslesen.ft,
      } : null);
    }
    setSecilenAnaDepo(sonuc.anaDepo);
    setSecilenKarsiDepo(sonuc.karsiDepo);
    setPendingEvrak(null);
  };

  // Stok tıklandığında → renk-beden modal aç
  const stokSecildi = (item: StokListesiBilgileri) => {
    if (!secilenCari) {
      Alert.alert('Uyarı', 'Sepete ürün eklemeden önce lütfen cari seçiniz.');
      return;
    }
    // Bu stok için barkod/variant var mı kontrol et
    const variantlar = barkodListesi.filter((b) => b.stokKodu === item.stokKodu);
    if (variantlar.length === 0) {
      Alert.alert('Uyarı', 'Bu stok için renk-beden kaydı bulunamadı.');
      return;
    }
    setRbModalStok(item);
  };

  // Renk-beden variant seçildi
  const variantSecildi = (variant: BarkodBilgileri) => {
    if (!rbModalStok) return;

    if (miktarliGiris) {
      // Miktarlı giriş açıksa → miktar modalı aç
      setPendingVariant(variant);
      // Stok bilgilerini variant ile birleştirip miktarModalStok olarak set et
      setMiktarModalStok({
        ...rbModalStok,
        barkod: variant.barkod,
        carpan: variant.katsayi || 1,
      });
      setRbModalStok(null);
    } else {
      // Hızlı ekleme → miktar=1
      rbSepeteEkle(rbModalStok, variant, 1);
      setRbModalStok(null);
    }
  };

  // RB sepete ekleme
  const rbSepeteEkle = (
    stok: StokListesiBilgileri,
    variant: BarkodBilgileri,
    miktar: number,
    fiyatOverride?: number,
    ind1 = 0, ind2 = 0, ind3 = 0
  ) => {
    const kalem: SepetRBKalem = {
      stokKodu: stok.stokKodu,
      stokCinsi: stok.stokCinsi,
      barkod: variant.barkod,
      birim: stok.birim,
      miktar,
      fiyat: fiyatOverride ?? stok.fiyat,
      kdvOrani: stok.kdvOrani,
      kalemIndirim1: ind1,
      kalemIndirim2: ind2,
      kalemIndirim3: ind3,
      renkKodu: variant.renkKodu,
      bedenKodu: variant.bedenKodu,
      renk: variant.renk,
      beden: variant.beden,
      carpan: variant.katsayi || 1,
      dovizKodu: '',
      dovizTuru: '',
      dovizKuru: 0,
      fiyatNo: 0,
      bakiye: 0,
      guidID: '',
    };

    setSepetKalemleri((prev) => {
      // Aynı barkod + renkKodu + bedenKodu varsa miktarı artır
      const idx = prev.findIndex(
        (k) => k.barkod === kalem.barkod && k.renkKodu === kalem.renkKodu && k.bedenKodu === kalem.bedenKodu
      );
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
  };

  // Miktar modalından onay
  const handleMiktarConfirm = (kalem: SepetKalem) => {
    if (!pendingVariant || !miktarModalStok) return;
    rbSepeteEkle(
      miktarModalStok,
      pendingVariant,
      kalem.miktar,
      kalem.birimFiyat,
      kalem.kalemIndirim1,
      kalem.kalemIndirim2,
      kalem.kalemIndirim3
    );
    setMiktarModalStok(null);
    setPendingVariant(null);
  };

  // Barkod tarandığında
  const barkodTarandi = (barkod: string) => {
    setScannerAcik(false);
    if (!secilenCari) {
      Alert.alert('Uyarı', 'Sepete ürün eklemeden önce lütfen cari seçiniz.');
      return;
    }

    // Önce barkod tablosunda ara
    const barkodKaydi = barkodListesi.find((b) => b.barkod === barkod);
    if (barkodKaydi) {
      const stok = stokListesi.find((s) => s.stokKodu === barkodKaydi.stokKodu);
      if (stok) {
        if (miktarliGiris) {
          setPendingVariant(barkodKaydi);
          setMiktarModalStok({
            ...stok,
            barkod: barkodKaydi.barkod,
            carpan: barkodKaydi.katsayi || 1,
          });
        } else {
          rbSepeteEkle(stok, barkodKaydi, 1);
        }
        return;
      }
    }

    // Stok barkodunda ara
    const stokBulunan = stokListesi.find((s) => s.barkod === barkod);
    if (stokBulunan) {
      stokSecildi(stokBulunan);
      return;
    }

    Alert.alert('Bulunamadı', `"${barkod}" barkodlu ürün bulunamadı.`);
  };

  // Sepet kalemi sil
  const kalemSil = (idx: number) => {
    setSepetKalemleri((prev) => prev.filter((_, i) => i !== idx));
  };

  // Evrak kaydet
  const evrakKaydetHandler = async () => {
    if (!secilenCari) {
      Alert.alert('Uyarı', 'Lütfen cari seçiniz.');
      return;
    }
    if (sepetKalemleri.length === 0) {
      Alert.alert('Uyarı', 'Sepette ürün bulunmuyor.');
      return;
    }

    Alert.alert(
      'Kaydet',
      `${sepetKalemleri.length} kalem ürün kaydedilecek. Onaylıyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: async () => {
            setKayitYapiliyor(true);
            try {
              const sepet: SepetBaslik = {
                cariKodu: secilenCari.cariKodu,
                cariUnvan: secilenCari.cariUnvan,
                evrakTipi: secilenEvrak.evrakTipi,
                alimSatim: secilenEvrak.alimSatim,
                fisTipiBaslikNo: seciliFisTipi?.ft?.fisTipiKodu ?? 0,
                fisTipiAdi: seciliFisTipi?.ft?.fisTipiAdi ?? secilenEvrak.label,
                anaDepo: secilenAnaDepo,
                karsiDepo: secilenKarsiDepo,
                kalemler: [],
              };

              const sonuc = await evrakRBKaydet(sepet, sepetKalemleri, calisilanSirket, {
                saticiKodu: yetkiBilgileri?.kullaniciKodu ?? '',
                kdvDurum: yetkiBilgileri?.kdvDurum ?? 0,
                anaDepo: secilenAnaDepo,
                karsiDepo: secilenKarsiDepo,
                guidId: generateGuid(),
              });

              if (sonuc.sonuc) {
                Alert.alert('Başarılı', sonuc.mesaj || 'Evrak başarıyla kaydedildi.');
                setSepetKalemleri([]);
                setSecilenCari(null);
              } else {
                Alert.alert('Hata', sonuc.mesaj || 'Evrak kaydedilemedi.');
              }
            } catch {
              Alert.alert('Hata', 'Evrak kaydedilirken bir hata oluştu.');
            } finally {
              setKayitYapiliyor(false);
            }
          },
        },
      ]
    );
  };

  const sepetToplam = rbSepetToplamHesapla(sepetKalemleri, yetkiBilgileri?.kdvDurum ?? 0);

  // Stok satırı render
  const renderStokSatiri = ({ item }: { item: StokListesiBilgileri }) => {
    const variantSayisi = barkodListesi.filter((b) => b.stokKodu === item.stokKodu).length;

    return (
      <ReanimatedSwipeable
        renderRightActions={() => (
          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => setInfoStoku(item)}
          >
            <Ionicons name="information-circle-outline" size={24} color={Colors.white} />
            <Text style={styles.infoBtnText}>Bilgi</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity style={styles.stokSatiri} onPress={() => stokSecildi(item)}>
          <View style={styles.stokBilgi}>
            <Text style={styles.stokKodu}>{item.stokKodu}</Text>
            <Text style={styles.stokCinsi} numberOfLines={1}>{item.stokCinsi}</Text>
            {variantSayisi > 0 && (
              <View style={styles.variantBadge}>
                <Ionicons name="color-palette-outline" size={11} color={Colors.primary} />
                <Text style={styles.variantText}>{variantSayisi} varyant</Text>
              </View>
            )}
          </View>
          <View style={styles.stokSag}>
            <Text style={styles.stokFiyat}>{paraTL(item.fiyat)}</Text>
            <Text style={styles.stokBakiye}>{miktarFormat(item.bakiye)} {item.birim}</Text>
          </View>
        </TouchableOpacity>
      </ReanimatedSwipeable>
    );
  };

  // Sepet kalem satırı render
  const renderSepetKalemi = ({ item, index }: { item: SepetRBKalem; index: number }) => (
    <View style={styles.sepetSatir}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sepetStokKodu}>{item.stokKodu}</Text>
        <Text style={styles.sepetStokCinsi} numberOfLines={1}>{item.stokCinsi}</Text>
        <View style={styles.sepetRBRow}>
          {item.renkKodu > 0 ? (
            <View style={styles.rbChip}>
              <Ionicons name="color-fill-outline" size={10} color={Colors.primary} />
              <Text style={styles.rbChipText}>{item.renkKodu}-{item.renk}</Text>
            </View>
          ) : null}
          {item.bedenKodu > 0 ? (
            <View style={styles.rbChip}>
              <Ionicons name="resize-outline" size={10} color={Colors.primary} />
              <Text style={styles.rbChipText}>{item.bedenKodu}-{item.beden}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.sepetSag}>
        <Text style={styles.sepetMiktar}>{miktarFormat(item.miktar)} {item.birim}</Text>
        <Text style={styles.sepetFiyat}>{paraTL(item.fiyat)}</Text>
      </View>
      <TouchableOpacity onPress={() => kalemSil(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={18} color="#e53935" />
      </TouchableOpacity>
    </View>
  );

  // Ana/sepet görünüm toggle
  const [sepetGorunumu, setSepetGorunumu] = useState(false);

  return (
    <View style={styles.ekran}>
      {/* Evrak tipi + Barkod + Miktarlı giriş */}
      <View style={styles.ustBar}>
        <TouchableOpacity style={styles.evrakTipiBtn} onPress={evrakTipiSec}>
          <Ionicons name="document-text-outline" size={18} color={Colors.white} />
          <Text style={styles.evrakTipiText}>{secilenEvrak.label}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.miktarBtn, miktarliGiris && styles.miktarBtnAktif]}
          onPress={() => setMiktarliGiris(!miktarliGiris)}
        >
          <Ionicons name="keypad-outline" size={18} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.barkodBtn}
          onPress={() => setScannerAcik(true)}
        >
          <Ionicons name="barcode-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Cari seçim */}
      <TouchableOpacity
        style={styles.cariBtn}
        onPress={() => {
          if (sepetKalemleri.length > 0) {
            Alert.alert('Uyarı', 'Sepette ürün olduğu için cari değiştirilemez. Önce sepeti temizleyin.');
            return;
          }
          navigation.navigate('CariSecim', { returnScreen: 'RenkBedenIslemleri' });
        }}
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

      {/* Tab: Stok Listesi / Sepet */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, !sepetGorunumu && styles.tabAktif]}
          onPress={() => setSepetGorunumu(false)}
        >
          <Text style={[styles.tabText, !sepetGorunumu && styles.tabTextAktif]}>
            Stok Listesi ({filtreli.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, sepetGorunumu && styles.tabAktif]}
          onPress={() => setSepetGorunumu(true)}
        >
          <Text style={[styles.tabText, sepetGorunumu && styles.tabTextAktif]}>
            Sepet ({sepetKalemleri.length})
          </Text>
        </TouchableOpacity>
      </View>

      {!sepetGorunumu ? (
        <>
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

          {/* Liste başlık */}
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
              <RefreshControl refreshing={yukleniyor} onRefresh={verileriYukle} colors={[Colors.primary]} />
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
        </>
      ) : (
        <>
          {/* Sepet listesi */}
          <FlatList
            data={sepetKalemleri}
            keyExtractor={(_, idx) => String(idx)}
            renderItem={renderSepetKalemi}
            style={styles.liste}
            contentContainerStyle={{ paddingTop: 8 }}
            ItemSeparatorComponent={() => <View style={styles.ayirac} />}
            ListEmptyComponent={
              <View style={styles.bosEkran}>
                <Ionicons name="cart-outline" size={48} color={Colors.border} />
                <Text style={styles.bosMetin}>Sepet boş</Text>
              </View>
            }
          />
        </>
      )}

      {/* Alt bar: Sepet bilgi + Kaydet */}
      <View style={styles.altBar}>
        <View style={styles.altBarSol}>
          <Text style={styles.altBarKalem}>{sepetKalemleri.length} kalem</Text>
          <Text style={styles.altBarToplam}>{paraTL(sepetToplam)}</Text>
        </View>
        {sepetKalemleri.length > 0 && (
          <TouchableOpacity
            style={styles.temizleBtn}
            onPress={() => {
              Alert.alert('Sepeti Temizle', 'Tüm ürünler silinecek. Onaylıyor musunuz?', [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Temizle', style: 'destructive', onPress: () => setSepetKalemleri([]) },
              ]);
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#e53935" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.kaydetBtn, (sepetKalemleri.length === 0 || kayitYapiliyor) && styles.kaydetBtnPasif]}
          onPress={evrakKaydetHandler}
          disabled={sepetKalemleri.length === 0 || kayitYapiliyor}
        >
          {kayitYapiliyor ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color={Colors.white} />
              <Text style={styles.kaydetBtnText}>KAYDET</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Renk-Beden seçim modal */}
      <RenkBedenSecimModal
        visible={!!rbModalStok}
        stok={rbModalStok}
        barkodListesi={barkodListesi}
        onSelect={variantSecildi}
        onClose={() => setRbModalStok(null)}
      />

      {/* Fiş Tipi + Depo seçim modal */}
      {pendingEvrak && (
        <FisTipiDepoSecimModal
          visible={!!pendingEvrak}
          evrakLabel={pendingEvrak.label}
          evrakTipiStr={pendingEvrak.evrakTipiAdi}
          alimSatimStr={pendingEvrak.alimSatimAdi}
          veriTabaniAdi={calisilanSirket}
          defaultAnaDepo={secilenAnaDepo}
          defaultKarsiDepo={secilenKarsiDepo}
          onConfirm={handleFisTipiDepoConfirm}
          onClose={() => setPendingEvrak(null)}
        />
      )}

      {/* Barkod scanner */}
      <BarcodeScannerModal
        visible={scannerAcik}
        onClose={() => setScannerAcik(false)}
        onDetected={barkodTarandi}
      />

      {/* Stok info modal */}
      <StokInfoModal
        stokKodu={infoStoku?.stokKodu ?? null}
        stokCinsi={infoStoku?.stokCinsi ?? ''}
        veriTabaniAdi={calisilanSirket}
        onClose={() => setInfoStoku(null)}
      />

      {/* Miktar modal (miktarlı giriş aktifken) */}
      <UrunMiktariBelirleModal
        urun={miktarModalStok}
        kdvDurum={yetkiBilgileri?.kdvDurum ?? 0}
        fiyatDegistirmeYetkisi={yetkiBilgileri?.fiyatDegistirmeYetkisi ?? false}
        kalemIndirimYetkisi={yetkiBilgileri?.kalemIndirimYapmaYetkisi ?? false}
        onConfirm={handleMiktarConfirm}
        onClose={() => {
          setMiktarModalStok(null);
          setPendingVariant(null);
        }}
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
  miktarBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  miktarBtnAktif: {
    backgroundColor: Colors.accent ?? '#ffa500',
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabAktif: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray,
  },
  tabTextAktif: {
    color: Colors.primary,
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
  variantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  variantText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '500',
  },
  stokSag: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  stokFiyat: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  stokBakiye: { fontSize: 11, color: Colors.gray, marginTop: 2 },
  ayirac: { height: 4 },
  infoBtn: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    gap: 2,
  },
  infoBtnText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  bosEkran: { alignItems: 'center', paddingTop: 60, gap: 12 },
  bosMetin: { fontSize: 14, color: Colors.gray },

  // Sepet satır
  sepetSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  sepetStokKodu: { fontSize: 11, color: Colors.gray, fontWeight: '600' },
  sepetStokCinsi: { fontSize: 13, color: Colors.darkGray, fontWeight: '500', marginTop: 1 },
  sepetRBRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  rbChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8eaf6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  rbChipText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  sepetSag: { alignItems: 'flex-end' },
  sepetMiktar: { fontSize: 13, fontWeight: '600', color: Colors.darkGray },
  sepetFiyat: { fontSize: 12, color: Colors.primary, marginTop: 2 },

  // Alt bar
  altBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  altBarSol: { flex: 1 },
  altBarKalem: { fontSize: 12, color: Colors.gray },
  altBarToplam: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  temizleBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  kaydetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
  },
  kaydetBtnPasif: { opacity: 0.5 },
  kaydetBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
