import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { depoKartlariniAl } from '../api/hizliIslemlerApi';
import { useAppStore } from '../store/appStore';
import type { FisTipiItem, DepoKarti } from '../models';
import { useColors } from '../contexts/ThemeContext';
import DropdownSecim from './DropdownSecim';

export interface FisTipiDepoSecimSonuc {
  fisTipiKodu: number;
  fisTipiAdi: string;
  anaDepo: string;
  karsiDepo: string;
}

interface Props {
  visible: boolean;
  evrakLabel: string;       // "Fatura Satis"
  evrakTipiStr: string;     // "Fatura" | "Irsaliye" | "Siparis" | "Stok"
  alimSatimStr: string;     // "Alis" | "Satis" | "Sayim"
  veriTabaniAdi: string;
  defaultAnaDepo: string;
  defaultKarsiDepo: string;
  fisTipiReadOnly?: boolean;
  depoReadOnly?: boolean;
  onConfirm: (sonuc: FisTipiDepoSecimSonuc) => void;
  onClose: () => void;
}

export default function FisTipiDepoSecimModal({
  visible,
  evrakLabel,
  evrakTipiStr,
  alimSatimStr,
  veriTabaniAdi,
  defaultAnaDepo,
  defaultKarsiDepo,
  fisTipiReadOnly = false,
  depoReadOnly = false,
  onConfirm,
  onClose,
}: Props) {
  const Colors = useColors();
  const { ftBaslikListesi } = useAppStore();

  const [yukleniyor, setYukleniyor] = useState(false);
  const [fisTipleri, setFisTipleri] = useState<FisTipiItem[]>([]);
  const [depolar, setDepolar] = useState<DepoKarti[]>([]);
  // Dropdown icin string value'lar
  const [seciliFisTipiKodu, setSeciliFisTipiKodu] = useState('');
  const [secilenAnaDepo, setSecilenAnaDepo] = useState(defaultAnaDepo);
  const [secilenKarsiDepo, setSecilenKarsiDepo] = useState(defaultKarsiDepo);

  useEffect(() => {
    if (!visible) return;
    setSeciliFisTipiKodu('');
    setSecilenAnaDepo(defaultAnaDepo);
    setSecilenKarsiDepo(defaultKarsiDepo);

    // Fis tiplerini store'dan al (Login'de override uygulanmis)
    const grup = ftBaslikListesi.find(
      (g) => g.evrakTipi === evrakTipiStr && g.alimSatim === alimSatimStr
    );
    const liste = grup?.ftListe ?? [];
    setFisTipleri(liste);
    const varsayilan = grup?.ft ?? liste[0];
    if (varsayilan) setSeciliFisTipiKodu(String(varsayilan.fisTipiKodu));

    // Depolari API'den al
    yukleDepolar();
  }, [visible]);

  const yukleDepolar = async () => {
    setYukleniyor(true);
    try {
      const depoSonuc = await depoKartlariniAl(veriTabaniAdi);
      if (depoSonuc.sonuc && depoSonuc.data) {
        const dkListe = depoSonuc.data.dkListe ?? [];
        setDepolar(dkListe);
        if (!defaultAnaDepo && depoSonuc.data.anaDepoKodu?.depoKod) {
          setSecilenAnaDepo(depoSonuc.data.anaDepoKodu.depoKod);
        }
        if (!defaultKarsiDepo && depoSonuc.data.karsiDepoKodu?.depoKod) {
          setSecilenKarsiDepo(depoSonuc.data.karsiDepoKodu.depoKod);
        }
      }
    } catch {
      // Hata durumunda varsayilan degerlerle devam edilir
    } finally {
      setYukleniyor(false);
    }
  };

  const handleConfirm = () => {
    const seciliFisTipi = fisTipleri.find((ft) => String(ft.fisTipiKodu) === seciliFisTipiKodu);
    onConfirm({
      fisTipiKodu: seciliFisTipi?.fisTipiKodu ?? 0,
      fisTipiAdi: seciliFisTipi?.fisTipiAdi ?? evrakLabel,
      anaDepo: secilenAnaDepo,
      karsiDepo: secilenKarsiDepo,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.kart, { backgroundColor: Colors.card }]}>
          {/* Baslik */}
          <View style={styles.baslik}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.baslikUst, { color: Colors.textSecondary }]}>Evrak Ayarlari</Text>
              <Text style={[styles.baslikAlt, { color: Colors.primary }]}>{evrakLabel}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.kapatBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {yukleniyor ? (
            <View style={styles.yukleniyorKap}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={[styles.yukleniyorText, { color: Colors.textSecondary }]}>Yukleniyor...</Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Fis Tipi */}
              {fisTipleri.length > 0 && (
                <View style={[styles.satirGrup, fisTipiReadOnly && styles.readOnlyGrup]}>
                  <Text style={[styles.bolumBaslik, { color: Colors.textSecondary }]}>FIS TIPI</Text>
                  {fisTipiReadOnly ? (
                    <View style={[styles.readOnlyDeger, { borderColor: Colors.border, backgroundColor: Colors.inputBackground }]}>
                      <Text style={[styles.readOnlyText, { color: Colors.textSecondary }]}>
                        {fisTipleri.find((ft) => String(ft.fisTipiKodu) === seciliFisTipiKodu)
                          ? `${seciliFisTipiKodu} - ${fisTipleri.find((ft) => String(ft.fisTipiKodu) === seciliFisTipiKodu)!.fisTipiAdi}`
                          : 'Fis tipi secilmedi'}
                      </Text>
                    </View>
                  ) : (
                    <DropdownSecim
                      value={seciliFisTipiKodu}
                      options={fisTipleri.map((ft) => ({
                        label: `${ft.fisTipiKodu} - ${ft.fisTipiAdi}`,
                        value: String(ft.fisTipiKodu),
                      }))}
                      placeholder="Fis tipi seciniz..."
                      onChange={setSeciliFisTipiKodu}
                    />
                  )}
                </View>
              )}

              {/* Ana Depo */}
              {depolar.length > 0 && (
                <View style={[styles.satirGrup, depoReadOnly && styles.readOnlyGrup]}>
                  <Text style={[styles.bolumBaslik, { color: Colors.textSecondary }]}>ANA DEPO</Text>
                  {depoReadOnly ? (
                    <View style={[styles.readOnlyDeger, { borderColor: Colors.border, backgroundColor: Colors.inputBackground }]}>
                      <Text style={[styles.readOnlyText, { color: Colors.textSecondary }]}>
                        {depolar.find((d) => d.depoKod === secilenAnaDepo)
                          ? `${depolar.find((d) => d.depoKod === secilenAnaDepo)!.depoAdi || ''} (${secilenAnaDepo})`
                          : secilenAnaDepo || 'Depo secilmedi'}
                      </Text>
                    </View>
                  ) : (
                    <DropdownSecim
                      value={secilenAnaDepo}
                      options={depolar.map((d) => ({
                        label: d.depoAdi ? `${d.depoAdi} (${d.depoKod})` : d.depoKod,
                        value: d.depoKod,
                      }))}
                      placeholder="Depo seciniz..."
                      onChange={setSecilenAnaDepo}
                    />
                  )}
                </View>
              )}

              {/* Karsi Depo -- secili fis tipinin fisTipiOzelligi "Depo" ise goster */}
              {depolar.length > 0 && evrakTipiStr === 'Stok' &&
                fisTipleri.find((ft) => String(ft.fisTipiKodu) === seciliFisTipiKodu)?.fisTipiOzelligi === 'Depo' && (
                <View style={[styles.satirGrup, depoReadOnly && styles.readOnlyGrup]}>
                  <Text style={[styles.bolumBaslik, { color: Colors.textSecondary }]}>KARSI DEPO</Text>
                  {depoReadOnly ? (
                    <View style={[styles.readOnlyDeger, { borderColor: Colors.border, backgroundColor: Colors.inputBackground }]}>
                      <Text style={[styles.readOnlyText, { color: Colors.textSecondary }]}>
                        {depolar.find((d) => d.depoKod === secilenKarsiDepo)
                          ? `${depolar.find((d) => d.depoKod === secilenKarsiDepo)!.depoAdi || ''} (${secilenKarsiDepo})`
                          : secilenKarsiDepo || 'Depo secilmedi'}
                      </Text>
                    </View>
                  ) : (
                    <DropdownSecim
                      value={secilenKarsiDepo}
                      options={depolar.map((d) => ({
                        label: d.depoAdi ? `${d.depoAdi} (${d.depoKod})` : d.depoKod,
                        value: d.depoKod,
                      }))}
                      placeholder="Depo seciniz..."
                      onChange={setSecilenKarsiDepo}
                    />
                  )}
                </View>
              )}

              <View style={{ height: 8 }} />
            </ScrollView>
          )}

          <TouchableOpacity style={[styles.onaylaBtn, { backgroundColor: Colors.primary }]} onPress={handleConfirm} disabled={yukleniyor}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.onaylaBtnText}>ONAYLA</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  kart: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  baslik: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  baslikUst: { fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  baslikAlt: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  kapatBtn: { padding: 4 },
  yukleniyorKap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  yukleniyorText: { fontSize: 14 },
  satirGrup: {
    marginBottom: 16,
  },
  bolumBaslik: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  readOnlyGrup: {
    opacity: 0.6,
  },
  readOnlyDeger: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  readOnlyText: {
    fontSize: 14,
  },
  onaylaBtn: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  onaylaBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
