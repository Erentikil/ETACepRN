import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import {
  cariSiparisListesiniAl,
  siparisEvrakNumarasiniKontrolEt,
  cariAcmaHareketleriniAl,
  evrakAcmaHareketleriniAl,
  siparisKapamaKaydet,
} from '../../api/siparisKapamaApi';
import { fisTipleriniAl, generateGuid, barkoddanStokKodunuBul } from '../../api/hizliIslemlerApi';
import { evrakPdfAl } from '../../api/raporApi';
import { useColors } from '../../contexts/ThemeContext';
import { useT } from '../../i18n/I18nContext';
import { paraTL, miktarFormat } from '../../utils/format';
import type {
  AcmaSiparisFisBilgileri,
  AcmaSiparisHareketBilgileri,
  KapatmaHareketBilgileri,
  CariKartBilgileri,
  FisTipiGrup,
  FisTipiItem,
} from '../../models';
import EmptyState from '../../components/EmptyState';
import { toast } from '../../components/Toast';
import SkeletonLoader from '../../components/SkeletonLoader';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import { useTarayiciAyarlari } from '../../hooks/useTarayiciAyarlari';
import { basariliTitresim, hafifTitresim } from '../../utils/haptics';
import { WebView } from 'react-native-webview';
import PdfViewer from '../../components/PdfViewer';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../../constants/Config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavProp = StackNavigationProp<RootStackParamList>;

// ─── Kapama sepet kalemi ─────────────────────────────────────────────────────
interface KapamaSepetKalem {
  stokKodu: string;
  stokCinsi: string;
  barkod: string;
  birim: string;
  depoKodu: string;
  fiyat: number;
  miktar: number;
  kdvOrani: number;
  siparisTakipNo: string;
}

function formatTarih(tarih: string): string {
  try {
    const d = new Date(tarih);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return tarih;
  }
}

type Adim = 'fisListesi' | 'hareketler';

// CariSecim'e giderken fiş tipi seçimini korumak için module-level değişkenler
let _savedGrup: FisTipiGrup | null = null;
let _savedFisTipi: FisTipiItem | null = null;

