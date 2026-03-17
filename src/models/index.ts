// ─── Temel Sonuç Modeli ───────────────────────────────────────────────────────
export interface Sonuc<T = unknown> {
  sonuc: boolean;
  data: T;
  mesaj: string;
}

// ─── Enum'lar ─────────────────────────────────────────────────────────────────
export enum EvrakTipi {
  Fatura = 0,
  Irsaliye = 1,
  Siparis = 2,
  Stok = 3,
  Bos = 4,
}

export enum AlimSatim {
  Alim = 0,
  Satim = 1,
  Sayim = 2,
}

export enum TabloCekmeDurumu {
  Cekilmedi = 0,
  Cekildi = 1,
  DevreDisi = 2,
}

export enum KameraBarkodTipi {
  Zxing = 'zxing',
  Google = 'google',
}

export enum KameraBarkodOkuma {
  Otomatik = 'otomatik',
  Elle = 'elle',
}

// ─── Kullanıcı & Yetki ───────────────────────────────────────────────────────
export interface YetkiBilgileri {
  yetkiID?: number;
  kullaniciKodu: string;
  Sifre: string;
  ayarYetkisi: boolean;
  raporYetkisi: boolean;
  faturaYetkisi: boolean;
  irsaliyeYetkisi: boolean;
  eevrakKaydetmeYetkisi: boolean;
  entegratoreYollaYetkisi: boolean;
  siparisAcmaYetkisi: boolean;
  siparisKapamaYetkisi: boolean;
  stokYetkisi: boolean;
  fiyatDegistirmeYetkisi: boolean;
  kalemIndirimYapmaYetkisi: boolean;
  cariKartAcmaYetkisi: boolean;
  cariTahsilatYetkisi: boolean;
  kasaTahsilatYetkisi: boolean;
  cariRaporlarYetkisi: boolean;
  faturaOnaySatis: boolean;
  irsaliyeOnaySatis: boolean;
  siparisOnaySatis: boolean;
  defaultEvrakTipi: string;
  saticiKontrolKolonu: string;
  saticiBazliCariKart: boolean;
  efaturaKayitYetkisi: boolean;
  eirsaliyeKayitYetkisi: boolean;
  kdvDurum: number; // 0=Hariç, 1=Dahil, -1=Yok
  onayAltSiniri: number;
  cariFiyatListesi: boolean;
  faturaAlis: number;
  faturasatis: number;
  irsaliyeAlis: number;
  irsaliyeSatis: number;
  siparisAcmaAlis: number;
  siparisAcmaSatis: number;
  stokGiris: number;
  stokCikis: number;
  sayim: number;
  siparisKapama: number;
  cariTahsilat: number;
  kasaTahsilat: number;
  fisTipiDegistirme: boolean;
  depoDegistirme: boolean;
  anaDepo: string;
  karsiDepo: string;
  fiyatNo: number;
  fiyatItemNo: number;
  admin: boolean;
  cekTahsilatYetkisi: boolean;
  senetTahsilatYetkisi: boolean;
  baslangicEkrani: number; // 0=Hızlı, 1=Normal, 2=RB, 3=SiparisKapama, 4=Raporlar
}

export interface MenuYetkiBilgileri {
  menuYetkiID?: number;
  kullaniciKodu: string;
  Sifre: string;
  hizliIslemler: boolean;
  alisSatisIslemler: boolean;
  renkBedenIslemleri: boolean;
  siparisKapama: boolean;
  tahsilatlar: boolean;
  raporlar: boolean;
  bekleyenEvraklar: boolean;
  ziyaretIslemleri: boolean;
  onayIslemleri: boolean;
  kurBilgileri: boolean;
  dosyaIslemleri: boolean;
  dizayn: boolean;
  ayarlar: boolean;
}

export interface KameraYetkiBilgileri {
  kameraOkuma: KameraBarkodOkuma;
  kameraBarkod: KameraBarkodTipi;
}

// ─── Versiyon & Şirket ───────────────────────────────────────────────────────
export interface VersiyonBilgileri {
  kalanGunSayisi: number;
  versiyonTipi: string;
}

