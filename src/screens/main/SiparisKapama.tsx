import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, DrawerParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { cariAcmaHareketleriniAl, siparisKapamaKaydet } from '../../api/siparisKapamaApi';
import { fisTipleriniAl, generateGuid } from '../../api/hizliIslemlerApi';
import { Colors } from '../../constants/Colors';
import { paraTL, miktarFormat } from '../../utils/format';
import type {
  AcmaSiparisHareketBilgileri,
  KapatmaHareketBilgileri,
  CariKartBilgileri,
  FisTipiGrup,
  FisTipiItem,
  StokListesiBilgileri,
} from '../../models';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<DrawerParamList, 'SiparisKapama'>;

// ─── Kapama sepet kalemi ─────────────────────────────────────────────────────
interface KapamaSepetKalem {
  stokKodu: string;
  stokCinsi: string;
  barkod: string;
  birim: string;
  depoKodu: string;
  fiyat: number;
  miktar: number;
  kdvOrani: number;
  siparisTakipNo: string;
}

function formatTarih(tarih: string): string {
  try {
    const d = new Date(tarih);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return tarih;
  }
}

export default function SiparisKapama() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { yetkiBilgileri, calisilanSirket } = useAppStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [secilenCari, setSecilenCari] = useState<CariKartBilgileri | null>(null);
  const [acmaListesi, setAcmaListesi] = useState<AcmaSiparisHareketBilgileri[]>([]);
  const [kapamaSepeti, setKapamaSepeti] = useState<KapamaSepetKalem[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [aktifTab, setAktifTab] = useState<'acma' | 'kapama'>('acma');
  const [aramaMetni, setAramaMetni] = useState('');

  // FisTipi
  const [kapamaGruplari, setKapamaGruplari] = useState<FisTipiGrup[]>([]);
  const [secilenGrup, setSecilenGrup] = useState<FisTipiGrup | null>(null);
  const [secilenFisTipi, setSecilenFisTipi] = useState<FisTipiItem | null>(null);

  // Miktar modal
  const [miktarModalGorunur, setMiktarModalGorunur] = useState(false);
  const [modalHedef, setModalHedef] = useState<{
    tip: 'acma';
    ashb: AcmaSiparisHareketBilgileri;
  } | {
    tip: 'kapama';
    kalem: KapamaSepetKalem;
  } | null>(null);
  const [modalMiktar, setModalMiktar] = useState('');

  // Kayıt sonrası refno
  const [refno, setRefno] = useState(0);

  // ── CariSecim'den geri dönünce ─────────────────────────────────────────────
  useEffect(() => {
    if (route.params?.secilenCari) {
      setSecilenCari(route.params.secilenCari);
    }
  }, [route.params?.secilenCari]);

  // ── FisTipi gruplarını al ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const sonuc = await fisTipleriniAl(calisilanSirket);
        if (sonuc.sonuc && sonuc.data) {
          const gruplar = sonuc.data.filter((g) =>
            g.evrakTipi.trim().toLowerCase().includes('kapama')
          );
          setKapamaGruplari(gruplar);
          if (gruplar.length > 0) {
            setSecilenGrup(gruplar[0]);
            if (gruplar[0].ftListe?.length > 0) {
              setSecilenFisTipi(gruplar[0].ftListe[0]);
            }
          }
        }
      } catch {}
    })();
  }, [calisilanSirket]);

  // ── Cari seçilince açma hareketlerini çek ──────────────────────────────────
  useEffect(() => {
    if (!secilenCari || !secilenGrup) return;
    acmaHareketleriniYukle(secilenCari);
  }, [secilenCari, secilenGrup]);

  const acmaHareketleriniYukle = useCallback(
    async (cari: CariKartBilgileri) => {
      if (!secilenGrup) return;
      setYukleniyor(true);
      try {
        const alSat = secilenGrup.alimSatim.trim() === 'Alış' ? 1 : 2;
        const sonuc = await cariAcmaHareketleriniAl(cari.cariKodu, calisilanSirket, alSat);
        if (sonuc.sonuc) {
          setAcmaListesi(
            (sonuc.data ?? []).map((item) => ({
              ...item,
              sepetMiktar: item.sepetMiktar ?? 0,
              tesMiktar: item.tesMiktar ?? 0,
              kalMiktar: item.kalMiktar ?? 0,
              miktar: item.miktar ?? 0,
              fiyat: item.fiyat ?? 0,
              carpan: item.carpan ?? 0,
              kdvOrani: item.kdvOrani ?? 0,
            }))
          );
        } else {
          Alert.alert('Hata', sonuc.mesaj || 'Sipariş hareketleri alınamadı.');
        }
      } catch {
        Alert.alert('Hata', 'Bağlantı hatası oluştu.');
      } finally {
        setYukleniyor(false);
      }
    },
    [calisilanSirket, secilenGrup]
  );

  // ── Hesaplanmış alanlar ────────────────────────────────────────────────────
  const kalanMiktar = (ashb: AcmaSiparisHareketBilgileri) =>
    ashb.kalMiktar - ashb.sepetMiktar;
  const teslimEdilenMiktar = (ashb: AcmaSiparisHareketBilgileri) =>
    ashb.tesMiktar + ashb.sepetMiktar;

  // ── Açma listesinde satır rengi ────────────────────────────────────────────
  const satirRengi = (ashb: AcmaSiparisHareketBilgileri): string => {
    if (kalanMiktar(ashb) <= 0) return '#d5ffea';
    if (ashb.sepetMiktar > 0) return '#faf3cf';
    return '#ffffff';
  };

  // ── Sipariş Ekle (açma → kapama) ──────────────────────────────────────────
  const siparisEkle = (ashb: AcmaSiparisHareketBilgileri, miktar: number) => {
    // Miktar kontrolü
    if (miktar + ashb.sepetMiktar > ashb.kalMiktar) {
      Alert.alert('Uyarı', 'Ürün miktarı sipariş miktarından büyük olamaz.');
      return;
    }

    // Açma listesinde sepetMiktar güncelle
    setAcmaListesi((prev) =>
      prev.map((item) =>
        item.takipNo === ashb.takipNo
          ? { ...item, sepetMiktar: item.sepetMiktar + miktar }
          : item
      )
    );

    // Kapama sepetine ekle veya miktarını artır
    setKapamaSepeti((prev) => {
      const mevcut = prev.find((k) => k.siparisTakipNo === ashb.takipNo);
      if (mevcut) {
        return prev.map((k) =>
          k.siparisTakipNo === ashb.takipNo
            ? { ...k, miktar: k.miktar + miktar }
            : k
        );
      }
      return [
        ...prev,
        {
          stokKodu: ashb.stokKodu,
          stokCinsi: ashb.stokCinsi,
          barkod: '',
          birim: ashb.birim ?? '',
          depoKodu: ashb.depo ?? '',
          fiyat: ashb.fiyat,
          miktar,
          kdvOrani: ashb.kdvOrani,
          siparisTakipNo: ashb.takipNo,
        },
      ];
    });
  };

  // ── Kapama kaleminin miktarını düzenle ─────────────────────────────────────
  const kapamaMiktarDuzenle = (kalem: KapamaSepetKalem, yeniMiktar: number) => {
    const fark = yeniMiktar - kalem.miktar;

    // Açma listesinde ilgili satırı bul
    const ashb = acmaListesi.find((a) => a.takipNo === kalem.siparisTakipNo);
    if (ashb && fark > 0 && ashb.sepetMiktar + fark > ashb.kalMiktar) {
      Alert.alert('Uyarı', 'Ürün miktarı sipariş miktarından büyük olamaz.');
      return;
    }

    // Açma listesinde sepetMiktar güncelle
    setAcmaListesi((prev) =>
      prev.map((item) =>
        item.takipNo === kalem.siparisTakipNo
          ? { ...item, sepetMiktar: item.sepetMiktar + fark }
          : item
      )
    );

    setKapamaSepeti((prev) =>
      prev.map((k) =>
        k.siparisTakipNo === kalem.siparisTakipNo
          ? { ...k, miktar: yeniMiktar }
          : k
      )
    );
  };

  // ── Kapama kalemini sil ────────────────────────────────────────────────────
  const kapamaKalemSil = (kalem: KapamaSepetKalem) => {
    // Açma listesinde sepetMiktar'ı geri al
    setAcmaListesi((prev) =>
      prev.map((item) =>
        item.takipNo === kalem.siparisTakipNo
          ? { ...item, sepetMiktar: item.sepetMiktar - kalem.miktar }
          : item
      )
    );
    setKapamaSepeti((prev) =>
      prev.filter((k) => k.siparisTakipNo !== kalem.siparisTakipNo)
    );
  };

  // ── Evrak Kaydet ───────────────────────────────────────────────────────────
  const evrakKaydet = async () => {
    if (!secilenCari) {
      Alert.alert('Uyarı', 'Lütfen cari seçiniz.');
      return;
    }
    if (kapamaSepeti.length === 0) {
      Alert.alert('Uyarı', 'Kapama sepeti boş.');
      return;
    }
    if (!secilenFisTipi) {
      Alert.alert('Uyarı', 'Fiş tipi bulunamadı.');
      return;
    }

    setKaydediliyor(true);
    try {
      const khbListe: KapatmaHareketBilgileri[] = kapamaSepeti.map((k) => ({
        birim: k.birim,
        depoKodu: k.depoKodu,
        fiyat: k.fiyat,
        kdvOrani: k.kdvOrani,
        miktar: k.miktar,
        stokCinsi: k.stokCinsi,
        stokKodu: k.stokKodu,
        takipNo: k.siparisTakipNo,
      }));

      const sonuc = await siparisKapamaKaydet(
        {
          guid: generateGuid(),
          khbListe,
          ckb: { cariKodu: secilenCari.cariKodu, cariUnvan: secilenCari.cariUnvan },
          fisTipi: secilenFisTipi.fisTipiKodu,
        },
        calisilanSirket
      );

      Alert.alert('Evrak', sonuc.mesaj || (sonuc.sonuc ? 'Kaydedildi.' : 'Hata oluştu.'));
      if (sonuc.sonuc) {
        setRefno(Number(sonuc.data) || 0);
        setKapamaSepeti([]);
        // Listeyi yeniden çek
        if (secilenCari) acmaHareketleriniYukle(secilenCari);
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Bağlantı hatası.');
    } finally {
      setKaydediliyor(false);
    }
  };

  // ── Temizle ────────────────────────────────────────────────────────────────
  const sepetiTemizle = () => {
    Alert.alert('Temizle', 'Kapama sepetini temizlemek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Temizle',
        style: 'destructive',
        onPress: () => {
          // Açma listesindeki sepetMiktar'ları sıfırla
          setAcmaListesi((prev) =>
            prev.map((item) => {
              const kalem = kapamaSepeti.find((k) => k.siparisTakipNo === item.takipNo);
              return kalem ? { ...item, sepetMiktar: item.sepetMiktar - kalem.miktar } : item;
            })
          );
          setKapamaSepeti([]);
        },
      },
    ]);
  };

  // ── Filtrelenmiş açma listesi ──────────────────────────────────────────────
  const filtrelenmisAcma = aramaMetni.trim()
    ? acmaListesi.filter(
        (a) =>
          a.stokKodu.toLowerCase().includes(aramaMetni.toLowerCase()) ||
          a.stokCinsi.toLowerCase().includes(aramaMetni.toLowerCase()) ||
          a.takipNo.toLowerCase().includes(aramaMetni.toLowerCase())
      )
    : acmaListesi;

  // ── Miktar Modal İşlemleri ─────────────────────────────────────────────────
  const miktarModalAc = (
    hedef:
      | { tip: 'acma'; ashb: AcmaSiparisHareketBilgileri }
      | { tip: 'kapama'; kalem: KapamaSepetKalem }
  ) => {
    setModalHedef(hedef);
    setModalMiktar(
      hedef.tip === 'kapama' ? String(hedef.kalem.miktar) : '1'
    );
    setMiktarModalGorunur(true);
  };

  const miktarModalOnayla = () => {
    const miktar = parseFloat(modalMiktar.replace(',', '.'));
    if (isNaN(miktar) || miktar <= 0) {
      Alert.alert('Uyarı', 'Geçerli bir miktar giriniz.');
      return;
    }
    if (modalHedef?.tip === 'acma') {
      siparisEkle(modalHedef.ashb, miktar);
    } else if (modalHedef?.tip === 'kapama') {
      kapamaMiktarDuzenle(modalHedef.kalem, miktar);
    }
    setMiktarModalGorunur(false);
    setModalHedef(null);
  };

  // ── Cari seçimi ────────────────────────────────────────────────────────────
  const cariSec = () => {
    if (kapamaSepeti.length > 0) {
      Alert.alert('Uyarı', 'Sepette ürün olduğu için cari değiştirilemez. Önce sepeti temizleyin.');
      return;
    }
    navigation.navigate('CariSecim', { returnScreen: 'SiparisKapama' });
  };

  // ── Render: Açma satırı ────────────────────────────────────────────────────
  const renderAcmaSatir = ({ item }: { item: AcmaSiparisHareketBilgileri }) => {
    const kalan = kalanMiktar(item);
    const teslim = teslimEdilenMiktar(item);
    return (
      <TouchableOpacity
        style={[styles.kart, { backgroundColor: satirRengi(item) }]}
        activeOpacity={0.7}
        onPress={() => {
          if (kalan <= 0) {
            Alert.alert('Uyarı', 'Bu kalemin tüm siparişleri tamamlandı.');
            return;
          }
          siparisEkle(item, 1);
        }}
        onLongPress={() => {
          if (kalan <= 0) return;
          miktarModalAc({ tip: 'acma', ashb: item });
        }}
        delayLongPress={400}
      >
        {/* Üst satır: Tarih & Takip No */}
        <View style={styles.acmaUstSatir}>
          <Text style={styles.etiketDeger}>
            <Text style={styles.etiket}>Tarih </Text>
            {formatTarih(item.tarih)}
          </Text>
          <Text style={styles.etiketDeger}>
            <Text style={styles.etiket}>Takip No </Text>
            {item.takipNo}
          </Text>
        </View>

        {/* Stok bilgi */}
        <Text style={styles.stokKodu}>{item.stokKodu}</Text>
        <Text style={styles.stokCinsi} numberOfLines={2}>{item.stokCinsi}</Text>

        {/* Miktarlar */}
        <View style={styles.miktarSatirlar}>
          <MiktarKutu etiket="Miktar" deger={miktarFormat(item.miktar)} />
          <MiktarKutu etiket="Teslim" deger={miktarFormat(teslim)} renk="#43a047" />
          <MiktarKutu etiket="Bekleyen" deger={miktarFormat(kalan)} renk={kalan === 0 ? '#43a047' : '#e53935'} />
        </View>

        {/* Sepet & Kalan */}
        {item.sepetMiktar > 0 && (
          <View style={styles.miktarSatirlar}>
            <MiktarKutu etiket="Sepet" deger={miktarFormat(item.sepetMiktar)} renk={Colors.primary} />
            <MiktarKutu etiket="Kalan" deger={miktarFormat(kalan)} renk={kalan === 0 ? '#43a047' : '#e53935'} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Render: Kapama satırı ──────────────────────────────────────────────────
  const renderKapamaSatir = ({ item }: { item: KapamaSepetKalem }) => (
    <View style={styles.kart}>
      <View style={styles.kapamaUstSatir}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stokKodu}>{item.stokKodu}</Text>
          <Text style={styles.stokCinsi} numberOfLines={2}>{item.stokCinsi}</Text>
        </View>
        <TouchableOpacity
          style={styles.silBtn}
          onPress={() =>
            Alert.alert('Sil', `${item.stokKodu} kalemini silmek istiyor musunuz?`, [
              { text: 'İptal', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: () => kapamaKalemSil(item) },
            ])
          }
        >
          <Ionicons name="trash-outline" size={20} color="#e53935" />
        </TouchableOpacity>
      </View>
      <View style={styles.kapamaAltSatir}>
        <Text style={styles.fiyatText}>Fiyat: {paraTL(item.fiyat)}</Text>
        <TouchableOpacity
          style={styles.miktarDuzenleBtn}
          onPress={() => miktarModalAc({ tip: 'kapama', kalem: item })}
        >
          <Text style={styles.miktarDuzenleBtnText}>
            Miktar: {miktarFormat(item.miktar)}
          </Text>
          <Ionicons name="create-outline" size={14} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.tutarText}>Tutar: {paraTL(item.fiyat * item.miktar)}</Text>
      </View>
    </View>
  );

  // ── Ana render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.ekran}>
      {/* Cari seçim */}
      <TouchableOpacity style={styles.cariBtn} onPress={cariSec}>
        <Ionicons
          name="person-outline"
          size={18}
          color={secilenCari ? Colors.primary : Colors.gray}
        />
        <Text style={[styles.cariText, secilenCari && styles.cariTextSecili]}>
          {secilenCari ? secilenCari.cariUnvan : 'Lütfen cari seçiniz...'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
      </TouchableOpacity>

      {/* Tab seçici */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, aktifTab === 'acma' && styles.tabBtnAktif]}
          onPress={() => setAktifTab('acma')}
        >
          <Text style={[styles.tabText, aktifTab === 'acma' && styles.tabTextAktif]}>
            Açma
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, aktifTab === 'kapama' && styles.tabBtnAktif]}
          onPress={() => setAktifTab('kapama')}
        >
          <Text style={[styles.tabText, aktifTab === 'kapama' && styles.tabTextAktif]}>
            Kapama ({kapamaSepeti.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* İçerik */}
      {!secilenCari ? (
        <View style={styles.bosEkran}>
          <Ionicons name="person-add-outline" size={56} color={Colors.border} />
          <Text style={styles.bosMetin}>
            Sipariş kapama işlemi için{'\n'}bir cari seçiniz
          </Text>
          <TouchableOpacity style={styles.cariSecBtn} onPress={cariSec}>
            <Text style={styles.cariSecBtnText}>Cari Seç</Text>
          </TouchableOpacity>
        </View>
      ) : aktifTab === 'acma' ? (
        <View style={{ flex: 1 }}>
          {/* Arama */}
          <View style={styles.aramaRow}>
            <Ionicons name="search-outline" size={16} color={Colors.gray} />
            <TextInput
              style={styles.aramaInput}
              placeholder="Stok kodu, cinsi veya takip no ara..."
              placeholderTextColor={Colors.gray}
              value={aramaMetni}
              onChangeText={setAramaMetni}
              returnKeyType="search"
            />
            {aramaMetni.length > 0 && (
              <TouchableOpacity onPress={() => setAramaMetni('')}>
                <Ionicons name="close-circle" size={16} color={Colors.gray} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtrelenmisAcma}
            keyExtractor={(item, idx) => `${item.takipNo}-${idx}`}
            renderItem={renderAcmaSatir}
            contentContainerStyle={styles.listePadding}
            ItemSeparatorComponent={() => <View style={styles.ayirac} />}
            ListEmptyComponent={
              yukleniyor ? (
                <View style={styles.bosEkran}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              ) : (
                <View style={styles.bosEkran}>
                  <Ionicons name="document-text-outline" size={56} color={Colors.border} />
                  <Text style={styles.bosMetin}>Açık sipariş hareketi bulunamadı</Text>
                </View>
              )
            }
          />
        </View>
      ) : (
        <FlatList
          data={kapamaSepeti}
          keyExtractor={(item) => item.siparisTakipNo}
          renderItem={renderKapamaSatir}
          contentContainerStyle={styles.listePadding}
          ItemSeparatorComponent={() => <View style={styles.ayirac} />}
          ListEmptyComponent={
            <View style={styles.bosEkran}>
              <Ionicons name="cart-outline" size={56} color={Colors.border} />
              <Text style={styles.bosMetin}>
                Kapama sepeti boş{'\n'}Açma hareketlerinden ürün ekleyiniz
              </Text>
            </View>
          }
        />
      )}

      {/* Alt bar */}
      {kapamaSepeti.length > 0 && (
        <View style={styles.altBar}>
          <View style={styles.altBarBilgi}>
            <Text style={styles.altBarKalem}>{kapamaSepeti.length} kalem</Text>
            <Text style={styles.altBarToplam}>
              {paraTL(kapamaSepeti.reduce((t, k) => t + k.fiyat * k.miktar, 0))}
            </Text>
          </View>
          <TouchableOpacity style={styles.temizleBtn} onPress={sepetiTemizle}>
            <Ionicons name="trash-outline" size={18} color="#e53935" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.kaydetBtn, kaydediliyor && { opacity: 0.6 }]}
            onPress={evrakKaydet}
            disabled={kaydediliyor}
          >
            {kaydediliyor ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color={Colors.white} />
                <Text style={styles.kaydetBtnText}>Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Miktar Modal */}
      <Modal visible={miktarModalGorunur} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>
              {modalHedef?.tip === 'acma'
                ? modalHedef.ashb.stokCinsi
                : modalHedef?.tip === 'kapama'
                ? modalHedef.kalem.stokCinsi
                : ''}
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              value={modalMiktar}
              onChangeText={setModalMiktar}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalIptal]}
                onPress={() => setMiktarModalGorunur(false)}
              >
                <Text style={styles.modalIptalText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalOnayla]}
                onPress={miktarModalOnayla}
              >
                <Text style={styles.modalOnaylaText}>
                  {modalHedef?.tip === 'acma' ? 'Ekle' : 'Güncelle'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Yükleniyor overlay */}
      {(yukleniyor || kaydediliyor) && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

// ─── Yardımcı bileşen ────────────────────────────────────────────────────────
function MiktarKutu({
  etiket,
  deger,
  renk,
}: {
  etiket: string;
  deger: string;
  renk?: string;
}) {
  return (
    <View style={styles.miktarKutu}>
      <Text style={styles.miktarEtiket}>{etiket}</Text>
      <Text style={[styles.miktarDeger, renk ? { color: renk } : undefined]}>{deger}</Text>
    </View>
  );
}

// ─── Stiller ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: '#f5f5f5' },

  // Cari
  cariBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cariText: { flex: 1, fontSize: 14, color: Colors.gray },
  cariTextSecili: { color: Colors.darkGray, fontWeight: '600' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnAktif: {
    borderBottomColor: Colors.primary,
  },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.gray },
  tabTextAktif: { color: Colors.primary, fontWeight: '700' },

  // Arama
  aramaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.black,
    paddingVertical: 0,
  },

  // Liste
  listePadding: { padding: 10, paddingTop: 6 },
  ayirac: { height: 8 },

  // Kart
  kart: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Açma satır
  acmaUstSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  etiket: { fontSize: 11, color: Colors.gray, fontWeight: '600' },
  etiketDeger: { fontSize: 11, color: Colors.darkGray, fontWeight: '600' },
  stokKodu: { fontSize: 11, color: Colors.gray, fontWeight: '600', letterSpacing: 0.5 },
  stokCinsi: { fontSize: 14, fontWeight: '700', color: Colors.darkGray, marginTop: 2, marginBottom: 8 },

  miktarSatirlar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  miktarKutu: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  miktarEtiket: { fontSize: 10, color: Colors.gray, marginBottom: 2 },
  miktarDeger: { fontSize: 13, fontWeight: '700', color: Colors.darkGray },

  // Kapama satır
  kapamaUstSatir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  silBtn: {
    padding: 6,
  },
  kapamaAltSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  fiyatText: { fontSize: 12, color: Colors.gray },
  miktarDuzenleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miktarDuzenleBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  tutarText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Alt bar
  altBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  altBarBilgi: { flex: 1 },
  altBarKalem: { fontSize: 12, color: Colors.gray },
  altBarToplam: { fontSize: 16, fontWeight: '700', color: Colors.darkGray },
  temizleBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
  },
  kaydetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  kaydetBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  // Boş ekran
  bosEkran: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  bosMetin: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  cariSecBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 4,
  },
  cariSecBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKutu: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    gap: 16,
  },
  modalBaslik: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkGray,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.darkGray,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalIptal: {
    backgroundColor: '#f5f5f5',
  },
  modalIptalText: { color: Colors.gray, fontWeight: '600' },
  modalOnayla: {
    backgroundColor: Colors.primary,
  },
  modalOnaylaText: { color: Colors.white, fontWeight: '700' },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
