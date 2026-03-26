import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/Colors';
import { toast } from '../../components/Toast';
import { Config } from '../../constants/Config';
import { useAppStore } from '../../store/appStore';
import ThemedButton from '../../components/ThemedButton';
import DropdownSecim from '../../components/DropdownSecim';
import { sirketBilgileriniAl } from '../../api/authApi';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Ayarlar'>;
  route: RouteProp<RootStackParamList, 'Ayarlar'>;
};

export default function Ayarlar({ navigation, route }: Props) {
  const { sirketBilgileri, setSirketBilgileri, setCalisilanSirket: storeSetCalisilanSirket, fiyatTipListesi } = useAppStore();

  const [apiUrl, setApiUrl] = useState('');
  const [apiUrl2, setApiUrl2] = useState('');
  const [calisilanSirket, setCalisilanSirket] = useState('');
  const [sirketListesi, setSirketListesi] = useState<string[]>([]);
  const [sirketYukleniyor, setSirketYukleniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [manuelTarama, setManuelTarama] = useState(false);
  const [baslangicZoom, setBaslangicZoom] = useState(0);
  const [miktarliGirisVarsayilan, setMiktarliGirisVarsayilan] = useState(false);
  const [varsayilanAramaTipi, setVarsayilanAramaTipi] = useState(3);
  const [sepetSes, setSepetSes] = useState(true);
  const [varsayilanFiyatNo, setVarsayilanFiyatNo] = useState(0);
  const fromLogin = route.params?.fromLogin === true;

  useEffect(() => {
    (async () => {
      const u1 = await AsyncStorage.getItem(Config.STORAGE_KEYS.API_URL);
      const u2 = await AsyncStorage.getItem(Config.STORAGE_KEYS.API_URL2);
      const sirket = await AsyncStorage.getItem(Config.STORAGE_KEYS.CALISILANL_SIRKET);

      const okumaModu = await AsyncStorage.getItem(Config.STORAGE_KEYS.KAMERA_OKUMA);
      const zoomStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.KAMERA_BASLANGIC_ZOOM);

      if (u1) setApiUrl(u1);
      if (u2) setApiUrl2(u2);
      if (sirket) setCalisilanSirket(sirket);
      if (okumaModu === 'elle') setManuelTarama(true);
      if (zoomStr) setBaslangicZoom(parseFloat(zoomStr) || 0);

      const miktarliStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.MIKTARLI_GIRIS_VARSAYILAN);
      if (miktarliStr === 'true') setMiktarliGirisVarsayilan(true);

      const aramaTipiStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.VARSAYILAN_ARAMA_TIPI);
      if (aramaTipiStr !== null) setVarsayilanAramaTipi(parseInt(aramaTipiStr, 10));

      const sepetSesStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.SEPET_SES);
      if (sepetSesStr === 'false') setSepetSes(false);

      const fiyatNoStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.VARSAYILAN_FIYAT_NO);
      if (fiyatNoStr !== null) setVarsayilanFiyatNo(parseInt(fiyatNoStr, 10));

      if (sirketBilgileri?.sirketListesi) {
        setSirketListesi(sirketBilgileri.sirketListesi);
      }

      // Login'den gelindiyse ve API URL varsa otomatik şirket listesini çek
      if (fromLogin && u1?.trim()) {
        setSirketYukleniyor(true);
        try {
          const sonuc = await sirketBilgileriniAl("");
          if (sonuc.sonuc) {
            setSirketListesi(sonuc.data.sirketListesi);
            setSirketBilgileri(sonuc.data);
            if (sonuc.data.varsayilanSirket && !sirket) {
              setCalisilanSirket(sonuc.data.varsayilanSirket);
              await AsyncStorage.setItem(Config.STORAGE_KEYS.CALISILANL_SIRKET, sonuc.data.varsayilanSirket);
            }
          }
        } catch (_) {
          // Sessizce geç — kullanıcı manuel sync yapabilir
        } finally {
          setSirketYukleniyor(false);
        }
      }
    })();
  }, []);

  const sirketleriFetch = async () => {
    if (!apiUrl.trim()) {
      toast.error('Önce API URL giriniz.');
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
        toast.success(`${sonuc.data.sirketListesi?.length ?? 0} şirket bulundu.`);
      } else {
        toast.error(sonuc.mesaj || 'Bilinmeyen hata');
      }
    } catch (err: unknown) {
      const mesaj = err instanceof Error ? err.message : 'Bağlantı hatası.';
      toast.error(mesaj);
    } finally {
      setSirketYukleniyor(false);
    }
  };

  const handleKaydet = async () => {
    if (!apiUrl.trim()) {
      toast.error('API URL zorunludur.');
      return;
    }
    setKaydediliyor(true);
    try {
      await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL, apiUrl.trim());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL2, apiUrl2.trim());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.CALISILANL_SIRKET, calisilanSirket);
      await AsyncStorage.setItem(Config.STORAGE_KEYS.KAMERA_OKUMA, manuelTarama ? 'elle' : 'otomatik');
      await AsyncStorage.setItem(Config.STORAGE_KEYS.KAMERA_BASLANGIC_ZOOM, baslangicZoom.toString());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.MIKTARLI_GIRIS_VARSAYILAN, miktarliGirisVarsayilan.toString());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.VARSAYILAN_ARAMA_TIPI, varsayilanAramaTipi.toString());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.SEPET_SES, sepetSes.toString());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.VARSAYILAN_FIYAT_NO, varsayilanFiyatNo.toString());
      // Store'u da güncelle ki yeniden giriş yapmaya gerek kalmasın
      storeSetCalisilanSirket(calisilanSirket);

      Alert.alert('Başarılı', 'Ayarlar kaydedildi.', [
        {
          text: 'Tamam',
          onPress: () => {
            if (fromLogin) {
              navigation.goBack();
            } else {
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
          },
        },
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
          <DropdownSecim
            value={calisilanSirket}
            options={sirketListesi.map((s) => ({ label: s, value: s }))}
            placeholder="Şirket seçiniz..."
            onChange={async (s) => {
              setCalisilanSirket(s);
              await AsyncStorage.setItem(Config.STORAGE_KEYS.CALISILANL_SIRKET, s);
            }}
          />
        )}
      </View>

      {/* Tarayıcı Ayarları */}
      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>
          <Ionicons name="scan-outline" size={16} /> Tarayıcı Ayarları
        </Text>

        <View style={styles.taramaModRow}>
          <View style={styles.taramaModBilgi}>
            <Text style={styles.label}>Manuel Tarama</Text>
            <Text style={styles.aciklama}>
              {manuelTarama ? 'Barkod okunduğunda butona basarak onaylayın' : 'Barkod algılandığında otomatik okunur'}
            </Text>
          </View>
          <Switch
            value={manuelTarama}
            onValueChange={setManuelTarama}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Başlangıç Zoom</Text>
        <View style={styles.zoomRow}>
          <Text style={styles.zoomDeger}>{(1 + baslangicZoom * 9).toFixed(1)}x</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            value={baslangicZoom}
            onValueChange={setBaslangicZoom}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={Colors.primary}
          />
        </View>
        <Text style={styles.aciklama}>
          Kamera açıldığında bu zoom seviyesinden başlar. Kullanıcı isterse değiştirebilir.
        </Text>
      </View>

      {/* Genel Ayarlar */}
      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>
          <Ionicons name="settings-outline" size={16} /> Genel Ayarlar
        </Text>

        <View style={styles.taramaModRow}>
          <View style={styles.taramaModBilgi}>
            <Text style={styles.label}>Miktarlı Giriş Varsayılan</Text>
            <Text style={styles.aciklama}>
              {miktarliGirisVarsayilan
                ? 'Ekranlar açıldığında miktarlı giriş seçili gelir'
                : 'Ekranlar açıldığında miktarlı giriş kapalı gelir'}
            </Text>
          </View>
          <Switch
            value={miktarliGirisVarsayilan}
            onValueChange={setMiktarliGirisVarsayilan}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>

        <View style={[styles.taramaModRow, { marginTop: 16 }]}>
          <View style={styles.taramaModBilgi}>
            <Text style={styles.label}>Sepet Sesi</Text>
            <Text style={styles.aciklama}>
              {sepetSes
                ? 'Sepete ürün eklendiğinde ses çalar'
                : 'Sepete ürün eklendiğinde ses çalmaz'}
            </Text>
          </View>
          <Switch
            value={sepetSes}
            onValueChange={setSepetSes}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Fiyat Gör - Varsayılan Fiyat No</Text>
        <Text style={styles.aciklama}>
          Fiyat Gör sayfasında stoklara girildiğinde öncelikli gösterilecek fiyat tipi
        </Text>
        {fiyatTipListesi.length > 0 ? (
          <DropdownSecim
            value={varsayilanFiyatNo.toString()}
            options={fiyatTipListesi.map((f) => ({ label: `${f.fiyatNo} - ${f.fiyatAdi}`, value: f.fiyatNo.toString() }))}
            placeholder="Fiyat tipi seçiniz..."
            onChange={(v) => setVarsayilanFiyatNo(parseInt(v, 10))}
          />
        ) : (
          <Text style={styles.aciklama}>
            Fiyat tipleri giriş yapıldıktan sonra yüklenir.
          </Text>
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>Varsayılan Arama Tipi</Text>
        <Text style={styles.aciklama}>
          Alış/Satış işlemlerinde stok ararken varsayılan arama kriteri
        </Text>
        <DropdownSecim
          value={varsayilanAramaTipi.toString()}
          options={[
            { label: 'Başlayan', value: '1' },
            { label: 'Biten', value: '2' },
            { label: 'İçeren', value: '3' },
            { label: 'Barkod', value: '4' },
          ]}
          placeholder="Arama tipi seçiniz..."
          onChange={(v) => setVarsayilanAramaTipi(parseInt(v, 10))}
        />
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
  taramaModRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  taramaModBilgi: {
    flex: 1,
    marginRight: 12,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  zoomDeger: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    width: 44,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  kaydetContainer: {
    margin: 16,
    marginTop: 20,
    marginBottom: 40,
  },
});
