import React, { useState, useEffect, useCallback, useRef } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { sepetToplamlariniHesaplaRB, type SepetAyarlari } from '../../utils/sepetHesap';
import { useSepetAyarlariStore } from '../../store/sepetAyarlariStore';
import { useAppStore } from '../../store/appStore';
import { cariFiyatBilgileriniAl, barkoddanStokKodunuBul, stokKartlariniKodCinsBarkoddanBul } from '../../api/hizliIslemlerApi';
import { stokListesiniGetir } from '../../utils/stokListesiYukleyici';
import { barkodBilgileriniAl } from '../../api/renkBedenApi';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import UrunMiktariBelirleModal from '../../components/UrunMiktariBelirleModal';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import { useTarayiciAyarlari } from '../../hooks/useTarayiciAyarlari';
import StokInfoModal from '../../components/StokInfoModal';
import FisTipiDepoSecimModal from '../../components/FisTipiDepoSecimModal';
import type { FisTipiDepoSecimSonuc } from '../../components/FisTipiDepoSecimModal';
import EvrakTipiSecimModal from '../../components/EvrakTipiSecimModal';
import RenkBedenSecimModal from '../../components/RenkBedenSecimModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../../contexts/ThemeContext';
import { useT } from '../../i18n/I18nContext';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

