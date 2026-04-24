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

// PRO — "Obsidian Gold Luxe": saf siyah + parlak altın
// Light: siyah egemen + altın aksan  |  Dark: altın egemen + siyah zemin
export const LightColors: ThemeColors = {
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

export const DarkColors: ThemeColors = {
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
  card: '#0f0f10',
  text: '#e8e3d5',
  textSecondary: '#a09a8a',
};

export const Colors = LightColors;

export default Colors;
