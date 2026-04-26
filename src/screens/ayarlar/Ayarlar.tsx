import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../navigation/types';
import { useColors, useTheme, type TemaSecimi } from '../../contexts/ThemeContext';
import { PALETLER, type PaletKey } from '../../constants/Colors';
import { FONT_BOYUTU_ETIKETLERI, type FontBoyutu } from '../../utils/fontOlcek';
import { toast } from '../../components/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Config } from '../../constants/Config';
import { useAppStore } from '../../store/appStore';
import ThemedButton from '../../components/ThemedButton';
import DropdownSecim from '../../components/DropdownSecim';
import { sirketBilgileriniAl } from '../../api/authApi';
import * as Device from 'expo-device';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Ayarlar'>;
  route: RouteProp<RootStackParamList, 'Ayarlar'>;
};

export default function Ayarlar({ navigation, route }: Props) {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const { temaSecimi, setTemaSecimi, paletKey, setPaletKey, isDark, fontBoyutu, setFontBoyutu } = useTheme();
  const { sirketBilgileri, setSirketBilgileri, fiyatTipListesi, versiyon, uyumluluk, setUyumluluk } = useAppStore();

  const handleUyumlulukDegistir = (val: 'V8' | 'SQL') => {
    setUyumluluk(val);
    AsyncStorage.setItem(Config.STORAGE_KEYS.UYUMLULUK, val);
  };

  const [apiUrl, setApiUrl] = useState('');
  const [apiUrl2, setApiUrl2] = useState('');
  const [apiUrl3, setApiUrl3] = useState('');
  const [calisilanSirket, setCalisilanSirket] = useState('');
  const [sirketListesi, setSirketListesi] = useState<string[]>([]);
  const [sirketYukleniyor, setSirketYukleniyor] = useState(false);
  const [aktifApi, setAktifApi] = useState<'1' | '2' | '3'>('1');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [manuelTarama, setManuelTarama] = useState(false);
  const [baslangicZoom, setBaslangicZoom] = useState(0);
  const [miktarliGirisVarsayilan, setMiktarliGirisVarsayilan] = useState(false);
  const [varsayilanAramaTipi, setVarsayilanAramaTipi] = useState(3);
  const [sepetSes, setSepetSes] = useState(true);
  const [varsayilanFiyatNo, setVarsayilanFiyatNo] = useState(0);
  const [cihazId, setCihazId] = useState('');
  const [cihazAdi, setCihazAdi] = useState('');
  const fromLogin = route.params?.fromLogin === true;
  const scrollRef = useRef<ScrollView>(null);
  const headerHeight = useHeaderHeight();

  const generateUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });

  useEffect(() => {
    (async () => {
      const u1 = await AsyncStorage.getItem(Config.STORAGE_KEYS.API_URL);
      const u2 = await AsyncStorage.getItem(Config.STORAGE_KEYS.API_URL2);
      const u3 = await AsyncStorage.getItem(Config.STORAGE_KEYS.API_URL3);
      const sirket = await AsyncStorage.getItem(Config.STORAGE_KEYS.CALISILANL_SIRKET);

      const okumaModu = await AsyncStorage.getItem(Config.STORAGE_KEYS.KAMERA_OKUMA);
      const zoomStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.KAMERA_BASLANGIC_ZOOM);

      const aktifApiStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.AKTIF_API);
      if (aktifApiStr === '2') setAktifApi('2');
      else if (aktifApiStr === '3') setAktifApi('3');

      if (u1) setApiUrl(u1); else setApiUrl('http://45.84.189.173:52723');
      if (u2) setApiUrl2(u2); else setApiUrl2('http://212.252.132.158:4158');
      if (u3) setApiUrl3(u3);
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

      let kayitliCihazId = await AsyncStorage.getItem(Config.STORAGE_KEYS.CIHAZ_ID);
      if (!kayitliCihazId) {
        kayitliCihazId = generateUUID();
        await AsyncStorage.setItem(Config.STORAGE_KEYS.CIHAZ_ID, kayitliCihazId);
      }
      setCihazId(kayitliCihazId);

      const kayitliCihazAdi = await AsyncStorage.getItem(Config.STORAGE_KEYS.CIHAZ_ADI);
      if (kayitliCihazAdi) {
        setCihazAdi(kayitliCihazAdi);
      } else {
        const harfler = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const rastgeleAd = Array.from({ length: 6 }, () => harfler[Math.floor(Math.random() * harfler.length)]).join('');
        setCihazAdi(rastgeleAd);
        await AsyncStorage.setItem(Config.STORAGE_KEYS.CIHAZ_ADI, rastgeleAd);
      }

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
    const aktifUrl = aktifApi === '3' ? apiUrl3 : aktifApi === '2' ? apiUrl2 : apiUrl;
    if (!aktifUrl.trim()) {
      toast.error('Önce aktif API URL giriniz.');
      return;
    }
    setSirketYukleniyor(true);
    try {
      await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL, apiUrl.trim());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL2, apiUrl2.trim());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL3, apiUrl3.trim());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.AKTIF_API, aktifApi);
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
    setKaydediliyor(true);
    try {
      await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL, apiUrl.trim());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL2, apiUrl2.trim());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL3, apiUrl3.trim());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.AKTIF_API, aktifApi);
      await AsyncStorage.setItem(Config.STORAGE_KEYS.CALISILANL_SIRKET, calisilanSirket);
      await AsyncStorage.setItem(Config.STORAGE_KEYS.KAMERA_OKUMA, manuelTarama ? 'elle' : 'otomatik');
      await AsyncStorage.setItem(Config.STORAGE_KEYS.KAMERA_BASLANGIC_ZOOM, baslangicZoom.toString());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.MIKTARLI_GIRIS_VARSAYILAN, miktarliGirisVarsayilan.toString());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.VARSAYILAN_ARAMA_TIPI, varsayilanAramaTipi.toString());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.SEPET_SES, sepetSes.toString());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.VARSAYILAN_FIYAT_NO, varsayilanFiyatNo.toString());
      await AsyncStorage.setItem(Config.STORAGE_KEYS.CIHAZ_ADI, cihazAdi.trim());
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
    <ScrollView ref={scrollRef} style={[styles.container, { backgroundColor: Colors.background }]} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
      {/* API URL Bölümü */}
      <View style={[styles.bolum, { backgroundColor: Colors.card }]}>
        <Text style={[styles.bolumBaslik, { color: Colors.primary }]}>
          <Ionicons name="globe-outline" size={16} /> Bağlantı Ayarları
        </Text>

        {/* Aktif API Seçimi */}
        <View style={styles.apiSecimRow}>
          <TouchableOpacity
            style={[styles.apiSecimBtn, { borderColor: Colors.border, backgroundColor: Colors.inputBackground }, aktifApi === '1' && { borderColor: Colors.primary, backgroundColor: '#eef2ff' }]}
            onPress={() => setAktifApi('1')}
          >
            <Ionicons
              name={aktifApi === '1' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={aktifApi === '1' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.apiSecimText, { color: Colors.textSecondary }, aktifApi === '1' && { color: Colors.primary }]}>Dış (WebApi1)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.apiSecimBtn, { borderColor: Colors.border, backgroundColor: Colors.inputBackground }, aktifApi === '2' && { borderColor: Colors.primary, backgroundColor: '#eef2ff' }]}
            onPress={() => setAktifApi('2')}
          >
            <Ionicons
              name={aktifApi === '2' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={aktifApi === '2' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.apiSecimText, { color: Colors.textSecondary }, aktifApi === '2' && { color: Colors.primary }]}>Dış (WebApi2)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.apiSecimBtn, { borderColor: Colors.border, backgroundColor: Colors.inputBackground }, aktifApi === '3' && { borderColor: Colors.primary, backgroundColor: '#eef2ff' }]}
            onPress={() => setAktifApi('3')}
          >
            <Ionicons
              name={aktifApi === '3' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={aktifApi === '3' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.apiSecimText, { color: Colors.textSecondary }, aktifApi === '3' && { color: Colors.primary }]}>İç (WebApi3)</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: Colors.text }]}>Dış API Adresi (WebApi1)</Text>
        <TextInput
          style={[styles.input, { borderColor: Colors.border, backgroundColor: Colors.inputBackground, color: Colors.text }, aktifApi === '1' && { borderColor: Colors.primary }]}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="https://sunucu.com/webapi"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={[styles.label, { color: Colors.text }]}>Dış API Adresi (WebApi2)</Text>
        <TextInput
          style={[styles.input, { borderColor: Colors.border, backgroundColor: Colors.inputBackground, color: Colors.text }, aktifApi === '2' && { borderColor: Colors.primary }]}
          value={apiUrl2}
          onChangeText={setApiUrl2}
          placeholder="http://192.168.1.1/webapi"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={[styles.label, { color: Colors.text }]}>İç API Adresi (WebApi3)</Text>
        <TextInput
          style={[styles.input, { borderColor: Colors.border, backgroundColor: Colors.inputBackground, color: Colors.text }, aktifApi === '3' && { borderColor: Colors.primary }]}
          value={apiUrl3}
          onChangeText={setApiUrl3}
          placeholder="http://192.168.1.1/webapi"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <TouchableOpacity
          style={[styles.senkronBtn, { backgroundColor: Colors.primary }]}
          onPress={sirketleriFetch}
          disabled={sirketYukleniyor}
        >
          <Ionicons
            name={sirketYukleniyor ? 'hourglass-outline' : 'sync-outline'}
            size={18}
            color="#fff"
          />
          <Text style={styles.senkronBtnText}>
            {sirketYukleniyor ? 'Bağlanıyor...' : 'Bağlantıyı Test Et'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Şirket Seçimi */}
      <View style={[styles.bolum, { backgroundColor: Colors.card }]}>
        <Text style={[styles.bolumBaslik, { color: Colors.primary }]}>
          <Ionicons name="business-outline" size={16} /> Şirket
        </Text>
        {sirketListesi.length === 0 ? (
          <Text style={[styles.aciklama, { color: Colors.textSecondary }]}>
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
      <View style={[styles.bolum, { backgroundColor: Colors.card }]}>
        <Text style={[styles.bolumBaslik, { color: Colors.primary }]}>
          <Ionicons name="scan-outline" size={16} /> Tarayıcı Ayarları
        </Text>

        <View style={styles.taramaModRow}>
          <View style={styles.taramaModBilgi}>
            <Text style={[styles.label, { color: Colors.text }]}>Manuel Tarama</Text>
            <Text style={[styles.aciklama, { color: Colors.textSecondary }]}>
              {manuelTarama ? 'Barkod okunduğunda butona basarak onaylayın' : 'Barkod algılandığında otomatik okunur'}
            </Text>
          </View>
          <Switch
            value={manuelTarama}
            onValueChange={setManuelTarama}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <Text style={[styles.label, { marginTop: 16, color: Colors.text }]}>Başlangıç Zoom</Text>
        <View style={styles.zoomRow}>
          <Text style={[styles.zoomDeger, { color: Colors.primary }]}>{(1 + baslangicZoom * 9).toFixed(1)}x</Text>
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
        <Text style={[styles.aciklama, { color: Colors.textSecondary }]}>
          Kamera açıldığında bu zoom seviyesinden başlar. Kullanıcı isterse değiştirebilir.
        </Text>
      </View>

      {/* Genel Ayarlar */}
      <View style={[styles.bolum, { backgroundColor: Colors.card }]}>
        <Text style={[styles.bolumBaslik, { color: Colors.primary }]}>
          <Ionicons name="settings-outline" size={16} /> Genel Ayarlar
        </Text>

        <Text style={[styles.label, { color: Colors.text }]}>Tema</Text>
        <View style={styles.apiSecimGrup}>
          {([['sistem', 'Sistem'], ['light', 'Açık'], ['dark', 'Koyu']] as [TemaSecimi, string][]).map(([val, baslik]) => (
            <TouchableOpacity
              key={val}
              style={[styles.apiSecimBtn, { borderColor: Colors.border, backgroundColor: Colors.inputBackground }, temaSecimi === val && { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' }]}
              onPress={() => setTemaSecimi(val)}
            >
              <Ionicons
                name={temaSecimi === val ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={temaSecimi === val ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.apiSecimText, { color: Colors.textSecondary }, temaSecimi === val && { color: Colors.primary }]}>{baslik}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {Config.IS_PRO && (
          <>
            <Text style={[styles.label, { marginTop: 16, color: Colors.text }]}>
              <Ionicons name="color-palette-outline" size={14} /> Renk Paleti (Pro)
            </Text>
            <Text style={[styles.aciklama, { color: Colors.textSecondary, marginBottom: 8 }]}>
              Uygulama renklerini değiştirin. Seçim cihazınızda saklanır.
            </Text>
            <View style={styles.paletGrid}>
              {(Object.keys(PALETLER) as PaletKey[]).map((key) => {
                const palet = PALETLER[key];
                const onizleme = isDark ? palet.dark : palet.light;
                const secili = paletKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.paletKart,
                      { borderColor: Colors.border, backgroundColor: Colors.inputBackground },
                      secili && { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
                    ]}
                    onPress={() => setPaletKey(key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.paletSwatchRow}>
                      <View style={[styles.paletSwatch, { backgroundColor: onizleme.primary }]} />
                      <View style={[styles.paletSwatch, { backgroundColor: onizleme.accent }]} />
                      <View style={[styles.paletSwatch, { backgroundColor: onizleme.priceColor }]} />
                      <View style={[styles.paletSwatch, { backgroundColor: onizleme.background, borderWidth: 1, borderColor: Colors.border }]} />
                    </View>
                    <View style={styles.paletBilgi}>
                      <Text style={[styles.paletIsim, { color: secili ? Colors.primary : Colors.text }]}>
                        {palet.isim}
                      </Text>
                      <Text style={[styles.paletAciklama, { color: Colors.textSecondary }]} numberOfLines={1}>
                        {palet.aciklama}
                      </Text>
                    </View>
                    <Ionicons
                      name={secili ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={secili ? Colors.primary : Colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: 16, color: Colors.text }]}>
              <Ionicons name="text-outline" size={14} /> Yazı Boyutu (Pro)
            </Text>
            <Text style={[styles.aciklama, { color: Colors.textSecondary, marginBottom: 8 }]}>
              Uygulama genelinde yazı boyutunu büyütür.
            </Text>
            <View style={styles.apiSecimRow}>
              {(['varsayilan', 'orta', 'buyuk'] as FontBoyutu[]).map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.apiSecimBtn,
                    { borderColor: Colors.border, backgroundColor: Colors.inputBackground },
                    fontBoyutu === val && { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
                  ]}
                  onPress={() => setFontBoyutu(val)}
                >
                  <Ionicons
                    name={fontBoyutu === val ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={fontBoyutu === val ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.apiSecimText,
                      { color: Colors.textSecondary },
                      fontBoyutu === val && { color: Colors.primary },
                    ]}
                  >
                    {FONT_BOYUTU_ETIKETLERI[val]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 16, color: Colors.text }]}>
              <Ionicons name="git-branch-outline" size={14} /> Uyumluluk (Pro)
            </Text>
            <Text style={[styles.aciklama, { color: Colors.textSecondary, marginBottom: 8 }]}>
              V8: 3 kalem indirim alanı. SQL: 5 kalem indirim alanı.
            </Text>
            <View style={styles.apiSecimRow}>
              {(['V8', 'SQL'] as const).map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.apiSecimBtn,
                    { borderColor: Colors.border, backgroundColor: Colors.inputBackground },
                    uyumluluk === val && { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
                  ]}
                  onPress={() => handleUyumlulukDegistir(val)}
                >
                  <Ionicons
                    name={uyumluluk === val ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={uyumluluk === val ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.apiSecimText,
                      { color: Colors.textSecondary },
                      uyumluluk === val && { color: Colors.primary },
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={styles.taramaModRow}>
          <View style={styles.taramaModBilgi}>
            <Text style={[styles.label, { color: Colors.text }]}>Miktarlı Giriş Varsayılan</Text>
            <Text style={[styles.aciklama, { color: Colors.textSecondary }]}>
              {miktarliGirisVarsayilan
                ? 'Ekranlar açıldığında miktarlı giriş seçili gelir'
                : 'Ekranlar açıldığında miktarlı giriş kapalı gelir'}
            </Text>
          </View>
          <Switch
            value={miktarliGirisVarsayilan}
            onValueChange={setMiktarliGirisVarsayilan}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.taramaModRow, { marginTop: 16 }]}>
          <View style={styles.taramaModBilgi}>
            <Text style={[styles.label, { color: Colors.text }]}>Sepet Sesi</Text>
            <Text style={[styles.aciklama, { color: Colors.textSecondary }]}>
              {sepetSes
                ? 'Sepete ürün eklendiğinde ses çalar'
                : 'Sepete ürün eklendiğinde ses çalmaz'}
            </Text>
          </View>
          <Switch
            value={sepetSes}
            onValueChange={setSepetSes}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <Text style={[styles.label, { marginTop: 16, color: Colors.text }]}>Fiyat Gör - Varsayılan Fiyat No</Text>
        <Text style={[styles.aciklama, { color: Colors.textSecondary, marginBottom: 8 }]}>
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
          <Text style={[styles.aciklama, { color: Colors.textSecondary }]}>
            Fiyat tipleri giriş yapıldıktan sonra yüklenir.
          </Text>
        )}

        <Text style={[styles.label, { marginTop: 16, color: Colors.text }]}>Varsayılan Arama Tipi</Text>
        <Text style={[styles.aciklama, { color: Colors.textSecondary, marginBottom: 8 }]}>
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

      {/* Cihaz Bilgileri */}
      <View style={[styles.bolum, { backgroundColor: Colors.card }]}>
        <Text style={[styles.bolumBaslik, { color: Colors.primary }]}>
          <Ionicons name="phone-portrait-outline" size={16} /> Cihaz Bilgileri
        </Text>

        <Text style={[styles.label, { color: Colors.text }]}>Cihaz ID</Text>
        <TextInput
          style={[styles.input, { borderColor: Colors.border, backgroundColor: Colors.inputBackground, color: Colors.textSecondary }]}
          value={cihazId}
          editable={false}
          selectTextOnFocus
        />

        <Text style={[styles.label, { color: Colors.text }]}>Cihaz Adı</Text>
        <TextInput
          style={[styles.input, { borderColor: Colors.border, backgroundColor: Colors.inputBackground, color: Colors.text }]}
          value={cihazAdi}
          onChangeText={setCihazAdi}
          placeholder="Cihaz adını girin"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
        />

        {versiyon != null && (
          <>
            <Text style={[styles.label, { color: Colors.text }]}>Kalan Lisans Günü</Text>
            <TextInput
              style={[styles.input, { borderColor: Colors.border, backgroundColor: Colors.inputBackground, color: Colors.textSecondary }]}
              value={`${versiyon?.kalanGunSayisi ?? 0} gün`}
              editable={false}
            />
          </>
        )}
      </View>

    </ScrollView>

      {/* Kaydet Butonu */}
      <View style={[styles.kaydetContainer, { backgroundColor: Colors.background, paddingBottom: insets.bottom }]}>
        <ThemedButton
          baslik="Ayarları Kaydet"
          onPress={handleKaydet}
          yukleniyor={kaydediliyor}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
  },
  bolum: {
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
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  aciklama: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  apiSecimRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  apiSecimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  apiSecimText: {
    fontSize: 12,
    fontWeight: '600',
  },
  senkronBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  senkronBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    width: 44,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  kaydetContainer: {
    margin: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  paletGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  paletKart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  paletSwatchRow: {
    flexDirection: 'row',
    gap: 4,
  },
  paletSwatch: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  paletBilgi: {
    flex: 1,
  },
  paletIsim: {
    fontSize: 13,
    fontWeight: '700',
  },
  paletAciklama: {
    fontSize: 11,
    marginTop: 2,
  },
});
