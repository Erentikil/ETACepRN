import React, { useState, useEffect, useCallback, useRef } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { stokKartlariniKodCinsBarkoddanBul, barkoddanStokKodunuBul, tekStokFiyatBilgisiniAl, cariFiyatBilgileriniAl } from '../../api/hizliIslemlerApi';
import { evrakiSil } from '../../utils/bekleyenEvraklarStorage';
import { aktifSepetKaydet, aktifSepetTemizle, aktifSepetAl } from '../../utils/aktifSepetStorage';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import UrunMiktariBelirleModal from '../../components/UrunMiktariBelirleModal';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import ElTerminaliModal from '../../components/ElTerminaliModal';
import { useTarayiciAyarlari } from '../../hooks/useTarayiciAyarlari';
import StokInfoModal from '../../components/StokInfoModal';
import FisTipiDepoSecimModal from '../../components/FisTipiDepoSecimModal';
import type { FisTipiDepoSecimSonuc } from '../../components/FisTipiDepoSecimModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { Config } from '../../constants/Config';
import { paraTL, miktarFormat } from '../../utils/format';
import { EvrakTipi, AlimSatim, type StokFiyatBilgileri, type CariFiyatBilgileri } from '../../models';
import type {
  StokListesiBilgileri,
  CariKartBilgileri,
  SepetKalem,
  SepetBaslik,
  FisTipiBaslik,
} from '../../models';
import EmptyState from '../../components/EmptyState';
import SkeletonLoader from '../../components/SkeletonLoader';
import AnimatedListItem from '../../components/AnimatedListItem';
import { hafifTitresim } from '../../utils/haptics';
import { useRecentSearches } from '../../hooks/useRecentSearches';
import { toast } from '../../components/Toast';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<DrawerParamList, 'AlisSatisIslemleri'>;

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

