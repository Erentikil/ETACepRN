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
import { Colors } from '../../constants/Colors';
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
  const { yetkiBilgileri, menuYetkiBilgileri, calisilanSirket, versiyon, onLineCalisma } =
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
      ekran: 'HizliIslemler',
      renk: '#4caf50',
      yetki: menuYetkiBilgileri?.hizliIslemler ?? false,
    },
    {
      id: 'alimSatim',
      baslik: 'Evrak Oluştur',
      icon: 'swap-horizontal-outline',
      ekran: 'AlisSatisIslemleri',
      renk: '#2196f3',
      yetki: menuYetkiBilgileri?.alisSatisIslemler ?? false,
    },
    {
      id: 'tahsilat',
      baslik: 'Tahsilat',
      icon: 'cash-outline',
      ekran: 'Tahsilatlar',
      renk: '#ff9800',
      yetki: menuYetkiBilgileri?.tahsilatlar ?? false,
    },
    {
      id: 'siparisKapama',
      baslik: 'Sipariş Kapama',
      icon: 'checkmark-circle-outline',
      ekran: 'SiparisKapama',
      renk: '#9c27b0',
      yetki: menuYetkiBilgileri?.siparisKapama ?? false,
    },
    {
      id: 'raporlar',
      baslik: 'Raporlar',
      icon: 'bar-chart-outline',
      ekran: 'Raporlar',
      renk: '#f44336',
      yetki: menuYetkiBilgileri?.raporlar ?? false,
    },
    {
      id: 'ziyaret',
      baslik: 'Ziyaret',
      icon: 'people-outline',
      ekran: 'ZiyaretIslemleri',
      renk: '#009688',
      yetki: menuYetkiBilgileri?.ziyaretIslemleri ?? false,
    },
    {
      id: 'onay',
      baslik: 'Onay İşlemleri',
      icon: 'shield-checkmark-outline',
      ekran: 'OnayIslemleri',
      renk: '#795548',
      yetki: menuYetkiBilgileri?.onayIslemleri ?? false,
    },
    {
      id: 'bekleyenEvrak',
      baslik: 'Bekleyen Evraklar',
      icon: 'document-text-outline',
      ekran: 'BekleyenEvraklar',
      renk: '#607d8b',
      yetki: menuYetkiBilgileri?.bekleyenEvraklar ?? false,
    },
    {
      id: 'renkBeden',
      baslik: 'Renk-Beden',
      icon: 'color-palette-outline',
      ekran: 'RenkBedenIslemleri',
      renk: '#e91e63',
      yetki: menuYetkiBilgileri?.renkBedenIslemleri ?? false,
    },
    {
      id: 'kur',
      baslik: 'Kur Bilgileri',
      icon: 'trending-up-outline',
      ekran: 'KurBilgileri',
      renk: '#00bcd4',
      yetki: menuYetkiBilgileri?.kurBilgileri ?? false,
    },
    {
      id: 'fiyatGor',
      baslik: 'Fiyat Gör',
      icon: 'pricetag-outline',
      ekran: 'FiyatGor',
      renk: '#3f51b5',
      yetki: true,
    },
    {
      id: 'barkodEkleme',
      baslik: 'Barkod Ekleme',
      icon: 'barcode-outline',
      ekran: 'BarkodEkleme',
      renk: '#ff5722',
      yetki: true,
    },
  ];
  const hizliErisimler = tumHizliErisimler.filter((k) => k.yetki);

  return (
    <View style={styles.container}>
      {/* Üst Durum Çubuğu */}
      <View style={styles.durumCubugu}>
        <View style={styles.durumSol}>
          <View style={[styles.durumNokta, { backgroundColor: onLineCalisma ? '#4caf50' : Colors.accent }]} />
          <Text style={styles.durumText}>
            {onLineCalisma ? 'Online' : 'Hibrit'}
          </Text>
        </View>
        {versiyon && (
          <Text style={styles.durumVersiyon}>
            Kalan: {versiyon.kalanGunSayisi} gün
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Karşılama */}
        <View style={styles.karsilamaKarti}>
          <View style={styles.karsilamaIkon}>
            <Ionicons name="person-circle-outline" size={48} color={Colors.primary} />
          </View>
          <View style={styles.karsilamaMetin}>
            <Text style={styles.hosgeldin}>Hoş geldiniz</Text>
            <Text style={styles.kullaniciAdi}>
              {yetkiBilgileri?.kullaniciKodu ?? 'Kullanıcı'}
            </Text>
            {calisilanSirket ? (
              <Text style={styles.sirketAdi} numberOfLines={1}>
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
            <Text style={styles.bolumBaslik}>Hızlı Erişim</Text>
            <View style={styles.kartGrid}>
              {hizliErisimler.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.kart}
                  onPress={() => navigation.navigate(item.ekran)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.kartIkon, { backgroundColor: item.renk }]}>
                    <Ionicons name={item.icon} size={26} color={Colors.white} />
                  </View>
                  <Text style={styles.kartBaslik} numberOfLines={2}>
                    {item.baslik}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.bosMesaj}>
            <Ionicons name="information-circle-outline" size={48} color={Colors.gray} />
            <Text style={styles.bosMesajText}>
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
    backgroundColor: Colors.lightGray,
  },
  durumCubugu: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    color: Colors.darkGray,
  },
  durumVersiyon: {
    fontSize: 11,
    color: Colors.gray,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  karsilamaKarti: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
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
    color: Colors.gray,
  },
  kullaniciAdi: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  sirketAdi: {
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 2,
  },
  menuBtn: {
    padding: 8,
  },
  bolumBaslik: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.darkGray,
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
    backgroundColor: Colors.white,
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
    color: Colors.darkGray,
    textAlign: 'center',
  },
  bosMesaj: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  bosMesajText: {
    textAlign: 'center',
    color: Colors.gray,
    fontSize: 14,
    lineHeight: 22,
  },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.darkGray,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  adminBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
