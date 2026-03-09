import { Text, View } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
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

  const handleDownloadReport = (format: 'PDF' | 'Excel') => {
    Alert.alert('Reports', `${format} report download will be available soon.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header Profile Section */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
            <View style={styles.avatarWrapper}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person" size={48} color="white" />
                </View>
                <Pressable style={styles.editAvatarButton}>
                    <Ionicons name="camera" size={16} color={Palette.primary} />
                </Pressable>
            </View>
            <Text style={styles.userName}>{fullName || 'Farmer'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            
            <View style={styles.badgeRow}>
                <View style={styles.premiumBadge}>
                    <Ionicons name="ribbon" size={14} color="white" />
                    <Text style={styles.badgeText}>Verified Farmer</Text>
                </View>
                <View style={[styles.premiumBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name="calendar" size={14} color="white" />
                    <Text style={styles.badgeText}>Joined Mar 2024</Text>
                </View>
            </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Reports Section */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reports & Exports</Text>
        </View>
        
        <View style={styles.reportButtonsRow}>
            <Pressable style={styles.reportCard} onPress={() => handleDownloadReport('PDF')}>
                <View style={[styles.reportIconBg, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="document-text" size={24} color="#D32F2F" />
                </View>
                <Text style={styles.reportLabel}>Export PDF</Text>
                <Text style={styles.reportSub}>Full History</Text>
            </Pressable>

            <Pressable style={styles.reportCard} onPress={() => handleDownloadReport('Excel')}>
                <View style={[styles.reportIconBg, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="stats-chart" size={24} color="#2E7D32" />
                </View>
                <Text style={styles.reportLabel}>Excel Sheet</Text>
                <Text style={styles.reportSub}>For Analysis</Text>
            </Pressable>
        </View>

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
    backgroundColor: Palette.background,
  },
  headerBackground: {
    backgroundColor: Palette.primary,
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 60,
    marginBottom: 16,
    position: 'relative',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Palette.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'white',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  userName: {
    fontSize: 26,
    fontFamily: 'Outfit-Bold',
    color: 'white',
  },
  userEmail: {
    fontSize: 15,
    color: 'white',
    opacity: 0.8,
    marginTop: 4,
    fontFamily: 'Outfit',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
  },
  mainContent: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  reportButtonsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  reportCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  reportIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportLabel: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  reportSub: {
    fontSize: 11,
    fontFamily: 'Outfit',
    color: Palette.textSecondary,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 16,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  settingsInputItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  itemIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemTextContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: Palette.text,
  },
  itemInput: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: Palette.text,
    padding: 0,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: Palette.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
  },
  logoutIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoutText: {
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
    color: '#D32F2F',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Palette.textSecondary,
    fontFamily: 'Outfit',
    marginBottom: 10,
  }
});
