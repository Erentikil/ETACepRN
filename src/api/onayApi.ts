import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type { Sonuc, OnayListesiBilgileri, OnayEvrakDetay, SepetBaslik, SepetKalem, SepetBaslikBilgileri, SepetNormalBilgileri, SepetRBBilgileri } from '../models';

export interface OnayKaydetOptions {
  guidId: string;
  genelIndirimYuzde: number;
  genelIndirimTutar: number;
  genelToplam: number;
  anaDepo: string;
  karsiDepo: string;
  saticiKodu: string;
  kullaniciKodu: string;
  kdvDahilFlag: number;
  aciklama1: string;
  aciklama2: string;
  dovizKodu: string;
  dovizTuru: string;
  dovizKuru: number;
  belgeTipiIndex: number;
  evrakEkrani: string;
  onaylamaDurumu?: number;
  onaylayan?: string;
  onaylamaNotu?: string;
  referansNo?: number;
}

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

// ─── Onay Kaydet ──────────────────────────────────────────────────────────────
// POST "OnayKaydet"
export async function onayKaydet(
  sepet: SepetBaslik,
  kalemler: SepetKalem[],
  opts: OnayKaydetOptions,
  veriTabaniAdi: string
): Promise<Sonuc<unknown>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();

  const alimSatimDurumu = sepet.alimSatim === 0 ? 'Alım' : sepet.alimSatim === 1 ? 'Satış' : 'Sayım';

  const snbListe = kalemler.map((k) => ({
    aciklama: k.aciklama || '',
    guidID: '',
    stokKodu: k.stokKodu,
    barkod: k.barkod,
    stokCinsi: k.stokCinsi,
    birim: k.birim,
    fiyatNo: k.seciliFiyatNo ?? 0,
    fiyat: k.birimFiyat,
    dovizKodu: '',
    dovizTuru: '',
    dovizKuru: 0,
    miktar: k.miktar,
    bakiye: 0,
    kalemIndirim1: k.kalemIndirim1,
    kalemIndirim2: k.kalemIndirim2,
    kalemIndirim3: k.kalemIndirim3,
    kdvOrani: Math.max(0, k.kdvOrani),
    digerBirimler: [],
    digerCarpanlar: [],
  }));
  
  const body = {
    sbb: {
      tarih: new Date().toISOString(),
      referansNo: opts.referansNo ?? 0,
      belgeTipiIndex: opts.belgeTipiIndex,
      evrakTipi: sepet.evrakTipi,
      alimSatim: sepet.alimSatim,
      alimSatimDurumu,
      evrakEkrani: opts.evrakEkrani,
      cariKodu: sepet.cariKodu,
      cariUnvan: sepet.cariUnvan,
      anaDepoKodu: opts.anaDepo,
      karsiDepoKodu: opts.karsiDepo,
      guidID: opts.guidId,
      indirimOran: opts.genelIndirimYuzde,
      indirimTutar: opts.genelIndirimTutar,
      fisTipi: sepet.fisTipiBaslikNo,
      fisTipAciklama: sepet.fisTipiAdi,
      saticiKodu: opts.saticiKodu,
      genelKDVNo: 0,
      genelKDV: 0,
      eevrak: opts.belgeTipiIndex === 0 ? '1' : '0',
      dovizKodu: opts.dovizKodu,
      dovizTuru: opts.dovizTuru,
      dovizKuru: opts.dovizKuru,
      aciklama1: opts.aciklama1,
      aciklama2: opts.aciklama2,
      genelToplam: opts.genelToplam,
      evrakKayitNedeni: '',
      kullaniciKodu: opts.kullaniciKodu,
      adresNo: 0,
      kdvDahilFlag: opts.kdvDahilFlag,
    },
    snbListe,
    onaylamaDurumu: opts.onaylamaDurumu ?? 0,
    onaylayan: opts.onaylayan ?? '',
    onaylamaNotu: opts.onaylamaNotu ?? '',
    veriTabaniAdi,
    telefonCihazKodu: cihazKodu,
  };

  console.log('OnayKaydet body:', JSON.stringify(body, null, 2));
  const res = await api.post<Sonuc<unknown>>('OnayKaydet', body);
  return res.data;
}

// ─── Evrak Onayı Değiştir ─────────────────────────────────────────────────────
// POST "EvrakOnayiDegistir"
export async function evrakOnayiDegistir(
  sbb: Partial<SepetBaslikBilgileri>,
  snbListe: SepetNormalBilgileri[],
  sRBbListe: SepetRBBilgileri[],
  onaylamaDurumu: number,
  onaylayan: string,
  onaylamaNotu: string,
  veriTabaniAdi: string,
): Promise<Sonuc<unknown>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const body = {
    sbb,
    snbListe,
    sRBbListe,
    onaylamaDurumu,
    onaylayan,
    onaylamaNotu,
    veriTabaniAdi,
    telefonCihazKodu: cihazKodu,
  };
  const res = await api.post<Sonuc<unknown>>('EvrakOnayiDegistir', body);
  return res.data;
}
