import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppStore } from '../../../store/appStore';
import { cariListesiniAl } from '../../../api/hizliIslemlerApi';
import { crmMusteriListesiniOku, crmMusterisiniKaydet } from '../../../api/crmTeklifApi';
import type { CariKartBilgileri, CRMMusteriBilgileri, CariEvrak } from '../../../models';
import { useColors } from '../../../contexts/ThemeContext';
import { useT } from '../../../i18n/I18nContext';
import { paraTL } from '../../../utils/format';
import EmptyState from '../../../components/EmptyState';
import SkeletonLoader from '../../../components/SkeletonLoader';
import AnimatedListItem from '../../../components/AnimatedListItem';
import { hafifTitresim } from '../../../utils/haptics';
import { toast } from '../../../components/Toast';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'CRMCariSecim'>;

export default function CRMCariSecim() {
  const Colors = useColors();
  const t = useT();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { calisilanSirket, yetkiBilgileri } = useAppStore();
  const favoriCariler = useAppStore((s) => s.favoriCariler);
  const toggleFavoriCari = useAppStore((s) => s.toggleFavoriCari);
  const favoriListesi = favoriCariler[calisilanSirket] ?? [];
  const favoriSet = useMemo(() => new Set(favoriListesi), [favoriListesi]);
  const [sadeceFavoriler, setSadeceFavoriler] = useState(false);

  const FORM_ALANLARI: {
    alan: keyof CariEvrak;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    keyboard?: 'phone-pad' | 'email-address' | 'numeric';
  }[] = [
    { alan: 'cariKodu', label: t('crmTeklif.formMusteriKodu'), icon: 'barcode-outline' },
    { alan: 'cariUnvan', label: t('crmTeklif.formMusteriUnvani'), icon: 'business-outline' },
    { alan: 'yetkili', label: t('crmTeklif.formYetkili'), icon: 'person-outline' },
    { alan: 'telefon1', label: t('crmTeklif.formTelefon'), icon: 'call-outline', keyboard: 'phone-pad' },
    { alan: 'eposta1', label: t('crmTeklif.formEPosta'), icon: 'mail-outline', keyboard: 'email-address' },
    { alan: 'vergiDairesi', label: t('crmTeklif.formVergiDairesi'), icon: 'reader-outline' },
    { alan: 'vergiNumarasi', label: t('crmTeklif.formVergiNumarasi'), icon: 'document-text-outline' },
    { alan: 'tcKimlikNo', label: t('crmTeklif.formTcKimlik'), icon: 'id-card-outline', keyboard: 'numeric' },
    { alan: 'adres1', label: t('crmTeklif.formAdres1'), icon: 'location-outline' },
    { alan: 'adres2', label: t('crmTeklif.formAdres2'), icon: 'location-outline' },
    { alan: 'il', label: t('crmTeklif.formIl'), icon: 'map-outline' },
    { alan: 'ilce', label: t('crmTeklif.formIlce'), icon: 'navigate-outline' },
    { alan: 'ulke', label: t('crmTeklif.formUlke'), icon: 'globe-outline' },
  ];

  const [sekme, setSekme] = useState<'cariler' | 'potansiyel'>('cariler');
  const [aramaMetni, setAramaMetni] = useState('');

  // ─── Yeni Müşteri Modal ───────────────────────────────────────────────────
  const [yeniModalGoster, setYeniModalGoster] = useState(false);
  const [kayitYapiliyor, setKayitYapiliyor] = useState(false);
  const bosCariEvrak: CariEvrak = {
    cariKodu: '', cariUnvan: '', yetkili: '', tcKimlikNo: '',
    vergiDairesi: '', vergiNumarasi: '', adres1: '', adres2: '', adres3: '',
    ilce: '', il: '', ulke: '', eposta1: '', postaKodu: '', telefon1: '',
    kullaniciKodu: yetkiBilgileri?.kullaniciKodu ?? '',
  };
  const [yeniMusteri, setYeniMusteri] = useState<CariEvrak>(bosCariEvrak);

  const yeniMusteriKaydet = async () => {
    if (!yeniMusteri.cariKodu.trim()) {
      toast.warning(t('crmTeklif.musteriKoduBos'));
      return;
    }
    if (!yeniMusteri.cariUnvan.trim()) {
      toast.warning(t('crmTeklif.musteriUnvaniBos'));
      return;
    }
    setKayitYapiliyor(true);
    try {
      const sonuc = await crmMusterisiniKaydet(yeniMusteri, calisilanSirket);
      if (sonuc.sonuc) {
        toast.success(sonuc.mesaj || t('crmTeklif.musteriKaydedildi'));
        setYeniModalGoster(false);
        setYeniMusteri({ ...bosCariEvrak });
        // Potansiyel listesini yenile
        crmMusteriYukle();
      } else {
        toast.error(sonuc.mesaj || t('crmTeklif.musteriKaydedilemedi'));
      }
    } catch {
      toast.error(t('crmTeklif.musteriKayitHata'));
    } finally {
      setKayitYapiliyor(false);
    }
  };

  // Header'a "Yeni" butonu
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerYeniButon}
          onPress={() => {
            hafifTitresim();
            setYeniMusteri({ ...bosCariEvrak });
            setYeniModalGoster(true);
          }}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.headerYeniText}>{t('crmTeklif.yeniBtn')}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, Colors]);

  // ─── Cariler tab ────────────────────────────────────────────────────────────
  const [cariListesi, setCariListesi] = useState<CariKartBilgileri[]>([]);
  const [cariYukleniyor, setCariYukleniyor] = useState(true);

  const cariYukle = async () => {
    setCariYukleniyor(true);
    try {
      const sonuc = await cariListesiniAl(
        calisilanSirket,
        yetkiBilgileri?.saticiBazliCariKart ?? false,
        yetkiBilgileri?.kullaniciKodu ?? '',
        yetkiBilgileri?.saticiKontrolKolonu ?? ''
      );
      if (sonuc.sonuc) {
        setCariListesi(sonuc.data);
      } else {
        toast.error(sonuc.mesaj || t('crmTeklif.cariListesiAlinamadi'));
      }
    } catch {
      toast.error(t('crmTeklif.cariListesiHata'));
    } finally {
      setCariYukleniyor(false);
    }
  };

  useEffect(() => { cariYukle(); }, [calisilanSirket]);

  const filtreliCariler = useMemo(() => {
    const q = aramaMetni.toLowerCase().trim();
    let liste = cariListesi;
    if (sadeceFavoriler) {
      liste = liste.filter((c) => favoriSet.has(c.cariKodu));
    }
    if (!q) return liste;
    return liste.filter(
      (c) =>
        c.cariKodu.toLowerCase().includes(q) ||
        c.cariUnvan.toLowerCase().includes(q) ||
        (c.telefon ?? '').toLowerCase().includes(q)
    );
  }, [aramaMetni, cariListesi, sadeceFavoriler, favoriSet]);

  // ─── Potansiyel Cariler tab ─────────────────────────────────────────────────
  const [crmMusteriListesi, setCrmMusteriListesi] = useState<CRMMusteriBilgileri[]>([]);
  const [crmYukleniyor, setCrmYukleniyor] = useState(false);
  const crmYuklendi = React.useRef(false);

  const crmMusteriYukle = async () => {
    setCrmYukleniyor(true);
    try {
      const sonuc = await crmMusteriListesiniOku(calisilanSirket);
      if (sonuc.sonuc) {
        setCrmMusteriListesi(sonuc.data ?? []);
      } else {
        toast.error(sonuc.mesaj || t('crmTeklif.crmListesiAlinamadi'));
      }
    } catch {
      toast.error(t('crmTeklif.crmListesiHata'));
    } finally {
      setCrmYukleniyor(false);
    }
  };

  useEffect(() => {
    if (sekme === 'potansiyel' && !crmYuklendi.current) {
      crmYuklendi.current = true;
      crmMusteriYukle();
    }
  }, [sekme]);

  const filtreliCrmMusteriler = useMemo(() => {
    const q = aramaMetni.toLowerCase().trim();
    if (!q) return crmMusteriListesi;
    return crmMusteriListesi.filter(
      (m) =>
        m.musterikodu.toLowerCase().includes(q) ||
        m.musteriunvani.toLowerCase().includes(q) ||
        (m.telefon ?? '').toLowerCase().includes(q)
    );
  }, [aramaMetni, crmMusteriListesi]);

  // ─── Ortak: Cari sec ───────────────────────────────────────────────────────
  const cariSec = (cari: CariKartBilgileri) => {
    const returnScreen = route.params?.returnScreen ?? 'ZiyaretIslemleri';
    const sepetDolu = route.params?.sepetDolu ?? false;
    const revizyonModu = route.params?.revizyonModu ?? false;

    const onayla = () => {
      hafifTitresim();
      useAppStore.getState().setPendingCari(cari, returnScreen);
      navigation.goBack();
    };

    if (revizyonModu) {
      Alert.alert(
        t('crmTeklif.revizyondanCik'),
        t('crmTeklif.revizyondanCikMesaj'),
        [
          { text: t('crmTeklif.vazgec'), style: 'cancel' },
          { text: t('crmTeklif.evetDevam'), style: 'destructive', onPress: onayla },
        ]
      );
    } else if (sepetDolu) {
      Alert.alert(
        t('crmTeklif.cariDegistir'),
        t('crmTeklif.cariDegistirMesaj'),
        [
          { text: t('crmTeklif.vazgec'), style: 'cancel' },
          { text: t('crmTeklif.degistir'), style: 'destructive', onPress: onayla },
        ]
      );
    } else {
      onayla();
    }
  };

  const crmMusteriSec = (musteri: CRMMusteriBilgileri) => {
    const cari: CariKartBilgileri = {
      cariKodu: musteri.musterikodu,
      cariUnvan: musteri.musteriunvani,
      telefon: musteri.telefon,
      yetkili: musteri.yetkili1,
      adres: musteri.adres1,
    };
    cariSec(cari);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const renderCariSatiri = ({ item, index }: { item: CariKartBilgileri; index: number }) => {
    const favori = favoriSet.has(item.cariKodu);
    return (
      <AnimatedListItem index={index}>
        <TouchableOpacity style={[styles.satir, { backgroundColor: Colors.card }]} onPress={() => cariSec(item)}>
          <View style={[styles.ikon, { backgroundColor: `${Colors.primary}15` }]}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.bilgi}>
            <Text style={[styles.unvan, { color: Colors.text }]}>{item.cariUnvan}</Text>
            <Text style={[styles.kod, { color: Colors.textSecondary }]}>{item.cariKodu}</Text>
            {item.telefon ? <Text style={[styles.telefon, { color: Colors.textSecondary }]}>{item.telefon}</Text> : null}
          </View>
          {item.bakiye != null && (
            <Text style={[styles.bakiye, item.bakiye >= 0 ? { color: Colors.success } : { color: Colors.error }]}>
              {paraTL(item.bakiye)}
            </Text>
          )}
          <TouchableOpacity
            style={styles.favoriButon}
            onPress={() => {
              hafifTitresim();
              toggleFavoriCari(calisilanSirket, item.cariKodu);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={favori ? 'star' : 'star-outline'}
              size={22}
              color={favori ? Colors.accent : Colors.textSecondary}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </AnimatedListItem>
    );
  };

  const renderCrmSatiri = ({ item, index }: { item: CRMMusteriBilgileri; index: number }) => (
    <AnimatedListItem index={index}>
      <TouchableOpacity style={[styles.satir, { backgroundColor: Colors.card }]} onPress={() => crmMusteriSec(item)}>
        <View style={[styles.ikon, { backgroundColor: `${Colors.accent}20` }]}>
          <Ionicons name="people-outline" size={20} color={Colors.accent} />
        </View>
        <View style={styles.bilgi}>
          <Text style={[styles.unvan, { color: Colors.text }]}>{item.musteriunvani}</Text>
          <Text style={[styles.kod, { color: Colors.textSecondary }]}>{item.musterikodu}</Text>
          {item.telefon ? <Text style={[styles.telefon, { color: Colors.textSecondary }]}>{item.telefon}</Text> : null}
          {item.yetkili1 ? <Text style={[styles.telefon, { color: Colors.textSecondary }]}>{item.yetkili1}</Text> : null}
        </View>
        {item.il ? <Text style={[styles.ilText, { color: Colors.textSecondary }]}>{item.il}</Text> : null}
      </TouchableOpacity>
    </AnimatedListItem>
  );

  const yukleniyor = sekme === 'cariler' ? cariYukleniyor : crmYukleniyor;

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]} onTouchStart={Keyboard.dismiss}>
      {/* Sekmeler */}
      <View style={[styles.sekmeler, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.sekmeBtn, sekme === 'cariler' && { borderBottomColor: Colors.primary }]}
          onPress={() => setSekme('cariler')}
        >
          <Ionicons name="person-outline" size={16} color={sekme === 'cariler' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.sekmeText, { color: Colors.textSecondary }, sekme === 'cariler' && { color: Colors.primary }]}>{t('crmTeklif.cariler')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sekmeBtn, sekme === 'potansiyel' && { borderBottomColor: Colors.primary }]}
          onPress={() => setSekme('potansiyel')}
        >
          <Ionicons name="people-outline" size={16} color={sekme === 'potansiyel' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.sekmeText, { color: Colors.textSecondary }, sekme === 'potansiyel' && { color: Colors.primary }]}>{t('crmTeklif.potansiyelCariler')}</Text>
        </TouchableOpacity>
      </View>

      {/* Arama */}
      <View style={[styles.aramaKutusu, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          style={[styles.aramaInput, { color: Colors.text }]}
          placeholder={sekme === 'cariler' ? t('crmTeklif.cariFiltrePlaceholder') : t('crmTeklif.musteriFiltrePlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          value={aramaMetni}
          onChangeText={setAramaMetni}
          autoFocus
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => setAramaMetni('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
        {sekme === 'cariler' && (
          <TouchableOpacity
            style={[
              styles.favoriChip,
              { borderColor: Colors.border },
              sadeceFavoriler && { backgroundColor: Colors.primary, borderColor: Colors.primary },
            ]}
            onPress={() => setSadeceFavoriler((v) => !v)}
          >
            <Ionicons
              name={sadeceFavoriler ? 'star' : 'star-outline'}
              size={14}
              color={sadeceFavoriler ? '#fff' : Colors.accent}
            />
            <Text style={[styles.favoriChipText, { color: sadeceFavoriler ? '#fff' : Colors.text }]}>
              {t('favori.sadeceFavoriler')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Liste */}
      {yukleniyor ? (
        <SkeletonLoader satirSayisi={8} />
      ) : sekme === 'cariler' ? (
        <FlatList
          data={filtreliCariler}
          keyExtractor={(item) => item.cariKodu}
          renderItem={renderCariSatiri}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={cariYukleniyor} onRefresh={cariYukle} colors={[Colors.primary]} />}
          ItemSeparatorComponent={() => <View style={[styles.ayirac, { backgroundColor: Colors.border }]} />}
          ListEmptyComponent={
            <EmptyState
              icon={sadeceFavoriler && !aramaMetni ? 'star-outline' : 'people-outline'}
              baslik={
                sadeceFavoriler && !aramaMetni
                  ? t('favori.cariYok')
                  : aramaMetni
                  ? t('crmTeklif.eslesenCariYok')
                  : t('crmTeklif.cariListesiBos')
              }
              aciklama={
                sadeceFavoriler && !aramaMetni
                  ? t('favori.cariYokAciklama')
                  : aramaMetni
                  ? t('crmTeklif.farkliKriter')
                  : t('crmTeklif.kayitliCariYok')
              }
            />
          }
        />
      ) : (
        <FlatList
          data={filtreliCrmMusteriler}
          keyExtractor={(item) => String(item.id || item.musterikodu)}
          renderItem={renderCrmSatiri}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={crmYukleniyor} onRefresh={crmMusteriYukle} colors={[Colors.primary]} />}
          ItemSeparatorComponent={() => <View style={[styles.ayirac, { backgroundColor: Colors.border }]} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              baslik={aramaMetni ? t('crmTeklif.eslesenMusteriYok') : t('crmTeklif.potansiyelListeBos')}
              aciklama={aramaMetni ? t('crmTeklif.farkliKriter') : t('crmTeklif.kayitliCrmYok')}
            />
          }
        />
      )}

      {/* Yeni Müşteri Modal */}
      <Modal
        visible={yeniModalGoster}
        transparent
        animationType="slide"
        onRequestClose={() => setYeniModalGoster(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalKutu, { backgroundColor: Colors.card }]}>
            <View style={[styles.modalBaslik, { borderBottomColor: Colors.border }]}>
              <Text style={[styles.modalBaslikText, { color: Colors.text }]}>{t('crmTeklif.yeniMusteriBaslik')}</Text>
              <TouchableOpacity onPress={() => setYeniModalGoster(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {FORM_ALANLARI.map((f) => (
                <View key={f.alan} style={styles.formSatir}>
                  <View style={styles.formLabelRow}>
                    <Ionicons name={f.icon as any} size={16} color={Colors.textSecondary} />
                    <Text style={[styles.formLabel, { color: Colors.textSecondary }]}>{f.label}</Text>
                  </View>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: Colors.inputBackground, color: Colors.text, borderColor: Colors.border }]}
                    value={yeniMusteri[f.alan] as string}
                    onChangeText={(v) => setYeniMusteri((prev) => ({ ...prev, [f.alan]: v }))}
                    keyboardType={f.keyboard ?? 'default'}
                  />
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
            <View style={[styles.modalAltButonlar, { borderTopColor: Colors.border }]}>
              <TouchableOpacity
                style={[styles.iptalButon, { borderColor: Colors.border }]}
                onPress={() => setYeniModalGoster(false)}
              >
                <Text style={[styles.iptalText, { color: Colors.text }]}>{t('crmTeklif.iptal')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.kaydetButon, { backgroundColor: Colors.primary }, kayitYapiliyor && { opacity: 0.6 }]}
                onPress={yeniMusteriKaydet}
                disabled={kayitYapiliyor}
              >
                {kayitYapiliyor ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.kaydetText}>{t('crmTeklif.kaydet')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  sekmeler: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  sekmeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sekmeText: {
    fontSize: 14,
    fontWeight: '600',
  },
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
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  ikon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bilgi: { flex: 1 },
  unvan: { fontSize: 15, fontWeight: '600' },
  kod: { fontSize: 12, marginTop: 2 },
  telefon: { fontSize: 12 },
  bakiye: { fontSize: 12, fontWeight: '600' },
  ilText: { fontSize: 12, fontWeight: '500' },
  ayirac: { height: 1, marginHorizontal: 14 },
  favoriButon: {
    padding: 4,
    marginLeft: 4,
  },
  favoriChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginLeft: 4,
  },
  favoriChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Header
  headerYeniButon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
    gap: 4,
  },
  headerYeniText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKutu: {
    borderRadius: 16,
    width: '92%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalBaslik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalBaslikText: {
    fontSize: 18,
    fontWeight: '700',
  },
  formScroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  formSatir: {
    marginBottom: 12,
  },
  formLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  formInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  modalAltButonlar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  iptalButon: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  iptalText: {
    fontSize: 15,
    fontWeight: '600',
  },
  kaydetButon: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  kaydetText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
