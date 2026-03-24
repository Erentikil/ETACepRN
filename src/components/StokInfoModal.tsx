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
import { Colors } from '../constants/Colors';
import { paraFormat, miktarFormat } from '../utils/format';

interface Props {
  stokKodu: string | null;
  stokCinsi: string;
  veriTabaniAdi: string;
  cariKodu?: string;
  onClose: () => void;
}

export default function StokInfoModal({ stokKodu, stokCinsi, veriTabaniAdi, cariKodu, onClose }: Props) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [bilgi, setBilgi] = useState<StokKartEkBilgileri | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  // Son satış fiyatları
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
          setHata(sonuc.mesaj || 'Bilgi alınamadı.');
        }
      })
      .catch(() => setHata('Bağlantı hatası.'))
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
        setFiyatHata(sonuc.mesaj || 'Fiyat bilgisi alınamadı.');
      }
    } catch {
      setFiyatHata('Bağlantı hatası.');
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
        <View style={styles.kart}>
          {/* Başlık */}
          <View style={styles.baslik}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stokKodu}>{stokKodu}</Text>
              <Text style={styles.stokCinsi} numberOfLines={2}>{stokCinsi}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.kapatBtn}>
              <Ionicons name="close" size={24} color={Colors.darkGray} />
            </TouchableOpacity>
          </View>

          {yukleniyor ? (
            <View style={styles.merkezle}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.yukleniyorText}>Bilgiler yükleniyor...</Text>
            </View>
          ) : hata ? (
            <View style={styles.merkezle}>
              <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
              <Text style={styles.hataText}>{hata}</Text>
            </View>
          ) : bilgi ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Genel Bakiye */}
              <Text style={styles.bolumBaslik}>Bakiye Bilgileri</Text>
              <View style={styles.bilgiKart}>
                <SatirItem etiket="Bakiye" deger={bilgi.skbb.bakiye} />
                <SatirItem etiket="Muhtemel Bakiye" deger={bilgi.skbb.muhtemelBakiye} />
                <SatirItem etiket="Rezerv Giriş" deger={bilgi.skbb.rezervGiris} />
                <SatirItem etiket="Rezerv Çıkış" deger={bilgi.skbb.rezervCikis} />
                {bilgi.skbb.ozkod1 ? <SatirItem etiket="Öz Kod 1" deger={bilgi.skbb.ozkod1} metin /> : null}
                {bilgi.skbb.ozkod2 ? <SatirItem etiket="Öz Kod 2" deger={bilgi.skbb.ozkod2} metin /> : null}
                {bilgi.skbb.ozkod3 ? <SatirItem etiket="Öz Kod 3" deger={bilgi.skbb.ozkod3} metin /> : null}
                {bilgi.skbb.ozkod4 ? <SatirItem etiket="Öz Kod 4" deger={bilgi.skbb.ozkod4} metin /> : null}
                {bilgi.skbb.ozkod5 ? <SatirItem etiket="Öz Kod 5" deger={bilgi.skbb.ozkod5} metin /> : null}
              </View>

              {/* Depo Bazlı Bakiyeler */}
              {bilgi.skdbbListe.length > 0 && (
                <>
                  <Text style={styles.bolumBaslik}>Depo Bakiyeleri</Text>
                  <View style={styles.bilgiKart}>
                    {bilgi.skdbbListe.map((d, i) => (
                      <View key={i} style={[styles.satir, i < bilgi.skdbbListe.length - 1 && styles.satirAyrac]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.etiket}>{d.depoAdi || d.depoKodu}</Text>
                          {d.depoAdi ? <Text style={styles.depoKodu}>{d.depoKodu}</Text> : null}
                        </View>
                        <Text style={styles.deger}>{miktarFormat(d.depoBakiye)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Son Satış Fiyatları Butonu */}
              {cariKodu ? (
                <TouchableOpacity style={styles.fiyatBtn} onPress={fiyatlariGetir}>
                  <Ionicons name="pricetag-outline" size={20} color={Colors.white} />
                  <Text style={styles.fiyatBtnText}>Son Satış Fiyatları</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>

      {/* Son Satış Fiyatları Modal */}
      <Modal visible={fiyatModalAcik} animationType="slide" transparent onRequestClose={() => setFiyatModalAcik(false)}>
        <View style={styles.overlay}>
          <View style={styles.kart}>
            <View style={styles.baslik}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stokCinsi}>Son Satış Fiyatları</Text>
                <Text style={styles.depoKodu}>{stokCinsi}</Text>
              </View>
              <TouchableOpacity onPress={() => setFiyatModalAcik(false)} style={styles.kapatBtn}>
                <Ionicons name="close" size={24} color={Colors.darkGray} />
              </TouchableOpacity>
            </View>

            {fiyatYukleniyor ? (
              <View style={styles.merkezle}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.yukleniyorText}>Fiyatlar yükleniyor...</Text>
              </View>
            ) : fiyatHata ? (
              <View style={styles.merkezle}>
                <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
                <Text style={styles.hataText}>{fiyatHata}</Text>
              </View>
            ) : fiyatListesi.length === 0 ? (
              <View style={styles.merkezle}>
                <Ionicons name="pricetags-outline" size={40} color={Colors.gray} />
                <Text style={styles.yukleniyorText}>Son satış fiyatı bulunamadı.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {fiyatListesi.map((f, i) => (
                  <View key={i} style={[styles.fiyatSatir, i < fiyatListesi.length - 1 && styles.satirAyrac]}>
                    <View style={styles.fiyatUst}>
                      <Text style={styles.fiyatTarih}>{tarihFormat(f.tarih)}</Text>
                      <Text style={styles.fiyatDeger}>{paraFormat(f.fiyat)}</Text>
                    </View>
                    <View style={styles.fiyatAlt}>
                      <Text style={styles.fiyatDetay}>Miktar: {miktarFormat(f.miktar)}</Text>
                      {(f.indirimYuzde1 > 0 || f.indirimYuzde2 > 0 || f.indirimYuzde3 > 0) && (
                        <Text style={styles.fiyatDetay}>
                          İsk: %{f.indirimYuzde1}{f.indirimYuzde2 > 0 ? ` + %${f.indirimYuzde2}` : ''}{f.indirimYuzde3 > 0 ? ` + %${f.indirimYuzde3}` : ''}
                        </Text>
                      )}
                      {f.dovizKodu ? (
                        <Text style={styles.fiyatDetay}>
                          {f.dovizKodu}: {paraFormat(f.dovizFiyat)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
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
}: {
  etiket: string;
  deger: number | string;
  metin?: boolean;
}) {
  return (
    <View style={[styles.satir, styles.satirAyrac]}>
      <Text style={styles.etiket}>{etiket}</Text>
      <Text style={styles.deger}>
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
    backgroundColor: Colors.white,
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
  stokKodu: { fontSize: 16, color: Colors.gray, fontWeight: '600', letterSpacing: 1 },
  stokCinsi: { fontSize: 22, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  kapatBtn: { padding: 4 },
  merkezle: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  yukleniyorText: { fontSize: 17, color: Colors.gray },
  hataText: { fontSize: 17, color: Colors.error, textAlign: 'center' },
  bolumBaslik: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkGray,
    marginBottom: 8,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  bilgiKart: {
    backgroundColor: Colors.inputBackground ?? '#f5f5f5',
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
  satirAyrac: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  etiket: { fontSize: 18, color: Colors.darkGray },
  depoKodu: { fontSize: 15, color: Colors.gray, marginTop: 2 },
  deger: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  fiyatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 8,
  },
  fiyatBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  fiyatSatir: {
    backgroundColor: Colors.inputBackground ?? '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 2,
  },
  fiyatUst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fiyatTarih: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  fiyatDeger: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  fiyatAlt: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  fiyatDetay: {
    fontSize: 14,
    color: Colors.gray,
  },
});
