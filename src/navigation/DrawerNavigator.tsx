import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import type { DrawerParamList } from './types';
import DrawerMenu from '../components/DrawerMenu';
import AnaSayfa from '../screens/main/AnaSayfa';
import { Colors } from '../constants/Colors';

// Placeholder ekran
import PlaceholderEkrani from '../screens/main/PlaceholderEkrani';
import HizliIslemler from '../screens/main/HizliIslemler';

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="AnaSayfa"
      drawerContent={(props) => <DrawerMenu {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
        drawerStyle: { width: 280 },
        swipeEnabled: true,
      }}
    >
      <Drawer.Screen
        name="AnaSayfa"
        component={AnaSayfa}
        options={{ title: 'Ana Sayfa' }}
      />
      <Drawer.Screen
        name="HizliIslemler"
        component={HizliIslemler}
        options={{ title: 'Hızlı İşlemler' }}
      />
      <Drawer.Screen
        name="AlisSatisIslemleri"
        component={PlaceholderEkrani}
        options={{ title: 'Alış Satış İşlemleri' }}
      />
      <Drawer.Screen
        name="RenkBedenIslemleri"
        component={PlaceholderEkrani}
        options={{ title: 'Renk-Beden İşlemleri' }}
      />
      <Drawer.Screen
        name="SiparisKapama"
        component={PlaceholderEkrani}
        options={{ title: 'Sipariş Kapama' }}
      />
      <Drawer.Screen
        name="Tahsilatlar"
        component={PlaceholderEkrani}
        options={{ title: 'Tahsilat İşlemleri' }}
      />
      <Drawer.Screen
        name="Raporlar"
        component={PlaceholderEkrani}
        options={{ title: 'Raporlar' }}
      />
      <Drawer.Screen
        name="BekleyenEvraklar"
        component={PlaceholderEkrani}
        options={{ title: 'Bekleyen Evraklar' }}
      />
      <Drawer.Screen
        name="ZiyaretIslemleri"
        component={PlaceholderEkrani}
        options={{ title: 'Ziyaret İşlemleri' }}
      />
      <Drawer.Screen
        name="OnayIslemleri"
        component={PlaceholderEkrani}
        options={{ title: 'Onay İşlemleri' }}
      />
      <Drawer.Screen
        name="KurBilgileri"
        component={PlaceholderEkrani}
        options={{ title: 'Kur Bilgileri' }}
      />
      <Drawer.Screen
        name="DosyaIslemleri"
        component={PlaceholderEkrani}
        options={{ title: 'Dosya İşlemleri' }}
      />
      <Drawer.Screen
        name="Dizayn"
        component={PlaceholderEkrani}
        options={{ title: 'Dizayn' }}
      />
      <Drawer.Screen
        name="Ayarlar"
        component={PlaceholderEkrani}
        options={{ title: 'Ayarlar' }}
      />
      <Drawer.Screen
        name="Panel"
        component={PlaceholderEkrani}
        options={{ title: 'Kontrol Panel' }}
      />
    </Drawer.Navigator>
  );
}
