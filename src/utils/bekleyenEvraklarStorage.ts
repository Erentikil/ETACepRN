import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import { generateGuid } from '../api/hizliIslemlerApi';
import type { SepetBaslik, BekleyenEvrakKaydi } from '../models';

const BASE_KEY = Config.STORAGE_KEYS.BEKLEYEN_EVRAKLAR;

function evrakKey(sirketAdi: string | undefined): string {
  return sirketAdi ? `${BASE_KEY}_${sirketAdi}` : BASE_KEY;
}

export async function bekleyenEvraklariAl(sirketAdi?: string): Promise<BekleyenEvrakKaydi[]> {
  const raw = await AsyncStorage.getItem(evrakKey(sirketAdi));
  if (!raw) return [];
  return JSON.parse(raw) as BekleyenEvrakKaydi[];
}

export async function evrakiKaydet(
  sepet: SepetBaslik,
  genelToplam: number,
  sirketAdi?: string
): Promise<void> {
  const mevcut = await bekleyenEvraklariAl(sirketAdi);
  const yeni: BekleyenEvrakKaydi = {
    ...sepet,
    id: generateGuid(),
    tarih: new Date().toISOString(),
    genelToplam,
  };
  await AsyncStorage.setItem(evrakKey(sirketAdi), JSON.stringify([...mevcut, yeni]));
}

export async function evrakiSil(id: string, sirketAdi?: string): Promise<void> {
  const mevcut = await bekleyenEvraklariAl(sirketAdi);
  await AsyncStorage.setItem(evrakKey(sirketAdi), JSON.stringify(mevcut.filter((e) => e.id !== id)));
}

export async function tumEvraklariSil(sirketAdi?: string): Promise<void> {
  await AsyncStorage.removeItem(evrakKey(sirketAdi));
}
