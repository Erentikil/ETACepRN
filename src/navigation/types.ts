import type { SepetBaslik, SepetKalem, CariKartBilgileri, OnayListesiBilgileri, BekleyenEvrakKaydi } from '../models';

export type RootStackParamList = {
  Login: undefined;
  Drawer: undefined;
  Ayarlar: { fromLogin?: boolean };
  CariSecim: { returnScreen?: keyof DrawerParamList } | undefined;
  SepetListesi: {
    sepet: SepetBaslik;
    onKalemlerGuncellendi?: (kalemler: SepetKalem[]) => void;
  };
  OnayDuzenleme: {
    item: OnayListesiBilgileri;
  };
};

export type DrawerParamList = {
  AnaSayfa: undefined;
  HizliIslemler: { secilenCari?: CariKartBilgileri; taslakEvrak?: BekleyenEvrakKaydi } | undefined;
  AlisSatisIslemleri: undefined;
  RenkBedenIslemleri: { secilenCari?: CariKartBilgileri } | undefined;
  SiparisKapama: { secilenCari?: CariKartBilgileri } | undefined;
  Tahsilatlar: { secilenCari?: CariKartBilgileri } | undefined;
  Raporlar: undefined;
  BekleyenEvraklar: undefined;
  CariEkstreListesi: { secilenCari?: CariKartBilgileri } | undefined;
  CekSenetListesi: undefined;
  StokluCariEkstreListesi: { secilenCari?: CariKartBilgileri } | undefined;
  BekleyenSiparisler: { secilenCari?: CariKartBilgileri } | undefined;
  ZiyaretIslemleri: undefined;
  OnayIslemleri: undefined;
  KurBilgileri: undefined;
  Panel: undefined;
  PDFRaporGoster: {
    dizaynAdi: string;
    evrakTipi: string;
    parametre1?: string;
    parametre2?: string;
    parametre3?: string;
    baslik?: string;
  } | undefined;
  KasaBakiye: undefined;
  BankaBakiye: undefined;
  CariBakiye: undefined;
  StokRapor: { mod: 'bakiye' | 'fiyat' } | undefined;
  CariSecimliRapor: {
    dizaynAdi: string;
    evrakTipi: string;
    baslik?: string;
  } | undefined;
};
