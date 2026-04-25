export const Colors = {
  // Colores principales
  primary: '#336c36',        // Verde Bosque Profundo
  secondary: '#e2772a',      // Naranja Vibrante
  accent: '#7aa641',         // Verde Oliva Medio

  // Colores sólidos para consistencia (agregados)
  primarySolid: '#336c36',   // Verde Bosque Profundo
  secondarySolid: '#e2772a', // Naranja Vibrante
  accentSolid: '#7aa641',    // Verde Oliva Medio

  // Colores de texto
  textPrimary: '#243453',    // Azul Marino Oscuro - 100% opacidad
  textSecondary: 'rgba(36, 52, 83, 0.8)', // 80% opacidad
  textDisabled: 'rgba(36, 52, 83, 0.6)', // 60% opacidad
  textLight: '#f3f1e6',      // Beige Suave

  // Fondos
  background: '#f3f1e6',     // Beige Suave - Fondo Principal
  backgroundSolid: '#f3f1e6', // Beige Suave sólido
  backgroundDark: '#243453', // Azul Marino Oscuro - Fondo Oscuro
  backgroundDarkSolid: '#243453', // Azul Marino Oscuro sólido
  white: '#FFFFFF',

  // Transparencias y Overlays
  whiteOverlay: 'rgba(255, 255, 255, 0.3)',
  whiteSecondary: 'rgba(255, 255, 255, 0.8)',
  transparent: 'transparent',

  // Estados
  hover: '#7aa641',          // Verde Oliva Medio para hover

  // NUEVOS COLORES PARA EL TAB BAR Y COMPONENTES
  tabBarBackground: '#f3f1e6', // Beige Suave
  tabBarBorder: 'rgba(36, 52, 83, 0.1)', // Azul Marino con 10% opacidad
  tabBarShadow: 'rgba(36, 52, 83, 0.1)',

  // Estados del tab bar
  tabInactive: 'rgba(36, 52, 83, 0.6)', // textDisabled
  tabActive: '#336c36', // primary
  tabActiveBackground: 'rgba(51, 108, 54, 0.08)', // primary con 8% opacidad
  tabHover: 'rgba(51, 108, 54, 0.05)', // primary con 5% opacidad

  // Botón central flotante
  floatingButton: '#336c36', // primary
  floatingButtonHover: '#2a5a2d', // primary más oscuro
  floatingButtonShadow: 'rgba(51, 108, 54, 0.3)', // primary con 30% opacidad
  floatingButtonBorder: '#FFFFFF',

  // Sombras y elevaciones
  shadowLight: 'rgba(36, 52, 83, 0.08)', // Azul Marino 8%
  shadowMedium: 'rgba(36, 52, 83, 0.15)', // Azul Marino 15%
  shadowHeavy: 'rgba(36, 52, 83, 0.25)', // Azul Marino 25%

  // Estados de interacción
  pressed: 'rgba(51, 108, 54, 0.12)', // primary con 12% opacidad
  focusRing: 'rgba(51, 108, 54, 0.4)', // primary con 40% opacidad

  // Fondos semitransparentes
  overlay: 'rgba(36, 52, 83, 0.4)', // Azul Marino 40%
  backdrop: 'rgba(243, 241, 230, 0.8)', // Beige Suave 80%

  // Colores de éxito y error (complementarios)
  success: '#336c36', // primary - Verde Bosque
  error: '#d93e2e',   // Rojo complementario al naranja
  warning: '#e2772a', // secondary - Naranja Vibrante
  info: '#243453',    // textPrimary - Azul Marino

  errorLight: 'rgba(217, 62, 46, 0.1)', // Rojo claro para fondos de error
  successLight: 'rgba(51, 108, 54, 0.1)', // Verde claro para fondos de éxito
  border: 'rgba(36, 52, 83, 0.1)', // Azul Marino con 10% opacidad para bordes
  black: '#000000',
  primaryLight: '#5a8f5a', // Verde Bosque Claro
  lightGray: '#d3d3d3',
  disabled: '#a9a9a9',

  Surface: '#f3f1e6',

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