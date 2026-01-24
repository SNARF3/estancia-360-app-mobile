import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Modal,
  Animated,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';

type ProductionType = 'Cria' | 'Recría / Ceba' | 'Lechería' | 'Mixta';

const EstanciaRegistration = () => {
  const [formData, setFormData] = useState({
    nombreEstancia: '',
    ubicacion: '',
    tamanoHectareas: '',
    tipoProduccion: '' as ProductionType | '',
    rol: '',
  });

  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showRolModal, setShowRolModal] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInputEstancia = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const openProductionModal = () => {
    setShowProductionModal(true);
    Animated.timing(animation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeProductionModal = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowProductionModal(false);
    });
  };

  const selectProductionType = (type: ProductionType) => {
    handleInputChange('tipoProduccion', type);
    closeProductionModal();
  };

  const handleCreateAccount = () => {
    // Lógica para crear la cuenta
    console.log('Datos del formulario:', formData);
  };

  const productionTypes: ProductionType[] = ['Cria', 'Recría / Ceba', 'Lechería', 'Mixta'];
  const rolTypes = ['Propietario', 'Administrador', 'Encargado', 'Empleado'];

  const modalTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const modalBackgroundOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const renderProductionModal = () => (
    <Modal
      visible={showProductionModal}
      transparent={true}
      animationType="none"
      onRequestClose={closeProductionModal}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={closeProductionModal}
      >
        <Animated.View 
          style={[
            styles.modalBackground,
            { opacity: modalBackgroundOpacity }
          ]} 
        />
        <Animated.View 
          style={[
            styles.modalContent,
            { transform: [{ translateY: modalTranslateY }] }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tipo de producción</Text>
            <TouchableOpacity onPress={closeProductionModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.optionsContainer}>
            {productionTypes.map((type, index) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.optionButton,
                  index < productionTypes.length - 1 && styles.optionButtonBorder,
                  formData.tipoProduccion === type && styles.optionButtonSelected
                ]}
                onPress={() => selectProductionType(type)}
              >
                <Text style={[
                  styles.optionText,
                  formData.tipoProduccion === type && styles.optionTextSelected
                ]}>
                  {type}
                </Text>
                {formData.tipoProduccion === type && (
                  <Text style={styles.optionCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );

  const renderRolModal = () => (
    <Modal
      visible={showRolModal}
      transparent={true}
      animationType="none"
      onRequestClose={() => setShowRolModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowRolModal(false)}
      >
        <Animated.View 
          style={[
            styles.modalBackground,
            { opacity: modalBackgroundOpacity }
          ]} 
        />
        <Animated.View 
          style={[
            styles.modalContent,
            { transform: [{ translateY: modalTranslateY }] }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Rol</Text>
            <TouchableOpacity onPress={() => setShowRolModal(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.optionsContainer}>
            {rolTypes.map((rol, index) => (
              <TouchableOpacity
                key={rol}
                style={[
                  styles.optionButton,
                  index < rolTypes.length - 1 && styles.optionButtonBorder,
                  formData.rol === rol && styles.optionButtonSelected
                ]}
                onPress={() => {
                  handleInputChange('rol', rol);
                  setShowRolModal(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  formData.rol === rol && styles.optionTextSelected
                ]}>
                  {rol}
                </Text>
                {formData.rol === rol && (
                  <Text style={styles.optionCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Text style={styles.title}>iPhone 16 Pro Max</Text>
            
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre de la estancia</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nombre"
                  placeholderTextColor={Colors.textDisabled}
                  value={formData.nombreEstancia}
                  onChangeText={(value) => handleInputChange('nombreEstancia', value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ubicación</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Localidad, departamento"
                  placeholderTextColor={Colors.textDisabled}
                  value={formData.ubicacion}
                  onChangeText={(value) => handleInputChange('ubicacion', value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tamaño (hectáreas)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="####"
                  placeholderTextColor={Colors.textDisabled}
                  keyboardType="numeric"
                  value={formData.tamanoHectareas}
                  onChangeText={(value) => handleInputChange('tamanoHectareas', value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tipo de producción</Text>
                <TouchableOpacity 
                  style={styles.selectorContainer}
                  onPress={openProductionModal}
                >
                  <Text style={[
                    styles.selectorText,
                    !formData.tipoProduccion && styles.selectorPlaceholder
                  ]}>
                    {formData.tipoProduccion || 'Seleccionar tipo de producción'}
                  </Text>
                  <Text style={styles.selectorIcon}>⌄</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Rol</Text>
                <TouchableOpacity 
                  style={styles.selectorContainer}
                  onPress={() => setShowRolModal(true)}
                >
                  <Text style={[
                    styles.selectorText,
                    !formData.rol && styles.selectorPlaceholder
                  ]}>
                    {formData.rol || 'Seleccionar ROL'}
                  </Text>
                  <Text style={styles.selectorIcon}>⌄</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.button, styles.createButton]}
                onPress={handleCreateAccount}
              >
                <Text style={styles.buttonText}>¡Crear cuenta!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderProductionModal()}
      {renderRolModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    fontWeight: '500',
  },
  textInput: {
    ...Typography.body,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.textDisabled,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.textDisabled,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  selectorText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  selectorPlaceholder: {
    color: Colors.textDisabled,
  },
  selectorIcon: {
    ...Typography.body,
    color: Colors.textDisabled,
    fontSize: 18,
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  closeButtonText: {
    ...Typography.h2,
    color: Colors.textDisabled,
    fontSize: 24,
    lineHeight: 24,
  },
  optionsContainer: {
    paddingHorizontal: Spacing.lg,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  optionButtonBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  optionButtonSelected: {
    backgroundColor: Colors.tabActiveBackground,
  },
  optionText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  optionCheck: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  button: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    ...Shadows.card,
  },
  createButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    ...Typography.button,
    color: Colors.textLight,
  },
});

export default EstanciaRegistration;