export default function SiparisKapama() {
  const Colors = useColors();
  const t = useT();
  const ARAMA_TIPLERI = [
    { label: t('aramaTipi.baslayan'), value: 1 },
    { label: t('aramaTipi.biten'), value: 2 },
    { label: t('aramaTipi.iceren'), value: 3 },
    { label: t('aramaTipi.barkod'), value: 4 },
  ];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const { yetkiBilgileri, calisilanSirket } = useAppStore();


  // ── Genel State ─────────────────────────────────────────────────────────────
  const [adim, setAdim] = useState<Adim>('fisListesi');

  // ── Fiş Listesi State ───────────────────────────────────────────────────────
  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [evrakNo, setEvrakNo] = useState('');
  const [fisListesi, setFisListesi] = useState<AcmaSiparisFisBilgileri[]>([]);
  const [fisYukleniyor, setFisYukleniyor] = useState(false);

  // FisTipi
  const [kapamaGruplari, setKapamaGruplari] = useState<FisTipiGrup[]>([]);
  const [secilenGrup, setSecilenGrup] = useState<FisTipiGrup | null>(null);
  const [secilenFisTipi, setSecilenFisTipi] = useState<FisTipiItem | null>(null);
  const [fisTipiModalGorunur, setFisTipiModalGorunur] = useState(false);

  // ── Hareket State ───────────────────────────────────────────────────────────
  const [acmaListesi, setAcmaListesi] = useState<AcmaSiparisHareketBilgileri[]>([]);
  const [kapamaSepeti, setKapamaSepeti] = useState<KapamaSepetKalem[]>([]);
  const [hareketYukleniyor, setHareketYukleniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [aktifTab, setAktifTab] = useState<'acma' | 'kapama'>('acma');
  const [aramaMetni, setAramaMetni] = useState('');
  const [secilenFisler, setSecilenFisler] = useState<AcmaSiparisFisBilgileri[]>([]);

  // Miktar modal
  const [miktarModalGorunur, setMiktarModalGorunur] = useState(false);
  const [modalHedef, setModalHedef] = useState<{
    tip: 'acma';
    ashb: AcmaSiparisHareketBilgileri;
  } | {
    tip: 'kapama';
    kalem: KapamaSepetKalem;
  } | null>(null);
  const [modalMiktar, setModalMiktar] = useState('');

  // Barkod tarayıcı
  const [barkodModalGorunur, setBarkodModalGorunur] = useState(false);
  const [barkodAcmaIcin, setBarkodAcmaIcin] = useState(false); // true: açma tabı için, false: evrakNo için
  const { manuelOkuma, baslangicZoom } = useTarayiciAyarlari();

  // Arama tipi (açma hareketleri)
  const [aramaTipi, setAramaTipi] = useState(3);
  const [aramaTipiAcik, setAramaTipiAcik] = useState(false);
  const [miktarliGiris, setMiktarliGiris] = useState(false);

  // Yüzer menü (FAB)
  const [yuzerMenuAcik, setYuzerMenuAcik] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  // PDF
  const [kaydedilenRefNo, setKaydedilenRefNo] = useState<number | null>(null);
  const [pdfModalAcik, setPdfModalAcik] = useState(false);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  const [pdfDosyaUri, setPdfDosyaUri] = useState<string | null>(null);

  // ── Sayfaya her girişte sıfırla (CariSecim dönüşü hariç) ──────────────────
  const cariDonus = useRef(false);
  useFocusEffect(
    useCallback(() => {
      const pending = useAppStore.getState().pendingCari;
      if (pending && pending.target === 'SiparisKapama') {
        setAdim('fisListesi');
        setFisListesi([]);
        setAcmaListesi([]);
        setKapamaSepeti([]);
        setSecilenFisler([]);
        setAktifTab('acma');
        setAramaMetni('');
        setEvrakNo('');
        setSecilenCari(pending.cari);
        cariDonus.current = true;
        if (_savedGrup) {
          setSecilenGrup(_savedGrup);
          setSecilenFisTipi(_savedFisTipi);
          _savedGrup = null;
          _savedFisTipi = null;
        }
        useAppStore.getState().clearPendingCari();
        return;
      }
      setAdim('fisListesi');
      setSecilenCari(null);
      setEvrakNo('');
      setFisListesi([]);
      setAcmaListesi([]);
      setKapamaSepeti([]);
      setSecilenFisler([]);
      setAktifTab('acma');
      setAramaMetni('');
    }, [])
  );

  // ── Ayarlardan varsayılan değerleri yükle ────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(Config.STORAGE_KEYS.MIKTARLI_GIRIS_VARSAYILAN).then((v) => {
      if (v === 'true') setMiktarliGiris(true);
    });
    AsyncStorage.getItem(Config.STORAGE_KEYS.VARSAYILAN_ARAMA_TIPI).then((v) => {
      if (v !== null) setAramaTipi(parseInt(v, 10));
    });
  }, []);

  // ── FisTipi gruplarını al ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const sonuc = await fisTipleriniAl(calisilanSirket);
        if (sonuc.sonuc && sonuc.data) {
          const gruplar = sonuc.data.filter((g) =>
            g.evrakTipi.trim() === 'Sipariş Kapama'
          );
          setKapamaGruplari(gruplar);
          // CariSecim dönüşünde seçimi ezme — zaten restore edildi
          if (cariDonus.current) {
            cariDonus.current = false;
            return;
          }
          if (gruplar.length > 0) {
            const varsayilanFisTipiNo = yetkiBilgileri?.siparisKapama ?? 0;
            // YetkiBilgileri'ndeki siparisKapama numarasına göre eşleşen grubu ve fiş tipini bul
            let eslesenGrup: typeof gruplar[0] | null = null;
            let eslesenFisTipi: FisTipiItem | null = null;
            if (varsayilanFisTipiNo > 0) {
              for (const g of gruplar) {
                const ft = g.ftListe?.find((f) => f.fisTipiKodu === varsayilanFisTipiNo);
                if (ft) {
                  eslesenGrup = g;
                  eslesenFisTipi = ft;
                  break;
                }
              }
            }
            setSecilenGrup(eslesenGrup ?? gruplar[0]);
            setSecilenFisTipi(eslesenFisTipi ?? gruplar[0].ftListe?.[0] ?? null);
          }
        }
      } catch {}
    })();
  }, [calisilanSirket]);

  // ── Fiş Listesi Ara ────────────────────────────────────────────────────────
  const fisleriniAra = useCallback(async () => {
    if (!secilenGrup) {
      toast.warning(t('siparis.fisTipiSec'));
      return;
    }
    if (!secilenCari && !evrakNo.trim()) {
      toast.warning(t('siparis.cariVeyaEvrak'));
      return;
    }

    setFisYukleniyor(true);
    try {
      const alSat = secilenFisTipi?.fisTipiAdi?.toUpperCase().includes('ALI') ? 1 : 2;
      let sonuc;
      if (evrakNo.trim()) {
        sonuc = await siparisEvrakNumarasiniKontrolEt(evrakNo.trim(), calisilanSirket, alSat);
      } else if (secilenCari) {
        sonuc = await cariSiparisListesiniAl(secilenCari.cariKodu, calisilanSirket, alSat);
      }
      if (sonuc?.sonuc) {
        setFisListesi(sonuc.data ?? []);
        if ((sonuc.data ?? []).length === 0) {
          toast.info(t('siparis.fisBulunamadi'));
        }
      } else {
        toast.error(sonuc?.mesaj || t('siparis.fisAlinamadi'));
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.mesaj || e?.message || t('common.baglantiHatasi'));
    } finally {
      setFisYukleniyor(false);
    }
  }, [secilenCari, evrakNo, secilenGrup, secilenFisTipi, calisilanSirket]);

  // ── Cari seçilince otomatik ara ────────────────────────────────────────────
  useEffect(() => {
    if (secilenCari && secilenGrup) {
      fisleriniAra();
    }
  }, [secilenCari]);

  // ── Hareketleri Yükle (tek fiş veya hepsi) ────────────────────────────────
  const normalizeHareketler = (data: AcmaSiparisHareketBilgileri[]) =>
    data.map((item) => ({
      ...item,
      sepetMiktar: item.sepetMiktar ?? 0,
      tesMiktar: item.tesMiktar ?? 0,
      kalMiktar: item.kalMiktar ?? 0,
      miktar: item.miktar ?? 0,
      fiyat: item.fiyat ?? 0,
      carpan: item.carpan ?? 0,
      kdvOrani: item.kdvOrani ?? 0,
    }));

  const hareketleriYukle = useCallback(
    async (fisler: AcmaSiparisFisBilgileri[], hepsi: boolean = false) => {
      if (!secilenGrup) return;
      setHareketYukleniyor(true);
      setSecilenFisler(fisler);
      try {
        const alSat = secilenFisTipi?.fisTipiAdi?.toUpperCase().includes('ALI') ? 1 : 2;
        let tumHareketler: AcmaSiparisHareketBilgileri[] = [];

        if (hepsi && secilenCari) {
          // "Hepsi" → cari bazlı tüm hareketleri al (MAUI: CariSiparisHareketListesiniAl)
          const sonuc = await cariAcmaHareketleriniAl(secilenCari.cariKodu, calisilanSirket, alSat);
          if (sonuc.sonuc && sonuc.data) {
            tumHareketler = normalizeHareketler(sonuc.data);
          } else {
            toast.error(sonuc.mesaj || t('siparis.hareketAlinamadi'));
          }
        } else {
          // Tek fiş → evrak bazlı hareketleri al (MAUI: SiparisEvrakHareketiniAl)
          for (const fis of fisler) {
            const sonuc = await evrakAcmaHareketleriniAl(fis.refno, calisilanSirket, alSat);
            if (sonuc.sonuc && sonuc.data) {
              tumHareketler = [...tumHareketler, ...normalizeHareketler(sonuc.data)];
            }
          }
        }

        setAcmaListesi(tumHareketler);
        setKapamaSepeti([]);
        setAktifTab('acma');
        setAramaMetni('');
        setAdim('hareketler');
      } catch {
        toast.error(t('siparis.hareketAlinamadi'));
      } finally {
        setHareketYukleniyor(false);
      }
    },
    [calisilanSirket, secilenGrup, secilenCari]
  );

  // ── Hesaplanmış alanlar ────────────────────────────────────────────────────
  const kalanMiktar = (ashb: AcmaSiparisHareketBilgileri) =>
    ashb.kalMiktar - ashb.sepetMiktar;
  const teslimEdilenMiktar = (ashb: AcmaSiparisHareketBilgileri) =>
    ashb.tesMiktar + ashb.sepetMiktar;

  // ── Açma listesinde satır rengi ────────────────────────────────────────────
  const satirRengi = (ashb: AcmaSiparisHareketBilgileri): string | undefined => {
    if (kalanMiktar(ashb) <= 0) return '#d5ffea';
    if (ashb.sepetMiktar > 0) return '#faf3cf';
    return undefined;
  };

  // ── Sipariş Ekle (açma → kapama) ──────────────────────────────────────────
  const siparisEkle = (ashb: AcmaSiparisHareketBilgileri, miktar: number) => {
    if (miktar + ashb.sepetMiktar > ashb.kalMiktar) {
      toast.warning(t('siparis.miktarBuyuk'));
      return;
    }

    hafifTitresim();

    setAcmaListesi((prev) =>
      prev.map((item) =>
        item.takipNo === ashb.takipNo
          ? { ...item, sepetMiktar: item.sepetMiktar + miktar }
          : item
      )
    );

    setKapamaSepeti((prev) => {
      const mevcut = prev.find((k) => k.siparisTakipNo === ashb.takipNo);
      if (mevcut) {
        return prev.map((k) =>
          k.siparisTakipNo === ashb.takipNo
            ? { ...k, miktar: k.miktar + miktar }
            : k
        );
      }
      return [
        ...prev,
        {
          stokKodu: ashb.stokKodu,
          stokCinsi: ashb.stokCinsi,
          barkod: '',
          birim: ashb.birim ?? '',
          depoKodu: ashb.depo ?? '',
          fiyat: ashb.fiyat,
          miktar,
          kdvOrani: ashb.kdvOrani,
          siparisTakipNo: ashb.takipNo,
        },
      ];
    });
  };

  // ── Kapama kaleminin miktarını düzenle ─────────────────────────────────────
  const kapamaMiktarDuzenle = (kalem: KapamaSepetKalem, yeniMiktar: number) => {
    const fark = yeniMiktar - kalem.miktar;
    const ashb = acmaListesi.find((a) => a.takipNo === kalem.siparisTakipNo);
    if (ashb && fark > 0 && ashb.sepetMiktar + fark > ashb.kalMiktar) {
      toast.warning(t('siparis.miktarBuyuk'));
      return;
    }

    setAcmaListesi((prev) =>
      prev.map((item) =>
        item.takipNo === kalem.siparisTakipNo
          ? { ...item, sepetMiktar: item.sepetMiktar + fark }
          : item
      )
    );

    setKapamaSepeti((prev) =>
      prev.map((k) =>
        k.siparisTakipNo === kalem.siparisTakipNo
          ? { ...k, miktar: yeniMiktar }
          : k
      )
    );
  };

  // ── Kapama kalemini sil ────────────────────────────────────────────────────
  const kapamaKalemSil = (kalem: KapamaSepetKalem) => {
    setAcmaListesi((prev) =>
      prev.map((item) =>
        item.takipNo === kalem.siparisTakipNo
          ? { ...item, sepetMiktar: item.sepetMiktar - kalem.miktar }
          : item
      )
    );
    setKapamaSepeti((prev) =>
      prev.filter((k) => k.siparisTakipNo !== kalem.siparisTakipNo)
    );
  };

  // ── Evrak Kaydet ───────────────────────────────────────────────────────────
  const evrakKaydet = async () => {
    if (!secilenCari && fisListesi.length === 0) {
      toast.warning(t('siparis.cariSec'));
      return;
    }
    if (kapamaSepeti.length === 0) {
      toast.warning(t('siparis.sepetBos'));
      return;
    }
    if (!secilenFisTipi) {
      toast.warning(t('siparis.fisTipiBulunamadi'));
      return;
    }

    const cariKodu = secilenCari?.cariKodu || (fisListesi.length > 0 ? fisListesi[0].cariKodu : '');
    const cariUnvan = secilenCari?.cariUnvan || '';

    setKaydediliyor(true);
    try {
      const khbListe: KapatmaHareketBilgileri[] = kapamaSepeti.map((k) => ({
        birim: k.birim,
        depoKodu: k.depoKodu,
        fiyat: k.fiyat,
        kdvOrani: k.kdvOrani,
        miktar: k.miktar,
        stokCinsi: k.stokCinsi,
        stokKodu: k.stokKodu,
        takipNo: k.siparisTakipNo,
      }));
     
      const sonuc = await siparisKapamaKaydet(
        {
          guid: generateGuid(),
          khbListe,
          ckb: { cariKodu, cariUnvan },
          fisTipi: secilenFisTipi.fisTipiKodu,
        },
        calisilanSirket
      );
        
      if (sonuc.sonuc) basariliTitresim();
      if (sonuc.sonuc) {
        toast.success(sonuc.mesaj || t('siparis.kaydedildi'));
        if (sonuc.data) setKaydedilenRefNo(sonuc.data);
        setKaydedildi(true);
      } else {
        toast.error(sonuc.mesaj || t('siparis.hataOlustu'));
      }
    } catch (e: any) {
      toast.error(e?.message || t('common.baglantiHatasi'));
    } finally {
      setKaydediliyor(false);
    }
  };

  // ── Temizle ────────────────────────────────────────────────────────────────
  const sepetiTemizle = () => {
    Alert.alert(t('siparis.temizleBaslik'), t('siparis.temizleAciklama'), [
      { text: t('common.iptal'), style: 'cancel' },
      {
        text: t('siparis.temizle'),
        style: 'destructive',
        onPress: () => {
          setAcmaListesi((prev) =>
            prev.map((item) => {
              const kalem = kapamaSepeti.find((k) => k.siparisTakipNo === item.takipNo);
              return kalem ? { ...item, sepetMiktar: item.sepetMiktar - kalem.miktar } : item;
            })
          );
          setKapamaSepeti([]);
        },
      },
    ]);
  };

  // ── Barkod → açma satırı eşleştirici (kalan > 0 olanı önceliklendir) ───────
  const stokKodunaBul = (kod: string) =>
    acmaListesi.find(
      (a) => a.stokKodu.toLowerCase() === kod.toLowerCase() && kalanMiktar(a) > 0
    ) ?? acmaListesi.find(
      (a) => a.stokKodu.toLowerCase() === kod.toLowerCase()
    );

  // ── Filtrelenmiş açma listesi ──────────────────────────────────────────────
  const filtrelenmisAcma = (() => {
    if (aramaTipi === 4) return acmaListesi; // Barkod: lokal filtreleme yok, Enter ile API'ye gider
    const q = aramaMetni.trim().toLowerCase();
    if (!q) return acmaListesi;
    const esles = (val: string) => {
      const v = val.toLowerCase();
      if (aramaTipi === 1) return v.startsWith(q);
      if (aramaTipi === 2) return v.endsWith(q);
      return v.includes(q); // İçeren (varsayılan)
    };
    return acmaListesi.filter(
      (a) => esles(a.stokKodu) || esles(a.stokCinsi) || esles(a.takipNo)
    );
  })();

  // ── Miktar Modal İşlemleri ─────────────────────────────────────────────────
  const miktarModalAc = (
    hedef:
      | { tip: 'acma'; ashb: AcmaSiparisHareketBilgileri }
      | { tip: 'kapama'; kalem: KapamaSepetKalem }
  ) => {
    setModalHedef(hedef);
    setModalMiktar(
      hedef.tip === 'kapama' ? String(hedef.kalem.miktar) : '1'
    );
    setMiktarModalGorunur(true);
  };

  const miktarModalOnayla = () => {
    const miktar = parseFloat(modalMiktar.replace(',', '.'));
    if (isNaN(miktar) || miktar <= 0) {
      toast.warning(t('siparis.gecerliMiktar'));
      return;
    }
    if (modalHedef?.tip === 'acma') {
      siparisEkle(modalHedef.ashb, miktar);
    } else if (modalHedef?.tip === 'kapama') {
      kapamaMiktarDuzenle(modalHedef.kalem, miktar);
    }
    setMiktarModalGorunur(false);
    setModalHedef(null);
  };

  // ── Cari seçimi ────────────────────────────────────────────────────────────
  const cariSec = () => {
    _savedGrup = secilenGrup;
    _savedFisTipi = secilenFisTipi;
    navigation.navigate('CariSecim', { returnScreen: 'SiparisKapama' });
  };

  // ── Geri dön ───────────────────────────────────────────────────────────────
  const geriDon = () => {
    if (kapamaSepeti.length > 0) {
      Alert.alert(t('common.uyari'), t('siparis.geriDonOnay'), [
        { text: t('common.iptal'), style: 'cancel' },
        {
          text: t('siparis.geriDon'),
          style: 'destructive',
          onPress: () => {
            setKapamaSepeti([]);
            setAcmaListesi([]);
            setAdim('fisListesi');
          },
        },
      ]);
    } else {
      setAdim('fisListesi');
    }
  };

  // ── Yüzer Menü ────────────────────────────────────────────────────────────
  const toggleYuzerMenu = (acik: boolean) => {
    setYuzerMenuAcik(acik);
    Animated.spring(menuAnim, {
      toValue: acik ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 65,
    }).start();
  };

  // ── PDF ───────────────────────────────────────────────────────────────────
  const handlePdfGoster = async () => {
    if (!kaydedilenRefNo) {
      toast.error(t('siparis.evrakKaydedilmedi'));
      return;
    }
    setPdfModalAcik(true);
    setPdfYukleniyor(true);
    setPdfDosyaUri(null);
    try {
      const base64 = await evrakPdfAl(kaydedilenRefNo, 'Sipariş', calisilanSirket);
      const dosyaYolu = `${FileSystem.cacheDirectory}sipariskapama_${kaydedilenRefNo}.pdf`;
      await FileSystem.writeAsStringAsync(dosyaYolu, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfDosyaUri(dosyaYolu);
    } catch (err: any) {
      setPdfModalAcik(false);
      toast.error(err?.message || t('siparis.pdfAlinamadi'));
    } finally {
      setPdfYukleniyor(false);
    }
  };

  const handlePdfPaylas = async () => {
    if (!pdfDosyaUri) return;
    try {
      await Sharing.shareAsync(pdfDosyaUri, { mimeType: 'application/pdf' });
    } catch {
      toast.error(t('siparis.pdfPaylasilamadi'));
    }
  };

  // ── Fiş tipi seçim fonksiyonu ──────────────────────────────────────────────
  const fisTipiSec = (grup: FisTipiGrup, ft: FisTipiItem) => {
    setSecilenGrup(grup);
    setSecilenFisTipi(ft);
    setFisTipiModalGorunur(false);
    // Fiş listesini sıfırla
    setFisListesi([]);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── RENDER: FİŞ LİSTESİ ADIMI ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderFisListesi = () => (
    <View style={{ flex: 1 }}>
      {/* Fiş Tipi Seçimi */}
      <TouchableOpacity style={[styles.secimBtn, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]} onPress={() => setFisTipiModalGorunur(true)}>
        <Ionicons name="document-text-outline" size={18} color={secilenFisTipi ? Colors.primary : Colors.textSecondary} />
        <Text style={[styles.secimBtnText, { color: Colors.textSecondary }, secilenFisTipi && { color: Colors.text, fontWeight: '600' as const }]}>
          {secilenFisTipi
            ? `${secilenGrup?.alimSatim ?? ''} - ${secilenFisTipi.fisTipiAdi}`
            : t('siparis.fisTipiSeciniz')}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* Evrak No */}
      <View style={[styles.evrakNoRow, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <Ionicons name="document-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          style={[styles.evrakNoInput, { color: Colors.text }]}
          placeholder={t('siparis.evrakNoGiriniz')}
          placeholderTextColor={Colors.textSecondary}
          value={evrakNo}
          onChangeText={(text) => {
            setEvrakNo(text);
            if (text.trim()) setSecilenCari(null);
          }}
          returnKeyType="search"
          onSubmitEditing={fisleriniAra}
        />
        {evrakNo.length > 0 && (
          <TouchableOpacity onPress={() => setEvrakNo('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Cari Seçim */}
      <TouchableOpacity
        style={[styles.secimBtn, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}
        onPress={() => {
          setEvrakNo('');
          cariSec();
        }}
      >
        <Ionicons
          name="person-outline"
          size={18}
          color={secilenCari ? Colors.primary : Colors.textSecondary}
        />
        <Text style={[styles.secimBtnText, { color: Colors.textSecondary }, secilenCari && { color: Colors.text, fontWeight: '600' as const }]}>
          {secilenCari ? secilenCari.cariUnvan : t('siparis.cariUnvaniSeciniz')}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* Ara butonu */}
      <TouchableOpacity
        style={[styles.araBtn, { backgroundColor: Colors.primary }, fisYukleniyor && { opacity: 0.6 }]}
        onPress={fisleriniAra}
        disabled={fisYukleniyor}
      >
        {fisYukleniyor ? (
          <ActivityIndicator size="small" color={'#fff'} />
        ) : (
          <>
            <Ionicons name="search-outline" size={18} color={'#fff'} />
            <Text style={styles.araBtnText}>{t('siparis.araBtn')}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Fiş Listesi */}
      <FlatList
        data={fisListesi}
        keyExtractor={(item, idx) => `${item.refno}-${idx}`}
        renderItem={renderFisSatir}
        contentContainerStyle={styles.listePadding}
        ItemSeparatorComponent={() => <View style={styles.ayirac} />}
        ListEmptyComponent={
          fisYukleniyor ? (
            <SkeletonLoader satirSayisi={4} />
          ) : (
            <EmptyState
              icon="document-text-outline"
              baslik={t('siparis.fisBulunamadi')}
              aciklama={t('siparis.fisBulunamadiAciklama')}
            />
          )
        }
      />

      {/* Hepsi Butonu + Barkod */}
      {fisListesi.length > 0 && (
        <View style={[styles.hepsiBarContainer, { backgroundColor: Colors.card, borderTopColor: Colors.border }]}>
          <TouchableOpacity
            style={[styles.hepsiBtn, { backgroundColor: Colors.primary }, (hareketYukleniyor) && { opacity: 0.6 }]}
            onPress={() => hareketleriYukle(fisListesi, true)}
            disabled={hareketYukleniyor}
          >
            {hareketYukleniyor ? (
              <ActivityIndicator size="small" color={'#fff'} />
            ) : (
              <>
                <Ionicons name="layers-outline" size={18} color={'#fff'} />
                <Text style={styles.hepsiBtnText}>Hepsi ({fisListesi.length} fiş)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ── Render: Fiş Satırı ─────────────────────────────────────────────────────
  const renderFisSatir = ({ item }: { item: AcmaSiparisFisBilgileri }) => (
    <TouchableOpacity
      style={[styles.kart, { backgroundColor: Colors.card }]}
      activeOpacity={0.7}
      onPress={() => hareketleriYukle([item])}
    >
      <View style={styles.fisUstSatir}>
        <Text style={[styles.etiketDeger, { color: Colors.text }]}>
          <Text style={[styles.etiket, { color: Colors.textSecondary }]}>Tarih </Text>
          {formatTarih(item.tarih)}
        </Text>
        <Text style={[styles.etiketDeger, { color: Colors.text }]}>
          <Text style={[styles.etiket, { color: Colors.textSecondary }]}>Evrak No </Text>
          {item.evrakNo}
        </Text>
      </View>
      <View style={styles.fisAltSatir}>
        <Text style={[styles.fisBilgi, { color: Colors.textSecondary }]}>
          <Text style={[styles.etiket, { color: Colors.textSecondary }]}>Cari: </Text>
          {item.cariKodu}
        </Text>
        <Text style={[styles.fisTutar, { color: Colors.primary }]}>
          {paraTL(item.genelToplam)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── RENDER: HAREKETLER ADIMI ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderHareketler = () => (
    <View style={{ flex: 1 }}>
      {/* Geri butonu + başlık */}
      <View style={[styles.hareketBaslik, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <TouchableOpacity style={styles.geriBtn} onPress={geriDon}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.hareketBaslikText, { color: Colors.text }]} numberOfLines={1}>
          {secilenFisler.length === 1
            ? `Evrak: ${secilenFisler[0].evrakNo}`
            : `${secilenFisler.length} fiş seçili`}
        </Text>
      </View>

      {/* Tab seçici */}
      <View style={[styles.tabBar, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, aktifTab === 'acma' && { borderBottomColor: Colors.primary }]}
          onPress={() => {
            if (kaydedildi) {
              setKapamaSepeti([]);
              setKaydedildi(false);
              if (secilenFisler.length > 0) hareketleriYukle(secilenFisler);
            }
            setAktifTab('acma');
          }}
        >
          <Text style={[styles.tabText, { color: Colors.textSecondary }, aktifTab === 'acma' && { color: Colors.primary, fontWeight: '700' as const }]}>
            Açma ({acmaListesi.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, aktifTab === 'kapama' && { borderBottomColor: Colors.primary }]}
          onPress={() => setAktifTab('kapama')}
        >
          <Text style={[styles.tabText, { color: Colors.textSecondary }, aktifTab === 'kapama' && { color: Colors.primary, fontWeight: '700' as const }]}>
            Kapama ({kapamaSepeti.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* İçerik */}
      {aktifTab === 'acma' ? (
        <View style={{ flex: 1 }}>
          {/* Arama satırı */}
          <View style={[styles.aramaRow, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <TouchableOpacity
              style={[styles.aramaTipiBtn, { backgroundColor: `${Colors.primary}15` }]}
              onPress={() => setAramaTipiAcik(!aramaTipiAcik)}
            >
              <Text style={[styles.aramaTipiBtnText, { color: Colors.primary }]}>
                {ARAMA_TIPLERI.find((at) => at.value === aramaTipi)?.label ?? 'İçeren'}
              </Text>
              <Ionicons name="chevron-down" size={13} color={Colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.aramaInput, { color: Colors.text }]}
              placeholder={aramaTipi === 4 ? 'Barkod giriniz...' : 'Stok kodu, cinsi veya takip no ara...'}
              placeholderTextColor={Colors.textSecondary}
              value={aramaMetni}
              onChangeText={setAramaMetni}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (aramaTipi !== 4) return;
                const barkod = aramaMetni.trim();
                if (!barkod) return;
                if (acmaListesi.length === 0) {
                  toast.warning('Önce sipariş listesini yükleyiniz.');
                  return;
                }
                const bulunan = stokKodunaBul(barkod);
                if (bulunan) {
                  const kalan = kalanMiktar(bulunan);
                  if (kalan <= 0) {
                    toast.warning('Bu kalemin tüm siparişleri tamamlandı.');
                  } else if (miktarliGiris) {
                    miktarModalAc({ tip: 'acma', ashb: bulunan });
                  } else {
                    siparisEkle(bulunan, 1);
                  }
                  setAramaMetni('');
                } else {
                  barkoddanStokKodunuBul(barkod, calisilanSirket).then((sonuc) => {
                    if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
                      const stokKodu = sonuc.data[0].stokKodu;
                      const apiBulunan = stokKodunaBul(stokKodu);
                      if (apiBulunan) {
                        const kalan = kalanMiktar(apiBulunan);
                        if (kalan <= 0) {
                          toast.warning('Bu kalemin tüm siparişleri tamamlandı.');
                        } else if (miktarliGiris) {
                          miktarModalAc({ tip: 'acma', ashb: apiBulunan });
                        } else {
                          siparisEkle(apiBulunan, 1);
                        }
                      } else {
                        toast.warning(`"${barkod}" barkodlu ürün açık siparişlerde bulunamadı.`);
                      }
                    } else {
                      toast.warning(`"${barkod}" barkodlu ürün bulunamadı.`);
                    }
                    setAramaMetni('');
                  });
                }
              }}
            />
            {aramaMetni.length > 0 && (
              <TouchableOpacity onPress={() => setAramaMetni('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.miktarBtn, miktarliGiris && { backgroundColor: Colors.primary }]}
              onPress={() => setMiktarliGiris(!miktarliGiris)}
            >
              <Ionicons name={miktarliGiris ? 'checkbox' : 'square-outline'} size={16} color={miktarliGiris ? '#fff' : Colors.primary} />
              <Text style={[styles.miktarBtnText, { color: miktarliGiris ? '#fff' : Colors.primary }]}>Miktarlı</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setBarkodAcmaIcin(true); setBarkodModalGorunur(true); }}
              style={{ padding: 2 }}
            >
              <Ionicons name="barcode-outline" size={24} color={Colors.primary} />
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
                  <Text style={[
                    styles.aramaTipiItemText,
                    { color: Colors.text },
                    tip.value === aramaTipi && { fontWeight: '700', color: Colors.primary },
                  ]}>
                    {tip.label}
                  </Text>
                  {tip.value === aramaTipi && (
                    <Ionicons name="checkmark" size={16} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <FlatList
            data={filtrelenmisAcma}
            keyExtractor={(item, idx) => `${item.takipNo}-${idx}`}
            renderItem={renderAcmaSatir}
            contentContainerStyle={styles.listePadding}
            ItemSeparatorComponent={() => <View style={styles.ayirac} />}
            ListEmptyComponent={
              hareketYukleniyor ? (
                <SkeletonLoader satirSayisi={5} />
              ) : (
                <EmptyState icon="document-text-outline" baslik="Açık sipariş bulunamadı" aciklama="Bu evrak için açık sipariş hareketi bulunmamaktadır" />
              )
            }
          />
        </View>
      ) : (
        <FlatList
          data={kapamaSepeti}
          keyExtractor={(item) => item.siparisTakipNo}
          renderItem={renderKapamaSatir}
          contentContainerStyle={styles.listePadding}
          ItemSeparatorComponent={() => <View style={styles.ayirac} />}
          ListEmptyComponent={
            <EmptyState icon="cart-outline" baslik="Kapama sepeti boş" aciklama="Açma hareketlerinden ürün ekleyiniz" />
          }
        />
      )}

    </View>
  );

  // ── Yüzer Menü + PDF Modal render ─────────────────────────────────────────
  const renderYuzerMenu = () => (
    <>
      {/* Overlay */}
      {yuzerMenuAcik && (
        <Pressable style={styles.yuzerOverlay} onPress={() => toggleYuzerMenu(false)}>
          <View style={[styles.yuzerMenuKapsayici, { bottom: 90 + insets.bottom }]}>
            {[
              { label: 'Kaydet', icon: 'save-outline' as const, color: Colors.primary, onPress: () => { toggleYuzerMenu(false); evrakKaydet(); }, disabled: kaydediliyor || kaydedildi },
              { label: 'PDF Göster', icon: 'document-text-outline' as const, color: Colors.primary, onPress: () => { toggleYuzerMenu(false); handlePdfGoster(); }, disabled: false },
              { label: 'Temizle', icon: 'trash-outline' as const, color: '#e53935', onPress: () => { toggleYuzerMenu(false); sepetiTemizle(); }, disabled: kaydediliyor || kaydedildi },
            ].map((item, idx) => {
              const translateY = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
              const opacity = menuAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, idx < 1 ? 0.3 : 0.7, 1] });
              return (
                <Animated.View key={item.label} style={{ transform: [{ translateY }], opacity }}>
                  <TouchableOpacity
                    style={[styles.yuzerMenuItem, { backgroundColor: Colors.card }, item.disabled && styles.butonDisabled]}
                    onPress={item.onPress}
                    disabled={item.disabled}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.yuzerMenuIconKutu, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name={item.icon} size={20} color={item.color} />
                    </View>
                    <Text style={[styles.yuzerMenuLabel, { color: item.color }]}>{item.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Pressable>
      )}

      {/* PDF Modal */}
      <Modal visible={pdfModalAcik} animationType="slide" onRequestClose={() => setPdfModalAcik(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.card }}>
          <View style={[styles.pdfBar, { borderBottomColor: Colors.border }]}>
            <TouchableOpacity onPress={() => setPdfModalAcik(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={[styles.pdfBarBaslik, { color: Colors.text }]}>Sipariş PDF</Text>
            <TouchableOpacity onPress={handlePdfPaylas} disabled={!pdfDosyaUri}>
              <Ionicons name="share-outline" size={24} color={pdfDosyaUri ? Colors.primary : Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {pdfYukleniyor ? (
            <View style={styles.pdfMerkez}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>PDF yükleniyor...</Text>
            </View>
          ) : pdfDosyaUri ? (
            <PdfViewer fileUri={pdfDosyaUri} style={{ flex: 1 }} />
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* FAB */}
      {adim === 'hareketler' && aktifTab === 'kapama' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: Colors.primary, bottom: 24 + insets.bottom }]}
          onPress={() => toggleYuzerMenu(!yuzerMenuAcik)}
          activeOpacity={0.8}
        >
          {kaydediliyor ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name={yuzerMenuAcik ? 'close' : 'ellipsis-vertical'} size={24} color="#fff" />
          )}
        </TouchableOpacity>
      )}
    </>
  );

  // ── Render: Açma satırı ────────────────────────────────────────────────────
  const renderAcmaSatir = ({ item }: { item: AcmaSiparisHareketBilgileri }) => {
    const kalan = kalanMiktar(item);
    const teslim = teslimEdilenMiktar(item);
    return (
      <TouchableOpacity
        style={[styles.kart, { backgroundColor: satirRengi(item) ?? Colors.card }]}
        activeOpacity={0.7}
        onPress={() => {
          if (kalan <= 0) {
            toast.warning('Bu kalemin tüm siparişleri tamamlandı.');
            return;
          }
          if (miktarliGiris) {
            miktarModalAc({ tip: 'acma', ashb: item });
          } else {
            siparisEkle(item, 1);
          }
        }}
        onLongPress={() => {
          if (kalan <= 0) return;
          miktarModalAc({ tip: 'acma', ashb: item });
        }}
        delayLongPress={400}
      >
        <View style={styles.acmaUstSatir}>
          <Text style={[styles.etiketDeger, { color: Colors.text }]}>
            <Text style={[styles.etiket, { color: Colors.textSecondary }]}>Tarih </Text>
            {formatTarih(item.tarih)}
          </Text>
          <Text style={[styles.etiketDeger, { color: Colors.text }]}>
            <Text style={[styles.etiket, { color: Colors.textSecondary }]}>Takip No </Text>
            {item.takipNo}
          </Text>
        </View>
        <Text style={[styles.stokKodu, { color: Colors.textSecondary }]}>{item.stokKodu}</Text>
        <Text style={[styles.stokCinsi, { color: Colors.text }]} numberOfLines={2}>{item.stokCinsi}</Text>
        <View style={styles.miktarSatirlar}>
          <MiktarKutu etiket="Miktar" deger={miktarFormat(item.miktar)} />
          <MiktarKutu etiket="Teslim" deger={miktarFormat(teslim)} renk="#43a047" />
          <MiktarKutu etiket="Bekleyen" deger={miktarFormat(kalan)} renk={kalan === 0 ? '#43a047' : '#e53935'} />
        </View>
        {item.sepetMiktar > 0 && (
          <View style={styles.miktarSatirlar}>
            <MiktarKutu etiket="Sepet" deger={miktarFormat(item.sepetMiktar)} renk={Colors.primary} />
            <MiktarKutu etiket="Kalan" deger={miktarFormat(kalan)} renk={kalan === 0 ? '#43a047' : '#e53935'} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Render: Kapama satırı ──────────────────────────────────────────────────
  const renderKapamaSatir = ({ item }: { item: KapamaSepetKalem }) => (
    <View style={[styles.kart, { backgroundColor: Colors.card }]}>
      <View style={styles.kapamaUstSatir}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stokKodu, { color: Colors.textSecondary }]}>{item.stokKodu}</Text>
          <Text style={[styles.stokCinsi, { color: Colors.text }]} numberOfLines={2}>{item.stokCinsi}</Text>
        </View>
        <TouchableOpacity
          style={styles.silBtn}
          onPress={() =>
            Alert.alert('Sil', `${item.stokKodu} kalemini silmek istiyor musunuz?`, [
              { text: 'İptal', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: () => kapamaKalemSil(item) },
            ])
          }
        >
          <Ionicons name="trash-outline" size={20} color="#e53935" />
        </TouchableOpacity>
      </View>
      <View style={styles.kapamaAltSatir}>
        <Text style={[styles.fiyatText, { color: Colors.textSecondary }]}>Fiyat: {paraTL(item.fiyat)}</Text>
        <TouchableOpacity
          style={styles.miktarDuzenleBtn}
          onPress={() => miktarModalAc({ tip: 'kapama', kalem: item })}
        >
          <Text style={[styles.miktarDuzenleBtnText, { color: Colors.primary }]}>
            Miktar: {miktarFormat(item.miktar)}
          </Text>
          <Ionicons name="create-outline" size={14} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.tutarText, { color: Colors.primary }]}>Tutar: {paraTL(item.fiyat * item.miktar)}</Text>
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ANA RENDER ─────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      {adim === 'fisListesi' ? renderFisListesi() : renderHareketler()}

      {/* Miktar Modal */}
      <Modal visible={miktarModalGorunur} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalKutu, { backgroundColor: Colors.card }]}>
            <Text style={[styles.modalBaslik, { color: Colors.text }]}>
              {modalHedef?.tip === 'acma'
                ? modalHedef.ashb.stokCinsi
                : modalHedef?.tip === 'kapama'
                ? modalHedef.kalem.stokCinsi
                : ''}
            </Text>
            {modalHedef?.tip === 'acma' && (
              <Text style={[styles.modalAltBilgi, { color: Colors.textSecondary }]}>
                Kalan: {miktarFormat(kalanMiktar(modalHedef.ashb))}
              </Text>
            )}
            <TextInput
              style={[styles.modalInput, { color: Colors.text, borderColor: Colors.border }]}
              keyboardType="decimal-pad"
              value={modalMiktar}
              onChangeText={setModalMiktar}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalIptal]}
                onPress={() => setMiktarModalGorunur(false)}
              >
                <Text style={[styles.modalIptalText, { color: Colors.textSecondary }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalOnayla, { backgroundColor: Colors.primary }]}
                onPress={miktarModalOnayla}
              >
                <Text style={styles.modalOnaylaText}>
                  {modalHedef?.tip === 'acma' ? 'Ekle' : 'Güncelle'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fiş Tipi Seçim Modal */}
      <Modal visible={fisTipiModalGorunur} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.fisTipiModalKutu, { backgroundColor: Colors.card }]}>
            <View style={[styles.fisTipiModalBaslik, { borderBottomColor: Colors.border }]}>
              <Text style={[styles.fisTipiModalBaslikText, { color: Colors.text }]}>{t('siparis.fisTipiSecBaslik')}</Text>
              <TouchableOpacity onPress={() => setFisTipiModalGorunur(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={kapamaGruplari}
              keyExtractor={(g, i) => `${g.evrakTipi}-${i}`}
              renderItem={({ item: grup }) => (
                <View>
                  <Text style={[styles.fisTipiGrupBaslik, { color: Colors.textSecondary, backgroundColor: Colors.background }]}>{grup.alimSatim} - {grup.evrakTipi}</Text>
                  {grup.ftListe?.map((ft, idx) => (
                    <TouchableOpacity
                      key={`${ft.fisTipiKodu}-${idx}`}
                      style={[
                        styles.fisTipiSatir,
                        secilenFisTipi?.fisTipiKodu === ft.fisTipiKodu && styles.fisTipiSatirSecili,
                      ]}
                      onPress={() => fisTipiSec(grup, ft)}
                    >
                      <Ionicons
                        name={secilenFisTipi?.fisTipiKodu === ft.fisTipiKodu ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={secilenFisTipi?.fisTipiKodu === ft.fisTipiKodu ? Colors.primary : Colors.textSecondary}
                      />
                      <Text style={[styles.fisTipiSatirText, { color: Colors.text }]}>{ft.fisTipiAdi}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              ListEmptyComponent={
                <Text style={[styles.bosMetin, { color: Colors.textSecondary }]}>Kapama fiş tipi bulunamadı</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Barkod Tarayıcı Modal */}
      <BarcodeScannerModal
        visible={barkodModalGorunur}
        onClose={() => setBarkodModalGorunur(false)}
        manuelOkuma={manuelOkuma}
        baslangicZoom={baslangicZoom}
        onDetected={(barkod) => {
          setBarkodModalGorunur(false);
          if (barkodAcmaIcin) {
            // Açma hareketleri tabı: listede stokKodu ile ara, bulunamazsa API ile barkoddan stok kodu bul
            setBarkodAcmaIcin(false);
            if (acmaListesi.length === 0) {
              toast.warning('Önce sipariş listesini yükleyiniz.');
              return;
            }
            const islemYap = (ashb: AcmaSiparisHareketBilgileri) => {
              const kalan = kalanMiktar(ashb);
              if (kalan <= 0) {
                toast.warning('Bu kalemin tüm siparişleri tamamlandı.');
                return;
              }
              if (miktarliGiris) {
                miktarModalAc({ tip: 'acma', ashb });
              } else {
                siparisEkle(ashb, 1);
              }
            };
            const lokalde = stokKodunaBul(barkod);
            if (lokalde) {
              islemYap(lokalde);
            } else {
              barkoddanStokKodunuBul(barkod, calisilanSirket).then((sonuc) => {
                if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
                  const stokKodu = sonuc.data[0].stokKodu;
                  const apiBulunan = stokKodunaBul(stokKodu);
                  if (apiBulunan) {
                    islemYap(apiBulunan);
                  } else {
                    toast.warning(`"${barkod}" barkodlu ürün açık siparişlerde bulunamadı.`);
                  }
                } else {
                  toast.warning(`"${barkod}" barkodlu ürün bulunamadı.`);
                }
              });
            }
          } else {
            // Fiş listesi tabı: evrak no olarak kullan
            setEvrakNo(barkod);
            setSecilenCari(null);
          }
        }}
      />

      {/* Yükleniyor overlay */}
      {(hareketYukleniyor || kaydediliyor) && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {renderYuzerMenu()}
    </View>
  );
}

// ─── Yardımcı bileşen ────────────────────────────────────────────────────────
function MiktarKutu({
  etiket,
  deger,
  renk,
}: {
  etiket: string;
  deger: string;
  renk?: string;
}) {
  const Colors = useColors();
  return (
    <View style={[styles.miktarKutu, { backgroundColor: Colors.background }]}>
      <Text style={[styles.miktarEtiket, { color: Colors.textSecondary }]}>{etiket}</Text>
      <Text style={[styles.miktarDeger, { color: renk ?? Colors.text }]}>{deger}</Text>
    </View>
  );
}

// ─── Stiller ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  ekran: { flex: 1 },

  // Seçim butonları (Fiş tipi, Cari)
  secimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  secimBtnText: { flex: 1, fontSize: 14 },

  // Evrak No
  evrakNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  evrakNoInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },

  barkodBtn: {
    padding: 6,
    marginLeft: 2,
  },

  // Ara butonu
  araBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  araBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Fiş satır
  fisUstSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fisAltSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fisBilgi: { fontSize: 12 },
  fisTutar: { fontSize: 14, fontWeight: '700' },
  // Hepsi butonu
  hepsiBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  hepsiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  hepsiBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hepsiBarkodBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hareket başlık
  hareketBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  geriBtn: {
    padding: 4,
  },
  hareketBaslikText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 14, fontWeight: '500' },

  // Arama
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 10,
    marginBottom: 4,
    borderWidth: 1,
    gap: 6,
  },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },

  // Liste
  listePadding: { padding: 10, paddingTop: 6 },
  ayirac: { height: 8 },

  // Kart
  kart: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Açma satır
  acmaUstSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  etiket: { fontSize: 11, fontWeight: '600' },
  etiketDeger: { fontSize: 11, fontWeight: '600' },
  stokKodu: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  stokCinsi: { fontSize: 14, fontWeight: '700', marginTop: 2, marginBottom: 8 },

  miktarSatirlar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  miktarKutu: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  miktarEtiket: { fontSize: 10, marginBottom: 2 },
  miktarDeger: { fontSize: 13, fontWeight: '700' },

  // Kapama satır
  kapamaUstSatir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  silBtn: {
    padding: 6,
  },
  kapamaAltSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  fiyatText: { fontSize: 12 },
  miktarDuzenleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miktarDuzenleBtnText: { fontSize: 13, fontWeight: '700' },
  tutarText: { fontSize: 13, fontWeight: '700' },

  // Alt bar
  altBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  altBarBilgi: { flex: 1 },
  altBarKalem: { fontSize: 12 },
  altBarToplam: { fontSize: 16, fontWeight: '700' },
  temizleBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
  },
  kaydetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  kaydetBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Boş ekran
  bosMetin: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    padding: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKutu: {
    borderRadius: 16,
    padding: 20,
    width: '80%',
    gap: 16,
  },
  modalBaslik: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalAltBilgi: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: -8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalIptal: {
    backgroundColor: '#f5f5f5',
  },
  modalIptalText: { fontWeight: '600' },
  modalOnayla: {
  },
  modalOnaylaText: { color: '#fff', fontWeight: '700' },

  // Fiş Tipi Modal
  fisTipiModalKutu: {
    borderRadius: 16,
    width: '85%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  fisTipiModalBaslik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  fisTipiModalBaslikText: {
    fontSize: 16,
    fontWeight: '700',
  },
  fisTipiGrupBaslik: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  fisTipiSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fisTipiSatirSecili: {
    backgroundColor: '#f0f4ff',
  },
  fisTipiSatirText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Arama tipi dropdown
  aramaTipiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  aramaTipiBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  aramaTipiDropdown: {
    marginHorizontal: 10,
    marginTop: -4,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  aramaTipiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  aramaTipiItemText: {
    fontSize: 14,
  },

  // Miktarlı giriş toggle
  miktarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miktarBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // FAB & Yüzer Menü
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  yuzerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 10,
  },
  yuzerMenuKapsayici: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    gap: 8,
    alignItems: 'flex-end',
  },
  yuzerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  yuzerMenuIconKutu: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yuzerMenuLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  butonDisabled: {
    opacity: 0.5,
  },

  // PDF Modal
  pdfBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pdfBarBaslik: { fontSize: 16, fontWeight: '600' },
  pdfMerkez: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
