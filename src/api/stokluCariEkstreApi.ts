import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type { Sonuc, StokluCariEkstreBilgileri } from '../models';

// MAUI: "StokluCariEkstre/{ilkTarih}/{sonTarih}/{cariKodu}/{cihazKodu}/{veriTabaniAdi}"
export async function stokluCariEkstreBilgileriAl(
  cariKodu: string,
  ilkTarih: string,
  sonTarih: string,
  veriTabaniAdi: string
): Promise<Sonuc<StokluCariEkstreBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('StokluCariEkstre', ilkTarih, sonTarih, cariKodu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<StokluCariEkstreBilgileri[]>>(url);
  return res.data;
}
