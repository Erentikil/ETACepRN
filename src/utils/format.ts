/**
 * Sayı formatlama — Intl.NumberFormat ile cihazın bölgesel ayarına göre
 * Türkiye'de: 1.234,56 ₺  |  diğer bölgelerde: 1,234.56 ₺
 */

const TR_LOCALE = 'tr-TR';

/** Para birimi: 2 ondalık, binler ayraçlı (örn. 1.234,56) */
export function paraFormat(sayi: number, ondalik = 2): string {
  return new Intl.NumberFormat(TR_LOCALE, {
    minimumFractionDigits: ondalik,
    maximumFractionDigits: ondalik,
  }).format(sayi);
}

/** Para birimi + sembol (örn. 1.234,56 ₺) */
export function paraTL(sayi: number, ondalik = 2): string {
  return `${paraFormat(sayi, ondalik)} ₺`;
}

/** Miktar: gereksiz sıfırları atar (örn. 1,5 veya 10) */
export function miktarFormat(sayi: number, maxOndalik = 3): string {
  return new Intl.NumberFormat(TR_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxOndalik,
  }).format(sayi);
}

/** Kur: 5 ondalık (örn. 32,12345) */
export function kurFormat(sayi: number): string {
  return new Intl.NumberFormat(TR_LOCALE, {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format(sayi);
}
