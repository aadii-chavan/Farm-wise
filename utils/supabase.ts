import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

// Better persistence adapter for Expo with chunking support for large sessions
const MAX_SIZE = 2048;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    }

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

    if (value.length > MAX_SIZE) {
      const chunks = [];
      for (let i = 0; i < value.length; i += MAX_SIZE) {
        chunks.push(value.substring(i, i + MAX_SIZE));
      }
      
      // Store chunks
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}.${i}`, chunks[i]);
      }
      
      // Clean up the original key if it exists
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
      // Clean up potential old chunks
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
