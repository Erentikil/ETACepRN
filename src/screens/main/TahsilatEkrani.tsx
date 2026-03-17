import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { cariBakiyeAl, islemTipleriniAl, tahsilatKaydet } from '../../api/tahsilatApi';
import { Colors } from '../../constants/Colors';
import type { CariKartBilgileri, IslemTipleri } from '../../models';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<DrawerParamList, 'Tahsilatlar'>;

function uuidOlustur(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function bugunStr(): string {
  const d = new Date();
  const g = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${g}.${m}.${y}`;
}

function strToDate(s: string): Date | null {
  const parts = s.split('.');
  if (parts.length !== 3) return null;
  const [g, m, y] = parts.map(Number);
  if (!g || !m || !y || y < 2000) return null;
  return new Date(y, m - 1, g);
}

function dateToApi(s: string): string {
  const d = strToDate(s);
  if (!d) return s;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}T00:00:00`;
}

function sayiFormatla(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TahsilatEkrani() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { calisilanSirket, yetkiBilgileri } = useAppStore();

  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [cariBakiye, setCariBakiye] = useState<number | null>(null);

  const [islemListesi, setIslemListesi] = useState<IslemTipleri[]>([]);
  const [secilenIslem, setSecilenIslem] = useState<IslemTipleri | null>(null);
  const [islemPickerAcik, setIslemPickerAcik] = useState(false);

  const [evrakNo, setEvrakNo] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [vadeTarihi, setVadeTarihi] = useState(bugunStr());
  const [tutar, setTutar] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const tutarFocused = useRef(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [islemTipleriYukleniyor, setIslemTipleriYukleniyor] = useState(false);
  const [klavyeYuksekligi, setKlavyeYuksekligi] = useState(0);

  // CariSecim'den geri dön
  useEffect(() => {
    if (route.params?.secilenCari) {
      const cari = route.params.secilenCari;
      setSecilenCari(cari);
      if (cari.bakiye !== undefined) {
        setCariBakiye(cari.bakiye);
      } else {
        bakiyeYukle(cari.cariKodu);
      }
    }
  }, [route.params?.secilenCari]);

  // Klavye yüksekliği + tutar görünür olsun
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKlavyeYuksekligi(e.endCoordinates.height);
      if (tutarFocused.current) {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKlavyeYuksekligi(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  // İşlem tiplerini yükle
  useEffect(() => {
    islemTipleriYukle();
  }, []);

  const islemTipleriYukle = async () => {
    setIslemTipleriYukleniyor(true);
    try {
      const sonuc = await islemTipleriniAl(calisilanSirket);
      if (sonuc.sonuc && sonuc.data?.itListe?.length > 0) {
        setIslemListesi(sonuc.data.itListe);
        setSecilenIslem(sonuc.data.cariIslemTipi ?? sonuc.data.itListe[0]);
      }
    } catch {
      // sessiz hata - islemListesi boş kalır
    } finally {
      setIslemTipleriYukleniyor(false);
    }
  };

  const bakiyeYukle = async (cariKodu: string) => {
    try {
      const sonuc = await cariBakiyeAl(cariKodu, calisilanSirket);
      if (sonuc.sonuc) {
        setCariBakiye(parseFloat(sonuc.data?.replace(',', '.') ?? '0'));
      }
    } catch {
      // sessiz hata
    }
  };

  const temizle = useCallback(() => {
    setEvrakNo('');
    setAciklama('');
    setVadeTarihi(bugunStr());
    setTutar('');
    if (islemListesi.length > 0) setSecilenIslem(islemListesi[0]);
  }, [islemListesi]);

  const kaydet = async () => {
    if (!secilenCari) {
      Alert.alert('Hata', 'Lütfen cari seçiniz.');
      return;
    }
    if (!secilenIslem) {
      Alert.alert('Hata', 'Lütfen işlem tipi seçiniz.');
      return;
    }
    const tutarSayi = parseFloat(tutar.replace(',', '.'));
    if (!tutar || isNaN(tutarSayi) || tutarSayi <= 0) {
      Alert.alert('Hata', 'Tutar 0 ve 0\'dan küçük olamaz.');
      return;
    }
    if (!strToDate(vadeTarihi)) {
      Alert.alert('Hata', 'Geçerli bir vade tarihi giriniz (gg.aa.yyyy).');
      return;
    }

    setKaydediliyor(true);
    try {
      const sonuc = await tahsilatKaydet({
        guid: uuidOlustur(),
        kullaniciKodu: yetkiBilgileri?.kullaniciKodu ?? '',
        veriTabaniAdi: calisilanSirket,
        tb: {
          islemTipi: parseInt(secilenIslem.islemTipiKodu, 10),
          cariKodu: secilenCari.cariKodu,
          cariUnvani: secilenCari.cariUnvan,
          tarih: dateToApi(bugunStr()),
          aciklama: secilenCari.cariUnvan,
          aciklama1: aciklama,
          vadeTarihi: dateToApi(vadeTarihi),
          tutar: tutarSayi,
        },
      });

      if (sonuc.sonuc) {
        // Bakiyeyi güncelle
        const bakiyeSonuc = await cariBakiyeAl(secilenCari.cariKodu, calisilanSirket);
        if (bakiyeSonuc.sonuc) {
          setCariBakiye(parseFloat(bakiyeSonuc.data?.replace(',', '.') ?? '0'));
        }
        Alert.alert('Bilgi', 'Evrak başarı ile kaydedildi.', [
          { text: 'Tamam', onPress: temizle },
        ]);
      } else {
        Alert.alert('Hata', sonuc.mesaj || 'Kayıt başarısız.');
      }
    } catch (err: any) {
      const mesaj = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message ?? String(err);
      Alert.alert('Hata', mesaj);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <View style={styles.ekran}>
      {/* İşlem tipi picker modal */}
      <Modal visible={islemPickerAcik} transparent animationType="fade" onRequestClose={() => setIslemPickerAcik(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIslemPickerAcik(false)}>
          <View style={styles.pickerKutu}>
            <Text style={styles.pickerBaslik}>İşlem Tipi Seçin</Text>
            <FlatList
              data={islemListesi}
              keyExtractor={(item) => item.islemTipiKodu}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, secilenIslem?.islemTipiKodu === item.islemTipiKodu && styles.pickerItemSecili]}
                  onPress={() => { setSecilenIslem(item); setIslemPickerAcik(false); }}
                >
                  <Text style={[styles.pickerItemText, secilenIslem?.islemTipiKodu === item.islemTipiKodu && styles.pickerItemTextSecili]}>
                    {item.islemTipiKodu} - {item.islemTipiAdi}
                  </Text>
                  {secilenIslem?.islemTipiKodu === item.islemTipiKodu && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Cari seçim butonu */}
      <TouchableOpacity
        style={styles.cariBtn}
        onPress={() => navigation.navigate('CariSecim', { returnScreen: 'Tahsilatlar' })}
      >
        <Ionicons name="person-outline" size={18} color={secilenCari ? Colors.primary : Colors.gray} />
        <Text style={[styles.cariText, secilenCari && styles.cariTextSecili]} numberOfLines={1}>
          {secilenCari ? secilenCari.cariUnvan : 'Lütfen cari seçiniz...'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
      </TouchableOpacity>

      {/* Cari bilgi kartı */}
      {secilenCari && (
        <View style={styles.cariBilgiKart}>
          <View style={styles.cariBilgiSatir}>
            <Text style={styles.cariBilgiEtiket}>Cari Kod</Text>
            <Text style={styles.cariBilgiDeger}>{secilenCari.cariKodu}</Text>
          </View>
          <View style={styles.cariBilgiSatir}>
            <Text style={styles.cariBilgiEtiket}>Ünvan</Text>
            <Text style={styles.cariBilgiDeger} numberOfLines={1}>{secilenCari.cariUnvan}</Text>
          </View>
          {secilenCari.yetkili ? (
            <View style={styles.cariBilgiSatir}>
              <Text style={styles.cariBilgiEtiket}>Yetkili</Text>
              <Text style={styles.cariBilgiDeger}>{secilenCari.yetkili}</Text>
            </View>
          ) : null}
          <View style={styles.cariBilgiSatir}>
            <Text style={styles.cariBilgiEtiket}>Bakiye</Text>
            <Text style={[styles.cariBilgiDeger, { color: (cariBakiye ?? 0) >= 0 ? Colors.error : Colors.success }]}>
              {cariBakiye !== null ? sayiFormatla(cariBakiye) : '—'}
            </Text>
          </View>
        </View>
      )}

      {/* Bölüm başlığı */}
      <View style={styles.bolumBaslik}>
        <Text style={styles.bolumBaslikText}>Tahsilat Bilgileri</Text>
      </View>

      {/* Form */}
      <ScrollView
        ref={scrollRef}
        style={styles.form}
        contentContainerStyle={{ paddingBottom: klavyeYuksekligi + 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* İşlem Tipi */}
        <View style={styles.satirContainer}>
          <Text style={styles.etiket}>İşlem Tipi</Text>
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setIslemPickerAcik(true)}
            disabled={islemTipleriYukleniyor}
          >
            {islemTipleriYukleniyor ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Text style={styles.pickerTriggerText} numberOfLines={1}>
                  {secilenIslem ? `${secilenIslem.islemTipiKodu} - ${secilenIslem.islemTipiAdi}` : 'Seçiniz...'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={Colors.gray} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Evrak No */}
        <View style={styles.satirContainer}>
          <Text style={styles.etiket}>Evrak No</Text>
          <TextInput
            style={styles.giris}
            value={evrakNo}
            onChangeText={setEvrakNo}
            placeholder="Evrak no giriniz"
            placeholderTextColor={Colors.gray}
          />
        </View>

        {/* Açıklama */}
        <View style={styles.satirContainer}>
          <Text style={styles.etiket}>Açıklama</Text>
          <TextInput
            style={styles.giris}
            value={aciklama}
            onChangeText={setAciklama}
            placeholder="Açıklama giriniz"
            placeholderTextColor={Colors.gray}
          />
        </View>

        {/* Vade Tarihi */}
        <View style={styles.satirContainer}>
          <Text style={styles.etiket}>Vade Tar.</Text>
          <TextInput
            style={styles.giris}
            value={vadeTarihi}
            onChangeText={setVadeTarihi}
            placeholder="gg.aa.yyyy"
            placeholderTextColor={Colors.gray}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        {/* Tutar */}
        <View style={styles.satirContainer}>
          <Text style={styles.etiket}>Tutar</Text>
          <TextInput
            style={[styles.giris, styles.tutarGiris]}
            value={tutar}
            onChangeText={setTutar}
            placeholder="0,00"
            placeholderTextColor={Colors.gray}
            keyboardType="decimal-pad"
            onFocus={() => { tutarFocused.current = true; }}
            onBlur={() => { tutarFocused.current = false; }}
          />
        </View>

        <View style={styles.butonSatir}>
          <TouchableOpacity
            style={[styles.buton, styles.temizleBtn]}
            onPress={temizle}
            disabled={kaydediliyor}
          >
            <Ionicons name="refresh-outline" size={18} color={Colors.gray} />
            <Text style={styles.temizleBtnText}>Temizle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.buton, styles.kaydetBtn, kaydediliyor && styles.butonDisabled]}
            onPress={kaydet}
            disabled={kaydediliyor}
          >
            {kaydediliyor
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Ionicons name="save-outline" size={18} color={Colors.white} />
            }
            <Text style={styles.kaydetBtnText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: Colors.lightGray },
  cariBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cariText: { flex: 1, fontSize: 14, color: Colors.gray },
  cariTextSecili: { color: Colors.darkGray, fontWeight: '600' },
  cariBilgiKart: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 4,
  },
  cariBilgiSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  cariBilgiEtiket: {
    width: 80,
    fontSize: 13,
    color: Colors.gray,
    fontWeight: '600',
  },
  cariBilgiDeger: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  bolumBaslik: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bolumBaslikText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  form: { flex: 1, padding: 12, paddingBottom: 0 },
  satirContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  etiket: {
    width: 80,
    fontSize: 13,
    color: Colors.darkGray,
    fontWeight: '600',
  },
  giris: {
    flex: 1,
    fontSize: 14,
    color: Colors.darkGray,
    paddingVertical: 8,
  },
  tutarGiris: {
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 16,
    color: Colors.error,
  },
  pickerTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  pickerTriggerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  butonSatir: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 24,
  },
  buton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
  },
  butonDisabled: { opacity: 0.5 },
  temizleBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  temizleBtnText: { fontSize: 14, fontWeight: '600', color: Colors.gray },
  kaydetBtn: { backgroundColor: Colors.primary },
  kaydetBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  // Picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pickerKutu: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    maxHeight: 360,
    overflow: 'hidden',
  },
  pickerBaslik: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkGray,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemSecili: { backgroundColor: '#f0f4ff' },
  pickerItemText: { fontSize: 14, color: Colors.darkGray },
  pickerItemTextSecili: { color: Colors.primary, fontWeight: '600' },
});
