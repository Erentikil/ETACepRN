import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import { EvrakTipi } from '../models';
import type { Sonuc, BarkodBilgileri, SepetRBKalem, SepetBaslik } from '../models';

// ─── Barkod Bilgileri ────────────────────────────────────────────────────────
// MAUI: "TumStokBilgileriniAl/Barkod/{kullaniciKodu}/{cihazKodu}/{veriTabaniAdi}"
export async function barkodBilgileriniAl(
  kullaniciKodu: string,
  veriTabaniAdi: string
): Promise<Sonuc<BarkodBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('TumStokBilgileriniAl/Barkod', kullaniciKodu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<BarkodBilgileri[]>>(url);
  return res.data;
}

// ─── Renk-Beden Evrak Kaydet ─────────────────────────────────────────────────
// MAUI: POST /{islemAdi}Sirket — sRBbListe ile
function evrakIslemAdi(evrakTipi: EvrakTipi): string {
  switch (evrakTipi) {
    case EvrakTipi.Fatura:   return 'FaturaKaydet';
    case EvrakTipi.Irsaliye: return 'IrsaliyeKaydet';
    case EvrakTipi.Siparis:  return 'SiparisKaydet';
    case EvrakTipi.Stok:     return 'StokFisKaydet';
    default:                  return 'FaturaKaydet';
  }
}

export interface EvrakRBKaydetOptions {
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

export async function evrakRBKaydet(
  sepet: SepetBaslik,
  rbKalemler: SepetRBKalem[],
  veriTabaniAdi: string,
  opts: EvrakRBKaydetOptions
): Promise<Sonuc<string>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = `${evrakIslemAdi(sepet.evrakTipi)}Sirket`;

  const sRBbListe = rbKalemler.map((k) => ({
    stokKodu: k.stokKodu,
    stokCinsi: k.stokCinsi,
    barkod: k.barkod,
    birim: k.birim,
    fiyat: k.fiyat,
    miktar: k.miktar,
    bakiye: k.bakiye,
    kalemIndirim1: k.kalemIndirim1,
    kalemIndirim2: k.kalemIndirim2,
    kalemIndirim3: k.kalemIndirim3,
    kalemIndirim4: k.kalemIndirim4 ?? 0,
    kalemIndirim5: k.kalemIndirim5 ?? 0,
    kdvOrani: Math.max(0, k.kdvOrani),
    dovizKodu: k.dovizKodu,
    dovizTuru: k.dovizTuru,
    dovizKuru: k.dovizKuru,
    fiyatNo: k.fiyatNo,
    guidID: k.guidID,
    renkKodu: k.renkKodu,
    bedenKodu: k.bedenKodu,
    carpan: k.carpan,
  }));

  const body = {
    guid: opts.guidId,
    snbListe: null,
    sbListe: null,
    sRBbListe,
    ckb: { cariKodu: sepet.cariKodu, cariUnvan: sepet.cariUnvan },
    indirim: opts.genelIndirimTutar > 0 ? opts.genelIndirimTutar : opts.genelIndirimYuzde,
    alimSatimFlag: sepet.alimSatim,
    fisTipi: sepet.fisTipiBaslikNo,
    anaDepo: opts.anaDepo,
    karsiDepo: opts.karsiDepo,
    refno: 0,
    evrakTipi: evrakIslemAdi(sepet.evrakTipi),
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
