import { create } from 'zustand';
import type {
  YetkiBilgileri,
  MenuYetkiBilgileri,
  KameraYetkiBilgileri,
  SirketBilgileri,
  VersiyonBilgileri,
  KDVBilgileri,
  FisTipiBaslik,
  FiyatTipiBilgileri,
  TabloCekmeDurumu,
  KameraBarkodTipi,
  KameraBarkodOkuma,
  StokListesiBilgileri,
  CariKartBilgileri,
} from '../models';
import { TabloCekmeDurumu as TCD, KameraBarkodTipi as KBT, KameraBarkodOkuma as KBO } from '../models';

interface AppState {
  // Çalışma modu
  onLineCalisma: boolean;
  senkronCalisma: boolean;

  // Kullanıcı bilgileri
  yetkiBilgileri: YetkiBilgileri | null;
  menuYetkiBilgileri: MenuYetkiBilgileri | null;
  kameraYetkiBilgileri: KameraYetkiBilgileri;

  // Şirket & versiyon
  sirketBilgileri: SirketBilgileri | null;
  versiyon: number | null;
  calisilanSirket: string;

  // Uygulama verileri
  kdvBilgileri: KDVBilgileri | null;
  ftBaslikListesi: FisTipiBaslik[];
  fiyatTipListesi: FiyatTipiBilgileri[];

  // Tablo çekme durumları
  stokDurumu: TabloCekmeDurumu;
  fiyatDurumu: TabloCekmeDurumu;
  barkodDurumu: TabloCekmeDurumu;

  // Stok listesi cache (HizliIslemler & RenkBedenIslemleri ortak)
  stokListesiCache: StokListesiBilgileri[];
  stokListesiCacheSirket: string;

  // Cari seçim (ekranlar arası iletişim)
  pendingCari: { cari: CariKartBilgileri; target: string } | null;

  // Actions
  setOnLineCalisma: (val: boolean) => void;
  setYetkiBilgileri: (val: YetkiBilgileri) => void;
  setMenuYetkiBilgileri: (val: MenuYetkiBilgileri) => void;
  setKameraYetkiBilgileri: (val: KameraYetkiBilgileri) => void;
  setSirketBilgileri: (val: SirketBilgileri) => void;
  setVersiyon: (val: number) => void;
  setCalisilanSirket: (val: string) => void;
  setKdvBilgileri: (val: KDVBilgileri) => void;
  setFtBaslikListesi: (val: FisTipiBaslik[]) => void;
  setFiyatTipListesi: (val: FiyatTipiBilgileri[]) => void;
  setStokDurumu: (val: TabloCekmeDurumu) => void;
  setStokListesiCache: (data: StokListesiBilgileri[], sirket: string) => void;
  setPendingCari: (cari: CariKartBilgileri, target: string) => void;
  clearPendingCari: () => void;
  cikisYap: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  onLineCalisma: true,
  senkronCalisma: false,
  yetkiBilgileri: null,
  menuYetkiBilgileri: null,
  kameraYetkiBilgileri: {
    kameraOkuma: KBO.Otomatik,
    kameraBarkod: KBT.Google,
  },
  sirketBilgileri: null,
  versiyon: null,
  calisilanSirket: '',
  kdvBilgileri: null,
  ftBaslikListesi: [],
  fiyatTipListesi: [],
  stokDurumu: TCD.Cekilmedi,
  fiyatDurumu: TCD.Cekilmedi,
  barkodDurumu: TCD.Cekilmedi,

  stokListesiCache: [],
  stokListesiCacheSirket: '',

  pendingCari: null,
  setPendingCari: (cari, target) => set({ pendingCari: { cari, target } }),
  clearPendingCari: () => set({ pendingCari: null }),

  setOnLineCalisma: (val) => set({ onLineCalisma: val }),
  setYetkiBilgileri: (val) => set({ yetkiBilgileri: val }),
  setMenuYetkiBilgileri: (val) => set({ menuYetkiBilgileri: val }),
  setKameraYetkiBilgileri: (val) => set({ kameraYetkiBilgileri: val }),
  setSirketBilgileri: (val) => set({ sirketBilgileri: val }),
  setVersiyon: (val) => set({ versiyon: val }),
  setCalisilanSirket: (val) => set({ calisilanSirket: val }),
  setKdvBilgileri: (val) => set({ kdvBilgileri: val }),
  setFtBaslikListesi: (val) => set({ ftBaslikListesi: val }),
  setFiyatTipListesi: (val) => set({ fiyatTipListesi: val }),
  setStokDurumu: (val) => set({ stokDurumu: val }),
  setStokListesiCache: (data, sirket) => set({ stokListesiCache: data, stokListesiCacheSirket: sirket }),
  cikisYap: () =>
    set({
      yetkiBilgileri: null,
      menuYetkiBilgileri: null,
      sirketBilgileri: null,
      versiyon: null,
      calisilanSirket: '',
      kdvBilgileri: null,
      ftBaslikListesi: [],
      fiyatTipListesi: [],
      stokListesiCache: [],
      stokListesiCacheSirket: '',
    }),
}));
