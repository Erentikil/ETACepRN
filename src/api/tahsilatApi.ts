import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type { Sonuc, TahsilatEvrak, IslemTipiBasliklari, KasaTahsilatEvrak, CekSenetEvrak } from '../models';

// GET CariBakiyeyiAl/{cariKodu}/{cihazKodu}/{veriTabaniAdi}
export async function cariBakiyeAl(
  cariKodu: string,
  veriTabaniAdi: string
): Promise<Sonuc<string>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('CariBakiyeyiAl', cariKodu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<string>>(url);
  return res.data;
}

// GET IslemTipleriniAl/{cihazKodu}/{veriTabaniAdi}
export async function islemTipleriniAl(
  veriTabaniAdi: string
): Promise<Sonuc<IslemTipiBasliklari>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('IslemTipleriniAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<IslemTipiBasliklari>>(url);
  return res.data;
}

// POST /TahsilatSirket
export async function tahsilatKaydet(
  evrak: TahsilatEvrak
): Promise<Sonuc<number>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const payload = {
    ...evrak,
    telefonCihazKodu: cihazKodu,
  };
  const res = await api.post<Sonuc<number>>('TahsilatSirket', payload);
  return res.data;
}

// POST /KasaTahsilatSirket
export async function kasaTahsilatKaydet(
  evrak: KasaTahsilatEvrak
): Promise<Sonuc<number>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const payload = {
    ...evrak,
    telefonCihazKodu: cihazKodu,
  };
  const res = await api.post<Sonuc<number>>('KasaTahsilatSirket', payload);
  return res.data;
}

// POST /CekSenetSirket
export async function cekSenetKaydet(
  evrak: CekSenetEvrak
): Promise<Sonuc<number>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const payload = {
    ...evrak,
    telefonCihazKodu: cihazKodu,
  };
  const res = await api.post<Sonuc<number>>('CekSenetSirket', payload);
  return res.data;
}
