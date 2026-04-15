import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Keyboard,
  Switch,
  Animated,
  Pressable,
  SafeAreaView,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { WebView } from 'react-native-webview';
import PdfViewer from '../../components/PdfViewer';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { cariBakiyeAl, islemTipleriniAl, tahsilatKaydet, kasaTahsilatKaydet, cekSenetKaydet } from '../../api/tahsilatApi';
import { kasaKartListesiniAl, evrakPdfAl } from '../../api/raporApi';
import { useColors } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '../../components/Toast';
import type { CariKartBilgileri, IslemTipleri, KasaKartBilgileri } from '../../models';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<DrawerParamList, 'Tahsilatlar'>;

type TahsilatTipi = 'cari' | 'kasa' | 'cek' | 'senet';

type IslemMenuItem =
  | { turu: 'tahsilat'; tip: TahsilatTipi; baslik: string; icon: keyof typeof Ionicons.glyphMap; yetkiKey?: string }
  | { turu: 'navigasyon'; ekran: string; baslik: string; icon: keyof typeof Ionicons.glyphMap; params?: object }
  | { turu: 'pdf'; baslik: string; icon: keyof typeof Ionicons.glyphMap; dizaynAdi: string; evrakTipi: string };

const ISLEM_MENUSU: IslemMenuItem[] = [
  { turu: 'navigasyon', ekran: 'CariEkstreListesi', baslik: 'Cari Ekstre', icon: 'document-text-outline' },
  { turu: 'navigasyon', ekran: 'StokluCariEkstreListesi', baslik: 'Stoklu Ekstre', icon: 'list-outline' },
  { turu: 'navigasyon', ekran: 'BekleyenSiparisler', baslik: 'Bekleyen Siparişler', icon: 'time-outline' },
  { turu: 'pdf', baslik: 'Tahsilat Listesi', icon: 'receipt-outline', dizaynAdi: 'Mobil_TahsilatDetayDizayn.repx', evrakTipi: 'TahsilatDetay' },
  { turu: 'pdf', baslik: 'Adresler', icon: 'location-outline', dizaynAdi: 'Mobil_CariAdresDizayn.repx', evrakTipi: 'CariAdres' },
  { turu: 'tahsilat', tip: 'cari', baslik: 'Cari Tahsilat', icon: 'cash-outline', yetkiKey: 'cariTahsilatYetkisi' },
  { turu: 'tahsilat', tip: 'kasa', baslik: 'Kasa Tahsilatı', icon: 'wallet-outline', yetkiKey: 'kasaTahsilatYetkisi' },
  { turu: 'tahsilat', tip: 'cek', baslik: 'Çek Tahsilatı', icon: 'document-text-outline', yetkiKey: 'cekTahsilatYetkisi' },
  { turu: 'tahsilat', tip: 'senet', baslik: 'Senet Tahsilatı', icon: 'receipt-outline', yetkiKey: 'senetTahsilatYetkisi' },
];

