import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

interface ScreenContainerProps {
    children: React.ReactNode;
    style?: ViewStyle;
    scrollable?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
    children,
    style,
    scrollable = true,
}) => {
    if (scrollable) {
        return (
            <ScrollView
                style={[styles.container, style]}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {children}
            </ScrollView>
        );
    }

    return (
        <View style={[styles.container, styles.content, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: Spacing.lg,
    },
});