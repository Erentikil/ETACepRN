export interface ThemeColors {
  primary: string;
  accent: string;
  error: string;
  success: string;
  white: string;
  black: string;
  lightGray: string;
  gray: string;
  darkGray: string;
  border: string;
  inputBackground: string;
  drawerBackground: string;
  drawerText: string;
  drawerActiveBackground: string;
  headerBackground: string;
  headerGradientEnd: string;
  headerText: string;
  priceColor: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
}

export interface PaletDefinition {
  key: PaletKey;
  isim: string;
  aciklama: string;
  light: ThemeColors;
  dark: ThemeColors;
}

// PRO — "Obsidian Gold Luxe": saf siyah + parlak altın
const ObsidianGoldLight: ThemeColors = {
  primary: '#0a0a0a',
  accent: '#c9a227',
  error: '#c62828',
  success: '#2e7d32',
  white: '#ffffff',
  black: '#000000',
  lightGray: '#f5f3ee',
  gray: '#8a857a',
  darkGray: '#2a2a2a',
  border: '#e8e3d5',
  inputBackground: '#faf8f2',
  drawerBackground: '#000000',
  drawerText: '#ffc857',
  drawerActiveBackground: 'rgba(255,200,87,0.22)',
  headerBackground: '#0a0a0a',
  headerGradientEnd: '#1a1a1a',
  headerText: '#ffc857',
  priceColor: '#c9a227',
  background: '#f5f3ee',
  card: '#ffffff',
  text: '#0a0a0a',
  textSecondary: '#5a5650',
};

const ObsidianGoldDark: ThemeColors = {
  primary: '#d4a34a',
  accent: '#ffc857',
  error: '#ef5350',
  success: '#66bb6a',
  white: '#0f0f10',
  black: '#ffffff',
  lightGray: '#050505',
  gray: '#7a7468',
  darkGray: '#e8e3d5',
  border: '#2a2620',
  inputBackground: '#141414',
  drawerBackground: '#000000',
  drawerText: '#ffc857',
  drawerActiveBackground: 'rgba(255,200,87,0.18)',
  headerBackground: '#000000',
  headerGradientEnd: '#0f0f10',
  headerText: '#ffc857',
  priceColor: '#ffc857',
  background: '#050505',
  card: '#1c1c22',
  text: '#e8e3d5',
  textSecondary: '#a09a8a',
};

// PRO — "Platinum Slate": grafit + platin gümüşü + bordo fiyat vurgusu
const PlatinumSlateLight: ThemeColors = {
  primary: '#2d3a4a',
  accent: '#6d7e99',
  error: '#b00020',
  success: '#2e7d32',
  white: '#ffffff',
  black: '#000000',
  lightGray: '#eceef1',
  gray: '#8b95a1',
  darkGray: '#3a4049',
  border: '#d5dae0',
  inputBackground: '#f5f7f9',
  drawerBackground: '#1b222b',
  drawerText: '#e6ebf1',
  drawerActiveBackground: 'rgba(174,191,209,0.18)',
  headerBackground: '#1b222b',
  headerGradientEnd: '#0e1319',
  headerText: '#e6ebf1',
  priceColor: '#c2185b',
  background: '#f1f3f6',
  card: '#ffffff',
  text: '#1a1e24',
  textSecondary: '#6b7380',
};

const PlatinumSlateDark: ThemeColors = {
  primary: '#8ea3b8',
  accent: '#aebfd1',
  error: '#ef5350',
  success: '#66bb6a',
  white: '#161a1f',
  black: '#ffffff',
  lightGray: '#0d1014',
  gray: '#7a8592',
  darkGray: '#d9dee4',
  border: '#2a3038',
  inputBackground: '#1d2229',
  drawerBackground: '#0c1016',
  drawerText: '#e6ebf1',
  drawerActiveBackground: 'rgba(174,191,209,0.14)',
  headerBackground: '#0c1016',
  headerGradientEnd: '#05080c',
  headerText: '#e6ebf1',
  priceColor: '#ec407a',
  background: '#0a0d11',
  card: '#151a20',
  text: '#e3e7ec',
  textSecondary: '#9aa3b0',
};

