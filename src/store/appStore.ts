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
  versiyon: VersiyonBilgileri | null;
  calisilanSirket: string;

  // Uygulama verileri
  kdvBilgileri: KDVBilgileri | null;
  ftBaslikListesi: FisTipiBaslik[];
  fiyatTipListesi: FiyatTipiBilgileri[];

  // Tablo çekme durumları
  stokDurumu: TabloCekmeDurumu;
  fiyatDurumu: TabloCekmeDurumu;
  barkodDurumu: TabloCekmeDurumu;

  // Actions
  setOnLineCalisma: (val: boolean) => void;
  setYetkiBilgileri: (val: YetkiBilgileri) => void;
  setMenuYetkiBilgileri: (val: MenuYetkiBilgileri) => void;
  setKameraYetkiBilgileri: (val: KameraYetkiBilgileri) => void;
  setSirketBilgileri: (val: SirketBilgileri) => void;
  setVersiyon: (val: VersiyonBilgileri) => void;
  setCalisilanSirket: (val: string) => void;
  setKdvBilgileri: (val: KDVBilgileri) => void;
  setFtBaslikListesi: (val: FisTipiBaslik[]) => void;
  setFiyatTipListesi: (val: FiyatTipiBilgileri[]) => void;
  setStokDurumu: (val: TabloCekmeDurumu) => void;
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
    }),
}));
