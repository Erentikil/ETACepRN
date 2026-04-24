import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../navigation/types';
import { useColors, useTheme } from '../../contexts/ThemeContext';
import { toast } from '../../components/Toast';
import { Config } from '../../constants/Config';
import { useAppStore } from '../../store/appStore';
import {
  yetkiBilgileriniAl,
  menuYetkiBilgileriniAl,
  versiyonBilgileriniOku,
  sirketBilgileriniAl,
  kdvKisimBilgileriniAl,
  fisTipleriniAl,
  fiyatTipleriniAl,
  cihazKaydet,
} from '../../api/authApi';
import LoadingIndicator from '../../components/LoadingIndicator';
import ThemedButton from '../../components/ThemedButton';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginSayfasi({ navigation }: Props) {
  const Colors = useColors();
  const { isDark } = useTheme();
  const [kullaniciKodu, setKullaniciKodu] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreGoster, setSifreGoster] = useState(false);
  const [beniHatirla, setBeniHatirla] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [veriTabaniAdi, setVeriTabaniAdi] = useState('');

  const {
    setYetkiBilgileri,
    setMenuYetkiBilgileri,
    setVersiyon,
    setSirketBilgileri,
    setKdvBilgileri,
    setFtBaslikListesi,
    setFiyatTipListesi,
    setCalisilanSirket,
    setOnLineCalisma,
  } = useAppStore();

  // Kaydedilmiş bilgileri yükle
  useEffect(() => {
    (async () => {
      const kayitliKullanici = await AsyncStorage.getItem(Config.STORAGE_KEYS.KULLANICI_KODU);
      const kayitliSifre = await AsyncStorage.getItem(Config.STORAGE_KEYS.SIFRE);
      const kayitliBeniHatirla = await AsyncStorage.getItem(Config.STORAGE_KEYS.BENI_HATIRLA);
      const kayitliSirket = await AsyncStorage.getItem(Config.STORAGE_KEYS.CALISILANL_SIRKET);
      const calisma = await AsyncStorage.getItem(Config.STORAGE_KEYS.CALISMA_MODU);
      if (kayitliBeniHatirla === 'true') {
        setBeniHatirla(true);
        if (kayitliKullanici) setKullaniciKodu(kayitliKullanici);
        if (kayitliSifre) setSifre(kayitliSifre);
      } else {
        setKullaniciKodu('ETA');
        setSifre('ETA');
      }
      if (kayitliSirket) setVeriTabaniAdi(kayitliSirket);
      setOnLineCalisma(calisma !== 'Hibrit');

      // Varsayılan API axiosInstance içinde fallback olarak uygulanıyor,
      // ilk kurulumda da şirket listesini otomatik çek
      try {
        const sonuc = await sirketBilgileriniAl('');
        if (sonuc.sonuc) {
          setSirketBilgileri(sonuc.data);
          const secilenSirket =
            kayitliSirket ||
            sonuc.data.varsayilanSirket ||
            sonuc.data.sirketListesi?.[0] ||
            '';
          if (secilenSirket) {
            setVeriTabaniAdi(secilenSirket);
            await AsyncStorage.setItem(Config.STORAGE_KEYS.CALISILANL_SIRKET, secilenSirket);
          }
        }
      } catch {
        // Sessizce geç — bağlantı yoksa kullanıcı "Bağlantı ayarları"ndan ayarlayabilir
      }
    })();
  }, []);

  const handleGiris = async () => {
    if (!kullaniciKodu.trim()) {
      setHata('Kullanıcı kodu giriniz.');
      return;
    }
    if (!sifre.trim()) {
      setHata('Şifre giriniz.');
      return;
    }

    setHata('');
    setYukleniyor(true);

    try {
      const kayitliSirket = await AsyncStorage.getItem(Config.STORAGE_KEYS.CALISILANL_SIRKET);
      const dbAdi = kayitliSirket || veriTabaniAdi;

      const versiyonSonuc = await versiyonBilgileriniOku(Config.VERSIYON);
      const versiyonBilgi = versiyonSonuc.data;

      if (versiyonBilgi?.versiyonTipi !== Config.BEKLENEN_SUNUCU_VERSIYONU) {
        setHata(
          `Sunucu versiyonu uyumsuz. Beklenen: ${Config.BEKLENEN_SUNUCU_VERSIYONU}, dönen: ${versiyonBilgi?.versiyonTipi ?? 'yok'}.`,
        );
        return;
      }

      setVersiyon(versiyonBilgi);

      if (!versiyonSonuc.sonuc) {
        if (versiyonBilgi.kalanGunSayisi <= 0) {
          toast.error('Lisansınızın süresi dolmuştur. Lütfen yenileyin.');
          return;
        }
        if (versiyonBilgi.kalanGunSayisi <= 10) {
          toast.warning(`Lisansınızın bitmesine ${versiyonBilgi.kalanGunSayisi} gün kaldı.`);
        }
      }

      // 1. Yetki bilgilerini al
      const yetkiSonuc = await yetkiBilgileriniAl(kullaniciKodu, sifre, dbAdi);
      if (!yetkiSonuc.sonuc) {
        setHata(yetkiSonuc.mesaj || 'Kullanıcı adı veya şifre hatalı.');
        return;
      }
      setYetkiBilgileri(yetkiSonuc.data);

      // 2. Menü yetkilerini al
      const menuSonuc = await menuYetkiBilgileriniAl(kullaniciKodu, sifre, dbAdi);
      if (menuSonuc.sonuc) {
        setMenuYetkiBilgileri(menuSonuc.data);
      }

      // 3. Versiyon kontrolü
     

      // 4. Şirket bilgilerini al
      const sirketSonuc = await sirketBilgileriniAl(dbAdi);
      if (sirketSonuc.sonuc) {
        setSirketBilgileri(sirketSonuc.data);
        const sirket = dbAdi || sirketSonuc.data.varsayilanSirket;
        setCalisilanSirket(sirket);
        await AsyncStorage.setItem(Config.STORAGE_KEYS.CALISILANL_SIRKET, sirket);
      }

      // 5. KDV bilgileri
      try {
        const kdvSonuc = await kdvKisimBilgileriniAl(dbAdi);
        if (kdvSonuc.sonuc && kdvSonuc.data) setKdvBilgileri(kdvSonuc.data);
      } catch { }

      // 6. Fiş tipleri — yetkiBilgileri'ne göre default ft override
      try {
        const fisSonuc = await fisTipleriniAl(dbAdi);
        if (fisSonuc.sonuc && fisSonuc.data) {
          const yetki = yetkiSonuc.data;
          for (const ftb of fisSonuc.data) {
            let yetkiKodu = -1;
            switch (ftb.evrakTipi) {
              case 'Fatura':
                yetkiKodu = ftb.alimSatim.trim() === 'Alış' ? yetki.faturaAlis : yetki.faturasatis;
                break;
              case 'İrsaliye':
                yetkiKodu = ftb.alimSatim.trim() === 'Alış' ? yetki.irsaliyeAlis : yetki.irsaliyeSatis;
                break;
              case 'Sipariş':
                yetkiKodu = ftb.alimSatim.trim() === 'Alış' ? yetki.siparisAcmaAlis : yetki.siparisAcmaSatis;
                break;
              case 'Sipariş Kapama':
                yetkiKodu = yetki.siparisKapama;
                break;
              case 'Stok':
                if (ftb.alimSatim.trim() === 'Giriş') yetkiKodu = yetki.stokGiris;
                else if (ftb.alimSatim.trim() === 'Çıkış') yetkiKodu = yetki.stokCikis;
                else if (ftb.alimSatim.trim() === 'Sayım') yetkiKodu = yetki.sayim;
                break;
            }
            if (yetkiKodu >= 0) {
              const eslesen = ftb.ftListe.find((ft) => ft.fisTipiKodu === yetkiKodu);
              if (eslesen) ftb.ft = eslesen;
            }
          }
          setFtBaslikListesi(fisSonuc.data);
        }
      } catch { }

      // 7. Fiyat tipleri
      try {
        const fiyatSonuc = await fiyatTipleriniAl(dbAdi);
        if (fiyatSonuc.sonuc) setFiyatTipListesi(fiyatSonuc.data);
      } catch { }

      // Beni hatırla
      await AsyncStorage.setItem(Config.STORAGE_KEYS.KULLANICI_KODU, kullaniciKodu);
      await AsyncStorage.setItem(Config.STORAGE_KEYS.BENI_HATIRLA, beniHatirla ? 'true' : 'false');
      if (beniHatirla) {
        await AsyncStorage.setItem(Config.STORAGE_KEYS.SIFRE, sifre);
      } else {
        await AsyncStorage.removeItem(Config.STORAGE_KEYS.SIFRE);
      }

      
      

      // Ana sayfaya yönlendir
      navigation.replace('Drawer');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: unknown }; message?: string };
      const sunucuData = axiosErr?.response?.data;
      const sunucuMesaj = sunucuData && typeof sunucuData === 'object' && 'mesaj' in sunucuData
        ? (sunucuData as { mesaj: string }).mesaj
        : null;
      const mesaj = sunucuMesaj || axiosErr?.message || 'Bir hata oluştu.';
      const statusPrefix = axiosErr?.response?.status ? `[${axiosErr.response.status}] ` : '';
      setHata(`${statusPrefix}${mesaj}`);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={isDark
                ? require('../../../assets/eta-logo-white-red.png')
                : require('../../../assets/eta-logo-blue.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Başlık */}
          <View style={styles.titleContainer}>
            <Text style={[styles.titleETA, { color: Colors.primary }]}>ETA </Text>
            <Text style={[styles.titleMobil, { color: Colors.accent }]}>Mobil</Text>
          </View>
          {/* <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Horizon</Text> */}

          {/* Kullanıcı Kodu */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: Colors.primary }]}>Kullanıcı kodu</Text>
            <View style={[styles.inputWrapper, { backgroundColor: Colors.inputBackground, borderColor: Colors.border }]}>
              <Ionicons name="person-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: Colors.text }]}
                value={kullaniciKodu}
                onChangeText={setKullaniciKodu}
                placeholder="Kullanıcı kodunuzu girin"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Şifre */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: Colors.primary }]}>Şifre</Text>
            <View style={[styles.inputWrapper, { backgroundColor: Colors.inputBackground, borderColor: Colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.flex, { color: Colors.text }]}
                value={sifre}
                onChangeText={setSifre}
                placeholder="Şifrenizi girin"
                placeholderTextColor={Colors.textSecondary}
                secureTextEntry={!sifreGoster}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleGiris}
              />
              <TouchableOpacity
                onPress={() => setSifreGoster(!sifreGoster)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={sifreGoster ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Beni Hatırla */}
          <View style={styles.rememberContainer}>
            <Switch
              value={beniHatirla}
              onValueChange={setBeniHatirla}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
              ios_backgroundColor={Colors.border}
            />
            <Text style={[styles.rememberText, { color: Colors.textSecondary }]}>Beni hatırla</Text>
          </View>

          {/* Hata Mesajı */}
          {hata ? (
            <View style={[styles.hataContainer, { borderColor: Colors.error }]}>
              <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
              <Text style={[styles.hataText, { color: Colors.error }]}>{hata}</Text>
            </View>
          ) : null}

          {/* Giriş Butonu */}
          <ThemedButton
            baslik="Giriş yap"
            onPress={handleGiris}
            yukleniyor={yukleniyor}
            style={styles.loginButton}
          />

          {/* Bağlantı Ayarları */}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Ayarlar', { fromLogin: true })}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-down-outline" size={14} color={Colors.textSecondary} />
            <Text style={[styles.settingsText, { color: Colors.textSecondary }]}>Bağlantı ayarları</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingIndicator visible={yukleniyor} mesaj="Giriş yapılıyor..." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 6,
  },
  logoImage: {
    width: 80,
    height: 80,
  },

  // Başlık
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 38,
  },
  titleETA: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  titleMobil: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 36,
  },

  // Form Alanları
  fieldContainer: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },

  // Beni Hatırla
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
    gap: 8,
  },
  rememberText: {
    fontSize: 13,
  },

  // Hata
  hataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(229, 57, 53, 0.06)',
  },
  hataText: {
    fontSize: 13,
    flex: 1,
  },

  // Giriş Butonu
  loginButton: {
    borderRadius: 14,
  },

  // Bağlantı Ayarları
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  settingsText: {
    fontSize: 13,
  },
});
