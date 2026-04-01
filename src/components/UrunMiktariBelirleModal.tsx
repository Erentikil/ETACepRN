import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StokListesiBilgileri, SepetKalem, FiyatTipiBilgileri, StokFiyatBilgileri, KurBilgileri, SonSatisFiyatBilgileri, CariFiyatBilgileri } from '../models';
import { useColors } from '../contexts/ThemeContext';
import { toast } from './Toast';
import { paraTL, paraFormat, miktarFormat } from '../utils/format';
import { tekStokFiyatBilgisiniAl, kurBilgileriniAl, sonSatisFiyatlariniAl } from '../api/hizliIslemlerApi';

interface Props {
  urun: StokListesiBilgileri | null;
  kdvDurum: number; // 0=Haric, 1=Dahil, -1=Yok
  fiyatDegistirmeYetkisi: boolean;
  kalemIndirimYetkisi: boolean;
  fiyatTipListesi: FiyatTipiBilgileri[];
  veriTabaniAdi: string;
  cariKodu?: string;
  zorlaFiyatNo?: number;
  cariFiyatListesi?: CariFiyatBilgileri[];
  onConfirm: (kalem: SepetKalem) => void;
  onClose: () => void;
  mode?: 'ekle' | 'duzenle';
  initialMiktar?: number;
  initialAciklama?: string;
}

interface BirimSecenek {
  birim: string;
  carpan: number;
}

