import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { toast } from '../../components/Toast';
import { bankaKartListesiniAl } from '../../api/raporApi';
import { Colors } from '../../constants/Colors';
import type { BankaKartBilgileri } from '../../models';
import EmptyState from '../../components/EmptyState';
import SkeletonLoader from '../../components/SkeletonLoader';

function f(n: number) {
  return (n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BankaBakiye() {
  const { calisilanSirket } = useAppStore();
  const [liste, setListe] = useState<BankaKartBilgileri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const veriYukle = async () => {
    setYukleniyor(true);
    try {
      const sonuc = await bankaKartListesiniAl(calisilanSirket);
      if (sonuc.sonuc) {
        setListe(sonuc.data ?? []);
      } else {
        toast.error(sonuc.mesaj || 'Banka listesi alınamadı.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Banka listesi yüklenirken hata oluştu.');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    veriYukle();
  }, [calisilanSirket]);

  if (yukleniyor) {
    return (
      <SkeletonLoader satirSayisi={5} />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={liste}
        keyExtractor={(item) => item.bankaKodu}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={veriYukle}
            colors={[Colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.kart}>
            <View style={styles.kartUst}>
              <Ionicons name="business-outline" size={20} color={Colors.primary} />
              <Text style={styles.bankaAdi} numberOfLines={1}>{item.bankaAdi}</Text>
              <Text style={styles.bankaKodu}>{item.bankaKodu}</Text>
            </View>
            <View style={styles.tutarRow}>
              <View style={styles.tutarKutu}>
                <Text style={styles.tutarLabel}>TL</Text>
                <Text style={[styles.tutarDeger, item.TLTutar < 0 && styles.negatif]}>{f(item.TLTutar)}</Text>
              </View>
              <View style={styles.tutarKutu}>
                <Text style={styles.tutarLabel}>USD</Text>
                <Text style={[styles.tutarDeger, item.USDTutar < 0 && styles.negatif]}>{f(item.USDTutar)}</Text>
              </View>
              <View style={styles.tutarKutu}>
                <Text style={styles.tutarLabel}>EUR</Text>
                <Text style={[styles.tutarDeger, item.EUROTutar < 0 && styles.negatif]}>{f(item.EUROTutar)}</Text>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <EmptyState icon="business-outline" baslik="Banka kaydı bulunamadı" aciklama="Kayıtlı banka hesabı bulunmamaktadır" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  merkez: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20 },
  yukleniyorText: { color: Colors.gray, fontSize: 14 },
  liste: { padding: 12, gap: 10 },
  kart: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  bankaAdi: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.darkGray },
  bankaKodu: { fontSize: 12, color: Colors.gray },
  tutarRow: { flexDirection: 'row', gap: 8 },
  tutarKutu: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  tutarLabel: { fontSize: 11, color: Colors.gray, fontWeight: '600', marginBottom: 2 },
  tutarDeger: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  negatif: { color: Colors.error },
  bosText: { color: Colors.gray, fontSize: 14 },
});
