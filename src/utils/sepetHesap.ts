import type { SepetKalem, SepetRBKalem } from '../models';

export type SepetAyarlari = {
  genelIndirimYuzde: number;
  genelIndirimTutar: number;
  kdvDurum: number;       // 0=Hariç, 1=Dahil, -1=Yok
  secilenKdvOrani: number; // kdvOrani === -1 olan kalemler için uygulanacak oran
};

export type SepetHesapSonucu = {
  malToplam: number;
  kalemIndirimlerToplam: number;
  genelIndirimTutar: number;
  kdvToplam: number;
  genelToplam: number;
  toplamMiktar: number;
};

type MinKalem = {
  miktar: number;
  birimFiyat: number;
  kdvOrani: number;
  kalemIndirim1: number;
  kalemIndirim2: number;
  kalemIndirim3: number;
};

function rbToMin(k: SepetRBKalem): MinKalem {
  return {
    miktar: k.miktar,
    birimFiyat: k.fiyat,
    kdvOrani: k.kdvOrani,
    kalemIndirim1: k.kalemIndirim1,
    kalemIndirim2: k.kalemIndirim2,
    kalemIndirim3: k.kalemIndirim3,
  };
}

export function sepetToplamlariniHesapla(
  kalemler: SepetKalem[] | MinKalem[],
  ayarlar: SepetAyarlari
): SepetHesapSonucu {
  const { genelIndirimYuzde, genelIndirimTutar: genelIndirimTutarDeger, kdvDurum, secilenKdvOrani } = ayarlar;

  let malToplam = 0;
  let kalemIndirimlerToplam = 0;
  let kdvToplam = 0;

  const indirimYuzdeOrani = genelIndirimTutarDeger > 0 ? 0 : genelIndirimYuzde;

  for (const k of kalemler as MinKalem[]) {
    const ham = k.miktar * k.birimFiyat;
    malToplam += ham;

    const netKalem =
      ham *
      (1 - k.kalemIndirim1 / 100) *
      (1 - k.kalemIndirim2 / 100) *
      (1 - k.kalemIndirim3 / 100);
    kalemIndirimlerToplam += ham - netKalem;

    const efektifKdvOrani = k.kdvOrani === -1 ? secilenKdvOrani : Math.max(0, k.kdvOrani);
    const netAfterGenel = netKalem * (1 - indirimYuzdeOrani / 100);
    kdvToplam += netAfterGenel * (efektifKdvOrani / 100);
  }

  const kalemSonrasiNet = malToplam - kalemIndirimlerToplam;
  const genelIndirimTutar = genelIndirimTutarDeger > 0
    ? genelIndirimTutarDeger
    : kalemSonrasiNet * genelIndirimYuzde / 100;

  const genelToplam =
    kdvDurum === 1
      ? malToplam - kalemIndirimlerToplam - genelIndirimTutar
      : malToplam - kalemIndirimlerToplam - genelIndirimTutar + kdvToplam;

  const toplamMiktar = (kalemler as MinKalem[]).reduce((t, k) => t + k.miktar, 0);

  return { malToplam, kalemIndirimlerToplam, genelIndirimTutar, kdvToplam, genelToplam, toplamMiktar };
}

export function sepetToplamlariniHesaplaRB(
  kalemler: SepetRBKalem[],
  ayarlar: SepetAyarlari
): SepetHesapSonucu {
  return sepetToplamlariniHesapla(kalemler.map(rbToMin), ayarlar);
}
