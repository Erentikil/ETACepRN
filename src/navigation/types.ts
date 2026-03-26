import type { SepetBaslik, SepetKalem, SepetRBKalem, CariKartBilgileri, OnayListesiBilgileri, BekleyenEvrakKaydi } from '../models';

export type RootStackParamList = {
  Login: undefined;
  Drawer: undefined;
  Ayarlar: { fromLogin?: boolean };
  CariSecim: { returnScreen?: keyof DrawerParamList; sepetDolu?: boolean } | undefined;
  SepetListesi: {
    sepet: SepetBaslik;
    genelIndirimYuzde?: number;
    onKalemlerGuncellendi?: (kalemler: SepetKalem[]) => void;
    rbKalemler?: SepetRBKalem[];
    onRBKalemlerGuncellendi?: (kalemler: SepetRBKalem[]) => void;
  };
  OnayDuzenleme: {
    item: OnayListesiBilgileri;
  };
};

export type DrawerParamList = {
  AnaSayfa: undefined;
  HizliIslemler: { secilenCari?: CariKartBilgileri; taslakEvrak?: BekleyenEvrakKaydi } | undefined;
  HizliIslemlerV2: { secilenCari?: CariKartBilgileri; taslakEvrak?: BekleyenEvrakKaydi } | undefined;
  AlisSatisIslemleri: { secilenCari?: CariKartBilgileri; taslakEvrak?: BekleyenEvrakKaydi } | undefined;
  RenkBedenIslemleri: { secilenCari?: CariKartBilgileri } | undefined;
  SiparisKapama: { secilenCari?: CariKartBilgileri } | undefined;
  Tahsilatlar: { secilenCari?: CariKartBilgileri } | undefined;
  Raporlar: undefined;
  BekleyenEvraklar: undefined;
  CariEkstreListesi: { secilenCari?: CariKartBilgileri; kaynakEkran?: string } | undefined;
  CekSenetListesi: undefined;
  StokluCariEkstreListesi: { secilenCari?: CariKartBilgileri; kaynakEkran?: string } | undefined;
  BekleyenSiparisler: { secilenCari?: CariKartBilgileri; kaynakEkran?: string } | undefined;
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
  FiyatGor: undefined;
  BarkodEkleme: undefined;
  StokRapor: { mod: 'bakiye' | 'fiyat' } | undefined;
  CariSecimliRapor: {
    dizaynAdi: string;
    evrakTipi: string;
    baslik?: string;
  } | undefined;
};
