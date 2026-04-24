import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { DrawerParamList } from './types';
import DrawerMenu from '../components/DrawerMenu';
import AnaSayfa from '../screens/main/AnaSayfa';
import { useColors } from '../contexts/ThemeContext';

import KontrolPaneli from '../screens/main/KontrolPaneli';
import HizliIslemlerV2 from '../screens/main/HizliIslemlerV2';
import SiparisKapama from '../screens/main/SiparisKapama';
import KurBilgileri from '../screens/main/KurBilgileri';
import BekleyenSiparisler from '../screens/main/BekleyenSiparisler';
import OnayIslemleri from '../screens/main/OnayIslemleri';
import BekleyenEvraklar from '../screens/main/BekleyenEvraklar';
import RaporlarAnaSayfa from '../screens/main/RaporlarAnaSayfa';
import CariEkstreListesi from '../screens/main/CariEkstreListesi';
import CekSenetListesi from '../screens/main/CekSenetListesi';
import StokluCariEkstreListesi from '../screens/main/StokluCariEkstreListesi';
import TahsilatEkrani from '../screens/main/TahsilatEkrani';
import AlisSatisIslemleri from '../screens/main/AlisSatisIslemleri';
import RenkBedenIslemleri from '../screens/main/RenkBedenIslemleri';
import PDFRaporGoster from '../screens/main/PDFRaporGoster';
import KasaBakiye from '../screens/main/KasaBakiye';
import BankaBakiye from '../screens/main/BankaBakiye';
import CariBakiye from '../screens/main/CariBakiye';
import StokRapor from '../screens/main/StokRapor';
import CariSecimliRapor from '../screens/main/CariSecimliRapor';
import FiyatGor from '../screens/main/FiyatGor';
import BarkodEkleme from '../screens/main/BarkodEkleme';
import CRMTeklif from '../screens/main/CRMTeklif/CRMTeklif';
import CariIletisim from '../screens/main/CariIletisim';
import Hakkinda from '../screens/main/Hakkinda';

const Drawer = createDrawerNavigator<DrawerParamList>();

