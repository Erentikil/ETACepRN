import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { cariListesiniAl } from '../../api/hizliIslemlerApi';
import { useColors } from '../../contexts/ThemeContext';
import { toast } from '../../components/Toast';
import type { CariKartBilgileri } from '../../models';
import type { DrawerParamList } from '../../navigation/types';
import EmptyState from '../../components/EmptyState';

type RoutePropType = RouteProp<DrawerParamList, 'CariSecimliRapor'>;

export default function CariSecimliRapor() {
  const Colors = useColors();
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
          toast.error(sonuc.mesaj || 'Cari listesi alınamadı.');
        }
      } catch (err: any) {
        toast.error(err.message || 'Cari listesi yüklenirken hata oluştu.');
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
      <View style={[styles.merkez, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.yukleniyorText, { color: Colors.textSecondary }]}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.aramaRow, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
        <TextInput
          style={[styles.aramaInput, { color: Colors.text }]}
          placeholder="Cari kodu veya unvan ara..."
          placeholderTextColor={Colors.textSecondary}
          value={arama}
          onChangeText={setArama}
        />
        {arama.length > 0 && (
          <TouchableOpacity onPress={() => setArama('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.bilgiRow, { backgroundColor: Colors.inputBackground }]}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.accent} />
        <Text style={[styles.bilgiText, { color: Colors.text }]}>Rapor görmek istediğiniz cariyi seçin</Text>
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(item) => item.cariKodu}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.satir, { backgroundColor: Colors.card }]} onPress={() => cariSec(item)}>
            <View style={styles.satirSol}>
              <Text style={[styles.cariKodu, { color: Colors.primary }]}>{item.cariKodu}</Text>
              <Text style={[styles.cariUnvan, { color: Colors.text }]} numberOfLines={1}>{item.cariUnvan}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={[styles.ayirac, { backgroundColor: Colors.border }]} />}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <EmptyState icon="people-outline" baslik="Cari bulunamadı" aciklama="Arama kriterlerine uygun cari bulunmamaktadır" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  merkez: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20 },
  yukleniyorText: { fontSize: 14 },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  aramaInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  bilgiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bilgiText: { fontSize: 12 },
  liste: { paddingBottom: 20 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  satirSol: { flex: 1 },
  cariKodu: { fontSize: 13, fontWeight: '700' },
  cariUnvan: { fontSize: 12, marginTop: 2 },
  ayirac: { height: 1, marginHorizontal: 14 },
});
