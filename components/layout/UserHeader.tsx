import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeaderText } from '../common/HeaderText';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface UserHeaderProps {
  name: string;
  email: string;
  role: string;
  avatarSize?: number;
}

export const UserHeader: React.FC<UserHeaderProps> = ({
  name,
  email,
  role,
  avatarSize = 80,
}) => {
  return (
    <View style={styles.header}>
      <View style={[styles.avatar, { width: avatarSize, height: avatarSize }]}>
        <Ionicons name="person" size={avatarSize * 0.5} color={Colors.textLight} />
      </View>
      <HeaderText variant="h2" style={styles.userName}>
        {name}
      </HeaderText>
      <Text style={styles.userEmail}>{email}</Text>
      <Text style={styles.userRole}>{role}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  avatar: {
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userName: {
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  userEmail: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  userRole: {
    ...Typography.overline,
    color: Colors.textLight,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    overflow: 'hidden',
  },
});