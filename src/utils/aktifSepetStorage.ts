import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import type { SepetBaslik } from '../models';

const KEY = Config.STORAGE_KEYS.AKTIF_SEPET;

export async function aktifSepetKaydet(sepet: SepetBaslik): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(sepet));
}

export async function aktifSepetAl(): Promise<SepetBaslik | null> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    if (!json) return null;
    return JSON.parse(json) as SepetBaslik;
  } catch {
    return null;
  }
}

export async function aktifSepetTemizle(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
