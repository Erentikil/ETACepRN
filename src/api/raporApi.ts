import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type { Sonuc, RaporEvrak, KasaKartBilgileri, BankaKartBilgileri } from '../models';

// POST /RaporDosyaAlSirket → Sonuc.data = Base64 PDF string
export async function raporPdfAl(
  evrak: RaporEvrak
): Promise<string> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const payload: RaporEvrak = {
    ...evrak,
    telefonCihazKodu: cihazKodu,
  };
  const res = await api.post<Sonuc<string>>('RaporDosyaAlSirket', payload);
  const sonuc = res.data;
  if (!sonuc.sonuc) {
    throw new Error(sonuc.mesaj || 'PDF alınamadı.');
  }

  return sonuc.data;
}

// Fatura/İrsaliye (e-evrak) → DosyaYollaByte, diğerleri → EvrakDosyaYolla
export async function evrakPdfAl(
  refno: number,
  evrakTipi: string,
  veriTabaniAdi: string
): Promise<string> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const endpoint = (evrakTipi === 'Fatura' || evrakTipi === 'İrsaliye' || evrakTipi === 'Irsaliye')
    ? 'DosyaYollaByte'
    : 'EvrakDosyaYolla';
  const url = buildUrl(endpoint, refno, evrakTipi, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<string>>(url);
  const sonuc = res.data;
  if (!sonuc.sonuc) {
    throw new Error(sonuc.mesaj || 'PDF alınamadı.');
  }
  return sonuc.data;
}

// ─── Kasa Kart Listesi ───────────────────────────────────────────────────────
// MAUI: "KasaKartListesiAl/{cihazKodu}/{veriTabaniAdi}"
export async function kasaKartListesiniAl(
  veriTabaniAdi: string
): Promise<Sonuc<KasaKartBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('KasaKartListesiAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<KasaKartBilgileri[]>>(url);
  return res.data;
}

// ─── Banka Kart Listesi ──────────────────────────────────────────────────────
// MAUI: "BankaKartListesiAl/{cihazKodu}/{veriTabaniAdi}"
export async function bankaKartListesiniAl(
  veriTabaniAdi: string
): Promise<Sonuc<BankaKartBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('BankaKartListesiAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<BankaKartBilgileri[]>>(url);
  return res.data;
}
