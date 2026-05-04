// ─── Dark Mode Colors ─────────────────────────────────────
export const DarkColors = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceHighlight: '#2A2A2A',
  primary: '#FBC02D',
  primaryDark: '#F57F17',
  primaryLight: '#FFF59D',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#666666',
  greenAccent: '#4CAF50',
  blueAccent: '#2196F3',
  purpleAccent: '#9C27B0',
  brownAccent: '#795548',
  danger: '#F44336',
  border: '#333333',
  glassBackground: 'rgba(26, 26, 26, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  cardBackground: 'rgba(30, 30, 30, 0.5)',
  shimmer: 'rgba(255,255,255,0.05)',
  overlay: 'rgba(0,0,0,0.45)',
};

// ─── Light Mode Colors ────────────────────────────────────
export const LightColors = {
  background: '#F5F2EB',
  surface: '#FFFFFF',
  surfaceHighlight: '#F0EDE5',
  primary: '#E5A800',
  primaryDark: '#C48900',
  primaryLight: '#FFF3C4',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9E9E9E',
  greenAccent: '#388E3C',
  blueAccent: '#1976D2',
  purpleAccent: '#7B1FA2',
  brownAccent: '#5D4037',
  danger: '#D32F2F',
  border: '#E0DDD5',
  glassBackground: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  cardBackground: 'rgba(255, 255, 255, 0.6)',
  shimmer: 'rgba(0,0,0,0.03)',
  overlay: 'rgba(0,0,0,0.25)',
};

// ─── Backward Compatibility ───────────────────────────────
// Screens not yet migrated to useTheme() can still import { Colors, Typography }
export const Colors = DarkColors;

// ─── Dynamic Typography ───────────────────────────────────
export const getTypography = (colors) => ({
  h1: { fontSize: 32, fontWeight: 'bold', color: colors.text },
  h2: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  h3: { fontSize: 20, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, color: colors.textSecondary },
  caption: { fontSize: 14, color: colors.textSecondary },
  small: { fontSize: 12, color: colors.textTertiary },
});

// ─── Static Typography (backward-compatible) ──────────────
export const Typography = getTypography(DarkColors);
