import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Keyboard,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { cariListesiniAl, adresBilgileriniAl } from '../../api/hizliIslemlerApi';
import { useColors } from '../../contexts/ThemeContext';
import { useT } from '../../i18n/I18nContext';
import type { CariKartBilgileri, AdresBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';
import { toast } from '../../components/Toast';
import { hafifTitresim } from '../../utils/haptics';
import SkeletonLoader from '../../components/SkeletonLoader';
import AnimatedListItem from '../../components/AnimatedListItem';

type NavProp = DrawerNavigationProp<DrawerParamList, 'CariIletisim'>;

export default function CariIletisim() {
  const Colors = useColors();
  const t = useT();
  const navigation = useNavigation<NavProp>();
  const { calisilanSirket, yetkiBilgileri } = useAppStore();

  const [aramaMetni, setAramaMetni] = useState('');
  const [tumCariListesi, setTumCariListesi] = useState<CariKartBilgileri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [adresListesi, setAdresListesi] = useState<AdresBilgileri[]>([]);
  const [adresYukleniyor, setAdresYukleniyor] = useState(false);

  const yenile = async () => {
    setYukleniyor(true);
    try {
      const sonuc = await cariListesiniAl(
        calisilanSirket,
        yetkiBilgileri?.saticiBazliCariKart ?? false,
        yetkiBilgileri?.kullaniciKodu ?? '',
        yetkiBilgileri?.saticiKontrolKolonu ?? ''
      );
      if (sonuc.sonuc) {
        setTumCariListesi(sonuc.data);
      } else {
        toast.error(sonuc.mesaj || t('cariIletisim.listeAlinamadi'));
      }
    } catch {
      toast.error(t('cariIletisim.listeYuklemeHata'));
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    yenile();
  }, [calisilanSirket, yetkiBilgileri]);

  useEffect(() => {
    if (!secilenCari) {
      setAdresListesi([]);
      return;
    }
    setAdresYukleniyor(true);
    adresBilgileriniAl(secilenCari.cariKodu, calisilanSirket)
      .then((sonuc) => {
        setAdresListesi(sonuc.sonuc ? sonuc.data : []);
      })
      .catch(() => {
        setAdresListesi([]);
        toast.error(t('cariIletisim.adresYuklemeHata'));
      })
      .finally(() => setAdresYukleniyor(false));
  }, [secilenCari?.cariKodu, calisilanSirket]);

  const filtreli = useMemo(() => {
    const q = aramaMetni.toLowerCase().trim();
    if (!q) return tumCariListesi;
    return tumCariListesi.filter(
      (c) =>
        c.cariKodu.toLowerCase().includes(q) ||
        c.cariUnvan.toLowerCase().includes(q) ||
        (c.telefon ?? '').toLowerCase().includes(q)
    );
  }, [aramaMetni, tumCariListesi]);

  const normalizeTel = (raw: string) => raw.replace(/[^\d+]/g, '');

  const toE164TR = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('90') && digits.length >= 12) return digits;
    if (digits.startsWith('0') && digits.length === 11) return '90' + digits.slice(1);
    if (digits.length === 10 && digits.startsWith('5')) return '90' + digits;
    return digits;
  };

  const dialNumber = (tel: string) => {
    hafifTitresim();
    const url = `tel:${normalizeTel(tel)}`;
    Linking.openURL(url).catch((err) => {
      toast.error(t('cariIletisim.aramaBaslatilamadi', { detay: err?.message ?? t('cariIletisim.bilinmeyenHata') }));
    });
  };

  const openWhatsApp = (tel: string) => {
    hafifTitresim();
    const e164 = toE164TR(tel);
    if (e164.length < 10) {
      toast.warning(t('cariIletisim.gecersizTelefon'));
      return;
    }
    const wa = `whatsapp://send?phone=${e164}`;
    Linking.openURL(wa).catch(() => {
      Linking.openURL(`https://wa.me/${e164}`).catch((err2) => {
        toast.error(t('cariIletisim.whatsappAcilamadi', { detay: err2?.message ?? t('cariIletisim.bilinmeyenHata') }));
      });
    });
  };

  const haritaAc = (adres: string) => {
    if (!adres || !adres.trim()) return;
    hafifTitresim();
    const q = encodeURIComponent(adres.trim());
    const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url).catch((err) => {
      toast.error(t('cariIletisim.haritaAcilamadi', { detay: err?.message ?? t('cariIletisim.bilinmeyenHata') }));
    });
  };

  const cariSec = (cari: CariKartBilgileri) => {
    setSecilenCari(cari);
  };

  const modalKapat = () => {
    setSecilenCari(null);
    setAdresListesi([]);
  };

  const tamAdresOlustur = (adres: AdresBilgileri) =>
    [adres.adres1, adres.adres2, adres.adres3, adres.ilce, adres.il]
      .map((p) => (p || '').trim())
      .filter((p) => p.length > 0)
      .join(', ');

  const renderCariSatiri = ({ item, index }: { item: CariKartBilgileri; index: number }) => (
    <AnimatedListItem index={index}>
      <TouchableOpacity
        style={[styles.cariSatiri, { backgroundColor: Colors.card }]}
        onPress={() => cariSec(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.cariIkon, { backgroundColor: Colors.inputBackground }]}>
          <Ionicons name="person-outline" size={20} color={Colors.primary} />
        </View>
        <View style={styles.cariBilgi}>
          <Text style={[styles.cariUnvan, { color: Colors.text }]}>{item.cariUnvan}</Text>
          <Text style={[styles.cariKodu, { color: Colors.textSecondary }]}>{item.cariKodu}</Text>
          {item.telefon ? (
            <Text style={[styles.cariTelefon, { color: Colors.textSecondary }]}>{item.telefon}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    </AnimatedListItem>
  );

  const renderTelefonSatir = (label: string, tel: string, key: string) => {
    const telVar = (tel || '').trim().length > 0;
    return (
      <View key={key} style={[styles.iletisimBlok, { borderTopColor: Colors.border }]}>
        <View style={styles.iletisimBaslikRow}>
          <View style={styles.iletisimBilgi}>
            <Text style={[styles.iletisimLabel, { color: Colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.iletisimDeger, { color: Colors.text }]}>
              {telVar ? tel : t('cariIletisim.telefonYok')}
            </Text>
          </View>
          {telVar ? (
            <View style={styles.sagIkonGrup}>
              <Pressable
                onPress={() => dialNumber(tel)}
                style={({ pressed }) => [
                  styles.iletisimIkon,
                  { backgroundColor: Colors.primary },
                  pressed && { opacity: 0.6 },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="call" size={18} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => openWhatsApp(tel)}
                style={({ pressed }) => [
                  styles.iletisimIkon,
                  { backgroundColor: Colors.success },
                  pressed && { opacity: 0.6 },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderAdresSatir = (tamAdres: string, key: string) => {
    const adresVar = tamAdres.length > 0;
    return (
      <View key={key} style={[styles.iletisimBlok, { borderTopWidth: 0 }]}>
        <View style={styles.iletisimBaslikRow}>
          <View style={styles.iletisimBilgi}>
            <Text style={[styles.iletisimLabel, { color: Colors.textSecondary }]}>{t('cariIletisim.adres')}</Text>
            <Text style={[styles.iletisimDeger, { color: Colors.text }]} numberOfLines={4}>
              {adresVar ? tamAdres : t('cariIletisim.adresYok')}
            </Text>
          </View>
          {adresVar ? (
            <View style={styles.sagIkonGrup}>
              <Pressable
                onPress={() => haritaAc(tamAdres)}
                style={({ pressed }) => [
                  styles.iletisimIkon,
                  { backgroundColor: Colors.error },
                  pressed && { opacity: 0.6 },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="location" size={18} color="#fff" />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderAdresKarti = (adres: AdresBilgileri, idx: number) => {
    const tamAdres = tamAdresOlustur(adres);
    const base = `${adres.cariKodu}-${adres.adresNo ?? idx}`;
    return (
      <View
        key={base}
        style={[styles.adresKarti, { backgroundColor: Colors.inputBackground, borderColor: Colors.border }]}
      >
        {adres.yetkili ? (
          <View style={styles.adresUstBilgi}>
            <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
            <Text style={[styles.adresUstBilgiText, { color: Colors.textSecondary }]}>{adres.yetkili}</Text>
          </View>
        ) : null}
        {renderAdresSatir(tamAdres, `${base}-adr`)}
        {renderTelefonSatir(t('cariIletisim.telefon1'), adres.telefon1, `${base}-t1`)}
        {renderTelefonSatir(t('cariIletisim.telefon2'), adres.telefon2, `${base}-t2`)}
      </View>
    );
  };

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]} onTouchStart={Keyboard.dismiss}>
      <View style={[styles.aramaKutusu, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          style={[styles.aramaInput, { color: Colors.text }]}
          placeholder={t('cariIletisim.aramaPlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          value={aramaMetni}
          onChangeText={setAramaMetni}
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => setAramaMetni('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {yukleniyor ? (
        <SkeletonLoader satirSayisi={8} />
      ) : (
        <FlatList
          data={filtreli}
          keyExtractor={(item) => item.cariKodu}
          renderItem={renderCariSatiri}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={yenile}
              colors={[Colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={[styles.ayirac, { backgroundColor: Colors.border }]} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              baslik={aramaMetni ? t('cariIletisim.eslesenYok') : t('cariIletisim.listeBos')}
              aciklama={aramaMetni ? t('cariIletisim.farkliKriter') : t('cariIletisim.listeBosAciklama')}
            />
          }
        />
      )}

      <Modal
        visible={secilenCari !== null}
        transparent
        animationType="slide"
        onRequestClose={modalKapat}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detayModalKutu, { backgroundColor: Colors.card }]}>
            <View style={[styles.detayBaslik, { borderBottomColor: Colors.border }]}>
              <View style={styles.detayBaslikBilgi}>
                <Text style={[styles.detayBaslikUnvan, { color: Colors.text }]} numberOfLines={1}>
                  {secilenCari?.cariUnvan}
                </Text>
                <Text style={[styles.detayBaslikKodu, { color: Colors.textSecondary }]}>
                  {secilenCari?.cariKodu}
                </Text>
              </View>
              <TouchableOpacity onPress={modalKapat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {adresYukleniyor ? (
              <View style={styles.yuklemeAlani}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={[styles.yuklemeText, { color: Colors.textSecondary }]}>
                  {t('cariIletisim.adresYukleniyor')}
                </Text>
              </View>
            ) : adresListesi.length === 0 ? (
              <View style={styles.yuklemeAlani}>
                <EmptyState
                  icon="location-outline"
                  baslik={t('cariIletisim.adresBulunamadi')}
                  aciklama={t('cariIletisim.adresBulunamadiAciklama')}
                />
              </View>
            ) : (
              <ScrollView
                style={styles.detayListe}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {adresListesi.map((adres, idx) => renderAdresKarti(adres, idx))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  aramaKutusu: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  cariSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  cariIkon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cariBilgi: { flex: 1 },
  cariUnvan: { fontSize: 15, fontWeight: '600' },
  cariKodu: { fontSize: 12, marginTop: 2 },
  cariTelefon: { fontSize: 12, marginTop: 2 },
  ayirac: { height: 1, marginHorizontal: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detayModalKutu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  detayBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  detayBaslikBilgi: { flex: 1 },
  detayBaslikUnvan: { fontSize: 18, fontWeight: '700' },
  detayBaslikKodu: { fontSize: 13, marginTop: 2 },
  yuklemeAlani: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  yuklemeText: { fontSize: 14 },
  detayListe: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  adresKarti: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  adresUstBilgi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 8,
  },
  adresUstBilgiText: {
    fontSize: 14,
    fontWeight: '700',
  },
  iletisimBlok: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderTopWidth: 1,
  },
  iletisimBaslikRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sagIkonGrup: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  iletisimIkon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iletisimBilgi: { flex: 1 },
  iletisimLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  iletisimDeger: { fontSize: 16, fontWeight: '700' },

  butonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginLeft: 48,
  },
  aksiyonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
  },
  aksiyonBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
