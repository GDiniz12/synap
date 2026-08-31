/**
 * Synap Geist Design System Tokens for Mobile
 * Adheres strictly to high-contrast, minimalist Vercel / Geist UI aesthetics.
 */

export const colors = {
  // Base backgrounds
  background: '#000000',
  surface: '#0a0a0a',
  surfaceSecondary: '#111111',
  surfaceElevated: '#161616',
  surfaceHover: '#1c1c1c',

  // Borders & Dividers
  border: '#222222',
  borderLight: '#333333',
  borderFocused: '#666666',

  // Foreground / Typography
  foreground: '#ffffff',
  foregroundSecondary: '#a1a1a1',
  foregroundMuted: '#666666',
  foregroundSubtle: '#444444',

  // Accents & Functionality (Desaturated / Precise)
  accent: '#ffffff',
  accentSecondary: '#888888',
  primary: '#0070f3', // Vercel Blue
  primaryDark: '#0051b3',
  purple: '#7928ca',
  cyan: '#50e3c2',
  success: '#00e699',
  warning: '#f5a623',
  danger: '#ee0000',
  dangerDark: '#c50000',

  // Code / Markdown Highlights
  codeBackground: '#121212',
  codeBorder: '#27272a',
  codeText: '#00df8f',

  // Graph Colors
  graphNodeText: '#0070f3',
  graphNodeTag: '#50e3c2',
  graphNodeCard: '#f5a623',
  graphLink: '#333333',
  graphLinkHighlight: '#ffffff',
} as const;

export const typography = {
  fontFamily: {
    sans: 'System',
    mono: 'Courier',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
  },
  lineHeight: {
    xs: 16,
    sm: 18,
    base: 22,
    lg: 24,
    xl: 28,
    xxl: 32,
    title: 36,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  full: 9999,
};

export const shadows = {
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },
};
