import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import { translations, type Dil, type CeviriAnahtari } from './translations';

interface I18nContextValue {
  dil: Dil;
  setDil: (val: Dil) => void;
  t: (anahtar: CeviriAnahtari, parametreler?: Record<string, string | number>) => string;
}

function interpolasyon(metin: string, parametreler?: Record<string, string | number>): string {
  if (!parametreler) return metin;
  return metin.replace(/\{(\w+)\}/g, (eslesen, anahtar) =>
    parametreler[anahtar] != null ? String(parametreler[anahtar]) : eslesen,
  );
}

const I18nContext = createContext<I18nContextValue>({
  dil: 'tr',
  setDil: () => {},
  t: (anahtar) => anahtar,
});

function isDil(val: unknown): val is Dil {
  return val === 'tr' || val === 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [dil, setDilState] = useState<Dil>('tr');

  useEffect(() => {
    AsyncStorage.getItem(Config.STORAGE_KEYS.DIL).then((val) => {
      if (isDil(val)) setDilState(val);
    });
  }, []);

  const setDil = useCallback((val: Dil) => {
    setDilState(val);
    AsyncStorage.setItem(Config.STORAGE_KEYS.DIL, val);
  }, []);

  const t = useCallback(
    (anahtar: CeviriAnahtari, parametreler?: Record<string, string | number>): string => {
      const ham = translations[dil][anahtar] ?? translations.tr[anahtar] ?? anahtar;
      return interpolasyon(ham, parametreler);
    },
    [dil],
  );

  const value = useMemo<I18nContextValue>(() => ({ dil, setDil, t }), [dil, setDil, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext).t;
}

export function useI18n() {
  return useContext(I18nContext);
}
