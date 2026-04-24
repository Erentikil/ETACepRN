import { create } from 'zustand';
import type { SepetAyarlari } from '../utils/sepetHesap';

// Sepet butonu (parent) ile sepet içi toplamın senkron olması için paylaşılan state.
// Navigation params/callback dansı yerine tek bir kaynak kullanıyoruz.
type SepetAyarlariStore = {
  ayarlar: SepetAyarlari;
  setAyarlar: (yeni: SepetAyarlari) => void;
  updateAyarlar: (partial: Partial<SepetAyarlari>) => void;
  resetAyarlar: (defaults: SepetAyarlari) => void;
};

const DEFAULT_AYARLAR: SepetAyarlari = {
  genelIndirimYuzde: 0,
  genelIndirimTutar: 0,
  kdvDurum: 0,
  secilenKdvOrani: 0,
};

export const useSepetAyarlariStore = create<SepetAyarlariStore>((set) => ({
  ayarlar: DEFAULT_AYARLAR,
  setAyarlar: (yeni) => set({ ayarlar: yeni }),
  updateAyarlar: (partial) =>
    set((state) => ({ ayarlar: { ...state.ayarlar, ...partial } })),
  resetAyarlar: (defaults) => set({ ayarlar: defaults }),
}));
