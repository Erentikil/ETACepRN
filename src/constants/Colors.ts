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
  headerText: string;
  priceColor: string;
  // Dark mode ek alanlar
  background: string;
  card: string;
  text: string;
  textSecondary: string;
}

export const LightColors: ThemeColors = {
  primary: '#29358a',
  accent: '#ffa500',
  error: '#e53935',
  success: '#43a047',
  white: '#ffffff',
  black: '#000000',
  lightGray: '#f5f5f5',
  gray: '#9e9e9e',
  darkGray: '#424242',
  border: '#e0e0e0',
  inputBackground: '#f9f9f9',
  drawerBackground: '#29358a',
  drawerText: '#ffffff',
  drawerActiveBackground: 'rgba(255,255,255,0.2)',
  headerBackground: '#29358a',
  headerText: '#ffffff',
  priceColor: '#e53935',
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#212121',
  textSecondary: '#757575',
};

export const DarkColors: ThemeColors = {
  primary: '#29358a',
  accent: '#ffb74d',
  error: '#ef5350',
  success: '#66bb6a',
  white: '#1e1e1e',
  black: '#ffffff',
  lightGray: '#121212',
  gray: '#9e9e9e',
  darkGray: '#e0e0e0',
  border: '#333333',
  inputBackground: '#2a2a2a',
  drawerBackground: '#1a1a2e',
  drawerText: '#ffffff',
  drawerActiveBackground: 'rgba(255,255,255,0.15)',
  headerBackground: '#1a1a2e',
  headerText: '#ffffff',
  priceColor: '#ef5350',
  background: '#121212',
  card: '#1e1e1e',
  text: '#e0e0e0',
  textSecondary: '#9e9e9e',
};

// Geriye dönük uyumluluk — henüz hook'a geçmemiş dosyalar için
export const Colors = LightColors;

export default Colors;