export interface SirketBilgileri {
  sirketListesi: string[];
  varsayilanSirket: string;
}

// ─── KDV ─────────────────────────────────────────────────────────────────────
export interface KDVKisimTablosu {
  kdvID?: number;
  evrakTipi?: string;
  kdvKisimNo: number;
  kdvKisimAciklama: string;
  kdvKisimOran: number;
  // eski alanlar (uyumluluk)
  kdvKisimID?: number;
  kdvKodu?: number;
  kdvOrani?: number;
  kdvAdi?: string;
}

export interface KDVBilgileri {
  kdvKisimListesi: KDVKisimTablosu[];
  faturaKDV?: KDVKisimTablosu | null;
  irsaliyeKDV?: KDVKisimTablosu | null;
  siparisKDV?: KDVKisimTablosu | null;
  stokKDV?: KDVKisimTablosu | null;
  /** @deprecated eski alan, kdvKisimListesi kullanın */
  kdvListesi?: KDVKisimTablosu[];
}

// ─── Fiş Tipleri ─────────────────────────────────────────────────────────────
// ─── Fiş Tipleri ─────────────────────────────────────────────────────────────
export interface FisTipiItem {
  fisTipiKodu: number;
  fisTipiAdi: string;
  fisTipiOzelligi: string;
}

/** MAUI FisTipiBaslik — API'den gelen yapı + varsayılan ft */
export interface FisTipiBaslik {
  ftListe: FisTipiItem[];
  evrakTipi: string;    // "Fatura" | "İrsaliye" | "Sipariş" | "Stok"
  alimSatim: string;    // "Alış" | "Satış" | "Giriş" | "Çıkış" | "Sayım"
  ft: FisTipiItem | null;
}

/** @deprecated eski FisTipiGrup, artık FisTipiBaslik kullan */
export type FisTipiGrup = FisTipiBaslik;

// ─── Depo Kartları (DepoKartlariniAl endpoint) ───────────────────────────────
export interface DepoKarti {
  kartTipi: string;
  depoKod: string;
  depoAdi: string;
}

export interface DepoListesi {
  anaDepoKodu: DepoKarti;
  karsiDepoKodu: DepoKarti;
  dkListe: DepoKarti[];
}

// ─── Fiyat Tipi ──────────────────────────────────────────────────────────────
export interface FiyatTipiBilgileri {
  fiyatTipiID?: number;
  fiyatNo: number;
  fiyatAdi: string;
  dovizKodu: string;
}

// ─── Menü Öğesi (Drawer) ─────────────────────────────────────────────────────
export interface MenuOgesi {
  id: number;
  baslik: string;
  icon: string;
  ekranAdi: string;
}

// ─── Hızlı İşlemler ──────────────────────────────────────────────────────────
export interface StokListesiBilgileri {
  stokID: number;
  stokKodu: string;
  stokCinsi: string;
  barkod: string;
  fiyat: number;
  kdvOrani: number;
  birim: string;
  bakiye: number;
  carpan: number;
  miktar: number;
  kalemIndirim1: number;
  kalemIndirim2: number;
  kalemIndirim3: number;
}

export interface CariKartBilgileri {
  cariKodu: string;
  cariUnvan: string;
  adres?: string;
  telefon?: string;
  yetkili?: string;
  bakiye?: number;
  indirimYuzde?: number;
  alisFiyatNo?: number;
  satisFiyatNo?: number;
  listeFiyatNo?: string;
  eEvrakTipi?: string;
}

// ─── Cari Adres Bilgileri ────────────────────────────────────────────────────
export interface AdresBilgileri {
  cariKodu: string;
  cariUnvan: string;
  vergiDairesi: string;
  vergiNumarasi: string;
  kimlikNumarasi: string;
  adresNo: number;
  yetkili: string;
  adres1: string;
  adres2: string;
  adres3: string;
  il: string;
  ilce: string;
  telefon1: string;
  telefon2: string;
}

