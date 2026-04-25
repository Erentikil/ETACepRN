import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type { Sonuc, StokListesiBilgileri, StokFiyatBilgileri, CariKartBilgileri, AdresBilgileri, SepetBaslik, StokKartEkBilgileri, BekleyenSiparisBilgileri, FisTipiGrup, DepoListesi, KurBilgileri, CariEvrak, SonSatisFiyatBilgileri, CariFiyatBilgileri } from '../models';
import { EvrakTipi } from '../models';

// ─── Stok Listesi ─────────────────────────────────────────────────────────────
// MAUI: "TumStokBilgileriniAl/Stok Kart/{kullaniciKodu}/{cihazKodu}/{veriTabaniAdi}"
export async function stokListesiniAl(
  kullaniciKodu: string,
  veriTabaniAdi: string,
  fiyatNo?: number
): Promise<Sonuc<StokListesiBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const params: (string | number)[] = [kullaniciKodu, cihazKodu, veriTabaniAdi];
  if (fiyatNo != null && fiyatNo > 0) params.push(fiyatNo);
  const url = buildUrl('TumStokBilgileriniAl/Stok Kart', ...params);
  
  const res = await api.get<Sonuc<StokListesiBilgileri[]>>(url);
  
  return res.data;
}

// ─── Stok Kart Sayısını Bul ──────────────────────────────────────────────────
// GET /StokKartSayisiniBul/{telefonCihazKodu}/{veriTabaniAdi}
export async function stokKartSayisiniBul(
  veriTabaniAdi: string
): Promise<Sonuc<number>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('StokKartSayisiniBul', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<number>>(url);
  return res.data;
}

// ─── Stok Bilgilerini Sayfalama ile Al ────────────────────────────────────────
// "StokBilgileriniSayfalamaileAl/{gecerliSayfa}/{sayfaUzunlugu}/{telefonCihazKodu}/{veriTabaniAdi}"
export async function stokBilgileriniSayfalamaIleAl(
  gecerliSayfa: number,
  sayfaUzunlugu: number,
  veriTabaniAdi: string
): Promise<Sonuc<StokListesiBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('StokBilgileriniSayfalamaileAl', gecerliSayfa, sayfaUzunlugu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<StokListesiBilgileri[]>>(url);
  return res.data;
}

// ─── Tek Stok Fiyat Bilgileri ─────────────────────────────────────────────────
// MAUI: "TekStokFiyatBilgisiniAl/{stokKodu}/{cihazKodu}/{veriTabaniAdi}"
export async function tekStokFiyatBilgisiniAl(
  stokKodu: string,
  veriTabaniAdi: string
): Promise<Sonuc<StokFiyatBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('TekStokFiyatBilgisiniAl', stokKodu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<StokFiyatBilgileri[]>>(url);
  return res.data;
}

