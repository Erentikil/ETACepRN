import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { useColors } from '../../contexts/ThemeContext';
import { Config } from '../../constants/Config';
import type { DrawerParamList } from '../../navigation/types';
import { aktifSepetAl } from '../../utils/aktifSepetStorage';
import SortableGrid from '../../components/SortableGrid';

// Her şirket için bir kez göster
let sonKontrolEdilenSirket = '';

type Props = {
  navigation: DrawerNavigationProp<DrawerParamList, 'AnaSayfa'>;
};

interface HizliErisimKarti {
  id: string;
  baslik: string;
  icon: keyof typeof Ionicons.glyphMap;
  ekran: keyof DrawerParamList;
  renk: string;
  yetki: boolean;
}

const KART_YUKSEKLIGI = 118;

export default function AnaSayfa({ navigation }: Props) {
  const Colors = useColors();
  const { yetkiBilgileri, menuYetkiBilgileri, calisilanSirket, onLineCalisma } =
    useAppStore();

  const [kartSirasi, setKartSirasi] = useState<string[]>([]);
  const [sirayiYukledi, setSirayiYukledi] = useState(false);

  useEffect(() => {
    if (!calisilanSirket || sonKontrolEdilenSirket === calisilanSirket) return;
    sonKontrolEdilenSirket = calisilanSirket;

    aktifSepetAl(calisilanSirket).then((sepet) => {
      if (!sepet || sepet.kalemler.length === 0) return;
      Alert.alert(
        'Yarım Kalmış İşlem',
        `Alış/Satış sepetinizde ${sepet.kalemler.length} kalem bulunuyor.`,
        [{ text: 'Tamam' }]
      );
    });
  }, [calisilanSirket]);

  const tumHizliErisimler: HizliErisimKarti[] = [
    {
      id: 'hizli',
      baslik: 'Alış/Satış',
      icon: 'flash-outline',
      ekran: 'HizliIslemlerV2',
      renk: '#1a5d3f',
      yetki: menuYetkiBilgileri?.alisSatisIslemler ?? false,
    },
    {
      id: 'cariIletisim',
      baslik: 'Cari İletişim',
      icon: 'location-outline',
      ekran: 'CariIletisim',
      renk: '#1e3a6b',
      yetki: menuYetkiBilgileri?.alisSatisIslemler ?? false,
    },
    {
      id: 'fiyatGor',
      baslik: 'Fiyat Gör',
      icon: 'pricetag-outline',
      ekran: 'FiyatGor',
      renk: '#c9a227',
      yetki: menuYetkiBilgileri?.fiyatGor ?? false,
    },
    {
      id: 'siparisKapama',
      baslik: 'Sipariş Kapama',
      icon: 'checkmark-circle-outline',
      ekran: 'SiparisKapama',
      renk: '#4a2c6e',
      yetki: menuYetkiBilgileri?.siparisKapama ?? false,
    },
    {
      id: 'ziyaret',
      baslik: 'CRM Teklif',
      icon: 'people-outline',
      ekran: 'ZiyaretIslemleri',
      renk: '#1d5e5f',
      yetki: menuYetkiBilgileri?.crm ?? false,
    },
    {
      id: 'alimSatim',
      baslik: 'Evrak Oluştur',
      icon: 'swap-horizontal-outline',
      ekran: 'AlisSatisIslemleri',
      renk: '#172a4e',
      yetki: menuYetkiBilgileri?.evrakDuzenle ?? false,
    },
    {
      id: 'tahsilat',
      baslik: 'Tahsilat',
      icon: 'cash-outline',
      ekran: 'Tahsilatlar',
      renk: '#8a5a2b',
      yetki: menuYetkiBilgileri?.tahsilatlar ?? false,
    },
    {
      id: 'raporlar',
      baslik: 'Raporlar',
      icon: 'bar-chart-outline',
      ekran: 'Raporlar',
      renk: '#6b1e25',
      yetki: menuYetkiBilgileri?.raporlar ?? false,
    },
    {
      id: 'barkodEkleme',
      baslik: 'Barkod Ekleme',
      icon: 'barcode-outline',
      ekran: 'BarkodEkleme',
      renk: '#8a4520',
      yetki: menuYetkiBilgileri?.barkodEkle ?? false,
    },
    {
      id: 'bekleyenEvrak',
      baslik: 'Bekleyen Evraklar',
      icon: 'document-text-outline',
      ekran: 'BekleyenEvraklar',
      renk: '#2a2a2a',
      yetki: menuYetkiBilgileri?.bekleyenEvraklar ?? false,
    },
    {
      id: 'renkBeden',
      baslik: 'Renk-Beden',
      icon: 'color-palette-outline',
      ekran: 'RenkBedenIslemleri',
      renk: '#9e5a52',
      yetki: menuYetkiBilgileri?.renkBedenIslemleri ?? false,
    },
    {
      id: 'onay',
      baslik: 'Onay İşlemleri',
      icon: 'shield-checkmark-outline',
      ekran: 'OnayIslemleri',
      renk: '#6b553a',
      yetki: menuYetkiBilgileri?.onayIslemleri ?? false,
    },
  ];

  const varsayilanIdSirasi = tumHizliErisimler.map((k) => k.id);

  useEffect(() => {
    AsyncStorage.getItem(Config.STORAGE_KEYS.ANA_SAYFA_KART_SIRASI).then((json) => {
      let kayitli: string[] = [];
      if (json) {
        try {
          kayitli = JSON.parse(json);
        } catch {
          kayitli = [];
        }
      }
      const mevcutIdler = new Set(varsayilanIdSirasi);
      const temiz = kayitli.filter((id) => mevcutIdler.has(id));
      const temizSet = new Set(temiz);
      const yeniler = varsayilanIdSirasi.filter((id) => !temizSet.has(id));
      setKartSirasi([...temiz, ...yeniler]);
      setSirayiYukledi(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const siraliKartlar: HizliErisimKarti[] = kartSirasi
    .map((id) => tumHizliErisimler.find((k) => k.id === id))
    .filter((k): k is HizliErisimKarti => Boolean(k));
  const gorunurKartlar = siraliKartlar.filter((k) => k.yetki);

  const siraKaydet = useCallback((yeniSira: string[]) => {
    setKartSirasi(yeniSira);
    AsyncStorage.setItem(
      Config.STORAGE_KEYS.ANA_SAYFA_KART_SIRASI,
      JSON.stringify(yeniSira),
    );
  }, []);

  const handleOrderChange = (yeni: HizliErisimKarti[]) => {
    const yeniGorunurIds = yeni.map((k) => k.id);
    const gorunurSet = new Set(yeniGorunurIds);
    const digerleri = kartSirasi.filter((id) => !gorunurSet.has(id));
    siraKaydet([...yeniGorunurIds, ...digerleri]);
  };

  const renderKart = (item: HizliErisimKarti) => (
    <TouchableOpacity
      style={[styles.kart, { backgroundColor: Colors.card, shadowColor: Colors.primary }]}
      onPress={() => navigation.navigate(item.ekran)}
      activeOpacity={0.8}
    >
      <View style={[styles.kartIkon, { backgroundColor: item.renk }]}>
        <Ionicons name={item.icon} size={26} color="#fff" />
      </View>
      <Text style={[styles.kartBaslik, { color: Colors.text }]} numberOfLines={2}>
        {item.baslik}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* Üst Durum Çubuğu */}
      <View style={[styles.durumCubugu, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <View style={styles.durumSol}>
          <View style={[styles.durumNokta, { backgroundColor: onLineCalisma ? '#4caf50' : Colors.accent }]} />
          <Text style={[styles.durumText, { color: Colors.text }]}>
            {onLineCalisma ? 'Online' : 'Hibrit'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Karşılama */}
        <View style={[styles.karsilamaKarti, { backgroundColor: Colors.card }]}>
          <View style={styles.karsilamaIkon}>
            <Ionicons name="person-circle-outline" size={48} color={Colors.primary} />
          </View>
          <View style={styles.karsilamaMetin}>
            <Text style={[styles.hosgeldin, { color: Colors.textSecondary }]}>Hoş geldiniz</Text>
            <Text style={[styles.kullaniciAdi, { color: Colors.primary }]}>
              {yetkiBilgileri?.kullaniciKodu ?? 'Kullanıcı'}
            </Text>
            {calisilanSirket ? (
              <Text style={[styles.sirketAdi, { color: Colors.text }]} numberOfLines={1}>
                {calisilanSirket}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.menuBtn}
          >
            <Ionicons name="menu-outline" size={26} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Hızlı Erişim Kartları */}
        {sirayiYukledi && gorunurKartlar.length > 0 ? (
          <>
            <Text style={[styles.bolumBaslik, { color: Colors.text }]}>Hızlı Erişim</Text>
            <View style={styles.gridWrap}>
              <SortableGrid
                data={gorunurKartlar}
                keyExtractor={(item) => item.id}
                renderItem={renderKart}
                itemHeight={KART_YUKSEKLIGI}
                onOrderChange={handleOrderChange}
              />
            </View>
          </>
        ) : sirayiYukledi ? (
          <View style={styles.bosMesaj}>
            <Ionicons name="information-circle-outline" size={48} color={Colors.gray} />
            <Text style={[styles.bosMesajText, { color: Colors.textSecondary }]}>
              Erişim izniniz olan modül bulunmuyor.{'\n'}Yöneticinizle iletişime geçin.
            </Text>
          </View>
        ) : null}

        {/* Horizon Software */}
        <View style={styles.adminBtn}>
          <Text style={styles.adminBtnText}>Horizon Software</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  durumCubugu: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  durumSol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durumNokta: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  durumText: {
    fontSize: 12,
    fontWeight: '600',
  },
  durumVersiyon: {
    fontSize: 11,
  },
  scroll: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  karsilamaKarti: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  karsilamaIkon: {
    marginRight: 12,
  },
  karsilamaMetin: {
    flex: 1,
  },
  hosgeldin: {
    fontSize: 12,
  },
  kullaniciAdi: {
    fontSize: 18,
    fontWeight: '700',
  },
  sirketAdi: {
    fontSize: 12,
    marginTop: 2,
  },
  menuBtn: {
    padding: 8,
  },
  bolumBaslik: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  gridWrap: {
    marginBottom: 20,
  },
  kart: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  kartIkon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kartBaslik: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  bosMesaj: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
    gap: 12,
  },
  bosMesajText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#424242',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
  },
  adminBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
