import { getApiInstance, buildUrl } from './axiosInstance';
import { getCihazKodu } from './authApi';
import type {
  Sonuc,
  CRMMusteriBilgileri,
  CRMMusteriEvrak,
  CRMTeklifFisBilgileri,
  CRMTeklifHareketBilgileri,
  CRMTeklifEvrak,
  CariEvrak,
} from '../models';

// ─── CRM Müşteri Listesi ────────────────────────────────────────────────────
// GET /CRMMusteriListesiniOku/{telefonCihazKodu}/{veriTabaniAdi}
export async function crmMusteriListesiniOku(
  veriTabaniAdi: string
): Promise<Sonuc<CRMMusteriBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('CRMMusteriListesiniOku', cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<CRMMusteriBilgileri[]>>(url);
  return res.data;
}

// ─── CRM Müşteri Koda Göre ──────────────────────────────────────────────────
// GET /CRMMusteriListesiniOku/{kod}/{telefonCihazKodu}/{veriTabaniAdi}
export async function crmMusterisiniOku(
  kod: string,
  veriTabaniAdi: string
): Promise<Sonuc<CRMMusteriBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('CRMMusteriListesiniOku', kod, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<CRMMusteriBilgileri[]>>(url);
  return res.data;
}

// ─── CRM Müşteri Kaydet ─────────────────────────────────────────────────────
// POST /CRMMusterisiniKaydet
export async function crmMusterisiniKaydet(
  potansiyelCari: CariEvrak,
  veriTabaniAdi: string
): Promise<Sonuc<string>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();

  const body: CRMMusteriEvrak = {
    telefonCihazKodu: cihazKodu,
    veriTabaniAdi,
    CRM_mb: {
      id: 0,
      durum: 0,
      musterikodu: potansiyelCari.cariKodu,
      musteriunvani: potansiyelCari.cariUnvan,
      yetkili1: potansiyelCari.yetkili,
      yetkili2: '',
      adres1: potansiyelCari.adres1,
      adres2: potansiyelCari.adres2,
      notlar: '',
      tipi: '',
      email1: potansiyelCari.eposta1,
      email2: '',
      vergidairesi: potansiyelCari.vergiDairesi,
      vergino: potansiyelCari.vergiNumarasi,
      tckimlikno: potansiyelCari.tcKimlikNo,
      aciklama1: '',
      aciklama2: '',
      aciklama3: '',
      aciklama4: '',
      aciklama5: '',
      adres3: potansiyelCari.adres3,
      ilce: potansiyelCari.ilce,
      il: potansiyelCari.il,
      ulke: potansiyelCari.ulke,
      telefon: potansiyelCari.telefon1,
      mobiltelefon: '',
      fax: '',
      ozelkod1: '',
      ozelkod2: '',
      ozelkod3: '',
      ozelkod4: '',
      ozelkod5: '',
    },
  };

  const res = await api.post<Sonuc<string>>('CRMMusterisiniKaydet', body);
  return res.data;
}

// ─── CRM Teklif Fişleri Oku ─────────────────────────────────────────────────
// GET /CRMTeklifFisleriniOku/{basTarih}/{bitTarih}/{telefonCihazKodu}/{veriTabaniAdi}
export async function crmTeklifFisleriniOku(
  basTarih: string,
  bitTarih: string,
  veriTabaniAdi: string
): Promise<Sonuc<CRMTeklifFisBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('CRMTeklifFisleriniOku', basTarih, bitTarih, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<CRMTeklifFisBilgileri[]>>(url);
  return res.data;
}

// ─── CRM Teklif Fişleri Müşteriye Göre ──────────────────────────────────────
// GET /CRMTeklifFisleriniOku/{musteriKodu}/{basTarih}/{bitTarih}/{telefonCihazKodu}/{veriTabaniAdi}
export async function crmTeklifFisleriniMusteriyeGoreOku(
  musteriKodu: string,
  basTarih: string,
  bitTarih: string,
  veriTabaniAdi: string
): Promise<Sonuc<CRMTeklifFisBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('CRMTeklifFisleriniOku', musteriKodu, basTarih, bitTarih, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<CRMTeklifFisBilgileri[]>>(url);
  return res.data;
}

// ─── CRM Teklif Hareketleri Oku ─────────────────────────────────────────────
// GET /CRMTeklifHareketleriniOku/{fisid}/{telefonCihazKodu}/{veriTabaniAdi}
export async function crmTeklifHareketleriniOku(
  fisId: number,
  veriTabaniAdi: string
): Promise<Sonuc<CRMTeklifHareketBilgileri[]>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('CRMTeklifHareketleriniOku', fisId, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<CRMTeklifHareketBilgileri[]>>(url);
  return res.data;
}

// ─── CRM Teklif PDF Al ──────────────────────────────────────────────────────
// GET /TeklifPDFAl/{id}/{musteriid}/{kullaniciKodu}/{telefonCihazKodu}/{veriTabaniAdi}
export async function crmTeklifPdfAl(
  id: number,
  musteriId: number,
  kullaniciKodu: string,
  veriTabaniAdi: string
): Promise<string> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();
  const url = buildUrl('TeklifPDFAl', id, musteriId, kullaniciKodu, cihazKodu, veriTabaniAdi);
  const res = await api.get<Sonuc<string>>(url);
  if (!res.data.data) {
    throw new Error(res.data.mesaj || 'Teklif PDF alınamadı.');
  }
  return res.data.data;
}

// ─── CRM Teklif Kaydet ──────────────────────────────────────────────────────
// POST /CRMTeklifKaydet
export async function crmTeklifKaydet(
  teklifFis: CRMTeklifFisBilgileri,
  teklifHareketler: CRMTeklifHareketBilgileri[],
  veriTabaniAdi: string
): Promise<Sonuc<any>> {
  const api = await getApiInstance();
  const cihazKodu = await getCihazKodu();

  const body: CRMTeklifEvrak = {
    telefonCihazKodu: cihazKodu,
    veriTabaniAdi,
    CRM_tfb: teklifFis,
    CRM_thbListe: teklifHareketler,
  };

  const res = await api.post<Sonuc<CRMTeklifFisBilgileri>>('CRMTeklifKaydet', body);
  return res.data;
}
