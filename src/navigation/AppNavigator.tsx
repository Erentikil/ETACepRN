import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import type { RootStackParamList } from './types';
import LoginSayfasi from '../screens/auth/LoginSayfasi';
import Ayarlar from '../screens/ayarlar/Ayarlar';
import DrawerNavigator from './DrawerNavigator';
import CariSecim from '../screens/main/CariSecim';
import CRMCariSecim from '../screens/main/CRMTeklif/CRMCariSecim';
import SepetListesi from '../screens/main/SepetListesi';
import OnayDuzenleme from '../screens/main/OnayDuzenleme';
import KontrolPaneliDetay from '../screens/main/KontrolPaneliDetay';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

const Stack = createStackNavigator<RootStackParamList>();

function AppStack() {
  const { colors, isDark } = useTheme();

  const navigationTheme = useMemo(() => ({
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  }), [isDark, colors]);

  const gradientEnd = isDark ? '#0d0d1a' : '#1a1f5e';

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerBackTitle: 'Geri',
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
          name="CRMCariSecim"
          component={CRMCariSecim}
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
        <Stack.Screen
          name="KontrolPaneliDetay"
          component={KontrolPaneliDetay}
          options={{ title: 'Kontrol Panel Detay' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return (
    <ThemeProvider>
      <AppStack />
    </ThemeProvider>
  );
}
