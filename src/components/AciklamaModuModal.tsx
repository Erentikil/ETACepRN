import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../contexts/ThemeContext';
import { useT } from '../i18n/I18nContext';
import type { SepetKalem } from '../models';
import { toast } from './Toast';

interface Props {
  visible: boolean;
  kdvDurum: number;
  onConfirm: (kalem: SepetKalem) => void;
  onClose: () => void;
  // İlk N kalem indirim alanı gösterilir (1..N). Verilmezse 3.
  maksimumIndirimSayisi?: number;
}

export default function AciklamaModuModal({ visible, kdvDurum, onConfirm, onClose, maksimumIndirimSayisi }: Props) {
  const Colors = useColors();
  const t = useT();
  const maxInd = maksimumIndirimSayisi ?? 3;
  const ind3Goster = maxInd >= 3;
  const [stokKodu, setStokKodu] = useState('');
  const [stokCinsi, setStokCinsi] = useState('');
  const [birim, setBirim] = useState('AD');
  const [miktar, setMiktar] = useState('1');
  const [birimFiyat, setBirimFiyat] = useState('');
  const [kdvOrani, setKdvOrani] = useState('0');
  const [ind1, setInd1] = useState('0');
  const [ind2, setInd2] = useState('0');
  const [ind3, setInd3] = useState('0');
  const [aciklama, setAciklama] = useState('');

  const sifirla = () => {
    setStokKodu('');
    setStokCinsi('');
    setBirim('AD');
    setMiktar('1');
    setBirimFiyat('');
    setKdvOrani('0');
    setInd1('0');
    setInd2('0');
    setInd3('0');
    setAciklama('');
  };

  const handleEkle = () => {
    const miktarSayi = parseFloat(miktar) || 0;
    const fiyatSayi = parseFloat(birimFiyat) || 0;
    if (miktarSayi <= 0) {
      toast.warning(t('modal.miktarSifirOlamaz'));
      return;
    }
    if (!stokCinsi.trim()) {
      toast.warning(t('modal.aciklamaBosOlamaz'));
      return;
    }

    const kalem: SepetKalem = {
      stokKodu: stokKodu.trim() || 'ACIKLAMA',
      stokCinsi: stokCinsi.trim(),
      barkod: '',
      birim: birim.trim() || 'AD',
      miktar: miktarSayi,
      birimFiyat: fiyatSayi,
      kdvOrani: parseFloat(kdvOrani) || 0,
      kalemIndirim1: parseFloat(ind1) || 0,
      kalemIndirim2: parseFloat(ind2) || 0,
      kalemIndirim3: ind3Goster ? (parseFloat(ind3) || 0) : 0,
      aciklama: aciklama.trim() || undefined,
    };
    onConfirm(kalem);
    sifirla();
  };

  const handleKapat = () => {
    sifirla();
    onClose();
  };

  const miktarSayi = parseFloat(miktar) || 0;
  const fiyatSayi = parseFloat(birimFiyat) || 0;
  const ind1Sayi = parseFloat(ind1) || 0;
  const ind2Sayi = parseFloat(ind2) || 0;
  const ind3Sayi = parseFloat(ind3) || 0;
  const kdvOraniSayi = parseFloat(kdvOrani) || 0;

  const kdvHaricTutar =
    miktarSayi * fiyatSayi *
    (1 - ind1Sayi / 100) *
    (1 - ind2Sayi / 100) *
    (ind3Goster ? (1 - ind3Sayi / 100) : 1);
  const kdvTutar = kdvHaricTutar * (kdvOraniSayi / 100);
  const toplamTutar = kdvDurum === 1 ? kdvHaricTutar : kdvHaricTutar + kdvTutar;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleKapat}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.kart, { backgroundColor: Colors.card }]}>
          <View style={[styles.baslik, { borderBottomColor: Colors.border }]}>
            <Text style={[styles.baslikText, { color: Colors.text }]}>{t('modal.serbestKalemBaslik')}</Text>
            <TouchableOpacity onPress={handleKapat}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.satir}>
              <Text style={[styles.label, { color: Colors.textSecondary }]}>{t('modal.stokKodu')}</Text>
              <TextInput
                style={[styles.input, { borderColor: Colors.border, color: Colors.text, backgroundColor: Colors.inputBackground }]}
                value={stokKodu}
                onChangeText={setStokKodu}
                placeholder={t('modal.opsiyonel')}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.satir}>
              <Text style={[styles.label, { color: Colors.textSecondary }]}>{t('modal.stokCinsiAciklama')}</Text>
              <TextInput
                style={[styles.input, { borderColor: Colors.border, color: Colors.text, backgroundColor: Colors.inputBackground }]}
                value={stokCinsi}
                onChangeText={setStokCinsi}
                placeholder={t('modal.urunAciklamasi')}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.satirRow}>
              <View style={styles.kucukAlani}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>{t('common.birim')}</Text>
                <TextInput
                  style={[styles.input, { borderColor: Colors.border, color: Colors.text, backgroundColor: Colors.inputBackground }]}
                  value={birim}
                  onChangeText={setBirim}
                />
              </View>
              <View style={styles.kucukAlani}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>{t('common.miktar')}</Text>
                <TextInput
                  style={[styles.input, { borderColor: Colors.border, color: Colors.text, backgroundColor: Colors.inputBackground }]}
                  value={miktar}
                  onChangeText={setMiktar}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.kucukAlani}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>{t('common.fiyat')}</Text>
                <TextInput
                  style={[styles.input, { borderColor: Colors.border, color: Colors.text, backgroundColor: Colors.inputBackground }]}
                  value={birimFiyat}
                  onChangeText={setBirimFiyat}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.satirRow}>
              <View style={styles.kucukAlani}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>{t('common.kdv')} %</Text>
                <TextInput
                  style={[styles.input, { borderColor: Colors.border, color: Colors.text, backgroundColor: Colors.inputBackground }]}
                  value={kdvOrani}
                  onChangeText={setKdvOrani}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.kucukAlani}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>İnd. 1 %</Text>
                <TextInput
                  style={[styles.input, { borderColor: Colors.border, color: Colors.text, backgroundColor: Colors.inputBackground }]}
                  value={ind1}
                  onChangeText={setInd1}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.kucukAlani}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>İnd. 2 %</Text>
                <TextInput
                  style={[styles.input, { borderColor: Colors.border, color: Colors.text, backgroundColor: Colors.inputBackground }]}
                  value={ind2}
                  onChangeText={setInd2}
                  keyboardType="decimal-pad"
                />
              </View>
              {ind3Goster && (
                <View style={styles.kucukAlani}>
                  <Text style={[styles.label, { color: Colors.textSecondary }]}>İnd. 3 %</Text>
                  <TextInput
                    style={[styles.input, { borderColor: Colors.border, color: Colors.text, backgroundColor: Colors.inputBackground }]}
                    value={ind3}
                    onChangeText={setInd3}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}
            </View>

            <View style={styles.satir}>
              <Text style={[styles.label, { color: Colors.textSecondary }]}>{t('modal.not')}</Text>
              <TextInput
                style={[styles.input, { minHeight: 50, textAlignVertical: 'top', borderColor: Colors.border, color: Colors.text, backgroundColor: Colors.inputBackground }]}
                value={aciklama}
                onChangeText={setAciklama}
                placeholder={t('modal.kalemNotu')}
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Toplam */}
            <View style={[styles.toplamKutu, { backgroundColor: `${Colors.primary}08` }]}>
              <View style={styles.toplamSatir}>
                <Text style={[styles.toplamLabel, { color: Colors.text }]}>{t('common.kdvHaric')}:</Text>
                <Text style={[styles.toplamDeger, { color: Colors.text }]}>{kdvHaricTutar.toFixed(2)}</Text>
              </View>
              {kdvDurum !== 1 && (
                <View style={styles.toplamSatir}>
                  <Text style={[styles.toplamLabel, { color: Colors.text }]}>{t('common.kdv')}:</Text>
                  <Text style={[styles.toplamDeger, { color: Colors.text }]}>{kdvTutar.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.toplamSatir}>
                <Text style={[styles.toplamLabel, { fontWeight: '700', color: Colors.text }]}>{t('common.toplam')}:</Text>
                <Text style={[styles.toplamDeger, { fontWeight: '700', color: Colors.primary }]}>
                  {toplamTutar.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[styles.altButonlar, { borderTopColor: Colors.border }]}>
            <TouchableOpacity style={[styles.iptalBtn, { borderColor: Colors.border }]} onPress={handleKapat}>
              <Text style={[styles.iptalText, { color: Colors.text }]}>{t('common.vazgec')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ekleBtn, { backgroundColor: Colors.primary }]} onPress={handleEkle}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.ekleText}>{t('common.ekle')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kart: {
    width: '92%',
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  baslik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  baslikText: {
    fontSize: 17,
    fontWeight: '700',
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  satir: {
    marginBottom: 12,
  },
  satirRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kucukAlani: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  toplamKutu: {
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  toplamSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  toplamLabel: {
    fontSize: 13,
  },
  toplamDeger: {
    fontSize: 13,
  },
  altButonlar: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  iptalBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  iptalText: {
    fontSize: 15,
    fontWeight: '600',
  },
  ekleBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ekleText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
});
