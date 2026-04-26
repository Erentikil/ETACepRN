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
import { useT } from '../../i18n/I18nContext';
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
  const t = useT();
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
      toast.error(e?.message || t('common.baglantiHatasi'));
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
          durum === 2 ? t('onayDuzenleme.onaylandi') : t('onayDuzenleme.reddedildi'),
          durum === 2 ? t('onayDuzenleme.evrakOnaylandi') : t('onayDuzenleme.evrakReddedildi'),
          [{ text: t('onayDuzenleme.tamam'), onPress: () => navigation.goBack() }]
        );
      } else {
        toast.error(sonuc.mesaj || t('onayDuzenleme.islemBasarisiz'));
      }
    } catch (e: any) {
      toast.error(e?.message || t('common.baglantiHatasi'));
    } finally {
      setIslem(false);
    }
  }

  function onaylaIste() {
    Alert.alert(
      t('onayDuzenleme.evrakOnayla'),
      t('onayDuzenleme.evrakOnaylaMesaj', { ad: item.cariUnvani, tip: item.evrakTipi }),
      [
        { text: t('onayDuzenleme.vazgec'), style: 'cancel' },
        { text: t('onayDuzenleme.onayla'), onPress: () => durumGuncelle(2, not) },
      ]
    );
  }

  function reddetIste() {
    Alert.alert(
      t('onayDuzenleme.evrakReddet'),
      t('onayDuzenleme.evrakReddetMesaj', { ad: item.cariUnvani, tip: item.evrakTipi }),
      [
        { text: t('onayDuzenleme.vazgec'), style: 'cancel' },
        { text: t('onayDuzenleme.reddet'), style: 'destructive', onPress: () => durumGuncelle(4, not) },
      ]
    );
  }

  if (yukleniyor) {
    return (
      <View style={styles.merkezle}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.yukleniyorMetin}>{t('onayDuzenleme.evrakYukleniyor')}</Text>
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
                <Text style={styles.etiket}>{t('onayDuzenleme.evrak')}</Text>
                <Text style={styles.deger}>{item.evrakTipi}</Text>
              </View>
              <View style={styles.satirSag}>
                <Text style={styles.etiket}>{t('onayDuzenleme.fisTipi')}</Text>
                <Text style={styles.deger}>{item.fisTipi}</Text>
              </View>
            </View>

            {/* Kullanıcı / Şirket */}
            <View style={styles.satirIkili}>
              <View style={styles.satirSol}>
                <Text style={styles.etiket}>{t('onayDuzenleme.kullanici')}</Text>
                <Text style={styles.deger}>{item.kullaniciKodu}</Text>
              </View>
              <View style={styles.satirSag}>
                <Text style={styles.etiket}>{t('onayDuzenleme.sirket')}</Text>
                <Text style={styles.deger}>{item.sirketAdi || '—'}</Text>
              </View>
            </View>

            {/* Tarih / Durum */}
            <View style={styles.satirIkili}>
              <View style={styles.satirSol}>
                <Text style={styles.etiket}>{t('onayDuzenleme.tarih')}</Text>
                <Text style={styles.deger}>{tarihFormat(item.tarih)}</Text>
              </View>
              <View style={styles.satirSag}>
                <Text style={styles.etiket}>{t('onayDuzenleme.durum')}</Text>
                <Text style={[styles.deger, { color: '#e65100' }]}>{item.durum}</Text>
              </View>
            </View>

            {evrak && (
              <>
                {/* KDV */}
                <View style={styles.satirIkili}>
                  <View style={styles.satirSol}>
                    <Text style={styles.etiket}>{t('onayDuzenleme.kdv')}</Text>
                    <Text style={styles.deger}>{evrak.kdvListesi || '—'}</Text>
                  </View>
                  <View style={styles.satirSag}>
                    <Text style={styles.etiket}>{t('onayDuzenleme.kdv')}</Text>
                    <Text style={styles.deger}>
                      {evrak.sbb?.kdvDahilFlag === 1 ? t('onayDuzenleme.dahil') : t('onayDuzenleme.haric')}
                    </Text>
                  </View>
                </View>

                <View style={styles.ayrac} />

                {/* Finansal özet */}
                <View style={styles.finansalSatir}>
                  <Text style={styles.finansalEtiket}>{t('onayDuzenleme.malToplam')}</Text>
                  <Text style={styles.finansalDeger}>{paraFormat(evrak.toplam)}</Text>
                </View>
                {evrak.indirim > 0 && (
                  <View style={styles.finansalSatir}>
                    <Text style={styles.finansalEtiket}>
                      {t('onayDuzenleme.indirim')} ({paraFormat(evrak.indirimYuzde)}%)
                    </Text>
                    <Text style={[styles.finansalDeger, { color: Colors.error }]}>
                      -{paraFormat(evrak.indirim)}
                    </Text>
                  </View>
                )}
                {evrak.kalemIndirimlerToplam > 0 && (
                  <View style={styles.finansalSatir}>
                    <Text style={styles.finansalEtiket}>{t('onayDuzenleme.kalemIndirim')}</Text>
                    <Text style={[styles.finansalDeger, { color: Colors.error }]}>
                      -{paraFormat(evrak.kalemIndirimlerToplam)}
                    </Text>
                  </View>
                )}
                <View style={styles.finansalSatir}>
                  <Text style={styles.finansalEtiket}>{t('onayDuzenleme.kdvToplam')}</Text>
                  <Text style={styles.finansalDeger}>{paraFormat(evrak.kdvToplam)}</Text>
                </View>
                <View style={[styles.finansalSatir, styles.genelToplamSatir]}>
                  <Text style={styles.genelToplamEtiket}>{t('onayDuzenleme.genelToplam')}</Text>
                  <Text style={styles.genelToplamDeger}>{paraFormat(evrak.genelToplam)}</Text>
                </View>

                {/* Döviz */}
                {evrak.kurBilgileri?.dovizKodu && evrak.kurBilgileri.dovizKodu !== 'TL' && (
                  <>
                    <View style={styles.ayrac} />
                    <View style={styles.satirIkili}>
                      <View style={styles.satirSol}>
                        <Text style={styles.etiket}>{t('onayDuzenleme.dovizKodu')}</Text>
                        <Text style={[styles.deger, { color: Colors.error }]}>
                          {evrak.kurBilgileri.dovizKodu}
                        </Text>
                      </View>
                      <View style={styles.satirSag}>
                        <Text style={styles.etiket}>{t('onayDuzenleme.dovizTuru')}</Text>
                        <Text style={styles.deger}>{evrak.kurBilgileri.dovizTuru}</Text>
                      </View>
                    </View>
                    <View style={styles.satirIkili}>
                      <View style={styles.satirSol}>
                        <Text style={styles.etiket}>{t('onayDuzenleme.dovizKuru')}</Text>
                        <Text style={[styles.deger, { color: Colors.primary }]}>
                          {kurFormat(evrak.kurBilgileri.dovizKuru)}
                        </Text>
                      </View>
                      <View style={styles.satirSag}>
                        <Text style={styles.etiket}>{t('onayDuzenleme.dovizToplam')}</Text>
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
                        <Text style={styles.finansalEtiket}>{t('onayDuzenleme.aciklama1')}</Text>
                        <Text style={[styles.finansalDeger, { flex: 2 }]}>
                          {evrak.aciklama1}
                        </Text>
                      </View>
                    ) : null}
                    {evrak.aciklama2 ? (
                      <View style={styles.finansalSatir}>
                        <Text style={styles.finansalEtiket}>{t('onayDuzenleme.aciklama2')}</Text>
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
              <Text style={styles.expanderBaslikMetin}>{t('onayDuzenleme.adresler')}</Text>
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
                        <Text style={styles.etiket}>{t('onayDuzenleme.adresNo')}</Text>
                        <Text style={styles.deger}>{adres.adresNo}</Text>
                      </View>
                      <View style={styles.satirSag}>
                        <Text style={styles.etiket}>{t('onayDuzenleme.yetkili')}</Text>
                        <Text style={styles.deger}>{adres.yetkili || '—'}</Text>
                      </View>
                    </View>
                    {adres.adres1 ? (
                      <View style={styles.finansalSatir}>
                        <Text style={styles.finansalEtiket}>{t('onayDuzenleme.adres1')}</Text>
                        <Text style={[styles.finansalDeger, { flex: 2 }]}>{adres.adres1}</Text>
                      </View>
                    ) : null}
                    {adres.adres2 ? (
                      <View style={styles.finansalSatir}>
                        <Text style={styles.finansalEtiket}>{t('onayDuzenleme.adres2')}</Text>
                        <Text style={[styles.finansalDeger, { flex: 2 }]}>{adres.adres2}</Text>
                      </View>
                    ) : null}
                    {(adres.il || adres.ilce) ? (
                      <View style={styles.satirIkili}>
                        <View style={styles.satirSol}>
                          <Text style={styles.etiket}>{t('onayDuzenleme.il')}</Text>
                          <Text style={styles.deger}>{adres.il || '—'}</Text>
                        </View>
                        <View style={styles.satirSag}>
                          <Text style={styles.etiket}>{t('onayDuzenleme.ilce')}</Text>
                          <Text style={styles.deger}>{adres.ilce || '—'}</Text>
                        </View>
                      </View>
                    ) : null}
                    {adres.telefon ? (
                      <View style={styles.finansalSatir}>
                        <Text style={styles.finansalEtiket}>{t('onayDuzenleme.telefon')}</Text>
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
          <Text style={[styles.etiket, { marginBottom: 6 }]}>{t('onayDuzenleme.onayNotu')}</Text>
          <TextInput
            style={styles.notInput}
            value={not}
            onChangeText={setNot}
            multiline
            numberOfLines={3}
            placeholder={t('onayDuzenleme.onayNotuPlaceholder')}
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
              <Text style={styles.butonMetin}>{t('onayDuzenleme.onayla')}</Text>
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
              <Text style={styles.butonMetin}>{t('onayDuzenleme.reddet')}</Text>
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
