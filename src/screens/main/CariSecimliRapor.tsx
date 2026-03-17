import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { cariListesiniAl } from '../../api/hizliIslemlerApi';
import { Colors } from '../../constants/Colors';
import type { CariKartBilgileri } from '../../models';
import type { DrawerParamList } from '../../navigation/types';

type RoutePropType = RouteProp<DrawerParamList, 'CariSecimliRapor'>;

export default function CariSecimliRapor() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<any>();
  const { calisilanSirket, yetkiBilgileri } = useAppStore();

  const { dizaynAdi, evrakTipi, baslik } = route.params ?? {};

  const [liste, setListe] = useState<CariKartBilgileri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [arama, setArama] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const sonuc = await cariListesiniAl(
          calisilanSirket,
          yetkiBilgileri?.saticiBazliCariKart ?? false,
          yetkiBilgileri?.kullaniciKodu ?? '',
          yetkiBilgileri?.saticiKontrolKolonu ?? ''
        );
        if (sonuc.sonuc) {
          setListe(sonuc.data ?? []);
        } else {
          Alert.alert('Hata', sonuc.mesaj || 'Cari listesi alınamadı.');
        }
      } catch (err: any) {
        Alert.alert('Hata', err.message || 'Cari listesi yüklenirken hata oluştu.');
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [calisilanSirket]);

  const filtreli = useMemo(() => {
    const q = arama.toLowerCase().trim();
    if (!q) return liste;
    return liste.filter(
      (c) =>
        c.cariKodu.toLowerCase().includes(q) ||
        c.cariUnvan.toLowerCase().includes(q)
    );
  }, [arama, liste]);

  const cariSec = (cari: CariKartBilgileri) => {
    navigation.navigate('PDFRaporGoster', {
      dizaynAdi: dizaynAdi ?? '',
      evrakTipi: evrakTipi ?? '',
      parametre1: cari.cariKodu,
      parametre2: '',
      parametre3: '',
      baslik: `${baslik ?? 'Rapor'} - ${cari.cariUnvan}`,
    });
  };

  if (yukleniyor) {
    return (
      <View style={styles.merkez}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.yukleniyorText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.aramaRow}>
        <Ionicons name="search-outline" size={16} color={Colors.gray} />
        <TextInput
          style={styles.aramaInput}
          placeholder="Cari kodu veya unvan ara..."
          placeholderTextColor={Colors.gray}
          value={arama}
          onChangeText={setArama}
        />
        {arama.length > 0 && (
          <TouchableOpacity onPress={() => setArama('')}>
            <Ionicons name="close-circle" size={16} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bilgiRow}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.accent} />
        <Text style={styles.bilgiText}>Rapor görmek istediğiniz cariyi seçin</Text>
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(item) => item.cariKodu}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.satir} onPress={() => cariSec(item)}>
            <View style={styles.satırSol}>
              <Text style={styles.cariKodu}>{item.cariKodu}</Text>
              <Text style={styles.cariUnvan} numberOfLines={1}>{item.cariUnvan}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.ayirac} />}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <View style={styles.merkez}>
            <Ionicons name="people-outline" size={48} color={Colors.border} />
            <Text style={styles.bosText}>Cari bulunamadı</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  merkez: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20 },
  yukleniyorText: { color: Colors.gray, fontSize: 14 },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aramaInput: { flex: 1, fontSize: 14, color: Colors.black, paddingVertical: 2 },
  bilgiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff8e1',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bilgiText: { fontSize: 12, color: Colors.darkGray },
  liste: { paddingBottom: 20 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  satırSol: { flex: 1 },
  cariKodu: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  cariUnvan: { fontSize: 12, color: Colors.darkGray, marginTop: 2 },
  ayirac: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  bosText: { color: Colors.gray, fontSize: 14 },
});
