import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StokListesiBilgileri, SepetKalem } from '../models';
import { Colors } from '../constants/Colors';

interface Props {
  urun: StokListesiBilgileri | null;
  kdvDurum: number; // 0=Hariç, 1=Dahil, -1=Yok
  fiyatDegistirmeYetkisi: boolean;
  kalemIndirimYetkisi: boolean;
  onConfirm: (kalem: SepetKalem) => void;
  onClose: () => void;
}

export default function UrunMiktariBelirleModal({
  urun,
  kdvDurum,
  fiyatDegistirmeYetkisi,
  kalemIndirimYetkisi,
  onConfirm,
  onClose,
}: Props) {
  const [miktar, setMiktar] = useState('1');
  const [fiyat, setFiyat] = useState(urun ? String(urun.fiyat) : '0');
  const [ind1, setInd1] = useState(urun ? String(urun.kalemIndirim1) : '0');
  const [ind2, setInd2] = useState(urun ? String(urun.kalemIndirim2) : '0');
  const [ind3, setInd3] = useState(urun ? String(urun.kalemIndirim3) : '0');

  if (!urun) return null;

  const miktarSayi = parseFloat(miktar) || 0;
  const fiyatSayi = parseFloat(fiyat) || 0;
  const ind1Sayi = parseFloat(ind1) || 0;
  const ind2Sayi = parseFloat(ind2) || 0;
  const ind3Sayi = parseFloat(ind3) || 0;

  const kdvHaricTutar =
    miktarSayi *
    fiyatSayi *
    (1 - ind1Sayi / 100) *
    (1 - ind2Sayi / 100) *
    (1 - ind3Sayi / 100);
  const kdvTutar = kdvHaricTutar * (urun.kdvOrani / 100);
  const toplamTutar = kdvDurum === 1 ? kdvHaricTutar : kdvHaricTutar + kdvTutar;

  const handleEkle = () => {
    if (miktarSayi <= 0) return;
    const kalem: SepetKalem = {
      stokKodu: urun.stokKodu,
      stokCinsi: urun.stokCinsi,
      barkod: urun.barkod,
      birim: urun.birim,
      miktar: miktarSayi,
      birimFiyat: fiyatSayi,
      kdvOrani: urun.kdvOrani,
      kalemIndirim1: ind1Sayi,
      kalemIndirim2: ind2Sayi,
      kalemIndirim3: ind3Sayi,
    };
    onConfirm(kalem);
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.kart}>
          {/* Başlık */}
          <View style={styles.baslik}>
            <View style={styles.baslikMetin}>
              <Text style={styles.stokKodu}>{urun.stokKodu}</Text>
              <Text style={styles.stokCinsi} numberOfLines={2}>{urun.stokCinsi}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.kapat}>
              <Ionicons name="close" size={24} color={Colors.darkGray} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {/* Bilgi satırı */}
            <View style={styles.bilgiSatiri}>
              <Text style={styles.bilgiEtiket}>Stok: </Text>
              <Text style={styles.bilgiDeger}>{urun.bakiye.toFixed(2)} {urun.birim}</Text>
              <Text style={styles.bilgiEtiket}>  KDV: </Text>
              <Text style={styles.bilgiDeger}>%{urun.kdvOrani}</Text>
            </View>

            {/* Miktar */}
            <View style={styles.satirGrup}>
              <Text style={styles.etiket}>Miktar</Text>
              <TextInput
                style={styles.input}
                value={miktar}
                onChangeText={setMiktar}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
            </View>

            {/* Fiyat */}
            <View style={styles.satirGrup}>
              <Text style={styles.etiket}>Birim Fiyat</Text>
              <TextInput
                style={[styles.input, !fiyatDegistirmeYetkisi && styles.inputDisabled]}
                value={fiyat}
                onChangeText={setFiyat}
                keyboardType="decimal-pad"
                selectTextOnFocus
                editable={fiyatDegistirmeYetkisi}
              />
            </View>

            {/* İndirimler */}
            {kalemIndirimYetkisi && (
              <View style={styles.indirimGrup}>
                <Text style={styles.etiket}>İndirim (%)</Text>
                <View style={styles.indirimRow}>
                  {[
                    { label: 'İnd.1', val: ind1, set: setInd1 },
                    { label: 'İnd.2', val: ind2, set: setInd2 },
                    { label: 'İnd.3', val: ind3, set: setInd3 },
                  ].map((item) => (
                    <View key={item.label} style={styles.indirimItem}>
                      <Text style={styles.indirimEtiket}>{item.label}</Text>
                      <TextInput
                        style={styles.indirimInput}
                        value={item.val}
                        onChangeText={item.set}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Toplam */}
            <View style={styles.toplamKart}>
              {kdvDurum !== -1 && (
                <View style={styles.toplamSatir}>
                  <Text style={styles.toplamEtiket}>KDV Hariç</Text>
                  <Text style={styles.toplamDeger}>{kdvHaricTutar.toFixed(2)} ₺</Text>
                </View>
              )}
              {kdvDurum !== -1 && (
                <View style={styles.toplamSatir}>
                  <Text style={styles.toplamEtiket}>KDV (%{urun.kdvOrani})</Text>
                  <Text style={styles.toplamDeger}>{kdvTutar.toFixed(2)} ₺</Text>
                </View>
              )}
              <View style={[styles.toplamSatir, styles.toplamSonSatir]}>
                <Text style={styles.toplamEtiketBold}>Toplam</Text>
                <Text style={styles.toplamDegerBold}>{toplamTutar.toFixed(2)} ₺</Text>
              </View>
            </View>
          </ScrollView>

          {/* Ekle Butonu */}
          <TouchableOpacity
            style={[styles.ekleBtn, miktarSayi <= 0 && styles.ekleBtnDisabled]}
            onPress={handleEkle}
            disabled={miktarSayi <= 0}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.ekleBtnText}>SEPETE EKLE</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  kart: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  baslik: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  baslikMetin: { flex: 1 },
  stokKodu: {
    fontSize: 12,
    color: Colors.gray,
    fontWeight: '600',
    letterSpacing: 1,
  },
  stokCinsi: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  kapat: { padding: 4 },
  bilgiSatiri: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  bilgiEtiket: { fontSize: 13, color: Colors.gray },
  bilgiDeger: { fontSize: 13, fontWeight: '600', color: Colors.darkGray },
  satirGrup: {
    marginBottom: 12,
  },
  etiket: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.black,
    backgroundColor: Colors.inputBackground,
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: Colors.gray,
  },
  indirimGrup: { marginBottom: 12 },
  indirimRow: { flexDirection: 'row', gap: 8 },
  indirimItem: { flex: 1 },
  indirimEtiket: { fontSize: 12, color: Colors.gray, marginBottom: 4 },
  indirimInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.black,
    backgroundColor: Colors.inputBackground,
    textAlign: 'center',
  },
  toplamKart: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  toplamSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  toplamSonSatir: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 6,
    paddingTop: 8,
  },
  toplamEtiket: { fontSize: 14, color: Colors.darkGray },
  toplamDeger: { fontSize: 14, color: Colors.darkGray },
  toplamEtiketBold: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  toplamDegerBold: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  ekleBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  ekleBtnDisabled: { opacity: 0.5 },
  ekleBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
