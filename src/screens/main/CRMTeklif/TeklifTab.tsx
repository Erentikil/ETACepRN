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
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppStore } from '../../../store/appStore';
import { tekStokFiyatBilgisiniAl, barkoddanStokKodunuBul } from '../../../api/hizliIslemlerApi';
import { stokListesiniGetir } from '../../../utils/stokListesiYukleyici';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import UrunMiktariBelirleModal from '../../../components/UrunMiktariBelirleModal';
import AciklamaModuModal from '../../../components/AciklamaModuModal';
import BarcodeScannerModal from '../../../components/BarcodeScannerModal';
import { useTarayiciAyarlari } from '../../../hooks/useTarayiciAyarlari';
import StokInfoModal from '../../../components/StokInfoModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../../../contexts/ThemeContext';
import { Config } from '../../../constants/Config';
import { paraTL, miktarFormat } from '../../../utils/format';
import { EvrakTipi, AlimSatim, type StokFiyatBilgileri, type CariFiyatBilgileri } from '../../../models';
import type {
  StokListesiBilgileri,
  CariKartBilgileri,
  CariEvrak,
  SepetKalem,
  SepetBaslik,
} from '../../../models';
import EmptyState from '../../../components/EmptyState';
import SkeletonLoader from '../../../components/SkeletonLoader';
import AnimatedListItem from '../../../components/AnimatedListItem';
import { hafifTitresim } from '../../../utils/haptics';
import { toast } from '../../../components/Toast';

type NavProp = StackNavigationProp<RootStackParamList>;


const ARAMA_TIPLERI = [
  { label: 'Başlayan', value: 1 },
  { label: 'Biten', value: 2 },
  { label: 'İçeren', value: 3 },
  { label: 'Barkod', value: 4 },
];

function sepetToplamHesapla(kalemler: SepetKalem[], kdvDurum: number, genelIndirimYuzde = 0): number {
  const kalemToplam = kalemler.reduce((toplam, k) => {
    const kdvHaric =
      k.miktar * k.birimFiyat *
      (1 - k.kalemIndirim1 / 100) *
      (1 - k.kalemIndirim2 / 100) *
      (1 - k.kalemIndirim3 / 100);
    const kdv = kdvHaric * (Math.max(0, k.kdvOrani) / 100);
    return toplam + (kdvDurum === 1 ? kdvHaric : kdvHaric + kdv);
  }, 0);
  return genelIndirimYuzde > 0 ? kalemToplam * (1 - genelIndirimYuzde / 100) : kalemToplam;
}

const ListeAyiraci = () => <View style={{ height: 4 }} />;

interface Props {
  secilenCari: CariKartBilgileri | null;
  setSecilenCari: (c: CariKartBilgileri | null) => void;
  potansiyelCari: CariEvrak | null;
  setPotansiyelCari: (c: CariEvrak | null) => void;
  sepetKalemleri: SepetKalem[];
  setSepetKalemleri: React.Dispatch<React.SetStateAction<SepetKalem[]>>;
  revizyonFisId: number | null;
  setRevizyonFisId: (id: number | null) => void;
  revizyonMusteriId: number;
  setRevizyonMusteriId: (id: number) => void;
}

