import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, Pressable, StyleSheet } from 'react-native';

export default function FloatingActionButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Hide the global FAB on pages that have their own custom add logic or are isolated silos
  if (pathname === '/general-expenses' || pathname === '/labor-book' || pathname === '/rain-meter') {
    return null;
  }

  const handlePress = () => {
    // Context-aware logic
    if (pathname === '/plots') {
      DeviceEventEmitter.emit('FAB_OPEN_PLOT_MODAL');
    } else if (pathname === '/inventory') {
      DeviceEventEmitter.emit('FAB_OPEN_INVENTORY_MODAL');
    } else if (pathname === '/schedule') {
      DeviceEventEmitter.emit('FAB_OPEN_TASK_MODAL');
    } else {
      router.push('/add');
    }
  };

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.fab,
        pressed && styles.pressed
      ]}
      onPress={handlePress}
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
