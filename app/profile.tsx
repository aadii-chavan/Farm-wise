import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import * as Linking from 'expo-linking';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/utils/supabase';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { t, i18n } = useTranslation();

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

  const handleLanguageChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem('user-language', lang);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageLabel = () => {
    switch (i18n.language) {
      case 'hi': return 'हिन्दी (Hindi)';
      case 'mr': return 'मराठी (Marathi)';
      default: return 'English (US)';
    }
  };

  const handleChangePassword = async () => {
    setShowResetModal(true);
  };

  const handleConfirmReset = async () => {
    if (!user?.email) return;
    
    setResetLoading(true);
    try {
      // We use the new unified recovery wizard
      const redirectTo = 'tempapp://forgot-password';
      const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo,
      });
      
      if (error) throw error;
      
      setShowResetModal(false);
      // Give a small delay for the first modal to close before showing success
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 400);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset link');
    } finally {
      setResetLoading(false);
    }
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
                            <Text style={styles.statusText}>{t('profile.verifiedAccount')}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Settings List */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile.accountDetails')}</Text>
        </View>

        <View style={styles.settingsCard}>
            <View style={styles.settingsInputItem}>
                <View style={[styles.itemIconBg, { backgroundColor: Palette.primary + '15' }]}>
                    <Ionicons name="person-outline" size={22} color={Palette.primary} />
                </View>
                <View style={styles.itemTextContent}>
                    <Text style={styles.itemTitle}>{t('profile.fullName')}</Text>
                    <TextInput 
                        style={styles.itemInput} 
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder={t('profile.placeholderName')}
                    />
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingsInputItem}>
                <View style={[styles.itemIconBg, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="call-outline" size={22} color="#1976D2" />
                </View>
                <View style={styles.itemTextContent}>
                    <Text style={styles.itemTitle}>{t('profile.phoneNumber')}</Text>
                    <TextInput 
                        style={styles.itemInput} 
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholder={t('profile.placeholderPhone')}
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
                {updating ? t('profile.saving') : t('profile.saveChanges')}
            </Text>
        </Pressable>

        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile.securityApp')}</Text>
        </View>

        <View style={styles.settingsCard}>
            <Pressable style={styles.settingsItem} onPress={handleChangePassword}>
                <View style={[styles.itemIconBg, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="key-outline" size={22} color="#F57C00" />
                </View>
                <View style={styles.itemTextContent}>
                    <Text style={styles.itemTitle}>{t('profile.security')}</Text>
                    <Text style={styles.itemSub}>{t('profile.changePassword')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Palette.textSecondary} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.settingsItem} onPress={() => setShowLanguageModal(true)}>
                <View style={[styles.itemIconBg, { backgroundColor: '#E0F2F1' }]}>
                    <Ionicons name="language-outline" size={22} color="#00796B" />
                </View>
                <View style={styles.itemTextContent}>
                    <Text style={styles.itemTitle}>{t('profile.language')}</Text>
                    <Text style={styles.itemSub}>{getCurrentLanguageLabel()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Palette.textSecondary} />
            </Pressable>
        </View>

        <Pressable style={styles.logoutButton} onPress={() => signOut()}>
            <View style={styles.logoutIconBg}>
                <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
            </View>
            <Text style={styles.logoutText}>{t('profile.signOut')}</Text>
        </Pressable>

        <Text style={styles.versionText}>{t('profile.version')} 1.0.0 (Build 42)</Text>
      </View>

      {/* Custom Reset Password Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="lock-open-outline" size={32} color={Palette.primary} />
              </View>
            </View>
            
            <Text style={styles.modalTitle}>{t('profile.resetPassword')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('profile.resetSubtitle')}{"\n"}
              <Text style={{ fontFamily: 'Outfit-Bold', color: Palette.text }}>{user?.email}</Text>
            </Text>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}                 onPress={() => setShowResetModal(false)}
                disabled={resetLoading}
              >
                <Text style={styles.modalCancelText}>{t('profile.notNow')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalConfirmBtn, resetLoading && { opacity: 0.7 }]} 
                onPress={handleConfirmReset}
                disabled={resetLoading}
              >
                 {resetLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>{t('profile.sendLink')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingVertical: 40 }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: '#ECFDF5', width: 84, height: 84, borderRadius: 30 }]}>
               <Ionicons name="checkmark-done-circle" size={48} color="#10B981" />
            </View>
            
            <Text style={[styles.modalTitle, { marginTop: 20 }]}>{t('profile.checkEmail')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('profile.checkEmailSubtitle')}
            </Text>

            <TouchableOpacity 
              style={[styles.modalConfirmBtn, { width: '100%', marginTop: 8 }]} 
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalConfirmText}>{t('profile.gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: '#E0F2F1' }]}>
                <Ionicons name="language-outline" size={32} color="#00796B" />
              </View>
            </View>
            
            <Text style={styles.modalTitle}>{t('language.select')}</Text>
            
            <View style={styles.languageOptions}>
              <TouchableOpacity 
                style={[styles.languageOption, i18n.language === 'en' && styles.languageOptionActive]} 
                onPress={() => handleLanguageChange('en')}
              >
                <Text style={[styles.languageOptionText, i18n.language === 'en' && styles.languageOptionTextActive]}>
                  English (US)
                </Text>
                {i18n.language === 'en' && <Ionicons name="checkmark-circle" size={20} color={Palette.primary} />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.languageOption, i18n.language === 'hi' && styles.languageOptionActive]} 
                onPress={() => handleLanguageChange('hi')}
              >
                <Text style={[styles.languageOptionText, i18n.language === 'hi' && styles.languageOptionTextActive]}>
                  हिन्दी (Hindi)
                </Text>
                {i18n.language === 'hi' && <Ionicons name="checkmark-circle" size={20} color={Palette.primary} />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.languageOption, i18n.language === 'mr' && styles.languageOptionActive]} 
                onPress={() => handleLanguageChange('mr')}
              >
                <Text style={[styles.languageOptionText, i18n.language === 'mr' && styles.languageOptionTextActive]}>
                  मराठी (Marathi)
                </Text>
                {i18n.language === 'mr' && <Ionicons name="checkmark-circle" size={20} color={Palette.primary} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.modalCancelBtn, { width: '100%', marginTop: 20 }]} 
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Palette.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 15,
    fontFamily: 'Outfit',
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#64748B',
  },
  modalConfirmBtn: {
    flex: 2,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Palette.primary,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalConfirmText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: 'white',
  },
  languageOptions: {
    width: '100%',
    gap: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languageOptionActive: {
    backgroundColor: Palette.primary + '08',
    borderColor: Palette.primary,
  },
  languageOptionText: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: '#64748B',
  },
  languageOptionTextActive: {
    color: Palette.primary,
    fontFamily: 'Outfit-Bold',
  },
});
