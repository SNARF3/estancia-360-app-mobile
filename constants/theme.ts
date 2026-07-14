export const Colors = {
  // Colores principales — verde se mantiene igual
  primary: '#336c36',
  primaryButton: '#336c36BF', // verde de los tiles de Registros (75% opacity)
  secondary: '#e2772a',
  accent: '#7aa641',

  primarySolid: '#336c36',
  secondarySolid: '#e2772a',
  accentSolid: '#7aa641',

  // Colores de texto — palette Figma
  textPrimary: '#0a0a0a',
  textSecondary: '#4a5565',
  textDisabled: '#6a7282',
  textLight: '#f7f0dd',

  // Fondos — palette Figma
  background: '#f7f0dd',
  backgroundSolid: '#f7f0dd',
  backgroundDark: '#243453',
  backgroundDarkSolid: '#243453',
  white: '#FFFFFF',

  // Transparencias y Overlays
  whiteOverlay: 'rgba(255, 255, 255, 0.3)',
  whiteSecondary: 'rgba(255, 255, 255, 0.8)',
  transparent: 'transparent',

  hover: '#7aa641',

  // Tab bar
  tabBarBackground: '#f7f0dd',
  tabBarBorder: 'rgba(106, 114, 130, 0.15)',
  tabBarShadow: 'rgba(0, 0, 0, 0.08)',

  tabInactive: '#6a7282',
  tabActive: '#336c36',
  tabActiveBackground: 'rgba(51, 108, 54, 0.08)',
  tabHover: 'rgba(51, 108, 54, 0.05)',

  // Botón flotante
  floatingButton: '#336c36',
  floatingButtonHover: '#2a5a2d',
  floatingButtonShadow: 'rgba(51, 108, 54, 0.3)',
  floatingButtonBorder: '#FFFFFF',

  // Sombras
  shadowLight: 'rgba(0, 0, 0, 0.08)',
  shadowMedium: 'rgba(0, 0, 0, 0.10)',
  shadowHeavy: 'rgba(0, 0, 0, 0.15)',

  // Interacción
  pressed: 'rgba(51, 108, 54, 0.12)',
  focusRing: 'rgba(51, 108, 54, 0.4)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.45)',
  backdrop: 'rgba(247, 240, 221, 0.8)',

  // Estados
  success: '#336c36',
  error: '#d93e2e',
  warning: '#e2772a',
  info: '#4a5565',

  errorLight: 'rgba(217, 62, 46, 0.1)',
  successLight: 'rgba(51, 108, 54, 0.1)',
  border: 'rgba(106, 114, 130, 0.15)',
  black: '#000000',
  primaryLight: '#5a8f5a',
  lightGray: '#d3d3d3',
  disabled: '#a9a9a9',

  Surface: '#f7f0dd',

  // Colores específicos de módulos/sync (Figma)
  iconBg: 'rgba(245, 213, 200, 0.4)',       // fondo ícono módulo (salmón pastel)
  badgeBg: 'rgba(107, 155, 124, 0.15)',      // fondo badge contador verde
  badgeText: '#5a8a6b',                      // texto badge contador verde
};

export const Typography = {
  // Fuentes
  fontPrimary: 'Montserrat',
  fontSecondary: 'Poppins',

  // Tamaños
  h1: {
    fontSize: 30,
    lineHeight: 40,
    fontFamily: 'Montserrat',
    fontWeight: '700' as const,
    marginTop: 50,
  },
  h2: {
    fontSize: 20,
    lineHeight: 41.6,
    fontFamily: 'Montserrat',
    fontWeight: '600' as const,
  },
  h3: {
    fontSize: 15,
    lineHeight: 33.6,
    fontFamily: 'Montserrat',
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Poppins',
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 22.4,
    fontFamily: 'Poppins',
    fontWeight: '300' as const,
  },
  button: {
    fontSize: 18,
    lineHeight: 18,
    fontFamily: 'Montserrat',
    fontWeight: '600' as const,
  },
  quote: {
    fontSize: 18,
    lineHeight: 28.8,
    fontFamily: 'Poppins',
    fontWeight: '500' as const,
    fontStyle: 'italic' as const,
  },
  overline: {
    fontSize: 12,
    lineHeight: 14.4,
    fontFamily: 'Montserrat',
    fontWeight: '500' as const,
  },

  // NUEVAS VARIABLES TIPOGRÁFICAS PARA EL TAB BAR
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: 'Montserrat',
    fontWeight: '500' as const,
  },
  tabIcon: {
    fontSize: 24,
  },
  floatingIcon: {
    fontSize: 32,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 20,
  xl: 30,
  xxl: 38,

  // NUEVOS ESPACIADOS PARA EL TAB BAR
  tabBarHeight: 80,
  tabBarPadding: 16,
  tabBarPaddingBottom: 8,
  tabBarPaddingTop: 12,
  tabIconPadding: 8,
  tabLabelMargin: 4,
  floatingButtonSize: 60,
  floatingButtonBorder: 3,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 30,
  circular: 50,

  // NUEVOS BORDER RADIUS ESPECÍFICOS
  tabBar: 20,
  tabIcon: 12,
  floatingButton: 30,

};

export const Shadows = {
  tabBar: {
    shadowColor: Colors.tabBarShadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButton: {
    shadowColor: Colors.floatingButtonShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: Colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
};