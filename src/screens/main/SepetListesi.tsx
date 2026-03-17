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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { evrakKaydet, generateGuid, adresBilgileriniAl } from '../../api/hizliIslemlerApi';
import { evrakiKaydet as taslakKaydet } from '../../utils/bekleyenEvraklarStorage';
import { aktifSepetTemizle } from '../../utils/aktifSepetStorage';
import type { EvrakKaydetOptions } from '../../api/hizliIslemlerApi';
import UrunMiktariBelirleModal from '../../components/UrunMiktariBelirleModal';
import DropdownSecim from '../../components/DropdownSecim';
import { Colors } from '../../constants/Colors';
import { paraFormat, paraTL, miktarFormat } from '../../utils/format';
import { EvrakTipi, AlimSatim } from '../../models';
import type { SepetKalem, SepetBaslik, StokListesiBilgileri, AdresBilgileri, KDVKisimTablosu } from '../../models';

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

function hesapla(kalemler: SepetKalem[], kdvDurum: number, genelIndirimYuzde: number) {
  let malToplam = 0;
  let kalemIndirimlerToplam = 0;
  let kdvToplam = 0;

  for (const k of kalemler) {
    const ham = k.miktar * k.birimFiyat;
    malToplam += ham;

    const netKalem =
      ham *
      (1 - k.kalemIndirim1 / 100) *
      (1 - k.kalemIndirim2 / 100) *
      (1 - k.kalemIndirim3 / 100);
    kalemIndirimlerToplam += ham - netKalem;

    const netAfterGenel = netKalem * (1 - genelIndirimYuzde / 100);
    kdvToplam += netAfterGenel * (k.kdvOrani / 100);
  }

  const genelIndirimTutar = (malToplam - kalemIndirimlerToplam) * genelIndirimYuzde / 100;
  const genelToplam =
    kdvDurum === 1
      ? malToplam - kalemIndirimlerToplam - genelIndirimTutar
      : malToplam - kalemIndirimlerToplam - genelIndirimTutar + kdvToplam;

  const toplamMiktar = kalemler.reduce((t, k) => t + k.miktar, 0);

  return { malToplam, kalemIndirimlerToplam, genelIndirimTutar, kdvToplam, genelToplam, toplamMiktar };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SepetListesi() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { yetkiBilgileri, calisilanSirket, kdvBilgileri } = useAppStore();

  const [sepet, setSepet] = useState<SepetBaslik>(route.params.sepet);
  const [kaydetYukleniyor, setKaydetYukleniyor] = useState(false);
  const [taslakYukleniyor, setTaslakYukleniyor] = useState(false);
  const [duzenleUrunu, setDuzenleUrunu] = useState<{ stok: StokListesiBilgileri; miktar: number } | null>(null);
  const evrakGuidRef = useRef(generateGuid());

  // Evrak Fiş Bilgileri state
  const [fisAcik, setFisAcik] = useState(false);
  const [genelIndirimYuzde, setGenelIndirimYuzde] = useState(0);
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
  const t = hesapla(efektifKalemler, kdvDurum, genelIndirimYuzde);

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

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const [indirimModalAcik, setIndirimModalAcik] = useState(false);
  const [indirimInput, setIndirimInput] = useState('');

  const indirimDegistir = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Genel İskonto',
        'İskonto yüzdesini giriniz',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Tamam',
            onPress: (val: string | undefined) => {
              const yuzde = parseFloat((val ?? '').replace(',', '.'));
              if (!isNaN(yuzde) && yuzde >= 0 && yuzde <= 100) {
                setGenelIndirimYuzde(yuzde);
              }
            },
          },
        ],
        'plain-text',
        String(genelIndirimYuzde),
        'decimal-pad'
      );
    } else {
      setIndirimInput(String(genelIndirimYuzde));
      setIndirimModalAcik(true);
    }
  };

  const indirimOnayla = () => {
    const yuzde = parseFloat(indirimInput.replace(',', '.'));
    if (!isNaN(yuzde) && yuzde >= 0 && yuzde <= 100) {
      setGenelIndirimYuzde(yuzde);
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
      bakiye: 0,
      kdvOrani: item.kdvOrani,
      kalemIndirim1: item.kalemIndirim1,
      kalemIndirim2: item.kalemIndirim2,
      kalemIndirim3: item.kalemIndirim3,
      carpan: 1,
      miktar: item.miktar,
    };
    setDuzenleUrunu({ stok, miktar: item.miktar });
  };

  const handleDuzenleConfirm = (kalem: SepetKalem) => {
    setSepet((prev) => {
      const guncellenmis = prev.kalemler.map((k) =>
        k.stokKodu === kalem.stokKodu ? kalem : k
      );
      route.params.onKalemlerGuncellendi?.(guncellenmis);
      return { ...prev, kalemler: guncellenmis };
    });
    setDuzenleUrunu(null);
  };

  const kalemSil = (stokKodu: string) => {
    setSepet((prev) => {
      const guncellenmis = prev.kalemler.filter((k) => k.stokKodu !== stokKodu);
      route.params.onKalemlerGuncellendi?.(guncellenmis);
      return { ...prev, kalemler: guncellenmis };
    });
  };

  const handleKaydet = async () => {
    if (sepet.kalemler.length === 0) {
      Alert.alert('Uyarı', 'Sepet boş.');
      return;
    }
    if (!sepet.cariKodu.trim()) {
      Alert.alert('Uyarı', 'Lütfen cari seçiniz.');
      return;
    }
    setKaydetYukleniyor(true);
    try {
      const opts: EvrakKaydetOptions = {
        saticiKodu: yetkiBilgileri?.kullaniciKodu ?? '',
        kdvDurum: yetkiBilgileri?.kdvDurum ?? 0,
        anaDepo: sepet.anaDepo ?? yetkiBilgileri?.anaDepo ?? '',
        karsiDepo: sepet.karsiDepo ?? yetkiBilgileri?.karsiDepo ?? '',
        guidId: evrakGuidRef.current,
      };
      const sonuc = await evrakKaydet(sepet, calisilanSirket, opts);
      if (sonuc.sonuc) {
        route.params.onKalemlerGuncellendi?.([]);
        aktifSepetTemizle();
        Alert.alert('Başarılı', sonuc.mesaj || 'Evrak kaydedildi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Hata', sonuc.mesaj || 'Evrak kaydedilemedi.');
      }
    } catch (e: any) {
      const mesaj =
        e?.response?.data?.mesaj ||
        e?.response?.data ||
        e?.message ||
        String(e);
      Alert.alert('Hata', `Evrak kaydedilirken bir hata oluştu:\n\n${mesaj}`);
    } finally {
      setKaydetYukleniyor(false);
    }
  };

  const handleTemizle = () => {
    if (sepet.kalemler.length === 0) return;
    Alert.alert('Sepeti Temizle', 'Tüm kalemler silinecek. Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Temizle',
        style: 'destructive',
        onPress: () => {
          setSepet((prev) => {
            route.params.onKalemlerGuncellendi?.([]);
            return { ...prev, kalemler: [] };
          });
        },
      },
    ]);
  };

  const handleTaslakKaydet = async () => {
    if (sepet.kalemler.length === 0) {
      Alert.alert('Uyarı', 'Sepet boş.');
      return;
    }
    if (!sepet.cariKodu) {
      Alert.alert('Uyarı', 'Taslak kaydedebilmek için lütfen cari seçiniz.');
      return;
    }
    setTaslakYukleniyor(true);
    try {
      await taslakKaydet(sepet, t.genelToplam);
      Alert.alert('Başarılı', 'Evrak taslak olarak kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Hata', 'Taslak kaydedilemedi.');
    } finally {
      setTaslakYukleniyor(false);
    }
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const evrakAdi = evrakTipiAdi(sepet.evrakTipi, sepet.alimSatim);

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

          {/* KDV Oranı Dropdown + Dahil/Hariç Toggle */}
          <View style={[styles.fisRowCol, { zIndex: 30 }]}>
            <Text style={styles.fisLabel}>KDV Oranı</Text>
            <View style={styles.kdvDropdownRow}>
              <View style={styles.kdvDropdown}>
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
                style={[styles.kdvToggle, kdvDurum === 1 && styles.kdvToggleDahil]}
                onPress={() => setKdvDurum((prev) => (prev === 1 ? 0 : 1))}
                activeOpacity={0.7}
              >
                <Text style={[styles.kdvToggleText, kdvDurum === 1 && styles.kdvToggleTextDahil]}>
                  {kdvDurum === 1 ? 'Dahil' : 'Hariç'}
                </Text>
              </TouchableOpacity>
            </View>
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
            <Text style={styles.fisValueAccent}>% {paraFormat(genelIndirimYuzde)}</Text>
            <Text style={styles.fisValueAccent}>{paraFormat(t.genelIndirimTutar)}</Text>
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
          <View style={styles.fisRow}>
            <Text style={styles.fisLabel}>Döviz Kodu</Text>
            <Text style={styles.fisValueAccent}>Seçiniz...</Text>
            <Text style={styles.fisLabelSmall}>Döviz Türü</Text>
          </View>
          <View style={styles.fisRow}>
            <Text style={styles.fisLabel}>Döviz Kuru</Text>
            <Text style={styles.fisValue}>0,00000</Text>
            <Text style={styles.fisLabelSmall}>Döviz Toplam</Text>
            <Text style={styles.fisValue}>0,00</Text>
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
        <Text style={styles.headerEvrakAlt}> · {sepet.fisTipiBaslikNo > 0 ? evrakAdi : evrakAdi}</Text>
      </View>
      <View style={styles.headerRow}>
        <Ionicons name="person-outline" size={18} color={Colors.gray} />
        <Text style={styles.headerCari} numberOfLines={1}>
          {sepet.cariUnvan || 'Cari seçilmedi'}
        </Text>
      </View>
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

  const renderKalem = ({ item }: { item: SepetKalem }) => {
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

    return (
      <View style={styles.kartContainer}>
        {/* Üst satır: stok kodu + düzenle/sil butonları */}
        <View style={styles.kartUstSatir}>
          <Text style={styles.kartStokKodu}>{item.stokKodu}</Text>
          <View style={styles.kartAksiyonlar}>
            <TouchableOpacity
              style={styles.kartAksiyonBtn}
              onPress={() => kalemDuzenle(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.kartAksiyonBtn}
              onPress={() => {
                Alert.alert('Sil', `${item.stokKodu} silinsin mi?`, [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Sil', style: 'destructive', onPress: () => kalemSil(item.stokKodu) },
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

        {/* Miktar x Fiyat */}
        <Text style={styles.kartMiktarFiyat}>
          {miktarFormat(item.miktar)}  × {paraFormat(item.birimFiyat)} ₺
        </Text>

        {/* KDV bilgisi + Toplam fiyat */}
        <View style={styles.kartAltSatir}>
          <Text style={styles.kartKdvBilgi}>
            KDV Hariç: {paraFormat(netAfterGenel)} ₺   KDV %{efektifKdv}: {paraFormat(kdvTutari)} ₺
          </Text>
          <Text style={styles.kartToplam}>{paraFormat(toplam)} ₺</Text>
        </View>
      </View>
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
          <View style={styles.bosEkran}>
            <Ionicons name="cart-outline" size={48} color={Colors.border} />
            <Text style={styles.bosMetin}>Sepet boş</Text>
          </View>
        }
      />

      {/* Düzenle modal */}
      <UrunMiktariBelirleModal
        urun={duzenleUrunu?.stok ?? null}
        kdvDurum={kdvDurum}
        fiyatDegistirmeYetkisi={yetkiBilgileri?.fiyatDegistirmeYetkisi ?? false}
        kalemIndirimYetkisi={yetkiBilgileri?.kalemIndirimYapmaYetkisi ?? false}
        mode="duzenle"
        initialMiktar={duzenleUrunu?.miktar}
        onConfirm={handleDuzenleConfirm}
        onClose={() => setDuzenleUrunu(null)}
      />

      {/* Android indirim modal */}
      <Modal visible={indirimModalAcik} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Genel İskonto</Text>
            <Text style={styles.modalAlt}>İskonto yüzdesini giriniz</Text>
            <TextInput
              style={styles.modalInput}
              value={indirimInput}
              onChangeText={setIndirimInput}
              keyboardType="decimal-pad"
              autoFocus
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

      {/* Alt butonlar */}
      <View style={styles.altButonlar}>
        <TouchableOpacity
          style={[styles.temizleBtn, sepet.kalemler.length === 0 && styles.btnPasif]}
          onPress={handleTemizle}
          disabled={sepet.kalemler.length === 0}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.taslakBtn, (taslakYukleniyor || sepet.kalemler.length === 0) && styles.btnPasif]}
          onPress={handleTaslakKaydet}
          disabled={taslakYukleniyor || sepet.kalemler.length === 0}
        >
          <Ionicons name="bookmark-outline" size={18} color={Colors.primary} />
          <Text style={styles.taslakBtnText}>
            {taslakYukleniyor ? 'KAYDEDİLİYOR...' : 'TASLAK'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kaydetBtn, (kaydetYukleniyor || sepet.kalemler.length === 0) && styles.btnPasif]}
          onPress={handleKaydet}
          disabled={kaydetYukleniyor || sepet.kalemler.length === 0}
        >
          <Ionicons name="save-outline" size={18} color={Colors.white} />
          <Text style={styles.kaydetBtnText}>
            {kaydetYukleniyor ? 'KAYDEDİLİYOR...' : 'KAYDET'}
          </Text>
        </TouchableOpacity>
      </View>
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
  headerEvrakAlt: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  headerCari: {
    flex: 1,
    fontSize: 14,
    color: Colors.darkGray,
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
  kdvDropdownRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kdvDropdown: {
    flex: 1,
  },
  kdvToggle: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginLeft: 8,
  },
  kdvToggleDahil: {
    backgroundColor: Colors.primary,
  },
  kdvToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  kdvToggleTextDahil: {
    color: Colors.white,
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

  // ── Alt Butonlar ───────────────────────────────────────────────────────────
  altButonlar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: Colors.lightGray,
  },
  temizleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  taslakBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  taslakBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  kaydetBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 6,
  },
  btnPasif: { opacity: 0.5 },
  kaydetBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700', letterSpacing: 1 },

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
});
