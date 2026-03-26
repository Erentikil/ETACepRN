import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { cariListesiniAl, cariKartKaydet } from '../../api/hizliIslemlerApi';
import type { CariEvrak } from '../../models';
import { Colors } from '../../constants/Colors';
import type { CariKartBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';
import { toast } from '../../components/Toast';
import { hafifTitresim } from '../../utils/haptics';
import SkeletonLoader from '../../components/SkeletonLoader';
import AnimatedListItem from '../../components/AnimatedListItem';
import { paraTL } from '../../utils/format';

type CariIslemSecenegi = {
  key: keyof DrawerParamList | string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  aktif: boolean;
};

const CARI_ISLEM_SECENEKLERI: CariIslemSecenegi[] = [
  { key: 'CariEkstreListesi', label: 'Cari Ekstre', icon: 'document-text-outline', aktif: true },
  { key: 'StokluCariEkstreListesi', label: 'Stoklu Ekstre', icon: 'list-outline', aktif: true },
  { key: 'BekleyenSiparisler', label: 'Bekleyen Siparişler', icon: 'time-outline', aktif: true },
  { key: 'TahsilatListesi', label: 'Tahsilat Listesi', icon: 'receipt-outline', aktif: true },
  { key: 'Adresler', label: 'Adresler', icon: 'location-outline', aktif: true },
  { key: 'CariTahsilat', label: 'Cari Tahsilat', icon: 'cash-outline', aktif: false },
  { key: 'KasaTahsilati', label: 'Kasa Tahsilatı', icon: 'wallet-outline', aktif: false },
  { key: 'CekTahsilati', label: 'Çek Tahsilatı', icon: 'card-outline', aktif: false },
  { key: 'SenetTahsilati', label: 'Senet Tahsilatı', icon: 'document-outline', aktif: false },
];

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'CariSecim'>;

export default function CariSecim() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { calisilanSirket, yetkiBilgileri } = useAppStore();

  const [aramaMetni, setAramaMetni] = useState('');
  const [tumCariListesi, setTumCariListesi] = useState<CariKartBilgileri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Yeni Cari Kart Modal
  const [yeniCariModalGoster, setYeniCariModalGoster] = useState(false);
  const [kayitYapiliyor, setKayitYapiliyor] = useState(false);
  const bosCariEvrak: CariEvrak = {
    cariKodu: '', cariUnvan: '', yetkili: '', tcKimlikNo: '',
    vergiDairesi: '', vergiNumarasi: '', adres1: '', adres2: '', adres3: '',
    ilce: '', il: '', ulke: '', eposta1: '', postaKodu: '', telefon1: '',
    kullaniciKodu: yetkiBilgileri?.kullaniciKodu ?? '',
  };
  const [yeniCari, setYeniCari] = useState<CariEvrak>(bosCariEvrak);

  const cariAlanGuncelle = (alan: keyof CariEvrak, deger: string) => {
    setYeniCari((prev) => ({ ...prev, [alan]: deger }));
  };

  const yeniCariKaydet = async () => {
    if (!yeniCari.cariKodu.trim()) {
      toast.warning('Cari kodu boş bırakılamaz.');
      return;
    }
    if (!yeniCari.cariUnvan.trim()) {
      toast.warning('Cari unvan boş bırakılamaz.');
      return;
    }
    setKayitYapiliyor(true);
    try {
      const sonuc = await cariKartKaydet(yeniCari, calisilanSirket);
      if (sonuc.sonuc) {
        toast.success(sonuc.mesaj || 'Cari kart kaydedildi.');
        setYeniCariModalGoster(false);
        setYeniCari({ ...bosCariEvrak });
        yenile();
      } else {
        toast.error(sonuc.mesaj || 'Cari kart kaydedilemedi.');
      }
    } catch {
      toast.error('Cari kart kaydedilirken bir hata oluştu.');
    } finally {
      setKayitYapiliyor(false);
    }
  };

  // Header'a "Yeni" butonu ekle
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerYeniButon}
          onPress={() => {
            hafifTitresim();
            setYeniCari({ ...bosCariEvrak });
            setYeniCariModalGoster(true);
          }}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.headerYeniText}>Yeni</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

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
        toast.error(sonuc.mesaj || 'Cari listesi alınamadı.');
      }
    } catch {
      toast.error('Cari listesi yüklenirken bir hata oluştu.');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    yenile();
  }, [calisilanSirket, yetkiBilgileri]);

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

  const [islemModalCari, setIslemModalCari] = useState<CariKartBilgileri | null>(null);

  const cariSec = (cari: CariKartBilgileri) => {
    const returnScreen = route.params?.returnScreen ?? 'HizliIslemler';
    const sepetDolu = route.params?.sepetDolu ?? false;

    const onayla = () => {
      hafifTitresim();
      useAppStore.getState().setPendingCari(cari, returnScreen);
      navigation.goBack();
    };

    if (sepetDolu) {
      Alert.alert(
        'Cari Değiştir',
        'Sepette ürünler var. Cariyi değiştirmek istediğinize emin misiniz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Değiştir', style: 'destructive', onPress: onayla },
        ]
      );
    } else {
      onayla();
    }
  };

  const cariIslemSec = (secenek: CariIslemSecenegi) => {
    if (!islemModalCari) return;
    hafifTitresim();
    const cari = islemModalCari;
    setIslemModalCari(null);
    if (!secenek.aktif) {
      toast.info(`${secenek.label} henüz aktif değil.`);
      return;
    }

    // Adresler → doğrudan PDF rapor göster
    if (secenek.key === 'Adresler') {
      (navigation as any).navigate('Drawer', {
        screen: 'PDFRaporGoster',
        params: {
          dizaynAdi: 'Mobil_CariAdresDizayn.repx',
          evrakTipi: 'CariAdres',
          parametre1: cari.cariKodu,
          baslik: `Adres Listesi - ${cari.cariUnvan}`,
          kaynakEkran: 'CariSecim',
        },
      });
      return;
    }

    // Tahsilat Listesi → doğrudan PDF rapor göster
    if (secenek.key === 'TahsilatListesi') {
      (navigation as any).navigate('Drawer', {
        screen: 'PDFRaporGoster',
        params: {
          dizaynAdi: 'Mobil_TahsilatDetayDizayn.repx',
          evrakTipi: 'TahsilatDetay',
          parametre1: cari.cariKodu,
          baslik: `Tahsilat Listesi - ${cari.cariUnvan}`,
          kaynakEkran: 'CariSecim',
        },
      });
      return;
    }

    (navigation as any).navigate('Drawer', {
      screen: secenek.key,
      params: { secilenCari: cari, kaynakEkran: 'CariSecim' },
    });
  };

  const renderCariSatiri = ({ item, index }: { item: CariKartBilgileri; index: number }) => (
    <AnimatedListItem index={index}>
      <TouchableOpacity style={styles.cariSatiri} onPress={() => cariSec(item)}>
        <View style={styles.cariIkon}>
          <Ionicons name="person-outline" size={20} color={Colors.primary} />
        </View>
        <View style={styles.cariBilgi}>
          <Text style={styles.cariUnvan}>{item.cariUnvan}</Text>
          <Text style={styles.cariKodu}>{item.cariKodu}</Text>
          {item.telefon ? <Text style={styles.cariTelefon}>{item.telefon}</Text> : null}
          {item.bakiye != null && (
            <Text style={[styles.cariBakiye, item.bakiye >= 0 ? styles.bakiyeArti : styles.bakiyeEksi]}>
              {paraTL(item.bakiye)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.islemButon}
          onPress={() => setIslemModalCari(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add-circle" size={28} color={Colors.accent} />
        </TouchableOpacity>
      </TouchableOpacity>
    </AnimatedListItem>
  );

  return (
    <View style={styles.ekran}>
      {/* Filtre kutusu */}
      <View style={styles.aramaKutusu}>
        <Ionicons name="search-outline" size={18} color={Colors.gray} />
        <TextInput
          style={styles.aramaInput}
          placeholder="Cari kodu veya unvan filtrele..."
          placeholderTextColor={Colors.gray}
          value={aramaMetni}
          onChangeText={setAramaMetni}
          autoFocus
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity onPress={() => setAramaMetni('')}>
            <Ionicons name="close-circle" size={18} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Yükleniyor */}
      {yukleniyor ? (
        <SkeletonLoader satirSayisi={8} />
      ) : (
        <FlatList
          data={filtreli}
          keyExtractor={(item) => item.cariKodu}
          renderItem={renderCariSatiri}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={yenile}
              colors={[Colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.ayirac} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              baslik={aramaMetni ? 'Eşleşen cari bulunamadı' : 'Cari listesi boş'}
              aciklama={aramaMetni ? 'Farklı bir arama kriteri deneyiniz' : 'Kayıtlı cari bulunmamaktadır'}
            />
          }
        />
      )}

      {/* Yeni Cari Kart Modal */}
      <Modal
        visible={yeniCariModalGoster}
        transparent
        animationType="slide"
        onRequestClose={() => setYeniCariModalGoster(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.yeniCariModalKutu}>
            <View style={styles.yeniCariBaslik}>
              <Text style={styles.yeniCariBaslikText}>Yeni Cari Kart</Text>
              <TouchableOpacity onPress={() => setYeniCariModalGoster(false)}>
                <Ionicons name="close" size={24} color={Colors.darkGray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.yeniCariForm} showsVerticalScrollIndicator={false}>
              {([
                { alan: 'cariKodu' as const, label: 'Cari Kodu *', icon: 'barcode-outline' as const },
                { alan: 'cariUnvan' as const, label: 'Cari Unvan *', icon: 'business-outline' as const },
                { alan: 'yetkili' as const, label: 'Yetkili', icon: 'person-outline' as const },
                { alan: 'telefon1' as const, label: 'Telefon', icon: 'call-outline' as const, keyboard: 'phone-pad' as const },
                { alan: 'eposta1' as const, label: 'E-Posta', icon: 'mail-outline' as const, keyboard: 'email-address' as const },
                { alan: 'vergiDairesi' as const, label: 'Vergi Dairesi', icon: 'reader-outline' as const },
                { alan: 'vergiNumarasi' as const, label: 'Vergi Numarası', icon: 'document-text-outline' as const },
                { alan: 'tcKimlikNo' as const, label: 'TC Kimlik No', icon: 'id-card-outline' as const, keyboard: 'numeric' as const },
                { alan: 'adres1' as const, label: 'Adres 1', icon: 'location-outline' as const },
                { alan: 'adres2' as const, label: 'Adres 2', icon: 'location-outline' as const },
                { alan: 'il' as const, label: 'İl', icon: 'map-outline' as const },
                { alan: 'ilce' as const, label: 'İlçe', icon: 'navigate-outline' as const },
                { alan: 'ulke' as const, label: 'Ülke', icon: 'globe-outline' as const },
                { alan: 'postaKodu' as const, label: 'Posta Kodu', icon: 'mail-open-outline' as const },
              ]).map((f) => (
                <View key={f.alan} style={styles.formSatir}>
                  <View style={styles.formLabelRow}>
                    <Ionicons name={f.icon} size={16} color={Colors.gray} />
                    <Text style={styles.formLabel}>{f.label}</Text>
                  </View>
                  <TextInput
                    style={styles.formInput}
                    value={yeniCari[f.alan]}
                    onChangeText={(v) => cariAlanGuncelle(f.alan, v)}
keyboardType={f.keyboard ?? 'default'}
                  />
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
            <View style={styles.yeniCariAltButonlar}>
              <TouchableOpacity
                style={styles.yeniCariIptalButon}
                onPress={() => setYeniCariModalGoster(false)}
              >
                <Text style={styles.yeniCariIptalText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.yeniCariKaydetButon, kayitYapiliyor && { opacity: 0.6 }]}
                onPress={yeniCariKaydet}
                disabled={kayitYapiliyor}
              >
                {kayitYapiliyor ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={Colors.white} />
                    <Text style={styles.yeniCariKaydetText}>Kaydet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cari İşlem Seçim Modal */}
      <Modal
        visible={islemModalCari !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setIslemModalCari(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIslemModalCari(null)}
        >
          <View style={styles.modalKutu}>
            {CARI_ISLEM_SECENEKLERI.map((secenek) => (
              <TouchableOpacity
                key={secenek.key}
                style={[styles.islemSatir, !secenek.aktif && styles.islemSatirPasif]}
                onPress={() => cariIslemSec(secenek)}
              >
                <Ionicons
                  name={secenek.icon}
                  size={22}
                  color={secenek.aktif ? Colors.darkGray : Colors.gray}
                />
                <Text style={[styles.islemLabel, !secenek.aktif && styles.islemLabelPasif]}>
                  {secenek.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.vazgecButon}
              onPress={() => setIslemModalCari(null)}
            >
              <Text style={styles.vazgecText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: Colors.lightGray },
  aramaKutusu: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.black,
    paddingVertical: 4,
  },
  yukleniyorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 20,
  },
  yukleniyorText: { color: Colors.gray, fontSize: 14 },
  cariSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cariIkon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cariBilgi: { flex: 1 },
  cariUnvan: { fontSize: 15, fontWeight: '600', color: Colors.darkGray },
  cariKodu: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  cariTelefon: { fontSize: 12, color: Colors.gray },
  cariBakiye: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  bakiyeArti: { color: Colors.success },
  bakiyeEksi: { color: Colors.error },
  islemButon: {
    padding: 4,
  },
  ayirac: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  bosEkran: { alignItems: 'center', paddingTop: 60, gap: 12 },
  bosMetin: { fontSize: 14, color: Colors.gray, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKutu: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    width: '82%',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  islemSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 14,
  },
  islemSatirPasif: {
    opacity: 0.45,
  },
  islemLabel: {
    fontSize: 16,
    color: Colors.darkGray,
  },
  islemLabelPasif: {
    color: Colors.gray,
  },
  vazgecButon: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  vazgecText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  // Header Yeni butonu
  headerYeniButon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
    gap: 4,
  },
  headerYeniText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Yeni Cari Modal
  yeniCariModalKutu: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: '92%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  yeniCariBaslik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  yeniCariBaslikText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkGray,
  },
  yeniCariForm: {
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
    color: Colors.gray,
    fontWeight: '500',
  },
  formInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.black,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  yeniCariAltButonlar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  yeniCariIptalButon: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  yeniCariIptalText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  yeniCariKaydetButon: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  yeniCariKaydetText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});
