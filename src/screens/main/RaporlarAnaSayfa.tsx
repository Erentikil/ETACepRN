import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useColors } from '../../contexts/ThemeContext';
import { toast } from '../../components/Toast';
import type { DrawerParamList } from '../../navigation/types';

type Props = {
  navigation: DrawerNavigationProp<DrawerParamList, 'Raporlar'>;
};

interface RaporKarti {
  id: number;
  baslik: string;
  icon: keyof typeof Ionicons.glyphMap;
  renk: string;
}

const RAPORLAR: RaporKarti[] = [
  { id: 0,  baslik: 'Satış Raporu',      icon: 'bar-chart-outline',       renk: '#2e4d85' },
  { id: 1,  baslik: 'Cari Bakiye',       icon: 'wallet-outline',          renk: '#1a5d3f' },
  { id: 2,  baslik: 'Cari Hareket',      icon: 'swap-horizontal-outline', renk: '#8a5a2b' },
  { id: 3,  baslik: 'Stok Bakiye',       icon: 'cube-outline',            renk: '#4a2c6e' },
  { id: 4,  baslik: 'Cari Ekstre',       icon: 'document-text-outline',   renk: '#1d5e5f' },
  { id: 5,  baslik: 'Adres Listesi',     icon: 'location-outline',        renk: '#6b1e25' },
  { id: 6,  baslik: 'Stok Fiyat',        icon: 'pricetag-outline',        renk: '#c9a227' },
  { id: 7,  baslik: 'En Çok Borçlu',     icon: 'trending-down-outline',   renk: '#8b3a3a' },
  { id: 8,  baslik: 'Çek Senet',         icon: 'receipt-outline',         renk: '#5a2e7c' },
  { id: 9,  baslik: 'En Çok Alacak',     icon: 'trending-up-outline',     renk: '#2a6e4a' },
  { id: 10, baslik: 'Kasa Bakiye',       icon: 'cash-outline',            renk: '#1e3a6b' },
  { id: 11, baslik: 'Banka Bakiye',      icon: 'business-outline',        renk: '#2a3a8a' },
  { id: 12, baslik: 'En Çok Satış',      icon: 'ribbon-outline',          renk: '#9e5a52' },
  { id: 13, baslik: 'En Çok Ciro',       icon: 'trophy-outline',          renk: '#d4a34a' },
  { id: 14, baslik: 'Alış Raporu',       icon: 'cart-outline',            renk: '#4a7567' },
  { id: 15, baslik: 'Stoklu Ekstre',     icon: 'layers-outline',          renk: '#3a5e8a' },
  { id: 16, baslik: 'Tahsilat Listesi',  icon: 'card-outline',            renk: '#b88566' },
  { id: 17, baslik: 'Bek. Siparişler',   icon: 'time-outline',            renk: '#4a4a63' },
];

