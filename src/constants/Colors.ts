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

// PRO — "Royal Obsidian": kraliyet indigo + bordo/şarap aksan
export const LightColors: ThemeColors = {
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

export const DarkColors: ThemeColors = {
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

export const Colors = LightColors;

export default Colors;
