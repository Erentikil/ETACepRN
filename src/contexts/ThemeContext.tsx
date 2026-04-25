import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETLER, VARSAYILAN_PALET, type PaletKey, type ThemeColors } from '../constants/Colors';
import { Config } from '../constants/Config';
import { setAktifFontOlcek, type FontBoyutu, FONT_OLCEKLERI } from '../utils/fontOlcek';

export type TemaSecimi = 'sistem' | 'light' | 'dark';

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  temaSecimi: TemaSecimi;
  setTemaSecimi: (tema: TemaSecimi) => void;
  paletKey: PaletKey;
  setPaletKey: (palet: PaletKey) => void;
  fontBoyutu: FontBoyutu;
  setFontBoyutu: (boyut: FontBoyutu) => void;
}

const defaultPalet = PALETLER[VARSAYILAN_PALET];

const ThemeContext = createContext<ThemeContextValue>({
  colors: defaultPalet.light,
  isDark: false,
  temaSecimi: 'sistem',
  setTemaSecimi: () => {},
  paletKey: VARSAYILAN_PALET,
  setPaletKey: () => {},
  fontBoyutu: 'varsayilan',
  setFontBoyutu: () => {},
});

function isPaletKey(val: unknown): val is PaletKey {
  return typeof val === 'string' && val in PALETLER;
}

function isFontBoyutu(val: unknown): val is FontBoyutu {
  return typeof val === 'string' && val in FONT_OLCEKLERI;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [temaSecimi, setTemaSecimiState] = useState<TemaSecimi>('sistem');
  const [paletKey, setPaletKeyState] = useState<PaletKey>(VARSAYILAN_PALET);
  const [fontBoyutu, setFontBoyutuState] = useState<FontBoyutu>('varsayilan');

  useEffect(() => {
    AsyncStorage.getItem(Config.STORAGE_KEYS.TEMA_SECIMI).then((val) => {
      if (val === 'light' || val === 'dark' || val === 'sistem') {
        setTemaSecimiState(val);
      }
    });
    AsyncStorage.getItem(Config.STORAGE_KEYS.RENK_PALETI).then((val) => {
      if (isPaletKey(val)) {
        setPaletKeyState(val);
      }
    });
    AsyncStorage.getItem(Config.STORAGE_KEYS.FONT_BOYUTU).then((val) => {
      if (isFontBoyutu(val)) {
        setFontBoyutuState(val);
        setAktifFontOlcek(val);
      }
    });
  }, []);

  const setTemaSecimi = (tema: TemaSecimi) => {
    setTemaSecimiState(tema);
    AsyncStorage.setItem(Config.STORAGE_KEYS.TEMA_SECIMI, tema);
  };

  const setPaletKey = (palet: PaletKey) => {
    setPaletKeyState(palet);
    AsyncStorage.setItem(Config.STORAGE_KEYS.RENK_PALETI, palet);
  };

  const setFontBoyutu = (boyut: FontBoyutu) => {
    setFontBoyutuState(boyut);
    setAktifFontOlcek(boyut);
    AsyncStorage.setItem(Config.STORAGE_KEYS.FONT_BOYUTU, boyut);
  };

  const isDark =
    temaSecimi === 'sistem' ? scheme === 'dark' : temaSecimi === 'dark';

  const value = useMemo<ThemeContextValue>(() => {
    const palet = PALETLER[paletKey] ?? defaultPalet;
    return {
      colors: isDark ? palet.dark : palet.light,
      isDark,
      temaSecimi,
      setTemaSecimi,
      paletKey,
      setPaletKey,
      fontBoyutu,
      setFontBoyutu,
    };
  }, [isDark, temaSecimi, paletKey, fontBoyutu]);

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
