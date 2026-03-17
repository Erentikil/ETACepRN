import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import type { RootStackParamList } from './types';
import LoginSayfasi from '../screens/auth/LoginSayfasi';
import Ayarlar from '../screens/ayarlar/Ayarlar';
import DrawerNavigator from './DrawerNavigator';
import CariSecim from '../screens/main/CariSecim';
import SepetListesi from '../screens/main/SepetListesi';
import OnayDuzenleme from '../screens/main/OnayDuzenleme';
import { Colors } from '../constants/Colors';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginSayfasi}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Ayarlar"
          component={Ayarlar}
          options={{ title: 'Ayarlar', headerShown: true }}
        />
        <Stack.Screen
          name="Drawer"
          component={DrawerNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CariSecim"
          component={CariSecim}
          options={{ title: 'Cari Seçin' }}
        />
        <Stack.Screen
          name="SepetListesi"
          component={SepetListesi}
          options={{ title: 'Sepet' }}
        />
        <Stack.Screen
          name="OnayDuzenleme"
          component={OnayDuzenleme}
          options={{ title: 'Onay Düzenleme' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
