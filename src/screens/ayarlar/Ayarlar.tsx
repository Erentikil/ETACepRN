import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/Colors';
import { Config } from '../../constants/Config';
import { useAppStore } from '../../store/appStore';
import ThemedButton from '../../components/ThemedButton';
import { sirketBilgileriniAl } from '../../api/authApi';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Ayarlar'>;
  route: RouteProp<RootStackParamList, 'Ayarlar'>;
};

const KAMERA_BARKOD_SECENEKLER = [
  { label: 'Google ML Kit', value: 'google' },
  { label: 'ZXing', value: 'zxing' },
];

const KAMERA_OKUMA_SECENEKLER = [
  { label: 'Otomatik', value: 'otomatik' },
  { label: 'Elle', value: 'elle' },
];

export default function Ayarlar({ navigation, route }: Props) {
  const { setOnLineCalisma, sirketBilgileri, setSirketBilgileri } = useAppStore();

  const [apiUrl, setApiUrl] = useState('');
  const [apiUrl2, setApiUrl2] = useState('');
  const [hibrit, setHibrit] = useState(false);
  const [calisilanSirket, setCalisilanSirket] = useState('');
  const [sirketListesi, setSirketListesi] = useState<string[]>([]);
  const [kameraBarkod, setKameraBarkod] = useState('google');
  const [kameraOkuma, setKameraOkuma] = useState('otomatik');
  const [sirketYukleniyor, setSirketYukleniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    (async () => {
      const u1 = await AsyncStorage.getItem(Config.STORAGE_KEYS.API_URL);
      const u2 = await AsyncStorage.getItem(Config.STORAGE_KEYS.API_URL2);
      const mod = await AsyncStorage.getItem(Config.STORAGE_KEYS.CALISMA_MODU);
      const sirket = await AsyncStorage.getItem(Config.STORAGE_KEYS.CALISILANL_SIRKET);
      const kBarKod = await AsyncStorage.getItem(Config.STORAGE_KEYS.KAMERA_BARKOD);
      const kOku = await AsyncStorage.getItem(Config.STORAGE_KEYS.KAMERA_OKUMA);

      if (u1) setApiUrl(u1);
      if (u2) setApiUrl2(u2);
      setHibrit(mod === 'Hibrit');
      if (sirket) setCalisilanSirket(sirket);
      if (kBarKod) setKameraBarkod(kBarKod);
      if (kOku) setKameraOkuma(kOku);

      if (sirketBilgileri?.sirketListesi) {
        setSirketListesi(sirketBilgileri.sirketListesi);
      }
    })();
  }, []);

  const sirketleriFetch = async () => {
    if (!apiUrl.trim()) {
      Alert.alert('Hata', 'Önce API URL giriniz.');
      return;
    }
    setSirketYukleniyor(true);
    try {
      await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL, apiUrl.trim());
      const sonuc = await sirketBilgileriniAl("");
      if (sonuc.sonuc) {
        setSirketListesi(sonuc.data.sirketListesi);
        setSirketBilgileri(sonuc.data);
        if (sonuc.data.varsayilanSirket && !calisilanSirket) {
          setCalisilanSirket(sonuc.data.varsayilanSirket);
          await AsyncStorage.setItem(Config.STORAGE_KEYS.CALISILANL_SIRKET, sonuc.data.varsayilanSirket);
        }
        Alert.alert('Bağlantı Başarılı', `${sonuc.data.sirketListesi?.length ?? 0} şirket bulundu.`);
      } else {
        Alert.alert('Sunucu Hatası', sonuc.mesaj || 'Bilinmeyen hata');
      }
    } catch (err: unknown) {
      const mesaj = err instanceof Error ? err.message : 'Bağlantı hatası.';
      Alert.alert('Bağlantı Hatası', mesaj);
    } finally {
      setSirketYukleniyor(false);
    }
  };

  const handleKaydet = async () => {
    if (!apiUrl.trim()) {
      Alert.alert('Hata', 'API URL zorunludur.');
      return;
    }
    setKaydediliyor(true);
    try {
      await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL, apiUrl.trim());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL2, apiUrl2.trim());
      await AsyncStorage.setItem(
        Config.STORAGE_KEYS.CALISMA_MODU,
        hibrit ? 'Hibrit' : 'Online'
      );
      await AsyncStorage.setItem(Config.STORAGE_KEYS.CALISILANL_SIRKET, calisilanSirket);
      await AsyncStorage.setItem(Config.STORAGE_KEYS.KAMERA_BARKOD, kameraBarkod);
      await AsyncStorage.setItem(Config.STORAGE_KEYS.KAMERA_OKUMA, kameraOkuma);

      setOnLineCalisma(!hibrit);

      Alert.alert('Başarılı', 'Ayarlar kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* API URL Bölümü */}
      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>
          <Ionicons name="globe-outline" size={16} /> Bağlantı Ayarları
        </Text>

        <Text style={styles.label}>Harici API Adresi (WebApi1)</Text>
        <View style={styles.urlRow}>
          <TextInput
            style={[styles.input, styles.flex]}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="https://sunucu.com/webapi"
            placeholderTextColor={Colors.gray}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity
            style={styles.testBtn}
            onPress={sirketleriFetch}
            disabled={sirketYukleniyor}
          >
            <Ionicons
              name={sirketYukleniyor ? 'hourglass-outline' : 'sync-outline'}
              size={20}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Dahili API Adresi (WebApi2)</Text>
        <TextInput
          style={styles.input}
          value={apiUrl2}
          onChangeText={setApiUrl2}
          placeholder="http://192.168.1.1/webapi"
          placeholderTextColor={Colors.gray}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </View>

      {/* Çalışma Modu */}
      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>
          <Ionicons name="swap-horizontal-outline" size={16} /> Çalışma Modu
        </Text>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Hibrit Mod</Text>
            <Text style={styles.aciklama}>
              {hibrit ? 'Offline + Online karma çalışma' : 'Sadece online çalışma'}
            </Text>
          </View>
          <Switch
            value={hibrit}
            onValueChange={setHibrit}
            trackColor={{ false: Colors.border, true: Colors.accent }}
            thumbColor={Colors.white}
          />
        </View>
      </View>

      {/* Şirket Seçimi */}
      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>
          <Ionicons name="business-outline" size={16} /> Şirket
        </Text>
        {sirketListesi.length === 0 ? (
          <Text style={styles.aciklama}>
            Şirket listesi için önce API URL girin ve senkronize edin (↻).
          </Text>
        ) : (
          sirketListesi.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.secenekBtn,
                calisilanSirket === s && styles.secenekBtnSecili,
              ]}
              onPress={async () => {
                setCalisilanSirket(s);
                await AsyncStorage.setItem(Config.STORAGE_KEYS.CALISILANL_SIRKET, s);
              }}
            >
              <Ionicons
                name={calisilanSirket === s ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={calisilanSirket === s ? Colors.primary : Colors.gray}
              />
              <Text
                style={[
                  styles.secenekText,
                  calisilanSirket === s && styles.secenekTextSecili,
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Kamera Ayarları */}
      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>
          <Ionicons name="camera-outline" size={16} /> Barkod Okuyucu
        </Text>

        <Text style={styles.label}>Kamera Tipi</Text>
        <View style={styles.secenekRow}>
          {KAMERA_BARKOD_SECENEKLER.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.chipBtn,
                kameraBarkod === s.value && styles.chipBtnSecili,
              ]}
              onPress={() => setKameraBarkod(s.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  kameraBarkod === s.value && styles.chipTextSecili,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Okuma Modu</Text>
        <View style={styles.secenekRow}>
          {KAMERA_OKUMA_SECENEKLER.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.chipBtn,
                kameraOkuma === s.value && styles.chipBtnSecili,
              ]}
              onPress={() => setKameraOkuma(s.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  kameraOkuma === s.value && styles.chipTextSecili,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Kaydet Butonu */}
      <View style={styles.kaydetContainer}>
        <ThemedButton
          baslik="Ayarları Kaydet"
          onPress={handleKaydet}
          yukleniyor={kaydediliyor}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  bolum: {
    backgroundColor: Colors.white,
    margin: 12,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  bolumBaslik: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 6,
    marginTop: 10,
  },
  aciklama: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.black,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  testBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  secenekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  secenekBtnSecili: {
    backgroundColor: 'rgba(41,53,138,0.05)',
    borderRadius: 8,
  },
  secenekText: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  secenekTextSecili: {
    color: Colors.primary,
    fontWeight: '600',
  },
  secenekRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  chipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipBtnSecili: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.gray,
  },
  chipTextSecili: {
    color: Colors.white,
    fontWeight: '600',
  },
  kaydetContainer: {
    margin: 16,
    marginTop: 20,
    marginBottom: 40,
  },
});
