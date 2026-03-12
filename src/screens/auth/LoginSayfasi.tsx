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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/Colors';
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
} from '../../api/authApi';
import LoadingIndicator from '../../components/LoadingIndicator';
import ThemedButton from '../../components/ThemedButton';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginSayfasi({ navigation }: Props) {
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

      if (kayitliKullanici) setKullaniciKodu(kayitliKullanici);
      if (kayitliSifre && kayitliBeniHatirla === 'true') setSifre(kayitliSifre);
      if (kayitliBeniHatirla === 'true') setBeniHatirla(true);
      if (kayitliSirket) setVeriTabaniAdi(kayitliSirket);
      setOnLineCalisma(calisma !== 'Hibrit');
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

    const apiUrl = await AsyncStorage.getItem(Config.STORAGE_KEYS.API_URL);
    if (!apiUrl) {
      Alert.alert(
        'Ayarlar Eksik',
        'Lütfen önce API adresini ayarlar ekranından giriniz.',
        [{ text: 'Ayarlara Git', onPress: () => navigation.navigate('Ayarlar', { fromLogin: true }) }]
      );
      return;
    }

    setHata('');
    setYukleniyor(true);

    try {
      const kayitliSirket = await AsyncStorage.getItem(Config.STORAGE_KEYS.CALISILANL_SIRKET);
      const dbAdi = kayitliSirket || veriTabaniAdi;

      // 1. Yetki bilgilerini al
      const yetkiSonuc = await yetkiBilgileriniAl(kullaniciKodu, sifre, dbAdi);
     // console.log("YETKİ SONUÇ:" + yetkiSonuc.mesaj + yetkiSonuc.sonuc)
      if (!yetkiSonuc.sonuc) {
        setHata(yetkiSonuc.mesaj || 'Kullanıcı adı veya şifre hatalı.');
        return;
      }
      setYetkiBilgileri(yetkiSonuc.data);

      // 2. Menü yetkilerini al
      const menuSonuc = await menuYetkiBilgileriniAl(kullaniciKodu, sifre, dbAdi);
     // console.log("MENU SONUÇ:" +menuSonuc.mesaj + menuSonuc.sonuc)
      if (menuSonuc.sonuc) {
        setMenuYetkiBilgileri(menuSonuc.data);
      }

      // 3. Versiyon kontrolü
      const versiyonSonuc = await versiyonBilgileriniOku(Config.VERSIYON);
     // console.log("VERSİYON SONUÇ:" + versiyonSonuc.mesaj + versiyonSonuc.sonuc)
      if (versiyonSonuc.sonuc) {
        setVersiyon(versiyonSonuc.data);
        if (versiyonSonuc.data.kalanGunSayisi <= 0) {
          Alert.alert('Lisans', 'Lisansınızın süresi dolmuştur. Lütfen yenileyin.');
          return;
        }
        if (versiyonSonuc.data.kalanGunSayisi <= 10) {
          Alert.alert(
            'Lisans Uyarısı',
            `Lisansınızın bitmesine ${versiyonSonuc.data.kalanGunSayisi} gün kaldı.`
          );
        }
      }

      // 4. Şirket bilgilerini al
      const sirketSonuc = await sirketBilgileriniAl(dbAdi);
    //  console.log("ŞİRKET SONUÇ" +sirketSonuc.mesaj + sirketSonuc.sonuc)
      if (sirketSonuc.sonuc) {
        setSirketBilgileri(sirketSonuc.data);
        const sirket = veriTabaniAdi || sirketSonuc.data.varsayilanSirket || dbAdi;
        setCalisilanSirket(sirket);
        await AsyncStorage.setItem(Config.STORAGE_KEYS.CALISILANL_SIRKET, sirket);
      }

      // 5. KDV bilgileri
      try {
        const kdvSonuc = await kdvKisimBilgileriniAl(dbAdi);
        if (kdvSonuc.sonuc) setKdvBilgileri({ kdvListesi: kdvSonuc.data });
      } catch (e) { console.log('KDV hata:', e); }

      // 6. Fiş tipleri
      try {
        const fisSonuc = await fisTipleriniAl(dbAdi);
        if (fisSonuc.sonuc) setFtBaslikListesi(fisSonuc.data);
      } catch (e) { console.log('Fiş hata:', e); }

      // 7. Fiyat tipleri
      try {
        const fiyatSonuc = await fiyatTipleriniAl(dbAdi);
        if (fiyatSonuc.sonuc) setFiyatTipListesi(fiyatSonuc.data);
      } catch (e) { console.log('Fiyat hata:', e); }

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
      console.log('[handleGiris] CATCH err:', err);
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Başlık */}
        <View style={styles.logoContainer}>
          <Ionicons name="business" size={64} color={Colors.white} />
          <Text style={styles.appAdi}>ETACep</Text>
          <Text style={styles.versiyon}>v{Config.VERSIYON}</Text>
        </View>

        {/* Form Kartı */}
        <View style={styles.kart}>
          <Text style={styles.kartBaslik}>Giriş Yap</Text>

          {/* Kullanıcı Kodu */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Kullanıcı Kodu</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={Colors.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={kullaniciKodu}
                onChangeText={setKullaniciKodu}
                placeholder="Kullanıcı kodunuzu giriniz"
                placeholderTextColor={Colors.gray}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Şifre */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Şifre</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.gray} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.flex]}
                value={sifre}
                onChangeText={setSifre}
                placeholder="Şifrenizi giriniz"
                placeholderTextColor={Colors.gray}
                secureTextEntry={!sifreGoster}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleGiris}
              />
              <TouchableOpacity onPress={() => setSifreGoster(!sifreGoster)} style={styles.gozBtn}>
                <Ionicons
                  name={sifreGoster ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.gray}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Beni Hatırla */}
          <View style={styles.hatirlaRow}>
            <Switch
              value={beniHatirla}
              onValueChange={setBeniHatirla}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
            <Text style={styles.hatirlaText}>Beni Hatırla</Text>
          </View>

          {/* Hata Mesajı */}
          {hata ? (
            <View style={styles.hataContainer}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
              <Text style={styles.hataText}>{hata}</Text>
            </View>
          ) : null}

          {/* Giriş Butonu */}
          <ThemedButton
            baslik="Giriş Yap"
            onPress={handleGiris}
            yukleniyor={yukleniyor}
            style={styles.girisBtn}
          />

          {/* Ayarlar Butonu */}
          <TouchableOpacity
            style={styles.ayarlarBtn}
            onPress={() => navigation.navigate('Ayarlar', { fromLogin: true })}
          >
            <Ionicons name="settings-outline" size={16} color={Colors.primary} />
            <Text style={styles.ayarlarText}>Bağlantı Ayarları</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LoadingIndicator visible={yukleniyor} mesaj="Giriş yapılıyor..." />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.primary,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    gap: 8,
  },
  appAdi: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  versiyon: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  kart: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  kartBaslik: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.black,
    paddingVertical: 12,
  },
  gozBtn: {
    padding: 4,
  },
  hatirlaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    marginTop: 4,
  },
  hatirlaText: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  hataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fdecea',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  hataText: {
    color: Colors.error,
    fontSize: 13,
    flex: 1,
  },
  girisBtn: {
    marginTop: 4,
  },
  ayarlarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    padding: 8,
  },
  ayarlarText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});
