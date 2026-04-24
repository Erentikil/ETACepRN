import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  RefreshControl,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';
import PdfViewer from '../../components/PdfViewer';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { cariEkstreBilgileriAl } from '../../api/cariEkstreApi';
import { raporPdfAl } from '../../api/raporApi';
import { useColors } from '../../contexts/ThemeContext';
import { toast } from '../../components/Toast';
import type { CariEkstreBilgileri, CariKartBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<DrawerParamList, 'CariEkstreListesi'>;

// "yyyyMMdd" formatında string döndürür
function tarihFormatla(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${g}`;
}

function yilBaslangic(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function tarihKisaFormatla(d: Date): string {
  const g = String(d.getDate()).padStart(2, '0');
  const a = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${g}.${a}.${y}`;
}

function tarihGoster(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

function sayiFormatla(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CariEkstreListesi() {
  const Colors = useColors();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { calisilanSirket, pendingCari, clearPendingCari } = useAppStore();

  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [baslangicTarihi, setBaslangicTarihi] = useState<Date>(() => yilBaslangic(new Date()));
  const [bitisTarihi, setBitisTarihi] = useState<Date>(() => new Date());
  const [tarihModalAcik, setTarihModalAcik] = useState(false);
  const [tarihPickerHedef, setTarihPickerHedef] = useState<'bas' | 'bit' | null>(null);
  const [liste, setListe] = useState<CariEkstreBilgileri[]>([]);
  const [ilkYuklemeYapildi, setIlkYuklemeYapildi] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  // CariSecim'den geri dönünce (route params — "+" butonu akışı)
  useEffect(() => {
    if (route.params?.secilenCari) {
      setSecilenCari(route.params.secilenCari);
      setTarihModalAcik(true);
    }
  }, [route.params?.secilenCari]);

  // CariSecim'den geri dönünce (pendingCari — normal seçim akışı)
  useFocusEffect(
    useCallback(() => {
      if (pendingCari?.target === 'CariEkstreListesi') {
        setSecilenCari(pendingCari.cari);
        clearPendingCari();
        setTarihModalAcik(true);
      }
    }, [pendingCari])
  );

  // Sayfa blur olunca state'i ve route.params'ı temizle ki tekrar girişte eski veri görünmesin
  useEffect(() => {
    const unsub = navigation.addListener('blur', () => {
      setSecilenCari(null);
      setListe([]);
      setIlkYuklemeYapildi(false);
      setBaslangicTarihi(yilBaslangic(new Date()));
      setBitisTarihi(new Date());
      setTarihModalAcik(false);
      setTarihPickerHedef(null);
      navigation.setParams({ secilenCari: undefined, kaynakEkran: undefined } as any);
    });
    return unsub;
  }, [navigation]);

  const ekstreYukle = useCallback(async (cari: CariKartBilgileri, bas: Date, bit: Date) => {
    setYukleniyor(true);
    try {
      const ilk = tarihFormatla(bas);
      const son = tarihFormatla(bit);
      const sonuc = await cariEkstreBilgileriAl(cari.cariKodu, ilk, son, calisilanSirket);
      if (sonuc.sonuc) {
        setListe(sonuc.data ?? []);
      } else {
        toast.error(sonuc.mesaj || 'Ekstre alınamadı.');
      }
    } catch (err: any) {
      const mesaj = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message ?? String(err);
      toast.error(mesaj);
    } finally {
      setYukleniyor(false);
      setIlkYuklemeYapildi(true);
    }
  }, [calisilanSirket]);

  useEffect(() => {
    if (secilenCari && !tarihModalAcik) {
      ekstreYukle(secilenCari, baslangicTarihi, bitisTarihi);
    }
  }, [secilenCari, baslangicTarihi, bitisTarihi, tarihModalAcik]);

  const pdfAc = async () => {
    if (!secilenCari) return;
    setPdfYukleniyor(true);
    try {
      const ilk = tarihFormatla(baslangicTarihi);
      const son = tarihFormatla(bitisTarihi);
      const base64 = await raporPdfAl({
        dizaynAdi: 'Mobil_CariEkstreDizayn.repx',
        evrakTipi: 'CariEkstre',
        parametre1: son,
        parametre2: secilenCari.cariKodu,
        parametre3: ilk,
        veriTabaniAdi: calisilanSirket,
      });
      const dosyaYolu = FileSystem.cacheDirectory + 'cari_ekstre.pdf';
      await FileSystem.writeAsStringAsync(dosyaYolu, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfUri(dosyaYolu);
    } catch (err: any) {
      const mesaj = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message ?? String(err);
      toast.error(mesaj);
    } finally {
      setPdfYukleniyor(false);
    }
  };

  const pdfPaylas = async () => {
    if (!pdfUri) return;
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Cari Ekstre PDF',
    });
  };

  const onTarihPickerDegis = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setTarihPickerHedef(null);
    if (!selected) return;
    if (tarihPickerHedef === 'bas') setBaslangicTarihi(selected);
    else if (tarihPickerHedef === 'bit') setBitisTarihi(selected);
  };

  // Özet hesapla
  const toplamBorc = liste.reduce((t, k) => t + k.borc, 0);
  const toplamAlacak = liste.reduce((t, k) => t + k.alacak, 0);
  const sonBakiye = liste.length > 0 ? liste[liste.length - 1].bakiye : 0;

  const renderKalem = ({ item }: { item: CariEkstreBilgileri }) => (
    <View style={[styles.kalemKart, { backgroundColor: Colors.card }]}>
      {/* Satır 1: tarih | tipKodu | aciklama */}
      <View style={styles.kalemUstSatir}>
        <Text style={[styles.kalemTarih, { color: Colors.textSecondary }]}>{tarihGoster(item.tarih)}</Text>
        <Text style={[styles.kalemTip, { color: Colors.primary }]}>{item.tipKodu}</Text>
        <Text style={[styles.kalemAciklama, { color: Colors.text }]} numberOfLines={1}>
          {item.aciklama}
        </Text>
      </View>
      {/* Satır 2: başlıklar */}
      <View style={styles.kalemBaslikSatir}>
        <Text style={[styles.kalemBaslik, styles.sag, { color: Colors.textSecondary }]}>Borç</Text>
        <Text style={[styles.kalemBaslik, styles.sag, { color: Colors.textSecondary }]}>Alacak</Text>
        <Text style={[styles.kalemBaslik, styles.sag, { color: Colors.textSecondary }]}>Bakiye</Text>
      </View>
      {/* Satır 3: değerler */}
      <View style={styles.kalemDegerSatir}>
        <Text style={[styles.kalemDeger, styles.sag, { color: Colors.error }]}>
          {item.borc > 0 ? sayiFormatla(item.borc) : '-'}
        </Text>
        <Text style={[styles.kalemDeger, styles.sag, { color: Colors.error }]}>
          {item.alacak > 0 ? sayiFormatla(item.alacak) : '-'}
        </Text>
        <Text
          style={[
            styles.kalemDeger,
            styles.sag,
            { color: item.bakiye >= 0 ? Colors.error : Colors.success },
          ]}
        >
          {sayiFormatla(item.bakiye)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      {/* PDF Modal */}
      <Modal visible={!!pdfUri} animationType="slide" onRequestClose={() => setPdfUri(null)}>
        <SafeAreaView style={[styles.pdfModal, { backgroundColor: Colors.card }]}>
          <View style={[styles.pdfBaslik, { borderBottomColor: Colors.border }]}>
            <Text style={[styles.pdfBaslikMetin, { color: Colors.text }]} numberOfLines={1}>
              {secilenCari?.cariUnvan} — {tarihKisaFormatla(baslangicTarihi)} / {tarihKisaFormatla(bitisTarihi)}
            </Text>
            <TouchableOpacity onPress={pdfPaylas} style={styles.pdfPaylasBtn}>
              <Ionicons name="share-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPdfUri(null)} style={styles.pdfKapatBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          {pdfUri && (
            <PdfViewer fileUri={pdfUri} style={{ flex: 1 }} />
          )}
        </SafeAreaView>
      </Modal>

      {/* Cari seçim butonu — yalnızca cari yokken göster */}
      {!secilenCari && route.params?.kaynakEkran !== 'CariSecim' && route.params?.kaynakEkran !== 'Tahsilatlar' && (
        <TouchableOpacity
          style={[styles.cariBtn, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}
          onPress={() => navigation.navigate('CariSecim', { returnScreen: 'CariEkstreListesi' })}
        >
          <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
          <Text style={[styles.cariText, { color: Colors.textSecondary }]} numberOfLines={1}>
            Lütfen cari seçiniz...
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Tarih aralığı şeridi — cari seçildikten sonra readonly + geri butonu */}
      <View style={[styles.aySecici, { backgroundColor: Colors.primary }]}>
        {secilenCari && route.params?.kaynakEkran !== 'CariSecim' && route.params?.kaynakEkran !== 'Tahsilatlar' ? (
          <TouchableOpacity
            style={styles.ayBtn}
            onPress={() => {
              setSecilenCari(null);
              setListe([]);
              setIlkYuklemeYapildi(false);
              setTarihModalAcik(false);
              setTarihPickerHedef(null);
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.ayBtnPlaceholder} />
        )}
        <View style={styles.ayNavGrup}>
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.ayBaslik}>
            {tarihKisaFormatla(baslangicTarihi)} — {tarihKisaFormatla(bitisTarihi)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.ayBtn, !secilenCari && styles.ayBtnDisabled]}
          onPress={pdfAc}
          disabled={!secilenCari || pdfYukleniyor}
        >
          {pdfYukleniyor
            ? <ActivityIndicator size={16} color="#fff" />
            : <Ionicons name="document-outline" size={20} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {/* Tarih aralığı modal */}
      <Modal
        visible={tarihModalAcik}
        transparent
        animationType="fade"
        onRequestClose={() => setTarihModalAcik(false)}
      >
        <View style={styles.tarihModalOverlay}>
          <View style={[styles.tarihModalKutu, { backgroundColor: Colors.card }]}>
            <Text style={[styles.tarihModalBaslik, { color: Colors.text }]}>
              Tarih Aralığı Seçiniz
            </Text>
            <View style={styles.tarihSatir}>
              <View style={styles.tarihAlan}>
                <Text style={[styles.tarihEtiket, { color: Colors.textSecondary }]}>Başlangıç</Text>
                <TouchableOpacity
                  style={[
                    styles.tarihBtn,
                    { backgroundColor: Colors.background, borderColor: tarihPickerHedef === 'bas' ? Colors.primary : Colors.border },
                  ]}
                  onPress={() => setTarihPickerHedef(tarihPickerHedef === 'bas' ? null : 'bas')}
                >
                  <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                  <Text style={[styles.tarihBtnText, { color: Colors.text }]}>
                    {tarihKisaFormatla(baslangicTarihi)}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tarihAlan}>
                <Text style={[styles.tarihEtiket, { color: Colors.textSecondary }]}>Bitiş</Text>
                <TouchableOpacity
                  style={[
                    styles.tarihBtn,
                    { backgroundColor: Colors.background, borderColor: tarihPickerHedef === 'bit' ? Colors.primary : Colors.border },
                  ]}
                  onPress={() => setTarihPickerHedef(tarihPickerHedef === 'bit' ? null : 'bit')}
                >
                  <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                  <Text style={[styles.tarihBtnText, { color: Colors.text }]}>
                    {tarihKisaFormatla(bitisTarihi)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {tarihPickerHedef && Platform.OS === 'ios' && (
              <DateTimePicker
                value={tarihPickerHedef === 'bas' ? baslangicTarihi : bitisTarihi}
                mode="date"
                display="spinner"
                locale="tr-TR"
                onChange={onTarihPickerDegis}
                textColor={Colors.text}
                themeVariant="light"
                style={{ alignSelf: 'stretch' }}
              />
            )}
            {tarihPickerHedef && Platform.OS === 'android' && (
              <DateTimePicker
                value={tarihPickerHedef === 'bas' ? baslangicTarihi : bitisTarihi}
                mode="date"
                display="default"
                locale="tr-TR"
                onChange={onTarihPickerDegis}
              />
            )}

            <View style={styles.tarihModalButonlar}>
              <TouchableOpacity
                style={[styles.tarihModalBtn, { borderColor: Colors.border }]}
                onPress={() => {
                  setTarihPickerHedef(null);
                  setTarihModalAcik(false);
                  setSecilenCari(null);
                  setListe([]);
                }}
              >
                <Text style={[styles.tarihModalBtnText, { color: Colors.textSecondary }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tarihModalBtn, { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
                onPress={() => { setTarihPickerHedef(null); setTarihModalAcik(false); }}
              >
                <Text style={[styles.tarihModalBtnText, { color: '#fff', fontWeight: '700' }]}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Özet şerit */}
      {liste.length > 0 && (
        <View style={[styles.ozetBar, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
          <View style={styles.ozetKalem}>
            <Text style={[styles.ozetBaslik, { color: Colors.textSecondary }]}>Toplam Borç</Text>
            <Text style={[styles.ozetDeger, { color: Colors.error }]}>
              {sayiFormatla(toplamBorc)}
            </Text>
          </View>
          <View style={[styles.ozetAyrac, { backgroundColor: Colors.border }]} />
          <View style={styles.ozetKalem}>
            <Text style={[styles.ozetBaslik, { color: Colors.textSecondary }]}>Toplam Alacak</Text>
            <Text style={[styles.ozetDeger, { color: Colors.success }]}>
              {sayiFormatla(toplamAlacak)}
            </Text>
          </View>
          <View style={[styles.ozetAyrac, { backgroundColor: Colors.border }]} />
          <View style={styles.ozetKalem}>
            <Text style={[styles.ozetBaslik, { color: Colors.textSecondary }]}>Son Bakiye</Text>
            <Text
              style={[
                styles.ozetDeger,
                { color: sonBakiye >= 0 ? Colors.error : Colors.success },
              ]}
            >
              {sayiFormatla(sonBakiye)}
            </Text>
          </View>
        </View>
      )}

      {/* İçerik */}
      {!secilenCari ? (
        <View style={styles.beklemeEkran}>
          <Ionicons name="person-circle-outline" size={56} color={Colors.border} />
          <Text style={[styles.beklemeMetin, { color: Colors.textSecondary }]}>Ekstre görmek için cari seçin</Text>
        </View>
      ) : yukleniyor ? (
        <View style={styles.beklemeEkran}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.beklemeMetin, { color: Colors.textSecondary }]}>Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(item, idx) => `${item.evrakNo}-${idx}`}
          renderItem={renderKalem}
          contentContainerStyle={styles.liste}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={() => { if (secilenCari) ekstreYukle(secilenCari, baslangicTarihi, bitisTarihi); }}
              colors={[Colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.ayirac} />}
          ListEmptyComponent={
            ilkYuklemeYapildi
              ? <EmptyState icon="document-text-outline" baslik="Kayıt bulunamadı" aciklama="Bu dönemde ekstre kaydı bulunmamaktadır" />
              : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: {
    flex: 1,
  },
  cariBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
    borderBottomWidth: 1,
  },
  cariText: {
    flex: 1,
    fontSize: 14,
  },
  aySecici: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  ayNavGrup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ayBtnPlaceholder: {
    width: 32,
    height: 32,
  },
  ayBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  ayBtnDisabled: {
    opacity: 0.4,
  },
  pdfModal: {
    flex: 1,
  },
  pdfBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  pdfBaslikMetin: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  pdfPaylasBtn: {
    padding: 6,
  },
  pdfKapatBtn: {
    padding: 6,
  },
  ayBaslik: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  ozetBar: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  ozetKalem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  ozetBaslik: {
    fontSize: 10,
    fontWeight: '600',
  },
  ozetDeger: {
    fontSize: 13,
    fontWeight: '700',
  },
  ozetAyrac: {
    width: 1,
    marginVertical: 2,
  },
  liste: {
    padding: 10,
    paddingBottom: 24,
  },
  kalemKart: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  kalemUstSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kalemTarih: {
    fontSize: 11,
    fontWeight: '600',
    width: 56,
  },
  kalemTip: {
    fontSize: 11,
    fontWeight: '700',
    width: 52,
  },
  kalemAciklama: {
    flex: 1,
    fontSize: 12,
  },
  kalemBaslikSatir: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  kalemBaslik: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
  },
  kalemDegerSatir: {
    flexDirection: 'row',
    gap: 4,
  },
  kalemDeger: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  sag: {
    textAlign: 'right',
  },
  ayirac: {
    height: 6,
  },
  beklemeEkran: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  beklemeMetin: {
    fontSize: 14,
    textAlign: 'center',
  },
  tarihModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  tarihModalKutu: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  tarihModalBaslik: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  tarihSatir: {
    flexDirection: 'row',
    gap: 10,
  },
  tarihAlan: {
    flex: 1,
    gap: 4,
  },
  tarihEtiket: {
    fontSize: 11,
    fontWeight: '600',
  },
  tarihBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  tarihBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tarihModalButonlar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  tarihModalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  tarihModalBtnText: {
    fontSize: 14,
  },
});