// PRO — "Royal Obsidian": kraliyet indigo + bordo/şarap aksan
const RoyalObsidianLight: ThemeColors = {
  primary: '#1e2761',
  accent: '#8e2c3b',
  error: '#c62828',
  success: '#388e3c',
  white: '#ffffff',
  black: '#000000',
  lightGray: '#f3f1f6',
  gray: '#908c9c',
  darkGray: '#3a3645',
  border: '#dcd6e4',
  inputBackground: '#faf8fc',
  drawerBackground: '#14173d',
  drawerText: '#f3ecd9',
  drawerActiveBackground: 'rgba(142,44,59,0.22)',
  headerBackground: '#14173d',
  headerGradientEnd: '#08091f',
  headerText: '#f3ecd9',
  priceColor: '#8e2c3b',
  background: '#f7f5fa',
  card: '#ffffff',
  text: '#1a1823',
  textSecondary: '#6a6579',
};

const RoyalObsidianDark: ThemeColors = {
  primary: '#3d4bb5',
  accent: '#c84b5f',
  error: '#ef5350',
  success: '#66bb6a',
  white: '#1a1624',
  black: '#ffffff',
  lightGray: '#0e0b16',
  gray: '#857f94',
  darkGray: '#e4dfef',
  border: '#2a2438',
  inputBackground: '#211b2d',
  drawerBackground: '#0a0818',
  drawerText: '#f3ecd9',
  drawerActiveBackground: 'rgba(200,75,95,0.18)',
  headerBackground: '#0a0818',
  headerGradientEnd: '#04020e',
  headerText: '#f3ecd9',
  priceColor: '#e57373',
  background: '#09071a',
  card: '#15121f',
  text: '#ece8f5',
  textSecondary: '#a49dae',
};

// PRO — "Abyss Teal": derin okyanus teal + yanmış bakır + parlak mint
const AbyssTealLight: ThemeColors = {
  primary: '#0d3b3d',
  accent: '#c97b4f',
  error: '#c62828',
  success: '#4ade80',
  white: '#ffffff',
  black: '#000000',
  lightGray: '#e8efed',
  gray: '#8a9a97',
  darkGray: '#0a2628',
  border: '#d5e2df',
  inputBackground: '#f5faf8',
  drawerBackground: '#051f22',
  drawerText: '#a8dadc',
  drawerActiveBackground: 'rgba(201,123,79,0.22)',
  headerBackground: '#051f22',
  headerGradientEnd: '#0d3b3d',
  headerText: '#a8dadc',
  priceColor: '#c97b4f',
  background: '#f0f5f4',
  card: '#ffffff',
  text: '#0a2628',
  textSecondary: '#5a7a76',
};

const AbyssTealDark: ThemeColors = {
  primary: '#5eead4',
  accent: '#e8a87c',
  error: '#ef5350',
  success: '#4ade80',
  white: '#0a1e22',
  black: '#ffffff',
  lightGray: '#020a0d',
  gray: '#7a928e',
  darkGray: '#e0f0ee',
  border: '#0f2d30',
  inputBackground: '#0a1e22',
  drawerBackground: '#03161a',
  drawerText: '#a8dadc',
  drawerActiveBackground: 'rgba(232,168,124,0.18)',
  headerBackground: '#03161a',
  headerGradientEnd: '#051f22',
  headerText: '#a8dadc',
  priceColor: '#e8a87c',
  background: '#020a0d',
  card: '#0a1e22',
  text: '#e0f0ee',
  textSecondary: '#98aea9',
};

export type PaletKey = 'obsidianGold' | 'platinumSlate' | 'royalObsidian' | 'abyssTeal';

export const PALETLER: Record<PaletKey, PaletDefinition> = {
  obsidianGold: {
    key: 'obsidianGold',
    isim: 'Obsidian Gold',
    aciklama: 'Saf siyah + parlak altın',
    light: ObsidianGoldLight,
    dark: ObsidianGoldDark,
  },
  platinumSlate: {
    key: 'platinumSlate',
    isim: 'Platinum Slate',
    aciklama: 'Grafit + platin + bordo',
    light: PlatinumSlateLight,
    dark: PlatinumSlateDark,
  },
  royalObsidian: {
    key: 'royalObsidian',
    isim: 'Royal Obsidian',
    aciklama: 'Kraliyet indigo + bordo',
    light: RoyalObsidianLight,
    dark: RoyalObsidianDark,
  },
  abyssTeal: {
    key: 'abyssTeal',
    isim: 'Abyss Teal',
    aciklama: 'Okyanus teal + bakır + mint',
    light: AbyssTealLight,
    dark: AbyssTealDark,
  },
};

export const VARSAYILAN_PALET: PaletKey = 'obsidianGold';

export const LightColors: ThemeColors = ObsidianGoldLight;
export const DarkColors: ThemeColors = ObsidianGoldDark;

export const Colors = LightColors;

export default Colors;
