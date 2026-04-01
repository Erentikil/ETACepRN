import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { useAppStore } from '../../store/appStore';
import { cekSenetListesiniAl } from '../../api/cekSenetApi';
import { raporPdfAl } from '../../api/raporApi';
import { useColors } from '../../contexts/ThemeContext';
import { toast } from '../../components/Toast';
import type { CekSenetBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';

function sayiFormatla(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CekSenetListesi() {
  const Colors = useColors();
  const { calisilanSirket } = useAppStore();

  const [liste, setListe] = useState<CekSenetBilgileri[]>([]);
  const [filtrelenmis, setFiltrelenmis] = useState<CekSenetBilgileri[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [secilenKalem, setSecilenKalem] = useState<CekSenetBilgileri | null>(null);

  useEffect(() => {
    veriYukle();
  }, []);

  useEffect(() => {
    if (!aramaMetni) {
      setFiltrelenmis(liste);
    } else {
      const q = aramaMetni.toLowerCase();
      setFiltrelenmis(liste.filter((k) => k.pozisyon.toLowerCase().includes(q)));
    }
  }, [aramaMetni, liste]);

  const veriYukle = async () => {
    setYukleniyor(true);
    try {
      const sonuc = await cekSenetListesiniAl(calisilanSirket);
      if (sonuc.sonuc) {
        setListe(sonuc.data ?? []);
      } else {
        toast.warning(sonuc.mesaj || 'Veri alınamadı.');
      }
    } catch (err: any) {
      const mesaj = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message ?? String(err);
      toast.error(mesaj);
    } finally {
      setYukleniyor(false);
    }
  };

  const pdfAc = async (kalem: CekSenetBilgileri) => {
    setSecilenKalem(kalem);
    setPdfYukleniyor(true);
    try {
      const base64 = await raporPdfAl({
        dizaynAdi: 'Mobil_CekSenetDizayn.repx',
        evrakTipi: 'CekSenetDetay',
        parametre1: kalem.pozisyon,
        parametre2: kalem.cekSenetTipi.toUpperCase() === 'SENET' ? '2' : '1',
        parametre3: '',
        veriTabaniAdi: calisilanSirket,
      });
      const dosyaYolu = FileSystem.cacheDirectory + 'cek_senet.pdf';
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
      dialogTitle: 'Çek Senet PDF',
    });
  };

  const renderKalem = ({ item }: { item: CekSenetBilgileri }) => (
    <TouchableOpacity
      style={[styles.kart, { backgroundColor: Colors.card }]}
      onPress={() => pdfAc(item)}
      activeOpacity={0.75}
    >
      <View style={styles.satirSol}>
        <View style={[styles.tipBadge, item.cekSenetTipi.toUpperCase() === 'SENET' ? styles.senetBadge : styles.cekBadge]}>
          <Text style={[styles.tipText, { color: Colors.text }]}>{item.cekSenetTipi}</Text>
        </View>
        <Text style={[styles.pozisyon, { color: Colors.text }]}>{item.pozisyon}</Text>
      </View>
      <View style={styles.satirSag}>
        <Text style={[styles.tutar, { color: Colors.error }]}>{sayiFormatla(item.tutar)}</Text>
        <Text style={[styles.sayi, { color: Colors.textSecondary }]}>{item.cekSenetSayisi} evrak</Text>
      </View>
      {pdfYukleniyor && secilenKalem?.pozisyon === item.pozisyon ? (
        <ActivityIndicator size={18} color={Colors.primary} style={styles.satirIkon} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={Colors.border} style={styles.satirIkon} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      {/* PDF Modal */}
      <Modal visible={!!pdfUri} animationType="slide" onRequestClose={() => setPdfUri(null)}>
        <SafeAreaView style={[styles.pdfModal, { backgroundColor: Colors.card }]}>
          <View style={[styles.pdfBaslik, { borderBottomColor: Colors.border }]}>
            <Text style={[styles.pdfBaslikMetin, { color: Colors.text }]} numberOfLines={1}>
              {secilenKalem?.cekSenetTipi} — {secilenKalem?.pozisyon}
            </Text>
            <TouchableOpacity onPress={pdfPaylas} style={styles.pdfBtn}>
              <Ionicons name="share-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPdfUri(null)} style={styles.pdfBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
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

      {/* Arama */}
      <View style={[styles.aramaContainer, { backgroundColor: Colors.primary }]}>
        <Ionicons name="search" size={18} color="#fff" style={styles.aramaIkon} />
        <TextInput
          style={styles.aramaInput}
          placeholder="Pozisyonda ara"
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={aramaMetni}
          onChangeText={setAramaMetni}
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => setAramaMetni('')}>
            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}
      </View>

      {/* İçerik */}
      {yukleniyor ? (
        <View style={styles.merkez}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.merkezMetin, { color: Colors.textSecondary }]}>Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filtrelenmis}
          keyExtractor={(item, idx) => `${item.pozisyon}-${idx}`}
          renderItem={renderKalem}
          contentContainerStyle={styles.liste}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={veriYukle}
              colors={[Colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.ayirac} />}
          ListEmptyComponent={
            <EmptyState icon="receipt-outline" baslik="Kayıt bulunamadı" aciklama="Çek/senet kaydı bulunmamaktadır" />
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
  aramaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  aramaIkon: {
    opacity: 0.8,
  },
  aramaInput: {
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#fff',
    fontSize: 14,
  },
  liste: {
    padding: 10,
    paddingBottom: 24,
  },
  kart: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  satirSol: {
    flex: 1,
    gap: 6,
  },
  tipBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cekBadge: {
    backgroundColor: '#e3f2fd',
  },
  senetBadge: {
    backgroundColor: '#fce4ec',
  },
  tipText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pozisyon: {
    fontSize: 14,
    fontWeight: '600',
  },
  satirSag: {
    alignItems: 'flex-end',
    gap: 4,
    marginRight: 8,
  },
  tutar: {
    fontSize: 15,
    fontWeight: '700',
  },
  sayi: {
    fontSize: 11,
  },
  satirIkon: {
    marginLeft: 4,
  },
  ayirac: {
    height: 6,
  },
  merkez: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  merkezMetin: {
    fontSize: 14,
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
  pdfBtn: {
    padding: 6,
  },
});