// ─── Tahsilat ─────────────────────────────────────────────────────────────────
export interface IslemTipleri {
  islemTipiKodu: string;
  islemTipiAdi: string;
}

export interface IslemTipiBasliklari {
  itListe: IslemTipleri[];
  cariIslemTipi: IslemTipleri;
  kasaIslemTipi: IslemTipleri;
}

export interface TahsilatBilgileri {
  islemTipi: number;
  cariKodu: string;
  cariUnvani: string;
  tarih: string;
  aciklama: string;
  aciklama1: string;
  vadeTarihi: string;
  tutar: number;
}

export interface TahsilatEvrak {
  guid: string;
  tb: TahsilatBilgileri;
  kullaniciKodu: string;
  veriTabaniAdi?: string;
  telefonCihazKodu?: string;
}

export interface SepetKalem {
  stokKodu: string;
  stokCinsi: string;
  barkod: string;
  birim: string;
  miktar: number;
  birimFiyat: number;
  kdvOrani: number;
  kalemIndirim1: number;
  kalemIndirim2: number;
  kalemIndirim3: number;
}

// ─── Stok Ek Bilgileri ────────────────────────────────────────────────────────
export interface StokKartBakiyeBilgileri {
  stokKodu: string;
  bakiye: number;
  rezervCikis: number;
  rezervGiris: number;
  muhtemelBakiye: number;
  ozkod1: string;
  ozkod2: string;
  ozkod3: string;
  ozkod4: string;
  ozkod5: string;
}

export interface StokKartDepoBakiyeBilgileri {
  depoKodu: string;
  depoAdi: string;
  depoBakiye: number;
}

export interface StokKartEkBilgileri {
  skbb: StokKartBakiyeBilgileri;
  skdbbListe: StokKartDepoBakiyeBilgileri[];
}

// ─── Onay İşlemleri ───────────────────────────────────────────────────────────
export interface OnayListesiBilgileri {
  cariKodu: string;
  cariUnvani: string;
  guidId: string;
  evrakTipi: string;
  fisTipi: string;
  not: string;
  onaylayan: string;
  durum: string;
  onayDurumu: number;
  genelToplam: number;
  tarih: string;
  kullaniciKodu: string;
  sirketAdi: string;
}

// ─── Bekleyen Siparişler ───────────────────────────────────────────────────────
export interface BekleyenSiparisBilgileri {
  tarih: string;
  stokKodu: string;
  stokCinsi: string;
  siparisMiktari: number;
  teslimEdilenMiktar: number;
  kalanMiktar: number;
  birim: string;
  fiyat: number;
  tutar: number;
  cariKodu: string;
  cariUnvani: string;
}

export interface SepetBaslik {
  cariKodu: string;
  cariUnvan: string;
  evrakTipi: EvrakTipi;
  alimSatim: AlimSatim;
  fisTipiBaslikNo: number;
  fisTipiAdi: string;
  anaDepo?: string;
  karsiDepo?: string;
  kalemler: SepetKalem[];
}

// ─── Cari Ekstre ──────────────────────────────────────────────────────────────
export interface CariEkstreBilgileri {
  cariKodu: string;
  baslangicTarih: string;
  tarih: string;
  tipKodu: string;
  evrakNo: string;
  aciklama: string;
  vade: string;
  borc: number;
  alacak: number;
  bakiye: number;
}

// ─── Çek Senet ────────────────────────────────────────────────────────────────
export interface CekSenetBilgileri {
  pozisyon: string;
  cekSenetTipi: string;
  cekSenetSayisi: number;
  tutar: number;
}

// ─── Stoklu Cari Ekstre ───────────────────────────────────────────────────────
export interface StokluCariEkstreBilgileri {
  cariKodu: string;
  cariUnvan: string;
  tarih: string;
  birim: string;
  tipKodu: string;
  vade: string;
  referansNo: number;
  borc: number;
  alacak: number;
  bakiye: number;
  aciklama: string;
  stokKodu: string;
  stokCinsi: string;
  miktar: number;
  fiyat: number;
  iskonto1: number;
  iskonto2: number;
  iskonto3: number;
  netFiyat: number;
  evrakNo: string;
  baslangicTarih: string;
}

