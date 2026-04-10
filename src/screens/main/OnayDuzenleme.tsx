import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/Colors';
import { paraFormat, paraTL, kurFormat } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import { toast } from '../../components/Toast';
import { onayEvraginiAl, onaylamaDurumunuGuncelle } from '../../api/onayApi';
import type { OnayEvrakDetay } from '../../models';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = StackScreenProps<RootStackParamList, 'OnayDuzenleme'>;


function tarihFormat(tarih: string): string {
  try {
    const d = new Date(tarih);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return tarih;
  }
}

export default function OnayDuzenleme({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { item } = route.params;
  const { calisilanSirket, yetkiBilgileri } = useAppStore();

  const [evrak, setEvrak] = useState<OnayEvrakDetay | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islem, setIslem] = useState(false);
  const [not, setNot] = useState(item.not || '');

  const [evrakAcik, setEvrakAcik] = useState(true);
  const [adresAcik, setAdresAcik] = useState(false);

  useEffect(() => {
    evrakiYukle();
  }, []);

  async function evrakiYukle() {
    setYukleniyor(true);
    try {
      const sonuc = await onayEvraginiAl(item.guidId, calisilanSirket);
      if (sonuc.sonuc) {
        setEvrak(sonuc.data);
        setNot(sonuc.data.onaylamaNotu || item.not || '');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Bağlantı hatası.');
    } finally {
      setYukleniyor(false);
    }
  }

  async function durumGuncelle(durum: number, onayNotu: string) {
    setIslem(true);
    try {
      const sonuc = await onaylamaDurumunuGuncelle(
        item.guidId,
        durum,
        yetkiBilgileri?.kullaniciKodu ?? '',
        onayNotu,
        calisilanSirket
      );
      if (sonuc.sonuc) {
        Alert.alert(
          durum === 2 ? 'Onaylandı' : 'Reddedildi',
          durum === 2 ? 'Evrak başarıyla onaylandı.' : 'Evrak reddedildi.',
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
      } else {
        toast.error(sonuc.mesaj || 'İşlem gerçekleştirilemedi.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Bağlantı hatası.');
    } finally {
      setIslem(false);
    }
  }

  function onaylaIste() {
    Alert.alert(
      'Evrakı Onayla',
      `"${item.cariUnvani}" için ${item.evrakTipi} evrakı onaylanacak. Emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Onayla', onPress: () => durumGuncelle(2, not) },
      ]
    );
  }

  function reddetIste() {
    Alert.alert(
      'Evrakı Reddet',
      `"${item.cariUnvani}" için ${item.evrakTipi} evrakı reddedilecek. Emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Reddet', style: 'destructive', onPress: () => durumGuncelle(4, not) },
      ]
    );
  }

  if (yukleniyor) {
    return (
      <View style={styles.merkezle}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.yukleniyorMetin}>Evrak yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.ekran}>
      <ScrollView contentContainerStyle={styles.icerik}>

        {/* ─── Evrak Özeti Expander ─────────────────────────────────── */}
        <TouchableOpacity
          style={styles.expanderBaslik}
          onPress={() => setEvrakAcik((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.expanderBaslikMetin}>{item.cariUnvani}</Text>
          <Ionicons
            name={evrakAcik ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.primary}
          />
        </TouchableOpacity>

        {evrakAcik && (
          <View style={styles.expanderIcerik}>
            {/* Evrak / Fiş Tipi */}
            <View style={styles.satirIkili}>
              <View style={styles.satirSol}>
                <Text style={styles.etiket}>Evrak</Text>
                <Text style={styles.deger}>{item.evrakTipi}</Text>
              </View>
              <View style={styles.satirSag}>
                <Text style={styles.etiket}>Fiş Tipi</Text>
                <Text style={styles.deger}>{item.fisTipi}</Text>
              </View>
            </View>

            {/* Kullanıcı / Şirket */}
            <View style={styles.satirIkili}>
              <View style={styles.satirSol}>
                <Text style={styles.etiket}>Kullanıcı</Text>
                <Text style={styles.deger}>{item.kullaniciKodu}</Text>
              </View>
              <View style={styles.satirSag}>
                <Text style={styles.etiket}>Şirket</Text>
                <Text style={styles.deger}>{item.sirketAdi || '—'}</Text>
              </View>
            </View>

            {/* Tarih / Durum */}
            <View style={styles.satirIkili}>
              <View style={styles.satirSol}>
                <Text style={styles.etiket}>Tarih</Text>
                <Text style={styles.deger}>{tarihFormat(item.tarih)}</Text>
              </View>
              <View style={styles.satirSag}>
                <Text style={styles.etiket}>Durum</Text>
                <Text style={[styles.deger, { color: '#e65100' }]}>{item.durum}</Text>
              </View>
            </View>

            {evrak && (
              <>
                {/* KDV */}
                <View style={styles.satirIkili}>
                  <View style={styles.satirSol}>
                    <Text style={styles.etiket}>KDV</Text>
                    <Text style={styles.deger}>{evrak.kdvListesi || '—'}</Text>
                  </View>
                  <View style={styles.satirSag}>
                    <Text style={styles.etiket}>KDV</Text>
                    <Text style={styles.deger}>
                      {evrak.sbb?.kdvDahilFlag === 1 ? 'Dahil' : 'Hariç'}
                    </Text>
                  </View>
                </View>

                <View style={styles.ayrac} />

                {/* Finansal özet */}
                <View style={styles.finansalSatir}>
                  <Text style={styles.finansalEtiket}>Mal Toplam</Text>
                  <Text style={styles.finansalDeger}>{paraFormat(evrak.toplam)}</Text>
                </View>
                {evrak.indirim > 0 && (
                  <View style={styles.finansalSatir}>
                    <Text style={styles.finansalEtiket}>
                      İndirim ({paraFormat(evrak.indirimYuzde)}%)
                    </Text>
                    <Text style={[styles.finansalDeger, { color: Colors.error }]}>
                      -{paraFormat(evrak.indirim)}
                    </Text>
                  </View>
                )}
                {evrak.kalemIndirimlerToplam > 0 && (
                  <View style={styles.finansalSatir}>
                    <Text style={styles.finansalEtiket}>Kalem İndirim</Text>
                    <Text style={[styles.finansalDeger, { color: Colors.error }]}>
                      -{paraFormat(evrak.kalemIndirimlerToplam)}
                    </Text>
                  </View>
                )}
                <View style={styles.finansalSatir}>
                  <Text style={styles.finansalEtiket}>KDV Toplam</Text>
                  <Text style={styles.finansalDeger}>{paraFormat(evrak.kdvToplam)}</Text>
                </View>
                <View style={[styles.finansalSatir, styles.genelToplamSatir]}>
                  <Text style={styles.genelToplamEtiket}>Genel Toplam</Text>
                  <Text style={styles.genelToplamDeger}>{paraFormat(evrak.genelToplam)}</Text>
                </View>

                {/* Döviz */}
                {evrak.kurBilgileri?.dovizKodu && evrak.kurBilgileri.dovizKodu !== 'TL' && (
                  <>
                    <View style={styles.ayrac} />
                    <View style={styles.satirIkili}>
                      <View style={styles.satirSol}>
                        <Text style={styles.etiket}>Döviz Kodu</Text>
                        <Text style={[styles.deger, { color: Colors.error }]}>
                          {evrak.kurBilgileri.dovizKodu}
                        </Text>
                      </View>
                      <View style={styles.satirSag}>
                        <Text style={styles.etiket}>Döviz Türü</Text>
                        <Text style={styles.deger}>{evrak.kurBilgileri.dovizTuru}</Text>
                      </View>
                    </View>
                    <View style={styles.satirIkili}>
                      <View style={styles.satirSol}>
                        <Text style={styles.etiket}>Döviz Kuru</Text>
                        <Text style={[styles.deger, { color: Colors.primary }]}>
                          {kurFormat(evrak.kurBilgileri.dovizKuru)}
                        </Text>
                      </View>
                      <View style={styles.satirSag}>
                        <Text style={styles.etiket}>Döviz Toplam</Text>
                        <Text style={[styles.deger, { color: Colors.primary }]}>
                          {paraTL(evrak.dovizGenelToplam)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Açıklamalar */}
                {(evrak.aciklama1 || evrak.aciklama2) && (
                  <>
                    <View style={styles.ayrac} />
                    {evrak.aciklama1 ? (
                      <View style={styles.finansalSatir}>
                        <Text style={styles.finansalEtiket}>Açıklama 1</Text>
                        <Text style={[styles.finansalDeger, { flex: 2 }]}>
                          {evrak.aciklama1}
                        </Text>
                      </View>
                    ) : null}
                    {evrak.aciklama2 ? (
                      <View style={styles.finansalSatir}>
                        <Text style={styles.finansalEtiket}>Açıklama 2</Text>
                        <Text style={[styles.finansalDeger, { flex: 2 }]}>
                          {evrak.aciklama2}
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* ─── Adresler Expander ────────────────────────────────────── */}
        {evrak && evrak.abListe && evrak.abListe.length > 0 && (
          <>
            <TouchableOpacity
              style={[styles.expanderBaslik, { marginTop: 10 }]}
              onPress={() => setAdresAcik((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.expanderBaslikMetin}>Adresler</Text>
              <Ionicons
                name={adresAcik ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.primary}
              />
            </TouchableOpacity>

            {adresAcik && (
              <View style={styles.expanderIcerik}>
                {evrak.abListe.map((adres, idx) => (
                  <View key={idx} style={[styles.adresKart, idx > 0 && { marginTop: 8 }]}>
                    <View style={styles.satirIkili}>
                      <View style={styles.satirSol}>
                        <Text style={styles.etiket}>Adres No</Text>
                        <Text style={styles.deger}>{adres.adresNo}</Text>
                      </View>
                      <View style={styles.satirSag}>
                        <Text style={styles.etiket}>Yetkili</Text>
                        <Text style={styles.deger}>{adres.yetkili || '—'}</Text>
                      </View>
                    </View>
                    {adres.adres1 ? (
                      <View style={styles.finansalSatir}>
                        <Text style={styles.finansalEtiket}>Adres 1</Text>
                        <Text style={[styles.finansalDeger, { flex: 2 }]}>{adres.adres1}</Text>
                      </View>
                    ) : null}
                    {adres.adres2 ? (
                      <View style={styles.finansalSatir}>
                        <Text style={styles.finansalEtiket}>Adres 2</Text>
                        <Text style={[styles.finansalDeger, { flex: 2 }]}>{adres.adres2}</Text>
                      </View>
                    ) : null}
                    {(adres.il || adres.ilce) ? (
                      <View style={styles.satirIkili}>
                        <View style={styles.satirSol}>
                          <Text style={styles.etiket}>İl</Text>
                          <Text style={styles.deger}>{adres.il || '—'}</Text>
                        </View>
                        <View style={styles.satirSag}>
                          <Text style={styles.etiket}>İlçe</Text>
                          <Text style={styles.deger}>{adres.ilce || '—'}</Text>
                        </View>
                      </View>
                    ) : null}
                    {adres.telefon ? (
                      <View style={styles.finansalSatir}>
                        <Text style={styles.finansalEtiket}>Telefon</Text>
                        <Text style={[styles.finansalDeger, { flex: 2 }]}>{adres.telefon}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ─── Onaylama Notu ────────────────────────────────────────── */}
        <View style={[styles.expanderIcerik, { marginTop: 10 }]}>
          <Text style={[styles.etiket, { marginBottom: 6 }]}>Onay Notu</Text>
          <TextInput
            style={styles.notInput}
            value={not}
            onChangeText={setNot}
            multiline
            numberOfLines={3}
            placeholder="Onay notu giriniz..."
            placeholderTextColor={Colors.gray}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* ─── Onayla / Reddet Butonları ───────────────────────────────── */}
      <View style={[styles.butonBar, { paddingBottom: 12 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.buton, styles.onaylaBtn, islem && styles.butonDevre]}
          onPress={onaylaIste}
          disabled={islem}
        >
          {islem ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
              <Text style={styles.butonMetin}>Onayla</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buton, styles.reddetBtn, islem && styles.butonDevre]}
          onPress={reddetIste}
          disabled={islem}
        >
          {islem ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={18} color={Colors.white} />
              <Text style={styles.butonMetin}>Reddet</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: Colors.lightGray },

  merkezle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  yukleniyorMetin: { fontSize: 14, color: Colors.gray },

  icerik: { padding: 12, paddingBottom: 24 },

  // Expander
  expanderBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eeeeee',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  expanderBaslikMetin: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  expanderIcerik: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    marginTop: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Satır düzeni
  satirIkili: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  satirSol: { flex: 1 },
  satirSag: { flex: 1 },
  etiket: {
    fontSize: 11,
    color: Colors.gray,
    fontWeight: '600',
    marginBottom: 2,
  },
  deger: {
    fontSize: 13,
    color: Colors.darkGray,
    fontWeight: '500',
  },

  ayrac: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },

  // Finansal satırlar
  finansalSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  finansalEtiket: { flex: 1, fontSize: 13, color: Colors.gray },
  finansalDeger: {
    flex: 1,
    fontSize: 13,
    color: Colors.darkGray,
    textAlign: 'right',
    fontWeight: '500',
  },
  genelToplamSatir: {
    backgroundColor: '#e8eaf6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
  },
  genelToplamEtiket: { flex: 1, fontSize: 14, fontWeight: 'bold', color: Colors.primary },
  genelToplamDeger: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'right',
  },

  // Adres kartı
  adresKart: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },

  // Not input
  notInput: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: Colors.black,
    minHeight: 80,
  },

  // Butonlar
  butonBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  buton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    gap: 6,
  },
  onaylaBtn: { backgroundColor: Colors.success },
  reddetBtn: { backgroundColor: Colors.error },
  butonDevre: { opacity: 0.6 },
  butonMetin: { color: Colors.white, fontWeight: 'bold', fontSize: 15 },
});
