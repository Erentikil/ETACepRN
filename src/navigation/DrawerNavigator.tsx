import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDrawerNavigator } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { DrawerParamList } from './types';
import DrawerMenu from '../components/DrawerMenu';
import AnaSayfa from '../screens/main/AnaSayfa';
import { Colors } from '../constants/Colors';

// Placeholder ekran
import PlaceholderEkrani from '../screens/main/PlaceholderEkrani';
import HizliIslemler from '../screens/main/HizliIslemler';
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
import RenkBedenIslemleri from '../screens/main/RenkBedenIslemleri';
import PDFRaporGoster from '../screens/main/PDFRaporGoster';
import KasaBakiye from '../screens/main/KasaBakiye';
import BankaBakiye from '../screens/main/BankaBakiye';
import CariBakiye from '../screens/main/CariBakiye';
import StokRapor from '../screens/main/StokRapor';
import CariSecimliRapor from '../screens/main/CariSecimliRapor';

const Drawer = createDrawerNavigator<DrawerParamList>();

function RaporGeriButonu({ navigation }: { navigation: DrawerNavigationProp<DrawerParamList> }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Raporlar')}
      style={{ paddingHorizontal: 12 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="arrow-back" size={24} color={Colors.white} />
    </TouchableOpacity>
  );
}

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
        component={RenkBedenIslemleri}
        options={{ title: 'Renk-Beden İşlemleri' }}
      />
      <Drawer.Screen
        name="SiparisKapama"
        component={SiparisKapama}
        options={{ title: 'Sipariş Açma/Kapama' }}
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
        options={({ navigation }) => ({
          title: 'Cari Ekstre',
          headerLeft: () => <RaporGeriButonu navigation={navigation} />,
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
        options={({ navigation }) => ({
          title: 'Stoklu Cari Ekstre',
          headerLeft: () => <RaporGeriButonu navigation={navigation} />,
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
        options={({ navigation }) => ({
          title: 'Bekleyen Siparişler',
          headerLeft: () => <RaporGeriButonu navigation={navigation} />,
        })}
      />
      <Drawer.Screen
        name="ZiyaretIslemleri"
        component={PlaceholderEkrani}
        options={{ title: 'Ziyaret İşlemleri' }}
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
        component={PlaceholderEkrani}
        options={{ title: 'Kontrol Panel' }}
      />
      <Drawer.Screen
        name="PDFRaporGoster"
        component={PDFRaporGoster}
        options={({ navigation, route }) => ({
          title: (route.params as any)?.baslik ?? 'Rapor',
          headerLeft: () => <RaporGeriButonu navigation={navigation} />,
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
    </Drawer.Navigator>
  );
}
