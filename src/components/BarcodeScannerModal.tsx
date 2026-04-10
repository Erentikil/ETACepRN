import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onDetected: (barkod: string) => void;
  onClose: () => void;
  manuelOkuma?: boolean;
  baslangicZoom?: number;
}

export default function BarcodeScannerModal({ visible, onDetected, onClose, manuelOkuma = false, baslangicZoom = 0 }: Props) {
  const Colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const initialZoom = Math.min(Math.max(baslangicZoom, 0), 1);
  const [zoom, setZoom] = useState(initialZoom);
  const [zoomGoster, setZoomGoster] = useState(false);
  const [taramaAktif, setTaramaAktif] = useState(!manuelOkuma);
  const tarandiRef = useRef(false);
  const zoomGosterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startZoom = useSharedValue(initialZoom);
  const zoomValue = useSharedValue(initialZoom);

  useEffect(() => {
    if (visible) {
      tarandiRef.current = false;
      setTorchOn(false);
      const z = Math.min(Math.max(baslangicZoom, 0), 1);
      setZoom(z);
      zoomValue.value = z;
      startZoom.value = z;
      setTaramaAktif(!manuelOkuma);
    }
  }, [visible]);

  const showZoomIndicator = () => {
    setZoomGoster(true);
    if (zoomGosterTimerRef.current) clearTimeout(zoomGosterTimerRef.current);
    zoomGosterTimerRef.current = setTimeout(() => setZoomGoster(false), 1500);
  };

  const updateZoom = (val: number) => {
    setZoom(val);
    showZoomIndicator();
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      startZoom.value = zoomValue.value;
    })
    .onUpdate((e) => {
      const newZoom = Math.min(Math.max(startZoom.value + (e.scale - 1) * 0.5, 0), 1);
      zoomValue.value = newZoom;
      runOnJS(updateZoom)(newZoom);
    });

  const sonTarananRef = useRef<string | null>(null);

  const handleBarkod = ({ data }: { data: string }) => {
    if (tarandiRef.current) return;
    if (manuelOkuma) {
      sonTarananRef.current = data;
      return;
    }
    tarandiRef.current = true;
    onDetected(data);
  };

  const handleManuelOku = () => {
    if (tarandiRef.current) return;
    if (sonTarananRef.current) {
      tarandiRef.current = true;
      onDetected(sonTarananRef.current);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.ekran}>
        {!permission ? (
          <View style={styles.merkezle}>
            <Text style={[styles.mesaj, { color: Colors.text }]}>Kamera izni kontrol ediliyor...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={[styles.merkezle, { backgroundColor: Colors.card }]}>
            <Ionicons name="camera-outline" size={64} color={Colors.textSecondary} />
            <Text style={[styles.mesaj, { color: Colors.text }]}>Barkod okumak icin kamera iznine ihtiyac var.</Text>
            <TouchableOpacity style={[styles.izinBtn, { backgroundColor: Colors.primary }]} onPress={requestPermission}>
              <Text style={styles.izinBtnText}>Izin Ver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.kapat} onPress={onClose}>
              <Text style={[styles.kapatText, { color: Colors.textSecondary }]}>Vazgec</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Ust bar */}
            <View style={styles.ustBar}>
              <TouchableOpacity onPress={onClose} style={styles.geriBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.baslik}>Barkod Tara</Text>
              <TouchableOpacity onPress={() => setTorchOn((t) => !t)} style={styles.fenBtn}>
                <Ionicons
                  name={torchOn ? 'flashlight' : 'flashlight-outline'}
                  size={24}
                  color={torchOn ? '#ffa500' : '#fff'}
                />
              </TouchableOpacity>
            </View>

            {/* Kamera -- sadece modal acikken ve taranmamissa aktif */}
            {visible && (
              <View style={styles.kamera}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  enableTorch={torchOn}
                  zoom={zoom}
                  barcodeScannerSettings={{
                    barcodeTypes: [
                      'ean13', 'ean8', 'code128', 'code39',
                      'qr', 'upc_a', 'upc_e', 'itf14',
                    ],
                  }}
                  onBarcodeScanned={handleBarkod}
                />
                {/* Zoom gostergesi */}
                {zoomGoster && (
                  <View style={styles.zoomGosterge}>
                    <Text style={styles.zoomText}>
                      {(1 + zoom * 9).toFixed(1)}x
                    </Text>
                  </View>
                )}
                {/* Android'de CameraView native touch'lari yuttugu icin
                    gesture detector kameranin ustundeki seffaf View'i sariyor */}
                <GestureDetector gesture={pinchGesture}>
                  <View style={StyleSheet.absoluteFill} />
                </GestureDetector>
              </View>
            )}

            {/* Tarama cercevesi */}
            <View style={styles.cerceve} pointerEvents="none">
              <View style={styles.cerceveKose} />
              <View style={[styles.cerceveKose, styles.sagUst]} />
              <View style={[styles.cerceveKose, styles.solAlt]} />
              <View style={[styles.cerceveKose, styles.sagAlt]} />
              <View style={styles.taramaCizgisi} />
            </View>

            {/* Alt mesaj */}
            <View style={styles.altBar}>
              <Text style={styles.altMesaj}>Barkodu cerceve icine hizalayin</Text>
              {manuelOkuma && (
                <TouchableOpacity style={styles.manuelBtn} onPress={handleManuelOku}>
                  <Ionicons name="scan-outline" size={22} color="#fff" />
                  <Text style={styles.manuelBtnText}>Oku</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const CERCEVE_BOYUT = 240;
const KOSE_UZUNLUK = 28;
const KOSE_KALINLIK = 4;

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: '#000' },

  ustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  geriBtn: { padding: 4 },
  baslik: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  fenBtn: { padding: 4 },

  kamera: { flex: 1 },

  zoomGosterge: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  zoomText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  cerceve: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cerceveKose: {
    position: 'absolute',
    width: KOSE_UZUNLUK,
    height: KOSE_UZUNLUK,
    borderColor: '#ffa500',
    // sol ust
    top: '50%',
    left: '50%',
    marginTop: -CERCEVE_BOYUT / 2,
    marginLeft: -CERCEVE_BOYUT / 2,
    borderTopWidth: KOSE_KALINLIK,
    borderLeftWidth: KOSE_KALINLIK,
  },
  sagUst: {
    left: undefined,
    right: '50%',
    marginLeft: 0,
    marginRight: -CERCEVE_BOYUT / 2,
    borderLeftWidth: 0,
    borderRightWidth: KOSE_KALINLIK,
  },
  solAlt: {
    top: undefined,
    bottom: '50%',
    marginTop: 0,
    marginBottom: -CERCEVE_BOYUT / 2,
    borderTopWidth: 0,
    borderBottomWidth: KOSE_KALINLIK,
  },
  sagAlt: {
    top: undefined,
    left: undefined,
    bottom: '50%',
    right: '50%',
    marginTop: 0,
    marginLeft: 0,
    marginBottom: -CERCEVE_BOYUT / 2,
    marginRight: -CERCEVE_BOYUT / 2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: KOSE_KALINLIK,
    borderRightWidth: KOSE_KALINLIK,
  },
  taramaCizgisi: {
    width: CERCEVE_BOYUT - 8,
    height: 2,
    backgroundColor: '#ffa500',
    opacity: 0.8,
  },

  altBar: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  altMesaj: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  manuelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffa500',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 12,
    gap: 8,
  },
  manuelBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  merkezle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  mesaj: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  izinBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  izinBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  kapat: { marginTop: 8, padding: 8 },
  kapatText: { fontSize: 14 },
});
