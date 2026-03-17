import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { cariEkstreBilgileriAl } from '../../api/cariEkstreApi';
import { raporPdfAl } from '../../api/raporApi';
import { Colors } from '../../constants/Colors';
import type { CariEkstreBilgileri, CariKartBilgileri } from '../../models';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<DrawerParamList, 'CariEkstreListesi'>;

// "yyyyMMdd" formatında string döndürür
function tarihFormatla(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${g}`;
}

function ayBaslangic(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function ayBitis(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function ayBasligiFormatla(d: Date): string {
  return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
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
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { calisilanSirket } = useAppStore();

  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [secilenAy, setSecilenAy] = useState(new Date());
  const [liste, setListe] = useState<CariEkstreBilgileri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  // CariSecim'den geri dönünce
  useEffect(() => {
    if (route.params?.secilenCari) {
      setSecilenCari(route.params.secilenCari);
    }
  }, [route.params?.secilenCari]);

  const ekstreYukle = useCallback(async (cari: CariKartBilgileri, ay: Date) => {
    setYukleniyor(true);
    try {
      const ilk = tarihFormatla(ayBaslangic(ay));
      const son = tarihFormatla(ayBitis(ay));
      const sonuc = await cariEkstreBilgileriAl(cari.cariKodu, ilk, son, calisilanSirket);
      if (sonuc.sonuc) {
        setListe(sonuc.data ?? []);
      } else {
        Alert.alert('Hata', sonuc.mesaj || 'Ekstre alınamadı.');
      }
    } catch (err: any) {
      const mesaj = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message ?? String(err);
      Alert.alert('Hata', mesaj);
    } finally {
      setYukleniyor(false);
    }
  }, [calisilanSirket]);

  useEffect(() => {
    if (secilenCari) {
      ekstreYukle(secilenCari, secilenAy);
    }
  }, [secilenCari, secilenAy]);

  const pdfAc = async () => {
    if (!secilenCari) return;
    setPdfYukleniyor(true);
    try {
      const ilk = tarihFormatla(ayBaslangic(secilenAy));
      const son = tarihFormatla(ayBitis(secilenAy));
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
      Alert.alert('Hata', mesaj);
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

  const ayDegistir = (yon: -1 | 1) => {
    setSecilenAy((prev) => new Date(prev.getFullYear(), prev.getMonth() + yon, 1));
  };

  // Özet hesapla
  const toplamBorc = liste.reduce((t, k) => t + k.borc, 0);
  const toplamAlacak = liste.reduce((t, k) => t + k.alacak, 0);
  const sonBakiye = liste.length > 0 ? liste[liste.length - 1].bakiye : 0;

  const renderKalem = ({ item }: { item: CariEkstreBilgileri }) => (
    <View style={styles.kalemKart}>
      {/* Satır 1: tarih | tipKodu | aciklama */}
      <View style={styles.kalemUstSatir}>
        <Text style={styles.kalemTarih}>{tarihGoster(item.tarih)}</Text>
        <Text style={styles.kalemTip}>{item.tipKodu}</Text>
        <Text style={styles.kalemAciklama} numberOfLines={1}>
          {item.aciklama}
        </Text>
      </View>
      {/* Satır 2: başlıklar */}
      <View style={styles.kalemBaslikSatir}>
        <Text style={[styles.kalemBaslik, styles.sag]}>Borç</Text>
        <Text style={[styles.kalemBaslik, styles.sag]}>Alacak</Text>
        <Text style={[styles.kalemBaslik, styles.sag]}>Bakiye</Text>
      </View>
      {/* Satır 3: değerler */}
      <View style={styles.kalemDegerSatir}>
        <Text style={[styles.kalemDeger, styles.sag]}>
          {item.borc > 0 ? sayiFormatla(item.borc) : '-'}
        </Text>
        <Text style={[styles.kalemDeger, styles.sag]}>
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
    <View style={styles.ekran}>
      {/* PDF Modal */}
      <Modal visible={!!pdfUri} animationType="slide" onRequestClose={() => setPdfUri(null)}>
        <SafeAreaView style={styles.pdfModal}>
          <View style={styles.pdfBaslik}>
            <Text style={styles.pdfBaslikMetin} numberOfLines={1}>
              {secilenCari?.cariUnvan} — {ayBasligiFormatla(secilenAy)}
            </Text>
            <TouchableOpacity onPress={pdfPaylas} style={styles.pdfPaylasBtn}>
              <Ionicons name="share-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPdfUri(null)} style={styles.pdfKapatBtn}>
              <Ionicons name="close" size={24} color={Colors.darkGray} />
            </TouchableOpacity>
          </View>
          {pdfUri && (
            <WebView
              source={{ uri: pdfUri }}
              style={{ flex: 1 }}
              originWhitelist={['*']}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Cari seçim butonu */}
      <TouchableOpacity
        style={styles.cariBtn}
        onPress={() => navigation.navigate('CariSecim', { returnScreen: 'CariEkstreListesi' })}
      >
        <Ionicons
          name="person-outline"
          size={18}
          color={secilenCari ? Colors.primary : Colors.gray}
        />
        <Text style={[styles.cariText, secilenCari && styles.cariTextSecili]} numberOfLines={1}>
          {secilenCari ? secilenCari.cariUnvan : 'Lütfen cari seçiniz...'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
      </TouchableOpacity>

      {/* Ay seçici */}
      <View style={styles.aySecici}>
        <TouchableOpacity
          style={[styles.ayBtn, !secilenCari && styles.ayBtnDisabled]}
          onPress={pdfAc}
          disabled={!secilenCari || pdfYukleniyor}
        >
          {pdfYukleniyor
            ? <ActivityIndicator size={16} color={Colors.white} />
            : <Ionicons name="document-outline" size={20} color={Colors.white} />
          }
        </TouchableOpacity>
        <View style={styles.ayNavGrup}>
          <TouchableOpacity style={styles.ayBtn} onPress={() => ayDegistir(-1)}>
            <Ionicons name="chevron-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.ayBaslik}>{ayBasligiFormatla(secilenAy)}</Text>
          <TouchableOpacity style={styles.ayBtn} onPress={() => ayDegistir(1)}>
            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.ayBtnPlaceholder} />
      </View>

      {/* Özet şerit */}
      {liste.length > 0 && (
        <View style={styles.ozetBar}>
          <View style={styles.ozetKalem}>
            <Text style={styles.ozetBaslik}>Toplam Borç</Text>
            <Text style={[styles.ozetDeger, { color: Colors.error }]}>
              {sayiFormatla(toplamBorc)}
            </Text>
          </View>
          <View style={styles.ozetAyrac} />
          <View style={styles.ozetKalem}>
            <Text style={styles.ozetBaslik}>Toplam Alacak</Text>
            <Text style={[styles.ozetDeger, { color: Colors.success }]}>
              {sayiFormatla(toplamAlacak)}
            </Text>
          </View>
          <View style={styles.ozetAyrac} />
          <View style={styles.ozetKalem}>
            <Text style={styles.ozetBaslik}>Son Bakiye</Text>
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
          <Text style={styles.beklemeMetin}>Ekstre görmek için cari seçin</Text>
        </View>
      ) : yukleniyor ? (
        <View style={styles.beklemeEkran}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.beklemeMetin}>Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(item, idx) => `${item.evrakNo}-${idx}`}
          renderItem={renderKalem}
          contentContainerStyle={styles.liste}
          ItemSeparatorComponent={() => <View style={styles.ayirac} />}
          ListEmptyComponent={
            <View style={styles.beklemeEkran}>
              <Ionicons name="document-text-outline" size={56} color={Colors.border} />
              <Text style={styles.beklemeMetin}>Bu dönemde kayıt bulunamadı</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  cariBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cariText: {
    flex: 1,
    fontSize: 14,
    color: Colors.gray,
  },
  cariTextSecili: {
    color: Colors.darkGray,
    fontWeight: '600',
  },
  aySecici: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.white,
  },
  pdfBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  pdfBaslikMetin: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  pdfPaylasBtn: {
    padding: 6,
  },
  pdfKapatBtn: {
    padding: 6,
  },
  ayBaslik: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  ozetBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ozetKalem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  ozetBaslik: {
    fontSize: 10,
    color: Colors.gray,
    fontWeight: '600',
  },
  ozetDeger: {
    fontSize: 13,
    fontWeight: '700',
  },
  ozetAyrac: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  liste: {
    padding: 10,
    paddingBottom: 24,
  },
  kalemKart: {
    backgroundColor: Colors.white,
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
    color: Colors.gray,
    fontWeight: '600',
    width: 56,
  },
  kalemTip: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
    width: 52,
  },
  kalemAciklama: {
    flex: 1,
    fontSize: 12,
    color: Colors.darkGray,
  },
  kalemBaslikSatir: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  kalemBaslik: {
    flex: 1,
    fontSize: 10,
    color: Colors.gray,
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
    color: Colors.error,
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
    color: Colors.gray,
    textAlign: 'center',
  },
});
