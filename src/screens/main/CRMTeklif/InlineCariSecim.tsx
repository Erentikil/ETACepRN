import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../store/appStore';
import { cariListesiniAl } from '../../../api/hizliIslemlerApi';
import { Colors } from '../../../constants/Colors';
import { paraTL } from '../../../utils/format';
import type { CariKartBilgileri, CariEvrak } from '../../../models';
import EmptyState from '../../../components/EmptyState';
import SkeletonLoader from '../../../components/SkeletonLoader';
import AnimatedListItem from '../../../components/AnimatedListItem';
import { hafifTitresim } from '../../../utils/haptics';
import { toast } from '../../../components/Toast';

interface Props {
  secilenCari: CariKartBilgileri | null;
  onCariSec: (cari: CariKartBilgileri, potansiyelCariVerisi?: CariEvrak) => void;
  sepetDolu: boolean;
}

const FORM_ALANLARI: {
  alan: keyof CariEvrak;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  keyboard?: 'phone-pad' | 'email-address' | 'numeric';
}[] = [
  { alan: 'cariKodu', label: 'Cari Kodu *', icon: 'barcode-outline' },
  { alan: 'cariUnvan', label: 'Cari Unvan *', icon: 'business-outline' },
  { alan: 'yetkili', label: 'Yetkili', icon: 'person-outline' },
  { alan: 'telefon1', label: 'Telefon', icon: 'call-outline', keyboard: 'phone-pad' },
  { alan: 'eposta1', label: 'E-Posta', icon: 'mail-outline', keyboard: 'email-address' },
  { alan: 'vergiDairesi', label: 'Vergi Dairesi', icon: 'reader-outline' },
  { alan: 'vergiNumarasi', label: 'Vergi Numarası', icon: 'document-text-outline' },
  { alan: 'tcKimlikNo', label: 'TC Kimlik No', icon: 'id-card-outline', keyboard: 'numeric' },
  { alan: 'adres1', label: 'Adres 1', icon: 'location-outline' },
  { alan: 'adres2', label: 'Adres 2', icon: 'location-outline' },
  { alan: 'il', label: 'İl', icon: 'map-outline' },
  { alan: 'ilce', label: 'İlçe', icon: 'navigate-outline' },
  { alan: 'ulke', label: 'Ülke', icon: 'globe-outline' },
  { alan: 'postaKodu', label: 'Posta Kodu', icon: 'mail-open-outline' },
];

