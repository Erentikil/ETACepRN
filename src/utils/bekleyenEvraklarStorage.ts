import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import { generateGuid } from '../api/hizliIslemlerApi';
import type { SepetBaslik, BekleyenEvrakKaydi } from '../models';

const KEY = Config.STORAGE_KEYS.BEKLEYEN_EVRAKLAR;

export async function bekleyenEvraklariAl(): Promise<BekleyenEvrakKaydi[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  return JSON.parse(raw) as BekleyenEvrakKaydi[];
}

export async function evrakiKaydet(
  sepet: SepetBaslik,
  genelToplam: number
): Promise<void> {
  const mevcut = await bekleyenEvraklariAl();
  const yeni: BekleyenEvrakKaydi = {
    ...sepet,
    id: generateGuid(),
    tarih: new Date().toISOString(),
    genelToplam,
  };
  await AsyncStorage.setItem(KEY, JSON.stringify([...mevcut, yeni]));
}

export async function evrakiSil(id: string): Promise<void> {
  const mevcut = await bekleyenEvraklariAl();
  await AsyncStorage.setItem(KEY, JSON.stringify(mevcut.filter((e) => e.id !== id)));
}

export async function tumEvraklariSil(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