export default function UrunMiktariBelirleModal({
  urun,
  kdvDurum,
  fiyatDegistirmeYetkisi,
  kalemIndirimYetkisi,
  fiyatTipListesi,
  veriTabaniAdi,
  cariKodu,
  zorlaFiyatNo,
  cariFiyatListesi,
  onConfirm,
  onClose,
  mode = 'ekle',
  initialMiktar,
  initialAciklama,
}: Props) {
  const Colors = useColors();
  const [miktar, setMiktar] = useState('1');
  const [fiyat, setFiyat] = useState('0');
  const [ind1, setInd1] = useState('0');
  const [ind2, setInd2] = useState('0');
  const [ind3, setInd3] = useState('0');

  // Birim combobox
  const [birimSecenekleri, setBirimSecenekleri] = useState<BirimSecenek[]>([]);
  const [seciliBirimIdx, setSeciliBirimIdx] = useState(0);
  // Fiyat tipi
  const [seciliFiyatNo, setSeciliFiyatNo] = useState(0);
  const [stokFiyatlari, setStokFiyatlari] = useState<StokFiyatBilgileri[]>([]);
  // Kur bilgileri
  const [kurListesi, setKurListesi] = useState<KurBilgileri[]>([]);
  const [secilenDovizKuru, setSecilenDovizKuru] = useState(0); // 0 = TL veya kur yok
  // Dropdown acik/kapali
  const [birimAcik, setBirimAcik] = useState(false);
  const [fiyatTipiAcik, setFiyatTipiAcik] = useState(false);
  // Son satis fiyatlari
  const [sonFiyatModalAcik, setSonFiyatModalAcik] = useState(false);
  const [sonFiyatYukleniyor, setSonFiyatYukleniyor] = useState(false);
  const [sonFiyatListesi, setSonFiyatListesi] = useState<SonSatisFiyatBilgileri[]>([]);
  const [sonFiyatHata, setSonFiyatHata] = useState<string | null>(null);
  // Aciklama
  const [aciklama, setAciklama] = useState('');

  // Birim seceneklerini olustur
  useEffect(() => {
    if (!urun) return;
    const secenekler: BirimSecenek[] = [];

    // birim2 alani "ADET;KOLI" gibi ; ile ayrilmis geliyor
    // carpan2 alani da "1;12" gibi ; ile ayrilmis carpanlar iceriyor
    const birimParcalar = urun.birim2 ? urun.birim2.split(';').map((b) => b.trim()).filter(Boolean) : [];
    const carpanParcalar = urun.carpan2 ? urun.carpan2.split(';').map((c) => parseFloat(c.trim()) || 1) : [];
    if (birimParcalar.length >= 2) {
      for (let i = 0; i < birimParcalar.length; i++) {
        secenekler.push({ birim: birimParcalar[i], carpan: carpanParcalar[i] || urun.carpan || 1 });
      }
    } else {
      // birim2 bos veya tek deger -- sadece birim alanini kullan
      secenekler.push({ birim: urun.birim || 'AD', carpan: urun.carpan || 1 });
    }
    setBirimSecenekleri(secenekler);
    // Duzenleme modunda secili birimi bul
    const birimIdx = secenekler.findIndex((s) => s.birim === urun.birim);
    setSeciliBirimIdx(birimIdx >= 0 ? birimIdx : 0);
    setSeciliFiyatNo(urun.seciliFiyatNo || urun.fiyatNo || 0);
    setMiktar(initialMiktar !== undefined ? String(initialMiktar) : '1');
    // Duzenleme modunda fiyat zaten carpan dahil (birimFiyat), tekrar carpma
    const baslangicFiyat = mode === 'duzenle' ? urun.fiyat : urun.fiyat * (secenekler[birimIdx >= 0 ? birimIdx : 0]?.carpan ?? 1);
    setFiyat(String(parseFloat(baslangicFiyat.toFixed(2))));
    setInd1(String(urun.kalemIndirim1));
    setInd2(String(urun.kalemIndirim2));
    setInd3(String(urun.kalemIndirim3));

    setAciklama(initialAciklama ?? '');
    setStokFiyatlari([]);
    setKurListesi([]);
    setSecilenDovizKuru(0);
    // Stok fiyat bilgilerini ve kur bilgilerini cek
    if (urun.stokKodu && veriTabaniAdi) {
      tekStokFiyatBilgisiniAl(urun.stokKodu, veriTabaniAdi)
        .then((sonuc) => {
          if (sonuc.sonuc && sonuc.data) setStokFiyatlari(sonuc.data);

        })
        .catch(() => {});
      kurBilgileriniAl(veriTabaniAdi)
        .then((sonuc) => {
          if (sonuc.sonuc && sonuc.data) setKurListesi(sonuc.data);
        })
        .catch(() => {});
    }
  }, [urun]);

  // cariFiyatListesi eslesmesi var mi kontrol (zorlaFiyatNo'nun ezilmesini engellemek icin)
  const cariFiyatUygulandiRef = useRef(false);
  useEffect(() => { cariFiyatUygulandiRef.current = false; }, [urun]);

  // zorlaFiyatNo: stokFiyatlari yuklendikten sonra otomatik uygula
  const zorlaFiyatUygulandiRef = useRef(false);
  useEffect(() => { zorlaFiyatUygulandiRef.current = false; }, [urun]);
  // Duzenleme modunda: fiyat/indirim ezme ama doviz kurunu set et
  useEffect(() => {
    if (mode !== 'duzenle') return;
    if (stokFiyatlari.length === 0 || kurListesi.length === 0) return;
    const bulunan = stokFiyatlari.find((sf) => sf.fiyatNo === seciliFiyatNo);
    if (bulunan && !isTL(bulunan.dovizKodu)) {
      const kur = kurListesi.find((k) => k.dovizKodu === bulunan.dovizKodu && k.dovizTuru === bulunan.dovizTuru);
      if (kur) setSecilenDovizKuru(kur.dovizKuru);
    }
  }, [stokFiyatlari, kurListesi]);

  useEffect(() => {
    if (mode === 'duzenle') return;
    if (zorlaFiyatUygulandiRef.current) return;
    if (cariFiyatUygulandiRef.current) return; // cariFiyat daha yuksek oncelikli, ezme
    if (!zorlaFiyatNo || zorlaFiyatNo <= 0 || stokFiyatlari.length === 0) return;
    const bulunan = stokFiyatlari.find((sf) => sf.fiyatNo === zorlaFiyatNo);
    if (!bulunan) return;
    // Dovizli ise kur yuklenene kadar bekle
    const dovizKodu = (bulunan.dovizKodu ?? '').trim();
    const dovizli = dovizKodu && dovizKodu !== 'TL' && dovizKodu !== 'TRY';
    if (dovizli && kurListesi.length === 0) return;

    zorlaFiyatUygulandiRef.current = true;
    setSeciliFiyatNo(zorlaFiyatNo);
    const carpan = birimSecenekleri[seciliBirimIdx]?.carpan ?? 1;
    if (dovizli) {
      const kur = kurListesi.find((k) => k.dovizKodu === bulunan.dovizKodu && k.dovizTuru === bulunan.dovizTuru);
      const kurDegeri = kur?.dovizKuru || 0;
      setSecilenDovizKuru(kurDegeri);
      setFiyat(String(parseFloat((bulunan.tutar * carpan * (kurDegeri || 1)).toFixed(2))));
    } else {
      setSecilenDovizKuru(0);
      setFiyat(String(parseFloat((bulunan.tutar * carpan).toFixed(2))));
    }
    setInd1(String(bulunan.kalemIndirim1));
    setInd2(String(bulunan.kalemIndirim2));
    setInd3(String(bulunan.kalemIndirim3));
  }, [stokFiyatlari, kurListesi]);

  // cariFiyatListesi: en yuksek oncelik -- zorlaFiyatNo dahil her seyi ezer
  useEffect(() => {
    if (mode === 'duzenle') return;
    if (cariFiyatUygulandiRef.current) return;
    if (!cariFiyatListesi || cariFiyatListesi.length === 0 || !urun) return;
    const cariFiyat = cariFiyatListesi.find((cf) => cf.stokKodu === urun.stokKodu);
    if (!cariFiyat) return;

    const carpan = birimSecenekleri[seciliBirimIdx]?.carpan ?? 1;

    if (cariFiyat.fiyatNo && cariFiyat.fiyatNo.trim() !== '') {
      // fiyatNo dolu -> stok fiyat listesinden o fiyatNo'nun tutarini al
      const cfNo = parseInt(cariFiyat.fiyatNo.trim(), 10);
      if (cfNo > 0 && stokFiyatlari.length > 0) {
        const bulunan = stokFiyatlari.find((sf) => sf.fiyatNo === cfNo);
        if (!bulunan) {
          // fiyatNo stok fiyat listesinde yok -- sadece fiyatNo'yu set et, fiyat mevcut kalsin
          cariFiyatUygulandiRef.current = true;
          setSeciliFiyatNo(cfNo);
          setInd1(String(cariFiyat.kalemIndirim1));
          setInd2(String(cariFiyat.kalemIndirim2));
          setInd3(String(cariFiyat.kalemIndirim3));
          return;
        }
        // Dovizli ise kur yuklenene kadar bekle
        const dovizKodu = (bulunan.dovizKodu ?? '').trim();
        const dovizli = dovizKodu && dovizKodu !== 'TL' && dovizKodu !== 'TRY';
        if (dovizli && kurListesi.length === 0) return;

        cariFiyatUygulandiRef.current = true;
        setSeciliFiyatNo(cfNo);
        if (dovizli) {
          const kur = kurListesi.find((k) => k.dovizKodu === bulunan.dovizKodu && k.dovizTuru === bulunan.dovizTuru);
          const kurDegeri = kur?.dovizKuru || 0;
          setSecilenDovizKuru(kurDegeri);
          setFiyat(String(parseFloat((bulunan.tutar * carpan * (kurDegeri || 1)).toFixed(2))));
        } else {
          setSecilenDovizKuru(0);
          setFiyat(String(parseFloat((bulunan.tutar * carpan).toFixed(2))));
        }
        setInd1(String(cariFiyat.kalemIndirim1 || bulunan.kalemIndirim1));
        setInd2(String(cariFiyat.kalemIndirim2 || bulunan.kalemIndirim2));
        setInd3(String(cariFiyat.kalemIndirim3 || bulunan.kalemIndirim3));
      }
      // stokFiyatlari henuz yuklenmemisse, yuklenince tekrar denenecek
    } else if (cariFiyat.tutar > 0) {
      // tutar dolu -> fiyat dogrudan bu tutar, fiyatNo = 0
      cariFiyatUygulandiRef.current = true;
      setSeciliFiyatNo(0);
      setSecilenDovizKuru(0);
      setFiyat(String(parseFloat((cariFiyat.tutar * carpan).toFixed(2))));
      setInd1(String(cariFiyat.kalemIndirim1));
      setInd2(String(cariFiyat.kalemIndirim2));
      setInd3(String(cariFiyat.kalemIndirim3));
    }
  }, [stokFiyatlari, kurListesi, cariFiyatListesi]);

  // Doviz kodu TL mi / bos mu kontrolu
  const isTL = (dovizKodu?: string): boolean => {
    const kod = (dovizKodu ?? '').trim();
    return !kod || kod === 'TL' || kod === 'TRY';
  };

  // Doviz kuru bul -- dovizKodu + dovizTuru eslesmesi
  const dovizKuruBul = (dovizKodu: string, dovizTuru: string): number => {
    if (isTL(dovizKodu)) return 0;
    const kur = kurListesi.find((k) => k.dovizKodu === dovizKodu && k.dovizTuru === dovizTuru);
    return kur?.dovizKuru || 0;
  };

  // Birim degisince fiyati guncelle
  const handleBirimSec = (idx: number) => {
    setSeciliBirimIdx(idx);
    setBirimAcik(false);
    if (urun) {
      const yeniCarpan = birimSecenekleri[idx]?.carpan ?? 1;
      const bulunan = stokFiyatlari.find((sf) => sf.fiyatNo === seciliFiyatNo);
      const bazFiyat = bulunan ? bulunan.tutar : urun.fiyat;
      if (bulunan && !isTL(bulunan.dovizKodu)) {
        const kur = dovizKuruBul(bulunan.dovizKodu, bulunan.dovizTuru);
        setSecilenDovizKuru(kur);
        setFiyat(String(parseFloat((bazFiyat * yeniCarpan * (kur || 1)).toFixed(2))));
      } else {
        setSecilenDovizKuru(0);
        setFiyat(String(parseFloat((bazFiyat * yeniCarpan).toFixed(2))));
      }
    }
  };

  // Fiyat tipi degisince fiyati ve indirimleri guncelle
  const handleFiyatTipiSec = (ft: FiyatTipiBilgileri) => {
    setSeciliFiyatNo(ft.fiyatNo);
    setFiyatTipiAcik(false);
    const bulunan = stokFiyatlari.find((sf) => sf.fiyatNo === ft.fiyatNo);
    if (bulunan) {
      const carpan = birimSecenekleri[seciliBirimIdx]?.carpan ?? 1;
      if (!isTL(bulunan.dovizKodu)) {
        const kur = dovizKuruBul(bulunan.dovizKodu, bulunan.dovizTuru);
        setSecilenDovizKuru(kur);
        setFiyat(String(parseFloat((bulunan.tutar * carpan * (kur || 1)).toFixed(2))));
      } else {
        setSecilenDovizKuru(0);
        setFiyat(String(parseFloat((bulunan.tutar * carpan).toFixed(2))));
      }
      setInd1(String(bulunan.kalemIndirim1));
      setInd2(String(bulunan.kalemIndirim2));
      setInd3(String(bulunan.kalemIndirim3));
    }
  };

  const toggleBirim = () => {
    if (birimSecenekleri.length <= 1) return;
    setFiyatTipiAcik(false);
    setBirimAcik((p) => !p);
  };

  const toggleFiyatTipi = () => {
    if (fiyatTipListesi.length === 0) return;
    setBirimAcik(false);
    setFiyatTipiAcik((p) => !p);
  };

  const sonFiyatlariGetir = async () => {
    if (!urun || !cariKodu) return;
    setSonFiyatModalAcik(true);
    setSonFiyatYukleniyor(true);
    setSonFiyatHata(null);
    setSonFiyatListesi([]);
    try {
      const sonuc = await sonSatisFiyatlariniAl(cariKodu, urun.stokKodu, veriTabaniAdi);
      if (sonuc.sonuc && sonuc.data) {
        setSonFiyatListesi(sonuc.data);
      } else {
        setSonFiyatHata(sonuc.mesaj || 'Fiyat bilgisi alinamadi.');
      }
    } catch {
      setSonFiyatHata('Baglanti hatasi.');
    } finally {
      setSonFiyatYukleniyor(false);
    }
  };

  const tarihFormat = (tarihStr: string) => {
    const d = new Date(tarihStr);
    if (isNaN(d.getTime())) return tarihStr;
    return d.toLocaleDateString('tr-TR');
  };

  if (!urun) return null;

  const seciliBirim = birimSecenekleri[seciliBirimIdx] ?? birimSecenekleri[0];
  const miktarSayi = parseFloat(miktar) || 0;
  const fiyatSayi = parseFloat(fiyat) || 0;
  const ind1Sayi = parseFloat(ind1) || 0;
  const ind2Sayi = parseFloat(ind2) || 0;
  const ind3Sayi = parseFloat(ind3) || 0;

  const kdvHaricTutar =
    miktarSayi *
    fiyatSayi *
    (1 - ind1Sayi / 100) *
    (1 - ind2Sayi / 100) *
    (1 - ind3Sayi / 100);
  const kdvTutar = kdvHaricTutar * (Math.max(0, urun.kdvOrani) / 100);
  const toplamTutar = kdvDurum === 1 ? kdvHaricTutar : kdvHaricTutar + kdvTutar;

  const seciliFiyatTipi = fiyatTipListesi.find((f) => f.fiyatNo === seciliFiyatNo);

  // Secilen fiyat tipinin doviz bilgileri
  const seciliFiyatBilgi = stokFiyatlari.find((sf) => sf.fiyatNo === seciliFiyatNo);
  const seciliFiyatDovizli = seciliFiyatBilgi && !isTL(seciliFiyatBilgi.dovizKodu);
  const kurGecersiz = seciliFiyatDovizli && secilenDovizKuru === 0;

  const handleEkle = () => {
    if (miktarSayi <= 0) return;
    if (fiyatSayi <= 0) {
      toast.warning('Birim fiyat 0 olamaz.');
      return;
    }
    if (kurGecersiz) {
      toast.warning('Secilen doviz tipi icin kur bilgisi bulunamadi. Sepete eklenemez.');
      return;
    }

    // Sepet her zaman 1. birim uzerinden calisir -- secilen birimi 1. birime cevir
    const ilkBirim = birimSecenekleri[0] || { birim: urun.birim, carpan: urun.carpan || 1 };
    const seciliCarpan = seciliBirim?.carpan ?? 1;
    const ilkCarpan = ilkBirim.carpan ?? 1;
    // Miktari 1. birime cevir (or: 2 KOLI x 12 / 1 = 24 ADET)
    const cevriliMiktar = miktarSayi * seciliCarpan / ilkCarpan;
    // Fiyati 1. birime cevir (or: KOLI fiyati 120 / 12 * 1 = 10 ADET fiyati)
    const cevriliFiyat = fiyatSayi / seciliCarpan * ilkCarpan;

    const kalem: SepetKalem = {
      stokKodu: urun.stokKodu,
      stokCinsi: urun.stokCinsi,
      barkod: urun.barkod,
      birim: ilkBirim.birim,
      miktar: cevriliMiktar,
      birimFiyat: cevriliFiyat,
      kdvOrani: urun.kdvOrani,
      kalemIndirim1: ind1Sayi,
      kalemIndirim2: ind2Sayi,
      kalemIndirim3: ind3Sayi,
      aciklama: aciklama.trim() || undefined,
      birim2: urun.birim2,
      carpan: urun.carpan,
      carpan2: urun.carpan2,
      seciliFiyatNo,
    };
    onConfirm(kalem);
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.kart, { backgroundColor: Colors.card }]}>
          {/* Baslik */}
          <View style={[styles.baslik, { backgroundColor: Colors.primary }]}>
            <Text style={styles.stokKodu}>{urun.stokKodu}</Text>
            <Text style={styles.stokCinsi} numberOfLines={2}>{urun.stokCinsi}</Text>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.formScroll}>
            {/* Bakiye satiri */}
            <View style={styles.formSatir}>
              <Text style={[styles.formEtiket, { color: Colors.text }]}>Bakiye:</Text>
              <View style={styles.formSag}>
                <View style={[styles.inputKutu, { borderColor: Colors.border, backgroundColor: Colors.inputBackground }]}>
                  <Text style={[styles.inputKutuText, { color: Colors.text }]}>{miktarFormat(urun.bakiye)}</Text>
                </View>
                <Text style={[styles.birimLabel, { color: Colors.text }]}>{birimSecenekleri[0]?.birim ?? urun.birim}</Text>
              </View>
            </View>

            {/* Fiyat satiri */}
            <View style={[styles.formSatir, { zIndex: 3 }]}>
              {cariKodu ? (
                <TouchableOpacity onPress={sonFiyatlariGetir} style={styles.fiyatEtiketBtn}>
                  <Text style={[styles.formEtiket, { color: Colors.priceColor, marginBottom: 0, textDecorationLine: 'underline' }]}>Fiyat:</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.formEtiket, { color: Colors.priceColor }]}>Fiyat:</Text>
              )}
              <View style={styles.formSag}>
                {fiyatTipListesi.length > 0 ? (
                  <TouchableOpacity style={[styles.fiyatTipiBtn, { backgroundColor: Colors.primary + '12', borderColor: Colors.primary + '30' }]} onPress={toggleFiyatTipi}>
                    <Text style={[styles.fiyatTipiBtnText, { color: Colors.primary }]} numberOfLines={1}>
                      {seciliFiyatTipi
                        ? `${seciliFiyatTipi.fiyatNo}-${seciliFiyatTipi.fiyatAdi}`
                        : 'Secin'}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={Colors.primary} />
                  </TouchableOpacity>
                ) : null}
                <TextInput
                  style={[styles.formInput, { borderColor: Colors.border, color: Colors.black, backgroundColor: Colors.inputBackground }, !fiyatDegistirmeYetkisi && styles.formInputDisabled]}
                  value={fiyat}
                  onChangeText={setFiyat}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  editable={fiyatDegistirmeYetkisi}
                />
                {seciliFiyatDovizli && seciliFiyatBilgi && (
                  <Text style={[styles.dovizLabel, { color: Colors.accent }]}>{seciliFiyatBilgi.dovizKodu}</Text>
                )}
              </View>
            </View>

            {/* Fiyat tipi secim modali */}
            <Modal visible={fiyatTipiAcik} animationType="slide" transparent onRequestClose={() => setFiyatTipiAcik(false)}>
              <View style={styles.fiyatModalOverlay}>
                <View style={[styles.fiyatModalKart, { backgroundColor: Colors.card }]}>
                  <View style={[styles.fiyatModalBaslik, { backgroundColor: Colors.primary }]}>
                    <Text style={styles.fiyatModalBaslikText}>Fiyat Tipi Secin</Text>
                    <TouchableOpacity onPress={() => setFiyatTipiAcik(false)}>
                      <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 400 }}>
                    {fiyatTipListesi.filter((ft) => stokFiyatlari.some((sf) => sf.fiyatNo === ft.fiyatNo)).map((ft, idx) => {
                      const sfb = stokFiyatlari.find((sf) => sf.fiyatNo === ft.fiyatNo);
                      const aktif = ft.fiyatNo === seciliFiyatNo;
                      return (
                        <React.Fragment key={ft.fiyatNo}>
                          {idx > 0 && <View style={[styles.dropdownSeparator, { backgroundColor: Colors.border }]} />}
                          <TouchableOpacity
                            style={[styles.fiyatModalItem, aktif && { backgroundColor: Colors.primary + '12' }]}
                            onPress={() => handleFiyatTipiSec(ft)}
                          >
                            {aktif && <Ionicons name="checkmark" size={16} color={Colors.primary} style={{ marginRight: 6 }} />}
                            <Text style={[styles.fiyatModalItemText, { color: Colors.text }, aktif && { color: Colors.primary, fontWeight: '700' }]} numberOfLines={1}>
                              {ft.fiyatNo} - {ft.fiyatAdi}
                            </Text>
                            {sfb && (
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.fiyatModalItemSub, { color: Colors.textSecondary }]}>{paraTL(sfb.tutar)}</Text>
                                {!isTL(sfb.dovizKodu) ? (
                                  <Text style={[styles.fiyatModalItemDoviz, { color: Colors.accent }]}>{sfb.dovizKodu} - {sfb.dovizTuru}</Text>
                                ) : null}
                              </View>
                            )}
                          </TouchableOpacity>
                        </React.Fragment>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Kalem Indirim satiri */}
            {kalemIndirimYetkisi && (
              <View style={styles.formSatir}>
                <Text style={[styles.formEtiket, { color: Colors.text }]}>Indirim:</Text>
                <View style={styles.formSag}>
                  <TextInput
                    style={[styles.formInputKucuk, { borderColor: Colors.border, color: Colors.black, backgroundColor: Colors.inputBackground }]}
                    value={ind1}
                    onChangeText={setInd1}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <TextInput
                    style={[styles.formInputKucuk, { borderColor: Colors.border, color: Colors.black, backgroundColor: Colors.inputBackground }]}
                    value={ind2}
                    onChangeText={setInd2}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <TextInput
                    style={[styles.formInputKucuk, { borderColor: Colors.border, color: Colors.black, backgroundColor: Colors.inputBackground }]}
                    value={ind3}
                    onChangeText={setInd3}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                </View>
              </View>
            )}

            {/* Miktar satiri */}
            <View style={[styles.formSatir, { zIndex: 2 }]}>
              <Text style={[styles.formEtiket, { color: Colors.text }]}>Miktar</Text>
              <View style={styles.formSag}>
                <TextInput
                  style={[styles.formInput, { borderColor: Colors.border, color: Colors.black, backgroundColor: Colors.inputBackground }]}
                  value={miktar}
                  onChangeText={setMiktar}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                {seciliBirim && seciliBirim.carpan > 1 && (
                  <Text style={[styles.carpanLabel, { color: Colors.textSecondary }]}>(x{seciliBirim.carpan})</Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.birimBtn,
                    { backgroundColor: Colors.primary + '12', borderColor: Colors.primary + '30' },
                    birimSecenekleri.length <= 1 && { backgroundColor: Colors.inputBackground, borderColor: Colors.border },
                  ]}
                  onPress={toggleBirim}
                  disabled={birimSecenekleri.length <= 1}
                >
                  <Text style={[
                    styles.birimBtnText,
                    { color: Colors.primary },
                    birimSecenekleri.length <= 1 && { color: Colors.text },
                  ]}>
                    {seciliBirim?.birim ?? urun.birim}
                  </Text>
                  {birimSecenekleri.length > 1 && (
                    <Ionicons name={birimAcik ? 'chevron-up' : 'chevron-down'} size={12} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Birim dropdown */}
            {birimAcik && (
              <View style={styles.dropdownWrapper}>
                <View style={[styles.dropdownList, { borderColor: Colors.primary + '40', backgroundColor: Colors.card }]}>
                  {birimSecenekleri.map((b, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <View style={[styles.dropdownSeparator, { backgroundColor: Colors.border }]} />}
                      <TouchableOpacity
                        style={[styles.dropdownItem, idx === seciliBirimIdx && { backgroundColor: Colors.primary + '12' }]}
                        onPress={() => handleBirimSec(idx)}
                      >
                        {idx === seciliBirimIdx && <Ionicons name="checkmark" size={16} color={Colors.primary} style={{ marginRight: 6 }} />}
                        <Text style={[styles.dropdownItemText, { color: Colors.text }, idx === seciliBirimIdx && { color: Colors.primary, fontWeight: '700' }]}>
                          {b.birim}
                        </Text>
                        <Text style={[styles.dropdownItemSub, { color: Colors.textSecondary }]}>x{b.carpan}</Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              </View>
            )}

            {/* Aciklama */}
            <View style={styles.formSatir}>
              <Text style={[styles.formEtiket, { color: Colors.text }]}>Aciklama</Text>
              <View style={styles.formSag}>
                <TextInput
                  style={[styles.formInput, { textAlignVertical: 'top', minHeight: 40, borderColor: Colors.border, color: Colors.black, backgroundColor: Colors.inputBackground }]}
                  placeholder="Kalem aciklamasi..."
                  placeholderTextColor={Colors.textSecondary}
                  value={aciklama}
                  onChangeText={setAciklama}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            {/* Toplam ozet */}
            <View style={[styles.toplamKart, { backgroundColor: Colors.inputBackground, borderColor: Colors.border }]}>
              <View style={styles.toplamSatir}>
                <Text style={[styles.toplamEtiket, { color: Colors.text }]}>
                  {miktarFormat(miktarSayi)} {seciliBirim?.birim ?? urun.birim} x {paraTL(fiyatSayi)}
                </Text>
                <Text style={[styles.toplamDeger, { color: Colors.text }]}>{paraTL(miktarSayi * fiyatSayi)}</Text>
              </View>
              {(ind1Sayi > 0 || ind2Sayi > 0 || ind3Sayi > 0) && (
                <View style={styles.toplamSatir}>
                  <Text style={[styles.toplamEtiket, { color: Colors.text }]}>Indirimli</Text>
                  <Text style={[styles.toplamDeger, { color: Colors.text }]}>{paraTL(kdvHaricTutar)}</Text>
                </View>
              )}
              {kdvDurum !== -1 && (
                <View style={styles.toplamSatir}>
                  <Text style={[styles.toplamEtiket, { color: Colors.text }]}>KDV (%{urun.kdvOrani})</Text>
                  <Text style={[styles.toplamDeger, { color: Colors.text }]}>{paraTL(kdvTutar)}</Text>
                </View>
              )}
              <View style={[styles.toplamSatir, styles.toplamSonSatir, { borderTopColor: Colors.border }]}>
                <Text style={[styles.toplamEtiketBold, { color: Colors.primary }]}>Toplam</Text>
                <Text style={[styles.toplamDegerBold, { color: Colors.primary }]}>{paraTL(toplamTutar)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Tamam / Vazgec butonlari */}
          <View style={[styles.butonRow, { borderTopColor: Colors.border }]}>
            <TouchableOpacity
              style={[styles.buton, styles.tamamBtn, { backgroundColor: Colors.primary }, (miktarSayi <= 0 || kurGecersiz) && styles.butonDisabled]}
              onPress={handleEkle}
              disabled={miktarSayi <= 0 || kurGecersiz}
            >
              <Text style={styles.butonText}>
                {mode === 'duzenle' ? 'Guncelle' : 'Tamam'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.buton, styles.vazgecBtn, { backgroundColor: Colors.primary }]} onPress={onClose}>
              <Text style={styles.butonText}>Vazgec</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Son Satis Fiyatlari Modal */}
      <Modal visible={sonFiyatModalAcik} animationType="slide" transparent onRequestClose={() => setSonFiyatModalAcik(false)}>
        <View style={styles.sonFiyatOverlay}>
          <View style={[styles.sonFiyatKart, { backgroundColor: Colors.card }]}>
            <View style={[styles.sonFiyatBaslik, { backgroundColor: Colors.primary }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sonFiyatBaslikText}>Son Satis Fiyatlari</Text>
                <Text style={styles.sonFiyatAltBaslik} numberOfLines={1}>{urun?.stokCinsi}</Text>
              </View>
              <TouchableOpacity onPress={() => setSonFiyatModalAcik(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {sonFiyatYukleniyor ? (
              <View style={styles.sonFiyatMerkez}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={[styles.sonFiyatMerkezText, { color: Colors.textSecondary }]}>Yukleniyor...</Text>
              </View>
            ) : sonFiyatHata ? (
              <View style={styles.sonFiyatMerkez}>
                <Ionicons name="alert-circle-outline" size={36} color={Colors.error} />
                <Text style={[styles.sonFiyatMerkezText, { color: Colors.error }]}>{sonFiyatHata}</Text>
              </View>
            ) : sonFiyatListesi.length === 0 ? (
              <View style={styles.sonFiyatMerkez}>
                <Ionicons name="pricetags-outline" size={36} color={Colors.textSecondary} />
                <Text style={[styles.sonFiyatMerkezText, { color: Colors.textSecondary }]}>Son satis fiyati bulunamadi.</Text>
              </View>
            ) : (
              <ScrollView style={{ paddingHorizontal: 14, paddingTop: 10 }}>
                {sonFiyatListesi.map((f, i) => (
                  <View key={i} style={[styles.sonFiyatSatir, i < sonFiyatListesi.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
                    <View style={styles.sonFiyatUst}>
                      <Text style={[styles.sonFiyatTarih, { color: Colors.text }]}>{tarihFormat(f.tarih)}</Text>
                      <Text style={[styles.sonFiyatDeger, { color: Colors.primary }]}>{paraFormat(f.fiyat)}</Text>
                    </View>
                    <View style={styles.sonFiyatAlt}>
                      <Text style={[styles.sonFiyatDetay, { color: Colors.textSecondary }]}>Miktar: {miktarFormat(f.miktar)}</Text>
                      {(f.indirimYuzde1 > 0 || f.indirimYuzde2 > 0 || f.indirimYuzde3 > 0) && (
                        <Text style={[styles.sonFiyatDetay, { color: Colors.textSecondary }]}>
                          Isk: %{f.indirimYuzde1}{f.indirimYuzde2 > 0 ? ` + %${f.indirimYuzde2}` : ''}{f.indirimYuzde3 > 0 ? ` + %${f.indirimYuzde3}` : ''}
                        </Text>
                      )}
                      {f.dovizKodu ? (
                        <Text style={[styles.sonFiyatDetay, { color: Colors.textSecondary }]}>{f.dovizKodu}: {paraFormat(f.dovizFiyat)}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
                <View style={{ height: 16 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  kart: {
    borderRadius: 14,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  // Baslik
  baslik: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stokKodu: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  stokCinsi: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  // Form
  formScroll: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  formSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 38,
  },
  formEtiket: {
    fontSize: 15,
    fontWeight: '600',
    width: 90,
  },
  formSag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Input kutulari
  formInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  formInputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  formInputKucuk: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputKutu: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  inputKutuText: {
    fontSize: 16,
    fontWeight: '600',
  },
  birimLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 30,
  },
  // Doviz etiketi
  dovizLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Carpan etiketi
  carpanLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Fiyat tipi butonu
  fiyatTipiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1.5,
    gap: 3,
    maxWidth: 110,
  },
  fiyatTipiBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Birim butonu
  birimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1.5,
    gap: 3,
    minWidth: 55,
  },
  birimBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Dropdown (birim)
  dropdownWrapper: {
    marginBottom: 6,
    marginLeft: 90,
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownItemSub: {
    fontSize: 14,
    marginLeft: 6,
  },
  dropdownSeparator: {
    height: 1,
    marginHorizontal: 8,
  },
  // Fiyat tipi modal
  fiyatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  fiyatModalKart: {
    borderRadius: 14,
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  fiyatModalBaslik: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fiyatModalBaslikText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  fiyatModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fiyatModalItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  fiyatModalItemSub: {
    fontSize: 15,
    marginLeft: 8,
  },
  fiyatModalItemDoviz: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  // Toplam
  toplamKart: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  toplamSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  toplamSonSatir: {
    borderTopWidth: 1,
    marginTop: 3,
    paddingTop: 4,
  },
  toplamEtiket: { fontSize: 15 },
  toplamDeger: { fontSize: 15 },
  toplamEtiketBold: { fontSize: 17, fontWeight: '700' },
  toplamDegerBold: { fontSize: 17, fontWeight: '700' },
  // Butonlar
  butonRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  buton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tamamBtn: {
    borderBottomLeftRadius: 14,
  },
  vazgecBtn: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.2)',
    borderBottomRightRadius: 14,
  },
  butonDisabled: {
    opacity: 0.5,
  },
  butonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Fiyat etiketi tiklanabilir
  fiyatEtiketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 90,
  },
  // Son satis fiyatlari modal
  sonFiyatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sonFiyatKart: {
    borderRadius: 14,
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  sonFiyatBaslik: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sonFiyatBaslikText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  sonFiyatAltBaslik: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  sonFiyatMerkez: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  sonFiyatMerkezText: {
    fontSize: 14,
  },
  sonFiyatSatir: {
    paddingVertical: 10,
  },
  sonFiyatUst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sonFiyatTarih: {
    fontSize: 14,
    fontWeight: '600',
  },
  sonFiyatDeger: {
    fontSize: 16,
    fontWeight: '700',
  },
  sonFiyatAlt: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sonFiyatDetay: {
    fontSize: 12,
  },
});
