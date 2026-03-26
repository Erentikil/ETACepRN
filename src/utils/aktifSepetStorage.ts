import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import type { SepetBaslik } from '../models';

const BASE_KEY = Config.STORAGE_KEYS.AKTIF_SEPET;

function sepetKey(sirketAdi: string | undefined): string {
  return sirketAdi ? `${BASE_KEY}_${sirketAdi}` : BASE_KEY;
}

export async function aktifSepetKaydet(sepet: SepetBaslik, sirketAdi?: string): Promise<void> {
  await AsyncStorage.setItem(sepetKey(sirketAdi), JSON.stringify(sepet));
}

export async function aktifSepetAl(sirketAdi?: string): Promise<SepetBaslik | null> {
  try {
    const json = await AsyncStorage.getItem(sepetKey(sirketAdi));
    if (!json) return null;
    return JSON.parse(json) as SepetBaslik;
  } catch {
    return null;
  }
}

export async function aktifSepetTemizle(sirketAdi?: string): Promise<void> {
  await AsyncStorage.removeItem(sepetKey(sirketAdi));
}