export default function InlineCariSecim({ secilenCari, onCariSec, sepetDolu }: Props) {
  const { calisilanSirket, yetkiBilgileri } = useAppStore();

  const [genisletilmis, setGenisletilmis] = useState(!secilenCari);
  const [sekme, setSekme] = useState<'cari' | 'potansiyel'>('cari');

  // Cari Kart listesi state
  const [tumCariListesi, setTumCariListesi] = useState<CariKartBilgileri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [aramaMetni, setAramaMetni] = useState('');

  // Potansiyel cari form state
  const bosCariEvrak: CariEvrak = {
    cariKodu: '', cariUnvan: '', yetkili: '', tcKimlikNo: '',
    vergiDairesi: '', vergiNumarasi: '', adres1: '', adres2: '', adres3: '',
    ilce: '', il: '', ulke: '', eposta1: '', postaKodu: '', telefon1: '',
    kullaniciKodu: yetkiBilgileri?.kullaniciKodu ?? '',
  };
  const [potansiyelForm, setPotansiyelForm] = useState<CariEvrak>(bosCariEvrak);

  // Cari secilince daralt
  useEffect(() => {
    setGenisletilmis(!secilenCari);
  }, [secilenCari]);

  // Cari listesini yukle
  const cariYukle = async () => {
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
    cariYukle();
  }, [calisilanSirket]);

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

  const handleCariSec = (cari: CariKartBilgileri, potansiyelVeri?: CariEvrak) => {
    const onayla = () => {
      hafifTitresim();
      onCariSec(cari, potansiyelVeri);
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

  const potansiyelCariSec = () => {
    if (!potansiyelForm.cariKodu.trim()) {
      toast.warning('Cari kodu boş bırakılamaz.');
      return;
    }
    if (!potansiyelForm.cariUnvan.trim()) {
      toast.warning('Cari unvan boş bırakılamaz.');
      return;
    }
    const cari: CariKartBilgileri = {
      cariKodu: potansiyelForm.cariKodu.trim(),
      cariUnvan: potansiyelForm.cariUnvan.trim(),
      telefon: potansiyelForm.telefon1,
      yetkili: potansiyelForm.yetkili,
      adres: potansiyelForm.adres1,
    };
    handleCariSec(cari, potansiyelForm);
  };

  // Kompakt bar (cari secili)
  if (!genisletilmis && secilenCari) {
    return (
      <TouchableOpacity style={styles.kompaktBar} onPress={() => setGenisletilmis(true)}>
        <Ionicons name="person-outline" size={18} color={Colors.primary} />
        <Text style={styles.kompaktText} numberOfLines={1}>{secilenCari.cariUnvan}</Text>
        <TouchableOpacity
          onPress={() => setGenisletilmis(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.degistirText}>Değiştir</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.panel}>
      {/* Sekme toggle */}
      <View style={styles.sekmeler}>
        <TouchableOpacity
          style={[styles.sekmeBtn, sekme === 'cari' && styles.sekmeBtnAktif]}
          onPress={() => setSekme('cari')}
        >
          <Text style={[styles.sekmeText, sekme === 'cari' && styles.sekmeTextAktif]}>Cari Kart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sekmeBtn, sekme === 'potansiyel' && styles.sekmeBtnAktif]}
          onPress={() => setSekme('potansiyel')}
        >
          <Text style={[styles.sekmeText, sekme === 'potansiyel' && styles.sekmeTextAktif]}>Potansiyel Cari</Text>
        </TouchableOpacity>
        {secilenCari && (
          <TouchableOpacity
            style={styles.daraltBtn}
            onPress={() => setGenisletilmis(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-up" size={20} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {sekme === 'cari' ? (
        <View style={styles.cariListePanel}>
          {/* Arama */}
          <View style={styles.aramaKutusu}>
            <Ionicons name="search-outline" size={18} color={Colors.gray} />
            <TextInput
              style={styles.aramaInput}
              placeholder="Cari kodu veya unvan filtrele..."
              placeholderTextColor={Colors.gray}
              value={aramaMetni}
              onChangeText={setAramaMetni}
            />
            {aramaMetni.length > 0 && (
              <TouchableOpacity onPress={() => setAramaMetni('')}>
                <Ionicons name="close-circle" size={18} color={Colors.gray} />
              </TouchableOpacity>
            )}
          </View>

          {yukleniyor ? (
            <SkeletonLoader satirSayisi={4} />
          ) : (
            <FlatList
              data={filtreli}
              keyExtractor={(item) => item.cariKodu}
              style={styles.cariListe}
              renderItem={({ item, index }) => (
                <AnimatedListItem index={index}>
                  <TouchableOpacity style={styles.cariSatiri} onPress={() => handleCariSec(item)}>
                    <View style={styles.cariIkon}>
                      <Ionicons name="person-outline" size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.cariBilgi}>
                      <Text style={styles.cariUnvan}>{item.cariUnvan}</Text>
                      <Text style={styles.cariKodu}>{item.cariKodu}</Text>
                      {item.telefon ? <Text style={styles.cariTelefon}>{item.telefon}</Text> : null}
                    </View>
                    {item.bakiye != null && (
                      <Text style={[styles.cariBakiye, item.bakiye >= 0 ? styles.bakiyeArti : styles.bakiyeEksi]}>
                        {paraTL(item.bakiye)}
                      </Text>
                    )}
                  </TouchableOpacity>
                </AnimatedListItem>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
              refreshControl={
                <RefreshControl refreshing={yukleniyor} onRefresh={cariYukle} colors={[Colors.primary]} />
              }
              ListEmptyComponent={
                <EmptyState
                  icon="people-outline"
                  baslik={aramaMetni ? 'Eşleşen cari bulunamadı' : 'Cari listesi boş'}
                  aciklama={aramaMetni ? 'Farklı bir arama kriteri deneyiniz' : ''}
                />
              }
            />
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.potansiyelPanel}
        >
          <ScrollView showsVerticalScrollIndicator={false} style={styles.potansiyelScroll}>
            {FORM_ALANLARI.map((f) => (
              <View key={f.alan} style={styles.formSatir}>
                <View style={styles.formLabelRow}>
                  <Ionicons name={f.icon as any} size={14} color={Colors.gray} />
                  <Text style={styles.formLabel}>{f.label}</Text>
                </View>
                <TextInput
                  style={styles.formInput}
                  value={potansiyelForm[f.alan] as string}
                  onChangeText={(v) => setPotansiyelForm((prev) => ({ ...prev, [f.alan]: v }))}
                  keyboardType={f.keyboard ?? 'default'}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.potansiyelSecBtn} onPress={potansiyelCariSec}>
              <Ionicons name="checkmark" size={20} color={Colors.white} />
              <Text style={styles.potansiyelSecText}>Seç</Text>
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Kompakt bar
  kompaktBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  kompaktText: {
    flex: 1,
    fontSize: 14,
    color: Colors.darkGray,
    fontWeight: '600',
  },
  degistirText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Panel
  panel: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 350,
  },
  sekmeler: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sekmeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  sekmeBtnAktif: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  sekmeText: {
    fontSize: 13,
    color: Colors.gray,
    fontWeight: '600',
  },
  sekmeTextAktif: {
    color: Colors.primary,
  },
  daraltBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },

  // Cari Kart liste
  cariListePanel: {
    flex: 1,
  },
  aramaKutusu: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aramaInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.black,
    paddingVertical: 2,
  },
  cariListe: {
    flex: 1,
  },
  cariSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  cariIkon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cariBilgi: {
    flex: 1,
  },
  cariUnvan: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  cariKodu: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 1,
  },
  cariTelefon: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 1,
  },
  cariBakiye: {
    fontSize: 12,
    fontWeight: '600',
  },
  bakiyeArti: { color: Colors.success ?? '#4CAF50' },
  bakiyeEksi: { color: Colors.error ?? '#f44336' },

  // Potansiyel cari form
  potansiyelPanel: {
    flex: 1,
  },
  potansiyelScroll: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  formSatir: {
    marginBottom: 8,
  },
  formLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  formLabel: {
    fontSize: 11,
    color: Colors.gray,
    fontWeight: '600',
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: Colors.darkGray,
    backgroundColor: '#fafafa',
  },
  potansiyelSecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  potansiyelSecText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