function RaporGeriButonu({ navigation, kaynakEkran }: { navigation: DrawerNavigationProp<DrawerParamList>; kaynakEkran?: string }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={() => {
        if (kaynakEkran === 'Tahsilatlar') {
          navigation.navigate('Tahsilatlar');
        } else if (kaynakEkran) {
          navigation.getParent()?.goBack();
        } else {
          navigation.navigate('Raporlar');
        }
      }}
      style={{ paddingHorizontal: 12 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="arrow-back" size={24} color={colors.headerText} />
    </TouchableOpacity>
  );
}

export default function DrawerNavigator() {
  const colors = useColors();
  const gradientEnd = colors.headerBackground === '#1a1a2e' ? '#0d0d1a' : '#1a1f5e';

  return (
    <Drawer.Navigator
      initialRouteName="AnaSayfa"
      drawerContent={(props) => <DrawerMenu {...props} />}
      screenOptions={({ navigation, route }) => ({
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackground: () => (
          <LinearGradient
            colors={[colors.headerBackground, gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        ),
        headerRight: route.name === 'AnaSayfa' ? undefined : () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('AnaSayfa')}
            style={{ paddingHorizontal: 12 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="home-outline" size={22} color={colors.headerText} />
          </TouchableOpacity>
        ),
        drawerStyle: { width: 280 },
        swipeEnabled: true,
      })}
    >
      <Drawer.Screen
        name="AnaSayfa"
        component={AnaSayfa}
        options={{ title: 'Ana Sayfa' }}
      />
      <Drawer.Screen
        name="HizliIslemlerV2"
        component={HizliIslemlerV2}
        options={{ title: 'Alış/Satış' }}
      />
      <Drawer.Screen
        name="AlisSatisIslemleri"
        component={AlisSatisIslemleri}
        options={{ title: 'Evrak Oluştur' }}
      />
      <Drawer.Screen
        name="RenkBedenIslemleri"
        component={RenkBedenIslemleri}
        options={{ title: 'Renk-Beden İşlemleri' }}
      />
      <Drawer.Screen
        name="SiparisKapama"
        component={SiparisKapama}
        options={{ title: 'Sipariş Kapama' }}
      />
      <Drawer.Screen
        name="Tahsilatlar"
        component={TahsilatEkrani}
        options={{ title: 'Cari Tahsilat' }}
      />
      <Drawer.Screen
        name="Raporlar"
        component={RaporlarAnaSayfa}
        options={{ title: 'Raporlar' }}
      />
      <Drawer.Screen
        name="CariEkstreListesi"
        component={CariEkstreListesi}
        options={({ navigation, route }) => ({
          title: 'Cari Ekstre',
          headerLeft: () => <RaporGeriButonu navigation={navigation} kaynakEkran={(route.params as any)?.kaynakEkran} />,
        })}
      />
      <Drawer.Screen
        name="CekSenetListesi"
        component={CekSenetListesi}
        options={({ navigation }) => ({
          title: 'Çek Senet Durumu',
          headerLeft: () => <RaporGeriButonu navigation={navigation} />,
        })}
      />
      <Drawer.Screen
        name="StokluCariEkstreListesi"
        component={StokluCariEkstreListesi}
        options={({ navigation, route }) => ({
          title: 'Stoklu Cari Ekstre',
          headerLeft: () => <RaporGeriButonu navigation={navigation} kaynakEkran={(route.params as any)?.kaynakEkran} />,
        })}
      />
      <Drawer.Screen
        name="BekleyenEvraklar"
        component={BekleyenEvraklar}
        options={{ title: 'Bekleyen Evraklar' }}
      />
      <Drawer.Screen
        name="BekleyenSiparisler"
        component={BekleyenSiparisler}
        options={({ navigation, route }) => ({
          title: 'Bekleyen Siparişler',
          headerLeft: () => <RaporGeriButonu navigation={navigation} kaynakEkran={(route.params as any)?.kaynakEkran} />,
        })}
      />
      <Drawer.Screen
        name="ZiyaretIslemleri"
        component={CRMTeklif}
        options={{ title: 'CRM Teklif' }}
      />
      <Drawer.Screen
        name="OnayIslemleri"
        component={OnayIslemleri}
        options={{ title: 'Onay İşlemleri' }}
      />
      <Drawer.Screen
        name="KurBilgileri"
        component={KurBilgileri}
        options={{ title: 'Kur Bilgileri' }}
      />
      <Drawer.Screen
        name="Panel"
        component={KontrolPaneli}
        options={{ title: 'Kontrol Panel' }}
      />
      <Drawer.Screen
        name="PDFRaporGoster"
        component={PDFRaporGoster}
        options={({ navigation, route }) => ({
          title: (route.params as any)?.baslik ?? 'Rapor',
          headerLeft: () => <RaporGeriButonu navigation={navigation} kaynakEkran={(route.params as any)?.kaynakEkran} />,
        })}
      />
      <Drawer.Screen
        name="KasaBakiye"
        component={KasaBakiye}
        options={({ navigation }) => ({
          title: 'Kasa Bakiye',
          headerLeft: () => <RaporGeriButonu navigation={navigation} />,
        })}
      />
      <Drawer.Screen
        name="BankaBakiye"
        component={BankaBakiye}
        options={({ navigation }) => ({
          title: 'Banka Bakiye',
          headerLeft: () => <RaporGeriButonu navigation={navigation} />,
        })}
      />
      <Drawer.Screen
        name="CariBakiye"
        component={CariBakiye}
        options={({ navigation }) => ({
          title: 'Cari Bakiye',
          headerLeft: () => <RaporGeriButonu navigation={navigation} />,
        })}
      />
      <Drawer.Screen
        name="FiyatGor"
        component={FiyatGor}
        options={{ title: 'Fiyat Gör' }}
      />
      <Drawer.Screen
        name="BarkodEkleme"
        component={BarkodEkleme}
        options={{ title: 'Barkod Ekleme' }}
      />
      <Drawer.Screen
        name="CariIletisim"
        component={CariIletisim}
        options={{ title: 'Cari İletişim' }}
      />
      <Drawer.Screen
        name="StokRapor"
        component={StokRapor}
        options={({ navigation, route }) => ({
          title: (route.params as any)?.mod === 'fiyat' ? 'Stok Fiyat' : 'Stok Bakiye',
          headerLeft: () => <RaporGeriButonu navigation={navigation} />,
        })}
      />
      <Drawer.Screen
        name="CariSecimliRapor"
        component={CariSecimliRapor}
        options={({ navigation, route }) => ({
          title: (route.params as any)?.baslik ?? 'Rapor',
          headerLeft: () => <RaporGeriButonu navigation={navigation} />,
        })}
      />
      <Drawer.Screen
        name="Hakkinda"
        component={Hakkinda}
        options={{ title: 'Hakkında' }}
      />
    </Drawer.Navigator>
  );
}