export default function RaporlarAnaSayfa({ navigation }: Props) {
  const Colors = useColors();
  const [arama, setArama] = useState('');

  const filtrelenmis = arama.trim()
    ? RAPORLAR.filter((r) =>
        r.baslik.toLocaleLowerCase('tr').includes(arama.toLocaleLowerCase('tr'))
      )
    : RAPORLAR;

  const pdfRaporAc = (
    dizaynAdi: string,
    evrakTipi: string,
    baslik: string,
    parametre1 = '',
    parametre2 = '',
    parametre3 = ''
  ) => {
    navigation.navigate('PDFRaporGoster', {
      dizaynAdi,
      evrakTipi,
      parametre1,
      parametre2,
      parametre3,
      baslik,
    });
  };

  const raporSec = (rapor: RaporKarti) => {
    switch (rapor.id) {
      case 0: // Satış Raporu
        pdfRaporAc('Mobil_SatisRaporDizayn.repx', 'SatisRaporu', 'Satış Raporu');
        break;
      case 1: // Cari Bakiye
        navigation.navigate('CariBakiye');
        break;
      case 2: // Cari Hareket
        pdfRaporAc('Mobil_CariHareketDizayn.repx', 'CariHareket', 'Cari Hareket');
        break;
      case 3: // Stok Bakiye
        navigation.navigate('StokRapor', { mod: 'bakiye' });
        break;
      case 4: // Cari Ekstre
        navigation.navigate('CariEkstreListesi');
        break;
      case 5: // Adres Listesi — cari seç → PDF
        navigation.navigate('CariSecimliRapor', {
          dizaynAdi: 'Mobil_CariAdresDizayn.repx',
          evrakTipi: 'CariAdres',
          baslik: 'Adres Listesi',
        });
        break;
      case 6: // Stok Fiyat
        navigation.navigate('StokRapor', { mod: 'fiyat' });
        break;
      case 7: // En Çok Borçlu
        pdfRaporAc('Mobil_EnCokBorçluDizayn.repx', 'EnCokBorclu', 'En Çok Borçlu');
        break;
      case 8: // Çek Senet
        navigation.navigate('CekSenetListesi');
        break;
      case 9: // En Çok Alacak
        pdfRaporAc('Mobil_EnCokAlacaklıDizayn.repx', 'EnCokAlacakli', 'En Çok Alacak');
        break;
      case 10: // Kasa Bakiye
        navigation.navigate('KasaBakiye');
        break;
      case 11: // Banka Bakiye
        navigation.navigate('BankaBakiye');
        break;
      case 12: // En Çok Satış
        pdfRaporAc('Mobil_EnCokSatışDizayn.repx', 'EnCokSatis', 'En Çok Satış');
        break;
      case 13: // En Çok Ciro
        pdfRaporAc('Mobil_EnCokCiroDizayn.repx', 'EnCokCiro', 'En Çok Ciro');
        break;
      case 14: // Alış Raporu
        pdfRaporAc('Mobil_AlisRaporDizayn.repx', 'AlisRaporu', 'Alış Raporu');
        break;
      case 15: // Stoklu Ekstre
        navigation.navigate('StokluCariEkstreListesi');
        break;
      case 16: // Tahsilat Listesi — cari seç → PDF
        navigation.navigate('CariSecimliRapor', {
          dizaynAdi: 'Mobil_TahsilatDetayDizayn.repx',
          evrakTipi: 'TahsilatDetay',
          baslik: 'Tahsilat Listesi',
        });
        break;
      case 17: // Bekleyen Siparişler
        navigation.navigate('BekleyenSiparisler');
        break;
      default:
        toast.info('Bu rapor yakında eklenecek.');
    }
  };

  const renderKart = ({ item }: { item: RaporKarti }) => (
    <TouchableOpacity
      style={[styles.kart, { backgroundColor: Colors.card }]}
      onPress={() => raporSec(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.kartIkon, { backgroundColor: `${item.renk}22` }]}>
        <Ionicons name={item.icon} size={26} color={item.renk} />
      </View>
      <Text style={[styles.kartBaslik, { color: Colors.text }]} numberOfLines={2}>
        {item.baslik}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.aramaRow, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
        <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
        <TextInput
          style={[styles.aramaInput, { color: Colors.text }]}
          placeholder="Rapor ara..."
          placeholderTextColor={Colors.textSecondary}
          value={arama}
          onChangeText={setArama}
          returnKeyType="search"
        />
        {arama.length > 0 && (
          <TouchableOpacity onPress={() => setArama('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtrelenmis}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderKart}
        numColumns={3}
        columnWrapperStyle={styles.satirSarici}
        contentContainerStyle={styles.liste}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    gap: 6,
  },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  bolumBaslik: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
  },
  liste: {
    paddingBottom: 24,
  },
  satirSarici: {
    gap: 10,
    marginBottom: 10,
  },
  kart: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#0a0a0a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  kartIkon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kartBaslik: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
});