const ARAMA_TIPLERI = [
  { label: 'Başlayan', value: 1 },
  { label: 'Biten', value: 2 },
  { label: 'İçeren', value: 3 },
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

function sepetToplamHesapla(kalemler: SepetKalem[], kdvDurum: number, genelIndirimYuzde = 0): number {
  const kalemToplam = kalemler.reduce((toplam, k) => {
    const kdvHaric =
      k.miktar *
      k.birimFiyat *
      (1 - k.kalemIndirim1 / 100) *
      (1 - k.kalemIndirim2 / 100) *
      (1 - k.kalemIndirim3 / 100);
    const kdv = kdvHaric * (k.kdvOrani / 100);
    return toplam + (kdvDurum === 1 ? kdvHaric : kdvHaric + kdv);
  }, 0);
  return genelIndirimYuzde > 0 ? kalemToplam * (1 - genelIndirimYuzde / 100) : kalemToplam;
}

export default function AlisSatisIslemleri() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();

  const { yetkiBilgileri, ftBaslikListesi, fiyatTipListesi, calisilanSirket } = useAppStore();
  const { recentSearches, addSearch, clearAll: clearRecentSearches } = useRecentSearches();

  const taslakFisTipiYuklendi = useRef(false);
  const fisTipiManuelSecildi = useRef(false);

  const [stokListesi, setStokListesi] = useState<StokListesiBilgileri[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaTipi, setAramaTipi] = useState(3); // varsayılan: içeren
  const [aramaTipiAcik, setAramaTipiAcik] = useState(false);
  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [secilenEvrak, setSecilenEvrak] = useState<EvrakSecenegi>(
    defaultEvrakSecenek(yetkiBilgileri?.defaultEvrakTipi ?? 'Fatura')
  );
  const [seciliFisTipi, setSeciliFisTipi] = useState<FisTipiBaslik | null>(null);
  const [sepetKalemleri, setSepetKalemleri] = useState<SepetKalem[]>([]);

  // Badge bounce animasyonu
  const badgeScale = useSharedValue(1);
  const badgeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));
  const prevSepetLen = useRef(0);
  useEffect(() => {
    if (sepetKalemleri.length > prevSepetLen.current) {
      badgeScale.value = withSequence(withTiming(1.35, { duration: 150 }), withTiming(1, { duration: 150 }));
    }
    prevSepetLen.current = sepetKalemleri.length;
  }, [sepetKalemleri.length]);

  const [modalUrunu, setModalUrunu] = useState<StokListesiBilgileri | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [scannerAcik, setScannerAcik] = useState(false);
  const [elTerminaliAcik, setElTerminaliAcik] = useState(false);
  const [miktarliGiris, setMiktarliGiris] = useState(false);

  // Ayarlardan varsayılan değerleri yükle
  useEffect(() => {
    (async () => {
      const miktarliStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.MIKTARLI_GIRIS_VARSAYILAN);
      if (miktarliStr === 'true') setMiktarliGiris(true);

      const aramaTipiStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.VARSAYILAN_ARAMA_TIPI);
      if (aramaTipiStr !== null) setAramaTipi(parseInt(aramaTipiStr, 10));
    })();
  }, []);

  const [cariFiyatListesi, setCariFiyatListesi] = useState<CariFiyatBilgileri[]>([]);

  const [infoStoku, setInfoStoku] = useState<StokListesiBilgileri | null>(null);
  const [pendingEvrak, setPendingEvrak] = useState<EvrakSecenegi | null>(null);
  const [secilenAnaDepo, setSecilenAnaDepo] = useState(yetkiBilgileri?.anaDepo ?? '');
  const [secilenKarsiDepo, setSecilenKarsiDepo] = useState(yetkiBilgileri?.karsiDepo ?? '');

  // Uygulama yeniden açıldığında AsyncStorage'daki aktif sepeti geri yükle
  const sepetYuklendi = useRef(false);
  useEffect(() => {
    if (route.params?.taslakEvrak) {
      sepetYuklendi.current = true;
      return;
    }
    if (sepetYuklendi.current) return;

    aktifSepetAl().then((sepet) => {
      sepetYuklendi.current = true;

      if (!sepet || sepet.kalemler.length === 0) return;

      if (sepet.cariKodu) {
        setSecilenCari({ cariKodu: sepet.cariKodu, cariUnvan: sepet.cariUnvan });
      }
      const evrakSecenek =
        TUM_SECENEKLER.find(
          (s) => s.evrakTipi === sepet.evrakTipi && s.alimSatim === sepet.alimSatim
        ) ?? defaultEvrakSecenek(yetkiBilgileri?.defaultEvrakTipi ?? 'Fatura');
      setSecilenEvrak(evrakSecenek);

      if (sepet.fisTipiBaslikNo) {
        const eslesen = ftBaslikListesi.find(
          (f) => f.evrakTipi === evrakSecenek.evrakTipiAdi && f.alimSatim.trim() === evrakSecenek.alimSatimAdi
        );
        setSeciliFisTipi(eslesen ? {
          ...eslesen,
          ft: eslesen.ftListe.find((ft) => ft.fisTipiKodu === sepet.fisTipiBaslikNo) ?? eslesen.ft,
        } : null);
      }
      setSepetKalemleri(sepet.kalemler);
      setSecilenAnaDepo(sepet.anaDepo ?? yetkiBilgileri?.anaDepo ?? '');
      setSecilenKarsiDepo(sepet.karsiDepo ?? yetkiBilgileri?.karsiDepo ?? '');
    });
  }, []);

  // Taslak param değişince tüm state'leri yükle
  const taslakYukle = (taslak: NonNullable<typeof route.params>['taslakEvrak']) => {
    if (!taslak) return;

    if (taslak.cariKodu) {
      setSecilenCari({ cariKodu: taslak.cariKodu, cariUnvan: taslak.cariUnvan });
    }
    const evrakSecenek =
      TUM_SECENEKLER.find(
        (s) => s.evrakTipi === taslak.evrakTipi && s.alimSatim === taslak.alimSatim
      ) ?? defaultEvrakSecenek(yetkiBilgileri?.defaultEvrakTipi ?? 'Fatura');
    taslakFisTipiYuklendi.current = true;
    setSecilenEvrak(evrakSecenek);
    {
      const eslesen = ftBaslikListesi.find(
        (f) => f.evrakTipi === evrakSecenek.evrakTipiAdi && f.alimSatim.trim() === evrakSecenek.alimSatimAdi
      );
      setSeciliFisTipi(eslesen ? {
        ...eslesen,
        ft: eslesen.ftListe.find((ft) => ft.fisTipiKodu === taslak.fisTipiBaslikNo) ?? eslesen.ft,
      } : null);
    }
    setSepetKalemleri(taslak.kalemler ?? []);
    setSecilenAnaDepo(taslak.anaDepo ?? yetkiBilgileri?.anaDepo ?? '');
    setSecilenKarsiDepo(taslak.karsiDepo ?? yetkiBilgileri?.karsiDepo ?? '');
    aktifSepetTemizle();
    evrakiSil(taslak.id);
  };

  useEffect(() => {
    const taslak = route.params?.taslakEvrak;
    if (!taslak) return;

    if (sepetKalemlerRef.current.length > 0) {
      Alert.alert(
        'Sepet Dolu',
        'Sepetinizde ürünler var. Taslağı yüklerseniz mevcut sepet silinecek. Devam etmek istiyor musunuz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Devam Et', style: 'destructive', onPress: () => taslakYukle(taslak) },
        ]
      );
    } else {
      taslakYukle(taslak);
    }
  }, [route.params?.taslakEvrak]);

  // Sepet değiştikçe AsyncStorage'a kaydet
  useEffect(() => {
    if (sepetKalemleri.length === 0) {
      aktifSepetTemizle();
      return;
    }
    aktifSepetKaydet({
      cariKodu: secilenCari?.cariKodu ?? '',
      cariUnvan: secilenCari?.cariUnvan ?? '',
      evrakTipi: secilenEvrak.evrakTipi,
      alimSatim: secilenEvrak.alimSatim,
      fisTipiBaslikNo: seciliFisTipi?.ft?.fisTipiKodu ?? 0,
      fisTipiAdi: seciliFisTipi?.ft?.fisTipiAdi ?? secilenEvrak.label,
      anaDepo: secilenAnaDepo,
      karsiDepo: secilenKarsiDepo,
      kalemler: sepetKalemleri,
    });
  }, [sepetKalemleri, secilenCari, seciliFisTipi, secilenEvrak, secilenAnaDepo, secilenKarsiDepo]);

  const sepetKalemlerRef = useRef(sepetKalemleri);
  useEffect(() => { sepetKalemlerRef.current = sepetKalemleri; }, [sepetKalemleri]);
  const evrakTipiKoru = useRef(false);
  const { manuelOkuma, baslangicZoom } = useTarayiciAyarlari();

  // Taslak olmadan ve sepet boşken sayfaya girilince sıfırla
  useFocusEffect(
    useCallback(() => {
      if (route.params?.taslakEvrak) return;
      if (!sepetYuklendi.current) return;
      if (sepetKalemlerRef.current.length > 0) return;
      if (evrakTipiKoru.current) {
        evrakTipiKoru.current = false;
        setSecilenCari(null);
        setSepetKalemleri([]);
        setAramaMetni('');
        setStokListesi([]);
        setSecilenAnaDepo(yetkiBilgileri?.anaDepo ?? '');
        setSecilenKarsiDepo(yetkiBilgileri?.karsiDepo ?? '');
        return;
      }
      setSecilenCari(null);
      setSecilenEvrak(defaultEvrakSecenek(yetkiBilgileri?.defaultEvrakTipi ?? 'Fatura'));
      setSeciliFisTipi(null);
      setSepetKalemleri([]);
      setAramaMetni('');
      setStokListesi([]);
      setSecilenAnaDepo(yetkiBilgileri?.anaDepo ?? '');
      setSecilenKarsiDepo(yetkiBilgileri?.karsiDepo ?? '');
    }, [route.params?.taslakEvrak, yetkiBilgileri])
  );

  // CariSecim'den geri dönünce seçilen cariyi al
  useEffect(() => {
    if (route.params?.secilenCari) {
      setSecilenCari(route.params.secilenCari);
    }
  }, [route.params?.secilenCari]);

  // Cari seçildiğinde cariFiyatListesi'ni çek (yetkiBilgileri.cariFiyatListesi true ve cari.listeFiyatNo dolu ise)
  useEffect(() => {
    if (
      yetkiBilgileri?.cariFiyatListesi &&
      secilenCari?.listeFiyatNo &&
      secilenCari.listeFiyatNo.trim() !== ''
    ) {
      cariFiyatBilgileriniAl(
        yetkiBilgileri.kullaniciKodu,
        calisilanSirket,
        secilenCari.listeFiyatNo.trim()
      )
        .then((sonuc) => {
          if (sonuc.sonuc && sonuc.data) {
            setCariFiyatListesi(sonuc.data);
          } else {
            setCariFiyatListesi([]);
          }
        })
        .catch(() => setCariFiyatListesi([]));
    } else {
      setCariFiyatListesi([]);
    }
  }, [secilenCari, yetkiBilgileri?.cariFiyatListesi]);

  // Evrak tipi değişince fiş tipini güncelle (stok çekmiyoruz)
  useEffect(() => {
    if (taslakFisTipiYuklendi.current) {
      taslakFisTipiYuklendi.current = false;
      return;
    }
    if (fisTipiManuelSecildi.current) {
      fisTipiManuelSecildi.current = false;
      return;
    }
    const eslesen = ftBaslikListesi.find(
      (f) =>
        f.evrakTipi === secilenEvrak.evrakTipiAdi &&
        f.alimSatim.trim() === secilenEvrak.alimSatimAdi
    );
    setSeciliFisTipi(eslesen ?? null);
  }, [secilenEvrak, ftBaslikListesi]);

  // Arama — API'ye istek at
  const aramaYap = useCallback(async (veriOverride?: string) => {
    const veri = (veriOverride ?? aramaMetni).trim();
    if (!veri || !calisilanSirket) {
      setStokListesi([]);
      return;
    }
    setYukleniyor(true);
    try {
      const sonuc = await stokKartlariniKodCinsBarkoddanBul(veri, aramaTipi, calisilanSirket);
      if (sonuc.sonuc) {
        setStokListesi(sonuc.data);
        addSearch(veri);
      } else {
        toast.error(sonuc.mesaj || 'Stok araması başarısız.');
        setStokListesi([]);
      }
    } catch (e: any) {
      toast.error(`Stok araması sırasında bir hata oluştu.\n${e?.message ?? e}`);
      setStokListesi([]);
    } finally {
      setYukleniyor(false);
    }
  }, [aramaMetni, aramaTipi, calisilanSirket]);

  // Arama metni temizlenince listeyi sıfırla
  useEffect(() => {
    if (!aramaMetni.trim()) {
      setStokListesi([]);
    }
  }, [aramaMetni]);

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
          onPress: () => setPendingEvrak(s),
        })),
        { text: 'Vazgeç', style: 'cancel' as const },
      ]
    );
  };

  // Fiş tipi + depo modal onay
  const handleFisTipiDepoConfirm = (sonuc: FisTipiDepoSecimSonuc) => {
    if (!pendingEvrak) return;
    fisTipiManuelSecildi.current = true;
    setSecilenEvrak(pendingEvrak);
    const eslesen = ftBaslikListesi.find(
      (f) => f.evrakTipi === pendingEvrak.evrakTipiAdi && f.alimSatim.trim() === pendingEvrak.alimSatimAdi
    );
    setSeciliFisTipi(eslesen ? {
      ...eslesen,
      ft: eslesen.ftListe.find((ft) => ft.fisTipiKodu === sonuc.fisTipiKodu) ?? eslesen.ft,
    } : null);
    setSecilenAnaDepo(sonuc.anaDepo);
    setSecilenKarsiDepo(sonuc.karsiDepo);
    setPendingEvrak(null);
  };

  // Etkin fiyat no: cariFiyatNo > yetkiBilgileri.fiyatNo > varsayılan
  const etkinFiyatNo = (() => {
    let fNo = yetkiBilgileri?.fiyatNo || 0;
    if (yetkiBilgileri?.saticiBazliCariKart && secilenCari) {
      const cariFNo = secilenEvrak.alimSatim === AlimSatim.Alim
        ? secilenCari.alisFiyatNo
        : secilenCari.satisFiyatNo;
      if (cariFNo) fNo = cariFNo;
    }
    return fNo;
  })();

  // Hızlı sepete ekle
  const hizliEkle = async (item: StokListesiBilgileri) => {
    if (!secilenCari) {
      toast.warning('Sepete ürün eklemeden önce lütfen cari seçiniz.');
      return;
    }
    const carpan = item.carpan || 1;

    let fiyat = item.fiyat;
    let ind1 = item.kalemIndirim1 || 0;
    let ind2 = item.kalemIndirim2 || 0;
    let ind3 = item.kalemIndirim3 || 0;
    let fiyatNo = item.fiyatNo || 0;

    if (etkinFiyatNo > 0 && etkinFiyatNo !== item.fiyatNo) {
      try {
        const sonuc = await tekStokFiyatBilgisiniAl(item.stokKodu, calisilanSirket);
        if (sonuc.sonuc && sonuc.data) {
          const bulunan = sonuc.data.find((sf: StokFiyatBilgileri) => sf.fiyatNo === etkinFiyatNo);
          if (bulunan) {
            fiyat = bulunan.tutar;
            ind1 = bulunan.kalemIndirim1;
            ind2 = bulunan.kalemIndirim2;
            ind3 = bulunan.kalemIndirim3;
            fiyatNo = etkinFiyatNo;
          }
        }
      } catch { /* fiyat bulunamazsa varsayılan fiyatla devam */ }
    }

    // Cari fiyat listesi en yüksek öncelik — diğer tüm fiyat seçimlerini ezer
    const cariFiyat = cariFiyatListesi.find((cf) => cf.stokKodu === item.stokKodu);
    if (cariFiyat) {
      ind1 = cariFiyat.kalemIndirim1;
      ind2 = cariFiyat.kalemIndirim2;
      ind3 = cariFiyat.kalemIndirim3;
      if (cariFiyat.fiyatNo && cariFiyat.fiyatNo.trim() !== '') {
        const cfNo = parseInt(cariFiyat.fiyatNo.trim(), 10);
        if (cfNo > 0) {
          fiyatNo = cfNo;
          try {
            const sonuc = await tekStokFiyatBilgisiniAl(item.stokKodu, calisilanSirket);
            if (sonuc.sonuc && sonuc.data) {
              const bulunan = sonuc.data.find((sf: StokFiyatBilgileri) => sf.fiyatNo === cfNo);
              if (bulunan) {
                fiyat = bulunan.tutar;
                ind1 = bulunan.kalemIndirim1 || ind1;
                ind2 = bulunan.kalemIndirim2 || ind2;
                ind3 = bulunan.kalemIndirim3 || ind3;
              }
            }
          } catch { /* fiyat bulunamazsa mevcut fiyatla devam */ }
        }
      } else if (cariFiyat.tutar > 0) {
        fiyat = cariFiyat.tutar;
        fiyatNo = 0;
      }
    }

    const kalem: SepetKalem = {
      stokKodu: item.stokKodu,
      stokCinsi: item.stokCinsi,
      barkod: item.barkod,
      birim: item.birim2?.split(';')[0]?.trim() || item.birim || '',
      miktar: 1,
      birimFiyat: fiyat * carpan,
      kdvOrani: item.kdvOrani,
      kalemIndirim1: ind1,
      kalemIndirim2: ind2,
      kalemIndirim3: ind3,
      birim2: item.birim2,
      carpan: item.carpan,
      carpan2: item.carpan2,
      seciliFiyatNo: fiyatNo,
    };
    kalemEkle(kalem);
  };

  // Sepete ekleme
  const kalemEkle = (kalem: SepetKalem) => {
    hafifTitresim();
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

  const sepetToplam = sepetToplamHesapla(sepetKalemleri, yetkiBilgileri?.kdvDurum ?? 0, secilenCari?.indirimYuzde ?? 0);

  const sepeteGit = () => {
    const sepet: SepetBaslik = {
      cariKodu: secilenCari?.cariKodu ?? '',
      cariUnvan: secilenCari?.cariUnvan ?? '',
      evrakTipi: secilenEvrak.evrakTipi,
      alimSatim: secilenEvrak.alimSatim,
      fisTipiBaslikNo: seciliFisTipi?.ft?.fisTipiKodu ?? 0,
      fisTipiAdi: seciliFisTipi?.ft?.fisTipiAdi ?? secilenEvrak.label,
      anaDepo: secilenAnaDepo,
      karsiDepo: secilenKarsiDepo,
      kalemler: sepetKalemleri,
    };
    navigation.navigate('SepetListesi', {
      sepet,
      genelIndirimYuzde: secilenCari?.indirimYuzde ?? 0,
      onKalemlerGuncellendi: (kalemler) => {
        if (kalemler.length === 0) evrakTipiKoru.current = true;
        setSepetKalemleri(kalemler);
      },
    });
  };

  // Arama tipi seçimi
  const aramaTipiLabel = ARAMA_TIPLERI.find((t) => t.value === aramaTipi)?.label ?? 'İçeren';

  const renderStokSatiri = ({ item, index }: { item: StokListesiBilgileri; index: number }) => (
    <AnimatedListItem index={index}>
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
      <TouchableOpacity
        style={styles.stokSatiri}
        onPress={() => hizliEkle(item)}
        onLongPress={() => {
          setModalUrunu(item);
        }}
        delayLongPress={400}
      >
        <View style={styles.stokBilgi}>
          <Text style={styles.stokKodu}>{item.stokKodu}</Text>
          <Text style={styles.stokCinsi} numberOfLines={1}>{item.stokCinsi}</Text>
          {item.barkod ? (
            <Text style={styles.stokBarkod}>{item.barkod}</Text>
          ) : null}
        </View>
        <View style={styles.stokSag}>
          <Text style={styles.stokFiyat}>{paraTL(item.fiyat)}</Text>
          <Text style={styles.stokBakiye}>{miktarFormat(item.bakiye)} {item.birim2?.split(';')[0]?.trim() || item.birim}</Text>
        </View>
      </TouchableOpacity>
    </ReanimatedSwipeable>
    </AnimatedListItem>
  );

  return (
    <View style={styles.ekran}>
      {/* El Terminali */}
      <TouchableOpacity
        style={styles.elTerminaliBar}
        onPress={() => setElTerminaliAcik(true)}
      >
        <Ionicons name="phone-portrait-outline" size={18} color={Colors.white} />
        <Text style={styles.elTerminaliText}>El Terminali</Text>
      </TouchableOpacity>

      {/* Evrak tipi + Barkod */}
      <View style={styles.ustBar}>
        <TouchableOpacity style={styles.evrakTipiBtn} onPress={evrakTipiSec}>
          <Ionicons name="document-text-outline" size={18} color={Colors.white} />
          <View style={styles.evrakTipiIcerik}>
            <Text style={styles.evrakTipiText}>{secilenEvrak.label}</Text>
            {seciliFisTipi && (
              <Text style={styles.fisTipiText}>
                {seciliFisTipi.ft?.fisTipiKodu} - {seciliFisTipi.ft?.fisTipiAdi}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-down" size={16} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.miktarBtn, miktarliGiris && styles.miktarBtnAktif]}
          onPress={() => setMiktarliGiris(!miktarliGiris)}
        >
          <Ionicons name={miktarliGiris ? 'checkbox' : 'square-outline'} size={16} color={Colors.white} />
          <Text style={styles.miktarBtnText}>Miktarlı</Text>
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
          navigation.navigate('CariSecim', { returnScreen: 'AlisSatisIslemleri', sepetDolu: sepetKalemleri.length > 0 });
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

      {/* Arama satırı — tip seçici + input + ara butonu */}
      <View style={styles.aramaRow}>
        <TouchableOpacity
          style={styles.aramaTipiBtn}
          onPress={() => setAramaTipiAcik(!aramaTipiAcik)}
        >
          <Text style={styles.aramaTipiBtnText}>{aramaTipiLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={Colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.aramaInput}
          placeholder="Stok kodu, ürün adı veya barkod..."
          placeholderTextColor={Colors.gray}
          value={aramaMetni}
          onChangeText={setAramaMetni}
          returnKeyType="search"
          onSubmitEditing={() => aramaYap()}
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => { setAramaMetni(''); setStokListesi([]); }}>
            <Ionicons name="close-circle" size={18} color={Colors.gray} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.araBtn}
          onPress={() => aramaYap()}
        >
          <Ionicons name="search" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Arama tipi dropdown */}
      {aramaTipiAcik && (
        <View style={styles.aramaTipiDropdown}>
          {ARAMA_TIPLERI.map((tip) => (
            <TouchableOpacity
              key={tip.value}
              style={[
                styles.aramaTipiItem,
                tip.value === aramaTipi && styles.aramaTipiItemActive,
              ]}
              onPress={() => {
                setAramaTipi(tip.value);
                setAramaTipiAcik(false);
              }}
            >
              <Text
                style={[
                  styles.aramaTipiItemText,
                  tip.value === aramaTipi && styles.aramaTipiItemTextActive,
                ]}
              >
                {tip.label}
              </Text>
              {tip.value === aramaTipi && (
                <Ionicons name="checkmark" size={16} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Son Aramalar */}
      {recentSearches.length > 0 && stokListesi.length === 0 && !yukleniyor && (
        <View style={styles.sonAramalarContainer}>
          <View style={styles.sonAramalarBaslik}>
            <Text style={styles.sonAramalarLabel}>Son Aramalar</Text>
            <TouchableOpacity onPress={() => { clearRecentSearches(); }}>
              <Text style={styles.sonAramalarTemizle}>Temizle</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentSearches.map((term, i) => (
              <TouchableOpacity
                key={`${term}-${i}`}
                style={styles.sonAramaChip}
                onPress={() => { setAramaMetni(term); aramaYap(term); }}
              >
                <Ionicons name="time-outline" size={14} color={Colors.primary} />
                <Text style={styles.sonAramaChipText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Stok listesi başlık */}
      <View style={styles.listeBaslik}>
        <Text style={[styles.listeBaslikText, { flex: 1.2 }]}>KOD</Text>
        <Text style={[styles.listeBaslikText, { flex: 2 }]}>CİNS</Text>
        <Text style={[styles.listeBaslikText, { flex: 1, textAlign: 'right' }]}>FİYAT</Text>
      </View>

      {/* Stok listesi */}
      <FlatList
        data={stokListesi}
        keyExtractor={(item, idx) => item.stokKodu || String(idx)}
        renderItem={renderStokSatiri}
        style={styles.liste}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => aramaYap()}
            colors={[Colors.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.ayirac} />}
        ListEmptyComponent={
          yukleniyor ? (
            <SkeletonLoader satirSayisi={6} />
          ) : (
            <EmptyState
              icon="search-outline"
              baslik={aramaMetni.trim() ? 'Sonuç bulunamadı' : 'Ürün arayın'}
              aciklama={aramaMetni.trim() ? 'Farklı bir arama kriteri deneyiniz' : 'Aramak için yukarıdaki arama çubuğunu kullanın'}
            />
          )
        }
      />

      {/* Sepet + Barkod alt bar */}
      <View style={styles.altBar}>
        <TouchableOpacity
          style={[styles.sepetBtn, sepetKalemleri.length === 0 && styles.sepetBtnPasif]}
          onPress={sepeteGit}
          disabled={sepetKalemleri.length === 0}
        >
          <Ionicons name="cart-outline" size={22} color={Colors.white} />
          <Text style={styles.sepetBtnText}>
            SEPET ({paraTL(sepetToplam)})
          </Text>
          {sepetKalemleri.length > 0 && (
            <Animated.View style={[styles.sepetBadge, badgeAnimStyle]}>
              <Text style={styles.sepetBadgeText}>{sepetKalemleri.length}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.altBarkodBtn}
          onPress={() => setScannerAcik(true)}
        >
          <Ionicons name="barcode-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

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
          fisTipiReadOnly={!yetkiBilgileri?.fisTipiDegistirme}
          depoReadOnly={!yetkiBilgileri?.depoDegistirme}
          onConfirm={handleFisTipiDepoConfirm}
          onClose={() => setPendingEvrak(null)}
        />
      )}

      {/* Barkod scanner */}
      <BarcodeScannerModal
        visible={scannerAcik}
        onClose={() => setScannerAcik(false)}
        manuelOkuma={manuelOkuma}
        baslangicZoom={baslangicZoom}
        onDetected={(barkod) => {
          setScannerAcik(false);
          hafifTitresim();
          setAramaMetni(barkod);
          barkoddanStokKodunuBul(barkod, calisilanSirket).then((sonuc) => {
            console.log('[BarkoddanStokKodunuBul] response:', JSON.stringify(sonuc, null, 2));
            if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
              const stok = sonuc.data[0];
              setStokListesi(sonuc.data);
              if (!secilenCari) {
                toast.warning('Sepete ürün eklemeden önce lütfen cari seçiniz.');
              } else if (miktarliGiris) {
                setModalUrunu(stok);
              } else {
                hizliEkle(stok);
              }
            } else {
              toast.warning(`"${barkod}" barkodlu ürün bulunamadı.`);
              setStokListesi([]);
            }
          }).catch((err) => {
            console.log('[BarkoddanStokKodunuBul] error:', err);
            toast.error('Barkod araması sırasında bir hata oluştu.');
          });
        }}
      />

      {/* El terminali modal */}
      <ElTerminaliModal
        visible={elTerminaliAcik}
        onClose={() => setElTerminaliAcik(false)}
        onBarkodOkut={(barkod) => {
          hafifTitresim();
          setAramaMetni(barkod);
          barkoddanStokKodunuBul(barkod, calisilanSirket).then((sonuc) => {
            if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
              const stok = sonuc.data[0];
              setStokListesi(sonuc.data);
              if (!secilenCari) {
                toast.warning('Sepete ürün eklemeden önce lütfen cari seçiniz.');
              } else if (miktarliGiris) {
                setElTerminaliAcik(false);
                setModalUrunu(stok);
              } else {
                hizliEkle(stok);
              }
            } else {
              toast.warning(`"${barkod}" barkodlu ürün bulunamadı.`);
              setStokListesi([]);
            }
          }).catch(() => {
            toast.error('Barkod araması sırasında bir hata oluştu.');
          });
        }}
      />

      {/* Stok info modal */}
      <StokInfoModal
        stokKodu={infoStoku?.stokKodu ?? null}
        stokCinsi={infoStoku?.stokCinsi ?? ''}
        veriTabaniAdi={calisilanSirket}
        cariKodu={secilenCari?.cariKodu}
        onClose={() => setInfoStoku(null)}
      />

      {/* Miktar modal */}
      <UrunMiktariBelirleModal
        urun={modalUrunu}
        kdvDurum={yetkiBilgileri?.kdvDurum ?? 0}
        fiyatDegistirmeYetkisi={yetkiBilgileri?.fiyatDegistirmeYetkisi ?? false}
        kalemIndirimYetkisi={yetkiBilgileri?.kalemIndirimYapmaYetkisi ?? false}
        fiyatTipListesi={fiyatTipListesi}
        veriTabaniAdi={calisilanSirket}
        cariKodu={secilenCari?.cariKodu}
        zorlaFiyatNo={etkinFiyatNo}
        cariFiyatListesi={cariFiyatListesi}
        onConfirm={kalemEkle}
        onClose={() => setModalUrunu(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: Colors.lightGray ?? '#f5f5f5' },
  elTerminaliBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 6,
  },
  elTerminaliText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
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
  evrakTipiIcerik: { flex: 1 },
  evrakTipiText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  fisTipiText: { color: '#FFD54F', fontSize: 11, marginTop: 1 },
  miktarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  miktarBtnAktif: {
    backgroundColor: Colors.accent,
  },
  miktarBtnText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
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
  cariText: { flex: 1, fontSize: 14, color: Colors.gray },
  cariTextSecili: { color: Colors.darkGray, fontWeight: '600' },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 10,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  aramaTipiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray ?? '#f5f5f5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  aramaTipiBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.black,
    paddingVertical: 2,
  },
  araBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    padding: 8,
  },
  aramaTipiDropdown: {
    backgroundColor: Colors.white,
    marginHorizontal: 10,
    marginTop: -6,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  aramaTipiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aramaTipiItemActive: {
    backgroundColor: `${Colors.primary}10`,
  },
  aramaTipiItemText: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  aramaTipiItemTextActive: {
    fontWeight: '600',
    color: Colors.primary,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  stokBilgi: { flex: 3.2 },
  stokKodu: { fontSize: 11, color: Colors.gray, fontWeight: '600' },
  stokCinsi: { fontSize: 14, color: Colors.darkGray, fontWeight: '500', marginTop: 2 },
  stokBarkod: { fontSize: 11, color: Colors.gray, marginTop: 1 },
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
  bosMetin: { fontSize: 14, color: Colors.gray, textAlign: 'center', paddingHorizontal: 20 },
  altBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  altBarkodBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sepetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
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
  sonAramalarContainer: { paddingHorizontal: 12, paddingVertical: 6 },
  sonAramalarBaslik: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 6 },
  sonAramalarLabel: { fontSize: 12, color: Colors.darkGray, fontWeight: '600' as const },
  sonAramalarTemizle: { fontSize: 12, color: Colors.error, fontWeight: '600' as const },
  sonAramaChip: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: Colors.lightGray, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, gap: 4, borderWidth: 1, borderColor: Colors.border },
  sonAramaChipText: { fontSize: 12, color: Colors.darkGray },
});
