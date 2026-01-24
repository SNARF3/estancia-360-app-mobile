import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Animated,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { AnimatedLogo } from '../../../components/common/AnimatedLogo';

export default function Inicio() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calcular dimensiones responsivas
  const isSmallScreen = height < 700;
  const isVerySmallScreen = height < 600;
  const imageHeight = isVerySmallScreen ? height * 0.2 : isSmallScreen ? height * 0.22 : height * 0.25;
  const imageWidth = Math.min(width * 0.85, 400);

  return (
      <ScrollView 
        contentContainerStyle={[
          styles.container,
          { 
            minHeight: height,
            paddingTop: isVerySmallScreen ? Spacing.sm : Spacing.xl,
            paddingBottom: isSmallScreen ? Spacing.lg : Spacing.xxl
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo animado */}
        <View style={[
          styles.logoContainer,
          { 
            marginTop: isSmallScreen ? Spacing.md : Spacing.xl,
            marginBottom: isSmallScreen ? Spacing.md : Spacing.lg 
          }
        ]}>
          <AnimatedLogo size={isVerySmallScreen ? 100 : isSmallScreen ? 120 : 140} />
        </View>

        {/* Título con fondo verde y letras blancas */}
        <Animated.View 
          style={[
            styles.titleContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              marginBottom: isSmallScreen ? Spacing.sm : Spacing.md
            }
          ]}
        >
          <Text style={[
            styles.welcomeText,
            { fontSize: isSmallScreen ? 18 : 22 }
          ]}>
            Bienvenido a
          </Text>
          <View style={[
            styles.titleBackground,
            { 
              paddingHorizontal: isSmallScreen ? Spacing.xs : Spacing.sm,
              paddingVertical: isSmallScreen ? Spacing.xs : Spacing.sm 
            }
          ]}>
            <Text style={[
              styles.title,
              { fontSize: isSmallScreen ? 28 : 36 }
            ]}>
              Estancia360
            </Text>
          </View>
        </Animated.View>

        {/* Descripción */}
        <Animated.View 
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              marginBottom: isSmallScreen ? Spacing.lg : Spacing.xl,
              paddingHorizontal: Spacing.md
            }
          ]}
        >
          <Text style={[
            styles.subtitle,
            { 
              fontSize: isSmallScreen ? 16 : 18,
              lineHeight: isSmallScreen ? 22 : 24
            }
          ]}>
            Transformando la ganadería boliviana con datos y sostenibilidad
          </Text>
        </Animated.View>

        {/* Imagen de vacas con animación */}
        <Animated.View 
          style={[
            styles.imageContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              width: imageWidth,
              height: imageHeight,
              marginBottom: isSmallScreen ? Spacing.xl : Spacing.xxl
            }
          ]}
        >
          {/* Esta línea debes reemplazarla con tu imagen real */}
          <View style={styles.cowsImagePlaceholder}>
              <Image
            source={require('../../../assets/estancia360/vacas1.jpeg')}
            style={styles.cowsImage}
            resizeMode="cover"
          />
          </View>
        </Animated.View>

        {/* Botones más abajo */}
        <View style={[
          styles.buttonsContainer,
          { 
            gap: isSmallScreen ? Spacing.sm : Spacing.md,
            marginTop: 'auto' // Esto empuja los botones hacia abajo
          }
        ]}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/views/auth/Login' as any)}
          >
            <Text style={[
              styles.primaryButtonText,
              { fontSize: isSmallScreen ? 16 : 18 }
            ]}>
              Iniciar Sesión
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push('/views/auth/RegisterRole' as any)}
          >
            <Text style={[
              styles.secondaryButtonText,
              { fontSize: isSmallScreen ? 16 : 18 }
            ]}>
              Registrarse
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: Typography.h2.fontFamily,
    fontWeight: Typography.h2.fontWeight,
    lineHeight: Typography.h2.lineHeight,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  titleBackground: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    ...Shadows.card,
  },
  title: {
    fontFamily: Typography.h1.fontFamily,
    fontWeight: Typography.h1.fontWeight,
    lineHeight: Typography.h1.lineHeight,
    color: Colors.white,
    textAlign: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  subtitle: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: Typography.body.fontWeight,
    lineHeight: Typography.body.lineHeight,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  imageContainer: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  cowsImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary + '40', // Color primario con transparencia
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: Colors.white,
    fontFamily: Typography.body.fontFamily,
  },
  cowsImage: {
    width: '100%',
    height: '100%',
  },
  buttonsContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  button: {
    width: '100%',
    height: 58,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  primaryButtonText: {
    fontFamily: Typography.button.fontFamily,
    fontWeight: Typography.button.fontWeight,
    lineHeight: Typography.button.lineHeight,
    color: Colors.white,
  },
  secondaryButtonText: {
    fontFamily: Typography.button.fontFamily,
    fontWeight: Typography.button.fontWeight,
    lineHeight: Typography.button.lineHeight,
    color: Colors.primary,
  },
});