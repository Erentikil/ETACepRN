import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Platform,
  Modal,
  Animated,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { evrakKaydet, generateGuid, adresBilgileriniAl, kurBilgileriniAl, entegratoreYolla } from '../../api/hizliIslemlerApi';
import { evrakRBKaydet } from '../../api/renkBedenApi';
import type { EvrakRBKaydetOptions } from '../../api/renkBedenApi';
import { evrakiKaydet as taslakKaydet } from '../../utils/bekleyenEvraklarStorage';
import { aktifSepetTemizle } from '../../utils/aktifSepetStorage';
import type { EvrakKaydetOptions } from '../../api/hizliIslemlerApi';
import { evrakPdfAl } from '../../api/raporApi';
import UrunMiktariBelirleModal from '../../components/UrunMiktariBelirleModal';
import DropdownSecim from '../../components/DropdownSecim';
import { Colors } from '../../constants/Colors';
import { paraFormat, paraTL, miktarFormat } from '../../utils/format';
import { EvrakTipi, AlimSatim } from '../../models';
import type { SepetKalem, SepetRBKalem, SepetBaslik, StokListesiBilgileri, AdresBilgileri, KDVKisimTablosu, KurBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';
import { toast } from '../../components/Toast';
import AnimatedListItem from '../../components/AnimatedListItem';
import { ortaTitresim, basariliTitresim } from '../../utils/haptics';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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

// ─── Hesaplamalar ────────────────────────────────────────────────────────────

function hesapla(kalemler: SepetKalem[], kdvDurum: number, genelIndirimYuzde: number, genelIndirimTutarDeger: number = 0) {
  let malToplam = 0;
  let kalemIndirimlerToplam = 0;
  let kdvToplam = 0;

  const kalemSonrasiNet = () => malToplam - kalemIndirimlerToplam;
  const indirimYuzdeOrani = genelIndirimTutarDeger > 0 ? 0 : genelIndirimYuzde;

  for (const k of kalemler) {
    const ham = k.miktar * k.birimFiyat;
    malToplam += ham;

    const netKalem =
      ham *
      (1 - k.kalemIndirim1 / 100) *
      (1 - k.kalemIndirim2 / 100) *
      (1 - k.kalemIndirim3 / 100);
    kalemIndirimlerToplam += ham - netKalem;

    const netAfterGenel = netKalem * (1 - indirimYuzdeOrani / 100);
    kdvToplam += netAfterGenel * (k.kdvOrani / 100);
  }

  const genelIndirimTutar = genelIndirimTutarDeger > 0
    ? genelIndirimTutarDeger
    : kalemSonrasiNet() * genelIndirimYuzde / 100;
  const genelToplam =
    kdvDurum === 1
      ? malToplam - kalemIndirimlerToplam - genelIndirimTutar
      : malToplam - kalemIndirimlerToplam - genelIndirimTutar + kdvToplam;

  const toplamMiktar = kalemler.reduce((t, k) => t + k.miktar, 0);

  return { malToplam, kalemIndirimlerToplam, genelIndirimTutar, kdvToplam, genelToplam, toplamMiktar };
}

// ─── RB ↔ Normal dönüşüm yardımcıları ───────────────────────────────────────

function rbToSepetKalem(rbk: SepetRBKalem): SepetKalem {
  return {
    stokKodu: rbk.stokKodu,
    stokCinsi: rbk.stokCinsi,
    barkod: rbk.barkod,
    birim: rbk.birim,
    miktar: rbk.miktar,
    birimFiyat: rbk.fiyat,
    kdvOrani: rbk.kdvOrani,
    kalemIndirim1: rbk.kalemIndirim1,
    kalemIndirim2: rbk.kalemIndirim2,
    kalemIndirim3: rbk.kalemIndirim3,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SepetListesi() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { yetkiBilgileri, calisilanSirket, kdvBilgileri, fiyatTipListesi } = useAppStore();

  // RB modu tespiti
  const isRBMode = !!route.params.rbKalemler;
  const [rbKalemler, setRbKalemler] = useState<SepetRBKalem[]>(route.params.rbKalemler ?? []);

  // Normal modda sepet doğrudan params'tan gelir; RB modda kalemler rbKalemler'den türetilir
  const [sepet, setSepet] = useState<SepetBaslik>(() => {
    const base = route.params.sepet;
    if (isRBMode) {
      return { ...base, kalemler: (route.params.rbKalemler ?? []).map(rbToSepetKalem) };
    }
    return base;
  });

  // RB kalemler değiştiğinde sepet.kalemler'i senkronize et
  useEffect(() => {
    if (!isRBMode) return;
    setSepet((prev) => ({ ...prev, kalemler: rbKalemler.map(rbToSepetKalem) }));
  }, [rbKalemler]);

  const [kaydetYukleniyor, setKaydetYukleniyor] = useState(false);
  const [taslakYukleniyor, setTaslakYukleniyor] = useState(false);
  const [duzenleUrunu, setDuzenleUrunu] = useState<{ stok: StokListesiBilgileri; miktar: number } | null>(null);
  const [duzenleIndex, setDuzenleIndex] = useState<number | null>(null);
  const evrakGuidRef = useRef(generateGuid());
  const [yuzerMenuAcik, setYuzerMenuAcik] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const [evrakKaydedildi, setEvrakKaydedildi] = useState(false);
  const evrakKaydedildiRef = useRef(false);
  const [kaydedilenRefNo, setKaydedilenRefNo] = useState<number | null>(null);
  const [pdfModalAcik, setPdfModalAcik] = useState(false);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  const [pdfDosyaUri, setPdfDosyaUri] = useState<string | null>(null);

  // Evrak kaydedildiyse, sepetten çıkınca temizle
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (evrakKaydedildiRef.current) {
        if (isRBMode) {
          route.params.onRBKalemlerGuncellendi?.([]);
        } else {
          route.params.onKalemlerGuncellendi?.([]);
        }
        aktifSepetTemizle();
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Evrak Fiş Bilgileri state
  const [fisAcik, setFisAcik] = useState(false);
  const [genelIndirimYuzde, setGenelIndirimYuzde] = useState(route.params.genelIndirimYuzde ?? 0);
  const [genelIndirimTutar, setGenelIndirimTutar] = useState(0);
  const [aciklama1, setAciklama1] = useState('');
  const [aciklama2, setAciklama2] = useState('');
  const [belgeTipiDeger, setBelgeTipiDeger] = useState(() => {
    if (yetkiBilgileri?.eevrakKaydetmeYetkisi) {
      if (sepet.evrakTipi === EvrakTipi.Fatura || sepet.evrakTipi === EvrakTipi.Irsaliye)
        return 'eevrak';
    }
    return 'normal';
  });

  // Adresler state
  const [adreslerAcik, setAdreslerAcik] = useState(false);
  const [adresler, setAdresler] = useState<AdresBilgileri[]>([]);
  const [secilenAdresNo, setSecilenAdresNo] = useState(0);

  const [kdvDurum, setKdvDurum] = useState(yetkiBilgileri?.kdvDurum ?? 0);

  // Kur bilgileri state
  const [kurListesi, setKurListesi] = useState<KurBilgileri[]>([]);
  const [secilenKur, setSecilenKur] = useState<KurBilgileri | null>(null);
  const [dovizModalAcik, setDovizModalAcik] = useState(false);

  // Belge tipi seçenekleri
  const belgeTipleri = (() => {
    const arr = [{ label: 'Normal', value: 'normal' }];
    if (sepet.evrakTipi === EvrakTipi.Fatura) {
      if (yetkiBilgileri?.efaturaKayitYetkisi) arr.push({ label: 'E-Evrak', value: 'eevrak' });
      arr.push({ label: 'Diğer', value: 'diger' });
    } else if (sepet.evrakTipi === EvrakTipi.Irsaliye) {
      if (yetkiBilgileri?.eirsaliyeKayitYetkisi) arr.push({ label: 'E-Evrak', value: 'eevrak' });
      arr.push({ label: 'Diğer', value: 'diger' });
    }
    return arr;
  })();

  // KDV kısım listesi
  const kdvKisimListesi = kdvBilgileri?.kdvKisimListesi ?? [];

  // Evrak tipine göre varsayılan KDV kısım no
  const varsayilanKdvKisim = (() => {
    let kdv: KDVKisimTablosu | null | undefined = null;
    if (sepet.evrakTipi === EvrakTipi.Fatura) kdv = kdvBilgileri?.faturaKDV;
    else if (sepet.evrakTipi === EvrakTipi.Irsaliye) kdv = kdvBilgileri?.irsaliyeKDV;
    else if (sepet.evrakTipi === EvrakTipi.Siparis) kdv = kdvBilgileri?.siparisKDV;
    else if (sepet.evrakTipi === EvrakTipi.Stok) kdv = kdvBilgileri?.stokKDV;
    return kdv?.kdvKisimNo ?? (kdvKisimListesi.length > 0 ? kdvKisimListesi[0].kdvKisimNo : 0);
  })();

  const [secilenKdvKisimNo, setSecilenKdvKisimNo] = useState<number>(varsayilanKdvKisim);

  // Seçilen KDV kısımının oranı
  const secilenKdvOrani = kdvKisimListesi.find((k) => k.kdvKisimNo === secilenKdvKisimNo)?.kdvKisimOran ?? 0;

  // Kalemlere seçilen KDV oranını uygula (kdvOrani 0 olanlar için)
  const efektifKalemler = sepet.kalemler.map((k) =>
    k.kdvOrani === 0 ? { ...k, kdvOrani: secilenKdvOrani } : k
  );

  // Toplamlar
  const t = hesapla(efektifKalemler, kdvDurum, genelIndirimYuzde, genelIndirimTutar);

  // Adres yükle
  useEffect(() => {
    if (!sepet.cariKodu) return;
    adresBilgileriniAl(sepet.cariKodu, calisilanSirket)
      .then((sonuc) => {
        if (sonuc.sonuc && sonuc.data) {
          setAdresler(sonuc.data);
        }
      })
      .catch(() => {});
  }, [sepet.cariKodu]);

  // Kur bilgilerini yükle
  useEffect(() => {
    kurBilgileriniAl(calisilanSirket)
      .then((sonuc) => {
        if (sonuc.sonuc && sonuc.data) {
          setKurListesi(sonuc.data);
        }
      })
      .catch(() => {});
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const [indirimModalAcik, setIndirimModalAcik] = useState(false);
  const [indirimInput, setIndirimInput] = useState('');
  const [indirimTutarInput, setIndirimTutarInput] = useState('');

  const indirimDegistir = () => {
    setIndirimInput(genelIndirimYuzde > 0 ? String(genelIndirimYuzde) : '');
    setIndirimTutarInput(genelIndirimTutar > 0 ? String(genelIndirimTutar) : '');
    setIndirimModalAcik(true);
  };

  const indirimOnayla = () => {
    const yuzde = parseFloat(indirimInput.replace(',', '.'));
    const tutar = parseFloat(indirimTutarInput.replace(',', '.'));
    if (!isNaN(tutar) && tutar > 0) {
      const kalemSonrasiToplam = t.malToplam - t.kalemIndirimlerToplam;
      if (tutar > kalemSonrasiToplam) {
        toast.warning('İndirim tutarı sepet toplamından fazla olamaz.');
        return;
      }
      setGenelIndirimTutar(tutar);
      setGenelIndirimYuzde(0);
    } else if (!isNaN(yuzde) && yuzde > 0) {
      if (yuzde > 100) {
        toast.warning('İndirim yüzdesi %100\'den fazla olamaz.');
        return;
      }
      setGenelIndirimYuzde(yuzde);
      setGenelIndirimTutar(0);
    } else {
      setGenelIndirimYuzde(0);
      setGenelIndirimTutar(0);
    }
    setIndirimModalAcik(false);
  };

  const adresSec = (adres: AdresBilgileri) => {
    setSecilenAdresNo(adres.adresNo);
    // Seçilen adresi listenin başına taşı
    setAdresler((prev) => {
      const filtreli = prev.filter((a) => a.adresNo !== adres.adresNo);
      return [adres, ...filtreli];
    });
    setAdreslerAcik(false);
  };

  const kalemDuzenle = (item: SepetKalem) => {
    const stok: StokListesiBilgileri = {
      stokID: 0,
      stokKodu: item.stokKodu,
      stokCinsi: item.stokCinsi,
      barkod: item.barkod,
      birim: item.birim,
      fiyat: item.birimFiyat,
      fiyatNo: item.seciliFiyatNo || 0,
      dovizKodu: '',
      dovizTuru: '',
      bakiye: 0,
      kdvOrani: item.kdvOrani,
      kalemIndirim1: item.kalemIndirim1,
      kalemIndirim2: item.kalemIndirim2,
      kalemIndirim3: item.kalemIndirim3,
      carpan: item.carpan || 1,
      miktar: item.miktar,
      birim2: item.birim2 || '',
      carpan2: item.carpan2 || '',
      renkKodu: 0,
      bedenKodu: 0,
      renk: '',
      beden: '',
      digerBirimler: [],
      digerCarpanlar: [],
      digerMiktarlar: [],
      birimNo: [],
      seciliFiyatNo: item.seciliFiyatNo || 0,
    };
    setDuzenleUrunu({ stok, miktar: item.miktar });
  };

  const handleDuzenleConfirm = (kalem: SepetKalem) => {
    if (isRBMode && duzenleIndex != null) {
      setRbKalemler((prev) => {
        const guncellenmis = prev.map((rbk, i) => {
          if (i !== duzenleIndex) return rbk;
          return {
            ...rbk,
            miktar: kalem.miktar,
            fiyat: kalem.birimFiyat,
            kalemIndirim1: kalem.kalemIndirim1,
            kalemIndirim2: kalem.kalemIndirim2,
            kalemIndirim3: kalem.kalemIndirim3,
          };
        });
        route.params.onRBKalemlerGuncellendi?.(guncellenmis);
        return guncellenmis;
      });
    } else {
      setSepet((prev) => {
        const guncellenmis = prev.kalemler.map((k) =>
          k.stokKodu === kalem.stokKodu ? kalem : k
        );
        route.params.onKalemlerGuncellendi?.(guncellenmis);
        return { ...prev, kalemler: guncellenmis };
      });
    }
    setDuzenleUrunu(null);
    setDuzenleIndex(null);
  };

  const kalemSil = (stokKodu: string, index?: number) => {
    ortaTitresim();
    if (isRBMode && index != null) {
      setRbKalemler((prev) => {
        const guncellenmis = prev.filter((_, i) => i !== index);
        route.params.onRBKalemlerGuncellendi?.(guncellenmis);
        return guncellenmis;
      });
    } else {
      setSepet((prev) => {
        const guncellenmis = prev.kalemler.filter((k) => k.stokKodu !== stokKodu);
        route.params.onKalemlerGuncellendi?.(guncellenmis);
        return { ...prev, kalemler: guncellenmis };
      });
    }
  };

  const handleKaydet = async () => {
    if (sepet.kalemler.length === 0) {
      toast.warning('Sepet boş.');
      return;
    }
    if (!sepet.cariKodu.trim()) {
      toast.warning('Lütfen cari seçiniz.');
      return;
    }
    setKaydetYukleniyor(true);
    try {
      let sonuc;
      if (isRBMode) {
        const opts: EvrakRBKaydetOptions = {
          saticiKodu: yetkiBilgileri?.kullaniciKodu ?? '',
          kdvDurum: yetkiBilgileri?.kdvDurum ?? 0,
          anaDepo: sepet.anaDepo ?? yetkiBilgileri?.anaDepo ?? '',
          karsiDepo: sepet.karsiDepo ?? yetkiBilgileri?.karsiDepo ?? '',
          guidId: evrakGuidRef.current,
          genelIndirimYuzde,
          genelIndirimTutar,
          aciklama1,
          aciklama2,
          dovizKodu: secilenKur?.dovizKodu ?? '',
          dovizTuru: secilenKur?.dovizTuru ?? '',
          dovizKuru: secilenKur?.dovizKuru ?? 0,
          belgeTipi: belgeTipiDeger as 'eevrak' | 'normal' | 'diger',
        };
        sonuc = await evrakRBKaydet(sepet, rbKalemler, calisilanSirket, opts);
      } else {
        const opts: EvrakKaydetOptions = {
          saticiKodu: yetkiBilgileri?.kullaniciKodu ?? '',
          kdvDurum: yetkiBilgileri?.kdvDurum ?? 0,
          anaDepo: sepet.anaDepo ?? yetkiBilgileri?.anaDepo ?? '',
          karsiDepo: sepet.karsiDepo ?? yetkiBilgileri?.karsiDepo ?? '',
          guidId: evrakGuidRef.current,
          genelIndirimYuzde,
          genelIndirimTutar,
          aciklama1,
          aciklama2,
          dovizKodu: secilenKur?.dovizKodu ?? '',
          dovizTuru: secilenKur?.dovizTuru ?? '',
          dovizKuru: secilenKur?.dovizKuru ?? 0,
          belgeTipi: belgeTipiDeger as 'eevrak' | 'normal' | 'diger',
        };
        sonuc = await evrakKaydet(sepet, calisilanSirket, opts);
      }
      if (sonuc.sonuc) {
        basariliTitresim();
        const refNo = parseInt(String(sonuc.data), 10);
        if (!isNaN(refNo) && refNo > 0) {
          setKaydedilenRefNo(refNo);
        }
        setEvrakKaydedildi(true);
        evrakKaydedildiRef.current = true;
        toast.success(sonuc.mesaj || 'Evrak kaydedildi.');
      } else {
        toast.error(sonuc.mesaj || 'Evrak kaydedilemedi.');
      }
    } catch (e: any) {
      const mesaj =
        e?.response?.data?.mesaj ||
        e?.response?.data ||
        e?.message ||
        String(e);
      toast.error(`Evrak kaydedilirken bir hata oluştu:\n\n${mesaj}`);
    } finally {
      setKaydetYukleniyor(false);
    }
  };

  const handleTemizle = () => {
    Alert.alert('Sepeti Temizle', 'Tüm kalemler silinecek. Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Temizle',
        style: 'destructive',
        onPress: () => {
          if (isRBMode) {
            setRbKalemler([]);
            route.params.onRBKalemlerGuncellendi?.([]);
          } else {
            route.params.onKalemlerGuncellendi?.([]);
          }
          aktifSepetTemizle();
          navigation.goBack();
        },
      },
    ]);
  };

  const handleTaslakKaydet = async () => {
    if (sepet.kalemler.length === 0) {
      toast.warning('Sepet boş.');
      return;
    }
    if (!sepet.cariKodu) {
      toast.warning('Taslak kaydedebilmek için lütfen cari seçiniz.');
      return;
    }
    setTaslakYukleniyor(true);
    try {
      await taslakKaydet(sepet, t.genelToplam);
      if (isRBMode) {
        route.params.onRBKalemlerGuncellendi?.([]);
      } else {
        route.params.onKalemlerGuncellendi?.([]);
      }
      aktifSepetTemizle();
      Alert.alert('Başarılı', 'Evrak taslak olarak kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch {
      toast.error('Taslak kaydedilemedi.');
    } finally {
      setTaslakYukleniyor(false);
    }
  };

  const toggleYuzerMenu = (acik: boolean) => {
    setYuzerMenuAcik(acik);
    Animated.spring(menuAnim, {
      toValue: acik ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 65,
    }).start();
  };

  const evrakAdi = evrakTipiAdi(sepet.evrakTipi, sepet.alimSatim);

  const handlePdfGoster = async () => {
    if (sepet.alimSatim === AlimSatim.Alim) {
      toast.error('Alım işlemlerinde PDF dosyası alınamaz.');
      return;
    }
    if (!kaydedilenRefNo) {
      toast.error('Evrak daha kaydedilmemiş, PDF alınamaz.');
      return;
    }
    let evrakTipiStr = '';
    switch (sepet.evrakTipi) {
      case EvrakTipi.Stok:
        evrakTipiStr = 'Stok';
        break;
      case EvrakTipi.Fatura:
        evrakTipiStr = belgeTipiDeger === 'eevrak' ? 'Fatura' : 'Fatura2';
        break;
      case EvrakTipi.Irsaliye:
        evrakTipiStr = belgeTipiDeger === 'eevrak' ? 'Irsaliye' : 'Irsaliye2';
        break;
      case EvrakTipi.Siparis:
        evrakTipiStr = 'Sipariş';
        break;
    }
    if (!evrakTipiStr) return;
    setPdfModalAcik(true);
    setPdfYukleniyor(true);
    setPdfDosyaUri(null);
    try {
      const base64 = await evrakPdfAl(kaydedilenRefNo, evrakTipiStr, calisilanSirket);
      const dosyaYolu = `${FileSystem.cacheDirectory}evrak_${kaydedilenRefNo}.pdf`;
      await FileSystem.writeAsStringAsync(dosyaYolu, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfDosyaUri(dosyaYolu);
    } catch (err: any) {
      setPdfModalAcik(false);
      toast.error(err?.message || 'PDF alınamadı.');
    } finally {
      setPdfYukleniyor(false);
    }
  };

  const handlePdfPaylas = async () => {
    if (!pdfDosyaUri) return;
    try {
      await Sharing.shareAsync(pdfDosyaUri, { mimeType: 'application/pdf' });
    } catch {
      toast.error('PDF paylaşılamadı.');
    }
  };

  const [entegratorYukleniyor, setEntegratorYukleniyor] = useState(false);

  const handleEntegratorGonder = async () => {
    if (sepet.alimSatim === AlimSatim.Alim) {
      toast.error('Alım evraklarında entegratöre gönderme yapılamaz.');
      return;
    }
    if (sepet.evrakTipi === EvrakTipi.Siparis || sepet.evrakTipi === EvrakTipi.Stok) {
      toast.error('Sipariş ya da stok evraklarında entegratöre gönderme yapılamaz.');
      return;
    }
    if (!kaydedilenRefNo) {
      toast.error('Evrak kaydedilmeden entegratöre gönderme yapılamaz.');
      return;
    }
    if (!yetkiBilgileri?.eevrakKaydetmeYetkisi) {
      toast.error('E-Evrak yazma izni olmadığından entegratöre gönderilemez.');
      return;
    }
    if (!yetkiBilgileri?.efaturaKayitYetkisi && sepet.evrakTipi === EvrakTipi.Fatura) {
      toast.error('E-Fatura yazma izni olmadığından entegratöre gönderilemez.');
      return;
    }
    if (!yetkiBilgileri?.eirsaliyeKayitYetkisi && sepet.evrakTipi === EvrakTipi.Irsaliye) {
      toast.error('E-İrsaliye yazma izni olmadığından entegratöre gönderilemez.');
      return;
    }
    if (!yetkiBilgileri?.entegratoreYollaYetkisi) {
      toast.error('Entegratöre gönderme yetkisi bulunmamaktadır.');
      return;
    }
    const evrakTipiStr = sepet.evrakTipi === EvrakTipi.Fatura ? 'Fatura' : 'Irsaliye';
    setEntegratorYukleniyor(true);
    try {
      const sonuc = await entegratoreYolla(kaydedilenRefNo, evrakTipiStr, calisilanSirket);
      if (sonuc.sonuc) {
        toast.success(sonuc.mesaj || 'Başarıyla gönderildi.');
      } else {
        toast.error(sonuc.mesaj || 'Gönderilemedi.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Entegratöre gönderilirken bir hata oluştu.');
    } finally {
      setEntegratorYukleniyor(false);
    }
  };

  const yuzerMenuItems = [
    { label: 'Kaydet', icon: 'save-outline' as const, color: Colors.primary, onPress: () => { toggleYuzerMenu(false); handleKaydet(); }, disabled: kaydetYukleniyor || evrakKaydedildi || sepet.kalemler.length === 0 },
    { label: 'Entegratöre Gönder', icon: 'send-outline' as const, color: Colors.primary, onPress: () => { toggleYuzerMenu(false); handleEntegratorGonder(); }, disabled: entegratorYukleniyor || sepet.kalemler.length === 0 },
    { label: 'PDF Göster', icon: 'document-text-outline' as const, color: Colors.primary, onPress: () => { toggleYuzerMenu(false); handlePdfGoster(); }, disabled: sepet.kalemler.length === 0 },
    { label: 'Taslak Kaydet', icon: 'bookmark-outline' as const, color: Colors.accent, onPress: () => { toggleYuzerMenu(false); handleTaslakKaydet(); }, disabled: taslakYukleniyor || evrakKaydedildi || sepet.kalemler.length === 0 },
    { label: 'Temizle', icon: 'trash-outline' as const, color: Colors.error, onPress: () => { toggleYuzerMenu(false); handleTemizle(); }, disabled: sepet.kalemler.length === 0 },
  ];

  // ─── Render helpers ──────────────────────────────────────────────────────────

  // Kalem bazlı KDV hesaplama (her kalem için ayrı)
  const kalemToplam = (k: SepetKalem) => {
    const efektifKdv = k.kdvOrani === 0 ? secilenKdvOrani : k.kdvOrani;
    const ham = k.miktar * k.birimFiyat;
    const netKalem =
      ham *
      (1 - k.kalemIndirim1 / 100) *
      (1 - k.kalemIndirim2 / 100) *
      (1 - k.kalemIndirim3 / 100);
    const netAfterGenel = netKalem * (1 - genelIndirimYuzde / 100);
    const kdv = netAfterGenel * (efektifKdv / 100);
    return kdvDurum === 1 ? netAfterGenel : netAfterGenel + kdv;
  };

  const renderExpanderBaslik = (
    baslik: string,
    acik: boolean,
    onToggle: () => void
  ) => (
    <TouchableOpacity
      style={styles.expanderBaslik}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={styles.expanderBaslikText}>{baslik}</Text>
      <Ionicons
        name={acik ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={Colors.white}
      />
    </TouchableOpacity>
  );

  const renderFisBilgileri = () => (
    <View style={styles.expanderContainer}>
      {renderExpanderBaslik(
        `Evrak Fiş Bilgileri (${evrakAdi})`,
        fisAcik,
        () => setFisAcik(!fisAcik)
      )}
      {fisAcik && (
        <View style={styles.fisIcerik}>
          {/* Cari Ünvanı */}
          <View style={styles.fisRow}>
            <Text style={styles.fisLabel}>Cari Ünvanı</Text>
            <Text style={styles.fisValueRed} numberOfLines={2}>
              {sepet.cariUnvan || 'Lütfen cari seçiniz'}
            </Text>
          </View>

          {/* KDV Oranı + Dahil Checkbox */}
          <View style={[styles.kdvSatir, { zIndex: 30 }]}>
            <View style={styles.kdvDropdown}>
              <Text style={styles.fisLabel}>KDV Oranı</Text>
              <DropdownSecim
                value={String(secilenKdvKisimNo)}
                options={kdvKisimListesi.map((k) => ({
                  label: `${k.kdvKisimAciklama || k.kdvAdi || ''} (%${k.kdvKisimOran ?? k.kdvOrani ?? 0})`,
                  value: String(k.kdvKisimNo ?? k.kdvKodu ?? 0),
                }))}
                placeholder="KDV Seçiniz..."
                onChange={(val) => setSecilenKdvKisimNo(Number(val))}
                maxListHeight={180}
              />
            </View>
            <TouchableOpacity
              style={styles.kdvCheckboxRow}
              onPress={() => setKdvDurum((prev) => (prev === 1 ? 0 : 1))}
              activeOpacity={0.7}
            >
              <Ionicons
                name={kdvDurum === 1 ? 'checkbox' : 'square-outline'}
                size={22}
                color={kdvDurum === 1 ? Colors.primary : Colors.gray}
              />
              <Text style={styles.kdvCheckboxLabel}>KDV Dahil</Text>
            </TouchableOpacity>
          </View>

          {/* Belge Tipi */}
          <View style={styles.fisRowCol}>
            <Text style={styles.fisLabel}>Belge Tipi</Text>
            <View style={styles.belgeTipiDropdown}>
              <DropdownSecim
                value={belgeTipiDeger}
                options={belgeTipleri}
                placeholder="Seçiniz..."
                onChange={setBelgeTipiDeger}
                maxListHeight={150}
              />
            </View>
          </View>

          {/* Ayırıcı */}
          <View style={styles.fisAyirac} />

          {/* Mal Toplam */}
          <View style={styles.fisRow}>
            <Text style={styles.fisLabel}>Mal Toplam</Text>
            <Text style={styles.fisValue}>{paraFormat(t.malToplam)}</Text>
          </View>

          {/* Genel İsk. */}
          <TouchableOpacity style={styles.fisRow} onPress={indirimDegistir}>
            <Text style={styles.fisLabel}>Genel İsk.</Text>
            {genelIndirimTutar > 0 ? (
              <Text style={styles.fisValueAccent}>Tutar: {paraFormat(genelIndirimTutar)}</Text>
            ) : (
              <>
                <Text style={styles.fisValueAccent}>% {paraFormat(genelIndirimYuzde)}</Text>
                <Text style={styles.fisValueAccent}>{paraFormat(t.genelIndirimTutar)}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Kalem İsk. */}
          <View style={styles.fisRow}>
            <Text style={styles.fisLabel}>Kalem İsk.</Text>
            <Text style={styles.fisValue}>{paraFormat(t.kalemIndirimlerToplam)}</Text>
          </View>

          {/* KDV Toplam */}
          <View style={styles.fisRow}>
            <Text style={styles.fisLabel}>KDV Toplam</Text>
            <Text style={styles.fisValue}>{paraFormat(t.kdvToplam)}</Text>
          </View>

          {/* Genel Top. */}
          <View style={styles.fisRow}>
            <Text style={styles.fisLabel}>Genel Top.</Text>
            <Text style={styles.fisValue}>{paraFormat(t.genelToplam)}</Text>
          </View>

          {/* Ayırıcı */}
          <View style={styles.fisAyirac} />

          {/* Döviz */}
          <TouchableOpacity style={styles.fisRow} onPress={() => setDovizModalAcik(true)}>
            <Text style={styles.fisLabel}>Döviz Kodu</Text>
            <Text style={styles.fisValueAccent}>
              {secilenKur ? secilenKur.dovizKodu : 'Seçiniz...'}
            </Text>
            <Text style={styles.fisLabelSmall}>Döviz Türü</Text>
            <Text style={styles.fisValueAccent}>
              {secilenKur ? secilenKur.dovizTuru : ''}
            </Text>
          </TouchableOpacity>
          <View style={styles.fisRow}>
            <Text style={styles.fisLabel}>Döviz Kuru</Text>
            <Text style={styles.fisValue}>
              {secilenKur ? secilenKur.dovizKuru.toFixed(5).replace('.', ',') : '0,00000'}
            </Text>
            <Text style={styles.fisLabelSmall}>Döviz Toplam</Text>
            <Text style={styles.fisValue}>
              {secilenKur && secilenKur.dovizKuru > 0
                ? paraFormat(t.genelToplam / secilenKur.dovizKuru)
                : '0,00'}
            </Text>
          </View>

          {/* Ayırıcı */}
          <View style={styles.fisAyirac} />

          {/* Açıklama 1 */}
          <View style={styles.fisRow}>
            <Text style={styles.fisLabel}>Açıklama 1</Text>
            <TextInput
              style={styles.fisInput}
              value={aciklama1}
              onChangeText={setAciklama1}
              placeholder=""
            />
          </View>

          {/* Açıklama 2 */}
          <View style={styles.fisRow}>
            <Text style={styles.fisLabel}>Açıklama 2</Text>
            <TextInput
              style={styles.fisInput}
              value={aciklama2}
              onChangeText={setAciklama2}
              placeholder=""
            />
          </View>

        </View>
      )}
    </View>
  );

  const renderAdresKarti = (adres: AdresBilgileri) => (
    <TouchableOpacity
      key={adres.adresNo}
      style={styles.adresKart}
      onPress={() => adresSec(adres)}
      activeOpacity={0.7}
    >
      {/* Adres No + Yetkili */}
      <View style={styles.adresRow}>
        <Text style={styles.adresLabel}>Adres No</Text>
        <Text style={styles.adresValueAccent}>{adres.adresNo}</Text>
        <Text style={styles.adresLabel}>Yetkili</Text>
        <Text style={styles.adresValueAccent}>{adres.yetkili}</Text>
      </View>
      {/* Adres 1-3 */}
      {adres.adres1 ? (
        <View style={styles.adresRow}>
          <Text style={styles.adresLabel}>Adres 1</Text>
          <Text style={styles.adresValue}>{adres.adres1}</Text>
        </View>
      ) : null}
      {adres.adres2 ? (
        <View style={styles.adresRow}>
          <Text style={styles.adresLabel}>Adres 2</Text>
          <Text style={styles.adresValue}>{adres.adres2}</Text>
        </View>
      ) : null}
      {adres.adres3 ? (
        <View style={styles.adresRow}>
          <Text style={styles.adresLabel}>Adres 3</Text>
          <Text style={styles.adresValue}>{adres.adres3}</Text>
        </View>
      ) : null}
      {/* İl + İlçe */}
      <View style={styles.adresRow}>
        <Text style={styles.adresLabel}>İl</Text>
        <Text style={styles.adresValueAccent}>{adres.il}</Text>
        <Text style={styles.adresLabel}>İlçe</Text>
        <Text style={styles.adresValueAccent}>{adres.ilce}</Text>
      </View>
      {/* Vergi */}
      <View style={styles.adresRow}>
        <Text style={styles.adresLabel}>Vergi{'\n'}Dairesi</Text>
        <Text style={styles.adresValueAccent}>{adres.vergiDairesi}</Text>
        <Text style={styles.adresLabel}>Vergi{'\n'}Numarası</Text>
        <Text style={styles.adresValueAccent}>{adres.vergiNumarasi}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderAdresler = () => (
    <View style={styles.expanderContainer}>
      {renderExpanderBaslik(
        secilenAdresNo > 0
          ? `Adresler (Adres No: ${secilenAdresNo})`
          : 'Adresler',
        adreslerAcik,
        () => setAdreslerAcik(!adreslerAcik)
      )}
      {adreslerAcik && (
        <View style={styles.adreslerIcerik}>
          {adresler.length > 0 ? (
            adresler.map(renderAdresKarti)
          ) : (
            <Text style={styles.bosAdresText}>Adres bilgisi bulunamadı</Text>
          )}
        </View>
      )}
    </View>
  );

  const renderHeaderInfo = () => (
    <View style={styles.headerInfo}>
      <View style={styles.headerRow}>
        <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
        <Text style={styles.headerEvrakBold}>{evrakAdi}</Text>
      </View>
      {sepet.fisTipiBaslikNo > 0 && (
        <View style={styles.headerRow}>
          <Ionicons name="receipt-outline" size={16} color="#FFD54F" />
          <Text style={styles.headerFisTipi} numberOfLines={1}>
            {sepet.fisTipiBaslikNo} - {sepet.fisTipiAdi}
          </Text>
        </View>
      )}
    </View>
  );

  const renderListHeader = () => (
    <>
      {renderHeaderInfo()}
      {renderFisBilgileri()}
      <View style={styles.expanderAyirac} />
      {renderAdresler()}
    </>
  );

  const renderKalem = ({ item, index }: { item: SepetKalem; index: number }) => {
    const efektifKdv = item.kdvOrani === 0 ? secilenKdvOrani : item.kdvOrani;
    const ham = item.miktar * item.birimFiyat;
    const netKalem =
      ham *
      (1 - item.kalemIndirim1 / 100) *
      (1 - item.kalemIndirim2 / 100) *
      (1 - item.kalemIndirim3 / 100);
    const netAfterGenel = netKalem * (1 - genelIndirimYuzde / 100);
    const kdvTutari = netAfterGenel * (efektifKdv / 100);
    const toplam = kdvDurum === 1 ? netAfterGenel : netAfterGenel + kdvTutari;

    // RB modda renk/beden bilgisini al
    const rbItem = isRBMode ? rbKalemler[index] : null;

    return (
      <AnimatedListItem index={index}>
        <View style={styles.kartContainer}>
          {/* Üst satır: stok kodu + düzenle/sil butonları */}
          <View style={styles.kartUstSatir}>
            <Text style={styles.kartStokKodu}>{item.stokKodu}</Text>
            <View style={styles.kartAksiyonlar}>
              <TouchableOpacity
                style={styles.kartAksiyonBtn}
                onPress={() => {
                  if (isRBMode) setDuzenleIndex(index);
                  kalemDuzenle(item);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={20} color="#FFD54F" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.kartAksiyonBtn}
                onPress={() => {
                  Alert.alert('Sil', `${item.stokKodu} silinsin mi?`, [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'Sil', style: 'destructive', onPress: () => kalemSil(item.stokKodu, index) },
                  ]);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stok cinsi */}
          <Text style={styles.kartStokCinsi}>{item.stokCinsi}</Text>

          {/* Renk-Beden bilgisi (sadece RB modda) */}
          {rbItem && (
            <View style={styles.kartRBRow}>
              {rbItem.renkKodu > 0 && (
                <View style={styles.rbChip}>
                  <Ionicons name="color-fill-outline" size={10} color={Colors.primary} />
                  <Text style={styles.rbChipText}>{rbItem.renkKodu}-{rbItem.renk}</Text>
                </View>
              )}
              {rbItem.bedenKodu > 0 && (
                <View style={styles.rbChip}>
                  <Ionicons name="resize-outline" size={10} color={Colors.primary} />
                  <Text style={styles.rbChipText}>{rbItem.bedenKodu}-{rbItem.beden}</Text>
                </View>
              )}
            </View>
          )}

          {/* Miktar x Fiyat */}
          <Text style={styles.kartMiktarFiyat}>
            {miktarFormat(item.miktar)} {item.birim}  × {paraFormat(item.birimFiyat)} ₺
          </Text>

          {/* KDV bilgisi + Toplam fiyat */}
          <View style={styles.kartAltSatir}>
            <Text style={styles.kartKdvBilgi}>
              KDV Hariç: {paraFormat(netAfterGenel)} ₺   KDV %{efektifKdv}: {paraFormat(kdvTutari)} ₺
            </Text>
            <Text style={styles.kartToplam}>{paraFormat(toplam)} ₺</Text>
          </View>
        </View>
      </AnimatedListItem>
    );
  };

  const renderOzetKarti = () => {
    const kdvHaricToplam = t.malToplam - t.kalemIndirimlerToplam - t.genelIndirimTutar;
    return (
      <View style={styles.ozetKart}>
        <View style={styles.ozetSatir}>
          <Text style={styles.ozetLabel}>KDV Hariç Toplam</Text>
          <Text style={styles.ozetDeger}>{paraFormat(kdvHaricToplam)} ₺</Text>
        </View>
        <View style={styles.ozetSatir}>
          <Text style={styles.ozetLabel}>KDV Toplam</Text>
          <Text style={styles.ozetDeger}>{paraFormat(t.kdvToplam)} ₺</Text>
        </View>
        <View style={styles.ozetAyirac} />
        <View style={styles.ozetSatir}>
          <Text style={styles.ozetGenelLabel}>GENEL TOPLAM</Text>
          <Text style={styles.ozetGenelDeger}>{paraFormat(t.genelToplam)} ₺</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.ekran}>
      <FlatList
        data={sepet.kalemler}
        keyExtractor={(item, idx) => item.stokKodu.trim() || String(idx)}
        extraData={[sepet.kalemler.length, genelIndirimYuzde, fisAcik, adreslerAcik]}
        renderItem={renderKalem}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={sepet.kalemler.length > 0 ? renderOzetKarti : undefined}
        contentContainerStyle={styles.listePadding}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="cart-outline" baslik="Sepet boş" aciklama="Ürün eklemek için stok listesine dönün" />
        }
      />

      {/* Düzenle modal */}
      <UrunMiktariBelirleModal
        urun={duzenleUrunu?.stok ?? null}
        kdvDurum={kdvDurum}
        fiyatDegistirmeYetkisi={yetkiBilgileri?.fiyatDegistirmeYetkisi ?? false}
        kalemIndirimYetkisi={yetkiBilgileri?.kalemIndirimYapmaYetkisi ?? false}
        fiyatTipListesi={fiyatTipListesi}
        veriTabaniAdi={calisilanSirket}
        cariKodu={route.params.sepet.cariKodu}
        mode="duzenle"
        initialMiktar={duzenleUrunu?.miktar}
        onConfirm={handleDuzenleConfirm}
        onClose={() => setDuzenleUrunu(null)}
      />

      {/* İndirim modal */}
      <Modal visible={indirimModalAcik} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Genel İskonto</Text>
            <Text style={styles.modalAlt}>Yüzde</Text>
            <TextInput
              style={styles.modalInput}
              value={indirimInput}
              onChangeText={(val) => {
                setIndirimInput(val);
                if (val.trim()) setIndirimTutarInput('');
              }}
              keyboardType="decimal-pad"
              placeholder="% 0"
              autoFocus
            />
            <Text style={styles.modalAlt}>Tutar</Text>
            <TextInput
              style={styles.modalInput}
              value={indirimTutarInput}
              onChangeText={(val) => {
                setIndirimTutarInput(val);
                if (val.trim()) setIndirimInput('');
              }}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity onPress={() => setIndirimModalAcik(false)}>
                <Text style={styles.modalIptal}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={indirimOnayla}>
                <Text style={styles.modalTamam}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Döviz seçim modal */}
      <Modal visible={dovizModalAcik} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dovizModalKutu}>
            <Text style={styles.modalBaslik}>Döviz Seçimi</Text>
            {kurListesi.length === 0 ? (
              <Text style={styles.modalAlt}>Kur bilgisi bulunamadı</Text>
            ) : (
              <FlatList
                data={kurListesi}
                keyExtractor={(item, index) => item.kurID != null ? String(item.kurID) : `kur-${index}`}
                style={styles.dovizListe}
                ItemSeparatorComponent={() => <View style={styles.dovizAyirac} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dovizSatir,
                      secilenKur?.kurID === item.kurID && styles.dovizSatirSecili,
                    ]}
                    onPress={() => {
                      setSecilenKur(item);
                      setDovizModalAcik(false);
                    }}
                  >
                    <View style={styles.dovizSol}>
                      <Text style={styles.dovizKodu}>{item.dovizKodu}</Text>
                      <Text style={styles.dovizTuru}>{item.dovizTuru}</Text>
                    </View>
                    <Text style={styles.dovizKuru}>
                      {item.dovizKuru.toFixed(5).replace('.', ',')}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <View style={styles.modalBtnRow}>
              {secilenKur && (
                <TouchableOpacity onPress={() => { setSecilenKur(null); setDovizModalAcik(false); }}>
                  <Text style={styles.modalIptal}>Temizle</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setDovizModalAcik(false)}>
                <Text style={styles.modalTamam}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Alt bilgi barı */}
      <View style={styles.altBar}>
        <Ionicons name="cart-outline" size={18} color={Colors.primary} />
        <Text style={styles.altBarText}>
          {sepet.kalemler.length} satır · Miktar {t.toplamMiktar}
        </Text>
      </View>

      {/* Yüzer menü overlay */}
      {yuzerMenuAcik && (
        <Pressable style={styles.yuzerOverlay} onPress={() => toggleYuzerMenu(false)}>
          <View style={styles.yuzerMenuKapsayici}>
            {yuzerMenuItems.map((item, idx) => {
              const translateY = menuAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              });
              const opacity = menuAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, idx < 2 ? 0.3 : 0.7, 1],
              });
              return (
                <Animated.View key={item.label} style={{ transform: [{ translateY }], opacity }}>
                  <TouchableOpacity
                    style={[styles.yuzerMenuItem, item.disabled && styles.btnPasif]}
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
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
          <View style={styles.pdfBar}>
            <TouchableOpacity onPress={() => setPdfModalAcik(false)}>
              <Ionicons name="close" size={28} color={Colors.darkGray} />
            </TouchableOpacity>
            <Text style={styles.pdfBarBaslik}>{evrakAdi}</Text>
            <TouchableOpacity onPress={handlePdfPaylas} disabled={!pdfDosyaUri}>
              <Ionicons name="share-outline" size={24} color={pdfDosyaUri ? Colors.primary : Colors.gray} />
            </TouchableOpacity>
          </View>
          {pdfYukleniyor ? (
            <View style={styles.pdfMerkez}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ color: Colors.gray, marginTop: 8 }}>PDF yükleniyor...</Text>
            </View>
          ) : pdfDosyaUri ? (
            <WebView
              originWhitelist={['*']}
              source={{ uri: pdfDosyaUri }}
              style={{ flex: 1 }}
            />
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* FAB butonu */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => toggleYuzerMenu(!yuzerMenuAcik)}
        activeOpacity={0.8}
      >
        <Ionicons name={yuzerMenuAcik ? 'close' : 'ellipsis-vertical'} size={24} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: Colors.lightGray },
  listePadding: { paddingBottom: 12 },

  // ── Header Info ─────────────────────────────────────────────────────────────
  headerInfo: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEvrakBold: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerFisTipi: {
    flex: 1,
    fontSize: 13,
    color: '#FFD54F',
    fontWeight: '600',
  },

  // ── Expander ───────────────────────────────────────────────────────────────
  expanderContainer: { },
  expanderAyirac: {
    height: 1,
    backgroundColor: Colors.border,
  },
  expanderBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  expanderBaslikText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Fiş Bilgileri ──────────────────────────────────────────────────────────
  fisIcerik: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  fisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 26,
  },
  fisLabel: {
    width: 90,
    fontSize: 12,
    color: Colors.gray,
    fontWeight: '600',
  },
  fisLabelSmall: {
    fontSize: 12,
    color: Colors.gray,
    fontWeight: '600',
    marginLeft: 8,
  },
  fisValue: {
    flex: 1,
    fontSize: 14,
    color: Colors.darkGray,
    textAlign: 'right',
  },
  fisValueRed: {
    flex: 1,
    fontSize: 13,
    color: Colors.error,
  },
  fisValueAccent: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  fisAyirac: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  fisInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    fontSize: 13,
    color: Colors.darkGray,
    backgroundColor: Colors.inputBackground,
  },
  fisRowCol: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 26,
    zIndex: 20,
  },
  belgeTipiDropdown: {
    flex: 1,
  },
  kdvSatir: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  kdvDropdown: {
    flex: 1,
  },
  kdvCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
  },
  kdvCheckboxLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkGray,
  },

  // ── Adresler ───────────────────────────────────────────────────────────────
  adreslerIcerik: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  adresKart: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 22,
  },
  adresLabel: {
    fontSize: 11,
    color: Colors.gray,
    width: 55,
  },
  adresValue: {
    flex: 1,
    fontSize: 12,
    color: Colors.darkGray,
  },
  adresValueAccent: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  bosAdresText: {
    color: Colors.gray,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },

  // ── Kalem Kartları ─────────────────────────────────────────────────────────
  kartContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  kartUstSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kartStokKodu: {
    fontSize: 13,
    color: Colors.gray,
    fontWeight: '600',
  },
  kartAksiyonlar: {
    flexDirection: 'row',
    gap: 12,
  },
  kartAksiyonBtn: {
    padding: 2,
  },
  kartStokCinsi: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.darkGray,
    marginTop: 2,
  },
  kartRBRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  rbChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8eaf6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  rbChipText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
  kartMiktarFiyat: {
    fontSize: 13,
    color: Colors.darkGray,
    marginTop: 4,
  },
  kartAltSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  kartKdvBilgi: {
    fontSize: 11,
    color: Colors.gray,
    flex: 1,
  },
  kartToplam: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 8,
  },

  // ── Özet Kartı ─────────────────────────────────────────────────────────────
  ozetKart: {
    backgroundColor: Colors.white,
    marginHorizontal: 12,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ozetSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ozetLabel: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  ozetDeger: {
    fontSize: 14,
    color: Colors.darkGray,
    fontWeight: '600',
  },
  ozetAyirac: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  ozetGenelLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  ozetGenelDeger: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ── Boş Ekran ─────────────────────────────────────────────────────────────
  bosEkran: { alignItems: 'center', paddingTop: 60, gap: 12 },
  bosMetin: { fontSize: 14, color: Colors.gray },

  // ── Alt Bar ────────────────────────────────────────────────────────────────
  altBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  altBarText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  altBarToplam: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ── FAB & Yüzer Menü ─────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 70,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
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
    bottom: 130,
    gap: 8,
    alignItems: 'flex-end',
  },
  yuzerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
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
  btnPasif: { opacity: 0.5 },

  // ── PDF Modal ─────────────────────────────────────────────────────────────
  pdfBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pdfBarBaslik: { fontSize: 16, fontWeight: '600', color: Colors.darkGray },
  pdfMerkez: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Modal (Android indirim) ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKutu: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalBaslik: { fontSize: 16, fontWeight: '700', color: Colors.darkGray },
  modalAlt: { fontSize: 13, color: Colors.gray },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: Colors.darkGray,
    backgroundColor: Colors.inputBackground,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 8,
  },
  modalIptal: { fontSize: 14, color: Colors.gray },
  modalTamam: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // ── Döviz Modal ──────────────────────────────────────────────────────────────
  dovizModalKutu: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '60%',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dovizListe: {
    maxHeight: 300,
  },
  dovizAyirac: {
    height: 1,
    backgroundColor: Colors.border,
  },
  dovizSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dovizSatirSecili: {
    backgroundColor: Colors.primary + '15',
  },
  dovizSol: {
    flex: 1,
  },
  dovizKodu: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  dovizTuru: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  dovizKuru: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
  },
});
