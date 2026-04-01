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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../navigation/types';
import { useColors } from '../../contexts/ThemeContext';
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
} from '../../api/authApi';
import LoadingIndicator from '../../components/LoadingIndicator';
import ThemedButton from '../../components/ThemedButton';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginSayfasi({ navigation }: Props) {
  const Colors = useColors();
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
      const versiyonSonuc = await versiyonBilgileriniOku(Config.VERSIYON);
      if (versiyonSonuc.sonuc) {
        setVersiyon(versiyonSonuc.data);
        if (versiyonSonuc.data.kalanGunSayisi <= 0) {
          toast.error('Lisansınızın süresi dolmuştur. Lütfen yenileyin.');
          return;
        }
        if (versiyonSonuc.data.kalanGunSayisi <= 10) {
          toast.warning(`Lisansınızın bitmesine ${versiyonSonuc.data.kalanGunSayisi} gün kaldı.`);
        }
      }

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
            // -1 ise API'den gelen default ft'yi koru, değilse yetkiKodu ile eşleşeni bul
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: Colors.primary }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Başlık */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/eta-logo-white-red.png')}
            style={{ width: 120, height: 120 }}
            resizeMode="contain"
          />
          <Text style={styles.versiyon}>v{Config.VERSIYON}</Text>
        </View>

        {/* Form Kartı */}
        <View style={[styles.kart, { backgroundColor: Colors.card }]}>
          <Text style={[styles.kartBaslik, { color: Colors.primary }]}>Giriş Yap</Text>

          {/* Kullanıcı Kodu */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: Colors.text }]}>Kullanıcı Kodu</Text>
            <View style={[styles.inputRow, { borderColor: Colors.border, backgroundColor: Colors.inputBackground }]}>
              <Ionicons name="person-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: Colors.text }]}
                value={kullaniciKodu}
                onChangeText={setKullaniciKodu}
                placeholder="Kullanıcı kodunuzu giriniz"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Şifre */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: Colors.text }]}>Şifre</Text>
            <View style={[styles.inputRow, { borderColor: Colors.border, backgroundColor: Colors.inputBackground }]}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.flex, { color: Colors.text }]}
                value={sifre}
                onChangeText={setSifre}
                placeholder="Şifrenizi giriniz"
                placeholderTextColor={Colors.textSecondary}
                secureTextEntry={!sifreGoster}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleGiris}
              />
              <TouchableOpacity onPress={() => setSifreGoster(!sifreGoster)} style={styles.gozBtn}>
                <Ionicons
                  name={sifreGoster ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textSecondary}
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
            <Text style={[styles.hatirlaText, { color: Colors.text }]}>Beni Hatırla</Text>
          </View>

          {/* Hata Mesajı */}
          {hata ? (
            <View style={styles.hataContainer}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
              <Text style={[styles.hataText, { color: Colors.error }]}>{hata}</Text>
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
            <Text style={[styles.ayarlarText, { color: Colors.primary }]}>Bağlantı Ayarları</Text>
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
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    gap: 8,
  },
  appAdi: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  versiyon: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  kart: {
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
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
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
    fontSize: 14,
    fontWeight: '500',
  },
});
