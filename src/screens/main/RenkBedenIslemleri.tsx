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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { stokListesiniAl, cariFiyatBilgileriniAl, barkoddanStokKodunuBul, stokKartlariniKodCinsBarkoddanBul } from '../../api/hizliIslemlerApi';
import { barkodBilgileriniAl } from '../../api/renkBedenApi';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import UrunMiktariBelirleModal from '../../components/UrunMiktariBelirleModal';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import { useTarayiciAyarlari } from '../../hooks/useTarayiciAyarlari';
import StokInfoModal from '../../components/StokInfoModal';
import FisTipiDepoSecimModal from '../../components/FisTipiDepoSecimModal';
import type { FisTipiDepoSecimSonuc } from '../../components/FisTipiDepoSecimModal';
import RenkBedenSecimModal from '../../components/RenkBedenSecimModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { toast } from '../../components/Toast';
import { Config } from '../../constants/Config';
import { paraTL, miktarFormat } from '../../utils/format';
import { EvrakTipi, AlimSatim, type CariFiyatBilgileri } from '../../models';
import type {
  StokListesiBilgileri,
  CariKartBilgileri,
  SepetKalem,
  SepetRBKalem,
  SepetBaslik,
  FisTipiBaslik,
  BarkodBilgileri,
} from '../../models';
import EmptyState from '../../components/EmptyState';
import SkeletonLoader from '../../components/SkeletonLoader';
import { hafifTitresim } from '../../utils/haptics';

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

