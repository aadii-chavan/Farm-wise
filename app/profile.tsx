import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

import { supabase } from '@/utils/supabase';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  React.useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setFullName(data.full_name || '');
        setPhoneNumber(data.phone_number || '');
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          phone_number: phoneNumber,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      // Update user metadata as well for immediate header sync
      await supabase.auth.updateUser({
          data: { full_name: fullName }
      });

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = () => {
     Alert.alert('Security', 'Please use the "Forgot Password" link on the login screen to reset your password safely.', [
         { text: 'Cancel', style: 'cancel' },
         { text: 'Okay', onPress: () => {} }
     ]);
  };


  return ( 
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header Profile Section */}
      <View style={styles.headerArea}>
        <View style={styles.headerGlass}>
            <View style={styles.profileHero}>
                <View style={styles.avatarGlow}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{(fullName || user?.email || 'F').charAt(0).toUpperCase()}</Text>
                    </View>
                    <Pressable style={styles.cameraBtn}>
                        <Ionicons name="camera" size={14} color="white" />
                    </Pressable>
                </View>
                <View style={styles.heroInfo}>
                    <Text style={styles.userName}>{fullName || 'Farmer'}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                    <View style={styles.statusRow}>
                        <View style={styles.statusBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                            <Text style={styles.statusText}>Verified Account</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Settings List */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Details</Text>
        </View>

        <View style={styles.settingsCard}>
            <View style={styles.settingsInputItem}>
                <View style={[styles.itemIconBg, { backgroundColor: Palette.primary + '15' }]}>
                    <Ionicons name="person-outline" size={22} color={Palette.primary} />
                </View>
                <View style={styles.itemTextContent}>
                    <Text style={styles.itemTitle}>Full Name</Text>
                    <TextInput 
                        style={styles.itemInput} 
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Your full name"
                    />
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingsInputItem}>
                <View style={[styles.itemIconBg, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="call-outline" size={22} color="#1976D2" />
                </View>
                <View style={styles.itemTextContent}>
                    <Text style={styles.itemTitle}>Phone Number</Text>
                    <TextInput 
                        style={styles.itemInput} 
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholder="Your phone number"
                        keyboardType="phone-pad"
                    />
                </View>
            </View>
        </View>

        <Pressable 
            style={[styles.saveButton, updating && { opacity: 0.7 }]} 
            onPress={handleUpdateProfile}
            disabled={updating}
        >
            <Text style={styles.saveButtonText}>
                {updating ? 'Saving...' : 'Save Changes'}
            </Text>
        </Pressable>

        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Security & App</Text>
        </View>

        <View style={styles.settingsCard}>
            <Pressable style={styles.settingsItem} onPress={handleChangePassword}>
                <View style={[styles.itemIconBg, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="key-outline" size={22} color="#F57C00" />
                </View>
                <View style={styles.itemTextContent}>
                    <Text style={styles.itemTitle}>Security</Text>
                    <Text style={styles.itemSub}>Change Password</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Palette.textSecondary} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.settingsItem} onPress={() => Alert.alert('Language', 'Hindi, English and Punjabi available.')}>
                <View style={[styles.itemIconBg, { backgroundColor: '#E0F2F1' }]}>
                    <Ionicons name="language-outline" size={22} color="#00796B" />
                </View>
                <View style={styles.itemTextContent}>
                    <Text style={styles.itemTitle}>Language</Text>
                    <Text style={styles.itemSub}>English (US)</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Palette.textSecondary} />
            </Pressable>
        </View>

        <Pressable style={styles.logoutButton} onPress={() => signOut()}>
            <View style={styles.logoutIconBg}>
                <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
            </View>
            <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.versionText}>Version 1.0.0 (Build 42)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerArea: {
    backgroundColor: Palette.primary,
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarGlow: {
    padding: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 22,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
    color: Palette.primary,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: Palette.primary,
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  heroInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: 'white',
  },
  userEmail: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
  },
  mainContent: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#1e293b',
  },
  quickActions: {
    gap: 12,
    marginBottom: 30,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#1e293b',
  },
  actionSub: {
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    color: '#94A3B8',
    marginTop: 1,
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 16,
  },
  settingsInputItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  itemIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemSub: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#1e293b',
    marginTop: 2,
  },
  itemInput: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#1e293b',
    padding: 0,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: Palette.primary,
    borderRadius: 18,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    padding: 18,
    borderRadius: 20,
    marginBottom: 24,
    gap: 16,
  },
  logoutIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#E11D48',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'Outfit-Medium',
    marginBottom: 10,
  }
});
