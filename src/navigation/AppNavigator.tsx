import React, { useMemo, useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { I18nProvider, useT } from '../i18n/I18nContext';
import { useAppStore } from '../store/appStore';
import { Config } from '../constants/Config';

const Stack = createStackNavigator<RootStackParamList>();

function AppStack() {
  const { colors, isDark } = useTheme();
  const t = useT();
  const setUyumluluk = useAppStore((s) => s.setUyumluluk);

  useEffect(() => {
    AsyncStorage.getItem(Config.STORAGE_KEYS.UYUMLULUK).then((val) => {
      if (val === 'V8' || val === 'SQL') setUyumluluk(val);
    });
  }, []);

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

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerBackTitle: t('common.geri'),
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackground: () => (
            <LinearGradient
              colors={[colors.headerBackground, colors.headerGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: colors.accent }}
            />
          ),
          headerStyle: { elevation: 0, shadowOpacity: 0 },
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
          options={{ title: t('header.ayarlar'), headerShown: true }}
        />
        <Stack.Screen
          name="Drawer"
          component={DrawerNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CariSecim"
          component={CariSecim}
          options={{ title: t('header.cariSecim') }}
        />
        <Stack.Screen
          name="CRMCariSecim"
          component={CRMCariSecim}
          options={{ title: t('header.crmCariSecim') }}
        />
        <Stack.Screen
          name="SepetListesi"
          component={SepetListesi}
          options={{ title: t('header.sepetListesi') }}
        />
        <Stack.Screen
          name="OnayDuzenleme"
          component={OnayDuzenleme}
          options={{ title: t('header.onayDuzenleme') }}
        />
        <Stack.Screen
          name="KontrolPaneliDetay"
          component={KontrolPaneliDetay}
          options={{ title: t('header.kontrolPaneliDetay') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AppStack />
      </ThemeProvider>
    </I18nProvider>
  );
}
