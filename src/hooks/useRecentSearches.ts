import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';

const MAX_ITEMS = 10;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const raw = await AsyncStorage.getItem(Config.STORAGE_KEYS.SON_ARAMALAR);
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch {
      // Hata durumunda boş liste ile devam
    }
  }

  async function addSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_ITEMS);
    setRecentSearches(updated);
    await AsyncStorage.setItem(Config.STORAGE_KEYS.SON_ARAMALAR, JSON.stringify(updated));
  }

  async function clearAll() {
    setRecentSearches([]);
    await AsyncStorage.removeItem(Config.STORAGE_KEYS.SON_ARAMALAR);
  }

  return { recentSearches, addSearch, clearAll };
}
