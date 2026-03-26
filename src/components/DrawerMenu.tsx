import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/appStore';
import { Colors } from '../constants/Colors';
import { Config } from '../constants/Config';
import type { RootStackParamList } from '../navigation/types';

interface MenuItem {
  id: string;
  baslik: string;
  icon: keyof typeof Ionicons.glyphMap;
  ekran: string;
  yetki: boolean;
}

export default function DrawerMenu({ navigation }: DrawerContentComponentProps) {
  const { menuYetkiBilgileri, yetkiBilgileri, calisilanSirket, cikisYap } =
    useAppStore();

  const tumMenuOgeleri: MenuItem[] = [
    {
      id: 'anaSayfa',
      baslik: 'Ana Sayfa',
      icon: 'home-outline',
      ekran: 'AnaSayfa',
      yetki: true,
    },
    {
      id: 'hizli',
      baslik: 'Alış/Satış',
      icon: 'flash-outline',
      ekran: 'HizliIslemler',
      yetki: menuYetkiBilgileri?.hizliIslemler ?? false,
    },
    {
      id: 'hizliV2',
      baslik: 'Alış/Satış V2',
      icon: 'flash-outline',
      ekran: 'HizliIslemlerV2',
      yetki: menuYetkiBilgileri?.hizliIslemler ?? false,
    },
    {
      id: 'alimSatim',
      baslik: 'Evrak Oluştur',
      icon: 'swap-horizontal-outline',
      ekran: 'AlisSatisIslemleri',
      yetki: menuYetkiBilgileri?.alisSatisIslemler ?? false,
    },
    {
      id: 'fiyatGor',
      baslik: 'Fiyat Gor',
      icon: 'pricetag-outline',
      ekran: 'FiyatGor',
      yetki: true,
    },
    {
      id: 'barkodEkleme',
      baslik: 'Barkod Ekleme',
      icon: 'barcode-outline',
      ekran: 'BarkodEkleme',
      yetki: true,
    },
    {
      id: 'renkBeden',
      baslik: 'Renk-Beden İşlemleri',
      icon: 'color-palette-outline',
      ekran: 'RenkBedenIslemleri',
      yetki: menuYetkiBilgileri?.renkBedenIslemleri ?? false,
    },
    {
      id: 'siparisKapama',
      baslik: 'Sipariş Kapama',
      icon: 'checkmark-circle-outline',
      ekran: 'SiparisKapama',
      yetki: menuYetkiBilgileri?.siparisKapama ?? false,
    },
    {
      id: 'tahsilat',
      baslik: 'Tahsilat İşlemleri',
      icon: 'cash-outline',
      ekran: 'Tahsilatlar',
      yetki: menuYetkiBilgileri?.tahsilatlar ?? false,
    },
    {
      id: 'raporlar',
      baslik: 'Raporlar',
      icon: 'bar-chart-outline',
      ekran: 'Raporlar',
      yetki: menuYetkiBilgileri?.raporlar ?? false,
    },
    {
      id: 'bekleyenEvraklar',
      baslik: 'Bekleyen Evraklar',
      icon: 'document-text-outline',
      ekran: 'BekleyenEvraklar',
      yetki: menuYetkiBilgileri?.bekleyenEvraklar ?? false,
    },
    {
      id: 'ziyaret',
      baslik: 'Ziyaret İşlemleri',
      icon: 'people-outline',
      ekran: 'ZiyaretIslemleri',
      yetki: menuYetkiBilgileri?.ziyaretIslemleri ?? false,
    },
    {
      id: 'onay',
      baslik: 'Onay İşlemleri',
      icon: 'shield-checkmark-outline',
      ekran: 'OnayIslemleri',
      yetki: menuYetkiBilgileri?.onayIslemleri ?? false,
    },
    {
      id: 'kur',
      baslik: 'Kur Bilgileri',
      icon: 'trending-up-outline',
      ekran: 'KurBilgileri',
      yetki: menuYetkiBilgileri?.kurBilgileri ?? false,
    },
    {
      id: 'ayarlar',
      baslik: 'Ayarlar',
      icon: 'settings-outline',
      ekran: 'Ayarlar',
      yetki: menuYetkiBilgileri?.ayarlar ?? true,
    },
  ];
  const menuOgeleri = tumMenuOgeleri.filter((m) => m.yetki);

  const handleCikis = () => {
    Alert.alert('Çıkış', 'Uygulamadan çıkmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış',
        style: 'destructive',
        onPress: async () => {
          const beniHatirla = await AsyncStorage.getItem(Config.STORAGE_KEYS.BENI_HATIRLA);
          if (beniHatirla !== 'true') {
            await AsyncStorage.removeItem(Config.STORAGE_KEYS.KULLANICI_KODU);
            await AsyncStorage.removeItem(Config.STORAGE_KEYS.SIFRE);
          }
          cikisYap();
          navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <Ionicons name="business-outline" size={36} color={Colors.white} />
        <Text style={styles.sirketAdi} numberOfLines={1}>
          {calisilanSirket || 'ETACep'}
        </Text>
        <Text style={styles.kullaniciAdi}>
          {yetkiBilgileri?.kullaniciKodu ?? ''}
        </Text>
      </View>

      {/* Menü Öğeleri */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {menuOgeleri.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => {
              navigation.closeDrawer();
              if (item.ekran === 'Ayarlar') {
                navigation
                  .getParent<StackNavigationProp<RootStackParamList>>()
                  ?.navigate('Ayarlar');
              } else {
                navigation.navigate(item.ekran as never);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={22} color={Colors.white} />
            <Text style={styles.menuText}>{item.baslik}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Çıkış */}
      <TouchableOpacity style={styles.cikisBtn} onPress={handleCikis}>
        <Ionicons name="log-out-outline" size={22} color={Colors.white} />
        <Text style={styles.menuText}>Çıkış</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  sirketAdi: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  kullaniciAdi: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  menuText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '500',
  },
  cikisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
});
