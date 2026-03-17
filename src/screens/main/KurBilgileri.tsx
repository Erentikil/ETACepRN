import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { kurFormat } from '../../utils/format';
import { useFocusEffect } from '@react-navigation/native';

const PARA_BIRIMLERI = [
  { kod: 'USD', ad: 'Amerikan Doları',        bayrak: '🇺🇸' },
  { kod: 'EUR', ad: 'Euro',                   bayrak: '🇪🇺' },
  { kod: 'GBP', ad: 'İngiliz Sterlini',       bayrak: '🇬🇧' },
  { kod: 'CHF', ad: 'İsviçre Frankı',         bayrak: '🇨🇭' },
  { kod: 'JPY', ad: 'Japon Yeni',             bayrak: '🇯🇵' },
  { kod: 'CAD', ad: 'Kanada Doları',          bayrak: '🇨🇦' },
  { kod: 'AUD', ad: 'Avustralya Doları',      bayrak: '🇦🇺' },
  { kod: 'CNY', ad: 'Çin Yuanı',             bayrak: '🇨🇳' },
  { kod: 'SAR', ad: 'S. Arabistan Riyali',   bayrak: '🇸🇦' },
  { kod: 'AED', ad: 'BAE Dirhemi',            bayrak: '🇦🇪' },
];

interface KurSatiri {
  kod: string;
  ad: string;
  bayrak: string;
  kur: number;
  oncekiKur?: number;
}

export default function KurBilgileri() {
  const [kurlar, setKurlar] = useState<KurSatiri[]>([]);
  const [guncelleme, setGuncelleme] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kurlariCek = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const response = await fetch(
        `https://api.frankfurter.app/latest?base=TRY&symbols=${PARA_BIRIMLERI.map((p) => p.kod).join(',')}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();

      const yeniKurlar: KurSatiri[] = PARA_BIRIMLERI.map((p) => {
        const rate: number = json.rates[p.kod];
        return {
          ...p,
          kur: rate > 0 ? 1 / rate : 0,
          oncekiKur: kurlar.find((k) => k.kod === p.kod)?.kur,
        };
      });

      setKurlar(yeniKurlar);
      const tarih = new Date(json.date);
      setGuncelleme(
        tarih.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
      );
    } catch (e: any) {
      setHata('Kur bilgileri alınamadı. İnternet bağlantınızı kontrol edin.');
    } finally {
      setYukleniyor(false);
    }
  }, [kurlar]);

  useFocusEffect(
    useCallback(() => {
      if (kurlar.length === 0) kurlariCek();
    }, [])
  );

  const renderKur = ({ item }: { item: KurSatiri }) => {
    const trend =
      item.oncekiKur == null
        ? null
        : item.kur > item.oncekiKur
        ? 'up'
        : item.kur < item.oncekiKur
        ? 'down'
        : null;

    return (
      <View style={styles.satirKart}>
        <View style={styles.solTaraf}>
          <Text style={styles.bayrak}>{item.bayrak}</Text>
          <View>
            <Text style={styles.kurKod}>{item.kod}</Text>
            <Text style={styles.kurAd}>{item.ad}</Text>
          </View>
        </View>
        <View style={styles.sagTaraf}>
          <Text style={styles.kurDeger}>
            {kurFormat(item.kur)} ₺
          </Text>
          {trend && (
            <Ionicons
              name={trend === 'up' ? 'trending-up' : 'trending-down'}
              size={16}
              color={trend === 'up' ? '#e53935' : '#43a047'}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.ekran}>
      {/* Bilgi kartı */}
      <View style={styles.bilgiKart}>
        <View style={styles.bilgiSol}>
          <Ionicons name="globe-outline" size={18} color={Colors.primary} />
          <View>
            <Text style={styles.bilgiBaslik}>Canlı Döviz Kurları</Text>
            {guncelleme && (
              <Text style={styles.bilgiTarih}>Son güncelleme: {guncelleme}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={kurlariCek} style={styles.yenileBtn} disabled={yukleniyor}>
          {yukleniyor ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="refresh" size={22} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Başlık satırı */}
      <View style={styles.listeBaslik}>
        <Text style={[styles.listeBaslikText, { flex: 1 }]}>PARA BİRİMİ</Text>
        <Text style={[styles.listeBaslikText, { textAlign: 'right' }]}>1 BİRİM = ? ₺</Text>
      </View>

      {hata ? (
        <View style={styles.merkezle}>
          <Ionicons name="wifi-outline" size={48} color={Colors.border} />
          <Text style={styles.hataMetin}>{hata}</Text>
          <TouchableOpacity style={styles.tekrarBtn} onPress={kurlariCek}>
            <Text style={styles.tekrarBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={kurlar}
          keyExtractor={(item) => item.kod}
          renderItem={renderKur}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={kurlariCek}
              colors={[Colors.primary]}
            />
          }
          contentContainerStyle={styles.listePadding}
          ItemSeparatorComponent={() => <View style={styles.ayirac} />}
          ListEmptyComponent={
            yukleniyor ? null : (
              <View style={styles.merkezle}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: '#f5f5f5' },

  bilgiKart: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bilgiSol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bilgiBaslik: { fontSize: 14, fontWeight: '700', color: Colors.darkGray },
  bilgiTarih: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  yenileBtn: { padding: 6 },

  listeBaslik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  listeBaslikText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  listePadding: { padding: 10, paddingTop: 6 },
  ayirac: { height: 6 },

  satirKart: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  solTaraf: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bayrak: { fontSize: 28 },
  kurKod: { fontSize: 15, fontWeight: '700', color: Colors.darkGray },
  kurAd: { fontSize: 12, color: Colors.gray, marginTop: 2 },

  sagTaraf: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kurDeger: { fontSize: 18, fontWeight: '700', color: Colors.primary },

  merkezle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  hataMetin: { fontSize: 14, color: Colors.gray, textAlign: 'center', paddingHorizontal: 32 },
  tekrarBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  tekrarBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
