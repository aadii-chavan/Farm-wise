import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Palette } from '@/constants/Colors';

export default function FloatingActionButton() {
  const router = useRouter();

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.fab,
        pressed && styles.pressed
      ]}
      onPress={() => router.push('/add')}
    >
      <Ionicons name="add" size={32} color="white" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
    backgroundColor: Palette.primaryDark,
  },
});
