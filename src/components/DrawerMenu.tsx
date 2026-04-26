import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/appStore';
import { useColors } from '../contexts/ThemeContext';
import { useT } from '../i18n/I18nContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Config } from '../constants/Config';
import type { RootStackParamList } from '../navigation/types';

interface MenuItem {
  id: string;
  baslik: string;
  icon: keyof typeof Ionicons.glyphMap;
  ekran: string;
  yetki: boolean;
}

export default function DrawerMenu({ navigation, state }: DrawerContentComponentProps) {
  const Colors = useColors();
  const t = useT();
  const aktifRoute = state.routes[state.index]?.name;
  const insets = useSafeAreaInsets();
  const { menuYetkiBilgileri, yetkiBilgileri, calisilanSirket, cikisYap } =
    useAppStore();

  const tumMenuOgeleri: MenuItem[] = [
    {
      id: 'anaSayfa',
      baslik: t('menu.anaSayfa'),
      icon: 'home-outline',
      ekran: 'AnaSayfa',
      yetki: true,
    },
    {
      id: 'hizliV2',
      baslik: t('menu.alisSatis'),
      icon: 'flash-outline',
      ekran: 'HizliIslemlerV2',
      yetki: menuYetkiBilgileri?.alisSatisIslemler ?? false,
    },
    {
      id: 'cariIletisim',
      baslik: t('menu.cariIletisim'),
      icon: 'location-outline',
      ekran: 'CariIletisim',
      yetki: menuYetkiBilgileri?.alisSatisIslemler ?? false,
    },
    {
      id: 'alimSatim',
      baslik: t('menu.evrakOlustur'),
      icon: 'swap-horizontal-outline',
      ekran: 'AlisSatisIslemleri',
      yetki: menuYetkiBilgileri?.evrakDuzenle ?? false,
    },
    {
      id: 'fiyatGor',
      baslik: t('menu.fiyatGor'),
      icon: 'pricetag-outline',
      ekran: 'FiyatGor',
      yetki: menuYetkiBilgileri?.fiyatGor ?? false,
    },
    {
      id: 'barkodEkleme',
      baslik: t('menu.barkodEkleme'),
      icon: 'barcode-outline',
      ekran: 'BarkodEkleme',
      yetki: menuYetkiBilgileri?.barkodEkle ?? false,
    },
    {
      id: 'renkBeden',
      baslik: t('menu.renkBeden'),
      icon: 'color-palette-outline',
      ekran: 'RenkBedenIslemleri',
      yetki: menuYetkiBilgileri?.renkBedenIslemleri ?? false,
    },
    {
      id: 'siparisKapama',
      baslik: t('menu.siparisKapama'),
      icon: 'checkmark-circle-outline',
      ekran: 'SiparisKapama',
      yetki: menuYetkiBilgileri?.siparisKapama ?? false,
    },
    {
      id: 'tahsilat',
      baslik: t('menu.tahsilat'),
      icon: 'cash-outline',
      ekran: 'Tahsilatlar',
      yetki: menuYetkiBilgileri?.tahsilatlar ?? false,
    },
    {
      id: 'raporlar',
      baslik: t('menu.raporlar'),
      icon: 'bar-chart-outline',
      ekran: 'Raporlar',
      yetki: menuYetkiBilgileri?.raporlar ?? false,
    },
    {
      id: 'bekleyenEvraklar',
      baslik: t('menu.bekleyenEvraklar'),
      icon: 'document-text-outline',
      ekran: 'BekleyenEvraklar',
      yetki: menuYetkiBilgileri?.bekleyenEvraklar ?? false,
    },
    {
      id: 'ziyaret',
      baslik: t('menu.crmTeklif'),
      icon: 'people-outline',
      ekran: 'ZiyaretIslemleri',
      yetki: menuYetkiBilgileri?.crm ?? false,
    },
    {
      id: 'onay',
      baslik: t('menu.onayIslemleri'),
      icon: 'shield-checkmark-outline',
      ekran: 'OnayIslemleri',
      yetki: menuYetkiBilgileri?.onayIslemleri ?? false,
    },
    {
      id: 'kontrolPaneli',
      baslik: t('menu.kontrolPaneli'),
      icon: 'grid-outline',
      ekran: 'Panel',
      yetki: menuYetkiBilgileri?.kontrolPanel ?? false,
    },
    {
      id: 'kur',
      baslik: t('menu.kurBilgileri'),
      icon: 'trending-up-outline',
      ekran: 'KurBilgileri',
      yetki: menuYetkiBilgileri?.kurBilgileri ?? false,
    },
    {
      id: 'ayarlar',
      baslik: t('menu.ayarlar'),
      icon: 'settings-outline',
      ekran: 'Ayarlar',
      yetki: menuYetkiBilgileri?.ayarlar ?? true,
    },
    {
      id: 'hakkinda',
      baslik: t('menu.hakkinda'),
      icon: 'information-circle-outline',
      ekran: 'Hakkinda',
      yetki: true,
    },
  ];
  const menuOgeleri = tumMenuOgeleri.filter((m) => m.yetki);

  const handleCikis = () => {
    Alert.alert(t('menu.cikis'), t('menu.cikisOnay'), [
      { text: t('common.iptal'), style: 'cancel' },
      {
        text: t('menu.cikis'),
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
    <View style={[styles.container, { backgroundColor: Colors.drawerBackground }]}>
      {/* Başlık */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/eta-logo-white-red.png')}
          style={styles.drawerLogo}
          resizeMode="contain"
        />
        <Text style={[styles.sirketAdi, { color: Colors.drawerText }]} numberOfLines={1}>
          {calisilanSirket || 'ETACep'}
        </Text>
      </View>

      {/* Menü Öğeleri */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {menuOgeleri.map((item) => {
          const aktif = item.ekran === aktifRoute;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                aktif && { backgroundColor: Colors.drawerActiveBackground },
              ]}
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
              <Ionicons name={item.icon} size={22} color={aktif ? Colors.accent : Colors.drawerText} />
              <Text style={[styles.menuText, { color: aktif ? Colors.accent : Colors.drawerText, fontWeight: aktif ? '700' : '500' }]}>{item.baslik}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Çıkış */}
      <TouchableOpacity style={[styles.cikisBtn, { paddingBottom: 18 + insets.bottom }]} onPress={handleCikis}>
        <Ionicons name="log-out-outline" size={22} color={Colors.drawerText} />
        <Text style={[styles.menuText, { color: Colors.drawerText }]}>{t('menu.cikis')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 72,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,39,0.35)',
    gap: 6,
  },
  drawerLogo: {
    width: 40,
    height: 40,
  },
  sirketAdi: {
    fontSize: 15,
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
    borderTopColor: 'rgba(201,162,39,0.35)',
    marginBottom: 20,
  },
});