function rbSepetToplamHesapla(kalemler: SepetRBKalem[], ayarlar: SepetAyarlari): number {
  return sepetToplamlariniHesaplaRB(kalemler, ayarlar).genelToplam;
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
  const Colors = useColors();
  const t = useT();
  const insets = useSafeAreaInsets();
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
  const [stokSayisi, setStokSayisi] = useState<number | null>(null);
  const [stokYuklemeDurumu, setStokYuklemeDurumu] = useState<'yukleniyor' | 'tamamlandi' | 'hata'>('yukleniyor');
  const [scannerAcik, setScannerAcik] = useState(false);
  const { manuelOkuma, baslangicZoom } = useTarayiciAyarlari();
  const [cariFiyatListesi, setCariFiyatListesi] = useState<CariFiyatBilgileri[]>([]);

  const [infoStoku, setInfoStoku] = useState<StokListesiBilgileri | null>(null);
  const [pendingEvrak, setPendingEvrak] = useState<EvrakSecenegi | null>(null);
  const [evrakTipiModalAcik, setEvrakTipiModalAcik] = useState(false);
  const [evrakTipiSecenekleri, setEvrakTipiSecenekleri] = useState<EvrakSecenegi[]>([]);

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
    setStokYuklemeDurumu('yukleniyor');

    // Barkod listesini paralel yükle
    barkodBilgileriniAl(yetkiBilgileri?.kullaniciKodu ?? '', calisilanSirket)
      .then((sonuc) => {
        if (sonuc.sonuc) setBarkodListesi(sonuc.data ?? []);
        else toast.error(sonuc.mesaj || 'Barkod listesi alınamadı.');
      })
      .catch(() => toast.error('Barkod listesi yüklenirken hata oluştu.'));

    // Force ise cache'i temizle
    if (force) setStokListesiCache([], '');

    stokListesiniGetir(calisilanSirket, (partial, toplam) => {
      setStokListesi(partial);
      setFiltreli(partial);
      if (toplam != null) setStokSayisi(toplam);
      setYukleniyor(false);
    })
      .then((data) => {
        setStokListesi(data);
        setFiltreli(data);
        setStokSayisi(data.length);
        setStokYuklemeDurumu('tamamlandi');
      })
      .catch((e: any) => {
        toast.error(`Veriler yüklenirken bir hata oluştu.\n\n${e?.message ?? e}`);
        setStokYuklemeDurumu('hata');
      })
      .finally(() => setYukleniyor(false));
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
        if (!secilenCari) {
          toast.warning(t('stok.cariSecmedenEklenemez'));
          setAramaMetni('');
          setYukleniyor(false);
          return;
        }
        const sonuc = await barkoddanStokKodunuBul(veri, calisilanSirket);
        let modalAcilacak = false;
        if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
          setFiltreli(sonuc.data);
          if (sonuc.data.length === 1) {
            const stok = sonuc.data[0];
            if (!secilenCari) {
              toast.warning(t('stok.cariSecmedenEklenemez'));
            } else {
              stokSecildi(stok);
              modalAcilacak = true;
            }
          }
        } else {
          toast.warning(t('stok.barkodBulunamadi', { q: veri }));
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
    setEvrakTipiSecenekleri(izinli);
    setEvrakTipiModalAcik(true);
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
      toast.warning(t('stok.cariSecmedenEklenemez'));
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
    if (aramaTipi === 4) setTimeout(() => aramaInputRef.current?.focus(), 100);
  };

  // Barkod işleme (scanner ve el terminali ortak)
  const barkodIsle = (barkod: string) => {
    hafifTitresim();
    if (!secilenCari) {
      toast.warning(t('stok.cariSecmedenEklenemez'));
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

    toast.warning(t('stok.barkodBulunamadi', { q: barkod }));
  };

  const barkodTarandi = (barkod: string) => {
    setScannerAcik(false);
    barkodIsle(barkod);
  };

  const aramaTipiLabel = ARAMA_TIPLERI.find((at) => at.value === aramaTipi)?.label ?? 'İçeren';

  const cariIndirimYuzde = secilenCari?.indirimYuzde ?? 0;

  // Sepet ayarları global store'dan okunur — sepet içi ve sepet butonu tek kaynak kullansın
  const sepetAyarlari = useSepetAyarlariStore((s) => s.ayarlar);
  const updateSepetAyarlari = useSepetAyarlariStore((s) => s.updateAyarlar);

  // Cari KODU değiştiğinde default'u store'a uygula — ilk mount'ta store'a dokunma
  const oncekiCariKoduRef = useRef<string | undefined | null>(null);
  useEffect(() => {
    const yeniKod = secilenCari?.cariKodu;
    if (oncekiCariKoduRef.current === null) {
      oncekiCariKoduRef.current = yeniKod;
      return;
    }
    if (oncekiCariKoduRef.current !== yeniKod) {
      oncekiCariKoduRef.current = yeniKod;
      updateSepetAyarlari({ genelIndirimYuzde: cariIndirimYuzde, genelIndirimTutar: 0 });
    }
  }, [secilenCari?.cariKodu, cariIndirimYuzde, updateSepetAyarlari]);

  useEffect(() => {
    updateSepetAyarlari({ kdvDurum: yetkiBilgileri?.kdvDurum ?? 0 });
  }, [yetkiBilgileri?.kdvDurum, updateSepetAyarlari]);

  const sepetToplam = rbSepetToplamHesapla(sepetKalemleri, sepetAyarlari);

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
      genelIndirimYuzde: sepetAyarlari.genelIndirimYuzde,
      genelIndirimTutar: sepetAyarlari.genelIndirimTutar,
      kdvDurum: sepetAyarlari.kdvDurum,
      secilenKdvOrani: sepetAyarlari.secilenKdvOrani,
      rbKalemler: sepetKalemleri,
      onRBKalemlerGuncellendi: (kalemler) => {
        if (kalemler.length === 0) {
          setSecilenCari(null);
          setFiltreli(stokListesi);
          setAramaMetni('');
        }
        setSepetKalemleri(kalemler);
      },
    });
  };

  // Stok satırı render
  const renderStokSatiri = ({ item }: { item: StokListesiBilgileri }) => {
    const variantSayisi = barkodListesi.filter((b) => b.stokKodu === item.stokKodu).length;

    return (
      <ReanimatedSwipeable
        renderRightActions={() => (
          <TouchableOpacity
            style={[styles.infoBtn, { backgroundColor: Colors.primary }]}
            onPress={() => setInfoStoku(item)}
          >
            <Ionicons name="information-circle-outline" size={24} color="#fff" />
            <Text style={styles.infoBtnText}>{t('stok.bilgiButon')}</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity style={[styles.stokSatiri, { backgroundColor: Colors.card }]} onPress={() => stokSecildi(item)}>
          <View style={styles.stokBilgi}>
            <Text style={[styles.stokKodu, { color: Colors.textSecondary }]}>{item.stokKodu}</Text>
            <Text style={[styles.stokCinsi, { color: Colors.text }]}>{item.stokCinsi}</Text>
            {variantSayisi > 0 && (
              <View style={styles.variantBadge}>
                <Ionicons name="color-palette-outline" size={11} color={Colors.primary} />
                <Text style={[styles.variantText, { color: Colors.primary }]}>{variantSayisi} varyant</Text>
              </View>
            )}
          </View>
          <View style={styles.stokSag}>
            <Text style={[styles.stokFiyat, { color: Colors.primary }]}>{paraTL(item.fiyat)}</Text>
            <Text style={[styles.stokBakiye, { color: Colors.textSecondary }]}>{miktarFormat(item.bakiye)}</Text>
            <Text style={[styles.stokBakiye, { color: Colors.textSecondary, marginTop: 0, fontSize: 10 }]}>{item.birim}</Text>
          </View>
        </TouchableOpacity>
      </ReanimatedSwipeable>
    );
  };

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      {/* Üst bar: Evrak tipi + Miktarlı giriş + Barkod */}
      <View style={[styles.ustBar, { backgroundColor: Colors.primary }]}>
        <TouchableOpacity style={styles.evrakTipiBtn} onPress={evrakTipiSec}>
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <View style={styles.evrakTipiIcerik}>
            <Text style={styles.evrakTipiText}>{secilenEvrak.label}</Text>
            {seciliFisTipi && (
              <Text style={styles.fisTipiText}>
                {seciliFisTipi.ft?.fisTipiKodu} - {seciliFisTipi.ft?.fisTipiAdi}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-down" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.miktarBtn, miktarliGiris && { backgroundColor: Colors.accent }]}
          onPress={() => setMiktarliGiris(!miktarliGiris)}
        >
          <Ionicons name={miktarliGiris ? 'checkbox' : 'square-outline'} size={16} color="#fff" />
          <Text style={styles.miktarBtnText}>{t('stok.miktarli')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.barkodBtn}
          onPress={() => setScannerAcik(true)}
        >
          <Ionicons name="barcode-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Cari seçim */}
      <TouchableOpacity
        style={[styles.cariBtn, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}
        onPress={() => {
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
          color={secilenCari ? Colors.primary : Colors.textSecondary}
        />
        <Text style={[styles.cariText, { color: Colors.textSecondary }, secilenCari && { color: Colors.text, fontWeight: '600' }]}>
          {secilenCari ? secilenCari.cariUnvan : t('stok.cariSeciniz')}
        </Text>
        {secilenCari ? (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              const temizle = () => {
                setSecilenCari(null);
                setSepetKalemleri([]);
              };
              if (sepetKalemlerRef.current.length > 0) {
                Alert.alert(
                  t('stok.cariIptalBaslik'),
                  t('stok.cariIptalAciklama'),
                  [
                    { text: t('common.vazgec'), style: 'cancel' },
                    { text: t('stok.evetIptalEt'), style: 'destructive', onPress: temizle },
                  ]
                );
              } else {
                temizle();
              }
            }}
          >
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
        )}
      </TouchableOpacity>

      {/* Arama satırı — tip seçici + input + ara butonu */}
      <View style={[styles.aramaRow, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.aramaTipiBtn, { backgroundColor: Colors.background }]}
          onPress={() => setAramaTipiAcik(!aramaTipiAcik)}
        >
          <Text style={[styles.aramaTipiBtnText, { color: Colors.primary }]}>{aramaTipiLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={Colors.primary} />
        </TouchableOpacity>
        <TextInput
          ref={aramaInputRef}
          style={[styles.aramaInput, { color: Colors.text }]}
          placeholder={t('stok.aramaPlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          value={aramaMetni}
          onChangeText={setAramaMetni}
          returnKeyType="search"
          onSubmitEditing={() => aramaYap()}
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => { setAramaMetni(''); setFiltreli(stokListesi); }}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.araBtn, { backgroundColor: Colors.primary }]}
          onPress={() => aramaYap()}
        >
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Arama tipi dropdown */}
      {aramaTipiAcik && (
        <View style={[styles.aramaTipiDropdown, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
          {ARAMA_TIPLERI.map((tip) => (
            <TouchableOpacity
              key={tip.value}
              style={[
                styles.aramaTipiItem,
                { borderBottomColor: Colors.border },
                tip.value === aramaTipi && { backgroundColor: `${Colors.primary}10` },
              ]}
              onPress={() => {
                setAramaTipi(tip.value);
                setAramaTipiAcik(false);
              }}
            >
              <Text
                style={[
                  styles.aramaTipiItemText,
                  { color: Colors.text },
                  tip.value === aramaTipi && { fontWeight: '600', color: Colors.primary },
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
      <View style={[styles.listeBaslik, { backgroundColor: Colors.primary }]}>
        <Text style={[styles.listeBaslikText, { flex: 1.2 }]}>{t('stok.kod')}</Text>
        <Text style={[styles.listeBaslikText, { flex: 2 }]}>{t('stok.cins')}</Text>
        <Text style={[styles.listeBaslikText, { flex: 1, textAlign: 'right' }]}>{t('stok.fiyatBaslik')}</Text>
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
            <EmptyState icon="cube-outline" baslik={t('stok.listeBosBaslik')} aciklama={t('stok.listeBosAciklama')} />
          )
        }
      />

      {(filtreli.length > 0 || stokSayisi != null) && (
        <Text style={[
          styles.toplamStokText,
          { borderTopColor: Colors.border, backgroundColor: Colors.card },
          { color: stokYuklemeDurumu === 'yukleniyor' ? '#F5A623' : stokYuklemeDurumu === 'tamamlandi' ? '#4CAF50' : '#f44336' },
        ]}>
          {stokYuklemeDurumu === 'yukleniyor'
            ? `${filtreli.length}${stokSayisi != null ? ` / ${stokSayisi}` : ''} stok (yükleniyor...)`
            : `${filtreli.length} / ${stokSayisi ?? filtreli.length} stok`}
        </Text>
      )}

      {/* Alt bar: Sepet + Barkod */}
      <View style={[styles.altBar, { paddingBottom: 10 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.sepetBtn, { backgroundColor: Colors.primary }, sepetKalemleri.length === 0 && styles.sepetBtnPasif]}
          onPress={sepeteGit}
          disabled={sepetKalemleri.length === 0}
        >
          <Ionicons name="cart-outline" size={22} color="#fff" />
          <Text style={styles.sepetBtnText}>
            SEPET ({paraTL(sepetToplam)})
          </Text>
          {sepetKalemleri.length > 0 && (
            <Animated.View style={[styles.sepetBadge, { backgroundColor: Colors.accent }, badgeAnimStyle]}>
              <Text style={styles.sepetBadgeText}>{sepetKalemleri.length}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.altBarkodBtn, { backgroundColor: Colors.primary }]}
          onPress={() => setScannerAcik(true)}
        >
          <Ionicons name="barcode-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Renk-Beden seçim modal */}
      <RenkBedenSecimModal
        visible={!!rbModalStok}
        stok={rbModalStok}
        barkodListesi={barkodListesi}
        stokListesi={stokListesi}
        onSelect={variantSecildi}
        onClose={() => { setRbModalStok(null); if (aramaTipi === 4) setTimeout(() => aramaInputRef.current?.focus(), 100); }}
      />

      {/* Evrak Tipi seçim modal */}
      <EvrakTipiSecimModal
        visible={evrakTipiModalAcik}
        secenekler={evrakTipiSecenekleri.map((s) => ({ label: s.label, value: s.label }))}
        secilenDeger={secilenEvrak.label}
        onSelect={(val) => {
          const s = evrakTipiSecenekleri.find((x) => x.label === val);
          if (s) setPendingEvrak(s);
        }}
        onClose={() => setEvrakTipiModalAcik(false)}
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
          if (aramaTipi === 4) setTimeout(() => aramaInputRef.current?.focus(), 100);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  ustBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#fff',
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
  miktarBtnText: {
    color: '#fff',
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  cariText: {
    flex: 1,
    fontSize: 14,
  },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 6,
  },
  aramaTipiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  aramaTipiBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  araBtn: {
    borderRadius: 6,
    padding: 8,
  },
  aramaTipiDropdown: {
    marginHorizontal: 10,
    marginTop: -6,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
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
  },
  aramaTipiItemText: {
    fontSize: 14,
  },
  listeBaslik: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
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
  stokKodu: { fontSize: 11, fontWeight: '600' },
  stokCinsi: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  variantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  variantText: {
    fontSize: 10,
    fontWeight: '500',
  },
  stokSag: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  stokFiyat: { fontSize: 14, fontWeight: '700' },
  stokBakiye: { fontSize: 11, marginTop: 2 },
  ayirac: { height: 4 },
  infoBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    gap: 2,
  },
  infoBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  altBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  altBarkodBtn: {
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
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  sepetBtnPasif: { opacity: 0.5 },
  sepetBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sepetBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  sepetBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  toplamStokText: { textAlign: 'center', fontSize: 13, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth },
});
