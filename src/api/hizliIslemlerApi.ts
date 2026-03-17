import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type { Sonuc, StokListesiBilgileri, CariKartBilgileri, AdresBilgileri, SepetBaslik, StokKartEkBilgileri, BekleyenSiparisBilgileri, FisTipiGrup, DepoListesi } from '../models';
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
  console.log(url);
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

// ─── Cari Adres Bilgileri ─────────────────────────────────────────────────────
// MAUI: "AdresBilgileriniAl/{cariKodu}/{cihazKodu}/{veriTabaniAdi}"
export async function adresBilgileriniAl(
  cariKodu: string,
  veriTabaniAdi: string
): Promise<Sonuc<AdresBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('AdresBilgileriniAl', cariKodu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<AdresBilgileri[]>>(url);
  return res.data;
}

// ─── Stok Ek Bilgileri ────────────────────────────────────────────────────────
// MAUI: "StokEkBilgileriAl/{stokKodu}/{cihazKodu}/{veriTabaniAdi}"
export async function stokEkBilgileriAl(
  stokKodu: string,
  veriTabaniAdi: string
): Promise<Sonuc<StokKartEkBilgileri>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('StokEkBilgileriAl', stokKodu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<StokKartEkBilgileri>>(url);
  return res.data;
}

// ─── Fiş Tipleri ──────────────────────────────────────────────────────────────
// MAUI: "FisTipleriniAl/{cihazKodu}/{veriTabaniAdi}"
export async function fisTipleriniAl(
  veriTabaniAdi: string
): Promise<Sonuc<FisTipiGrup[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('FisTipleriniAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<FisTipiGrup[]>>(url);
  return res.data;
}

// ─── Depo Kartları ────────────────────────────────────────────────────────────
// MAUI: "DepoKartlariniAl/{cihazKodu}/{veriTabaniAdi}"
export async function depoKartlariniAl(
  veriTabaniAdi: string
): Promise<Sonuc<DepoListesi>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('DepoKartlariniAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<DepoListesi>>(url);
  return res.data;
}

// ─── Bekleyen Siparişler ───────────────────────────────────────────────────────
// MAUI: "CariBazliBekleyenSiparisler/{carkod}/{cihazKodu}/{veriTabaniAdi}"
export async function bekleyenSiparisleriAl(
  cariKodu: string,
  veriTabaniAdi: string
): Promise<Sonuc<BekleyenSiparisBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('CariBazliBekleyenSiparisler', cariKodu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<BekleyenSiparisBilgileri[]>>(url);
  return res.data;
}

// ─── Evrak Kaydet ─────────────────────────────────────────────────────────────
// MAUI: POST /{islemAdi}Sirket — Evrak class yapısıyla eşleşen body
function evrakIslemAdi(evrakTipi: EvrakTipi): string {
  switch (evrakTipi) {
    case EvrakTipi.Fatura:   return 'FaturaKaydet';
    case EvrakTipi.Irsaliye: return 'IrsaliyeKaydet';
    case EvrakTipi.Siparis:  return 'SiparisKaydet';
    case EvrakTipi.Stok:     return 'StokFisKaydet';
    default:                  return 'FaturaKaydet';
  }
}

function evrakTipiStr(evrakTipi: EvrakTipi): string {
  switch (evrakTipi) {
    case EvrakTipi.Fatura:   return 'FaturaKaydet';
    case EvrakTipi.Irsaliye: return 'IrsaliyeKaydet';
    case EvrakTipi.Siparis:  return 'SiparisKaydet';
    case EvrakTipi.Stok:     return 'Stok';
    default:                  return 'Fatura';
  }
}

export function generateGuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface EvrakKaydetOptions {
  saticiKodu: string;
  kdvDurum: number;
  anaDepo: string;
  karsiDepo: string;
  guidId: string;
}

export async function evrakKaydet(
  sepet: SepetBaslik,
  veriTabaniAdi: string,
  opts: EvrakKaydetOptions
): Promise<Sonuc<string>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = `${evrakIslemAdi(sepet.evrakTipi)}Sirket`;

  // Kalemler → snbListe (SepetNormalBilgileri yapısına uygun)
  const snbListe = sepet.kalemler.map((k) => ({
    stokKodu: k.stokKodu,
    stokCinsi: k.stokCinsi,
    barkod: k.barkod,
    birim: k.birim,
    fiyat: k.birimFiyat,       // birimFiyat → fiyat
    miktar: k.miktar,
    bakiye: 0,
    kalemIndirim1: k.kalemIndirim1,
    kalemIndirim2: k.kalemIndirim2,
    kalemIndirim3: k.kalemIndirim3,
    kdvOrani: k.kdvOrani,
    dovizKodu: '',
    dovizTuru: '',
    dovizKuru: 0,
    fiyatNo: 0,
    guidID: '',
  }));

  // Sunucunun Evrak class'ına uygun body
  const body = {
    guid: opts.guidId,
    snbListe,
    sbListe: null,
    sRBbListe: null,
    ckb: { cariKodu: sepet.cariKodu, cariUnvan: sepet.cariUnvan },
    indirim: 0,
    alimSatimFlag: sepet.alimSatim,
    fisTipi: sepet.fisTipiBaslikNo,
    anaDepo: opts.anaDepo,
    karsiDepo: opts.karsiDepo,
    refno: 0,
    evrakTipi: evrakTipiStr(sepet.evrakTipi),
    saticiKodu: opts.saticiKodu,
    genelKDV: 0,
    eevrak: 0,
    aciklama1: '',
    aciklama2: '',
    dovizTuru: '',
    dovizKodu: '',
    dovizKuru: 0,
    indirimTipi: '',
    kdvDurum: opts.kdvDurum,
    adresNo: 0,
    telefonCihazKodu: cihazKodu,
    veriTabaniAdi,
  };
  const res = await api.post<Sonuc<string>>(url, body);
  
  return res.data;
}
