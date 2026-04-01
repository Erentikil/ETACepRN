import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../contexts/ThemeContext';
import { kurFormat } from '../../utils/format';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { kurBilgileriniAl } from '../../api/hizliIslemlerApi';
import type { KurBilgileri as KurBilgileriModel } from '../../models';
import EmptyState from '../../components/EmptyState';
import AnimatedListItem from '../../components/AnimatedListItem';

export default function KurBilgileri() {
  const Colors = useColors();
  const { calisilanSirket } = useAppStore();
  const [kurlar, setKurlar] = useState<KurBilgileriModel[]>([]);
  const [guncelleme, setGuncelleme] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kurlariCek = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const sonuc = await kurBilgileriniAl(calisilanSirket);
      if (sonuc.sonuc) {
        setKurlar(sonuc.data ?? []);
        setGuncelleme(
          new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        );
      } else {
        setHata(sonuc.mesaj || 'Kur bilgileri alınamadı.');
      }
    } catch (e: any) {
      const mesaj = e instanceof Error ? e.message : 'Bağlantı hatası.';
      setHata(`Kur bilgileri alınamadı. ${mesaj}`);
    } finally {
      setYukleniyor(false);
    }
  }, [calisilanSirket]);

  useFocusEffect(
    useCallback(() => {
      if (kurlar.length === 0) kurlariCek();
    }, [])
  );

  const renderKur = ({ item, index }: { item: KurBilgileriModel; index: number }) => {
    return (
      <AnimatedListItem index={index}>
        <View style={[styles.satirKart, { backgroundColor: Colors.card }]}>
          <View style={styles.solTaraf}>
            <View style={[styles.dovizIcon, { backgroundColor: `${Colors.primary}14` }]}>
              <Ionicons name="cash-outline" size={22} color={Colors.primary} />
            </View>
            <View>
              <Text style={[styles.kurKod, { color: Colors.text }]}>{item.dovizKodu}</Text>
              <Text style={[styles.kurAd, { color: Colors.textSecondary }]}>{item.dovizTuru}</Text>
            </View>
          </View>
          <View style={styles.sagTaraf}>
            <Text style={[styles.kurDeger, { color: Colors.primary }]}>
              {kurFormat(item.dovizKuru)} ₺
            </Text>
          </View>
        </View>
      </AnimatedListItem>
    );
  };

  return (
    <View style={[styles.ekran, { backgroundColor: Colors.background }]}>
      {/* Bilgi kartı */}
      <View style={[styles.bilgiKart, { backgroundColor: Colors.card, borderBottomColor: Colors.border }]}>
        <View style={styles.bilgiSol}>
          <Ionicons name="globe-outline" size={18} color={Colors.primary} />
          <View>
            <Text style={[styles.bilgiBaslik, { color: Colors.text }]}>Döviz Kurları</Text>
            {guncelleme && (
              <Text style={[styles.bilgiTarih, { color: Colors.textSecondary }]}>Son güncelleme: {guncelleme}</Text>
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
      <View style={[styles.listeBaslik, { backgroundColor: Colors.primary }]}>
        <Text style={[styles.listeBaslikText, { flex: 1 }]}>DÖVİZ</Text>
        <Text style={[styles.listeBaslikText, { textAlign: 'right' }]}>KUR</Text>
      </View>

      {hata ? (
        <View style={styles.merkezle}>
          <Ionicons name="wifi-outline" size={48} color={Colors.border} />
          <Text style={[styles.hataMetin, { color: Colors.textSecondary }]}>{hata}</Text>
          <TouchableOpacity style={[styles.tekrarBtn, { backgroundColor: Colors.primary }]} onPress={kurlariCek}>
            <Text style={styles.tekrarBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={kurlar}
          keyExtractor={(item, index) => item.kurID != null ? String(item.kurID) : `kur-${index}`}
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
              <EmptyState icon="cash-outline" baslik="Kur bilgisi bulunamadı" aciklama="Döviz kuru bilgisi bulunmamaktadır" />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },

  bilgiKart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  bilgiSol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bilgiBaslik: { fontSize: 14, fontWeight: '700' },
  bilgiTarih: { fontSize: 12, marginTop: 2 },
  yenileBtn: { padding: 6 },

  listeBaslik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  dovizIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kurKod: { fontSize: 15, fontWeight: '700' },
  kurAd: { fontSize: 12, marginTop: 2 },

  sagTaraf: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kurDeger: { fontSize: 18, fontWeight: '700' },

  merkezle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  hataMetin: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  tekrarBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  tekrarBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