function uuidOlustur(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function dateToApi(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}T00:00:00`;
}

function sayiFormatla(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TahsilatEkrani() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { calisilanSirket, yetkiBilgileri } = useAppStore();

  // Cari
  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [cariBakiye, setCariBakiye] = useState<number | null>(null);

  // Tahsilat tipi
  const [aktifTip, setAktifTip] = useState<TahsilatTipi | null>(null);
  const [islemMenuAcik, setIslemMenuAcik] = useState(false);
  const [bilgiKartAcik, setBilgiKartAcik] = useState(false);

  // İşlem tipleri (cari + kasa)
  const [islemListesi, setIslemListesi] = useState<IslemTipleri[]>([]);
  const [secilenIslem, setSecilenIslem] = useState<IslemTipleri | null>(null);
  const [islemPickerAcik, setIslemPickerAcik] = useState(false);
  const [islemTipleriYukleniyor, setIslemTipleriYukleniyor] = useState(false);
  const [kasaIslemTipi, setKasaIslemTipi] = useState<IslemTipleri | null>(null);

  // Kasa listesi
  const [kasaListesi, setKasaListesi] = useState<KasaKartBilgileri[]>([]);
  const [secilenKasa, setSecilenKasa] = useState<KasaKartBilgileri | null>(null);
  const [kasaPickerAcik, setKasaPickerAcik] = useState(false);

  // Ortak form alanları
  const [evrakNo, setEvrakNo] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [vadeTarihi, setVadeTarihi] = useState<Date>(new Date());
  const [tarihPickerAcik, setTarihPickerAcik] = useState(false);
  const [tutar, setTutar] = useState('');

  // Çek/Senet form alanları
  const [asilBorclu, setAsilBorclu] = useState('');
  const [kendiCeki, setKendiCeki] = useState(false);
  const [banka, setBanka] = useState('');
  const [sube, setSube] = useState('');
  const [cekNo, setCekNo] = useState('');
  const [hesapNo, setHesapNo] = useState('');
  const [kesideYeri, setKesideYeri] = useState('');
  const [satirAcik1, setSatirAcik1] = useState('');
  const [satirAcik2, setSatirAcik2] = useState('');

  // Senet ek alanları
  const [duzAdresi, setDuzAdresi] = useState('');
  const [duzIl, setDuzIl] = useState('');
  const [duzIlce, setDuzIlce] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const tutarFocused = useRef(false);
  const subSayfayaGidildi = useRef(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [klavyeYuksekligi, setKlavyeYuksekligi] = useState(0);

  // FAB & PDF
  const [yuzerMenuAcik, setYuzerMenuAcik] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const [kaydedilenRefNo, setKaydedilenRefNo] = useState<number | null>(null);
  const [pdfModalAcik, setPdfModalAcik] = useState(false);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  const [pdfDosyaUri, setPdfDosyaUri] = useState<string | null>(null);

  // Cari seçimi: pendingCari (cari seç butonu) veya route.params (+ butonu)
  const cariUygula = useCallback((cari: CariKartBilgileri) => {
    setSecilenCari(cari);
    if (cari.bakiye !== undefined) {
      setCariBakiye(cari.bakiye);
    } else {
      bakiyeYukle(cari.cariKodu);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Sub-sayfadan geri dönüşte sıfırlama
      if (subSayfayaGidildi.current) {
        subSayfayaGidildi.current = false;
        return;
      }

      // Taze giriş — her şeyi sıfırla
      setSecilenCari(null);
      setCariBakiye(null);
      setAktifTip(null);
      setBilgiKartAcik(false);
      setEvrakNo('');
      setAciklama('');
      setVadeTarihi(new Date());
      setTutar('');
      setAsilBorclu('');
      setKendiCeki(false);
      setBanka('');
      setSube('');
      setCekNo('');
      setHesapNo('');
      setKesideYeri('');
      setSatirAcik1('');
      setSatirAcik2('');
      setDuzAdresi('');
      setDuzIl('');
      setDuzIlce('');

      const pending = useAppStore.getState().pendingCari;
      if (pending && pending.target === 'Tahsilatlar') {
        cariUygula(pending.cari);
        useAppStore.getState().clearPendingCari();
      }
    }, [cariUygula])
  );

  // Route params'tan secilenCari (+ butonu ile gelindiğinde) ve tahsilatTipi
  useEffect(() => {
    if (route.params?.secilenCari) {
      cariUygula(route.params.secilenCari);
    }
    if (route.params?.tahsilatTipi) {
      setAktifTip(route.params.tahsilatTipi);
    }
  }, [route.params?.secilenCari, route.params?.tahsilatTipi]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKlavyeYuksekligi(e.endCoordinates.height);
      if (tutarFocused.current) {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKlavyeYuksekligi(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    islemTipleriYukle();
    kasaListesiYukle();
  }, []);

  // Header'ı güncelle
  useEffect(() => {
    const tahsilatItem = ISLEM_MENUSU.find((m) => m.turu === 'tahsilat' && m.tip === aktifTip);
    const baslik = tahsilatItem?.baslik ?? 'Tahsilat İşlemleri';
    navigation.setOptions({
      title: baslik,
      headerLeft: aktifTip
        ? () => (
            <TouchableOpacity
              onPress={() => setAktifTip(null)}
              style={{ paddingHorizontal: 12 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.headerText} />
            </TouchableOpacity>
          )
        : undefined,
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('AnaSayfa')}
            style={{ paddingHorizontal: 10 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="home-outline" size={22} color={Colors.headerText} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [aktifTip, navigation]);

  const islemTipleriYukle = async () => {
    setIslemTipleriYukleniyor(true);
    try {
      const sonuc = await islemTipleriniAl(calisilanSirket);
      if (sonuc.sonuc && sonuc.data?.itListe?.length > 0) {
        setIslemListesi(sonuc.data.itListe);
        setSecilenIslem(sonuc.data.cariIslemTipi ?? sonuc.data.itListe[0]);
        if (sonuc.data.kasaIslemTipi) setKasaIslemTipi(sonuc.data.kasaIslemTipi);
      }
    } catch {
      // sessiz
    } finally {
      setIslemTipleriYukleniyor(false);
    }
  };

  const kasaListesiYukle = async () => {
    try {
      const sonuc = await kasaKartListesiniAl(calisilanSirket);
      if (sonuc.sonuc && sonuc.data) {
        setKasaListesi(sonuc.data);
        if (sonuc.data.length > 0) setSecilenKasa(sonuc.data[0]);
      }
    } catch {
      // sessiz
    }
  };

  const bakiyeYukle = async (cariKodu: string) => {
    try {
      const sonuc = await cariBakiyeAl(cariKodu, calisilanSirket);
      if (sonuc.sonuc) {
        setCariBakiye(parseFloat(sonuc.data?.replace(',', '.') ?? '0'));
      }
    } catch { /* sessiz */ }
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

  const handlePdfGoster = async () => {
    if (!kaydedilenRefNo) {
      toast.error('Evrak henüz kaydedilmemiş, PDF alınamaz.');
      return;
    }
    setPdfModalAcik(true);
    setPdfYukleniyor(true);
    setPdfDosyaUri(null);
    try {
      const evrakTipiStr =
        aktifTip === 'cari' ? 'CariTahsilat'
        : aktifTip === 'kasa' ? 'KasaTahsilat'
        : aktifTip === 'cek' ? 'ÇekTahsilat'
        : 'SenetTahsilat';
      const base64 = await evrakPdfAl(kaydedilenRefNo, evrakTipiStr, calisilanSirket);
      const dosyaYolu = `${FileSystem.cacheDirectory}tahsilat_${kaydedilenRefNo}.pdf`;
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

  const temizle = useCallback(() => {
    setEvrakNo('');
    setAciklama('');
    setVadeTarihi(new Date());
    setTutar('');
    setAsilBorclu('');
    setKendiCeki(false);
    setBanka('');
    setSube('');
    setCekNo('');
    setHesapNo('');
    setKesideYeri('');
    setSatirAcik1('');
    setSatirAcik2('');
    setDuzAdresi('');
    setDuzIl('');
    setDuzIlce('');
    setKaydedilenRefNo(null);
    if (islemListesi.length > 0) setSecilenIslem(islemListesi[0]);
  }, [islemListesi]);

  const dogrula = (): boolean => {
    if (!secilenCari) {
      toast.error('Lütfen cari seçiniz.');
      return false;
    }
    if (!aktifTip) {
      toast.error('Lütfen işlem türü seçiniz.');
      return false;
    }
    if (aktifTip === 'kasa' && !secilenKasa) {
      toast.error('Lütfen kasa seçiniz.');
      return false;
    }
    if ((aktifTip === 'cari' || aktifTip === 'kasa') && !secilenIslem) {
      toast.error('Lütfen işlem tipi seçiniz.');
      return false;
    }
    const tutarSayi = parseFloat(tutar.replace(',', '.'));
    if (!tutar || isNaN(tutarSayi) || tutarSayi <= 0) {
      toast.error('Tutar 0 ve 0\'dan küçük olamaz.');
      return false;
    }
    return true;
  };

  const kaydet = async () => {
    if (!dogrula()) return;
    const tutarSayi = parseFloat(tutar.replace(',', '.'));

    setKaydediliyor(true);
    try {
      let sonuc;

      if (aktifTip === 'cari') {
        sonuc = await tahsilatKaydet({
          guid: uuidOlustur(),
          kullaniciKodu: yetkiBilgileri?.kullaniciKodu ?? '',
          veriTabaniAdi: calisilanSirket,
          tb: {
            islemTipi: parseInt(secilenIslem!.islemTipiKodu, 10),
            cariKodu: secilenCari!.cariKodu,
            cariUnvani: secilenCari!.cariUnvan,
            tarih: dateToApi(new Date()),
            aciklama: secilenCari!.cariUnvan,
            aciklama1: aciklama,
            vadeTarihi: dateToApi(vadeTarihi),
            tutar: tutarSayi,
          },
        });
      } else if (aktifTip === 'kasa') {
        sonuc = await kasaTahsilatKaydet({
          guid: uuidOlustur(),
          kullaniciKodu: yetkiBilgileri?.kullaniciKodu ?? '',
          veriTabaniAdi: calisilanSirket,
          ktb: {
            kasaKodu: secilenKasa!.kasaKodu,
            kasaAdi: secilenKasa!.kasaAdi,
            vadeTarih: dateToApi(vadeTarihi),
            cariKodu: secilenCari!.cariKodu,
            cariUnvan: secilenCari!.cariUnvan,
            evrakNo,
            aciklama,
            islemTipi: parseInt(secilenIslem!.islemTipiKodu, 10),
            tutar: tutarSayi,
          },
        });
      } else {
        // Çek veya Senet
        sonuc = await cekSenetKaydet({
          guid: uuidOlustur(),
          kullaniciKodu: yetkiBilgileri?.kullaniciKodu ?? '',
          veriTabaniAdi: calisilanSirket,
          evrakTipi: aktifTip === 'cek' ? 'C' : 'S',
          ctb: {
            cariKodu: secilenCari!.cariKodu,
            cariUnvani: secilenCari!.cariUnvan,
            vadeTarihi: dateToApi(vadeTarihi),
            aciklama,
            aciklama1: satirAcik1,
            aciklama2: satirAcik2,
            evrakNo,
            tutar: tutarSayi,
            asilBorclu,
            kendiCeki,
            banka: aktifTip === 'cek' ? banka : '',
            sube: aktifTip === 'cek' ? sube : '',
            cekNo: aktifTip === 'cek' ? cekNo : '',
            hesapNo: aktifTip === 'cek' ? hesapNo : '',
            kesideYeri: aktifTip === 'cek' ? kesideYeri : '',
            tarih: dateToApi(new Date()),
            duzenlemeAdresi: aktifTip === 'senet' ? duzAdresi : '',
            duzenlemeIl: aktifTip === 'senet' ? duzIl : '',
            duzenlemeIlce: aktifTip === 'senet' ? duzIlce : '',
          },
        });
      }

      if (sonuc.sonuc) {
        const refNo = typeof sonuc.data === 'number' ? sonuc.data : null;
        setKaydedilenRefNo(refNo);
        const bakiyeSonuc = await cariBakiyeAl(secilenCari!.cariKodu, calisilanSirket);
        if (bakiyeSonuc.sonuc) {
          setCariBakiye(parseFloat(bakiyeSonuc.data?.replace(',', '.') ?? '0'));
        }
        Alert.alert('Bilgi', 'Evrak başarı ile kaydedildi.');
      } else {
        toast.error(sonuc.mesaj || 'Kayıt başarısız.');
      }
    } catch (err: any) {
      const mesaj = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message ?? String(err);
      toast.error(mesaj);
    } finally {
      setKaydediliyor(false);
    }
  };

  const islemMenuSec = (item: IslemMenuItem) => {
    setIslemMenuAcik(false);
    if (!secilenCari) return;

    if (item.turu === 'navigasyon') {
      subSayfayaGidildi.current = true;
      (navigation as any).navigate(item.ekran, {
        secilenCari,
        kaynakEkran: 'Tahsilatlar',
        ...item.params,
      });
      return;
    }

    if (item.turu === 'pdf') {
      subSayfayaGidildi.current = true;
      (navigation as any).navigate('PDFRaporGoster', {
        dizaynAdi: item.dizaynAdi,
        evrakTipi: item.evrakTipi,
        parametre1: secilenCari.cariKodu,
        baslik: `${item.baslik} - ${secilenCari.cariUnvan}`,
        kaynakEkran: 'Tahsilatlar',
      });
      return;
    }

    // tahsilat tipi değiştir
    setAktifTip(item.tip);
    temizle();
    if (item.tip === 'kasa' && kasaIslemTipi) {
      setSecilenIslem(kasaIslemTipi);
    } else if (item.tip === 'cari' && islemListesi.length > 0) {
      setSecilenIslem(islemListesi[0]);
    }
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const renderSatir = (etiket: string, children: React.ReactNode) => (
    <View style={[styles.satirContainer, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
      <Text style={[styles.etiket, { color: Colors.text }]}>{etiket}</Text>
      {children}
    </View>
  );

  const renderInput = (etiket: string, value: string, onChange: (t: string) => void, placeholder = '', extra?: object) => (
    renderSatir(etiket,
      <TextInput
        style={[styles.giris, { color: Colors.text }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        {...extra}
      />
    )
  );

  const formatTarih = (d: Date): string =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

  const onTarihDegis = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setTarihPickerAcik(false);
    if (selected) setVadeTarihi(selected);
  };

  const renderVadeTarihi = () => (
    renderSatir('Vade Tar.',
      <TouchableOpacity
        style={styles.tarihBtn}
        onPress={() => setTarihPickerAcik(true)}
      >
        <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
        <Text style={[styles.tarihBtnText, { color: Colors.text }]}>{formatTarih(vadeTarihi)}</Text>
      </TouchableOpacity>
    )
  );

  const renderIslemTipiPicker = () => (
    renderSatir('İşlem Tipi',
      <TouchableOpacity
        style={styles.pickerTrigger}
        onPress={() => setIslemPickerAcik(true)}
        disabled={islemTipleriYukleniyor}
      >
        {islemTipleriYukleniyor ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <>
            <Text style={[styles.pickerTriggerText, { color: Colors.primary }]} numberOfLines={1}>
              {secilenIslem ? `${secilenIslem.islemTipiKodu} - ${secilenIslem.islemTipiAdi}` : 'Seçiniz...'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
          </>
        )}
      </TouchableOpacity>
    )
  );

  const renderTutarInput = () => (
    renderSatir('Tutar',
      <TextInput
        style={[styles.giris, styles.tutarGiris, { color: Colors.error }]}
        value={tutar}
        onChangeText={setTutar}
        placeholder="0,00"
        placeholderTextColor={Colors.textSecondary}
        keyboardType="decimal-pad"
        onFocus={() => { tutarFocused.current = true; }}
        onBlur={() => { tutarFocused.current = false; }}
      />
    )
  );

  // ─── Cari Tahsilat formu ───────────────────────────────────────────────────
  const renderCariForm = () => (
    <>
      {renderIslemTipiPicker()}
      {renderInput('Evrak No', evrakNo, setEvrakNo)}
      {renderInput('Açıklama', aciklama, setAciklama)}
      {renderVadeTarihi()}
      {renderTutarInput()}
    </>
  );

  // ─── Kasa Tahsilatı formu ──────────────────────────────────────────────────
  const renderKasaForm = () => (
    <>
      {renderSatir('Kasa',
        <TouchableOpacity
          style={styles.pickerTrigger}
          onPress={() => setKasaPickerAcik(true)}
        >
          <Text style={[styles.pickerTriggerText, { color: Colors.primary }]} numberOfLines={1}>
            {secilenKasa ? `${secilenKasa.kasaKodu}-${secilenKasa.kasaAdi}` : 'Seçiniz...'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}
      {renderIslemTipiPicker()}
      {renderInput('Evrak No', evrakNo, setEvrakNo)}
      {renderInput('Açıklama', aciklama, setAciklama)}
      {renderVadeTarihi()}
      {renderTutarInput()}
    </>
  );

  // ─── Çek Tahsilatı formu ───────────────────────────────────────────────────
  const renderCekForm = () => (
    <>
      {renderInput('Asıl Borçlu', asilBorclu, setAsilBorclu)}
      {renderInput('Evrak No', evrakNo, setEvrakNo)}
      {renderSatir('Kendi Çeki',
        <Switch
          value={kendiCeki}
          onValueChange={setKendiCeki}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor="#fff"
        />
      )}
      {renderVadeTarihi()}
      {renderInput('Banka', banka, setBanka)}
      {renderInput('Şube', sube, setSube)}
      {renderInput('Çek No.', cekNo, setCekNo)}
      {renderInput('Hesap No.', hesapNo, setHesapNo)}
      {renderInput('Keşide Yeri', kesideYeri, setKesideYeri)}
      {renderInput('Açıklama', aciklama, setAciklama)}
      {renderInput('Satır Açık. 1', satirAcik1, setSatirAcik1)}
      {renderInput('Satır Açık. 2', satirAcik2, setSatirAcik2)}
      {renderTutarInput()}
    </>
  );

  // ─── Senet Tahsilatı formu ─────────────────────────────────────────────────
  const renderSenetForm = () => (
    <>
      {renderInput('Asıl Borçlu', asilBorclu, setAsilBorclu)}
      {renderInput('Evrak No', evrakNo, setEvrakNo)}
      {renderSatir('Kendi Senedi',
        <Switch
          value={kendiCeki}
          onValueChange={setKendiCeki}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor="#fff"
        />
      )}
      {renderVadeTarihi()}
      {renderInput('Düz. Adresi', duzAdresi, setDuzAdresi)}
      {renderInput('Düz. İl', duzIl, setDuzIl)}
      {renderInput('Düz. İlçe', duzIlce, setDuzIlce)}
      {renderInput('Açıklama', aciklama, setAciklama)}
      {renderInput('Satır Açık. 1', satirAcik1, setSatirAcik1)}
      {renderInput('Satır Açık. 2', satirAcik2, setSatirAcik2)}
      {renderTutarInput()}
    </>
  );

  const renderAktifForm = () => {
    if (!aktifTip) return null;
    switch (aktifTip) {
      case 'cari': return renderCariForm();
      case 'kasa': return renderKasaForm();
      case 'cek': return renderCekForm();
      case 'senet': return renderSenetForm();
    }
  };

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      {/* ─── İşlemler Modal ─────────────────────────────────────── */}
      <Modal visible={islemMenuAcik} transparent animationType="fade" onRequestClose={() => setIslemMenuAcik(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIslemMenuAcik(false)}>
          <View style={[styles.islemMenuKutu, { backgroundColor: Colors.card }]}>
            {ISLEM_MENUSU
              .filter((m) => {
                if (m.turu === 'tahsilat' && m.yetkiKey) {
                  return yetkiBilgileri?.[m.yetkiKey as keyof typeof yetkiBilgileri] !== false;
                }
                return true;
              })
              .map((m, i) => {
                const aktif = m.turu === 'tahsilat' && m.tip === aktifTip;
                return (
                  <TouchableOpacity
                    key={`${m.baslik}-${i}`}
                    style={[styles.islemMenuItem, { borderBottomColor: Colors.border }, aktif && [styles.islemMenuItemAktif, { backgroundColor: Colors.primary + '15' }]]}
                    onPress={() => islemMenuSec(m)}
                  >
                    <Ionicons name={m.icon} size={22} color={aktif ? Colors.primary : Colors.text} />
                    <Text style={[styles.islemMenuItemText, { color: Colors.text }, aktif && { color: Colors.primary, fontWeight: '700' }]}>
                      {m.baslik}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            <TouchableOpacity style={[styles.islemMenuVazgec, { backgroundColor: Colors.background }]} onPress={() => setIslemMenuAcik(false)}>
              <Text style={[styles.islemMenuVazgecText, { color: Colors.primary }]}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── İşlem Tipi Picker Modal ──────────────────────────── */}
      <Modal visible={islemPickerAcik} transparent animationType="fade" onRequestClose={() => setIslemPickerAcik(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIslemPickerAcik(false)}>
          <View style={[styles.pickerKutu, { backgroundColor: Colors.card }]}>
            <Text style={[styles.pickerBaslik, { color: Colors.text, borderBottomColor: Colors.border }]}>İşlem Tipi Seçin</Text>
            <FlatList
              data={islemListesi}
              keyExtractor={(item) => item.islemTipiKodu}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: Colors.border }, secilenIslem?.islemTipiKodu === item.islemTipiKodu && [styles.pickerItemSecili, { backgroundColor: Colors.primary + '15' }]]}
                  onPress={() => { setSecilenIslem(item); setIslemPickerAcik(false); }}
                >
                  <Text style={[styles.pickerItemText, { color: Colors.text }, secilenIslem?.islemTipiKodu === item.islemTipiKodu && { color: Colors.primary, fontWeight: '600' }]}>
                    {item.islemTipiKodu} - {item.islemTipiAdi}
                  </Text>
                  {secilenIslem?.islemTipiKodu === item.islemTipiKodu && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Kasa Picker Modal ────────────────────────────────── */}
      <Modal visible={kasaPickerAcik} transparent animationType="fade" onRequestClose={() => setKasaPickerAcik(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setKasaPickerAcik(false)}>
          <View style={[styles.pickerKutu, { backgroundColor: Colors.card }]}>
            <Text style={[styles.pickerBaslik, { color: Colors.text, borderBottomColor: Colors.border }]}>Kasa Seçin</Text>
            <FlatList
              data={kasaListesi}
              keyExtractor={(item) => item.kasaKodu}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: Colors.border }, secilenKasa?.kasaKodu === item.kasaKodu && [styles.pickerItemSecili, { backgroundColor: Colors.primary + '15' }]]}
                  onPress={() => { setSecilenKasa(item); setKasaPickerAcik(false); }}
                >
                  <Text style={[styles.pickerItemText, { color: Colors.text }, secilenKasa?.kasaKodu === item.kasaKodu && { color: Colors.primary, fontWeight: '600' }]}>
                    {item.kasaKodu} - {item.kasaAdi}
                  </Text>
                  {secilenKasa?.kasaKodu === item.kasaKodu && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Cari seçim butonu ────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.cariBtn, { backgroundColor: Colors.card, borderBottomColor: Colors.border }, !!aktifTip && { opacity: 0.45 }]}
        onPress={() => navigation.navigate('CariSecim', { returnScreen: 'Tahsilatlar' })}
        disabled={!!aktifTip}
      >
        <Ionicons name="person-outline" size={18} color={secilenCari ? Colors.primary : Colors.textSecondary} />
        <Text style={[styles.cariText, { color: Colors.textSecondary }]} numberOfLines={1}>
          {secilenCari ? 'Cari seçildi — değiştirmek için tıklayın' : 'Lütfen cari seçiniz...'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* ─── Cari bilgi kartı ─────────────────────────────────── */}
      {secilenCari && (
        <View style={[styles.cariBilgiKart, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
          <TouchableOpacity
            style={styles.cariBilgiToggle}
            onPress={() => setBilgiKartAcik((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={styles.cariBilgiToggleIcerik}>
              <View style={styles.cariBilgiSatir}>
                <Text style={[styles.cariBilgiEtiket, { color: Colors.textSecondary }]}>Cari Kod</Text>
                <Text style={[styles.cariBilgiDeger, { color: Colors.primary }]}>{secilenCari.cariKodu}</Text>
              </View>
              <View style={styles.cariBilgiSatir}>
                <Text style={[styles.cariBilgiEtiket, { color: Colors.textSecondary }]}>Ünvan</Text>
                <Text style={[styles.cariBilgiDeger, { color: Colors.primary }]} numberOfLines={1}>{secilenCari.cariUnvan}</Text>
              </View>
            </View>
            <Ionicons
              name={bilgiKartAcik ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {bilgiKartAcik && (
            <View style={[styles.cariBilgiDetay, { borderTopColor: Colors.border }]}>
              {secilenCari.yetkili ? (
                <View style={styles.cariBilgiSatir}>
                  <Text style={[styles.cariBilgiEtiket, { color: Colors.textSecondary }]}>Yetkili</Text>
                  <Text style={[styles.cariBilgiDeger, { color: Colors.primary }]}>{secilenCari.yetkili}</Text>
                </View>
              ) : null}
              <View style={styles.cariBilgiSatir}>
                <Text style={[styles.cariBilgiEtiket, { color: Colors.textSecondary }]}>Bakiye</Text>
                <Text style={[styles.cariBilgiDeger, { color: (cariBakiye ?? 0) >= 0 ? Colors.error : Colors.success }]}>
                  {cariBakiye !== null ? sayiFormatla(cariBakiye) : '—'}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ─── İşlemler butonu ──────────────────────────────────── */}
      <View style={[styles.islemlerContainer, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.islemlerBtn, { backgroundColor: Colors.primary }, !secilenCari && { opacity: 0.4 }]}
          onPress={() => secilenCari && setIslemMenuAcik(true)}
          activeOpacity={secilenCari ? 0.7 : 1}
        >
          <Text style={[styles.islemlerBtnText, { color: Colors.headerText }]}>
            {aktifTip
              ? `İşlemler · ${ISLEM_MENUSU.find((m) => m.turu === 'tahsilat' && m.tip === aktifTip)?.baslik ?? ''}`
              : 'İşlemler'}
          </Text>
          <Ionicons name="chevron-down-outline" size={16} color={Colors.headerText} style={{ marginRight: 6 }} />
        </TouchableOpacity>
      </View>

      {/* ─── Bölüm başlığı & Form (sadece tip seçiliyken) ────── */}
      {aktifTip && (
        <ScrollView
          ref={scrollRef}
          style={styles.form}
          contentContainerStyle={{ paddingBottom: klavyeYuksekligi + 90 }}
          keyboardShouldPersistTaps="handled"
        >
          {renderAktifForm()}
        </ScrollView>
      )}

      {/* ─── Yüzer Menü Overlay ───────────────────────────────── */}
      {yuzerMenuAcik && (
        <Pressable style={styles.yuzerOverlay} onPress={() => toggleYuzerMenu(false)}>
          <View style={[styles.yuzerMenuKapsayici, { bottom: 90 + insets.bottom }]}>
            {[
              { label: 'Kaydet', icon: 'save-outline' as const, color: Colors.primary, onPress: () => { toggleYuzerMenu(false); kaydet(); }, disabled: kaydediliyor },
              { label: 'PDF Göster', icon: 'document-text-outline' as const, color: Colors.primary, onPress: () => { toggleYuzerMenu(false); handlePdfGoster(); }, disabled: false },
              { label: 'Temizle', icon: 'trash-outline' as const, color: Colors.error, onPress: () => { toggleYuzerMenu(false); temizle(); }, disabled: kaydediliyor },
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

      {/* ─── PDF Modal ────────────────────────────────────────── */}
      <Modal visible={pdfModalAcik} animationType="slide" onRequestClose={() => setPdfModalAcik(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.card }}>
          <View style={[styles.pdfBar, { borderBottomColor: Colors.border }]}>
            <TouchableOpacity onPress={() => setPdfModalAcik(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={[styles.pdfBarBaslik, { color: Colors.text }]}>Tahsilat PDF</Text>
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

      {/* ─── Vade Tarihi Picker ───────────────────────────────── */}
      {tarihPickerAcik && (
        <>
          <DateTimePicker
            value={vadeTarihi}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            locale="tr-TR"
            onChange={onTarihDegis}
            textColor={Colors.text}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.pickerTamamBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setTarihPickerAcik(false)}
            >
              <Text style={styles.pickerTamamText}>Tamam</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ─── FAB ──────────────────────────────────────────────── */}
      {aktifTip && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: Colors.primary, bottom: 24 + insets.bottom }]}
          onPress={() => toggleYuzerMenu(!yuzerMenuAcik)}
          activeOpacity={0.8}
        >
          <Ionicons name={yuzerMenuAcik ? 'close' : 'ellipsis-vertical'} size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  cariBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
    borderBottomWidth: 1,
  },
  cariText: { flex: 1, fontSize: 14 },
  islemlerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  islemlerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  islemlerBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  cariBilgiKart: {
    borderBottomWidth: 1,
    marginTop: 6,
  },
  cariBilgiToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  cariBilgiToggleIcerik: {
    flex: 1,
    gap: 4,
  },
  cariBilgiDetay: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cariBilgiSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  cariBilgiEtiket: {
    width: 80,
    fontSize: 13,
    fontWeight: '600',
  },
  cariBilgiDeger: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  adresContainer: {
    marginTop: 6,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  adresSatir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  adresText: {
    flex: 1,
    fontSize: 12,
  },
  bolumBaslik: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bolumBaslikText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  form: { flex: 1, padding: 12, paddingBottom: 0 },
  satirContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
    minHeight: 44,
    borderWidth: 1,
  },
  etiket: {
    width: 90,
    fontSize: 13,
    fontWeight: '600',
  },
  giris: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  tutarGiris: {
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 16,
  },
  pickerTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  pickerTriggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  butonSatir: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 24,
  },
  buton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
  },
  butonDisabled: { opacity: 0.5 },
  temizleBtn: {
    borderWidth: 1,
  },
  temizleBtnText: { fontSize: 14, fontWeight: '600' },
  kaydetBtn: {},
  kaydetBtnText: { fontSize: 14, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  islemMenuKutu: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  islemMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  islemMenuItemAktif: {},
  islemMenuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  islemMenuVazgec: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  islemMenuVazgecText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pickerKutu: {
    borderRadius: 14,
    maxHeight: 360,
    overflow: 'hidden',
  },
  pickerBaslik: {
    fontSize: 15,
    fontWeight: '700',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerItemSecili: {},
  pickerItemText: { fontSize: 14 },

  // ── FAB & Yüzer Menü ─────────────────────────────────────────────────────
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

  // ── Tarih Picker ─────────────────────────────────────────────────────────
  tarihBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  tarihBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerTamamBtn: {
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pickerTamamText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
