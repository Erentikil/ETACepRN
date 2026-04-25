export type FontBoyutu = 'varsayilan' | 'orta' | 'buyuk';

export const FONT_OLCEKLERI: Record<FontBoyutu, number> = {
  varsayilan: 1.0,
  orta: 1.12,
  buyuk: 1.22,
};

export const FONT_BOYUTU_ETIKETLERI: Record<FontBoyutu, string> = {
  varsayilan: 'Varsayılan',
  orta: 'Orta',
  buyuk: 'Büyük',
};

let aktifOlcek = 1.0;

export function getAktifFontOlcek(): number {
  return aktifOlcek;
}

export function setAktifFontOlcek(boyut: FontBoyutu) {
  aktifOlcek = FONT_OLCEKLERI[boyut] ?? 1.0;
}