// ─── Kasa / Banka ────────────────────────────────────────────────────────────
export interface KasaKartBilgileri {
  kasaKodu: string;
  kasaAdi: string;
  TLTutar: number;
  USDTutar: number;
  EUROTutar: number;
}

export interface BankaKartBilgileri {
  bankaKodu: string;
  bankaAdi: string;
  TLTutar: number;
  USDTutar: number;
  EUROTutar: number;
}

// ─── Rapor PDF ────────────────────────────────────────────────────────────────
export interface RaporEvrak {
  dizaynAdi: string;
  evrakTipi: string;
  parametre1?: string;
  parametre2?: string;
  parametre3?: string;
  veriTabaniAdi?: string;
  telefonCihazKodu?: string;
}

export interface BekleyenEvrakKaydi extends SepetBaslik {
  id: string;
  tarih: string; // ISO date string
  genelToplam: number;
}

// ─── Onay Düzenleme (Evrak Detayı) ───────────────────────────────────────────
export interface OnayKurBilgileri {
  dovizKodu: string;
  dovizTuru: string;
  dovizKuru: number;
}

export interface OnayAdresBilgileri {
  adresNo: number;
  yetkili: string;
  adres1: string;
  adres2: string;
  il: string;
  ilce: string;
  telefon: string;
  email: string;
}

export interface OnayEvrakDetay {
  sbb: {
    guidID: string;
    cariKodu: string;
    cariUnvan: string;
    kdvDahilFlag: number; // 0=Hariç, 1=Dahil
    evrakEkrani: string;  // 'HIZLI' | 'ALSAT'
  };
  onaylamaDurumu: number;
  onaylayan: string;
  onaylamaNotu: string;
  toplam: number;
  indirimYuzde: number;
  indirim: number;
  kalemIndirimlerToplam: number;
  kdvToplam: number;
  genelToplam: number;
  dovizGenelToplam: number;
  kurBilgileri: OnayKurBilgileri;
  aciklama1: string;
  aciklama2: string;
  kdvListesi: string;
  abListe: OnayAdresBilgileri[];
}

// ─── Renk-Beden İşlemleri ────────────────────────────────────────────────────
export interface BarkodBilgileri {
  barkodID?: number;
  barkod: string;
  stokKodu: string;
  katsayi: number;
  birim: string;
  renkKodu: number;
  bedenKodu: number;
  renk: string;
  beden: string;
}

export interface SepetRBKalem {
  stokKodu: string;
  stokCinsi: string;
  barkod: string;
  birim: string;
  miktar: number;
  fiyat: number;
  kdvOrani: number;
  kalemIndirim1: number;
  kalemIndirim2: number;
  kalemIndirim3: number;
  renkKodu: number;
  bedenKodu: number;
  renk: string;
  beden: string;
  carpan: number;
  dovizKodu: string;
  dovizTuru: string;
  dovizKuru: number;
  fiyatNo: number;
  bakiye: number;
  guidID: string;
}

// ─── Sipariş Açma/Kapama ─────────────────────────────────────────────────────
export interface AcmaSiparisHareketBilgileri {
  tarih: string;
  cariKodu: string;
  stokKodu: string;
  stokCinsi: string;
  birim: string;
  miktar: number;
  carpan: number;
  tesMiktar: number;
  kalMiktar: number;
  fiyat: number;
  kdvOrani: number;
  takipNo: string;
  depo: string;
  sepetMiktar: number;
}

export interface KapatmaHareketBilgileri {
  birim: string;
  depoKodu: string;
  fiyat: number;
  kdvOrani: number;
  miktar: number;
  stokCinsi: string;
  stokKodu: string;
  takipNo: string;
}

export interface KapamaEvrak {
  guid: string;
  khbListe: KapatmaHareketBilgileri[];
  ckb: { cariKodu: string; cariUnvan: string };
  fisTipi: number;
  veriTabaniAdi?: string;
  telefonCihazKodu?: string;
}
