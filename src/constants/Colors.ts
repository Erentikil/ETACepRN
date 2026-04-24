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

// PRO — "Midnight Gold": derin lacivert + şampanya altını
export const LightColors: ThemeColors = {
  primary: '#1a237e',
  accent: '#c9a227',
  error: '#c62828',
  success: '#2e7d32',
  white: '#ffffff',
  black: '#000000',
  lightGray: '#f4f3ee',
  gray: '#9e9c93',
  darkGray: '#3d3d3d',
  border: '#dcd7c4',
  inputBackground: '#fbf9f2',
  drawerBackground: '#0f1638',
  drawerText: '#f5e6b3',
  drawerActiveBackground: 'rgba(201,162,39,0.22)',
  headerBackground: '#0f1638',
  headerGradientEnd: '#070a1c',
  headerText: '#f5e6b3',
  priceColor: '#b8860b',
  background: '#f8f5ec',
  card: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#6b6a61',
};

export const DarkColors: ThemeColors = {
  primary: '#3949ab',
  accent: '#d4af37',
  error: '#ef5350',
  success: '#66bb6a',
  white: '#1a1a22',
  black: '#ffffff',
  lightGray: '#0f0f14',
  gray: '#8a8a92',
  darkGray: '#e8e6dd',
  border: '#2c2c38',
  inputBackground: '#232330',
  drawerBackground: '#0a0e24',
  drawerText: '#f5e6b3',
  drawerActiveBackground: 'rgba(212,175,55,0.18)',
  headerBackground: '#0a0e24',
  headerGradientEnd: '#040512',
  headerText: '#f5e6b3',
  priceColor: '#d4af37',
  background: '#0b0b12',
  card: '#17171f',
  text: '#ebe7d8',
  textSecondary: '#a8a698',
};

export const Colors = LightColors;

export default Colors;
