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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../store/appStore';
import { stokKartlariniKodCinsBarkoddanBul, barkodKaydet } from '../../api/hizliIslemlerApi';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import StokInfoModal from '../../components/StokInfoModal';
import { useTarayiciAyarlari } from '../../hooks/useTarayiciAyarlari';
import { Colors } from '../../constants/Colors';
import { Config } from '../../constants/Config';
import type { StokListesiBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';
import SkeletonLoader from '../../components/SkeletonLoader';
import AnimatedListItem from '../../components/AnimatedListItem';
import { hafifTitresim } from '../../utils/haptics';
import { useRecentSearches } from '../../hooks/useRecentSearches';
import { toast } from '../../components/Toast';

const ARAMA_TIPLERI = [
  { label: 'Baslayan', value: 1 },
  { label: 'Biten', value: 2 },
  { label: 'Iceren', value: 3 },
];

export default function BarkodEkleme() {
  const { calisilanSirket } = useAppStore();
  const { recentSearches, addSearch, clearAll: clearRecentSearches } = useRecentSearches();

  const [stokListesi, setStokListesi] = useState<StokListesiBilgileri[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaTipi, setAramaTipi] = useState(3);
  const [aramaTipiAcik, setAramaTipiAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);

  // Detay modal state
  const [secilenStok, setSecilenStok] = useState<StokListesiBilgileri | null>(null);
  const [modalGorunur, setModalGorunur] = useState(false);
  const [barkodDeger, setBarkodDeger] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [scannerAcik, setScannerAcik] = useState(false);
  const bekleyenScanRef = useRef(false);

  // Stok info modal
  const [infoStoku, setInfoStoku] = useState<StokListesiBilgileri | null>(null);

  const { manuelOkuma, baslangicZoom } = useTarayiciAyarlari();

  // Ayarlardan arama tipi yukle
  useEffect(() => {
    (async () => {
      const aramaTipiStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.VARSAYILAN_ARAMA_TIPI);
      if (aramaTipiStr !== null) setAramaTipi(parseInt(aramaTipiStr, 10));
    })();
  }, []);

  // Stok secildiginde modal ac ve barkod inputunu sifirla
  useEffect(() => {
    if (secilenStok) {
      setBarkodDeger('');
      setModalGorunur(true);
    }
  }, [secilenStok]);

  // Modal kapandiktan sonra scanner acilacaksa ac
  const handleModalKapat = () => {
    setModalGorunur(false);
    if (!bekleyenScanRef.current) {
      setSecilenStok(null);
    }
  };

  const handleScanButonPress = () => {
    bekleyenScanRef.current = true;
    setModalGorunur(false);
    // Modal kapandiktan sonra scanner ac
    setTimeout(() => {
      setScannerAcik(true);
    }, 300);
  };

  // Arama
  const aramaYap = useCallback(async (veriOverride?: string) => {
    const veri = (veriOverride ?? aramaMetni).trim();
    if (!veri || !calisilanSirket) {
      setStokListesi([]);
      return;
    }
    setYukleniyor(true);
    try {
      const sonuc = await stokKartlariniKodCinsBarkoddanBul(veri, aramaTipi, calisilanSirket);
      if (sonuc.sonuc) {
        setStokListesi(sonuc.data);
        addSearch(veri);
      } else {
        toast.error(sonuc.mesaj || 'Stok aramasi basarisiz.');
        setStokListesi([]);
      }
    } catch (e: any) {
      toast.error(`Stok aramasi sirasinda bir hata olustu.\n${e?.message ?? e}`);
      setStokListesi([]);
    } finally {
      setYukleniyor(false);
    }
  }, [aramaMetni, aramaTipi, calisilanSirket]);

  useEffect(() => {
    if (!aramaMetni.trim()) setStokListesi([]);
  }, [aramaMetni]);

  // Barkod kaydet
  const handleBarkodKaydet = async () => {
    if (!secilenStok) return;
    const barkod = barkodDeger.trim();
    if (!barkod) {
      toast.warning('Lutfen bir barkod giriniz.');
      return;
    }
    setKaydediliyor(true);
    try {
      const sonuc = await barkodKaydet(
        {
          stokKodu: secilenStok.stokKodu,
          barkod,
          birimNo: 0,
          katsayi: 1,
          itemNo: 0,
          fiyatTipi: '0',
          birimAdi: secilenStok.birim,
          fiyatAdi: '0',
        },
        calisilanSirket
      );
      if (sonuc.sonuc) {
        toast.success('Barkod basariyla kaydedildi.');
        setBarkodDeger('');
      } else {
        toast.error(sonuc.mesaj || 'Barkod kaydedilemedi.');
      }
    } catch (e: any) {
      toast.error(`Barkod kaydedilirken bir hata olustu.\n${e?.message ?? e}`);
    } finally {
      setKaydediliyor(false);
    }
  };

  const aramaTipiLabel = ARAMA_TIPLERI.find((t) => t.value === aramaTipi)?.label ?? 'Iceren';

  const renderStokSatiri = ({ item, index }: { item: StokListesiBilgileri; index: number }) => (
    <AnimatedListItem index={index}>
      <TouchableOpacity
        style={styles.stokSatiri}
        onPress={() => {
          hafifTitresim();
          setSecilenStok(item);
        }}
        onLongPress={() => setInfoStoku(item)}
        delayLongPress={400}
      >
        <View style={styles.stokBilgi}>
          <Text style={styles.stokKodu}>{item.stokKodu}</Text>
          <Text style={styles.stokCinsi} numberOfLines={1}>{item.stokCinsi}</Text>
          {item.barkod ? (
            <Text style={styles.stokBarkod}>{item.barkod}</Text>
          ) : null}
        </View>
        <View style={styles.stokSag}>
          <Text style={styles.stokBirim}>{item.birim}</Text>
        </View>
      </TouchableOpacity>
    </AnimatedListItem>
  );

  return (
    <View style={styles.ekran}>
      {/* Ust bar */}
      <View style={styles.ustBar}>
        <View style={styles.ustBarBilgi}>
          <Ionicons name="barcode-outline" size={18} color={Colors.white} />
          <Text style={styles.ustBarText}>Barkod Ekleme</Text>
        </View>
      </View>

      {/* Arama satiri */}
      <View style={styles.aramaRow}>
        <TouchableOpacity
          style={styles.aramaTipiBtn}
          onPress={() => setAramaTipiAcik(!aramaTipiAcik)}
        >
          <Text style={styles.aramaTipiBtnText}>{aramaTipiLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={Colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.aramaInput}
          placeholder="Stok kodu veya urun adi..."
          placeholderTextColor={Colors.gray}
          value={aramaMetni}
          onChangeText={setAramaMetni}
          returnKeyType="search"
          onSubmitEditing={() => aramaYap()}
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => { setAramaMetni(''); setStokListesi([]); }}>
            <Ionicons name="close-circle" size={18} color={Colors.gray} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.araBtn}
          onPress={() => aramaYap()}
        >
          <Ionicons name="search" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Arama tipi dropdown */}
      {aramaTipiAcik && (
        <View style={styles.aramaTipiDropdown}>
          {ARAMA_TIPLERI.map((tip) => (
            <TouchableOpacity
              key={tip.value}
              style={[
                styles.aramaTipiItem,
                tip.value === aramaTipi && styles.aramaTipiItemActive,
              ]}
              onPress={() => {
                setAramaTipi(tip.value);
                setAramaTipiAcik(false);
              }}
            >
              <Text
                style={[
                  styles.aramaTipiItemText,
                  tip.value === aramaTipi && styles.aramaTipiItemTextActive,
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

      {/* Son Aramalar */}
      {recentSearches.length > 0 && stokListesi.length === 0 && !yukleniyor && (
        <View style={styles.sonAramalarContainer}>
          <View style={styles.sonAramalarBaslik}>
            <Text style={styles.sonAramalarLabel}>Son Aramalar</Text>
            <TouchableOpacity onPress={() => clearRecentSearches()}>
              <Text style={styles.sonAramalarTemizle}>Temizle</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentSearches.map((term, i) => (
              <TouchableOpacity
                key={`${term}-${i}`}
                style={styles.sonAramaChip}
                onPress={() => { setAramaMetni(term); aramaYap(term); }}
              >
                <Ionicons name="time-outline" size={14} color={Colors.primary} />
                <Text style={styles.sonAramaChipText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Liste baslik */}
      <View style={styles.listeBaslik}>
        <Text style={[styles.listeBaslikText, { flex: 1.2 }]}>KOD</Text>
        <Text style={[styles.listeBaslikText, { flex: 2 }]}>CINS</Text>
        <Text style={[styles.listeBaslikText, { flex: 0.6, textAlign: 'right' }]}>BIRIM</Text>
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
              baslik={aramaMetni.trim() ? 'Sonuc bulunamadi' : 'Urun arayin'}
              aciklama={aramaMetni.trim() ? 'Farkli bir arama kriteri deneyiniz' : 'Aramak icin yukaridaki arama cubugunu kullanin'}
            />
          )
        }
      />

      {/* ==================== BARKOD EKLEME MODAL ==================== */}
      <Modal
        visible={modalGorunur}
        animationType="slide"
        transparent
        onRequestClose={handleModalKapat}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal baslik */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalStokKodu}>{secilenStok?.stokKodu}</Text>
                <Text style={styles.modalStokCinsi} numberOfLines={2}>{secilenStok?.stokCinsi}</Text>
              </View>
              <TouchableOpacity onPress={handleModalKapat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={28} color={Colors.gray} />
              </TouchableOpacity>
            </View>

            {/* Stok bilgileri */}
            <View style={styles.stokDetayRow}>
              <View style={styles.stokDetayItem}>
                <Text style={styles.stokDetayLabel}>Stok Kodu</Text>
                <Text style={styles.stokDetayDeger}>{secilenStok?.stokKodu}</Text>
              </View>
              <View style={styles.stokDetayItem}>
                <Text style={styles.stokDetayLabel}>Birim</Text>
                <Text style={styles.stokDetayDeger}>{secilenStok?.birim}</Text>
              </View>
            </View>

            {/* Barkod girme alani */}
            <Text style={styles.barkodLabel}>Barkod</Text>
            <View style={styles.barkodInputRow}>
              <TextInput
                style={styles.barkodInput}
                placeholder="Barkod giriniz..."
                placeholderTextColor={Colors.gray}
                value={barkodDeger}
                onChangeText={setBarkodDeger}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleBarkodKaydet}
              />
              <TouchableOpacity
                style={styles.barkodScanBtn}
                onPress={handleScanButonPress}
              >
                <Ionicons name="barcode-outline" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Kaydet butonu */}
            <TouchableOpacity
              style={[styles.kaydetBtn, kaydediliyor && styles.kaydetBtnDisabled]}
              onPress={handleBarkodKaydet}
              disabled={kaydediliyor}
            >
              {kaydediliyor ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={Colors.white} />
                  <Text style={styles.kaydetBtnText}>Kaydet</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Barkod scanner */}
      <BarcodeScannerModal
        visible={scannerAcik}
        onClose={() => {
          setScannerAcik(false);
          // Scanner kapatildiginda, stok secili ise modali geri ac
          if (bekleyenScanRef.current) {
            bekleyenScanRef.current = false;
            setTimeout(() => setModalGorunur(true), 300);
          }
        }}
        manuelOkuma={manuelOkuma}
        baslangicZoom={baslangicZoom}
        onDetected={(barkod) => {
          setScannerAcik(false);
          hafifTitresim();
          setBarkodDeger(barkod);
          // Scan sonrasi modali geri ac
          if (bekleyenScanRef.current) {
            bekleyenScanRef.current = false;
            setTimeout(() => setModalGorunur(true), 300);
          }
        }}
      />

      {/* Stok info modal */}
      <StokInfoModal
        stokKodu={infoStoku?.stokKodu ?? null}
        stokCinsi={infoStoku?.stokCinsi ?? ''}
        veriTabaniAdi={calisilanSirket}
        onClose={() => setInfoStoku(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: Colors.lightGray ?? '#f5f5f5' },
  ustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ustBarBilgi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ustBarText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 10,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  aramaTipiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray ?? '#f5f5f5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  aramaTipiBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.black,
    paddingVertical: 2,
  },
  araBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    padding: 8,
  },
  aramaTipiDropdown: {
    backgroundColor: Colors.white,
    marginHorizontal: 10,
    marginTop: -6,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderBottomColor: Colors.border,
  },
  aramaTipiItemActive: {
    backgroundColor: `${Colors.primary}10`,
  },
  aramaTipiItemText: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  aramaTipiItemTextActive: {
    fontWeight: '600',
    color: Colors.primary,
  },
  sonAramalarContainer: {
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  sonAramalarBaslik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sonAramalarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  sonAramalarTemizle: {
    fontSize: 12,
    color: Colors.primary,
  },
  sonAramaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sonAramaChipText: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  listeBaslik: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.white,
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
  stokKodu: { fontSize: 11, color: Colors.gray, fontWeight: '600' },
  stokCinsi: { fontSize: 14, color: Colors.darkGray, fontWeight: '500', marginTop: 2 },
  stokBarkod: { fontSize: 11, color: Colors.gray, marginTop: 1 },
  stokSag: { flex: 0.8, alignItems: 'flex-end', justifyContent: 'center' },
  stokBirim: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  ayirac: { height: 4 },

  // ==================== MODAL STYLES ====================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalStokKodu: {
    fontSize: 13,
    color: Colors.gray,
    fontWeight: '600',
  },
  modalStokCinsi: {
    fontSize: 17,
    color: Colors.darkGray,
    fontWeight: '700',
    marginTop: 2,
  },
  stokDetayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.lightGray ?? '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  stokDetayItem: {
    alignItems: 'center',
  },
  stokDetayLabel: {
    fontSize: 11,
    color: Colors.gray,
    fontWeight: '600',
  },
  stokDetayDeger: {
    fontSize: 15,
    color: Colors.darkGray,
    fontWeight: '700',
    marginTop: 2,
  },
  barkodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 6,
  },
  barkodInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  barkodInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.darkGray,
    backgroundColor: Colors.inputBackground,
  },
  barkodScanBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 12,
  },
  kaydetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success ?? '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  kaydetBtnDisabled: {
    opacity: 0.6,
  },
  kaydetBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
