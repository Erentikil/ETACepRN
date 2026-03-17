import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type { Sonuc, CekSenetBilgileri } from '../models';

// MAUI: "CekSenetListesiAl/{cihazKodu}/{veriTabaniAdi}"
export async function cekSenetListesiniAl(
  veriTabaniAdi: string
): Promise<Sonuc<CekSenetBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('CekSenetListesiAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<CekSenetBilgileri[]>>(url);
  return res.data;
}
