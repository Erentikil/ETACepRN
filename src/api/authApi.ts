import axios from 'axios';
import { getApiInstance, buildUrl } from './axiosInstance';
import { Config } from '../constants/Config';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import type {
  Sonuc,
  YetkiBilgileri,
  MenuYetkiBilgileri,
  VersiyonBilgileri,
  SirketBilgileri,
  KDVBilgileri,
  FisTipiGrup,
  FiyatTipiBilgileri,
} from '../models';

let _cihazKodu: string | null = null;

export async function getCihazKodu(): Promise<string> {
  if (_cihazKodu) return _cihazKodu;
  if (Platform.OS === 'android') {
    _cihazKodu = Application.getAndroidId() || Config.TELEFON_CIHAZ_KODU;
  } else {
    _cihazKodu = (await Application.getIosIdForVendorAsync()) || Config.TELEFON_CIHAZ_KODU;
  }
  return _cihazKodu;
}

const cihazAdi = Config.TELEFON_CIHAZ_ADI;

// ─── Versiyon Kontrolü ────────────────────────────────────────────────────────
export async function versiyonBilgileriniOku(
  versiyon: string
): Promise<Sonuc<VersiyonBilgileri>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('VersiyonKontrol', versiyon, cihazKodu, cihazAdi);
  const res = await api.get<Sonuc<VersiyonBilgileri>>(url);
  return res.data;
}

// ─── Yetki Bilgileri (Login) ──────────────────────────────────────────────────
export async function yetkiBilgileriniAl(
  kullaniciKodu: string,
  sifre: string,
  veriTabaniAdi: string
): Promise<Sonuc<YetkiBilgileri>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl(
    'YetkiBilgileriniAl',
    kullaniciKodu,
    sifre,
    cihazKodu,
    veriTabaniAdi
  );
  const res = await api.get<Sonuc<YetkiBilgileri>>(url);
  
  return res.data;
}

// ─── Menü Yetki Bilgileri ────────────────────────────────────────────────────
export async function menuYetkiBilgileriniAl(
  kullaniciKodu: string,
  sifre: string,
  veriTabaniAdi: string
): Promise<Sonuc<MenuYetkiBilgileri>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl(
    'MenuYetkiBilgileriniAl',
    kullaniciKodu,
    sifre,
    cihazKodu,
    veriTabaniAdi
  );
  const res = await api.get<Sonuc<MenuYetkiBilgileri>>(url);
  return res.data;
}

// ─── Tüm Menü Yetkileri (admin) ──────────────────────────────────────────────
export async function tumMenuYetkileriniAl(
  veriTabaniAdi: string
): Promise<Sonuc<MenuYetkiBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('TumMenuYetkiBilgileriniAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<MenuYetkiBilgileri[]>>(url);
  
  return res.data;
}

// ─── Şirket Bilgileri ────────────────────────────────────────────────────────
export async function sirketBilgileriniAl(veriTabaniAdi: string): Promise<Sonuc<SirketBilgileri>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('SirketIsimleriniAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<SirketBilgileri>>(url);
  return res.data;
}

// ─── KDV Bilgileri ───────────────────────────────────────────────────────────
export async function kdvKisimBilgileriniAl(
  veriTabaniAdi: string
): Promise<Sonuc<KDVBilgileri>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('KDVKartlariniAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<KDVBilgileri>>(url);
  return res.data;
}

// ─── Fiş Tipleri ─────────────────────────────────────────────────────────────
export async function fisTipleriniAl(
  veriTabaniAdi: string
): Promise<Sonuc<FisTipiGrup[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('FisTipleriniAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<FisTipiGrup[]>>(url);
  return res.data;
  
}

// ─── Fiyat Tipleri ───────────────────────────────────────────────────────────
export async function fiyatTipleriniAl(
  veriTabaniAdi: string
): Promise<Sonuc<FiyatTipiBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('FiyatTipiAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<FiyatTipiBilgileri[]>>(url);
  return res.data;
}

// ─── Cihaz Kayıt ─────────────────────────────────────────────────────────────
export async function cihazKaydet(): Promise<void> {
  const deviceIdentifier = await getCihazKodu();
  const deviceName = Platform.OS === 'ios' ? 'iPhone' : 'Android';
  const platform = Platform.OS === 'ios' ? 'iOS' : 'Android';

  const res = await axios.post<{ success: boolean; message?: string }>(
    'http://localhost:5063/api/test-proxy/register-device',
    {
      apiKey: 'test-key-123',
      licenseKey: 'E7093-E2370-4C37B-16E5B',
      deviceIdentifier,
      deviceName,
      platform,
    }
  );

  if (!res.data.success) {
    throw new Error(res.data.message || 'Cihaz kaydı başarısız.');
  }
}
