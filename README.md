# ETACep React Native

ETACep .NET MAUI uygulamasının Expo React Native versiyonu.

## Kurulum

```bash
cd ETACepRN
npm install
```

## Çalıştırma

```bash
# Expo Go ile test (geliştirme)
npx expo start

# Android
npx expo run:android

# iOS
npx expo run:ios
```

## Yapı

```
src/
├── constants/     # Renkler, config sabitleri
├── models/        # TypeScript interface'leri
├── api/           # Axios tabanlı API servisleri
├── store/         # Zustand global state
├── navigation/    # React Navigation (Stack + Drawer)
├── components/    # Ortak UI bileşenleri
└── screens/
    ├── auth/      # Login
    ├── ayarlar/   # Ayarlar
    └── main/      # Ana sayfa + Placeholder
```

## API Yapılandırma

1. Uygulamayı açın
2. Login ekranında **Bağlantı Ayarları**'na tıklayın
3. Harici API adresinizi girin (örn: `https://hrzoneapi.com`)
4. ↻ ile şirket listesini çekin, şirket seçin
5. **Ayarları Kaydet**'e tıklayın

## Kullanılan Teknolojiler

| Teknoloji | Açıklama |
|---|---|
| Expo 51 | Uygulama altyapısı |
| React Navigation 6 | Navigasyon (Stack + Drawer) |
| Axios | HTTP istekleri |
| Zustand | Global state yönetimi |
| AsyncStorage | Yerel veri saklama |
| React Native Paper | UI bileşenleri |
| @expo/vector-icons | İkonlar (Ionicons) |

## Mevcut Ekranlar

- ✅ **Login** — API kimlik doğrulama, Beni Hatırla
- ✅ **Ayarlar** — API URL, şirket seçimi, kamera ayarları
- ✅ **Ana Sayfa** — Yetki tabanlı hızlı erişim kartları, drawer menü

## Geliştirme Notları

- API versiyon: sadece `1.01.023`
- Renk paleti: Primary `#29358a`, Accent `#ffa500`
- Tüm API istekleri `src/api/authApi.ts` üzerinden
- Global state `src/store/appStore.ts` Zustand store'da
