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
  fiyatGor: boolean;
  crm: boolean;
  evrakDuzenle: boolean;
  barkodEkle: boolean;
  kontrolPanel: boolean;
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

// ─── Stok Fiyat Bilgileri (fiyat tipi bazlı) ─────────────────────────────────
export interface StokFiyatBilgileri {
  stokFiyatID?: number;
  stokKodu: string;
  fiyatNo: number;
  fiyatAdi: string;
  tutar: number;
  dovizKodu: string;
  dovizTuru: string;
  kalemIndirim1: number;
  kalemIndirim2: number;
  kalemIndirim3: number;
}

// ─── Cari Fiyat Bilgileri (Cari Fiyat Listesi) ──────────────────────────────
export interface CariFiyatBilgileri {
  fiyatKodu: string;
  stokKodu: string;
  stokTipi: number;
  fiyatNo: string;
  tutar: number;
  dovizKodu: string;
  dovizTuru: string;
  kalemIndirim1: number;
  kalemIndirim2: number;
  kalemIndirim3: number;
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
  birim: string;
  fiyat: number;
  fiyatNo: number;
  dovizKodu: string;
  dovizTuru: string;
  barkod: string;
  carpan: number;
  kdvOrani: number;
  bakiye: number;
  kalemIndirim1: number;
  kalemIndirim2: number;
  kalemIndirim3: number;
  birim2: string;
  carpan2: string;
  renkKodu: number;
  bedenKodu: number;
  renk: string;
  beden: string;
  digerBirimler: string[];
  digerCarpanlar: number[];
  digerMiktarlar: number[];
  birimNo: number[];
  miktar: number;
  seciliFiyatNo: number;
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

// ─── Kasa Tahsilat ───────────────────────────────────────────────────────────
export interface KasaTahsilatBilgileri {
  kasaKodu: string;
  kasaAdi: string;
  vadeTarih: string;
  cariKodu: string;
  cariUnvan: string;
  evrakNo: string;
  aciklama: string;
  islemTipi: number;
  tutar: number;
}

export interface KasaTahsilatEvrak {
  guid: string;
  ktb: KasaTahsilatBilgileri;
  veriTabaniAdi?: string;
  telefonCihazKodu?: string;
  kullaniciKodu: string;
}

// ─── Çek / Senet Tahsilat ────────────────────────────────────────────────────
export interface CekSenetTahsilatBilgileri {
  cariKodu: string;
  cariUnvani: string;
  vadeTarihi: string;
  aciklama: string;
  aciklama1: string;
  aciklama2: string;
  evrakNo: string;
  tutar: number;
  asilBorclu: string;
  kendiCeki: boolean;
  banka: string;
  sube: string;
  cekNo: string;
  hesapNo: string;
  kesideYeri: string;
  tarih: string;
  duzenlemeAdresi: string;
  duzenlemeIl: string;
  duzenlemeIlce: string;
}

export interface CekSenetEvrak {
  guid: string;
  ctb: CekSenetTahsilatBilgileri;
  veriTabaniAdi?: string;
  telefonCihazKodu?: string;
  kullaniciKodu: string;
  evrakTipi: string;
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
  aciklama?: string;
  // Modal'da birim/fiyat tipi seçimi korumak için
  birim2?: string;
  carpan?: number;
  carpan2?: string;
  seciliFiyatNo?: number;
  crmKalemId?: number;
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

// ─── Son Satış Fiyat Bilgileri ─────────────────────────────────────────────────
export interface SonSatisFiyatBilgileri {
  stokKodu: string;
  tarih: string;
  fiyat: number;
  miktar: number;
  dovizFiyat: number;
  dovizKodu: string;
  dovizTuru: string;
  indirimYuzde1: number;
  indirimYuzde2: number;
  indirimYuzde3: number;
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
  onayDurumu?: number;
  onaylamaDurumu?: number;
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

// ─── Kur Bilgileri ───────────────────────────────────────────────────────────
export interface KurBilgileri {
  kurID: number;
  dovizKodu: string;
  dovizTuru: string;
  dovizKuru: number;
}

export interface BekleyenEvrakKaydi extends SepetBaslik {
  id: string;
  tarih: string; // ISO date string
  genelToplam: number;
  onayGuidId?: string; // Onaydan sepete dönüşümde eski guidId
  onayDurumu?: number; // Onay durumu (1=Onaylandı, 3=Güncelle, 4=İptal)
  genelIndirimYuzde?: number;
  genelIndirimTutar?: number;
  aciklama1?: string;
  aciklama2?: string;
}

// ─── Sunucu Sepet Modelleri (C# alan adlarıyla birebir) ──────────────────────
export interface SepetBaslikBilgileri {
  sbbID?: number;
  tarih: string;
  referansNo: number;
  belgeTipiIndex: number;
  evrakTipi: number;
  alimSatim: number;
  alimSatimDurumu: string;
  evrakEkrani: string;
  cariKodu: string;
  cariUnvan: string;
  anaDepoKodu: string;
  karsiDepoKodu: string;
  guidID: string;
  indirimOran: number;
  indirimTutar: number;
  fisTipi: number;
  fisTipAciklama: string;
  saticiKodu: string;
  genelKDVNo: number;
  genelKDV: number;
  eevrak: string;
  dovizKodu: string;
  dovizTuru: string;
  dovizKuru: number;
  aciklama1: string;
  aciklama2: string;
  genelToplam: number;
  evrakKayitNedeni: string;
  kullaniciKodu: string;
  adresNo: number;
  kdvDahilFlag: number;
}

export interface SepetNormalBilgileri {
  sepetID?: number;
  guidID: string;
  stokKodu: string;
  barkod: string;
  stokCinsi: string;
  birim: string;
  fiyatNo: number;
  fiyat: number;
  dovizKodu: string;
  dovizTuru: string;
  dovizKuru: number;
  miktar: number;
  bakiye: number;
  kalemIndirim1: number;
  kalemIndirim2: number;
  kalemIndirim3: number;
  kdvOrani: number;
  aciklama?: string;
  digerBirimler?: string[];
  digerCarpanlar?: number[];
  digerMiktarlar?: number[];
}

export interface SepetRBBilgileri {
  sepetID?: number;
  guidID: string;
  stokKodu: string;
  barkod: string;
  stokCinsi: string;
  birim: string;
  fiyatNo: number;
  fiyat: number;
  dovizKodu: string;
  dovizTuru: string;
  dovizKuru: number;
  miktar: number;
  bakiye: number;
  kalemIndirim1: number;
  kalemIndirim2: number;
  kalemIndirim3: number;
  kdvOrani: number;
  renkKodu: number;
  bedenKodu: number;
  digerBirimler?: string[];
  digerCarpanlar?: number[];
  digerMiktarlar?: number[];
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
  sbb: SepetBaslikBilgileri;
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
  snbListe?: SepetNormalBilgileri[];
  sRBbListe?: SepetRBBilgileri[];
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

// ─── Cari Kart Kaydet ────────────────────────────────────────────────────────
export interface CariEvrak {
  cariKodu: string;
  cariUnvan: string;
  yetkili: string;
  tcKimlikNo: string;
  vergiDairesi: string;
  vergiNumarasi: string;
  adres1: string;
  adres2: string;
  adres3: string;
  ilce: string;
  il: string;
  ulke: string;
  eposta1: string;
  postaKodu: string;
  telefon1: string;
  kullaniciKodu: string;
  veriTabaniAdi?: string;
  telefonCihazKodu?: string;
}

// ─── Sipariş Açma/Kapama ─────────────────────────────────────────────────────
export interface AcmaSiparisFisBilgileri {
  refno: number;
  tarih: string;
  cariKodu: string;
  evrakNo: string;
  genelToplam: number;
}

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

// ─── CRM Müşteri & Teklif ──────────────────────────────────────────────────
export interface CRMMusteriBilgileri {
  id: number;
  durum: number;
  musterikodu: string;
  musteriunvani: string;
  yetkili1: string;
  yetkili2: string;
  adres1: string;
  adres2: string;
  notlar: string;
  tipi: string;
  email1: string;
  email2: string;
  vergidairesi: string;
  vergino: string;
  tckimlikno: string;
  aciklama1: string;
  aciklama2: string;
  aciklama3: string;
  aciklama4: string;
  aciklama5: string;
  adres3: string;
  ilce: string;
  il: string;
  ulke: string;
  telefon: string;
  mobiltelefon: string;
  fax: string;
  ozelkod1: string;
  ozelkod2: string;
  ozelkod3: string;
  ozelkod4: string;
  ozelkod5: string;
}

export interface CRMMusteriEvrak {
  telefonCihazKodu: string;
  veriTabaniAdi: string;
  CRM_mb: CRMMusteriBilgileri;
}

export interface CRMTeklifFisBilgileri {
  id: number;
  musteriid: number;
  kdvdahilflag: number;
  etadurum: number;
  etaislflag: number;
  tarih?: string;
  gecerliliktarihi?: string;
  etatarih?: string;
  kdvyuzde: number;
  dovizkuru: number;
  maltoplam: number;
  kalemindirimtoplam: number;
  indirimyuzde1: number;
  indirimtutar1: number;
  indirimyuzde2: number;
  indirimtutar2: number;
  matrah: number;
  kdvtutar: number;
  geneltoplam: number;
  musterikodu: string;
  musteriadi: string;
  yetkili: string;
  teklifno?: string;
  teklifdurumu?: string;
  aciklama1: string;
  dovizturu: string;
  hazirlayan: string;
  etasirketadi: string;
  ilce: string;
  ulke: string;
  mail: string;
  telefon: string;
  notlar: string;
  not1: string;
  not2: string;
  not3: string;
  not4: string;
  not5: string;
  not6: string;
  dovizkodu: string;
  aciklama2: string;
  aciklama3: string;
  adres1: string;
  adres2: string;
  adres3: string;
  il: string;
  vergidairesi: string;
  vergino: string;
  tckimlikno: string;
  evrakDosyaYolu: string;
  teklifRevizyonNo: string;
  teklifSonRevizyonu: number;
  olusturmazamani?: string;
  guncellemezamani?: string;
  silmezamani?: string;
  odemesekli: string;
}

export interface CRMTeklifHareketBilgileri {
  id: number;
  tekliffisid: number;
  musteriid: number;
  kodtipi: number;
  tarih?: string;
  dovizkuru: number;
  fiyat: number;
  miktar: number;
  kdvyuzde: number;
  kalemindirimyuzde1: number;
  kalemindirimtutar1: number;
  kalemindirimyuzde2: number;
  kalemindirimtutar2: number;
  barkod: string;
  stokkodu: string;
  stokcinsi: string;
  birim: string;
  depo: string;
  aciklama1: string;
  aciklama2: string;
  aciklama3: string;
  dovizkodu: string;
  dovizturu: string;
  miktar2: number;
  birim2: string;
}

export interface CRMTeklifEvrak {
  telefonCihazKodu: string;
  veriTabaniAdi: string;
  CRM_tfb: CRMTeklifFisBilgileri;
  CRM_thbListe: CRMTeklifHareketBilgileri[];
}
