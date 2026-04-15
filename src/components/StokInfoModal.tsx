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
import { stokEkBilgileriAl, sonSatisFiyatlariniAl } from '../api/hizliIslemlerApi';
import type { StokKartEkBilgileri, SonSatisFiyatBilgileri } from '../models';
import { useColors } from '../contexts/ThemeContext';
import { paraFormat, miktarFormat } from '../utils/format';

interface Props {
  stokKodu: string | null;
  stokCinsi: string;
  veriTabaniAdi: string;
  cariKodu?: string;
  onClose: () => void;
}

export default function StokInfoModal({ stokKodu, stokCinsi, veriTabaniAdi, cariKodu, onClose }: Props) {
  const Colors = useColors();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [bilgi, setBilgi] = useState<StokKartEkBilgileri | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  // Son satis fiyatlari
  const [fiyatModalAcik, setFiyatModalAcik] = useState(false);
  const [fiyatYukleniyor, setFiyatYukleniyor] = useState(false);
  const [fiyatListesi, setFiyatListesi] = useState<SonSatisFiyatBilgileri[]>([]);
  const [fiyatHata, setFiyatHata] = useState<string | null>(null);

  useEffect(() => {
    if (!stokKodu) return;
    setYukleniyor(true);
    setBilgi(null);
    setHata(null);
    stokEkBilgileriAl(stokKodu, veriTabaniAdi)
      .then((sonuc) => {
        if (sonuc.sonuc && sonuc.data) {
          setBilgi(sonuc.data);
        } else {
          setHata(sonuc.mesaj || 'Bilgi alinamadi.');
        }
      })
      .catch(() => setHata('Baglanti hatasi.'))
      .finally(() => setYukleniyor(false));
  }, [stokKodu]);

  const fiyatlariGetir = async () => {
    if (!stokKodu || !cariKodu) return;
    setFiyatModalAcik(true);
    setFiyatYukleniyor(true);
    setFiyatHata(null);
    setFiyatListesi([]);
    try {
      const sonuc = await sonSatisFiyatlariniAl(cariKodu, stokKodu, veriTabaniAdi);
      if (sonuc.sonuc && sonuc.data) {
        setFiyatListesi(sonuc.data);
      } else {
        setFiyatHata(sonuc.mesaj || 'Fiyat bilgisi alinamadi.');
      }
    } catch {
      setFiyatHata('Baglanti hatasi.');
    } finally {
      setFiyatYukleniyor(false);
    }
  };

  const tarihFormat = (tarihStr: string) => {
    const d = new Date(tarihStr);
    if (isNaN(d.getTime())) return tarihStr;
    return d.toLocaleDateString('tr-TR');
  };

  return (
    <Modal visible={!!stokKodu} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.kart, { backgroundColor: Colors.card }]}>
          {/* Baslik */}
          <View style={styles.baslik}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stokKodu, { color: Colors.textSecondary }]}>{stokKodu}</Text>
              <Text style={[styles.stokCinsi, { color: Colors.primary }]}>{stokCinsi}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.kapatBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {yukleniyor ? (
            <View style={styles.merkezle}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={[styles.yukleniyorText, { color: Colors.textSecondary }]}>Bilgiler yukleniyor...</Text>
            </View>
          ) : hata ? (
            <View style={styles.merkezle}>
              <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
              <Text style={[styles.hataText, { color: Colors.error }]}>{hata}</Text>
            </View>
          ) : bilgi ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Genel Bakiye */}
              <Text style={[styles.bolumBaslik, { color: Colors.text }]}>Bakiye Bilgileri</Text>
              <View style={[styles.bilgiKart, { backgroundColor: Colors.inputBackground }]}>
                <SatirItem etiket="Bakiye" deger={bilgi.skbb.bakiye} colors={Colors} />
                <SatirItem etiket="Muhtemel Bakiye" deger={bilgi.skbb.muhtemelBakiye} colors={Colors} />
                <SatirItem etiket="Rezerv Giris" deger={bilgi.skbb.rezervGiris} colors={Colors} />
                <SatirItem etiket="Rezerv Cikis" deger={bilgi.skbb.rezervCikis} colors={Colors} />
                {bilgi.skbb.ozkod1 ? <SatirItem etiket="Oz Kod 1" deger={bilgi.skbb.ozkod1} metin colors={Colors} /> : null}
                {bilgi.skbb.ozkod2 ? <SatirItem etiket="Oz Kod 2" deger={bilgi.skbb.ozkod2} metin colors={Colors} /> : null}
                {bilgi.skbb.ozkod3 ? <SatirItem etiket="Oz Kod 3" deger={bilgi.skbb.ozkod3} metin colors={Colors} /> : null}
                {bilgi.skbb.ozkod4 ? <SatirItem etiket="Oz Kod 4" deger={bilgi.skbb.ozkod4} metin colors={Colors} /> : null}
                {bilgi.skbb.ozkod5 ? <SatirItem etiket="Oz Kod 5" deger={bilgi.skbb.ozkod5} metin colors={Colors} /> : null}
              </View>

              {/* Depo Bazli Bakiyeler */}
              {bilgi.skdbbListe.length > 0 && (
                <>
                  <Text style={[styles.bolumBaslik, { color: Colors.text }]}>Depo Bakiyeleri</Text>
                  <View style={[styles.bilgiKart, { backgroundColor: Colors.inputBackground }]}>
                    {bilgi.skdbbListe.map((d, i) => (
                      <View key={i} style={[styles.satir, i < bilgi.skdbbListe.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.etiket, { color: Colors.text }]}>{d.depoAdi || d.depoKodu}</Text>
                          {d.depoAdi ? <Text style={[styles.depoKodu, { color: Colors.textSecondary }]}>{d.depoKodu}</Text> : null}
                        </View>
                        <Text style={[styles.deger, { color: Colors.primary }]}>{miktarFormat(d.depoBakiye)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

            </ScrollView>
          ) : null}
        </View>
      </View>

      {/* Son Satis Fiyatlari Modal */}
      <Modal visible={fiyatModalAcik} animationType="fade" transparent onRequestClose={() => setFiyatModalAcik(false)}>
        <View style={styles.fiyatOverlay}>
          <View style={[styles.fiyatKart, { backgroundColor: Colors.card }]}>
            <Text style={[styles.fiyatBaslikText, { color: Colors.text }]}>Son Satış Fiyatları</Text>
            <Text style={[styles.fiyatAltBaslik, { color: Colors.textSecondary }]} numberOfLines={1}>{stokCinsi}</Text>

            {fiyatYukleniyor ? (
              <View style={styles.fiyatMerkez}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : fiyatHata ? (
              <View style={styles.fiyatMerkez}>
                <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
                <Text style={[styles.fiyatMerkezText, { color: Colors.error }]}>{fiyatHata}</Text>
              </View>
            ) : fiyatListesi.length === 0 ? (
              <View style={styles.fiyatMerkez}>
                <Ionicons name="pricetags-outline" size={40} color={Colors.textSecondary} />
                <Text style={[styles.fiyatMerkezText, { color: Colors.textSecondary }]}>Son satış fiyatı bulunamadı.</Text>
              </View>
            ) : (
              <>
                <View style={[styles.fiyatKolonBaslik, { borderBottomColor: Colors.border }]}>
                  <Text style={[styles.fiyatKolonText, { color: Colors.primary }]}>Tarih</Text>
                  <Text style={[styles.fiyatKolonText, styles.fiyatMerkezHizala, { color: Colors.primary }]}>Miktar</Text>
                  <Text style={[styles.fiyatKolonText, styles.fiyatSagHizala, { color: Colors.primary }]}>Fiyat</Text>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.fiyatScrollView}>
                  {fiyatListesi.map((f, i) => (
                    <View key={i} style={[styles.fiyatSatir, { borderBottomColor: Colors.border }]}>
                      <Text style={[styles.fiyatTarih, { color: Colors.primary }]}>{tarihFormat(f.tarih)}</Text>
                      <Text style={[styles.fiyatMiktar, { color: Colors.primary }]}>{miktarFormat(f.miktar)}</Text>
                      <Text style={[styles.fiyatDeger, { color: Colors.primary }]}>{paraFormat(f.fiyat)}</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={[styles.fiyatVazgecBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setFiyatModalAcik(false)}
            >
              <Text style={styles.fiyatVazgecText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function SatirItem({
  etiket,
  deger,
  metin,
  colors,
}: {
  etiket: string;
  deger: number | string;
  metin?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.satir, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={[styles.etiket, { color: colors.text }]}>{etiket}</Text>
      <Text style={[styles.deger, { color: colors.primary }]}>
        {metin ? String(deger) : (typeof deger === 'number' ? paraFormat(deger) : deger)}
      </Text>
    </View>
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
    maxHeight: '75%',
  },
  baslik: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stokKodu: { fontSize: 16, fontWeight: '600', letterSpacing: 1 },
  stokCinsi: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  kapatBtn: { padding: 4 },
  merkezle: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  yukleniyorText: { fontSize: 17 },
  hataText: { fontSize: 17, textAlign: 'center' },
  bolumBaslik: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  bilgiKart: {
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  satir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  etiket: { fontSize: 18 },
  depoKodu: { fontSize: 15, marginTop: 2 },
  deger: { fontSize: 18, fontWeight: '700' },
  fiyatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fiyatKart: {
    borderRadius: 14,
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  fiyatBaslikText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  fiyatAltBaslik: {
    fontSize: 13,
    marginBottom: 16,
  },
  fiyatKolonBaslik: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 2,
  },
  fiyatKolonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  fiyatMerkezHizala: {
    textAlign: 'center',
  },
  fiyatSagHizala: {
    textAlign: 'right',
  },
  fiyatScrollView: {
    maxHeight: 300,
  },
  fiyatMerkez: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  fiyatMerkezText: {
    fontSize: 14,
    textAlign: 'center',
  },
  fiyatSatir: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fiyatTarih: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  fiyatMiktar: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  fiyatDeger: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  fiyatVazgecBtn: {
    marginTop: 16,
    marginHorizontal: -20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fiyatVazgecText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
