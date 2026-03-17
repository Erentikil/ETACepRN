import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type { Sonuc, OnayListesiBilgileri, OnayEvrakDetay } from '../models';

// ─── Onay Listesi ─────────────────────────────────────────────────────────────
// MAUI: "OnayListesiniAl/{kullaniciKodu}/{cihazKodu}/{veriTabaniAdi}"
// kullaniciKodu = "YOK" → admin modu (tüm kullanıcılar)
export async function onayListesiniAl(
  kullaniciKodu: string,
  veriTabaniAdi: string
): Promise<Sonuc<OnayListesiBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('OnayListesiniAl', kullaniciKodu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<OnayListesiBilgileri[]>>(url);
  return res.data;
}

// ─── Onay Evrakı Al ───────────────────────────────────────────────────────────
// MAUI: "OnayEvraginiAl/{guidId}/{cihazKodu}/{veriTabaniAdi}"
export async function onayEvraginiAl(
  guidId: string,
  veriTabaniAdi: string
): Promise<Sonuc<OnayEvrakDetay>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('OnayEvraginiAl', guidId, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<OnayEvrakDetay>>(url);
  return res.data;
}

// ─── Onay Durumu Güncelle ──────────────────────────────────────────────────────
// MAUI: POST "OnaylamaDurumunuGuncelle" — OnayEvrak body yapısı
export async function onaylamaDurumunuGuncelle(
  guidID: string,
  durum: number,
  onaylayan: string,
  onaylamaNotu: string,
  veriTabaniAdi: string
): Promise<Sonuc<unknown>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const body = {
    sbb: { guidID },
    onaylamaDurumu: durum,
    onaylayan,
    onaylamaNotu,
    telefonCihazKodu: cihazKodu,
    veriTabaniAdi,
  };
  const res = await api.post<Sonuc<unknown>>('OnaylamaDurumunuGuncelle', body);
  return res.data;
}
