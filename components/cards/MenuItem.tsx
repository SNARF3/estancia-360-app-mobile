import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface MenuItemProps {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
  showArrow?: boolean;
  isLast?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  title,
  icon,
  color,
  onPress,
  showArrow = true,
  isLast = false,
}) => {
  return (
    <TouchableOpacity 
      style={[
        styles.menuItem,
        !isLast && styles.menuItemBorder
      ]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color={Colors.textLight} />
      </View>
      <Text style={styles.menuText}>{title}</Text>
      {showArrow && (
        <Ionicons name="chevron-forward" size={20} color={Colors.textDisabled} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.textDisabled + '20',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
});