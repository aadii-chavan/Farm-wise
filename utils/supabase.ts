import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

// High-performance persistence adapter for Expo
// Handles SecureStore's 2KB limit by chunking larger sessions (common with Supabase JWTs)
const MAX_SIZE = 2048;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    }

    // Try to retrieve chunked data first
    const firstChunk = await SecureStore.getItemAsync(`${key}.0`);
    if (firstChunk) {
      let fullValue = firstChunk;
      let i = 1;
      while (true) {
        const chunk = await SecureStore.getItemAsync(`${key}.${i}`);
        if (!chunk) break;
        fullValue += chunk;
        i++;
      }
      return fullValue;
    }

    // Fallback for non-chunked legacy data
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return;
    }

    // If value exceeds SecureStore limit, split into chunks
    if (value.length > MAX_SIZE) {
      const chunks = [];
      for (let i = 0; i < value.length; i += MAX_SIZE) {
        chunks.push(value.substring(i, i + MAX_SIZE));
      }
      
      // Store chunks
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}.${i}`, chunks[i]);
      }
      
      // Clean up the original key to prevent conflicts
      await SecureStore.deleteItemAsync(key);
    } else {
      // Store normally
      await SecureStore.setItemAsync(key, value);
      // Clean up potential old chunks if they exist
      let i = 0;
      while (true) {
        const chunk = await SecureStore.getItemAsync(`${key}.${i}`);
        if (!chunk) break;
        await SecureStore.deleteItemAsync(`${key}.${i}`);
        i++;
      }
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return;
    }

    // Remove both original key and any potential chunks
    await SecureStore.deleteItemAsync(key);
    let i = 0;
    while (true) {
      const chunk = await SecureStore.getItemAsync(`${key}.${i}`);
      if (!chunk) break;
      await SecureStore.deleteItemAsync(`${key}.${i}`);
      i++;
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

