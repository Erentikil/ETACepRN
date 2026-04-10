import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAppStore } from '../../../store/appStore';
import { crmTeklifFisleriniOku, crmTeklifFisleriniMusteriyeGoreOku, crmTeklifHareketleriniOku } from '../../../api/crmTeklifApi';
import type { CRMTeklifFisBilgileri, CRMTeklifHareketBilgileri, SepetKalem } from '../../../models';
import { useColors } from '../../../contexts/ThemeContext';
import { paraTL } from '../../../utils/format';
import EmptyState from '../../../components/EmptyState';
import { toast } from '../../../components/Toast';

interface Props {
  onTeklifSec: (fis: CRMTeklifFisBilgileri, kalemler: SepetKalem[]) => void;
}

function aynınIlkGunu(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function aynınSonGunu(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatTarih(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function formatTarihApi(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export default function RevizyonTab({ onTeklifSec }: Props) {
  const Colors = useColors();
  const { calisilanSirket } = useAppStore();

  const [fisler, setFisler] = useState<CRMTeklifFisBilgileri[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [baslangicTarihi, setBaslangicTarihi] = useState(aynınIlkGunu());
  const [bitisTarihi, setBitisTarihi] = useState(aynınSonGunu());
  const [pickerHedef, setPickerHedef] = useState<'bas' | 'bit' | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [seciliId, setSeciliId] = useState<number | null>(null);

  const ara = useCallback(async (sessiz = false) => {
    if (!calisilanSirket) return;
    if (!sessiz) setYukleniyor(true);
    try {
      const kod = aramaMetni.trim();
      const bas = formatTarihApi(baslangicTarihi);
      const bit = formatTarihApi(bitisTarihi);
      const sonuc = kod
        ? await crmTeklifFisleriniMusteriyeGoreOku(kod, bas, bit, calisilanSirket)
        : await crmTeklifFisleriniOku(bas, bit, calisilanSirket);
      if (sonuc.sonuc && sonuc.data) {
        setFisler(sonuc.data);
      } else {
        if (!sessiz) toast.error(sonuc.mesaj || 'Teklif listesi alınamadı.');
        setFisler([]);
      }
    } catch {
      if (!sessiz) toast.error('Teklif listesi yüklenirken hata oluştu.');
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, [calisilanSirket, aramaMetni, baslangicTarihi, bitisTarihi]);


  const onPickerChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerHedef(null);
    if (!selected) return;
    if (pickerHedef === 'bas') setBaslangicTarihi(selected);
    else if (pickerHedef === 'bit') setBitisTarihi(selected);
  };

  // En yeni en üstte sırala
  const filtreliFisler = useMemo(() => {
    return [...fisler].sort((a, b) => {
      const ta = a.tarih ? new Date(a.tarih).getTime() : 0;
      const tb = b.tarih ? new Date(b.tarih).getTime() : 0;
      return tb - ta;
    });
  }, [fisler]);

  const teklifSec = async (fis: CRMTeklifFisBilgileri) => {
    setSeciliId(fis.id);
    try {
      const sonuc = await crmTeklifHareketleriniOku(fis.id, calisilanSirket);
      if (sonuc.sonuc && sonuc.data) {
        const kalemler: SepetKalem[] = sonuc.data.map((h: CRMTeklifHareketBilgileri) => ({
          stokKodu: h.stokkodu,
          stokCinsi: h.stokcinsi,
          barkod: h.barkod,
          birim: h.birim,
          miktar: h.miktar,
          birimFiyat: h.fiyat,
          kdvOrani: h.kdvyuzde,
          kalemIndirim1: h.kalemindirimyuzde1,
          kalemIndirim2: h.kalemindirimyuzde2,
          kalemIndirim3: 0,
          aciklama: h.aciklama1,
          fiyatNo: 0,
          crmKalemId: h.id,
        }));
        onTeklifSec(fis, kalemler);
        toast.success(`${kalemler.length} kalem sepete yüklendi.`);
      } else {
        toast.error(sonuc.mesaj || 'Teklif hareketleri alınamadı.');
      }
    } catch {
      toast.error('Teklif hareketleri yüklenirken hata oluştu.');
    } finally {
      setSeciliId(null);
    }
  };

  const renderFis = ({ item }: { item: CRMTeklifFisBilgileri }) => {
    const yukleniyorMu = seciliId === item.id;
    const tarih = item.tarih ? new Date(item.tarih).toLocaleDateString('tr-TR') : '';

    return (
      <TouchableOpacity
        style={[styles.fisKart, { backgroundColor: Colors.card }]}
        onPress={() => teklifSec(item)}
        disabled={seciliId !== null}
        activeOpacity={0.7}
      >
        <View style={styles.fisUst}>
          <View style={styles.fisBaslik}>
            <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
            <Text style={[styles.fisNo, { color: Colors.primary }]} numberOfLines={1}>{item.teklifno || `#${item.id}`}</Text>
          </View>
          {yukleniyorMu && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>

        <View style={styles.fisDetay}>
          <View style={styles.fisDetayRow}>
            <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
            <Text style={[styles.fisDetayText, { color: Colors.text }]} numberOfLines={1}>{item.musteriadi || item.musterikodu}</Text>
          </View>
          {tarih ? (
            <View style={styles.fisDetayRow}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
              <Text style={[styles.fisDetayText, { color: Colors.text }]}>{tarih}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.fisAlt, { borderTopColor: Colors.border }]}>
          <Text style={[styles.fisToplam, { color: Colors.primary }]}>{paraTL(item.geneltoplam)}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.stickyHeader, { backgroundColor: Colors.background }]}>
      {/* Cari kodu arama */}
      <View style={[styles.aramaKutusu, { backgroundColor: Colors.card }]}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          style={[styles.aramaInput, { color: Colors.text }]}
          placeholder="Cari kodu ara..."
          placeholderTextColor={Colors.textSecondary}
          value={aramaMetni}
          onChangeText={setAramaMetni}
          autoCorrect={false}
          onSubmitEditing={() => ara()}
          returnKeyType="search"
        />
        {aramaMetni.length > 0 && (
          <TouchableOpacity
            onPress={() => { setAramaMetni(''); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.araBtn, { backgroundColor: Colors.primary }]}
          onPress={() => ara()}
        >
          <Text style={styles.araBtnText}>Ara</Text>
        </TouchableOpacity>
      </View>

      {/* Tarih filtresi */}
      <View style={styles.tarihSatir}>
        <TouchableOpacity style={[styles.tarihBtn, { backgroundColor: Colors.card }]} onPress={() => setPickerHedef('bas')}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={[styles.tarihBtnText, { color: Colors.text }]}>{formatTarih(baslangicTarihi)}</Text>
        </TouchableOpacity>
        <Text style={[styles.tarihAyrac, { color: Colors.textSecondary }]}>—</Text>
        <TouchableOpacity style={[styles.tarihBtn, { backgroundColor: Colors.card }]} onPress={() => setPickerHedef('bit')}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={[styles.tarihBtnText, { color: Colors.text }]}>{formatTarih(bitisTarihi)}</Text>
        </TouchableOpacity>
      </View>

      {pickerHedef && (
        <>
          <DateTimePicker
            value={pickerHedef === 'bas' ? baslangicTarihi : bitisTarihi}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            locale="tr-TR"
            onChange={onPickerChange}
            textColor={Colors.text}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.pickerTamamBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setPickerHedef(null)}
            >
              <Text style={styles.pickerTamamText}>Tamam</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  if (yukleniyor) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.yukleniyorText, { color: Colors.textSecondary }]}>Teklifler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onTouchStart={Keyboard.dismiss}>
      {renderHeader()}
      <FlatList
        data={filtreliFisler}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderFis}
        contentContainerStyle={styles.liste}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => <View style={styles.ayirac} />}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            baslik="Sonuç Bulunamadı"
            aciklama={aramaMetni ? `"${aramaMetni}" ile eşleşen teklif yok` : 'Teklif bulunamadı'}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={yenileniyor}
            onRefresh={() => { setYenileniyor(true); ara(true); }}
            colors={[Colors.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  yukleniyorText: { fontSize: 14 },
  stickyHeader: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  aramaKutusu: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  aramaInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  araBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  araBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tarihSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  tarihBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tarihBtnText: {
    flex: 1,
    fontSize: 13,
  },
  tarihAyrac: {
    fontSize: 16,
  },
  liste: { padding: 12 },
  ayirac: { height: 8 },
  fisKart: {
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  fisUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fisBaslik: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  fisNo: { fontSize: 15, fontWeight: '700' },
  fisDetay: { gap: 4, marginBottom: 8 },
  fisDetayRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fisDetayText: { fontSize: 13, flex: 1 },
  fisAlt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  fisToplam: { fontSize: 16, fontWeight: '700' },
  pickerTamamBtn: {
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pickerTamamText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
