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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import {
  cariSiparisListesiniAl,
  siparisEvrakNumarasiniKontrolEt,
  cariAcmaHareketleriniAl,
  evrakAcmaHareketleriniAl,
  siparisKapamaKaydet,
} from '../../api/siparisKapamaApi';
import { fisTipleriniAl, generateGuid } from '../../api/hizliIslemlerApi';
import { Colors } from '../../constants/Colors';
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
import { basariliTitresim } from '../../utils/haptics';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<DrawerParamList, 'SiparisKapama'>;

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
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { yetkiBilgileri, calisilanSirket } = useAppStore();

  // Yetki bilgilerini logla
  useEffect(() => {
    console.log('[SiparisKapama] yetkiBilgileri:', JSON.stringify(yetkiBilgileri, null, 2));
  }, [yetkiBilgileri]);

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
  const { manuelOkuma, baslangicZoom } = useTarayiciAyarlari();

  // ── Sayfaya her girişte sıfırla (CariSecim dönüşü hariç) ──────────────────
  useFocusEffect(
    useCallback(() => {
      if (route.params?.secilenCari) return;
      setAdim('fisListesi');
      setSecilenCari(null);
      setEvrakNo('');
      setFisListesi([]);
      setAcmaListesi([]);
      setKapamaSepeti([]);
      setSecilenFisler([]);
      setAktifTab('acma');
      setAramaMetni('');
    }, [route.params?.secilenCari])
  );

  // ── CariSecim'den geri dönünce ─────────────────────────────────────────────
  const cariDonus = useRef(false);
  useEffect(() => {
    if (route.params?.secilenCari) {
      setSecilenCari(route.params.secilenCari);
      cariDonus.current = true;
      if (_savedGrup) {
        setSecilenGrup(_savedGrup);
        setSecilenFisTipi(_savedFisTipi);
        _savedGrup = null;
        _savedFisTipi = null;
      }
    }
  }, [route.params?.secilenCari]);

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
      toast.warning('Lütfen fiş tipi seçiniz.');
      return;
    }
    if (!secilenCari && !evrakNo.trim()) {
      toast.warning('Lütfen cari seçiniz veya evrak numarası giriniz.');
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
          toast.info('Sipariş fişi bulunamadı.');
        }
      } else {
        toast.error(sonuc?.mesaj || 'Sipariş fişleri alınamadı.');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.mesaj || e?.message || 'Bağlantı hatası oluştu.');
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
            toast.error(sonuc.mesaj || 'Sipariş hareketleri alınamadı.');
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
        toast.error('Sipariş hareketleri alınamadı.');
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
  const satirRengi = (ashb: AcmaSiparisHareketBilgileri): string => {
    if (kalanMiktar(ashb) <= 0) return '#d5ffea';
    if (ashb.sepetMiktar > 0) return '#faf3cf';
    return '#ffffff';
  };

  // ── Sipariş Ekle (açma → kapama) ──────────────────────────────────────────
  const siparisEkle = (ashb: AcmaSiparisHareketBilgileri, miktar: number) => {
    if (miktar + ashb.sepetMiktar > ashb.kalMiktar) {
      toast.warning('Ürün miktarı sipariş miktarından büyük olamaz.');
      return;
    }

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
      toast.warning('Ürün miktarı sipariş miktarından büyük olamaz.');
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
      toast.warning('Lütfen cari seçiniz.');
      return;
    }
    if (kapamaSepeti.length === 0) {
      toast.warning('Kapama sepeti boş.');
      return;
    }
    if (!secilenFisTipi) {
      toast.warning('Fiş tipi bulunamadı.');
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
        toast.success(sonuc.mesaj || 'Kaydedildi.');
      } else {
        toast.error(sonuc.mesaj || 'Hata oluştu.');
      }
      if (sonuc.sonuc) {
        setKapamaSepeti([]);
        // Hareketleri yeniden çek
        if (secilenFisler.length > 0) {
          hareketleriYukle(secilenFisler);
        }
      }
    } catch (e: any) {
      toast.error(e?.message || 'Bağlantı hatası.');
    } finally {
      setKaydediliyor(false);
    }
  };

  // ── Temizle ────────────────────────────────────────────────────────────────
  const sepetiTemizle = () => {
    Alert.alert('Temizle', 'Kapama sepetini temizlemek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Temizle',
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

  // ── Filtrelenmiş açma listesi ──────────────────────────────────────────────
  const filtrelenmisAcma = aramaMetni.trim()
    ? acmaListesi.filter(
        (a) =>
          a.stokKodu.toLowerCase().includes(aramaMetni.toLowerCase()) ||
          a.stokCinsi.toLowerCase().includes(aramaMetni.toLowerCase()) ||
          a.takipNo.toLowerCase().includes(aramaMetni.toLowerCase())
      )
    : acmaListesi;

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
      toast.warning('Geçerli bir miktar giriniz.');
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
      Alert.alert('Uyarı', 'Sepette ürün var. Geri dönmek istiyor musunuz?', [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Geri Dön',
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
      <TouchableOpacity style={styles.secimBtn} onPress={() => setFisTipiModalGorunur(true)}>
        <Ionicons name="document-text-outline" size={18} color={secilenFisTipi ? Colors.primary : Colors.gray} />
        <Text style={[styles.secimBtnText, secilenFisTipi && styles.secimBtnTextSecili]}>
          {secilenFisTipi
            ? `${secilenGrup?.alimSatim ?? ''} - ${secilenFisTipi.fisTipiAdi}`
            : 'Fiş tipi seçiniz...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.gray} />
      </TouchableOpacity>

      {/* Evrak No */}
      <View style={styles.evrakNoRow}>
        <Ionicons name="document-outline" size={18} color={Colors.gray} />
        <TextInput
          style={styles.evrakNoInput}
          placeholder="Evrak numarası giriniz..."
          placeholderTextColor={Colors.gray}
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
            <Ionicons name="close-circle" size={16} color={Colors.gray} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.barkodBtn} onPress={() => setBarkodModalGorunur(true)}>
          <Ionicons name="barcode-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Cari Seçim */}
      <TouchableOpacity
        style={styles.secimBtn}
        onPress={() => {
          setEvrakNo('');
          cariSec();
        }}
      >
        <Ionicons
          name="person-outline"
          size={18}
          color={secilenCari ? Colors.primary : Colors.gray}
        />
        <Text style={[styles.secimBtnText, secilenCari && styles.secimBtnTextSecili]}>
          {secilenCari ? secilenCari.cariUnvan : 'Cari ünvanı seçiniz...'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
      </TouchableOpacity>

      {/* Ara butonu */}
      <TouchableOpacity
        style={[styles.araBtn, fisYukleniyor && { opacity: 0.6 }]}
        onPress={fisleriniAra}
        disabled={fisYukleniyor}
      >
        {fisYukleniyor ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <>
            <Ionicons name="search-outline" size={18} color={Colors.white} />
            <Text style={styles.araBtnText}>Ara</Text>
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
              baslik="Sipariş fişi bulunamadı"
              aciklama="Cari veya evrak numarası ile arama yapınız"
            />
          )
        }
      />

      {/* Hepsi Butonu + Barkod */}
      {fisListesi.length > 0 && (
        <View style={styles.hepsiBarContainer}>
          <TouchableOpacity
            style={[styles.hepsiBtn, (hareketYukleniyor) && { opacity: 0.6 }]}
            onPress={() => hareketleriYukle(fisListesi, true)}
            disabled={hareketYukleniyor}
          >
            {hareketYukleniyor ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="layers-outline" size={18} color={Colors.white} />
                <Text style={styles.hepsiBtnText}>Hepsi ({fisListesi.length} fiş)</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.hepsiBarkodBtn}
            onPress={() => setBarkodModalGorunur(true)}
          >
            <Ionicons name="barcode-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ── Render: Fiş Satırı ─────────────────────────────────────────────────────
  const renderFisSatir = ({ item }: { item: AcmaSiparisFisBilgileri }) => (
    <TouchableOpacity
      style={styles.kart}
      activeOpacity={0.7}
      onPress={() => hareketleriYukle([item])}
    >
      <View style={styles.fisUstSatir}>
        <Text style={styles.etiketDeger}>
          <Text style={styles.etiket}>Tarih </Text>
          {formatTarih(item.tarih)}
        </Text>
        <Text style={styles.etiketDeger}>
          <Text style={styles.etiket}>Evrak No </Text>
          {item.evrakNo}
        </Text>
      </View>
      <View style={styles.fisAltSatir}>
        <Text style={styles.fisBilgi}>
          <Text style={styles.etiket}>Cari: </Text>
          {item.cariKodu}
        </Text>
        <Text style={styles.fisTutar}>
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
      <View style={styles.hareketBaslik}>
        <TouchableOpacity style={styles.geriBtn} onPress={geriDon}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.hareketBaslikText} numberOfLines={1}>
          {secilenFisler.length === 1
            ? `Evrak: ${secilenFisler[0].evrakNo}`
            : `${secilenFisler.length} fiş seçili`}
        </Text>
      </View>

      {/* Tab seçici */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, aktifTab === 'acma' && styles.tabBtnAktif]}
          onPress={() => setAktifTab('acma')}
        >
          <Text style={[styles.tabText, aktifTab === 'acma' && styles.tabTextAktif]}>
            Açma ({acmaListesi.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, aktifTab === 'kapama' && styles.tabBtnAktif]}
          onPress={() => setAktifTab('kapama')}
        >
          <Text style={[styles.tabText, aktifTab === 'kapama' && styles.tabTextAktif]}>
            Kapama ({kapamaSepeti.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* İçerik */}
      {aktifTab === 'acma' ? (
        <View style={{ flex: 1 }}>
          {/* Arama */}
          <View style={styles.aramaRow}>
            <Ionicons name="search-outline" size={16} color={Colors.gray} />
            <TextInput
              style={styles.aramaInput}
              placeholder="Stok kodu, cinsi veya takip no ara..."
              placeholderTextColor={Colors.gray}
              value={aramaMetni}
              onChangeText={setAramaMetni}
              returnKeyType="search"
            />
            {aramaMetni.length > 0 && (
              <TouchableOpacity onPress={() => setAramaMetni('')}>
                <Ionicons name="close-circle" size={16} color={Colors.gray} />
              </TouchableOpacity>
            )}
          </View>

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

      {/* Alt bar */}
      {kapamaSepeti.length > 0 && (
        <View style={styles.altBar}>
          <View style={styles.altBarBilgi}>
            <Text style={styles.altBarKalem}>{kapamaSepeti.length} kalem</Text>
            <Text style={styles.altBarToplam}>
              {paraTL(kapamaSepeti.reduce((t, k) => t + k.fiyat * k.miktar, 0))}
            </Text>
          </View>
          <TouchableOpacity style={styles.temizleBtn} onPress={sepetiTemizle}>
            <Ionicons name="trash-outline" size={18} color="#e53935" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.kaydetBtn, kaydediliyor && { opacity: 0.6 }]}
            onPress={evrakKaydet}
            disabled={kaydediliyor}
          >
            {kaydediliyor ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color={Colors.white} />
                <Text style={styles.kaydetBtnText}>Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ── Render: Açma satırı ────────────────────────────────────────────────────
  const renderAcmaSatir = ({ item }: { item: AcmaSiparisHareketBilgileri }) => {
    const kalan = kalanMiktar(item);
    const teslim = teslimEdilenMiktar(item);
    return (
      <TouchableOpacity
        style={[styles.kart, { backgroundColor: satirRengi(item) }]}
        activeOpacity={0.7}
        onPress={() => {
          if (kalan <= 0) {
            toast.warning('Bu kalemin tüm siparişleri tamamlandı.');
            return;
          }
          siparisEkle(item, 1);
        }}
        onLongPress={() => {
          if (kalan <= 0) return;
          miktarModalAc({ tip: 'acma', ashb: item });
        }}
        delayLongPress={400}
      >
        <View style={styles.acmaUstSatir}>
          <Text style={styles.etiketDeger}>
            <Text style={styles.etiket}>Tarih </Text>
            {formatTarih(item.tarih)}
          </Text>
          <Text style={styles.etiketDeger}>
            <Text style={styles.etiket}>Takip No </Text>
            {item.takipNo}
          </Text>
        </View>
        <Text style={styles.stokKodu}>{item.stokKodu}</Text>
        <Text style={styles.stokCinsi} numberOfLines={2}>{item.stokCinsi}</Text>
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
    <View style={styles.kart}>
      <View style={styles.kapamaUstSatir}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stokKodu}>{item.stokKodu}</Text>
          <Text style={styles.stokCinsi} numberOfLines={2}>{item.stokCinsi}</Text>
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
        <Text style={styles.fiyatText}>Fiyat: {paraTL(item.fiyat)}</Text>
        <TouchableOpacity
          style={styles.miktarDuzenleBtn}
          onPress={() => miktarModalAc({ tip: 'kapama', kalem: item })}
        >
          <Text style={styles.miktarDuzenleBtnText}>
            Miktar: {miktarFormat(item.miktar)}
          </Text>
          <Ionicons name="create-outline" size={14} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.tutarText}>Tutar: {paraTL(item.fiyat * item.miktar)}</Text>
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ANA RENDER ─────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.ekran}>
      {adim === 'fisListesi' ? renderFisListesi() : renderHareketler()}

      {/* Miktar Modal */}
      <Modal visible={miktarModalGorunur} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>
              {modalHedef?.tip === 'acma'
                ? modalHedef.ashb.stokCinsi
                : modalHedef?.tip === 'kapama'
                ? modalHedef.kalem.stokCinsi
                : ''}
            </Text>
            {modalHedef?.tip === 'acma' && (
              <Text style={styles.modalAltBilgi}>
                Kalan: {miktarFormat(kalanMiktar(modalHedef.ashb))}
              </Text>
            )}
            <TextInput
              style={styles.modalInput}
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
                <Text style={styles.modalIptalText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalOnayla]}
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
          <View style={styles.fisTipiModalKutu}>
            <View style={styles.fisTipiModalBaslik}>
              <Text style={styles.fisTipiModalBaslikText}>Fiş Tipi Seçiniz</Text>
              <TouchableOpacity onPress={() => setFisTipiModalGorunur(false)}>
                <Ionicons name="close" size={24} color={Colors.darkGray} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={kapamaGruplari}
              keyExtractor={(g, i) => `${g.evrakTipi}-${i}`}
              renderItem={({ item: grup }) => (
                <View>
                  <Text style={styles.fisTipiGrupBaslik}>{grup.alimSatim} - {grup.evrakTipi}</Text>
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
                        color={secilenFisTipi?.fisTipiKodu === ft.fisTipiKodu ? Colors.primary : Colors.gray}
                      />
                      <Text style={styles.fisTipiSatirText}>{ft.fisTipiAdi}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.bosMetin}>Kapama fiş tipi bulunamadı</Text>
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
          setEvrakNo(barkod);
          setSecilenCari(null);
        }}
      />

      {/* Yükleniyor overlay */}
      {(hareketYukleniyor || kaydediliyor) && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
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
  return (
    <View style={styles.miktarKutu}>
      <Text style={styles.miktarEtiket}>{etiket}</Text>
      <Text style={[styles.miktarDeger, renk ? { color: renk } : undefined]}>{deger}</Text>
    </View>
  );
}

// ─── Stiller ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: '#f5f5f5' },

  // Seçim butonları (Fiş tipi, Cari)
  secimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  secimBtnText: { flex: 1, fontSize: 14, color: Colors.gray },
  secimBtnTextSecili: { color: Colors.darkGray, fontWeight: '600' },

  // Evrak No
  evrakNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  evrakNoInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.black,
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
    backgroundColor: Colors.primary,
    marginHorizontal: 14,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  araBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

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
  fisBilgi: { fontSize: 12, color: Colors.gray },
  fisTutar: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  // Hepsi butonu
  hepsiBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  hepsiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  hepsiBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  hepsiBarkodBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hareket başlık
  hareketBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  geriBtn: {
    padding: 4,
  },
  hareketBaslikText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnAktif: {
    borderBottomColor: Colors.primary,
  },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.gray },
  tabTextAktif: { color: Colors.primary, fontWeight: '700' },

  // Arama
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.black,
    paddingVertical: 0,
  },

  // Liste
  listePadding: { padding: 10, paddingTop: 6 },
  ayirac: { height: 8 },

  // Kart
  kart: {
    backgroundColor: Colors.white,
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
  etiket: { fontSize: 11, color: Colors.gray, fontWeight: '600' },
  etiketDeger: { fontSize: 11, color: Colors.darkGray, fontWeight: '600' },
  stokKodu: { fontSize: 11, color: Colors.gray, fontWeight: '600', letterSpacing: 0.5 },
  stokCinsi: { fontSize: 14, fontWeight: '700', color: Colors.darkGray, marginTop: 2, marginBottom: 8 },

  miktarSatirlar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  miktarKutu: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  miktarEtiket: { fontSize: 10, color: Colors.gray, marginBottom: 2 },
  miktarDeger: { fontSize: 13, fontWeight: '700', color: Colors.darkGray },

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
  fiyatText: { fontSize: 12, color: Colors.gray },
  miktarDuzenleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miktarDuzenleBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  tutarText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Alt bar
  altBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  altBarBilgi: { flex: 1 },
  altBarKalem: { fontSize: 12, color: Colors.gray },
  altBarToplam: { fontSize: 16, fontWeight: '700', color: Colors.darkGray },
  temizleBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
  },
  kaydetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  kaydetBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  // Boş ekran
  bosMetin: {
    fontSize: 14,
    color: Colors.gray,
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
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    gap: 16,
  },
  modalBaslik: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkGray,
    textAlign: 'center',
  },
  modalAltBilgi: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: -8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.darkGray,
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
  modalIptalText: { color: Colors.gray, fontWeight: '600' },
  modalOnayla: {
    backgroundColor: Colors.primary,
  },
  modalOnaylaText: { color: Colors.white, fontWeight: '700' },

  // Fiş Tipi Modal
  fisTipiModalKutu: {
    backgroundColor: Colors.white,
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
    borderBottomColor: Colors.border,
  },
  fisTipiModalBaslikText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.darkGray,
  },
  fisTipiGrupBaslik: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray,
    backgroundColor: '#f5f5f5',
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
    color: Colors.darkGray,
    fontWeight: '500',
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
