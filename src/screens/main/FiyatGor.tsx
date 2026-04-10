import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../store/appStore';
import { tekStokFiyatBilgisiniAl, barkoddanStokKodunuBul, stokKartlariniKodCinsBarkoddanBul } from '../../api/hizliIslemlerApi';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import StokInfoModal from '../../components/StokInfoModal';
import { useTarayiciAyarlari } from '../../hooks/useTarayiciAyarlari';
import { useColors } from '../../contexts/ThemeContext';
import { Config } from '../../constants/Config';
import { paraTL, paraFormat, miktarFormat } from '../../utils/format';
import type { StokListesiBilgileri, StokFiyatBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';
import SkeletonLoader from '../../components/SkeletonLoader';
import AnimatedListItem from '../../components/AnimatedListItem';
import { hafifTitresim } from '../../utils/haptics';

import { toast } from '../../components/Toast';


const ARAMA_TIPLERI = [
  { label: 'Başlayan', value: 1 },
  { label: 'Biten', value: 2 },
  { label: 'İçeren', value: 3 },
  { label: 'Barkod', value: 4 },
];

export default function FiyatGor() {
  const Colors = useColors();
  const { yetkiBilgileri, fiyatTipListesi, calisilanSirket } = useAppStore();


  const [stokListesi, setStokListesi] = useState<StokListesiBilgileri[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaTipi, setAramaTipi] = useState(4); // varsayılan: barkod
  const [aramaTipiAcik, setAramaTipiAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const aramaInputRef = useRef<TextInput>(null);
  const [scannerAcik, setScannerAcik] = useState(false);

  // Fiyat detay modal state
  const [secilenStok, setSecilenStok] = useState<StokListesiBilgileri | null>(null);
  const [stokFiyatlari, setStokFiyatlari] = useState<StokFiyatBilgileri[]>([]);
  const [secilenFiyatNo, setSecilenFiyatNo] = useState(0);
  const [fiyatYukleniyor, setFiyatYukleniyor] = useState(false);
  const [fiyatNoDropdownAcik, setFiyatNoDropdownAcik] = useState(false);

  // Stok info modal
  const [infoStoku, setInfoStoku] = useState<StokListesiBilgileri | null>(null);

  const { manuelOkuma, baslangicZoom } = useTarayiciAyarlari();

  // Ayarlardan varsayilan fiyatNo ve arama tipi yukle
  useEffect(() => {
    (async () => {
      const fiyatNoStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.VARSAYILAN_FIYAT_NO);
      if (fiyatNoStr !== null) {
        setSecilenFiyatNo(parseInt(fiyatNoStr, 10));
      } else if (yetkiBilgileri?.fiyatNo) {
        setSecilenFiyatNo(yetkiBilgileri.fiyatNo);
      }
      const aramaTipiStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.VARSAYILAN_ARAMA_TIPI);
      if (aramaTipiStr !== null) setAramaTipi(parseInt(aramaTipiStr, 10));
    })();
  }, []);

  // Stok secildiginde fiyatlari cek
  useEffect(() => {
    if (!secilenStok) return;
    setFiyatYukleniyor(true);
    setFiyatNoDropdownAcik(false);
    tekStokFiyatBilgisiniAl(secilenStok.stokKodu, calisilanSirket)
      .then((sonuc) => {
        if (sonuc.sonuc && sonuc.data) {
          setStokFiyatlari(sonuc.data);
        } else {
          setStokFiyatlari([]);
        }
      })
      .catch(() => setStokFiyatlari([]))
      .finally(() => setFiyatYukleniyor(false));
  }, [secilenStok]);

  const aramaTipiLabel = ARAMA_TIPLERI.find((t) => t.value === aramaTipi)?.label ?? 'Barkod';

  // Arama — API'ye istek at
  const aramaYap = useCallback(async (veriOverride?: string) => {
    const veri = (veriOverride ?? aramaMetni).trim();
    if (!veri || !calisilanSirket) {
      setStokListesi([]);
      return;
    }
    setYukleniyor(true);
    try {
      if (aramaTipi === 4) {
        // Barkod araması
        const sonuc = await barkoddanStokKodunuBul(veri, calisilanSirket);
        if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
          setStokListesi(sonuc.data);
          if (sonuc.data.length === 1) {
            setSecilenStok(sonuc.data[0]);
          }
        } else {
          toast.warning(`"${veri}" barkodlu ürün bulunamadı.`);
          setStokListesi([]);
        }
        // Barkod arama sonrası inputu temizle, modal açılmayacaksa focusla
        setAramaMetni('');
        if (!sonuc.data || sonuc.data.length !== 1) {
          setTimeout(() => aramaInputRef.current?.focus(), 100);
        }
      } else {
        const sonuc = await stokKartlariniKodCinsBarkoddanBul(veri, aramaTipi, calisilanSirket);
        if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
          setStokListesi(sonuc.data);
          if (sonuc.data.length === 1) {
            setSecilenStok(sonuc.data[0]);
          }
        } else {
          toast.warning(`"${veri}" ile eşleşen ürün bulunamadı.`);
          setStokListesi([]);
        }
      }
    } catch (e: any) {
      toast.error(`Arama sırasında bir hata oluştu.\n${e?.message ?? e}`);
      setStokListesi([]);
    } finally {
      setYukleniyor(false);
    }
  }, [aramaMetni, aramaTipi, calisilanSirket]);

  useEffect(() => {
    if (!aramaMetni.trim()) setStokListesi([]);
  }, [aramaMetni]);

  // Secili fiyat bilgisi
  const seciliFiyat = stokFiyatlari.find((f) => f.fiyatNo === secilenFiyatNo);
  const seciliFiyatTipi = fiyatTipListesi.find((f) => f.fiyatNo === secilenFiyatNo);
  const gosterilecekFiyat = seciliFiyat?.tutar ?? secilenStok?.fiyat ?? 0;
  const gosterilecekDoviz = seciliFiyat?.dovizKodu ?? secilenStok?.dovizKodu ?? '';

  const isTL = (kod?: string) => {
    const k = (kod ?? '').trim();
    return !k || k === 'TL' || k === 'TRY';
  };
  const fiyatGoster = (tutar: number, dovizKodu?: string) =>
    isTL(dovizKodu) ? paraTL(tutar) : `${paraFormat(tutar)} ${dovizKodu}`;

  const renderStokSatiri = ({ item, index }: { item: StokListesiBilgileri; index: number }) => (
    <AnimatedListItem index={index}>
      <TouchableOpacity
        style={[styles.stokSatiri, { backgroundColor: Colors.card }]}
        onPress={() => {
          hafifTitresim();
          setSecilenStok(item);
        }}
        onLongPress={() => setInfoStoku(item)}
        delayLongPress={400}
      >
        <View style={styles.stokBilgi}>
          <Text style={[styles.stokKodu, { color: Colors.textSecondary }]}>{item.stokKodu}</Text>
          <Text style={[styles.stokCinsi, { color: Colors.text }]}>{item.stokCinsi}</Text>
          {item.barkod ? (
            <Text style={[styles.stokBarkod, { color: Colors.textSecondary }]}>{item.barkod}</Text>
          ) : null}
        </View>
        <View style={styles.stokSag}>
          <Text style={[styles.stokFiyat, { color: Colors.primary }]}>{paraTL(item.fiyat)}</Text>
          <Text style={[styles.stokBakiye, { color: Colors.textSecondary }]}>{miktarFormat(item.bakiye)} {item.birim2?.split(';')[0]?.trim() || item.birim}</Text>
        </View>
      </TouchableOpacity>
    </AnimatedListItem>
  );

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      {/* Ust bar - barkod */}
      <View style={[styles.ustBar, { backgroundColor: Colors.primary }]}>
        <View style={styles.ustBarBilgi}>
          <Ionicons name="pricetag-outline" size={18} color={'#fff'} />
          <Text style={styles.ustBarText}>Fiyat Gör</Text>
        </View>
        <TouchableOpacity
          style={styles.barkodBtn}
          onPress={() => setScannerAcik(true)}
        >
          <Ionicons name="barcode-outline" size={24} color={'#fff'} />
        </TouchableOpacity>
      </View>

      {/* Arama satırı — tip seçici + input + ara butonu */}
      <View style={[styles.aramaRow, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.aramaTipiBtn, { backgroundColor: `${Colors.primary}15` }]}
          onPress={() => setAramaTipiAcik(!aramaTipiAcik)}
        >
          <Text style={[styles.aramaTipiBtnText, { color: Colors.primary }]}>{aramaTipiLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={Colors.primary} />
        </TouchableOpacity>
        <TextInput
          ref={aramaInputRef}
          style={[styles.aramaInput, { color: Colors.text }]}
          placeholder={aramaTipi === 4 ? 'Barkod giriniz...' : 'Stok kodu veya ürün adı...'}
          placeholderTextColor={Colors.textSecondary}
          value={aramaMetni}
          onChangeText={setAramaMetni}
          returnKeyType="search"
          onSubmitEditing={() => aramaYap()}
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => { setAramaMetni(''); setStokListesi([]); }}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.araBtn, { backgroundColor: Colors.primary }]}
          onPress={() => aramaYap()}
        >
          <Ionicons name="search" size={20} color={'#fff'} />
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
                  tip.value === aramaTipi && { fontWeight: '700', color: Colors.primary },
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

      {/* Liste baslik */}
      <View style={[styles.listeBaslik, { backgroundColor: Colors.primary }]}>
        <Text style={[styles.listeBaslikText, { flex: 1.2 }]}>KOD</Text>
        <Text style={[styles.listeBaslikText, { flex: 2 }]}>CINS</Text>
        <Text style={[styles.listeBaslikText, { flex: 1, textAlign: 'right' }]}>FIYAT</Text>
      </View>

      {/* Stok listesi */}
      <FlatList
        data={stokListesi}
        keyExtractor={(item, idx) => item.stokKodu || String(idx)}
        renderItem={renderStokSatiri}
        style={styles.liste}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => aramaYap()}
            colors={[Colors.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.ayirac} />}
        ListEmptyComponent={
          yukleniyor ? (
            <SkeletonLoader satirSayisi={6} />
          ) : (
            <EmptyState
              icon="search-outline"
              baslik={aramaMetni.trim() ? 'Sonuç bulunamadı' : 'Ürün arayın'}
              aciklama={aramaMetni.trim() ? 'Farklı bir arama kriteri deneyiniz' : 'Aramak için yukarıdaki arama çubuğunu kullanın'}
            />
          )
        }
      />

      {/* Alt barkod butonu */}
      <View style={styles.altBar}>
        <TouchableOpacity
          style={[styles.altBarkodBtnFull, { backgroundColor: Colors.primary }]}
          onPress={() => setScannerAcik(true)}
        >
          <Ionicons name="barcode-outline" size={24} color={'#fff'} />
          <Text style={styles.altBarkodText}>Barkod Tara</Text>
        </TouchableOpacity>
      </View>

      {/* ==================== FIYAT DETAY MODAL ==================== */}
      <Modal
        visible={!!secilenStok}
        animationType="slide"
        transparent
        onRequestClose={() => { setSecilenStok(null); setTimeout(() => aramaInputRef.current?.focus(), 350); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: Colors.card }]}>
            {/* Modal baslik */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalStokKodu, { color: Colors.textSecondary }]}>{secilenStok?.stokKodu}</Text>
                <Text style={[styles.modalStokCinsi, { color: Colors.text }]} numberOfLines={2}>{secilenStok?.stokCinsi}</Text>
              </View>
              <TouchableOpacity onPress={() => { setSecilenStok(null); setTimeout(() => aramaInputRef.current?.focus(), 350); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={28} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Buyuk fiyat gosterimi */}
            <View style={[styles.buyukFiyatContainer, { backgroundColor: Colors.background }]}>
              {fiyatYukleniyor ? (
                <ActivityIndicator size="large" color={Colors.primary} />
              ) : (
                <>
                  <Text style={[styles.buyukFiyat, { color: Colors.primary }]}>{paraFormat(gosterilecekFiyat)}</Text>
                  <Text style={[styles.dovizKodu, { color: Colors.textSecondary }, !isTL(gosterilecekDoviz) && styles.dovizKoduAccent]}>
                    {isTL(gosterilecekDoviz) ? '₺' : gosterilecekDoviz}
                  </Text>
                  {seciliFiyat && (
                    <Text style={styles.fiyatAdi}>{seciliFiyat.fiyatAdi}</Text>
                  )}
                </>
              )}
            </View>

            {/* Indirim bilgileri */}
            {seciliFiyat && (seciliFiyat.kalemIndirim1 > 0 || seciliFiyat.kalemIndirim2 > 0 || seciliFiyat.kalemIndirim3 > 0) && (
              <View style={styles.indirimRow}>
                {seciliFiyat.kalemIndirim1 > 0 && (
                  <View style={styles.indirimBadge}>
                    <Text style={styles.indirimText}>Ind.1: %{seciliFiyat.kalemIndirim1}</Text>
                  </View>
                )}
                {seciliFiyat.kalemIndirim2 > 0 && (
                  <View style={styles.indirimBadge}>
                    <Text style={styles.indirimText}>Ind.2: %{seciliFiyat.kalemIndirim2}</Text>
                  </View>
                )}
                {seciliFiyat.kalemIndirim3 > 0 && (
                  <View style={styles.indirimBadge}>
                    <Text style={styles.indirimText}>Ind.3: %{seciliFiyat.kalemIndirim3}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Fiyat No combobox — sadece fiyati olan secenekler */}
            <Text style={[styles.fiyatNoLabel, { color: Colors.text }]}>Fiyat Tipi</Text>
            <TouchableOpacity
              style={[styles.fiyatNoSelector, { borderColor: Colors.primary, backgroundColor: Colors.inputBackground }]}
              onPress={() => setFiyatNoDropdownAcik(!fiyatNoDropdownAcik)}
            >
              <Text style={[styles.fiyatNoSelectorText, { color: Colors.text }]}>
                {seciliFiyatTipi
                  ? `${seciliFiyatTipi.fiyatNo} - ${seciliFiyatTipi.fiyatAdi} (${fiyatGoster(seciliFiyat?.tutar ?? 0, seciliFiyat?.dovizKodu)})`
                  : 'Fiyat tipi seciniz...'}
              </Text>
              <Ionicons name={fiyatNoDropdownAcik ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.primary} />
            </TouchableOpacity>

            {/* Fiyat tipi dropdown — fiyatTipListesi'nden, stokFiyatlari'nda karşılığı olanlar */}
            {fiyatNoDropdownAcik && (
              <View style={[styles.fiyatNoDropdown, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {fiyatTipListesi.filter((ft) => stokFiyatlari.some((sf) => sf.fiyatNo === ft.fiyatNo)).map((ft) => {
                    const sfb = stokFiyatlari.find((sf) => sf.fiyatNo === ft.fiyatNo);
                    const aktif = ft.fiyatNo === secilenFiyatNo;
                    return (
                      <TouchableOpacity
                        key={ft.fiyatNo}
                        style={[
                          styles.fiyatNoItem,
                          { borderBottomColor: Colors.border },
                          aktif && { backgroundColor: `${Colors.primary}10` },
                        ]}
                        onPress={() => {
                          setSecilenFiyatNo(ft.fiyatNo);
                          setFiyatNoDropdownAcik(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[
                            styles.fiyatNoItemText,
                            { color: Colors.text },
                            aktif && { fontWeight: '700', color: Colors.primary },
                          ]}>
                            {ft.fiyatNo} - {ft.fiyatAdi}
                          </Text>
                          {sfb && (
                            <Text style={[styles.fiyatNoItemFiyat, { color: Colors.textSecondary }, !isTL(sfb.dovizKodu) && styles.dovizKoduAccent]}>
                              {fiyatGoster(sfb.tutar, sfb.dovizKodu)}
                            </Text>
                          )}
                        </View>
                        {aktif && (
                          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Stok bilgileri */}
            <View style={[styles.stokDetayRow, { backgroundColor: Colors.background }]}>
              <View style={styles.stokDetayItem}>
                <Text style={[styles.stokDetayLabel, { color: Colors.textSecondary }]}>Bakiye</Text>
                <Text style={[styles.stokDetayDeger, { color: Colors.text }]}>{miktarFormat(secilenStok?.bakiye ?? 0)}</Text>
              </View>
              <View style={styles.stokDetayItem}>
                <Text style={[styles.stokDetayLabel, { color: Colors.textSecondary }]}>Birim</Text>
                <Text style={[styles.stokDetayDeger, { color: Colors.text }]}>{secilenStok?.birim2?.split(';')[0]?.trim() || secilenStok?.birim}</Text>
              </View>
              <View style={styles.stokDetayItem}>
                <Text style={[styles.stokDetayLabel, { color: Colors.textSecondary }]}>KDV</Text>
                <Text style={[styles.stokDetayDeger, { color: Colors.text }]}>%{secilenStok?.kdvOrani ?? 0}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barkod scanner */}
      <BarcodeScannerModal
        visible={scannerAcik}
        onClose={() => { setScannerAcik(false); setTimeout(() => aramaInputRef.current?.focus(), 100); }}
        manuelOkuma={manuelOkuma}
        baslangicZoom={baslangicZoom}
        onDetected={(barkod) => {
          setScannerAcik(false);
          hafifTitresim();
          barkoddanStokKodunuBul(barkod, calisilanSirket).then((sonuc) => {
            if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
              setStokListesi(sonuc.data);
              if (sonuc.data.length === 1) {
                setSecilenStok(sonuc.data[0]);
              }
            } else {
              toast.warning(`"${barkod}" barkodlu urun bulunamadi.`);
              setStokListesi([]);
            }
          }).catch(() => {
            toast.error('Barkod aramasi sirasinda bir hata olustu.');
          });
        }}
      />

      {/* Stok info modal */}
      <StokInfoModal
        stokKodu={infoStoku?.stokKodu ?? null}
        stokCinsi={infoStoku?.stokCinsi ?? ''}
        veriTabaniAdi={calisilanSirket}
        onClose={() => { setInfoStoku(null); setTimeout(() => aramaInputRef.current?.focus(), 100); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  ustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ustBarBilgi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ustBarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  barkodBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
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
    borderRadius: 10,
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
    paddingVertical: 12,
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
  stokBarkod: { fontSize: 11, marginTop: 1 },
  stokSag: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  stokFiyat: { fontSize: 14, fontWeight: '700' },
  stokBakiye: { fontSize: 11, marginTop: 2 },
  ayirac: { height: 4 },
  altBar: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  altBarkodBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  altBarkodText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // ==================== MODAL STYLES ====================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    width: '100%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalStokKodu: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalStokCinsi: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  buyukFiyatContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  buyukFiyat: {
    fontSize: 38,
    fontWeight: '800',
  },
  dovizKodu: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  dovizKoduAccent: {
    color: '#FF9800',
    fontWeight: '700',
  },
  fiyatAdi: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 4,
  },
  indirimRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  indirimBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  indirimText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
  fiyatNoLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  fiyatNoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  fiyatNoSelectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fiyatNoDropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  fiyatNoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  fiyatNoItemText: {
    fontSize: 14,
  },
  fiyatNoItemFiyat: {
    fontSize: 12,
    marginTop: 2,
  },
  stokDetayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 12,
    paddingVertical: 14,
  },
  stokDetayItem: {
    alignItems: 'center',
  },
  stokDetayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  stokDetayDeger: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
});
