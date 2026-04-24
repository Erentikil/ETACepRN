import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { useColors } from '../../contexts/ThemeContext';
import type { DrawerParamList } from '../../navigation/types';
import { aktifSepetAl } from '../../utils/aktifSepetStorage';

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

export default function AnaSayfa({ navigation }: Props) {
  const Colors = useColors();
  const { yetkiBilgileri, menuYetkiBilgileri, calisilanSirket, onLineCalisma } =
    useAppStore();

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
      renk: '#2a8077',
      yetki: menuYetkiBilgileri?.alisSatisIslemler ?? false,
    },
    {
      id: 'cariIletisim',
      baslik: 'Cari İletişim',
      icon: 'location-outline',
      ekran: 'CariIletisim',
      renk: '#4db5b0',
      yetki: menuYetkiBilgileri?.alisSatisIslemler ?? false,
    },
    {
      id: 'fiyatGor',
      baslik: 'Fiyat Gör',
      icon: 'pricetag-outline',
      ekran: 'FiyatGor',
      renk: '#c97b4f',
      yetki: menuYetkiBilgileri?.fiyatGor ?? false,
    },
    {
      id: 'siparisKapama',
      baslik: 'Sipariş Kapama',
      icon: 'checkmark-circle-outline',
      ekran: 'SiparisKapama',
      renk: '#7c5ea8',
      yetki: menuYetkiBilgileri?.siparisKapama ?? false,
    },
    {
      id: 'ziyaret',
      baslik: 'CRM Teklif',
      icon: 'people-outline',
      ekran: 'ZiyaretIslemleri',
      renk: '#5eead4',
      yetki: menuYetkiBilgileri?.crm ?? false,
    },
    {
      id: 'alimSatim',
      baslik: 'Evrak Oluştur',
      icon: 'swap-horizontal-outline',
      ekran: 'AlisSatisIslemleri',
      renk: '#3b7ea1',
      yetki: menuYetkiBilgileri?.evrakDuzenle ?? false,
    },
    {
      id: 'tahsilat',
      baslik: 'Tahsilat',
      icon: 'cash-outline',
      ekran: 'Tahsilatlar',
      renk: '#d9a05b',
      yetki: menuYetkiBilgileri?.tahsilatlar ?? false,
    },
    {
      id: 'raporlar',
      baslik: 'Raporlar',
      icon: 'bar-chart-outline',
      ekran: 'Raporlar',
      renk: '#a84a4a',
      yetki: menuYetkiBilgileri?.raporlar ?? false,
    },
    {
      id: 'barkodEkleme',
      baslik: 'Barkod Ekleme',
      icon: 'barcode-outline',
      ekran: 'BarkodEkleme',
      renk: '#c9692e',
      yetki: menuYetkiBilgileri?.barkodEkle ?? false,
    },
    {
      id: 'bekleyenEvrak',
      baslik: 'Bekleyen Evraklar',
      icon: 'document-text-outline',
      ekran: 'BekleyenEvraklar',
      renk: '#4a6b70',
      yetki: menuYetkiBilgileri?.bekleyenEvraklar ?? false,
    },
    {
      id: 'renkBeden',
      baslik: 'Renk-Beden',
      icon: 'color-palette-outline',
      ekran: 'RenkBedenIslemleri',
      renk: '#a86b8a',
      yetki: menuYetkiBilgileri?.renkBedenIslemleri ?? false,
    },
    {
      id: 'onay',
      baslik: 'Onay İşlemleri',
      icon: 'shield-checkmark-outline',
      ekran: 'OnayIslemleri',
      renk: '#6b7e6b',
      yetki: menuYetkiBilgileri?.onayIslemleri ?? false,
    },
  ];
  const hizliErisimler = tumHizliErisimler.filter((k) => k.yetki);

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
        {hizliErisimler.length > 0 ? (
          <>
            <Text style={[styles.bolumBaslik, { color: Colors.text }]}>Hızlı Erişim</Text>
            <View style={styles.kartGrid}>
              {hizliErisimler.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.kart, { backgroundColor: Colors.card }]}
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
              ))}
            </View>
          </>
        ) : (
          <View style={styles.bosMesaj}>
            <Ionicons name="information-circle-outline" size={48} color={Colors.gray} />
            <Text style={[styles.bosMesajText, { color: Colors.textSecondary }]}>
              Erişim izniniz olan modül bulunmuyor.{'\n'}Yöneticinizle iletişime geçin.
            </Text>
          </View>
        )}

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
    padding: 16,
    paddingBottom: 32,
  },
  karsilamaKarti: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
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
  },
  kartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kart: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
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
    marginTop: 8,
  },
  adminBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
