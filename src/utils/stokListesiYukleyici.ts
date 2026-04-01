import { stokBilgileriniSayfalamaIleAl, stokKartSayisiniBul } from '../api/hizliIslemlerApi';
import { useAppStore } from '../store/appStore';
import type { StokListesiBilgileri } from '../models';

const SAYFA_UZUNLUGU = 1000;

let _promise: Promise<StokListesiBilgileri[]> | null = null;
let _sirket = '';
let _progressListeners = new Set<(data: StokListesiBilgileri[], toplamSayisi: number | null) => void>();
let _currentPartial: StokListesiBilgileri[] = [];
let _toplamSayisi: number | null = null;

export async function stokListesiniGetir(
  calisilanSirket: string,
  onProgress?: (data: StokListesiBilgileri[], toplamSayisi: number | null) => void,
): Promise<StokListesiBilgileri[]> {
  // 1. Cache kontrol
  const { stokListesiCache, stokListesiCacheSirket } = useAppStore.getState();
  if (stokListesiCacheSirket === calisilanSirket && stokListesiCache.length > 0) {
    return stokListesiCache;
  }

  // 2. Listener kaydet
  if (onProgress) _progressListeners.add(onProgress);

  // 3. Zaten yükleniyorsa: mevcut partial'ı hemen gönder, sonra promise'i bekle
  if (_promise && _sirket === calisilanSirket) {
    if (onProgress && _currentPartial.length > 0) {
      onProgress(_currentPartial, _toplamSayisi);
    }
    try {
      return await _promise;
    } finally {
      if (onProgress) _progressListeners.delete(onProgress);
    }
  }

  // 4. Yeni yükleme başlat
  _sirket = calisilanSirket;
  _currentPartial = [];
  _toplamSayisi = null;

  _promise = (async () => {
    // Toplam stok sayısını paralel çek
    stokKartSayisiniBul(calisilanSirket)
      .then((s) => {
        if (s.sonuc) {
          _toplamSayisi = s.data;
          // Mevcut partial varsa hemen bildir
          if (_currentPartial.length > 0) {
            _progressListeners.forEach((cb) => cb(_currentPartial, _toplamSayisi));
          }
        }
      })
      .catch(() => {});

    let sayfa = 1;
    let tumVeri: StokListesiBilgileri[] = [];

    while (true) {
      const sonuc = await stokBilgileriniSayfalamaIleAl(sayfa, SAYFA_UZUNLUGU, calisilanSirket);
      if (sonuc.sonuc && sonuc.data && sonuc.data.length > 0) {
        tumVeri = [...tumVeri, ...sonuc.data];
        const sirali = tumVeri.sort((a, b) => a.stokKodu.localeCompare(b.stokKodu));
        _currentPartial = sirali;
        _progressListeners.forEach((cb) => cb(sirali, _toplamSayisi));
        if (sonuc.data.length < SAYFA_UZUNLUGU) break;
        sayfa++;
      } else {
        if (sayfa === 1) throw new Error(sonuc.mesaj || 'Stok listesi alınamadı.');
        break;
      }
    }

    const sirali = tumVeri.sort((a, b) => a.stokKodu.localeCompare(b.stokKodu));
    useAppStore.getState().setStokListesiCache(sirali, calisilanSirket);
    return sirali;
  })();

  _promise.finally(() => {
    if (_sirket === calisilanSirket) {
      _promise = null;
      _sirket = '';
      _currentPartial = [];
      _toplamSayisi = null;
      _progressListeners.clear();
    }
  });

  try {
    return await _promise;
  } finally {
    if (onProgress) _progressListeners.delete(onProgress);
  }
}
