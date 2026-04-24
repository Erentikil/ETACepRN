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

// PRO — "Abyss Teal": derin okyanus teal + yanmış bakır + parlak mint
export const LightColors: ThemeColors = {
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

export const DarkColors: ThemeColors = {
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

export const Colors = LightColors;

export default Colors;
