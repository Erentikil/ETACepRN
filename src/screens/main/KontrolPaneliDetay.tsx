import React, { useState, useEffect, useMemo } from 'react';
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
import { useColors } from '../../contexts/ThemeContext';
import { useT } from '../../i18n/I18nContext';
import { paraFormat, paraTL } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import { toast } from '../../components/Toast';
import { onayEvraginiAl, evrakOnayiDegistir } from '../../api/onayApi';
import DropdownSecim from '../../components/DropdownSecim';
import type { OnayEvrakDetay, SepetBaslikBilgileri } from '../../models';

type Props = StackScreenProps<RootStackParamList, 'KontrolPaneliDetay'>;

function tarihFormat(tarih: string): string {
  try {
    const d = new Date(tarih);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return tarih;
  }
}

export default function KontrolPaneliDetay({ route, navigation }: Props) {
  const { item } = route.params;
  const Colors = useColors();
  const t = useT();
  const { calisilanSirket, yetkiBilgileri } = useAppStore();

  const ONAY_DURUMU_SECENEKLER = useMemo(() => [
    { label: t('kontrolPaneli.dropOnayla'), value: '1' },
    { label: t('kontrolPaneli.dropReddet'), value: '2' },
    { label: t('kontrolPaneli.dropGuncelle'), value: '3' },
  ], [t]);

  const [evrak, setEvrak] = useState<OnayEvrakDetay | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islem, setIslem] = useState(false);
  const [onayNotu, setOnayNotu] = useState(item.not || '');
  const [onayDurumu, setOnayDurumu] = useState('');

  const [evrakAcik, setEvrakAcik] = useState(false);
  const [adresAcik, setAdresAcik] = useState(false);
  const [onayBilgiAcik, setOnayBilgiAcik] = useState(false);

  useEffect(() => {
    evrakiYukle();
  }, []);

  async function evrakiYukle() {
    setYukleniyor(true);
    try {
      const sonuc = await onayEvraginiAl(item.guidId, calisilanSirket);
      if (sonuc.data) {
        setEvrak(sonuc.data);
        setOnayNotu(sonuc.data.onaylamaNotu || item.not || '');
      } else {
        toast.error(sonuc.mesaj || t('kontrolPaneli.evrakYuklenemedi'));
      }
    } catch (e: any) {
      toast.error(e?.message || t('common.baglantiHatasi'));
    } finally {
      setYukleniyor(false);
    }
  }

  const toplamMiktar = useMemo(() => {
    if (!evrak?.snbListe) return 0;
    return evrak.snbListe.reduce((acc, k) => acc + k.miktar, 0);
  }, [evrak]);

  async function kaydet() {
    if (!evrak) return;
    if (!onayDurumu) {
      toast.error(t('kontrolPaneli.onayDurumuSec'));
      return;
    }

    const durum = parseInt(onayDurumu, 10);
    const durumLabel = ONAY_DURUMU_SECENEKLER.find((s) => s.value === onayDurumu)?.label ?? '';

    Alert.alert(
      durumLabel,
      t('kontrolPaneli.cariIcinIslemMesaj', { ad: item.cariUnvani }),
      [
        { text: t('common.vazgec'), style: 'cancel' },
        {
          text: durumLabel,
          onPress: async () => {
            setIslem(true);
            try {
              const sonuc = await evrakOnayiDegistir(
                evrak.sbb as SepetBaslikBilgileri,
                evrak.snbListe ?? [],
                evrak.sRBbListe ?? [],
                durum,
                yetkiBilgileri?.kullaniciKodu ?? '',
                onayNotu,
                calisilanSirket,
              );
              if (sonuc.sonuc) {
                navigation.goBack();
              } else {
                toast.error(sonuc.mesaj || t('onay.islemBasarisiz'));
              }
            } catch (e: any) {
              toast.error(e?.message || t('common.baglantiHatasi'));
            } finally {
              setIslem(false);
            }
          },
        },
      ]
    );
  }

  if (yukleniyor) {
    return (
      <View style={[styles.merkezle, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.yukleniyorMetin, { color: Colors.textSecondary }]}>{t('kontrolPaneli.evrakYukleniyor')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      <ScrollView contentContainerStyle={styles.icerik}>

        {/* ─── Evrak Fiş Bilgileri Expander ────────────────────────── */}
        <TouchableOpacity
          style={[styles.expanderBaslik, { backgroundColor: Colors.card, borderLeftColor: Colors.primary }]}
          onPress={() => setEvrakAcik((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={[styles.expanderBaslikMetin, { color: Colors.primary }]}>
            {t('kontrolPaneli.evrakFisBilgileri')} ({item.evrakTipi} - {item.fisTipi})
          </Text>
          <Ionicons
            name={evrakAcik ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.primary}
          />
        </TouchableOpacity>

        {evrakAcik && (
          <View style={[styles.expanderIcerik, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <Text style={[styles.cariUnvani, { color: Colors.text }]}>{item.cariUnvani}</Text>

            <View style={[styles.ayrac, { backgroundColor: Colors.border, marginTop: 8 }]} />

            <View style={styles.satirIkili}>
              <View style={styles.satirSol}>
                <Text style={[styles.etiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.evrak')}</Text>
                <Text style={[styles.deger, { color: Colors.text }]}>{item.evrakTipi}</Text>
              </View>
              <View style={styles.satirSag}>
                <Text style={[styles.etiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.fisTipi')}</Text>
                <Text style={[styles.deger, { color: Colors.text }]}>{item.fisTipi}</Text>
              </View>
            </View>

            <View style={styles.satirIkili}>
              <View style={styles.satirSol}>
                <Text style={[styles.etiket, { color: Colors.textSecondary }]}>{t('onay.kullanici')}</Text>
                <Text style={[styles.deger, { color: Colors.text }]}>{item.kullaniciKodu}</Text>
              </View>
              <View style={styles.satirSag}>
                <Text style={[styles.etiket, { color: Colors.textSecondary }]}>{t('onay.sirket')}</Text>
                <Text style={[styles.deger, { color: Colors.text }]}>{item.sirketAdi || '—'}</Text>
              </View>
            </View>

            <View style={styles.satirIkili}>
              <View style={styles.satirSol}>
                <Text style={[styles.etiket, { color: Colors.textSecondary }]}>{t('onay.tarih')}</Text>
                <Text style={[styles.deger, { color: Colors.text }]}>{tarihFormat(item.tarih)}</Text>
              </View>
              <View style={styles.satirSag}>
                <Text style={[styles.etiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.durum')}</Text>
                <Text style={[styles.deger, { color: '#e65100' }]}>{item.durum}</Text>
              </View>
            </View>

            {item.onaylayan ? (
              <View style={styles.satirIkili}>
                <View style={styles.satirSol}>
                  <Text style={[styles.etiket, { color: Colors.textSecondary }]}>{t('onay.onaylayan')}</Text>
                  <Text style={[styles.deger, { color: Colors.text }]}>{item.onaylayan}</Text>
                </View>
              </View>
            ) : null}

            <View style={[styles.ayrac, { backgroundColor: Colors.border }]} />

            <View style={[styles.finansalSatir, styles.genelToplamSatir]}>
              <Text style={[styles.genelToplamEtiket, { color: Colors.primary }]}>{t('kontrolPaneli.genelToplam')}</Text>
              <Text style={[styles.genelToplamDeger, { color: Colors.primary }]}>{paraTL(item.genelToplam)}</Text>
            </View>

            {item.not ? (
              <>
                <View style={[styles.ayrac, { backgroundColor: Colors.border }]} />
                <View style={styles.finansalSatir}>
                  <Text style={[styles.finansalEtiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.not')}</Text>
                  <Text style={[styles.finansalDeger, { flex: 2, color: '#e65100', fontStyle: 'italic' }]}>{item.not}</Text>
                </View>
              </>
            ) : null}
          </View>
        )}

        {/* ─── Adresler Expander ───────────────────────────────────── */}
        {evrak && evrak.abListe && evrak.abListe.length > 0 && (
          <>
            <TouchableOpacity
              style={[styles.expanderBaslik, { marginTop: 8, backgroundColor: Colors.card, borderLeftColor: Colors.primary }]}
              onPress={() => setAdresAcik((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={[styles.expanderBaslikMetin, { color: Colors.primary }]}>{t('kontrolPaneli.adresler')}</Text>
              <Ionicons
                name={adresAcik ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.primary}
              />
            </TouchableOpacity>

            {adresAcik && (
              <View style={[styles.expanderIcerik, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
                {evrak.abListe.map((adres, idx) => (
                  <View key={idx} style={[styles.adresKart, idx > 0 && { borderTopColor: Colors.border }]}>
                    <View style={styles.satirIkili}>
                      <View style={styles.satirSol}>
                        <Text style={[styles.etiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.adresNo')}</Text>
                        <Text style={[styles.deger, { color: Colors.text }]}>{adres.adresNo}</Text>
                      </View>
                      <View style={styles.satirSag}>
                        <Text style={[styles.etiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.yetkili')}</Text>
                        <Text style={[styles.deger, { color: Colors.text }]}>{adres.yetkili || '—'}</Text>
                      </View>
                    </View>
                    {adres.adres1 ? (
                      <View style={styles.finansalSatir}>
                        <Text style={[styles.finansalEtiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.adres1')}</Text>
                        <Text style={[styles.finansalDeger, { flex: 2, color: Colors.text }]}>{adres.adres1}</Text>
                      </View>
                    ) : null}
                    {adres.adres2 ? (
                      <View style={styles.finansalSatir}>
                        <Text style={[styles.finansalEtiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.adres2')}</Text>
                        <Text style={[styles.finansalDeger, { flex: 2, color: Colors.text }]}>{adres.adres2}</Text>
                      </View>
                    ) : null}
                    {(adres.il || adres.ilce) ? (
                      <View style={styles.satirIkili}>
                        <View style={styles.satirSol}>
                          <Text style={[styles.etiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.il')}</Text>
                          <Text style={[styles.deger, { color: Colors.text }]}>{adres.il || '—'}</Text>
                        </View>
                        <View style={styles.satirSag}>
                          <Text style={[styles.etiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.ilce')}</Text>
                          <Text style={[styles.deger, { color: Colors.text }]}>{adres.ilce || '—'}</Text>
                        </View>
                      </View>
                    ) : null}
                    {adres.telefon ? (
                      <View style={styles.finansalSatir}>
                        <Text style={[styles.finansalEtiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.telefon')}</Text>
                        <Text style={[styles.finansalDeger, { flex: 2, color: Colors.text }]}>{adres.telefon}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ─── Onay Bilgileri Expander ─────────────────────────────── */}
        <TouchableOpacity
          style={[styles.expanderBaslik, { marginTop: 8, backgroundColor: Colors.card, borderLeftColor: Colors.primary }]}
          onPress={() => setOnayBilgiAcik((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={[styles.expanderBaslikMetin, { color: Colors.primary }]}>{t('kontrolPaneli.onayBilgileri')}</Text>
          <Ionicons
            name={onayBilgiAcik ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.primary}
          />
        </TouchableOpacity>

        {onayBilgiAcik && (
          <View style={[styles.expanderIcerik, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <Text style={[styles.etiket, { color: Colors.textSecondary, marginBottom: 6 }]}>{t('kontrolPaneli.onayDurumu')}</Text>
            <DropdownSecim
              value={onayDurumu}
              options={ONAY_DURUMU_SECENEKLER}
              placeholder={t('kontrolPaneli.onaylamaDurumu')}
              onChange={setOnayDurumu}
            />

            <Text style={[styles.etiket, { color: Colors.textSecondary, marginTop: 14, marginBottom: 6 }]}>{t('kontrolPaneli.onayNotu')}</Text>
            <TextInput
              style={[styles.notInput, { backgroundColor: Colors.inputBackground, borderColor: Colors.border, color: Colors.text }]}
              value={onayNotu}
              onChangeText={setOnayNotu}
              multiline
              numberOfLines={4}
              placeholder={t('kontrolPaneli.onayNotuPlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.kaydetBtn, { backgroundColor: Colors.primary }, islem && styles.butonDevre]}
              onPress={kaydet}
              disabled={islem}
              activeOpacity={0.8}
            >
              {islem ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.kaydetBtnMetin}>{t('kontrolPaneli.kaydet')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Sepet Listesi ───────────────────────────────────────── */}
        <View style={[styles.sepetBaslik, { backgroundColor: Colors.primary }]}>
          <Text style={styles.sepetBaslikMetin}>{t('kontrolPaneli.sepetListesi')}</Text>
        </View>

        <View style={[styles.tabloBaslikRow, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
          <Text style={[styles.tabloBaslik, { flex: 2, color: Colors.primary }]}>{t('kontrolPaneli.stok')}</Text>
          <Text style={[styles.tabloBaslik, { color: Colors.primary }]}>{t('kontrolPaneli.birim')}</Text>
          <Text style={[styles.tabloBaslik, { color: Colors.primary, textAlign: 'right' }]}>{t('kontrolPaneli.miktar')}</Text>
          <Text style={[styles.tabloBaslik, { color: Colors.primary, textAlign: 'right' }]}>{t('kontrolPaneli.fiyat')}</Text>
        </View>

        {evrak?.snbListe && evrak.snbListe.length > 0 ? (
          evrak.snbListe.map((kalem, idx) => (
            <View
              key={idx}
              style={[
                styles.tabloSatir,
                { backgroundColor: idx % 2 === 0 ? Colors.card : Colors.background, borderColor: Colors.border },
              ]}
            >
              <View style={{ flex: 2 }}>
                <Text style={[styles.stokKodu, { color: Colors.primary }]}>{kalem.stokKodu}</Text>
                <Text style={[styles.stokCinsi, { color: Colors.textSecondary }]}>
                  {kalem.stokCinsi}
                </Text>
              </View>
              <Text style={[styles.tabloHucre, { color: Colors.text }]}>{kalem.birim}</Text>
              <Text style={[styles.tabloHucre, { color: Colors.text, textAlign: 'right' }]}>
                {kalem.miktar.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
              </Text>
              <Text style={[styles.tabloHucre, { color: Colors.error, textAlign: 'right' }]}>
                {paraFormat(kalem.fiyat)}
              </Text>
            </View>
          ))
        ) : (
          <View style={[styles.tabloBos, { backgroundColor: Colors.card }]}>
            <Text style={[styles.tabloBosMesin, { color: Colors.textSecondary }]}>{t('kontrolPaneli.kalemBulunamadi')}</Text>
          </View>
        )}

        {/* sRBbListe varsa ayrı bölüm */}
        {evrak?.sRBbListe && evrak.sRBbListe.length > 0 && (
          <>
            <View style={[styles.rbBaslik, { backgroundColor: `${Colors.primary}22` }]}>
              <Text style={[styles.rbBaslikMetin, { color: Colors.primary }]}>{t('kontrolPaneli.renkBedenKalemleri')}</Text>
            </View>
            {evrak.sRBbListe.map((kalem, idx) => (
              <View
                key={`rb-${idx}`}
                style={[
                  styles.tabloSatir,
                  { backgroundColor: idx % 2 === 0 ? Colors.card : Colors.background, borderColor: Colors.border },
                ]}
              >
                <View style={{ flex: 2 }}>
                  <Text style={[styles.stokKodu, { color: Colors.primary }]}>{kalem.stokKodu}</Text>
                  <Text style={[styles.stokCinsi, { color: Colors.textSecondary }]}>
                    {kalem.stokCinsi} {kalem.renkKodu ? `| R:${kalem.renkKodu}` : ''} {kalem.bedenKodu ? `| B:${kalem.bedenKodu}` : ''}
                  </Text>
                </View>
                <Text style={[styles.tabloHucre, { color: Colors.text }]}>{kalem.birim}</Text>
                <Text style={[styles.tabloHucre, { color: Colors.text, textAlign: 'right' }]}>
                  {kalem.miktar.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                </Text>
                <Text style={[styles.tabloHucre, { color: Colors.error, textAlign: 'right' }]}>
                  {paraFormat(kalem.fiyat)}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ─── Alt Özet Barı ──────────────────────────────────────────── */}
      <View style={[styles.ozet, { backgroundColor: Colors.card, borderTopColor: Colors.border }]}>
        <View style={styles.ozetItem}>
          <Text style={[styles.ozetEtiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.satir')}</Text>
          <Text style={[styles.ozetDeger, { color: Colors.primary }]}>
            {evrak?.snbListe?.length ?? 0}
          </Text>
        </View>
        <View style={[styles.ozetAyrac, { backgroundColor: Colors.border }]} />
        <View style={styles.ozetItem}>
          <Text style={[styles.ozetEtiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.miktar')}</Text>
          <Text style={[styles.ozetDeger, { color: Colors.primary }]}>
            {toplamMiktar.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </Text>
        </View>
        <View style={[styles.ozetAyrac, { backgroundColor: Colors.border }]} />
        <View style={styles.ozetItem}>
          <Text style={[styles.ozetEtiket, { color: Colors.textSecondary }]}>{t('kontrolPaneli.toplam')}</Text>
          <Text style={[styles.ozetDeger, { color: Colors.primary }]}>
            {paraTL(evrak?.genelToplam ?? item.genelToplam ?? 0)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },

  merkezle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  yukleniyorMetin: { fontSize: 14 },

  icerik: { padding: 12, paddingBottom: 8 },

  // Expander
  expanderBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 4,
  },
  expanderBaslikMetin: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
  },
  expanderIcerik: {
    borderRadius: 8,
    padding: 12,
    marginTop: 2,
    borderWidth: 1,
  },

  // Satır
  satirIkili: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  satirSol: { flex: 1 },
  satirSag: { flex: 1 },
  etiket: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  deger: {
    fontSize: 13,
    fontWeight: '500',
  },
  cariUnvani: {
    fontSize: 15,
    fontWeight: '700',
  },

  ayrac: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },

  // Finansal
  finansalSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  finansalEtiket: { flex: 1, fontSize: 13 },
  finansalDeger: {
    flex: 1,
    fontSize: 13,
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
  genelToplamEtiket: { flex: 1, fontSize: 14, fontWeight: 'bold' },
  genelToplamDeger: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  // Adres
  adresKart: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 8,
  },

  // Onay notu
  notInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 100,
  },
  kaydetBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kaydetBtnMetin: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  butonDevre: { opacity: 0.6 },

  // Sepet Listesi
  sepetBaslik: {
    marginTop: 10,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sepetBaslikMetin: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  tabloBaslikRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    gap: 6,
  },
  tabloBaslik: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  tabloSatir: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    gap: 6,
    alignItems: 'center',
  },
  stokKodu: {
    fontSize: 13,
    fontWeight: '700',
  },
  stokCinsi: {
    fontSize: 11,
    marginTop: 1,
  },
  tabloHucre: {
    flex: 1,
    fontSize: 12,
  },
  tabloBos: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderTopWidth: 0,
  },
  tabloBosMesin: { fontSize: 13 },

  rbBaslik: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderTopWidth: 0,
  },
  rbBaslikMetin: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Özet barı
  ozet: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  ozetItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  ozetEtiket: {
    fontSize: 11,
    fontWeight: '600',
  },
  ozetDeger: {
    fontSize: 14,
    fontWeight: '700',
  },
  ozetAyrac: {
    width: StyleSheet.hairlineWidth,
    height: 32,
  },
});
