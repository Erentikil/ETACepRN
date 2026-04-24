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

// PRO — "Platinum Slate": grafit + platin gümüşü + bordo fiyat vurgusu
export const LightColors: ThemeColors = {
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

export const DarkColors: ThemeColors = {
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

export const Colors = LightColors;

export default Colors;
