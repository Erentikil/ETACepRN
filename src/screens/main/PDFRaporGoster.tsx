import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { raporPdfAl } from '../../api/raporApi';
import { Colors } from '../../constants/Colors';
import { toast } from '../../components/Toast';
import type { DrawerParamList } from '../../navigation/types';

type RoutePropType = RouteProp<DrawerParamList, 'PDFRaporGoster'>;

export default function PDFRaporGoster() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation();
  const { calisilanSirket } = useAppStore();

  const { dizaynAdi, evrakTipi, parametre1, parametre2, parametre3, baslik } =
    route.params ?? {};

  const [yukleniyor, setYukleniyor] = useState(true);
  const [pdfDosyaUri, setPdfDosyaUri] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [tamEkran, setTamEkran] = useState(false);

  const dosyaAdi = (baslik ?? 'rapor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dosyaYolu = `${FileSystem.cacheDirectory}${dosyaAdi}.pdf`;

  useEffect(() => {
    (async () => {
      try {
        const data = await raporPdfAl({
          dizaynAdi: dizaynAdi ?? '',
          evrakTipi: evrakTipi ?? '',
          parametre1: parametre1 ?? '',
          parametre2: parametre2 ?? '',
          parametre3: parametre3 ?? '',
          veriTabaniAdi: calisilanSirket,
        });
        if (!data) {
          setHata('Sunucu başarılı yanıt döndü fakat PDF verisi boş.');
          return;
        }
        // Base64'ü dosyaya yaz
        await FileSystem.writeAsStringAsync(dosyaYolu, data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setPdfDosyaUri(dosyaYolu);
      } catch (err: any) {
        const hataMesaji = err?.response?.data?.mesaj || err?.message || JSON.stringify(err);
        setHata(hataMesaji);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [dizaynAdi, evrakTipi, parametre1, parametre2, parametre3, calisilanSirket]);

  const paylas = async () => {
    if (!pdfDosyaUri) return;
    try {
      await Sharing.shareAsync(pdfDosyaUri, { mimeType: 'application/pdf' });
    } catch {
      toast.error('PDF paylaşılamadı.');
    }
  };

  const pdfIcerik = pdfDosyaUri ? (
    <WebView
      originWhitelist={['*']}
      source={{ uri: pdfDosyaUri }}
      style={{ flex: 1 }}
    />
  ) : null;

  if (yukleniyor) {
    return (
      <View style={styles.merkez}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.yukleniyorText}>Rapor yükleniyor...</Text>
      </View>
    );
  }

  if (hata) {
    return (
      <View style={styles.merkez}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.hataText}>{hata}</Text>
        <TouchableOpacity style={styles.geriButon} onPress={() => navigation.goBack()}>
          <Text style={styles.geriButonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => setTamEkran(true)} style={styles.toolBtn}>
          <Ionicons name="expand-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={paylas} style={styles.toolBtn}>
          <Ionicons name="share-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {pdfIcerik}

      {/* Tam ekran modal */}
      <Modal visible={tamEkran} animationType="slide" onRequestClose={() => setTamEkran(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.tamEkranBar}>
            <TouchableOpacity onPress={() => setTamEkran(false)}>
              <Ionicons name="close" size={28} color={Colors.darkGray} />
            </TouchableOpacity>
            <Text style={styles.tamEkranBaslik}>{baslik ?? 'Rapor'}</Text>
            <TouchableOpacity onPress={paylas}>
              <Ionicons name="share-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          {pdfIcerik}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  merkez: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 },
  yukleniyorText: { color: Colors.gray, fontSize: 14, marginTop: 8 },
  hataText: { color: Colors.error, fontSize: 14, textAlign: 'center' },
  geriButon: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  geriButonText: { color: Colors.white, fontWeight: '600' },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toolBtn: { padding: 4 },
  tamEkranBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tamEkranBaslik: { fontSize: 16, fontWeight: '600', color: Colors.darkGray },
});
