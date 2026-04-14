import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

export default function CustomDrawerContent(props: any) {
  const { top, bottom } = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={{ paddingTop: top + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color={Palette.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{session?.user?.email?.split('@')[0] || 'Farmer'}</Text>
            <Text style={styles.userEmail}>{session?.user?.email}</Text>
          </View>
        </View>

        <View style={styles.drawerItemsContainer}>
            <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      <View style={[styles.footer, { paddingBottom: bottom + 20 }]}>
        <Pressable 
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  userInfo: {
    marginLeft: 15,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: 'Outfit',
    color: Palette.textSecondary,
    marginTop: 2,
  },
  drawerItemsContainer: {
    flex: 1,
    paddingTop: 10,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: '#EF4444',
  },
  pressed: {
    opacity: 0.7,
  },
});
