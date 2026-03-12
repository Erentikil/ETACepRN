import type { SepetBaslik, CariKartBilgileri } from '../models';

export type RootStackParamList = {
  Login: undefined;
  Drawer: undefined;
  Ayarlar: { fromLogin?: boolean };
  CariSecim: undefined;
  SepetListesi: { sepet: SepetBaslik };
};

export type DrawerParamList = {
  AnaSayfa: undefined;
  HizliIslemler: { secilenCari?: CariKartBilgileri } | undefined;
  AlisSatisIslemleri: undefined;
  RenkBedenIslemleri: undefined;
  SiparisKapama: undefined;
  Tahsilatlar: undefined;
  Raporlar: undefined;
  BekleyenEvraklar: undefined;
  ZiyaretIslemleri: undefined;
  OnayIslemleri: undefined;
  KurBilgileri: undefined;
  DosyaIslemleri: undefined;
  Dizayn: undefined;
  Ayarlar: undefined;
  Panel: undefined;
};
