import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type { Sonuc, CariEkstreBilgileri } from '../models';

// MAUI: "CariEkstre/{ilkTarih}/{sonTarih}/{cariKodu}/{cihazKodu}/{veriTabaniAdi}"
// ilkTarih / sonTarih → "yyyyMMdd" formatında
export async function cariEkstreBilgileriAl(
  cariKodu: string,
  ilkTarih: string,
  sonTarih: string,
  veriTabaniAdi: string
): Promise<Sonuc<CariEkstreBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl(
    'CariEkstre',
    ilkTarih,
    sonTarih,
    cariKodu,
    cihazKodu,
    veriTabaniAdi
  );
  const res = await api.get<Sonuc<CariEkstreBilgileri[]>>(url);
  return res.data;
}
