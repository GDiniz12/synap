import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'synap_auth_token';
const WORKSPACE_KEY = 'synap_active_workspace_id';
const API_URL_KEY = 'synap_custom_api_url';
const CACHE_PREFIX = 'synap_cache_';

// Check if SecureStore is available (native iOS/Android)
const isSecureStoreAvailable = Platform.OS !== 'web';

export const storage = {
  // Auth Token
  async getToken(): Promise<string | null> {
    try {
      if (isSecureStoreAvailable) {
        return await SecureStore.getItemAsync(TOKEN_KEY);
      }
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      if (isSecureStoreAvailable) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (isSecureStoreAvailable) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  },

  // Active Workspace
  async getActiveWorkspaceId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(WORKSPACE_KEY);
    } catch {
      return null;
    }
  },

  async setActiveWorkspaceId(id: string): Promise<void> {
    try {
      await AsyncStorage.setItem(WORKSPACE_KEY, id);
    } catch (e) {
      console.error('Failed to save active workspace id', e);
    }
  },

  // Custom API Base URL (for switching between local dev / production)
  async getApiUrl(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(API_URL_KEY);
    } catch {
      return null;
    }
  },

  async setApiUrl(url: string): Promise<void> {
    try {
      await AsyncStorage.setItem(API_URL_KEY, url);
    } catch (e) {
      console.error('Failed to save custom API url', e);
    }
  },

  // Local Offline Cache
  async setCache<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {
      console.error(`Failed to write cache for key: ${key}`, e);
    }
  },

  async getCache<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (e) {
      console.error('Failed to clear cache', e);
    }
  },
};
