import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type { Sonuc, StokListesiBilgileri, CariKartBilgileri, SepetBaslik } from '../models';
import { EvrakTipi } from '../models';

// ─── Stok Listesi ─────────────────────────────────────────────────────────────
// MAUI: "TumStokBilgileriniAl/Stok Kart/{kullaniciKodu}/{cihazKodu}/{veriTabaniAdi}"
export async function stokListesiniAl(
  kullaniciKodu: string,
  veriTabaniAdi: string
): Promise<Sonuc<StokListesiBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('TumStokBilgileriniAl/Stok Kart', kullaniciKodu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<StokListesiBilgileri[]>>(url);
  return res.data;
}

// ─── Cari Listesi ─────────────────────────────────────────────────────────────
// MAUI: "CariKartlariAl/YOK/{cihazKodu}/{veriTabaniAdi}/{kullaniciKoduOrADMIN}/{saticiKontrolKolonu}"
export async function cariListesiniAl(
  veriTabaniAdi: string,
  saticiBazliCariKart: boolean,
  kullaniciKodu: string,
  saticiKontrolKolonu: string
): Promise<Sonuc<CariKartBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const kullanici = saticiBazliCariKart ? kullaniciKodu : 'ADMIN';
  const url = buildUrl('CariKartlariAl', 'YOK', cihazKodu, veriTabaniAdi, kullanici, saticiKontrolKolonu);
  const res = await api.get<Sonuc<CariKartBilgileri[]>>(url);
  return res.data;
}

// ─── Evrak Kaydet ─────────────────────────────────────────────────────────────
// MAUI: POST /{islemAdi}Sirket — body içinde telefonCihazKodu + veriTabaniAdi
function evrakIslemAdi(evrakTipi: EvrakTipi): string {
  switch (evrakTipi) {
    case EvrakTipi.Fatura:   return 'Fatura';
    case EvrakTipi.Irsaliye: return 'Irsaliye';
    case EvrakTipi.Siparis:  return 'Siparis';
    case EvrakTipi.Stok:     return 'Stok';
    default:                  return 'Fatura';
  }
}

export async function evrakKaydet(
  sepet: SepetBaslik,
  veriTabaniAdi: string
): Promise<Sonuc<string>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = `${evrakIslemAdi(sepet.evrakTipi)}Sirket`;
  const body = { ...sepet, telefonCihazKodu: cihazKodu, veriTabaniAdi };
  const res = await api.post<Sonuc<string>>(url, body);
  return res.data;
}
