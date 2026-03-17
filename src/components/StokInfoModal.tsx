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
import { stokEkBilgileriAl } from '../api/hizliIslemlerApi';
import type { StokKartEkBilgileri } from '../models';
import { Colors } from '../constants/Colors';
import { paraFormat, miktarFormat } from '../utils/format';

interface Props {
  stokKodu: string | null;
  stokCinsi: string;
  veriTabaniAdi: string;
  onClose: () => void;
}

export default function StokInfoModal({ stokKodu, stokCinsi, veriTabaniAdi, onClose }: Props) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [bilgi, setBilgi] = useState<StokKartEkBilgileri | null>(null);
  const [hata, setHata] = useState<string | null>(null);

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
            </ScrollView>
          ) : null}
        </View>
      </View>
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
  stokKodu: { fontSize: 12, color: Colors.gray, fontWeight: '600', letterSpacing: 1 },
  stokCinsi: { fontSize: 17, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  kapatBtn: { padding: 4 },
  merkezle: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  yukleniyorText: { fontSize: 14, color: Colors.gray },
  hataText: { fontSize: 14, color: Colors.error, textAlign: 'center' },
  bolumBaslik: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.darkGray,
    marginBottom: 6,
    marginTop: 4,
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
    paddingVertical: 10,
  },
  satirAyrac: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  etiket: { fontSize: 14, color: Colors.darkGray },
  depoKodu: { fontSize: 11, color: Colors.gray, marginTop: 2 },
  deger: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
