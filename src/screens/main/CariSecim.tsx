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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { cariListesiniAl } from '../../api/hizliIslemlerApi';
import { Colors } from '../../constants/Colors';
import type { CariKartBilgileri } from '../../models';

type CariIslemSecenegi = {
  key: keyof DrawerParamList | string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  aktif: boolean;
};

const CARI_ISLEM_SECENEKLERI: CariIslemSecenegi[] = [
  { key: 'CariEkstreListesi', label: 'Cari Ekstre', icon: 'document-text-outline', aktif: true },
  { key: 'StokluCariEkstreListesi', label: 'Stoklu Ekstre', icon: 'list-outline', aktif: true },
  { key: 'BekleyenSiparisler', label: 'Bekleyen Siparişler', icon: 'time-outline', aktif: true },
  { key: 'TahsilatListesi', label: 'Tahsilat Listesi', icon: 'receipt-outline', aktif: false },
  { key: 'Adresler', label: 'Adresler', icon: 'location-outline', aktif: false },
  { key: 'CariTahsilat', label: 'Cari Tahsilat', icon: 'cash-outline', aktif: false },
  { key: 'KasaTahsilati', label: 'Kasa Tahsilatı', icon: 'wallet-outline', aktif: false },
  { key: 'CekTahsilati', label: 'Çek Tahsilatı', icon: 'card-outline', aktif: false },
  { key: 'SenetTahsilati', label: 'Senet Tahsilatı', icon: 'document-outline', aktif: false },
];

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'CariSecim'>;

export default function CariSecim() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
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

  const [islemModalCari, setIslemModalCari] = useState<CariKartBilgileri | null>(null);

  const cariSec = (cari: CariKartBilgileri) => {
    const returnScreen = route.params?.returnScreen ?? 'HizliIslemler';
    (navigation as any).navigate('Drawer', {
      screen: returnScreen,
      params: { secilenCari: cari },
    });
  };

  const cariIslemSec = (secenek: CariIslemSecenegi) => {
    if (!islemModalCari) return;
    setIslemModalCari(null);
    if (!secenek.aktif) {
      Alert.alert('Bilgi', `${secenek.label} henüz aktif değil.`);
      return;
    }
    (navigation as any).navigate('Drawer', {
      screen: secenek.key,
      params: { secilenCari: islemModalCari },
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
      <TouchableOpacity
        style={styles.islemButon}
        onPress={() => setIslemModalCari(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="add-circle" size={28} color={Colors.accent} />
      </TouchableOpacity>
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

      {/* Cari İşlem Seçim Modal */}
      <Modal
        visible={islemModalCari !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setIslemModalCari(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIslemModalCari(null)}
        >
          <View style={styles.modalKutu}>
            {CARI_ISLEM_SECENEKLERI.map((secenek) => (
              <TouchableOpacity
                key={secenek.key}
                style={[styles.islemSatir, !secenek.aktif && styles.islemSatirPasif]}
                onPress={() => cariIslemSec(secenek)}
              >
                <Ionicons
                  name={secenek.icon}
                  size={22}
                  color={secenek.aktif ? Colors.darkGray : Colors.gray}
                />
                <Text style={[styles.islemLabel, !secenek.aktif && styles.islemLabelPasif]}>
                  {secenek.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.vazgecButon}
              onPress={() => setIslemModalCari(null)}
            >
              <Text style={styles.vazgecText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  islemButon: {
    padding: 4,
  },
  ayirac: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  bosEkran: { alignItems: 'center', paddingTop: 60, gap: 12 },
  bosMetin: { fontSize: 14, color: Colors.gray, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKutu: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    width: '82%',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  islemSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 14,
  },
  islemSatirPasif: {
    opacity: 0.45,
  },
  islemLabel: {
    fontSize: 16,
    color: Colors.darkGray,
  },
  islemLabelPasif: {
    color: Colors.gray,
  },
  vazgecButon: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  vazgecText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
