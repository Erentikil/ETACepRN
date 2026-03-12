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
  faturaSatis: number;
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
  kdvKisimID?: number;
  kdvKodu: number;
  kdvOrani: number;
  kdvAdi: string;
}

export interface KDVBilgileri {
  kdvListesi: KDVKisimTablosu[];
}

// ─── Fiş Tipleri ─────────────────────────────────────────────────────────────
export interface FisTipiBaslik {
  baslikID?: number;
  fisTipiBaslikNo: number;
  fisTipiBaslikAdi: string;
  alimSatim: number;
  evrakTipi: number;
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

export interface SepetBaslik {
  cariKodu: string;
  cariUnvan: string;
  evrakTipi: EvrakTipi;
  alimSatim: AlimSatim;
  fisTipiBaslikNo: number;
  fisTipiAdi: string;
  kalemler: SepetKalem[];
}
