import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import Config from '../constants/Config';

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

  // Stok listesi cache (HizliIslemler & RenkBedenIslemleri ortak)
  stokListesiCache: StokListesiBilgileri[];
  stokListesiCacheSirket: string;

  // Cari seçim (ekranlar arası iletişim)
  pendingCari: { cari: CariKartBilgileri; target: string } | null;

  // Uyumluluk modu (Pro'ya özel) — V8: 3 kalem indirim, SQL: 5 kalem indirim
  uyumluluk: 'V8' | 'SQL';

  // Favoriler — şirket bazlı (her veritabanı için ayrı liste)
  favoriCariler: Record<string, string[]>;
  favoriStoklar: Record<string, string[]>;

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
  setStokListesiCache: (data: StokListesiBilgileri[], sirket: string) => void;
  setPendingCari: (cari: CariKartBilgileri, target: string) => void;
  clearPendingCari: () => void;
  setUyumluluk: (val: 'V8' | 'SQL') => void;
  toggleFavoriCari: (sirket: string, cariKodu: string) => void;
  toggleFavoriStok: (sirket: string, stokKodu: string) => void;
  setFavoriler: (
    favoriCariler: Record<string, string[]>,
    favoriStoklar: Record<string, string[]>
  ) => void;
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

  uyumluluk: 'SQL',
  setUyumluluk: (val) => set({ uyumluluk: val }),

  favoriCariler: {},
  favoriStoklar: {},
  setFavoriler: (favoriCariler, favoriStoklar) => set({ favoriCariler, favoriStoklar }),
  toggleFavoriCari: (sirket, cariKodu) => {
    if (!sirket || !cariKodu) return;
    set((state) => {
      const mevcut = state.favoriCariler[sirket] ?? [];
      const yeniListe = mevcut.includes(cariKodu)
        ? mevcut.filter((k) => k !== cariKodu)
        : [...mevcut, cariKodu];
      const guncel = { ...state.favoriCariler, [sirket]: yeniListe };
      AsyncStorage.setItem(Config.STORAGE_KEYS.FAVORI_CARILER, JSON.stringify(guncel)).catch(() => {});
      return { favoriCariler: guncel };
    });
  },
  toggleFavoriStok: (sirket, stokKodu) => {
    if (!sirket || !stokKodu) return;
    set((state) => {
      const mevcut = state.favoriStoklar[sirket] ?? [];
      const yeniListe = mevcut.includes(stokKodu)
        ? mevcut.filter((k) => k !== stokKodu)
        : [...mevcut, stokKodu];
      const guncel = { ...state.favoriStoklar, [sirket]: yeniListe };
      AsyncStorage.setItem(Config.STORAGE_KEYS.FAVORI_STOKLAR, JSON.stringify(guncel)).catch(() => {});
      return { favoriStoklar: guncel };
    });
  },

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
