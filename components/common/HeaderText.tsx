import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Typography, Colors } from '../../constants/theme';

type HeaderVariant = 'h1' | 'h2' | 'h3';

interface HeaderTextProps {
  variant: HeaderVariant;
  children: React.ReactNode;
  style?: TextStyle;
  color?: string;
}

export const HeaderText: React.FC<HeaderTextProps> = ({
  variant,
  children,
  style,
  color = Colors.textPrimary,
}) => {
  const textStyle = StyleSheet.flatten([
    styles.base,
    styles[variant],
    { color },
    style,
  ]);

  return <Text style={textStyle}>{children}</Text>;
};

const styles = StyleSheet.create({
  base: {
    color: Colors.textPrimary,
  },
  h1: {
    ...Typography.h1,
  },
  h2: {
    ...Typography.h2,
  },
  h3: {
    ...Typography.h3,
  },
});