// ─── Cari Fiyat Bilgileri ────────────────────────────────────────────────────
// MAUI: "TekCariFiyatOku/{cariFiyatKodu}/{cihazKodu}/{veriTabaniAdi}"
//       veya "TumStokBilgileriniAl/Cari Fiyat/{kullaniciKodu}/{cihazKodu}/{veriTabaniAdi}"
export async function cariFiyatBilgileriniAl(
  kullaniciKodu: string,
  veriTabaniAdi: string,
  cariFiyatKodu?: string
): Promise<Sonuc<CariFiyatBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  if (cariFiyatKodu && cariFiyatKodu.trim() !== '') {
    const url = buildUrl('TekCariFiyatOku', cariFiyatKodu, cihazKodu, veriTabaniAdi);
    const res = await api.get<Sonuc<CariFiyatBilgileri[]>>(url);
    return res.data;
  }
  const url = buildUrl('TumStokBilgileriniAl/Cari Fiyat', kullaniciKodu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<CariFiyatBilgileri[]>>(url);
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

// ─── Son Satış Fiyatları ─────────────────────────────────────────────────────
// MAUI: "SonSatisFiyatlariniAl/{cariKodu}/{stokKodu}/{adet}/{cihazKodu}/{veriTabaniAdi}"
export async function sonSatisFiyatlariniAl(
  cariKodu: string,
  stokKodu: string,
  veriTabaniAdi: string,
  adet: number = 10
): Promise<Sonuc<SonSatisFiyatBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('SonSatisFiyatlariniAl', cariKodu, stokKodu, adet, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<SonSatisFiyatBilgileri[]>>(url);
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

// ─── Kur Bilgileri ────────────────────────────────────────────────────────────
// MAUI: "KurBilgileriniAl/{cihazKodu}/{veriTabaniAdi}"
export async function kurBilgileriniAl(
  veriTabaniAdi: string
): Promise<Sonuc<KurBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('KurBilgileriniAl', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<KurBilgileri[]>>(url);
  return res.data;
}

// ─── Barkoddan Stok Kodunu Bul ──────────────────────────────────────────────
// GET "BarkoddanStokKodunuBul/{barkod}/{cihazKodu}/{veriTabaniAdi}"
export async function barkoddanStokKodunuBul(
  barkod: string,
  veriTabaniAdi: string
): Promise<Sonuc<StokListesiBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('BarkoddanStokKodunuBul', barkod, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<StokListesiBilgileri[]>>(url);
  return res.data;
}

// ─── Stok Kartlarını Kod/Cins/Barkoddan Bul ──────────────────────────────────
// MAUI: "StokKartlariniKodCinsBarkoddanBul/{veri}/{tip}/{cihazKodu}/{veriTabaniAdi}"
// tip: 0 = ile, 1 = başlayan, 2 = biten, 3 = içinde geçen
export async function stokKartlariniKodCinsBarkoddanBul(
  veri: string,
  tip: number,
  veriTabaniAdi: string
): Promise<Sonuc<StokListesiBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('StokKartlariniKodCinsBarkoddanBul', veri, tip, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<StokListesiBilgileri[]>>(url);
  return res.data;
}

// ─── Cari Kart Kaydet ────────────────────────────────────────────────────────
// MAUI: POST "CariKartKaydetSirket"
export async function cariKartKaydet(
  evrak: CariEvrak,
  veriTabaniAdi: string
): Promise<Sonuc<string>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const body: CariEvrak = {
    ...evrak,
    veriTabaniAdi,
    telefonCihazKodu: cihazKodu,
  };
  const res = await api.post<Sonuc<string>>('CariKartKaydetSirket', body);
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
    case EvrakTipi.Fatura:   return 'Fatura';
    case EvrakTipi.Irsaliye: return 'Irsaliye';
    case EvrakTipi.Siparis:  return 'Sipariş';
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
  genelIndirimYuzde: number;
  genelIndirimTutar: number;
  aciklama1: string;
  aciklama2: string;
  dovizKodu: string;
  dovizTuru: string;
  dovizKuru: number;
  belgeTipi: 'eevrak' | 'normal' | 'diger';
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
    kalemIndirim4: k.kalemIndirim4 ?? 0,
    kalemIndirim5: k.kalemIndirim5 ?? 0,
    kdvOrani: Math.max(0, k.kdvOrani),
    dovizKodu: '',
    dovizTuru: '',
    dovizKuru: 0,
    fiyatNo: 0,
    guidID: '',
    aciklama: k.aciklama || '',
  }));

  // Sunucunun Evrak class'ına uygun body
  const body = {
    guid: opts.guidId,
    snbListe,
    sbListe: null,
    sRBbListe: null,
    ckb: { cariKodu: sepet.cariKodu, cariUnvan: sepet.cariUnvan },
    indirim: opts.genelIndirimTutar > 0 ? opts.genelIndirimTutar : opts.genelIndirimYuzde,
    alimSatimFlag: sepet.alimSatim,
    fisTipi: sepet.fisTipiBaslikNo,
    anaDepo: opts.anaDepo,
    karsiDepo: opts.karsiDepo,
    refno: 0,
    evrakTipi: evrakTipiStr(sepet.evrakTipi),
    saticiKodu: opts.saticiKodu,
    genelKDV: 0,
    eevrak: opts.belgeTipi === 'eevrak' ? 1 : 0,
    aciklama1: opts.aciklama1,
    aciklama2: opts.aciklama2,
    dovizTuru: opts.dovizTuru,
    dovizKodu: opts.dovizKodu,
    dovizKuru: opts.dovizKuru,
    indirimTipi: opts.genelIndirimTutar > 0 ? '' : (opts.genelIndirimYuzde > 0 ? 'Yüzde' : ''),
    kdvDurum: opts.kdvDurum,
    adresNo: 0,
    telefonCihazKodu: cihazKodu,
    veriTabaniAdi,
  };
  const res = await api.post<Sonuc<string>>(url, body);

  return res.data;
}

// ─── Barkod Kaydet ──────────────────────────────────────────────────────────
// POST "BarkodKaydetSirket"
export async function barkodKaydet(
  sbb: {
    stokKodu: string;
    barkod: string;
    birimNo: number;
    katsayi: number;
    itemNo: number;
    fiyatTipi: string;
    birimAdi: string;
    fiyatAdi: string;
  },
  veriTabaniAdi: string
): Promise<Sonuc<string>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const body = {
    veriTabaniAdi,
    telefonCihazKodu: cihazKodu,
    sbb,
  };
  const res = await api.post<Sonuc<string>>('BarkodKaydet', body);
  return res.data;
}

// POST /EntegratoreYollaSirket → Sonuc
export async function entegratoreYolla(
  refno: number,
  evrakTipi: string,
  veriTabaniAdi: string
): Promise<Sonuc<unknown>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const body = {
    refno,
    evrakTipi,
    telefonCihazKodu: cihazKodu,
    veriTabaniAdi,
  };
  const res = await api.post<Sonuc<unknown>>('EntegratoreYollaSirket', body);
  return res.data;
}
