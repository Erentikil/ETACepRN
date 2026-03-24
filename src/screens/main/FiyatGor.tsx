import React, { useState, useEffect, useCallback } from 'react';
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
import { stokKartlariniKodCinsBarkoddanBul, tekStokFiyatBilgisiniAl } from '../../api/hizliIslemlerApi';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import StokInfoModal from '../../components/StokInfoModal';
import { useTarayiciAyarlari } from '../../hooks/useTarayiciAyarlari';
import { Colors } from '../../constants/Colors';
import { Config } from '../../constants/Config';
import { paraTL, miktarFormat } from '../../utils/format';
import type { StokListesiBilgileri, StokFiyatBilgileri } from '../../models';
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

export default function FiyatGor() {
  const { yetkiBilgileri, fiyatTipListesi, calisilanSirket } = useAppStore();
  const { recentSearches, addSearch, clearAll: clearRecentSearches } = useRecentSearches();

  const [stokListesi, setStokListesi] = useState<StokListesiBilgileri[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaTipi, setAramaTipi] = useState(3);
  const [aramaTipiAcik, setAramaTipiAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
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

  // Secili fiyat bilgisi
  const seciliFiyat = stokFiyatlari.find((f) => f.fiyatNo === secilenFiyatNo);
  const gosterilecekFiyat = seciliFiyat?.tutar ?? secilenStok?.fiyat ?? 0;
  const gosterilecekDoviz = seciliFiyat?.dovizKodu ?? secilenStok?.dovizKodu ?? '';

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
          <Text style={styles.stokFiyat}>{paraTL(item.fiyat)}</Text>
          <Text style={styles.stokBakiye}>{miktarFormat(item.bakiye)} {item.birim2?.split(';')[0]?.trim() || item.birim}</Text>
        </View>
      </TouchableOpacity>
    </AnimatedListItem>
  );

  return (
    <View style={styles.ekran}>
      {/* Ust bar - barkod */}
      <View style={styles.ustBar}>
        <View style={styles.ustBarBilgi}>
          <Ionicons name="pricetag-outline" size={18} color={Colors.white} />
          <Text style={styles.ustBarText}>Fiyat Gor</Text>
        </View>
        <TouchableOpacity
          style={styles.barkodBtn}
          onPress={() => setScannerAcik(true)}
        >
          <Ionicons name="barcode-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Arama satirii */}
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
          placeholder="Stok kodu, urun adi veya barkod..."
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
              baslik={aramaMetni.trim() ? 'Sonuc bulunamadi' : 'Urun arayin'}
              aciklama={aramaMetni.trim() ? 'Farkli bir arama kriteri deneyiniz' : 'Aramak icin yukaridaki arama cubugunu kullanin'}
            />
          )
        }
      />

      {/* Alt barkod butonu */}
      <View style={styles.altBar}>
        <TouchableOpacity
          style={styles.altBarkodBtnFull}
          onPress={() => setScannerAcik(true)}
        >
          <Ionicons name="barcode-outline" size={24} color={Colors.white} />
          <Text style={styles.altBarkodText}>Barkod Tara</Text>
        </TouchableOpacity>
      </View>

      {/* ==================== FIYAT DETAY MODAL ==================== */}
      <Modal
        visible={!!secilenStok}
        animationType="slide"
        transparent
        onRequestClose={() => setSecilenStok(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal baslik */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalStokKodu}>{secilenStok?.stokKodu}</Text>
                <Text style={styles.modalStokCinsi} numberOfLines={2}>{secilenStok?.stokCinsi}</Text>
              </View>
              <TouchableOpacity onPress={() => setSecilenStok(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={28} color={Colors.gray} />
              </TouchableOpacity>
            </View>

            {/* Buyuk fiyat gosterimi */}
            <View style={styles.buyukFiyatContainer}>
              {fiyatYukleniyor ? (
                <ActivityIndicator size="large" color={Colors.primary} />
              ) : (
                <>
                  <Text style={styles.buyukFiyat}>{paraTL(gosterilecekFiyat)}</Text>
                  {gosterilecekDoviz ? (
                    <Text style={styles.dovizKodu}>{gosterilecekDoviz}</Text>
                  ) : null}
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

            {/* Fiyat No combobox */}
            <Text style={styles.fiyatNoLabel}>Fiyat Tipi</Text>
            <TouchableOpacity
              style={styles.fiyatNoSelector}
              onPress={() => setFiyatNoDropdownAcik(!fiyatNoDropdownAcik)}
            >
              <Text style={styles.fiyatNoSelectorText}>
                {secilenFiyatNo > 0
                  ? `${secilenFiyatNo} - ${fiyatTipListesi.find((f) => f.fiyatNo === secilenFiyatNo)?.fiyatAdi ?? 'Fiyat ' + secilenFiyatNo}`
                  : 'Fiyat tipi seciniz...'}
              </Text>
              <Ionicons name={fiyatNoDropdownAcik ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.primary} />
            </TouchableOpacity>

            {/* Fiyat tipi dropdown */}
            {fiyatNoDropdownAcik && (
              <View style={styles.fiyatNoDropdown}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {fiyatTipListesi.map((ft) => {
                    const fiyatBilgisi = stokFiyatlari.find((sf) => sf.fiyatNo === ft.fiyatNo);
                    return (
                      <TouchableOpacity
                        key={ft.fiyatNo}
                        style={[
                          styles.fiyatNoItem,
                          ft.fiyatNo === secilenFiyatNo && styles.fiyatNoItemActive,
                        ]}
                        onPress={() => {
                          setSecilenFiyatNo(ft.fiyatNo);
                          setFiyatNoDropdownAcik(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[
                            styles.fiyatNoItemText,
                            ft.fiyatNo === secilenFiyatNo && styles.fiyatNoItemTextActive,
                          ]}>
                            {ft.fiyatNo} - {ft.fiyatAdi}
                          </Text>
                          {fiyatBilgisi && (
                            <Text style={styles.fiyatNoItemFiyat}>
                              {paraTL(fiyatBilgisi.tutar)} {fiyatBilgisi.dovizKodu}
                            </Text>
                          )}
                        </View>
                        {ft.fiyatNo === secilenFiyatNo && (
                          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Tum fiyatlar listesi */}
            {!fiyatNoDropdownAcik && stokFiyatlari.length > 0 && (
              <View style={styles.tumFiyatlarContainer}>
                <Text style={styles.tumFiyatlarBaslik}>Tum Fiyatlar</Text>
                {stokFiyatlari.map((sf) => (
                  <TouchableOpacity
                    key={sf.fiyatNo}
                    style={[
                      styles.tumFiyatSatiri,
                      sf.fiyatNo === secilenFiyatNo && styles.tumFiyatSatiriAktif,
                    ]}
                    onPress={() => setSecilenFiyatNo(sf.fiyatNo)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tumFiyatAdi}>{sf.fiyatNo} - {sf.fiyatAdi}</Text>
                    </View>
                    <Text style={[
                      styles.tumFiyatTutar,
                      sf.fiyatNo === secilenFiyatNo && { color: Colors.primary },
                    ]}>
                      {paraTL(sf.tutar)} {sf.dovizKodu}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Stok bilgileri */}
            <View style={styles.stokDetayRow}>
              <View style={styles.stokDetayItem}>
                <Text style={styles.stokDetayLabel}>Bakiye</Text>
                <Text style={styles.stokDetayDeger}>{miktarFormat(secilenStok?.bakiye ?? 0)}</Text>
              </View>
              <View style={styles.stokDetayItem}>
                <Text style={styles.stokDetayLabel}>Birim</Text>
                <Text style={styles.stokDetayDeger}>{secilenStok?.birim2?.split(';')[0]?.trim() || secilenStok?.birim}</Text>
              </View>
              <View style={styles.stokDetayItem}>
                <Text style={styles.stokDetayLabel}>KDV</Text>
                <Text style={styles.stokDetayDeger}>%{secilenStok?.kdvOrani ?? 0}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barkod scanner */}
      <BarcodeScannerModal
        visible={scannerAcik}
        onClose={() => setScannerAcik(false)}
        manuelOkuma={manuelOkuma}
        baslangicZoom={baslangicZoom}
        onDetected={(barkod) => {
          setScannerAcik(false);
          hafifTitresim();
          setAramaMetni(barkod);
          setAramaTipi(0);
          stokKartlariniKodCinsBarkoddanBul(barkod, 0, calisilanSirket).then((sonuc) => {
            if (sonuc.sonuc && sonuc.data.length > 0) {
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
  barkodBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
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
  stokSag: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  stokFiyat: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  stokBakiye: { fontSize: 11, color: Colors.gray, marginTop: 2 },
  ayirac: { height: 4 },
  altBar: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  altBarkodBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  altBarkodText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },

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
    maxHeight: '85%',
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
  buyukFiyatContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: Colors.lightGray ?? '#f5f5f5',
    borderRadius: 16,
    marginBottom: 16,
  },
  buyukFiyat: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.primary,
  },
  dovizKodu: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '600',
    marginTop: 4,
  },
  fiyatAdi: {
    fontSize: 13,
    color: Colors.accent,
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
    color: Colors.accent,
  },
  fiyatNoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 6,
  },
  fiyatNoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.inputBackground,
    marginBottom: 12,
  },
  fiyatNoSelectorText: {
    fontSize: 14,
    color: Colors.darkGray,
    fontWeight: '500',
  },
  fiyatNoDropdown: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: Colors.white,
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
    borderBottomColor: Colors.border,
  },
  fiyatNoItemActive: {
    backgroundColor: `${Colors.primary}10`,
  },
  fiyatNoItemText: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  fiyatNoItemTextActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  fiyatNoItemFiyat: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  tumFiyatlarContainer: {
    marginBottom: 12,
  },
  tumFiyatlarBaslik: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 8,
  },
  tumFiyatSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.lightGray ?? '#f5f5f5',
    borderRadius: 8,
    marginBottom: 4,
  },
  tumFiyatSatiriAktif: {
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tumFiyatAdi: {
    fontSize: 13,
    color: Colors.darkGray,
    fontWeight: '500',
  },
  tumFiyatTutar: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.darkGray,
  },
  stokDetayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.lightGray ?? '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 14,
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
});