export default function TeklifTab({
  secilenCari,
  setSecilenCari,
  potansiyelCari,
  setPotansiyelCari,
  sepetKalemleri,
  setSepetKalemleri,
  revizyonFisId,
  setRevizyonFisId,
  revizyonMusteriId,
  setRevizyonMusteriId,
}: Props) {
  const Colors = useColors();
  const navigation = useNavigation<NavProp>();
  const { yetkiBilgileri, ftBaslikListesi, fiyatTipListesi, calisilanSirket, stokListesiCache, stokListesiCacheSirket, setStokListesiCache } = useAppStore();

  const [stokListesi, setStokListesi] = useState<StokListesiBilgileri[]>(
    stokListesiCacheSirket === calisilanSirket ? stokListesiCache : []
  );
  const [filtreli, setFiltreli] = useState<StokListesiBilgileri[]>(
    stokListesiCacheSirket === calisilanSirket ? stokListesiCache : []
  );
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaTipi, setAramaTipi] = useState(3);
  const [aramaTipiAcik, setAramaTipiAcik] = useState(false);
  const aramaInputRef = useRef<TextInput>(null);
  const [modalUrunu, setModalUrunu] = useState<StokListesiBilgileri | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [scannerAcik, setScannerAcik] = useState(false);
  const [miktarliGiris, setMiktarliGiris] = useState(false);
  const [cariFiyatListesi, setCariFiyatListesi] = useState<CariFiyatBilgileri[]>([]);
  const [infoStoku, setInfoStoku] = useState<StokListesiBilgileri | null>(null);
  const [secilenAnaDepo, setSecilenAnaDepo] = useState(yetkiBilgileri?.anaDepo ?? '');
  const [secilenKarsiDepo, setSecilenKarsiDepo] = useState(yetkiBilgileri?.karsiDepo ?? '');
  const [aciklamaModalAcik, setAciklamaModalAcik] = useState(false);

  // Stok sayisi durumu: 'yukleniyor' | 'tamamlandi' | 'hata'
  const [stokSayisi, setStokSayisi] = useState<number | null>(null);
  const [stokYuklemeDurumu, setStokYuklemeDurumu] = useState<'yukleniyor' | 'tamamlandi' | 'hata'>('yukleniyor');

  // Badge bounce
  const badgeScale = useSharedValue(1);
  const badgeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));
  const prevSepetLen = useRef(0);
  useEffect(() => {
    if (sepetKalemleri.length > prevSepetLen.current) {
      badgeScale.value = withSequence(withTiming(1.35, { duration: 150 }), withTiming(1, { duration: 150 }));
    }
    prevSepetLen.current = sepetKalemleri.length;
  }, [sepetKalemleri.length]);

  // Ayarlardan varsayilan
  useEffect(() => {
    AsyncStorage.getItem(Config.STORAGE_KEYS.MIKTARLI_GIRIS_VARSAYILAN).then((v) => {
      if (v === 'true') setMiktarliGiris(true);
    });
    AsyncStorage.getItem(Config.STORAGE_KEYS.VARSAYILAN_ARAMA_TIPI).then((v) => {
      if (v !== null) setAramaTipi(parseInt(v, 10));
    });
  }, []);

  const { manuelOkuma, baslangicZoom } = useTarayiciAyarlari();

  // Cari degisince cariFiyatListesini sifirla
  useEffect(() => { setCariFiyatListesi([]); }, [secilenCari]);

  // Stok listesini paylaşılan yükleyici ile yükle
  useEffect(() => {
    if (!calisilanSirket) return;
    setYukleniyor(true);
    setStokYuklemeDurumu('yukleniyor');

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
      .catch(() => {
        toast.error('Stok listesi yüklenirken bir hata oluştu.');
        setStokYuklemeDurumu('hata');
      })
      .finally(() => setYukleniyor(false));
  }, [calisilanSirket]);

  // Arama filtresi
  useEffect(() => {
    if (aramaTipi === 4) return;
    if (!aramaMetni.trim()) { setFiltreli(stokListesi); return; }
    const q = aramaMetni.toLowerCase();
    const filtre = (val: string) => {
      const v = val.toLowerCase();
      if (aramaTipi === 1) return v.startsWith(q);
      if (aramaTipi === 2) return v.endsWith(q);
      return v.includes(q);
    };
    setFiltreli(stokListesi.filter((s) => filtre(s.stokKodu) || filtre(s.stokCinsi)));
  }, [aramaMetni, stokListesi, aramaTipi]);

  // Barkod aramasi
  const barkodAramaYap = useCallback(async (veriOverride?: string) => {
    const veri = (veriOverride ?? aramaMetni).trim();
    if (!veri || !calisilanSirket) { setFiltreli(stokListesi); return; }
    setYukleniyor(true);
    try {
      const sonuc = await barkoddanStokKodunuBul(veri, calisilanSirket);
      let modalAcilacak = false;
      if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
        setFiltreli(sonuc.data);
        if (sonuc.data.length === 1) {
          const stok = sonuc.data[0];
          if (miktarliGiris) { setModalUrunu(stok); modalAcilacak = true; }
          else if (!secilenCari) toast.warning('Sepete ürün eklemeden önce lütfen cari seçiniz.');
          else hizliEkle(stok);
        }
      } else {
        toast.warning(`"${veri}" barkodlu ürün bulunamadı.`);
        setFiltreli([]);
      }
      setAramaMetni('');
      if (!modalAcilacak) setTimeout(() => aramaInputRef.current?.focus(), 100);
    } catch (e: any) {
      toast.error(`Barkod araması sırasında bir hata oluştu.\n${e?.message ?? e}`);
      setFiltreli([]);
    } finally {
      setYukleniyor(false);
    }
  }, [aramaMetni, calisilanSirket, stokListesi, miktarliGiris, secilenCari]);

  const aramaTipiLabel = ARAMA_TIPLERI.find((t) => t.value === aramaTipi)?.label ?? 'İçeren';

  // Etkin fiyat no
  const etkinFiyatNo = (() => {
    let fNo = yetkiBilgileri?.fiyatNo || 0;
    if (yetkiBilgileri?.saticiBazliCariKart && secilenCari) {
      const cariFNo = secilenCari.satisFiyatNo;
      if (cariFNo) fNo = cariFNo;
    }
    return fNo;
  })();

  // Hizli ekle
  const hizliEkle = async (item: StokListesiBilgileri) => {
    if (!secilenCari) {
      toast.warning('Sepete ürün eklemeden önce lütfen cari seçiniz.');
      return;
    }
    const birimler = item.birim2 ? item.birim2.split(';').map((b) => b.trim()).filter(Boolean) : [];
    const carpanlar = item.carpan2 ? item.carpan2.split(';').map((c) => parseFloat(c.trim()) || 1) : [];
    const ilkBirim = birimler[0] || item.birim;
    const ilkCarpan = carpanlar[0] || item.carpan || 1;

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
          if (bulunan) { fiyat = bulunan.tutar; ind1 = bulunan.kalemIndirim1; ind2 = bulunan.kalemIndirim2; ind3 = bulunan.kalemIndirim3; fiyatNo = etkinFiyatNo; }
        }
      } catch { /* varsayilan fiyatla devam */ }
    }

    const cariFiyat = cariFiyatListesi.find((cf) => cf.stokKodu === item.stokKodu);
    if (cariFiyat) {
      ind1 = cariFiyat.kalemIndirim1; ind2 = cariFiyat.kalemIndirim2; ind3 = cariFiyat.kalemIndirim3;
      if (cariFiyat.fiyatNo && cariFiyat.fiyatNo.trim() !== '') {
        const cfNo = parseInt(cariFiyat.fiyatNo.trim(), 10);
        if (cfNo > 0) {
          fiyatNo = cfNo;
          try {
            const sonuc = await tekStokFiyatBilgisiniAl(item.stokKodu, calisilanSirket);
            if (sonuc.sonuc && sonuc.data) {
              const bulunan = sonuc.data.find((sf: StokFiyatBilgileri) => sf.fiyatNo === cfNo);
              if (bulunan) { fiyat = bulunan.tutar; ind1 = bulunan.kalemIndirim1 || ind1; ind2 = bulunan.kalemIndirim2 || ind2; ind3 = bulunan.kalemIndirim3 || ind3; }
            }
          } catch { /* mevcut fiyatla devam */ }
        }
      } else if (cariFiyat.tutar > 0) {
        fiyat = cariFiyat.tutar; fiyatNo = 0;
      }
    }

    const kalem: SepetKalem = {
      stokKodu: item.stokKodu, stokCinsi: item.stokCinsi, barkod: item.barkod,
      birim: ilkBirim, miktar: 1, birimFiyat: fiyat * ilkCarpan, kdvOrani: item.kdvOrani,
      kalemIndirim1: ind1, kalemIndirim2: ind2, kalemIndirim3: ind3,
      birim2: item.birim2, carpan: item.carpan, carpan2: item.carpan2, seciliFiyatNo: fiyatNo,
    };
    kalemEkle(kalem);
  };

  // Sepete ekleme
  const kalemEkle = (kalem: SepetKalem) => {
    if (!secilenCari) {
      toast.warning('Sepete ürün eklemeden önce lütfen cari seçiniz.');
      return;
    }
    hafifTitresim();
    setSepetKalemleri((prev) => {
      const idx = prev.findIndex((k) => k.stokKodu === kalem.stokKodu);
      if (idx >= 0) {
        const guncellenmis = [...prev];
        guncellenmis[idx] = { ...guncellenmis[idx], miktar: guncellenmis[idx].miktar + kalem.miktar };
        return guncellenmis;
      }
      return [...prev, kalem];
    });
    setModalUrunu(null);
    setTimeout(() => aramaInputRef.current?.focus(), 100);
  };

  const sepetToplam = sepetToplamHesapla(sepetKalemleri, yetkiBilgileri?.kdvDurum ?? 0, secilenCari?.indirimYuzde ?? 0);

  const sepeteGit = () => {
    const sepet: SepetBaslik = {
      cariKodu: secilenCari?.cariKodu ?? '',
      cariUnvan: secilenCari?.cariUnvan ?? '',
      evrakTipi: EvrakTipi.Fatura,
      alimSatim: AlimSatim.Satim,
      fisTipiBaslikNo: 0,
      fisTipiAdi: 'CRM Teklif',
      anaDepo: secilenAnaDepo,
      karsiDepo: secilenKarsiDepo,
      kalemler: sepetKalemleri,
    };
    navigation.navigate('SepetListesi', {
      sepet,
      genelIndirimYuzde: secilenCari?.indirimYuzde ?? 0,
      crmModu: true,
      crmMusteriId: revizyonMusteriId,
      crmTeklifFisId: revizyonFisId ?? undefined,
      onKalemlerGuncellendi: (kalemler) => {
        if (kalemler.length === 0) {
          setSecilenCari(null);
          setPotansiyelCari(null);
        }
        setSepetKalemleri(kalemler);
      },
    });
  };

  // Revizyon cari degisikligi bayragi
  const revizyonCariDegisti = useRef(false);

  // Cari secim ekranindan donus
  useFocusEffect(
    useCallback(() => {
      const pending = useAppStore.getState().pendingCari;
      if (pending && pending.target === 'ZiyaretIslemleri') {
        // Revizyondan cikildi — artik yeni teklif gibi davran
        if (revizyonCariDegisti.current) {
          revizyonCariDegisti.current = false;
          setRevizyonFisId(null);
          setRevizyonMusteriId(0);
        }
        setSecilenCari(pending.cari);
        setPotansiyelCari(null);
        useAppStore.getState().clearPendingCari();
      }
    }, [])
  );

  const sepetKalemlerRef = useRef(sepetKalemleri);
  useEffect(() => { sepetKalemlerRef.current = sepetKalemleri; }, [sepetKalemleri]);

  const renderStokSatiri = ({ item, index }: { item: StokListesiBilgileri; index: number }) => {
    const icerik = (
      <ReanimatedSwipeable
        renderRightActions={() => (
          <TouchableOpacity style={[styles.infoBtn, { backgroundColor: Colors.primary }]} onPress={() => setInfoStoku(item)}>
            <Ionicons name="information-circle-outline" size={24} color="#fff" />
            <Text style={styles.infoBtnText}>Bilgi</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity style={[styles.stokSatiri, { backgroundColor: Colors.card }]} onPress={() => hizliEkle(item)} onLongPress={() => setModalUrunu(item)} delayLongPress={400}>
          <View style={styles.stokBilgi}>
            <Text style={[styles.stokKodu, { color: Colors.textSecondary }]}>{item.stokKodu}</Text>
            <Text style={[styles.stokCinsi, { color: Colors.text }]} numberOfLines={1}>{item.stokCinsi}</Text>
            {item.barkod ? <Text style={[styles.stokBarkod, { color: Colors.textSecondary }]}>{item.barkod}</Text> : null}
          </View>
          <View style={styles.stokSag}>
            <Text style={[styles.stokFiyat, { color: Colors.primary }]}>{paraTL(item.fiyat)}</Text>
            <Text style={[styles.stokBakiye, { color: Colors.textSecondary }]}>{miktarFormat(item.bakiye)} {item.birim2?.split(';')[0]?.trim() || item.birim}</Text>
          </View>
        </TouchableOpacity>
      </ReanimatedSwipeable>
    );
    if (index < 20) return <AnimatedListItem index={index}>{icerik}</AnimatedListItem>;
    return icerik;
  };

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]} onTouchStart={Keyboard.dismiss}>
      {/* Üst bar */}
      <View style={[styles.ustBar, { backgroundColor: Colors.primary }]}>
        <View style={styles.teklifBaslik}>
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={styles.evrakTipiText}>Teklif</Text>
        </View>
        <TouchableOpacity style={[styles.miktarBtn, miktarliGiris && { backgroundColor: Colors.accent }]} onPress={() => setMiktarliGiris(!miktarliGiris)}>
          <Ionicons name={miktarliGiris ? 'checkbox' : 'square-outline'} size={16} color="#fff" />
          <Text style={styles.miktarBtnText}>Miktarlı</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.barkodBtn} onPress={() => setScannerAcik(true)}>
          <Ionicons name="barcode-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Cari seçim */}
      <TouchableOpacity
        style={[styles.cariBtn, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}
        onPress={() => {
          if (revizyonFisId) {
            Alert.alert(
              'Revizyondan Çık',
              'Cariyi değiştirirseniz bu revizyon bağlantısı kesilir ve yeni bir teklif olarak kaydedilir. Emin misiniz?',
              [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: 'Evet, Devam Et',
                  style: 'destructive',
                  onPress: () => {
                    revizyonCariDegisti.current = true;
                    navigation.navigate('CRMCariSecim', { returnScreen: 'ZiyaretIslemleri', sepetDolu: sepetKalemlerRef.current.length > 0 });
                  },
                },
              ]
            );
          } else {
            navigation.navigate('CRMCariSecim', { returnScreen: 'ZiyaretIslemleri', sepetDolu: sepetKalemlerRef.current.length > 0 });
          }
        }}
      >
        <Ionicons name="person-outline" size={18} color={secilenCari ? Colors.primary : Colors.textSecondary} />
        <Text style={[styles.cariText, { color: Colors.textSecondary }, secilenCari && { color: Colors.text, fontWeight: '600' }]}>
          {secilenCari ? secilenCari.cariUnvan : 'Lütfen cari seçiniz...'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* Arama satiri */}
      <View style={[styles.aramaRow, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
        <TouchableOpacity style={[styles.aramaTipiBtn, { backgroundColor: `${Colors.primary}15` }]} onPress={() => setAramaTipiAcik(!aramaTipiAcik)}>
          <Text style={[styles.aramaTipiBtnText, { color: Colors.primary }]}>{aramaTipiLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={Colors.primary} />
        </TouchableOpacity>
        <TextInput
          ref={aramaInputRef}
          style={[styles.aramaInput, { color: Colors.text }]}
          placeholder={aramaTipi === 4 ? 'Barkod giriniz...' : 'Stok kodu veya ürün adı ara...'}
          placeholderTextColor={Colors.textSecondary}
          value={aramaMetni}
          onChangeText={setAramaMetni}
          returnKeyType="search"
          onSubmitEditing={() => aramaTipi === 4 ? barkodAramaYap() : undefined}
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => { setAramaMetni(''); setFiltreli(stokListesi); }}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
        {aramaTipi === 4 && (
          <TouchableOpacity style={[styles.araBtn, { backgroundColor: Colors.primary }]} onPress={() => barkodAramaYap()}>
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {aramaTipiAcik && (
        <View style={[styles.aramaTipiDropdown, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
          {ARAMA_TIPLERI.map((tip) => (
            <TouchableOpacity
              key={tip.value}
              style={[styles.aramaTipiItem, { borderBottomColor: Colors.border }, tip.value === aramaTipi && { backgroundColor: `${Colors.primary}10` }]}
              onPress={() => { setAramaTipi(tip.value); setAramaTipiAcik(false); if (tip.value !== 4) setFiltreli(stokListesi); }}
            >
              <Text style={[styles.aramaTipiItemText, { color: Colors.text }, tip.value === aramaTipi && { fontWeight: '700', color: Colors.primary }]}>{tip.label}</Text>
              {tip.value === aramaTipi && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Stok listesi baslik */}
      <View style={[styles.listeBaslik, { backgroundColor: Colors.primary }]}>
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
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={ListeAyiraci}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={() => {
          if (!calisilanSirket) return;
          setYukleniyor(true);
          setStokYuklemeDurumu('yukleniyor');
          setStokListesiCache([], '');
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
            .catch(() => {
              toast.error('Stok listesi yüklenirken bir hata oluştu.');
              setStokYuklemeDurumu('hata');
            })
            .finally(() => setYukleniyor(false));
        }} colors={[Colors.primary]} />}
        ListEmptyComponent={
          yukleniyor
            ? <SkeletonLoader satirSayisi={6} />
            : <EmptyState icon="cube-outline" baslik="Stok bulunamadı" aciklama="Ürün listesi yüklenemedi veya boş" />
        }
      />

      {(filtreli.length > 0 || stokSayisi != null) && (
        <Text style={[
          styles.toplamStokText,
          { backgroundColor: Colors.card, borderTopColor: Colors.border },
          { color: stokYuklemeDurumu === 'yukleniyor' ? '#F5A623' : stokYuklemeDurumu === 'tamamlandi' ? '#4CAF50' : '#f44336' },
        ]}>
          {stokYuklemeDurumu === 'yukleniyor'
            ? `${filtreli.length}${stokSayisi != null ? ` / ${stokSayisi}` : ''} stok (yükleniyor...)`
            : `${filtreli.length} / ${stokSayisi ?? filtreli.length} stok`}
        </Text>
      )}

      {/* Yüzer açıklama butonu */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: Colors.accent }]} onPress={() => setAciklamaModalAcik(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Sepet + Barkod alt bar */}
      <View style={styles.altBar}>
        <TouchableOpacity
          style={[styles.sepetBtn, { backgroundColor: Colors.primary }, sepetKalemleri.length === 0 && styles.sepetBtnPasif]}
          onPress={sepeteGit}
          disabled={sepetKalemleri.length === 0}
        >
          <Ionicons name="cart-outline" size={22} color="#fff" />
          <Text style={styles.sepetBtnText}>SEPET ({paraTL(sepetToplam)})</Text>
          {sepetKalemleri.length > 0 && (
            <Animated.View style={[styles.sepetBadge, { backgroundColor: Colors.accent ?? '#ffa500' }, badgeAnimStyle]}>
              <Text style={styles.sepetBadgeText}>{sepetKalemleri.length}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.altBarkodBtn, { backgroundColor: Colors.primary }]} onPress={() => setScannerAcik(true)}>
          <Ionicons name="barcode-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modaller */}
      <BarcodeScannerModal
        visible={scannerAcik}
        onClose={() => setScannerAcik(false)}
        manuelOkuma={manuelOkuma}
        baslangicZoom={baslangicZoom}
        onDetected={(barkod) => {
          setScannerAcik(false);
          hafifTitresim();
          const bulunan = stokListesi.find((s) => s.barkod === barkod);
          if (bulunan) {
            if (miktarliGiris) setModalUrunu(bulunan);
            else if (!secilenCari) toast.warning('Sepete ürün eklemeden önce lütfen cari seçiniz.');
            else hizliEkle(bulunan);
          } else {
            barkoddanStokKodunuBul(barkod, calisilanSirket).then((sonuc) => {
              if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
                const stok = sonuc.data[0];
                if (miktarliGiris) setModalUrunu(stok);
                else if (!secilenCari) toast.warning('Sepete ürün eklemeden önce lütfen cari seçiniz.');
                else hizliEkle(stok);
              } else {
                toast.warning(`"${barkod}" barkodlu ürün bulunamadı.`);
              }
            }).catch(() => toast.error('Barkod araması sırasında bir hata oluştu.'));
          }
        }}
      />

      <StokInfoModal
        stokKodu={infoStoku?.stokKodu ?? null}
        stokCinsi={infoStoku?.stokCinsi ?? ''}
        veriTabaniAdi={calisilanSirket}
        cariKodu={secilenCari?.cariKodu}
        onClose={() => setInfoStoku(null)}
      />

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
        onClose={() => { setModalUrunu(null); setTimeout(() => aramaInputRef.current?.focus(), 100); }}
      />

      <AciklamaModuModal
        visible={aciklamaModalAcik}
        kdvDurum={yetkiBilgileri?.kdvDurum ?? 0}
        onConfirm={(kalem) => { kalemEkle(kalem); setAciklamaModalAcik(false); }}
        onClose={() => setAciklamaModalAcik(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  ustBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  evrakTipiBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  evrakTipiIcerik: { flex: 1 },
  evrakTipiText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  fisTipiText: { color: '#FFD54F', fontSize: 11, marginTop: 1 },
  miktarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 },
  miktarBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  barkodBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 },
  cariBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 8, borderBottomWidth: 1 },
  cariText: { flex: 1, fontSize: 14 },
  aramaRow: { flexDirection: 'row', alignItems: 'center', margin: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, gap: 6 },
  aramaTipiBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  aramaTipiBtnText: { fontSize: 12, fontWeight: '600' },
  aramaInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  araBtn: { borderRadius: 6, padding: 8 },
  aramaTipiDropdown: { marginHorizontal: 10, marginTop: -6, marginBottom: 6, borderRadius: 10, borderWidth: 1, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  aramaTipiItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  aramaTipiItemText: { fontSize: 14 },
  listeBaslik: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 6, marginHorizontal: 10, borderRadius: 8, marginBottom: 4 },
  listeBaslikText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  liste: { flex: 1, paddingHorizontal: 10 },
  stokSatiri: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  stokBilgi: { flex: 3.2 },
  stokKodu: { fontSize: 11, fontWeight: '600' },
  stokCinsi: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  stokBarkod: { fontSize: 11, marginTop: 1 },
  stokSag: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  stokFiyat: { fontSize: 14, fontWeight: '700' },
  stokBakiye: { fontSize: 11, marginTop: 2 },
  infoBtn: { justifyContent: 'center', alignItems: 'center', width: 70, gap: 2 },
  infoBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  altBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  altBarkodBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  sepetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14, gap: 8 },
  sepetBtnPasif: { opacity: 0.5 },
  sepetBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  sepetBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  sepetBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  toplamStokText: { textAlign: 'center', fontSize: 13, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth },
  teklifBaslik: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 80, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, zIndex: 10 },
});
