import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, type ThemeColors } from '../constants/Colors';
import { Config } from '../constants/Config';

export type TemaSecimi = 'sistem' | 'light' | 'dark';

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  temaSecimi: TemaSecimi;
  setTemaSecimi: (tema: TemaSecimi) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LightColors,
  isDark: false,
  temaSecimi: 'sistem',
  setTemaSecimi: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [temaSecimi, setTemaSecimiState] = useState<TemaSecimi>('sistem');

  useEffect(() => {
    AsyncStorage.getItem(Config.STORAGE_KEYS.TEMA_SECIMI).then((val) => {
      if (val === 'light' || val === 'dark' || val === 'sistem') {
        setTemaSecimiState(val);
      }
    });
  }, []);

  const setTemaSecimi = (tema: TemaSecimi) => {
    setTemaSecimiState(tema);
    AsyncStorage.setItem(Config.STORAGE_KEYS.TEMA_SECIMI, tema);
  };

  const isDark =
    temaSecimi === 'sistem' ? scheme === 'dark' : temaSecimi === 'dark';

  const value = useMemo<ThemeContextValue>(() => ({
    colors: isDark ? DarkColors : LightColors,
    isDark,
    temaSecimi,
    setTemaSecimi,
  }), [isDark, temaSecimi]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
