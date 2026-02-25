const tintColorLight = '#006d5b'; // Deep Emerald Green
const tintColorDark = '#4db6ac';

// Palette from the reference image
export const Palette = {
  primary: '#006d5b', // Main Green
  primaryDark: '#004d40',
  primaryLight: '#b2dfdb',
  accent: '#f9a825', // Yellow/Orange/Gold for accents
  background: '#f8f9fa', // Light gray background
  card: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#757575',
  success: '#2e7d32',
  danger: '#d32f2f',
  border: '#e0e0e0',
};

export default {
  light: {
    text: Palette.text,
    textSecondary: Palette.textSecondary,
    background: Palette.background,
    tint: tintColorLight,
    tabIconDefault: '#cfd8dc',
    tabIconSelected: tintColorLight,
    card: Palette.card,
    border: Palette.border,
    headerBackground: Palette.primary,
    headerText: '#ffffff',
    primary: Palette.primary,
    accent: Palette.accent,
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#b0bec5',
    background: '#121212',
    tint: tintColorDark,
    tabIconDefault: '#546e7a',
    tabIconSelected: tintColorDark,
    card: '#1e1e1e',
    border: '#2c2c2c',
    headerBackground: '#1e1e1e',
    headerText: '#ffffff',
    primary: tintColorDark,
    accent: Palette.accent,
  },
};
