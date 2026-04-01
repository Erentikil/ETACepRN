import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useAppStore } from '../../../store/appStore';
import { aktifSepetKaydet, aktifSepetTemizle, aktifSepetAl } from '../../../utils/aktifSepetStorage';
import { useColors } from '../../../contexts/ThemeContext';
import type { CariKartBilgileri, CariEvrak, SepetKalem } from '../../../models';
import { EvrakTipi, AlimSatim } from '../../../models';
import TeklifTab from './TeklifTab';
import RevizyonTab from './RevizyonTab';

const CRM_PREFIX = 'CRM_';

export default function CRMTeklif() {
  const Colors = useColors();
  const { calisilanSirket } = useAppStore();

  const [aktifTab, setAktifTab] = useState<'teklif' | 'revizyon'>('teklif');
  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [potansiyelCari, setPotansiyelCari] = useState<CariEvrak | null>(null);
  const [sepetKalemleri, setSepetKalemleri] = useState<SepetKalem[]>([]);
  const [revizyonFisId, setRevizyonFisId] = useState<number | null>(null);
  const [revizyonMusteriId, setRevizyonMusteriId] = useState<number>(0);

  // Sepet yukleme (CRM prefix ile)
  const sepetYuklendi = useRef(false);
  useEffect(() => {
    if (sepetYuklendi.current) return;
    aktifSepetAl(calisilanSirket, CRM_PREFIX).then((sepet) => {
      sepetYuklendi.current = true;
      if (!sepet || sepet.kalemler.length === 0) return;
      if (sepet.cariKodu) {
        setSecilenCari({ cariKodu: sepet.cariKodu, cariUnvan: sepet.cariUnvan });
      }
      setSepetKalemleri(sepet.kalemler);
    });
  }, []);

  // Sepet degistikce AsyncStorage'a kaydet (CRM prefix ile)
  const sirketRef = useRef(calisilanSirket);
  useEffect(() => { sirketRef.current = calisilanSirket; }, [calisilanSirket]);
  useEffect(() => {
    const sirket = sirketRef.current;
    if (!sirket) return;
    // Revizyondan gelen sepeti persist etme
    if (revizyonFisId) return;
    if (sepetKalemleri.length === 0) {
      aktifSepetTemizle(sirket, CRM_PREFIX);
      return;
    }
    aktifSepetKaydet({
      cariKodu: secilenCari?.cariKodu ?? '',
      cariUnvan: secilenCari?.cariUnvan ?? '',
      evrakTipi: EvrakTipi.Fatura,
      alimSatim: AlimSatim.Satim,
      fisTipiBaslikNo: 0,
      fisTipiAdi: 'CRM Teklif',
      kalemler: sepetKalemleri,
    }, sirket, CRM_PREFIX);
  }, [sepetKalemleri, secilenCari, revizyonFisId]);

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      {/* Ust sekmeler */}
      <View style={[styles.tabBar, { backgroundColor: Colors.primary }]}>
        <TouchableOpacity
          style={[styles.tabBtn, aktifTab === 'teklif' && styles.tabBtnAktif]}
          onPress={() => setAktifTab('teklif')}
        >
          <Text style={[styles.tabText, aktifTab === 'teklif' && styles.tabTextAktif]}>Teklif</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, aktifTab === 'revizyon' && styles.tabBtnAktif]}
          onPress={() => setAktifTab('revizyon')}
        >
          <Text style={[styles.tabText, aktifTab === 'revizyon' && styles.tabTextAktif]}>Revizyon</Text>
        </TouchableOpacity>
      </View>

      {aktifTab === 'teklif' ? (
        <TeklifTab
          secilenCari={secilenCari}
          setSecilenCari={setSecilenCari}
          potansiyelCari={potansiyelCari}
          setPotansiyelCari={setPotansiyelCari}
          sepetKalemleri={sepetKalemleri}
          setSepetKalemleri={setSepetKalemleri}
          revizyonFisId={revizyonFisId}
          setRevizyonFisId={setRevizyonFisId}
          revizyonMusteriId={revizyonMusteriId}
          setRevizyonMusteriId={setRevizyonMusteriId}
        />
      ) : (
        <RevizyonTab
          onTeklifSec={(fis, kalemler) => {
            setSecilenCari({ cariKodu: fis.musterikodu, cariUnvan: fis.musteriadi } as CariKartBilgileri);
            setSepetKalemleri(kalemler);
            setRevizyonFisId(fis.id);
            setRevizyonMusteriId(fis.musteriid);
            setAktifTab('teklif');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnAktif: {
    borderBottomColor: '#fff',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  tabTextAktif: {
    color: '#fff',
    fontWeight: '700',
  },
});
