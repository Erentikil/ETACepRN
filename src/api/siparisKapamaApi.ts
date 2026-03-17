import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type { Sonuc, AcmaSiparisHareketBilgileri, KapamaEvrak } from '../models';

// ─── Cari Açma Hareketlerini Oku ─────────────────────────────────────────────
// MAUI: "CariAcmaHareketleriniOku/{cariKod}/{cihazKodu}/{veriTabaniAdi}/{alSat}"
export async function cariAcmaHareketleriniAl(
  cariKodu: string,
  veriTabaniAdi: string,
  alimSatim: number // 1=Alış, 2=Satış
): Promise<Sonuc<AcmaSiparisHareketBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('CariAcmaHareketleriniOku', cariKodu, cihazKodu, veriTabaniAdi, alimSatim);
  const res = await api.get<Sonuc<AcmaSiparisHareketBilgileri[]>>(url);
  return res.data;
}

// ─── Evrak Açma Hareketlerini Oku ────────────────────────────────────────────
// MAUI: "EvrakAcmaHareketleriniOku/{refno}/{cihazKodu}/{veriTabaniAdi}/{alSat}"
export async function evrakAcmaHareketleriniAl(
  refno: number,
  veriTabaniAdi: string,
  alimSatim: number
): Promise<Sonuc<AcmaSiparisHareketBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('EvrakAcmaHareketleriniOku', refno, cihazKodu, veriTabaniAdi, alimSatim);
  const res = await api.get<Sonuc<AcmaSiparisHareketBilgileri[]>>(url);
  return res.data;
}

// ─── Sipariş Kapama Kaydet ───────────────────────────────────────────────────
// MAUI: POST "SiparisKapamaKaydetSirket"
export async function siparisKapamaKaydet(
  evrak: Omit<KapamaEvrak, 'veriTabaniAdi' | 'telefonCihazKodu'>,
  veriTabaniAdi: string
): Promise<Sonuc<number>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const body: KapamaEvrak = {
    ...evrak,
    veriTabaniAdi,
    telefonCihazKodu: cihazKodu,
  };
  const res = await api.post<Sonuc<number>>('SiparisKapamaKaydetSirket', body);
  return res.data;
}
