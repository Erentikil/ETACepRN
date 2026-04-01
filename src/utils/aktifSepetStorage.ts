import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import type { SepetBaslik } from '../models';

const BASE_KEY = Config.STORAGE_KEYS.AKTIF_SEPET;

function sepetKey(sirketAdi: string | undefined, prefix = ''): string {
  const base = prefix ? `${prefix}${BASE_KEY}` : BASE_KEY;
  return sirketAdi ? `${base}_${sirketAdi}` : base;
}

export async function aktifSepetKaydet(sepet: SepetBaslik, sirketAdi?: string, prefix = ''): Promise<void> {
  await AsyncStorage.setItem(sepetKey(sirketAdi, prefix), JSON.stringify(sepet));
}

export async function aktifSepetAl(sirketAdi?: string, prefix = ''): Promise<SepetBaslik | null> {
  try {
    const json = await AsyncStorage.getItem(sepetKey(sirketAdi, prefix));
    if (!json) return null;
    return JSON.parse(json) as SepetBaslik;
  } catch {
    return null;
  }
}

export async function aktifSepetTemizle(sirketAdi?: string, prefix = ''): Promise<void> {
  await AsyncStorage.removeItem(sepetKey(sirketAdi, prefix));
}
