import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/Categories';
import { Category } from '@/types/farm';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  category: Category;
  size?: number;
}

export function CategoryIcon({ category, size = 24 }: Props) {
  const color = CATEGORY_COLORS[category];
  // Cast iconName to any because Ionicons names are strict and string isn't specific enough for TS
  const iconName = CATEGORY_ICONS[category] as any;

  return (
    <View style={[styles.container, { backgroundColor: color + '20' }]}>
      <Ionicons name={iconName} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 24, // Circular
    justifyContent: 'center',
    alignItems: 'center',
    // alignSelf: 'flex-start',
  },
});
