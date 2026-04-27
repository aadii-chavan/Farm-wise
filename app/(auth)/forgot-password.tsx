import { Palette } from '@/constants/Colors';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { Text } from '@/components/Themed';

type Step = 'REQUEST' | 'VERIFY' | 'NEW_PASSWORD' | 'SUCCESS';

export default function OTPRecoveryWizard() {
  const [step, setStep] = useState<Step>('REQUEST');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const router = useRouter();
  
  // Timer for resend button
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleRequestOTP = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      
      setStep('VERIFY');
      setTimer(30); // 30 second cooldown for resend
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Incomplete Code', 'Please enter the 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: 'recovery',
      });
      
      if (error) throw error;
      setStep('NEW_PASSWORD');
    } catch (err: any) {
      Alert.alert('Invalid Code', 'The code you entered is incorrect or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      Alert.alert('Password Short', 'Please use at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStep('SUCCESS');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save new password');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'REQUEST':
        return (
          <View style={styles.stepContent}>
            <View style={styles.iconBox}>
              <Ionicons name="key-outline" size={44} color={Palette.primary} />
            </View>
            <Text style={styles.heading}>Forgot Password?</Text>
            <Text style={styles.subheading}>Enter your email and we will send you a 6-digit code to reset your password.</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputField}>
                    <Ionicons name="mail-outline" size={20} color="#64748B" />
                    <TextInput
                        style={styles.textInput}
                        placeholder="Your email address"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>
            </View>

            <Pressable style={styles.mainBtn} onPress={handleRequestOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.mainBtnText}>Send 6-Digit Code</Text>}
            </Pressable>
          </View>
        );

      case 'VERIFY':
        return (
          <View style={styles.stepContent}>
            <View style={styles.iconBox}>
              <Ionicons name="mail-open-outline" size={44} color={Palette.primary} />
            </View>
            <Text style={styles.heading}>Verify Your Email</Text>
            <Text style={styles.subheading}>We sent a 6-digit code to{"\n"}<Text style={{ fontFamily: 'Outfit-Bold', color: Palette.text }}>{email}</Text></Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>ENTER 6-DIGIT CODE</Text>
                <TextInput
                    style={styles.otpInput}
                    placeholder="000000"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                />
            </View>

            <Pressable style={styles.mainBtn} onPress={handleVerifyOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.mainBtnText}>Verify Code</Text>}
            </Pressable>

            {timer > 0 ? (
              <Text style={styles.resendText}>Resend code in {timer}s</Text>
            ) : (
              <Pressable onPress={handleRequestOTP}>
                <Text style={styles.resendLink}>Didn't get the code? Send again</Text>
              </Pressable>
            )}
          </View>
        );

      case 'NEW_PASSWORD':
        return (
          <View style={styles.stepContent}>
            <View style={styles.iconBox}>
              <Ionicons name="lock-closed-outline" size={44} color={Palette.primary} />
            </View>
            <Text style={styles.heading}>New Password</Text>
            <Text style={styles.subheading}>Create a new password for your account.</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>NEW PASSWORD</Text>
                <View style={styles.inputField}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#64748B" />
                    <TextInput
                        style={styles.textInput}
                        placeholder="At least 6 characters"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>
            </View>

            <Pressable style={styles.mainBtn} onPress={handleUpdatePassword} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.mainBtnText}>Save Password</Text>}
            </Pressable>
          </View>
        );

      case 'SUCCESS':
        return (
          <View style={styles.stepContent}>
            <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="checkmark-done-circle" size={60} color="#10B981" />
            </View>
            <Text style={styles.heading}>Success!</Text>
            <Text style={styles.subheading}>Your password has been changed. You can now log in safely.</Text>
            
            <Pressable style={styles.mainBtn} onPress={() => router.replace('/login')}>
              <Text style={styles.mainBtnText}>Back to Login</Text>
            </Pressable>
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <Text style={styles.headerTitle}>Account Recovery</Text>
        </View>

        <View style={styles.mainCard}>
            {renderStep()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 30,
    paddingBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: 'white',
  },
  mainCard: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 30,
    paddingTop: 50,
  },
  stepContent: {
    alignItems: 'center',
  },
  iconBox: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: Palette.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  subheading: {
    fontSize: 16,
    fontFamily: 'Outfit',
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 30,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    color: '#94A3B8',
    marginBottom: 10,
    letterSpacing: 1,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    height: 60,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: Palette.text,
  },
  otpInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    height: 70,
    fontSize: 32,
    fontFamily: 'Outfit-Bold',
    color: Palette.primary,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    letterSpacing: 10,
    textAlign: 'center',
  },
  mainBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 20,
    height: 64,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  mainBtnText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  resendText: {
    marginTop: 25,
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: '#94A3B8',
  },
  resendLink: {
    marginTop: 25,
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: Palette.primary,
    textDecorationLine: 'underline',
  },
});
