import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  touched?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  touched,
  style,
  placeholderTextColor = Colors.textDisabled,
  ...props
}) => {
  const hasError = error && touched;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, hasError && styles.labelError]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          hasError && styles.inputError,
          style,
        ]}
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
      {hasError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  labelError: {
    color: Colors.secondary,
  },
  input: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.textDisabled,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 50,
  },
  inputError: {
    borderColor: Colors.secondary,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    marginTop: Spacing.xs,
  },
});