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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { evrakKaydet, generateGuid, adresBilgileriniAl, kurBilgileriniAl, entegratoreYolla } from '../../api/hizliIslemlerApi';
import { evrakRBKaydet } from '../../api/renkBedenApi';
import type { EvrakRBKaydetOptions } from '../../api/renkBedenApi';
import { crmTeklifKaydet, crmTeklifPdfAl } from '../../api/crmTeklifApi';
import { onayKaydet } from '../../api/onayApi';
import type { OnayKaydetOptions } from '../../api/onayApi';
import type { CRMTeklifFisBilgileri, CRMTeklifHareketBilgileri } from '../../models';
import { evrakiKaydet as taslakKaydet } from '../../utils/bekleyenEvraklarStorage';
import { aktifSepetTemizle } from '../../utils/aktifSepetStorage';
import type { EvrakKaydetOptions } from '../../api/hizliIslemlerApi';
import { evrakPdfAl } from '../../api/raporApi';
import UrunMiktariBelirleModal from '../../components/UrunMiktariBelirleModal';
import DropdownSecim from '../../components/DropdownSecim';
import { useColors } from '../../contexts/ThemeContext';
import { paraFormat, paraTL, miktarFormat } from '../../utils/format';
import { EvrakTipi, AlimSatim } from '../../models';
import type { SepetKalem, SepetRBKalem, SepetBaslik, StokListesiBilgileri, AdresBilgileri, KDVKisimTablosu, KurBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';
import { toast } from '../../components/Toast';
import AnimatedListItem from '../../components/AnimatedListItem';
import { ortaTitresim, basariliTitresim } from '../../utils/haptics';
import { WebView } from 'react-native-webview';
import PdfViewer from '../../components/PdfViewer';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { sepetToplamlariniHesapla } from '../../utils/sepetHesap';
import { useSepetAyarlariStore } from '../../store/sepetAyarlariStore';

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

function hesapla(
  kalemler: SepetKalem[],
  kdvDurum: number,
  genelIndirimYuzde: number,
  genelIndirimTutarDeger: number = 0,
  secilenKdvOrani: number = 0,
) {
  return sepetToplamlariniHesapla(kalemler, {
    genelIndirimYuzde,
    genelIndirimTutar: genelIndirimTutarDeger,
    kdvDurum,
    secilenKdvOrani,
  });
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
    kalemIndirim4: rbk.kalemIndirim4,
    kalemIndirim5: rbk.kalemIndirim5,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SepetListesi() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { yetkiBilgileri, calisilanSirket, kdvBilgileri, fiyatTipListesi } = useAppStore();

  // Mod tespiti
  const isCRMMode = !!route.params.crmModu;
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
  const [duzenleUrunu, setDuzenleUrunu] = useState<{ stok: StokListesiBilgileri; miktar: number; aciklama?: string } | null>(null);
  const [duzenleIndex, setDuzenleIndex] = useState<number | null>(null);
  const evrakGuidRef = useRef(route.params.onayGuidId ?? generateGuid());
  const [yuzerMenuAcik, setYuzerMenuAcik] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const [evrakKaydedildi, setEvrakKaydedildi] = useState(false);
  const evrakKaydedildiRef = useRef(false);
  const [kaydedilenRefNo, setKaydedilenRefNo] = useState<number | null>(null);
  const [kaydedilenCrmTeklifId, setKaydedilenCrmTeklifId] = useState<number | null>(route.params.crmTeklifFisId ?? null);
  const [kaydedilenCrmMusteriId, setKaydedilenCrmMusteriId] = useState<number>(route.params.crmMusteriId ?? 0);
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
        if (!route.params.onayModu) {
          aktifSepetTemizle(calisilanSirket);
        }
      }
    });
    return unsubscribe;
  }, [navigation]);

  const isOnayliReadOnly = route.params.onayDurumu === 1;

  // Evrak Fiş Bilgileri state — initial değerler store'dan gelir (tek kaynak)
  const [fisAcik, setFisAcik] = useState(false);
  const [genelIndirimYuzde, setGenelIndirimYuzde] = useState(
    () => route.params.genelIndirimYuzde ?? useSepetAyarlariStore.getState().ayarlar.genelIndirimYuzde,
  );
  const [genelIndirimTutar, setGenelIndirimTutar] = useState(() =>
    route.params.genelIndirimTutar ?? useSepetAyarlariStore.getState().ayarlar.genelIndirimTutar
  );
  const aciklama1Ref = useRef(route.params.aciklama1 ?? '');
  const aciklama2Ref = useRef(route.params.aciklama2 ?? '');
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

  const [kdvDurum, setKdvDurum] = useState(() =>
    route.params.kdvDurum ?? useSepetAyarlariStore.getState().ayarlar.kdvDurum ?? yetkiBilgileri?.kdvDurum ?? 0
  );

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
    // Store'daki secilenKdvOrani'ya karşılık gelen kdvKisimNo varsa onu kullan
    const storeKdvOrani = useSepetAyarlariStore.getState().ayarlar.secilenKdvOrani;
    const aranacakOran = route.params.secilenKdvOrani ?? storeKdvOrani;
    if (aranacakOran !== undefined && aranacakOran > 0) {
      const eslesen = kdvKisimListesi.find((k) => k.kdvKisimOran === aranacakOran);
      if (eslesen) return eslesen.kdvKisimNo;
    }
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

  // Ayar değişikliklerini global store'a yaz — parent aynı store'dan okur, senkron olur.
  // İlk mount'u atla: store'da parent'ın set ettiği değerler var, bunları override etmeyelim.
  const sepetAyarIlkMountRef = useRef(true);
  useEffect(() => {
    if (sepetAyarIlkMountRef.current) {
      sepetAyarIlkMountRef.current = false;
      return;
    }
    useSepetAyarlariStore.getState().updateAyarlar({
      genelIndirimYuzde,
      genelIndirimTutar,
      kdvDurum,
      secilenKdvOrani,
    });
  }, [genelIndirimYuzde, genelIndirimTutar, kdvDurum, secilenKdvOrani]);

  // Toplamlar (kdvOrani === -1 olan kalemler için secilenKdvOrani utility içinde uygulanır)
  const t = hesapla(sepet.kalemler, kdvDurum, genelIndirimYuzde, genelIndirimTutar, secilenKdvOrani);

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
      kalemIndirim4: item.kalemIndirim4,
      kalemIndirim5: item.kalemIndirim5,
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
    setDuzenleUrunu({ stok, miktar: item.miktar, aciklama: item.aciklama });
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
            kalemIndirim4: kalem.kalemIndirim4,
            kalemIndirim5: kalem.kalemIndirim5,
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
      if (isCRMMode) {
        // CRM Teklif kaydet
        const h = hesapla(sepet.kalemler, yetkiBilgileri?.kdvDurum ?? 0, genelIndirimYuzde, genelIndirimTutar, secilenKdvOrani);
        const teklifFisId = route.params.crmTeklifFisId ?? 0;
        const teklifFis: CRMTeklifFisBilgileri = {
          id: teklifFisId,
          musteriid: route.params.crmMusteriId ?? 0,
          kdvdahilflag: yetkiBilgileri?.kdvDurum === 1 ? 1 : 0,
          etadurum: 0,
          etaislflag: 0,
          kdvyuzde: secilenKdvOrani,
          dovizkuru: secilenKur?.dovizKuru ?? 0,
          maltoplam: h.malToplam,
          kalemindirimtoplam: h.kalemIndirimlerToplam,
          indirimyuzde1: genelIndirimYuzde,
          indirimtutar1: h.genelIndirimTutar,
          indirimyuzde2: 0,
          indirimtutar2: 0,
          matrah: h.malToplam - h.kalemIndirimlerToplam - h.genelIndirimTutar,
          kdvtutar: h.kdvToplam,
          geneltoplam: h.genelToplam,
          musterikodu: sepet.cariKodu,
          musteriadi: sepet.cariUnvan,
          yetkili: '',
          aciklama1: aciklama1Ref.current,
          dovizturu: secilenKur?.dovizTuru ?? '',
          hazirlayan: yetkiBilgileri?.kullaniciKodu ?? '',
          etasirketadi: '',
          ilce: '',
          ulke: '',
          mail: '',
          telefon: '',
          notlar: '',
          not1: '',
          not2: '',
          not3: '',
          not4: '',
          not5: '',
          not6: '',
          dovizkodu: secilenKur?.dovizKodu ?? '',
          aciklama2: aciklama2Ref.current,
          aciklama3: '',
          adres1: '',
          adres2: '',
          adres3: '',
          il: '',
          vergidairesi: '',
          vergino: '',
          tckimlikno: '',
          evrakDosyaYolu: '',
          teklifRevizyonNo: '',
          teklifSonRevizyonu: 0,
          odemesekli: '',
          tarih: new Date().toISOString(),
        };
        const teklifHareketler: CRMTeklifHareketBilgileri[] = sepet.kalemler.map((k) => ({
          id: k.crmKalemId ?? 0,
          tekliffisid: teklifFisId,
          musteriid: route.params.crmMusteriId ?? 0,
          kodtipi: 0,
          dovizkuru: secilenKur?.dovizKuru ?? 0,
          fiyat: k.birimFiyat,
          miktar: k.miktar,
          kdvyuzde: k.kdvOrani,
          kalemindirimyuzde1: k.kalemIndirim1,
          kalemindirimtutar1: 0,
          kalemindirimyuzde2: k.kalemIndirim2,
          kalemindirimtutar2: 0,
          barkod: k.barkod,
          stokkodu: k.stokKodu,
          stokcinsi: k.stokCinsi,
          birim: k.birim,
          depo: sepet.anaDepo ?? yetkiBilgileri?.anaDepo ?? '',
          aciklama1: k.aciklama ?? '',
          aciklama2: '',
          aciklama3: '',
          dovizkodu: secilenKur?.dovizKodu ?? '',
          dovizturu: secilenKur?.dovizTuru ?? '',
          miktar2: 0,
          birim2: '',
        }));
        sonuc = await crmTeklifKaydet(teklifFis, teklifHareketler, calisilanSirket);
      } else {
        const anaDepo = sepet.anaDepo ?? yetkiBilgileri?.anaDepo ?? '';
        const karsiDepo = sepet.karsiDepo ?? yetkiBilgileri?.karsiDepo ?? '';
        const saticiKodu = yetkiBilgileri?.kullaniciKodu ?? '';
        const kdvDurum = yetkiBilgileri?.kdvDurum ?? 0;
        const belgeTipi = belgeTipiDeger as 'eevrak' | 'normal' | 'diger';
        const belgeTipiIndex = belgeTipi === 'eevrak' ? 0 : belgeTipi === 'normal' ? 1 : 2;

        const h = hesapla(sepet.kalemler, kdvDurum, genelIndirimYuzde, genelIndirimTutar, secilenKdvOrani);

        const onayFlagAktif =
          (sepet.evrakTipi === EvrakTipi.Fatura && (yetkiBilgileri?.faturaOnaySatis ?? false)) ||
          (sepet.evrakTipi === EvrakTipi.Irsaliye && (yetkiBilgileri?.irsaliyeOnaySatis ?? false)) ||
          (sepet.evrakTipi === EvrakTipi.Siparis && (yetkiBilgileri?.siparisOnaySatis ?? false));

        const onayMekanizmasiAktif =
          !isOnayliReadOnly &&
          onayFlagAktif &&
          (yetkiBilgileri?.onayAltSiniri ?? 0) > 0;

        const onayAltSiniriAsimi =
          onayMekanizmasiAktif &&
          h.genelToplam > (yetkiBilgileri?.onayAltSiniri ?? 0);

        if (onayAltSiniriAsimi) {
          // Durum 1: Onay mekanizmasına tabi, alt sınırı aştı → sadece onaya kaydet
          const onayOpts: OnayKaydetOptions = {
            guidId: evrakGuidRef.current,
            genelIndirimYuzde,
            genelIndirimTutar,
            genelToplam: h.genelToplam,
            anaDepo,
            karsiDepo,
            saticiKodu,
            kullaniciKodu: saticiKodu,
            kdvDahilFlag: kdvDurum,
            aciklama1: aciklama1Ref.current,
            aciklama2: aciklama2Ref.current,
            dovizKodu: secilenKur?.dovizKodu ?? '',
            dovizTuru: secilenKur?.dovizTuru ?? '',
            dovizKuru: secilenKur?.dovizKuru ?? 0,
            belgeTipiIndex,
            evrakEkrani: route.params.evrakEkrani ?? 'ALSAT',
          };
          sonuc = await onayKaydet(sepet, sepet.kalemler, onayOpts, calisilanSirket);
        } else if (isRBMode) {
          const opts: EvrakRBKaydetOptions = {
            saticiKodu,
            kdvDurum,
            anaDepo,
            karsiDepo,
            guidId: evrakGuidRef.current,
            genelIndirimYuzde,
            genelIndirimTutar,
            aciklama1: aciklama1Ref.current,
            aciklama2: aciklama2Ref.current,
            dovizKodu: secilenKur?.dovizKodu ?? '',
            dovizTuru: secilenKur?.dovizTuru ?? '',
            dovizKuru: secilenKur?.dovizKuru ?? 0,
            belgeTipi,
          };
          sonuc = await evrakRBKaydet(sepet, rbKalemler, calisilanSirket, opts);
          if (onayMekanizmasiAktif) {
            // Durum 2 (RB): Onay mekanizmasına tabi, alt sınırın altında → hem evrağa hem onaya kaydet
            const rbRefNo = parseInt(String(sonuc.data), 10);
            const onayOpts: OnayKaydetOptions = {
              guidId: evrakGuidRef.current,
              genelIndirimYuzde,
              genelIndirimTutar,
              genelToplam: h.genelToplam,
              anaDepo,
              karsiDepo,
              saticiKodu,
              kullaniciKodu: saticiKodu,
              kdvDahilFlag: kdvDurum,
              aciklama1: aciklama1Ref.current,
              aciklama2: aciklama2Ref.current,
              dovizKodu: secilenKur?.dovizKodu ?? '',
              dovizTuru: secilenKur?.dovizTuru ?? '',
              dovizKuru: secilenKur?.dovizKuru ?? 0,
              belgeTipiIndex,
              evrakEkrani: route.params.evrakEkrani ?? 'ALSAT',
              onaylamaDurumu: 6,
              onaylayan: saticiKodu,
              onaylamaNotu: 'Kullanıcı tarafından kaydedildi',
              referansNo: !isNaN(rbRefNo) && rbRefNo > 0 ? rbRefNo : 0,
            };
            onayKaydet(sepet, sepet.kalemler, onayOpts, calisilanSirket);
          }
          // Durum 3 (RB): Onay mekanizmasına tabi değil → sadece evrağa kaydedildi, onay çağrılmaz
        } else {
          const opts: EvrakKaydetOptions = {
            saticiKodu,
            kdvDurum,
            anaDepo,
            karsiDepo,
            guidId: evrakGuidRef.current,
            genelIndirimYuzde,
            genelIndirimTutar,
            aciklama1: aciklama1Ref.current,
            aciklama2: aciklama2Ref.current,
            dovizKodu: secilenKur?.dovizKodu ?? '',
            dovizTuru: secilenKur?.dovizTuru ?? '',
            dovizKuru: secilenKur?.dovizKuru ?? 0,
            belgeTipi,
          };
          sonuc = await evrakKaydet(sepet, calisilanSirket, opts);
          if (onayMekanizmasiAktif) {
            // Durum 2: Onay mekanizmasına tabi, alt sınırın altında → hem evrağa hem onaya kaydet
            const evrakRefNo = parseInt(String(sonuc.data), 10);
            const onayOpts: OnayKaydetOptions = {
              guidId: evrakGuidRef.current,
              genelIndirimYuzde,
              genelIndirimTutar,
              genelToplam: h.genelToplam,
              anaDepo,
              karsiDepo,
              saticiKodu,
              kullaniciKodu: saticiKodu,
              kdvDahilFlag: kdvDurum,
              aciklama1: aciklama1Ref.current,
              aciklama2: aciklama2Ref.current,
              dovizKodu: secilenKur?.dovizKodu ?? '',
              dovizTuru: secilenKur?.dovizTuru ?? '',
              dovizKuru: secilenKur?.dovizKuru ?? 0,
              belgeTipiIndex,
              evrakEkrani: route.params.evrakEkrani ?? 'ALSAT',
              onaylamaDurumu: 6,
              onaylayan: saticiKodu,
              onaylamaNotu: 'Kullanıcı tarafından kaydedildi',
              referansNo: !isNaN(evrakRefNo) && evrakRefNo > 0 ? evrakRefNo : 0,
            };
            onayKaydet(sepet, sepet.kalemler, onayOpts, calisilanSirket);
          }
          // Durum 3: Onay mekanizmasına tabi değil → sadece evrağa kaydedildi, onay çağrılmaz
        }
      }
      
      if (sonuc.sonuc) {
        basariliTitresim();
        if (isCRMMode) {
          // CRM Teklif kaydet: API sadece id (number) döner
          const donen = sonuc.data;
          if (typeof donen === 'number' && donen > 0) {
            setKaydedilenCrmTeklifId(donen);
          } else if (typeof donen === 'object' && donen !== null && (donen as CRMTeklifFisBilgileri).id > 0) {
            const teklifData = donen as CRMTeklifFisBilgileri;
            setKaydedilenCrmTeklifId(teklifData.id);
            if (teklifData.musteriid > 0) setKaydedilenCrmMusteriId(teklifData.musteriid);
          }
        } else {
          const refNo = parseInt(String(sonuc.data), 10);
          if (!isNaN(refNo) && refNo > 0) {
            setKaydedilenRefNo(refNo);
          }
        }
        setEvrakKaydedildi(true);
        evrakKaydedildiRef.current = true;
        toast.success(sonuc.mesaj || (isCRMMode ? 'Teklif kaydedildi.' : 'Evrak kaydedildi.'));
      } else {
        toast.error(sonuc.mesaj || (isCRMMode ? 'Teklif kaydedilemedi.' : 'Evrak kaydedilemedi.'));
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
          aktifSepetTemizle(calisilanSirket);
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
      await taslakKaydet(sepet, t.genelToplam, calisilanSirket);
      if (isRBMode) {
        route.params.onRBKalemlerGuncellendi?.([]);
      } else {
        route.params.onKalemlerGuncellendi?.([]);
      }
      aktifSepetTemizle(calisilanSirket);
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
    if (isCRMMode) {
      if (!kaydedilenCrmTeklifId) {
        toast.error('Teklif daha kaydedilmemiş, PDF alınamaz.');
        return;
      }
    } else if (!kaydedilenRefNo) {
      toast.error('Evrak daha kaydedilmemiş, PDF alınamaz.');
      return;
    }

    setPdfModalAcik(true);
    setPdfYukleniyor(true);
    setPdfDosyaUri(null);

    try {
      let base64: string;
      let dosyaAdi: string;

      if (isCRMMode) {
        const musteriId = kaydedilenCrmMusteriId || (route.params.crmMusteriId ?? 0);
        const kullaniciKodu = yetkiBilgileri?.kullaniciKodu ?? '';
        base64 = await crmTeklifPdfAl(kaydedilenCrmTeklifId!, musteriId, kullaniciKodu, calisilanSirket);
        dosyaAdi = `teklif_${kaydedilenCrmTeklifId}`;
      } else {
        if (sepet.alimSatim === AlimSatim.Alim) {
          setPdfModalAcik(false);
          toast.error('Alım işlemlerinde PDF dosyası alınamaz.');
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
        if (!evrakTipiStr) { setPdfModalAcik(false); return; }
        base64 = await evrakPdfAl(kaydedilenRefNo!, evrakTipiStr, calisilanSirket);
        dosyaAdi = `evrak_${kaydedilenRefNo}`;
      }

      const dosyaYolu = `${FileSystem.cacheDirectory}${dosyaAdi}.pdf`;
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
    ...(!isCRMMode ? [{ label: 'Entegratöre Gönder', icon: 'send-outline' as const, color: Colors.primary, onPress: () => { toggleYuzerMenu(false); handleEntegratorGonder(); }, disabled: entegratorYukleniyor || sepet.kalemler.length === 0 }] : []),
    { label: 'PDF Göster', icon: 'document-text-outline' as const, color: Colors.primary, onPress: () => { toggleYuzerMenu(false); handlePdfGoster(); }, disabled: sepet.kalemler.length === 0 },
    ...(!isCRMMode ? [{ label: 'Taslak Kaydet', icon: 'bookmark-outline' as const, color: Colors.accent, onPress: () => { toggleYuzerMenu(false); handleTaslakKaydet(); }, disabled: taslakYukleniyor || evrakKaydedildi || sepet.kalemler.length === 0 || isOnayliReadOnly }] : []),
    { label: 'Temizle', icon: 'trash-outline' as const, color: Colors.error, onPress: () => { toggleYuzerMenu(false); handleTemizle(); }, disabled: sepet.kalemler.length === 0 },
  ];

  // ─── Render helpers ──────────────────────────────────────────────────────────

  // Kalem bazlı KDV hesaplama (her kalem için ayrı)
  const kalemToplam = (k: SepetKalem) => {
    const efektifKdv = k.kdvOrani === -1 ? secilenKdvOrani : k.kdvOrani;
    const ham = k.miktar * k.birimFiyat;
    const netKalem =
      ham *
      (1 - k.kalemIndirim1 / 100) *
      (1 - k.kalemIndirim2 / 100) *
      (1 - k.kalemIndirim3 / 100) *
      (1 - (k.kalemIndirim4 ?? 0) / 100) *
      (1 - (k.kalemIndirim5 ?? 0) / 100);
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
      style={[styles.expanderBaslik, { backgroundColor: Colors.primary }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={styles.expanderBaslikText}>{baslik}</Text>
      <Ionicons
        name={acik ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={'#fff'}
      />
    </TouchableOpacity>
  );

  const renderFisBilgileri = () => (
    <View style={styles.expanderContainer}>
      {renderExpanderBaslik(
        isCRMMode ? 'Teklif Bilgileri' : `Evrak Fiş Bilgileri (${evrakAdi})`,
        fisAcik,
        () => setFisAcik(!fisAcik)
      )}
      {fisAcik && (
        <View style={[styles.fisIcerik, { backgroundColor: Colors.card }]}>
          {/* Cari Ünvanı */}
          <View style={styles.fisRow}>
            <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>Cari Ünvanı</Text>
            <Text style={[styles.fisValueRed, { color: Colors.error }]} numberOfLines={2}>
              {sepet.cariUnvan || 'Lütfen cari seçiniz'}
            </Text>
          </View>

          {/* KDV Oranı + Dahil Checkbox */}
          <View style={[styles.kdvSatir, { zIndex: 30 }]}>
            <View style={[styles.kdvDropdown, isOnayliReadOnly && { pointerEvents: 'none', opacity: 0.5 }]}>
              <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>KDV Oranı</Text>
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
              onPress={isOnayliReadOnly ? undefined : () => setKdvDurum((prev) => (prev === 1 ? 0 : 1))}
              activeOpacity={isOnayliReadOnly ? 1 : 0.7}
            >
              <Ionicons
                name={kdvDurum === 1 ? 'checkbox' : 'square-outline'}
                size={22}
                color={kdvDurum === 1 ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.kdvCheckboxLabel, { color: Colors.text }]}>KDV Dahil</Text>
            </TouchableOpacity>
          </View>

          {/* Belge Tipi */}
          <View style={styles.fisRowCol}>
            <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>Belge Tipi</Text>
            <View style={[styles.belgeTipiDropdown, isOnayliReadOnly && { pointerEvents: 'none', opacity: 0.5 }]}>
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
          <View style={[styles.fisAyirac, { backgroundColor: Colors.border }]} />

          {/* Mal Toplam */}
          <View style={styles.fisRow}>
            <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>Mal Toplam</Text>
            <Text style={[styles.fisValue, { color: Colors.text }]}>{paraFormat(t.malToplam)}</Text>
          </View>

          {/* Genel İsk. */}
          <TouchableOpacity style={styles.fisRow} onPress={isOnayliReadOnly ? undefined : indirimDegistir}>
            <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>Genel İsk.</Text>
            {genelIndirimTutar > 0 ? (
              <Text style={[styles.fisValueAccent, { color: Colors.primary }]}>Tutar: {paraFormat(genelIndirimTutar)}</Text>
            ) : (
              <>
                <Text style={[styles.fisValueAccent, { color: Colors.primary }]}>% {paraFormat(genelIndirimYuzde)}</Text>
                <Text style={[styles.fisValueAccent, { color: Colors.primary }]}>{paraFormat(t.genelIndirimTutar)}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Kalem İsk. */}
          <View style={styles.fisRow}>
            <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>Kalem İsk.</Text>
            <Text style={[styles.fisValue, { color: Colors.text }]}>{paraFormat(t.kalemIndirimlerToplam)}</Text>
          </View>

          {/* KDV Toplam */}
          <View style={styles.fisRow}>
            <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>KDV Toplam</Text>
            <Text style={[styles.fisValue, { color: Colors.text }]}>{paraFormat(t.kdvToplam)}</Text>
          </View>

          {/* Genel Top. */}
          <View style={styles.fisRow}>
            <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>Genel Top.</Text>
            <Text style={[styles.fisValue, { color: Colors.text }]}>{paraFormat(t.genelToplam)}</Text>
          </View>

          {/* Ayırıcı */}
          <View style={[styles.fisAyirac, { backgroundColor: Colors.border }]} />

          {/* Döviz */}
          <TouchableOpacity style={styles.fisRow} onPress={isOnayliReadOnly ? undefined : () => setDovizModalAcik(true)}>
            <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>Döviz Kodu</Text>
            <Text style={[styles.fisValueAccent, { color: Colors.primary }]}>
              {secilenKur ? secilenKur.dovizKodu : 'Seçiniz...'}
            </Text>
            <Text style={[styles.fisLabelSmall, { color: Colors.textSecondary }]}>Döviz Türü</Text>
            <Text style={[styles.fisValueAccent, { color: Colors.primary }]}>
              {secilenKur ? secilenKur.dovizTuru : ''}
            </Text>
          </TouchableOpacity>
          <View style={styles.fisRow}>
            <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>Döviz Kuru</Text>
            <Text style={[styles.fisValue, { color: Colors.text }]}>
              {secilenKur ? secilenKur.dovizKuru.toFixed(5).replace('.', ',') : '0,00000'}
            </Text>
            <Text style={[styles.fisLabelSmall, { color: Colors.textSecondary }]}>Döviz Toplam</Text>
            <Text style={[styles.fisValue, { color: Colors.text }]}>
              {secilenKur && secilenKur.dovizKuru > 0
                ? paraFormat(t.genelToplam / secilenKur.dovizKuru)
                : '0,00'}
            </Text>
          </View>

          {/* Ayırıcı */}
          <View style={[styles.fisAyirac, { backgroundColor: Colors.border }]} />

          {/* Açıklama 1 */}
          <View style={styles.fisRow}>
            <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>Açıklama 1</Text>
            <TextInput
              style={[styles.fisInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBackground }]}
              defaultValue={aciklama1Ref.current}
              onChangeText={(text) => { aciklama1Ref.current = text; }}
              placeholder=""
              editable={!isOnayliReadOnly}
            />
          </View>

          {/* Açıklama 2 */}
          <View style={styles.fisRow}>
            <Text style={[styles.fisLabel, { color: Colors.textSecondary }]}>Açıklama 2</Text>
            <TextInput
              style={[styles.fisInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBackground }]}
              defaultValue={aciklama2Ref.current}
              onChangeText={(text) => { aciklama2Ref.current = text; }}
              placeholder=""
              editable={!isOnayliReadOnly}
            />
          </View>

        </View>
      )}
    </View>
  );

  const renderAdresKarti = (adres: AdresBilgileri) => (
    <TouchableOpacity
      key={adres.adresNo}
      style={[styles.adresKart, { backgroundColor: Colors.background, borderColor: Colors.border }]}
      onPress={() => adresSec(adres)}
      activeOpacity={0.7}
    >
      {/* Adres No + Yetkili */}
      <View style={styles.adresRow}>
        <Text style={[styles.adresLabel, { color: Colors.textSecondary }]}>Adres No</Text>
        <Text style={[styles.adresValueAccent, { color: Colors.primary }]}>{adres.adresNo}</Text>
        <Text style={[styles.adresLabel, { color: Colors.textSecondary }]}>Yetkili</Text>
        <Text style={[styles.adresValueAccent, { color: Colors.primary }]}>{adres.yetkili}</Text>
      </View>
      {/* Adres 1-3 */}
      {adres.adres1 ? (
        <View style={styles.adresRow}>
          <Text style={[styles.adresLabel, { color: Colors.textSecondary }]}>Adres 1</Text>
          <Text style={[styles.adresValue, { color: Colors.text }]}>{adres.adres1}</Text>
        </View>
      ) : null}
      {adres.adres2 ? (
        <View style={styles.adresRow}>
          <Text style={[styles.adresLabel, { color: Colors.textSecondary }]}>Adres 2</Text>
          <Text style={[styles.adresValue, { color: Colors.text }]}>{adres.adres2}</Text>
        </View>
      ) : null}
      {adres.adres3 ? (
        <View style={styles.adresRow}>
          <Text style={[styles.adresLabel, { color: Colors.textSecondary }]}>Adres 3</Text>
          <Text style={[styles.adresValue, { color: Colors.text }]}>{adres.adres3}</Text>
        </View>
      ) : null}
      {/* İl + İlçe */}
      <View style={styles.adresRow}>
        <Text style={[styles.adresLabel, { color: Colors.textSecondary }]}>İl</Text>
        <Text style={[styles.adresValueAccent, { color: Colors.primary }]}>{adres.il}</Text>
        <Text style={[styles.adresLabel, { color: Colors.textSecondary }]}>İlçe</Text>
        <Text style={[styles.adresValueAccent, { color: Colors.primary }]}>{adres.ilce}</Text>
      </View>
      {/* Vergi */}
      <View style={styles.adresRow}>
        <Text style={[styles.adresLabel, { color: Colors.textSecondary }]}>Vergi{'\n'}Dairesi</Text>
        <Text style={[styles.adresValueAccent, { color: Colors.primary }]}>{adres.vergiDairesi}</Text>
        <Text style={[styles.adresLabel, { color: Colors.textSecondary }]}>Vergi{'\n'}Numarası</Text>
        <Text style={[styles.adresValueAccent, { color: Colors.primary }]}>{adres.vergiNumarasi}</Text>
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
        <View style={[styles.adreslerIcerik, { backgroundColor: Colors.card }]}>
          {adresler.length > 0 ? (
            adresler.map(renderAdresKarti)
          ) : (
            <Text style={[styles.bosAdresText, { color: Colors.textSecondary }]}>Adres bilgisi bulunamadı</Text>
          )}
        </View>
      )}
    </View>
  );

  const renderHeaderInfo = () => (
    <View style={[styles.headerInfo, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
      <View style={styles.headerRow}>
        <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
        <Text style={[styles.headerEvrakBold, { color: Colors.primary }]}>{isCRMMode ? 'CRM Teklif' : evrakAdi}</Text>
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
      {isOnayliReadOnly && (
        <View style={styles.onayBanner}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={styles.onayBannerText}>Bu evrak onaylanmıştır. İçerik değiştirilemez.</Text>
        </View>
      )}
      {renderFisBilgileri()}
      <View style={[styles.expanderAyirac, { backgroundColor: Colors.border }]} />
      {renderAdresler()}
    </>
  );

  const renderKalem = ({ item, index }: { item: SepetKalem; index: number }) => {
    const efektifKdv = item.kdvOrani === -1 ? secilenKdvOrani : item.kdvOrani;
    const ham = item.miktar * item.birimFiyat;
    const netKalem =
      ham *
      (1 - item.kalemIndirim1 / 100) *
      (1 - item.kalemIndirim2 / 100) *
      (1 - item.kalemIndirim3 / 100) *
      (1 - (item.kalemIndirim4 ?? 0) / 100) *
      (1 - (item.kalemIndirim5 ?? 0) / 100);
    const netAfterGenel = netKalem * (1 - genelIndirimYuzde / 100);
    const kdvTutari = netAfterGenel * (efektifKdv / 100);
    const toplam = kdvDurum === 1 ? netAfterGenel : netAfterGenel + kdvTutari;

    // RB modda renk/beden bilgisini al
    const rbItem = isRBMode ? rbKalemler[index] : null;

    return (
      <AnimatedListItem index={index}>
        <View style={[styles.kartContainer, { backgroundColor: Colors.card }]}>
          {/* Üst satır: stok kodu + düzenle/sil butonları */}
          <View style={styles.kartUstSatir}>
            <Text style={[styles.kartStokKodu, { color: Colors.textSecondary }]}>{item.stokKodu}</Text>
            {!isOnayliReadOnly && (
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
            )}
          </View>

          {/* Stok cinsi */}
          <Text style={[styles.kartStokCinsi, { color: Colors.text }]}>{item.stokCinsi}</Text>

          {/* Açıklama */}
          {item.aciklama ? (
            <Text style={[styles.kartAciklama, { color: Colors.textSecondary }]}>{item.aciklama}</Text>
          ) : null}

          {/* Renk-Beden bilgisi (sadece RB modda) */}
          {rbItem && (
            <View style={styles.kartRBRow}>
              {rbItem.renkKodu > 0 && (
                <View style={styles.rbChip}>
                  <Ionicons name="color-fill-outline" size={10} color={Colors.primary} />
                  <Text style={[styles.rbChipText, { color: Colors.primary }]}>{rbItem.renkKodu}-{rbItem.renk}</Text>
                </View>
              )}
              {rbItem.bedenKodu > 0 && (
                <View style={styles.rbChip}>
                  <Ionicons name="resize-outline" size={10} color={Colors.primary} />
                  <Text style={[styles.rbChipText, { color: Colors.primary }]}>{rbItem.bedenKodu}-{rbItem.beden}</Text>
                </View>
              )}
            </View>
          )}

          {/* Miktar x Fiyat */}
          <Text style={[styles.kartMiktarFiyat, { color: Colors.text }]}>
            {miktarFormat(item.miktar)} {item.birim}  × {paraFormat(item.birimFiyat)} ₺
          </Text>

          {/* KDV bilgisi + Toplam fiyat */}
          <View style={styles.kartAltSatir}>
            <Text style={[styles.kartKdvBilgi, { color: Colors.textSecondary }]}>
              KDV Hariç: {paraFormat(netAfterGenel)} ₺   KDV %{efektifKdv}: {paraFormat(kdvTutari)} ₺
            </Text>
            <Text style={[styles.kartToplam, { color: Colors.primary }]}>{paraFormat(toplam)} ₺</Text>
          </View>
        </View>
      </AnimatedListItem>
    );
  };

  const renderOzetKarti = () => {
    const kdvHaricToplam = t.malToplam - t.kalemIndirimlerToplam - t.genelIndirimTutar;
    return (
      <View style={[styles.ozetKart, { backgroundColor: Colors.card }]}>
        <View style={styles.ozetSatir}>
          <Text style={[styles.ozetLabel, { color: Colors.text }]}>KDV Hariç Toplam</Text>
          <Text style={[styles.ozetDeger, { color: Colors.text }]}>{paraFormat(kdvHaricToplam)} ₺</Text>
        </View>
        <View style={styles.ozetSatir}>
          <Text style={[styles.ozetLabel, { color: Colors.text }]}>KDV Toplam</Text>
          <Text style={[styles.ozetDeger, { color: Colors.text }]}>{paraFormat(t.kdvToplam)} ₺</Text>
        </View>
        <View style={[styles.ozetAyirac, { backgroundColor: Colors.border }]} />
        <View style={styles.ozetSatir}>
          <Text style={[styles.ozetGenelLabel, { color: Colors.primary }]}>GENEL TOPLAM</Text>
          <Text style={[styles.ozetGenelDeger, { color: Colors.primary }]}>{paraFormat(t.genelToplam)} ₺</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      <FlatList
        data={sepet.kalemler}
        keyExtractor={(item, idx) => item.stokKodu.trim() || String(idx)}
        extraData={[sepet.kalemler, genelIndirimYuzde, fisAcik, adreslerAcik]}
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
      {duzenleUrunu && (
        <UrunMiktariBelirleModal
          key={`duzenle-${duzenleUrunu.stok.stokKodu}-${duzenleIndex ?? ''}`}
          urun={duzenleUrunu.stok}
          kdvDurum={kdvDurum}
          fiyatDegistirmeYetkisi={yetkiBilgileri?.fiyatDegistirmeYetkisi ?? false}
          kalemIndirimYetkisi={yetkiBilgileri?.kalemIndirimYapmaYetkisi ?? false}
          fiyatTipListesi={fiyatTipListesi}
          veriTabaniAdi={calisilanSirket}
          cariKodu={route.params.sepet.cariKodu}
          mode="duzenle"
          initialMiktar={duzenleUrunu.miktar}
          initialAciklama={duzenleUrunu.aciklama}
          maksimumIndirimSayisi={isCRMMode ? 2 : undefined}
          onConfirm={handleDuzenleConfirm}
          onClose={() => setDuzenleUrunu(null)}
        />
      )}

      {/* İndirim modal — conditional mount: her açılışta fresh input state */}
      {indirimModalAcik && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setIndirimModalAcik(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalKutu, { backgroundColor: Colors.card }]}>
              <Text style={[styles.modalBaslik, { color: Colors.text }]}>Genel İskonto</Text>
              <Text style={[styles.modalAlt, { color: Colors.textSecondary }]}>Yüzde</Text>
              <TextInput
                style={[styles.modalInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBackground }]}
                value={indirimInput}
                onChangeText={(val) => {
                  setIndirimInput(val);
                  if (val.trim()) setIndirimTutarInput('');
                }}
                keyboardType="decimal-pad"
                placeholder="% 0"
                autoFocus
                selectTextOnFocus
              />
              <Text style={[styles.modalAlt, { color: Colors.textSecondary }]}>Tutar</Text>
              <TextInput
                style={[styles.modalInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBackground }]}
                value={indirimTutarInput}
                onChangeText={(val) => {
                  setIndirimTutarInput(val);
                  if (val.trim()) setIndirimInput('');
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                selectTextOnFocus
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity onPress={() => setIndirimModalAcik(false)}>
                  <Text style={[styles.modalIptal, { color: Colors.textSecondary }]}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={indirimOnayla}>
                  <Text style={[styles.modalTamam, { color: Colors.primary }]}>Tamam</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Döviz seçim modal */}
      <Modal visible={dovizModalAcik} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.dovizModalKutu, { backgroundColor: Colors.card }]}>
            <Text style={[styles.modalBaslik, { color: Colors.text }]}>Döviz Seçimi</Text>
            {kurListesi.length === 0 ? (
              <Text style={[styles.modalAlt, { color: Colors.textSecondary }]}>Kur bilgisi bulunamadı</Text>
            ) : (
              <FlatList
                data={kurListesi}
                keyExtractor={(item, index) => item.kurID != null ? String(item.kurID) : `kur-${index}`}
                style={styles.dovizListe}
                ItemSeparatorComponent={() => <View style={[styles.dovizAyirac, { backgroundColor: Colors.border }]} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dovizSatir,
                      secilenKur?.kurID === item.kurID && { backgroundColor: Colors.primary + '15' },
                    ]}
                    onPress={() => {
                      setSecilenKur(item);
                      setDovizModalAcik(false);
                    }}
                  >
                    <View style={styles.dovizSol}>
                      <Text style={[styles.dovizKodu, { color: Colors.primary }]}>{item.dovizKodu}</Text>
                      <Text style={[styles.dovizTuru, { color: Colors.textSecondary }]}>{item.dovizTuru}</Text>
                    </View>
                    <Text style={[styles.dovizKuru, { color: Colors.text }]}>
                      {item.dovizKuru.toFixed(5).replace('.', ',')}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <View style={styles.modalBtnRow}>
              {secilenKur && (
                <TouchableOpacity onPress={() => { setSecilenKur(null); setDovizModalAcik(false); }}>
                  <Text style={[styles.modalIptal, { color: Colors.textSecondary }]}>Temizle</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setDovizModalAcik(false)}>
                <Text style={[styles.modalTamam, { color: Colors.primary }]}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Alt bilgi barı */}
      <View style={[styles.altBar, { backgroundColor: Colors.card, borderTopColor: Colors.border, paddingBottom: insets.bottom + 12, marginBottom: 0 }]}>
        <Ionicons name="cart-outline" size={18} color={Colors.primary} />
        <Text style={[styles.altBarText, { color: Colors.text }]}>
          {sepet.kalemler.length} satır · Miktar {t.toplamMiktar}
        </Text>
      </View>

      {/* Yüzer menü overlay */}
      {yuzerMenuAcik && (
        <Pressable style={styles.yuzerOverlay} onPress={() => toggleYuzerMenu(false)}>
          <View style={[styles.yuzerMenuKapsayici, { bottom: 130 + insets.bottom }]}>
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
                    style={[styles.yuzerMenuItem, { backgroundColor: Colors.card }, item.disabled && styles.btnPasif]}
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
            <Text style={[styles.pdfBarBaslik, { color: Colors.text }]}>{isCRMMode ? 'Teklif' : evrakAdi}</Text>
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

      {/* FAB butonu */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: Colors.primary, bottom: 70 + insets.bottom }]}
        onPress={() => toggleYuzerMenu(!yuzerMenuAcik)}
        activeOpacity={0.8}
      >
        <Ionicons name={yuzerMenuAcik ? 'close' : 'ellipsis-vertical'} size={24} color={'#fff'} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  listePadding: { paddingBottom: 12 },

  // ── Header Info ─────────────────────────────────────────────────────────────
  headerInfo: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
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
  },
  expanderBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  expanderBaslikText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Fiş Bilgileri ──────────────────────────────────────────────────────────
  fisIcerik: {
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
    fontWeight: '600',
  },
  fisLabelSmall: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  fisValue: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
  },
  fisValueRed: {
    flex: 1,
    fontSize: 13,
  },
  fisValueAccent: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  fisAyirac: {
    height: 1,
    marginVertical: 4,
  },
  fisInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    fontSize: 13,
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
  },

  // ── Adresler ───────────────────────────────────────────────────────────────
  adreslerIcerik: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  adresKart: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 4,
    borderWidth: 1,
  },
  adresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 22,
  },
  adresLabel: {
    fontSize: 11,
    width: 55,
  },
  adresValue: {
    flex: 1,
    fontSize: 12,
  },
  adresValueAccent: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  bosAdresText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },

  // ── Kalem Kartları ─────────────────────────────────────────────────────────
  kartContainer: {
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
    marginTop: 2,
  },
  kartAciklama: {
    fontSize: 12,
    fontStyle: 'italic',
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
    fontWeight: '600',
  },
  kartMiktarFiyat: {
    fontSize: 13,
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
    flex: 1,
  },
  kartToplam: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },

  // ── Özet Kartı ─────────────────────────────────────────────────────────────
  ozetKart: {
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
  },
  ozetDeger: {
    fontSize: 14,
    fontWeight: '600',
  },
  ozetAyirac: {
    height: 1,
    marginVertical: 8,
  },
  ozetGenelLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  ozetGenelDeger: {
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Boş Ekran ─────────────────────────────────────────────────────────────
  bosEkran: { alignItems: 'center', paddingTop: 60, gap: 12 },
  bosMetin: { fontSize: 14 },

  // ── Alt Bar ────────────────────────────────────────────────────────────────
  altBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  altBarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  altBarToplam: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ── FAB & Yüzer Menü ─────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 70,
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
    bottom: 130,
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
  btnPasif: { opacity: 0.5 },
  onayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 10,
    marginBottom: 6,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#43a047',
  },
  onayBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // ── PDF Modal ─────────────────────────────────────────────────────────────
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

  // ── Modal (Android indirim) ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKutu: {
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
  modalBaslik: { fontSize: 16, fontWeight: '700' },
  modalAlt: { fontSize: 13 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 8,
  },
  modalIptal: { fontSize: 14 },
  modalTamam: { fontSize: 14, fontWeight: '700' },

  // ── Döviz Modal ──────────────────────────────────────────────────────────────
  dovizModalKutu: {
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
  },
  dovizSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dovizSol: {
    flex: 1,
  },
  dovizKodu: {
    fontSize: 15,
    fontWeight: '700',
  },
  dovizTuru: {
    fontSize: 12,
    marginTop: 2,
  },
  dovizKuru: {
    fontSize: 14,
    fontWeight: '600',
  },
});