const ARAMA_TIPLERI = [
  { label: 'Başlayan', value: 1 },
  { label: 'Biten', value: 2 },
  { label: 'İçeren', value: 3 },
  { label: 'Barkod', value: 4 },
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

function rbSepetToplamHesapla(kalemler: SepetRBKalem[], kdvDurum: number, genelIndirimYuzde = 0): number {
  const kalemToplam = kalemler.reduce((toplam, k) => {
    const kdvHaric =
      k.miktar *
      k.fiyat *
      (1 - k.kalemIndirim1 / 100) *
      (1 - k.kalemIndirim2 / 100) *
      (1 - k.kalemIndirim3 / 100);
    const kdv = kdvHaric * (k.kdvOrani / 100);
    return toplam + (kdvDurum === 1 ? kdvHaric : kdvHaric + kdv);
  }, 0);
  return genelIndirimYuzde > 0 ? kalemToplam * (1 - genelIndirimYuzde / 100) : kalemToplam;
}

// Bileşen remount olduğunda sepeti korumak için module-level değişken
let savedRBState: {
  kalemler: SepetRBKalem[];
  cari: CariKartBilgileri | null;
  evrak: EvrakSecenegi;
  fisTipi: FisTipiBaslik | null;
  anaDepo: string;
  karsiDepo: string;
  cariFiyatListesi: CariFiyatBilgileri[];
} | null = null;

export default function RenkBedenIslemleri() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();

  const { yetkiBilgileri, ftBaslikListesi, fiyatTipListesi, calisilanSirket, stokListesiCache, stokListesiCacheSirket, setStokListesiCache } = useAppStore();

  // Stok ve barkod listeleri
  const [stokListesi, setStokListesi] = useState<StokListesiBilgileri[]>(
    stokListesiCacheSirket === calisilanSirket ? stokListesiCache : []
  );
  const [barkodListesi, setBarkodListesi] = useState<BarkodBilgileri[]>([]);
  const [filtreli, setFiltreli] = useState<StokListesiBilgileri[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaTipi, setAramaTipi] = useState(3);
  const [aramaTipiAcik, setAramaTipiAcik] = useState(false);
  const aramaInputRef = useRef<TextInput>(null);

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
  const [scannerAcik, setScannerAcik] = useState(false);
  const { manuelOkuma, baslangicZoom } = useTarayiciAyarlari();
  const [cariFiyatListesi, setCariFiyatListesi] = useState<CariFiyatBilgileri[]>([]);

  const [infoStoku, setInfoStoku] = useState<StokListesiBilgileri | null>(null);
  const [pendingEvrak, setPendingEvrak] = useState<EvrakSecenegi | null>(null);

  // Renk-beden seçim modal
  const [rbModalStok, setRbModalStok] = useState<StokListesiBilgileri | null>(null);

  // Miktar modal — seçilen variant ile birlikte
  const [miktarModalStok, setMiktarModalStok] = useState<StokListesiBilgileri | null>(null);
  const [pendingVariant, setPendingVariant] = useState<BarkodBilgileri | null>(null);
  const [miktarliGiris, setMiktarliGiris] = useState(false);

  // Ayarlardan varsayılan değerleri yükle
  useEffect(() => {
    AsyncStorage.getItem(Config.STORAGE_KEYS.MIKTARLI_GIRIS_VARSAYILAN).then((v) => {
      if (v === 'true') setMiktarliGiris(true);
    });
    AsyncStorage.getItem(Config.STORAGE_KEYS.VARSAYILAN_ARAMA_TIPI).then((v) => {
      if (v !== null) setAramaTipi(parseInt(v, 10));
    });
  }, []);

  const sepetKalemlerRef = useRef(sepetKalemleri);
  useEffect(() => { sepetKalemlerRef.current = sepetKalemleri; }, [sepetKalemleri]);

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

  // Remount'ta savedRBState'den sepeti geri yükle
  const pendingCariConsumed = useRef(false);
  useEffect(() => {
    if (savedRBState) {
      setSepetKalemleri(savedRBState.kalemler);
      setSecilenEvrak(savedRBState.evrak);
      setSeciliFisTipi(savedRBState.fisTipi);
      setSecilenAnaDepo(savedRBState.anaDepo);
      setSecilenKarsiDepo(savedRBState.karsiDepo);
      setCariFiyatListesi(savedRBState.cariFiyatListesi);
      // Cari: pendingCari zaten useFocusEffect'te set edildiyse eski cari'yi yazma
      if (!pendingCariConsumed.current) {
        setSecilenCari(savedRBState.cari);
      }
      pendingCariConsumed.current = false;
      savedRBState = null;
    }
  }, []);
  // Sayfaya focus olunca: pending cari varsa uygula, yoksa sıfırla
  useFocusEffect(
    useCallback(() => {
      const pending = useAppStore.getState().pendingCari;
      if (pending && pending.target === 'RenkBedenIslemleri') {
        pendingCariConsumed.current = true;
        setSecilenCari(pending.cari);
        useAppStore.getState().clearPendingCari();
        return;
      }
      // savedRBState varsa restore useEffect'ine bırak, sıfırlama yapma
      if (savedRBState) return;
      // Sepet doluysa dokunma
      if (sepetKalemlerRef.current.length > 0) return;
      // Sepet boş → sıfırla
      setSecilenCari(null);
      setSecilenEvrak(defaultEvrakSecenek(yetkiBilgileri?.defaultEvrakTipi ?? 'Fatura'));
      setSeciliFisTipi(null);
      setSepetKalemleri([]);
      setAramaMetni('');
      setSecilenAnaDepo(yetkiBilgileri?.anaDepo ?? '');
      setSecilenKarsiDepo(yetkiBilgileri?.karsiDepo ?? '');
    }, [yetkiBilgileri])
  );

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

  // Veri yükleme — force: true ise (pull-to-refresh) stok listesini de API'den yeniler
  const verileriYukle = useCallback(async (force = false) => {
    if (!calisilanSirket) return;
    setYukleniyor(true);
    try {
      const stokCacheMevcut = !force && stokListesiCacheSirket === calisilanSirket && stokListesiCache.length > 0;

      const promises: Promise<any>[] = [
        barkodBilgileriniAl(yetkiBilgileri?.kullaniciKodu ?? '', calisilanSirket),
      ];
      if (!stokCacheMevcut) {
        promises.push(stokListesiniAl(yetkiBilgileri?.kullaniciKodu ?? '', calisilanSirket));
      }

      const sonuclar = await Promise.all(promises);
      const barkodSonuc = sonuclar[0];

      if (!stokCacheMevcut) {
        const stokSonuc = sonuclar[1];
        if (stokSonuc.sonuc) {
          const sirali = [...(stokSonuc.data ?? [])].sort((a, b) => a.stokKodu.localeCompare(b.stokKodu));
          setStokListesiCache(sirali, calisilanSirket);
          setStokListesi(sirali);
          setFiltreli(sirali);
        } else {
          toast.error(stokSonuc.mesaj || 'Stok listesi alınamadı.');
        }
      } else {
        setStokListesi(stokListesiCache);
        setFiltreli(stokListesiCache);
      }

      if (barkodSonuc.sonuc) {
        setBarkodListesi(barkodSonuc.data ?? []);
      } else {
        toast.error(barkodSonuc.mesaj || 'Barkod listesi alınamadı.');
      }
    } catch (e: any) {
      toast.error(`Veriler yüklenirken bir hata oluştu.\n\n${e?.message ?? e}`);
    } finally {
      setYukleniyor(false);
    }
  }, [calisilanSirket, yetkiBilgileri?.kullaniciKodu, stokListesiCache, stokListesiCacheSirket]);

  useEffect(() => {
    const eslesen = ftBaslikListesi.find(
      (f) =>
        f.evrakTipi === secilenEvrak.evrakTipiAdi &&
        f.alimSatim.trim() === secilenEvrak.alimSatimAdi
    );
    setSeciliFisTipi(eslesen ?? null);
    verileriYukle();
  }, [secilenEvrak]);

  // Arama filtresi (lokal: Başlayan/Biten/İçeren)
  useEffect(() => {
    if (aramaTipi === 4) return; // Barkod aramada lokal filtre yok
    if (!aramaMetni.trim()) {
      setFiltreli(stokListesi);
      return;
    }
    const q = aramaMetni.toLowerCase();
    const filtre = (val: string) => {
      if (aramaTipi === 1) return val.startsWith(q);
      if (aramaTipi === 2) return val.endsWith(q);
      return val.includes(q); // 3 = İçeren
    };
    let sonuc = stokListesi.filter(
      (s) =>
        filtre(s.stokKodu.toLowerCase()) ||
        filtre(s.stokCinsi.toLowerCase()) ||
        filtre(s.barkod.toLowerCase())
    );
    if (sonuc.length === 0) {
      const eslesen = barkodListesi
        .filter((b) => filtre(b.barkod.toLowerCase()))
        .map((b) => b.stokKodu);
      if (eslesen.length > 0) {
        const stokKodlari = new Set(eslesen);
        sonuc = stokListesi.filter((s) => stokKodlari.has(s.stokKodu));
      }
    }
    setFiltreli(sonuc);
  }, [aramaMetni, aramaTipi, stokListesi, barkodListesi]);

  // Barkod ile API araması
  const aramaYap = useCallback(async (veriOverride?: string) => {
    const veri = (veriOverride ?? aramaMetni).trim();
    if (!veri || !calisilanSirket) return;
    setYukleniyor(true);
    try {
      if (aramaTipi === 4) {
        const sonuc = await barkoddanStokKodunuBul(veri, calisilanSirket);
        let modalAcilacak = false;
        if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
          setFiltreli(sonuc.data);
          if (sonuc.data.length === 1) {
            const stok = sonuc.data[0];
            if (!secilenCari) {
              toast.warning('Sepete ürün eklemeden önce lütfen cari seçiniz.');
            } else {
              stokSecildi(stok);
              modalAcilacak = true;
            }
          }
        } else {
          toast.warning(`"${veri}" barkodlu ürün bulunamadı.`);
          setFiltreli([]);
        }
        // Barkod arama sonrası inputu temizle ve focusla (modal açılacaksa onClose'da yapılacak)
        setAramaMetni('');
        if (!modalAcilacak) {
          setTimeout(() => aramaInputRef.current?.focus(), 100);
        }
      } else {
        const sonuc = await stokKartlariniKodCinsBarkoddanBul(veri, aramaTipi, calisilanSirket);
        if (sonuc.sonuc) {
          setFiltreli(sonuc.data);
        } else {
          toast.error(sonuc.mesaj || 'Stok araması başarısız.');
          setFiltreli([]);
        }
      }
    } catch (e: any) {
      toast.error(`Stok araması sırasında bir hata oluştu.\n${e?.message ?? e}`);
    } finally {
      setYukleniyor(false);
    }
  }, [aramaMetni, aramaTipi, calisilanSirket, secilenCari]);

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

  // Stok tıklandığında
  const stokSecildi = (item: StokListesiBilgileri) => {
    if (!secilenCari) {
      toast.warning('Sepete ürün eklemeden önce lütfen cari seçiniz.');
      return;
    }
    // Barkod veya stok listesinde varyant var mı?
    const barkodVar = barkodListesi.filter((b) => b.stokKodu === item.stokKodu);
    const stokVar = stokListesi.filter((s) => s.stokKodu === item.stokKodu);
    if (barkodVar.length > 0 || stokVar.length > 1) {
      // Varyantları var → önce varyant seçim modal
      setRbModalStok(item);
    } else {
      // Varyantı yok → direkt birim/fiyat modal
      setPendingVariant(null);
      setMiktarModalStok(item);
    }
  };

  // Renk-beden variant seçildi → her zaman birim/fiyat modal aç
  const variantSecildi = (variant: BarkodBilgileri) => {
    if (!rbModalStok) return;
    setPendingVariant(variant);
    setMiktarModalStok({
      ...rbModalStok,
      barkod: variant.barkod,
      carpan: variant.katsayi || 1,
    });
    setRbModalStok(null);
  };

  // RB sepete ekleme
  const rbSepeteEkle = (
    stok: StokListesiBilgileri,
    variant: BarkodBilgileri,
    miktar: number,
    fiyatOverride?: number,
    ind1 = 0, ind2 = 0, ind3 = 0,
    birimOverride?: string
  ) => {
    hafifTitresim();
    const kalem: SepetRBKalem = {
      stokKodu: stok.stokKodu,
      stokCinsi: stok.stokCinsi,
      barkod: variant.barkod,
      birim: birimOverride || stok.birim,
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
    if (!miktarModalStok) return;

    const variant: BarkodBilgileri = pendingVariant ?? {
      barkod: miktarModalStok.barkod,
      stokKodu: miktarModalStok.stokKodu,
      birim: kalem.birim,
      renkKodu: 0,
      bedenKodu: 0,
      renk: '',
      beden: '',
      katsayi: miktarModalStok.carpan || 1,
    };

    rbSepeteEkle(
      miktarModalStok,
      variant,
      kalem.miktar,
      kalem.birimFiyat,
      kalem.kalemIndirim1,
      kalem.kalemIndirim2,
      kalem.kalemIndirim3,
      kalem.birim
    );
    setMiktarModalStok(null);
    setPendingVariant(null);
    setTimeout(() => aramaInputRef.current?.focus(), 100);
  };

  // Barkod işleme (scanner ve el terminali ortak)
  const barkodIsle = (barkod: string) => {
    hafifTitresim();
    if (!secilenCari) {
      toast.warning('Sepete ürün eklemeden önce lütfen cari seçiniz.');
      return;
    }

    const barkodKaydi = barkodListesi.find((b) => b.barkod === barkod);
    if (barkodKaydi) {
      const stok = stokListesi.find((s) => s.stokKodu === barkodKaydi.stokKodu);
      if (stok) {
        setPendingVariant(barkodKaydi);
        setMiktarModalStok({
          ...stok,
          barkod: barkodKaydi.barkod,
          carpan: barkodKaydi.katsayi || 1,
        });
        return;
      }
    }

    const stokBulunan = stokListesi.find((s) => s.barkod === barkod);
    if (stokBulunan) {
      stokSecildi(stokBulunan);
      return;
    }

    toast.warning(`"${barkod}" barkodlu ürün bulunamadı.`);
  };

  const barkodTarandi = (barkod: string) => {
    setScannerAcik(false);
    barkodIsle(barkod);
  };

  const aramaTipiLabel = ARAMA_TIPLERI.find((t) => t.value === aramaTipi)?.label ?? 'İçeren';

  const sepetToplam = rbSepetToplamHesapla(sepetKalemleri, yetkiBilgileri?.kdvDurum ?? 0, secilenCari?.indirimYuzde ?? 0);

  // Sepete git (SepetListesi ekranına navigasyon)
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
      kalemler: [], // RB modda kalemler rbKalemler üzerinden geçer
    };
    navigation.navigate('SepetListesi', {
      sepet,
      genelIndirimYuzde: secilenCari?.indirimYuzde ?? 0,
      rbKalemler: sepetKalemleri,
      onRBKalemlerGuncellendi: setSepetKalemleri,
    });
  };

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

  return (
    <View style={styles.ekran}>
      {/* Üst bar: Evrak tipi + Miktarlı giriş + Barkod */}
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
          // Remount'a karşı sepeti koru
          savedRBState = {
            kalemler: sepetKalemlerRef.current,
            cari: secilenCari,
            evrak: secilenEvrak,
            fisTipi: seciliFisTipi,
            anaDepo: secilenAnaDepo,
            karsiDepo: secilenKarsiDepo,
            cariFiyatListesi,
          };
          navigation.navigate('CariSecim', { returnScreen: 'RenkBedenIslemleri', sepetDolu: sepetKalemlerRef.current.length > 0 });
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
          ref={aramaInputRef}
          style={styles.aramaInput}
          placeholder="Stok kodu, ürün adı veya barkod..."
          placeholderTextColor={Colors.gray}
          value={aramaMetni}
          onChangeText={setAramaMetni}
          returnKeyType="search"
          onSubmitEditing={() => aramaYap()}
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => { setAramaMetni(''); setFiltreli(stokListesi); }}>
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
          <RefreshControl refreshing={yukleniyor} onRefresh={() => verileriYukle(true)} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          yukleniyor ? (
            <SkeletonLoader satirSayisi={6} />
          ) : (
            <EmptyState icon="cube-outline" baslik="Stok bulunamadı" aciklama="Ürün listesi yüklenemedi veya boş" />
          )
        }
      />

      {filtreli.length > 0 && (
        <Text style={styles.toplamStokText}>Toplam: {filtreli.length} stok</Text>
      )}

      {/* Alt bar: Sepet + Barkod */}
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

      {/* Renk-Beden seçim modal */}
      <RenkBedenSecimModal
        visible={!!rbModalStok}
        stok={rbModalStok}
        barkodListesi={barkodListesi}
        stokListesi={stokListesi}
        onSelect={variantSecildi}
        onClose={() => { setRbModalStok(null); setTimeout(() => aramaInputRef.current?.focus(), 100); }}
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
        onDetected={barkodTarandi}
      />

      {/* Stok info modal */}
      <StokInfoModal
        stokKodu={infoStoku?.stokKodu ?? null}
        stokCinsi={infoStoku?.stokCinsi ?? ''}
        veriTabaniAdi={calisilanSirket}
        cariKodu={secilenCari?.cariKodu}
        onClose={() => setInfoStoku(null)}
      />

      {/* Miktar modal (miktarlı giriş aktifken) */}
      <UrunMiktariBelirleModal
        urun={miktarModalStok}
        kdvDurum={yetkiBilgileri?.kdvDurum ?? 0}
        fiyatDegistirmeYetkisi={yetkiBilgileri?.fiyatDegistirmeYetkisi ?? false}
        kalemIndirimYetkisi={yetkiBilgileri?.kalemIndirimYapmaYetkisi ?? false}
        fiyatTipListesi={fiyatTipListesi}
        veriTabaniAdi={calisilanSirket}
        cariKodu={secilenCari?.cariKodu}
        zorlaFiyatNo={etkinFiyatNo}
        cariFiyatListesi={cariFiyatListesi}
        onConfirm={handleMiktarConfirm}
        onClose={() => {
          setMiktarModalStok(null);
          setPendingVariant(null);
          setTimeout(() => aramaInputRef.current?.focus(), 100);
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
  evrakTipiIcerik: {
    flex: 1,
  },
  evrakTipiText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  fisTipiText: {
    color: '#FFD54F',
    fontSize: 11,
    marginTop: 1,
  },
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
  toplamStokText: { textAlign: 'center', color: Colors.gray, fontSize: 13, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, backgroundColor: Colors.white },
});
