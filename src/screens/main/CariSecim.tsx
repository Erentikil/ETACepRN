import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { cariListesiniAl } from '../../api/hizliIslemlerApi';
import { Colors } from '../../constants/Colors';
import type { CariKartBilgileri } from '../../models';

type NavProp = StackNavigationProp<RootStackParamList>;

export default function CariSecim() {
  const navigation = useNavigation<NavProp>();
  const { calisilanSirket, yetkiBilgileri } = useAppStore();

  const [aramaMetni, setAramaMetni] = useState('');
  const [tumCariListesi, setTumCariListesi] = useState<CariKartBilgileri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

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
          setTumCariListesi(sonuc.data);
        } else {
          Alert.alert('Hata', sonuc.mesaj || 'Cari listesi alınamadı.');
        }
      } catch {
        Alert.alert('Hata', 'Cari listesi yüklenirken bir hata oluştu.');
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [calisilanSirket, yetkiBilgileri]);

  const filtreli = useMemo(() => {
    const q = aramaMetni.toLowerCase().trim();
    if (!q) return tumCariListesi;
    return tumCariListesi.filter(
      (c) =>
        c.cariKodu.toLowerCase().includes(q) ||
        c.cariUnvan.toLowerCase().includes(q) ||
        (c.telefon ?? '').toLowerCase().includes(q)
    );
  }, [aramaMetni, tumCariListesi]);

  const cariSec = (cari: CariKartBilgileri) => {
    (navigation as any).navigate('Drawer', {
      screen: 'HizliIslemler',
      params: { secilenCari: cari },
    });
  };

  const renderCariSatiri = ({ item }: { item: CariKartBilgileri }) => (
    <TouchableOpacity style={styles.cariSatiri} onPress={() => cariSec(item)}>
      <View style={styles.cariIkon}>
        <Ionicons name="person-outline" size={20} color={Colors.primary} />
      </View>
      <View style={styles.cariBilgi}>
        <Text style={styles.cariUnvan}>{item.cariUnvan}</Text>
        <Text style={styles.cariKodu}>{item.cariKodu}</Text>
        {item.telefon ? <Text style={styles.cariTelefon}>{item.telefon}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.ekran}>
      {/* Filtre kutusu */}
      <View style={styles.aramaKutusu}>
        <Ionicons name="search-outline" size={18} color={Colors.gray} />
        <TextInput
          style={styles.aramaInput}
          placeholder="Cari kodu veya unvan filtrele..."
          placeholderTextColor={Colors.gray}
          value={aramaMetni}
          onChangeText={setAramaMetni}
          autoFocus
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => setAramaMetni('')}>
            <Ionicons name="close-circle" size={18} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Yükleniyor */}
      {yukleniyor ? (
        <View style={styles.yukleniyorRow}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.yukleniyorText}>Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filtreli}
          keyExtractor={(item) => item.cariKodu}
          renderItem={renderCariSatiri}
          ItemSeparatorComponent={() => <View style={styles.ayirac} />}
          ListEmptyComponent={
            <View style={styles.bosEkran}>
              <Ionicons name="people-outline" size={48} color={Colors.border} />
              <Text style={styles.bosMetin}>
                {aramaMetni ? 'Eşleşen cari bulunamadı' : 'Cari listesi boş'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: Colors.lightGray },
  aramaKutusu: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.black,
    paddingVertical: 4,
  },
  yukleniyorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 20,
  },
  yukleniyorText: { color: Colors.gray, fontSize: 14 },
  cariSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  cariIkon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cariBilgi: { flex: 1 },
  cariUnvan: { fontSize: 15, fontWeight: '600', color: Colors.darkGray },
  cariKodu: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  cariTelefon: { fontSize: 12, color: Colors.gray },
  ayirac: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  bosEkran: { alignItems: 'center', paddingTop: 60, gap: 12 },
  bosMetin: { fontSize: 14, color: Colors.gray, textAlign: 'center' },
});
