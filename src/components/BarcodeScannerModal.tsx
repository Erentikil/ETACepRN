import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface Props {
  visible: boolean;
  onDetected: (barkod: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerModal({ visible, onDetected, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [zoomGoster, setZoomGoster] = useState(false);
  const tarandiRef = useRef(false);
  const zoomGosterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startZoom = useSharedValue(0);
  const zoomValue = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      tarandiRef.current = false;
      setTorchOn(false);
      setZoom(0);
      zoomValue.value = 0;
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

  const handleBarkod = ({ data }: { data: string }) => {
    if (tarandiRef.current) return;
    tarandiRef.current = true;
    onDetected(data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.ekran}>
        {!permission ? (
          <View style={styles.merkezle}>
            <Text style={styles.mesaj}>Kamera izni kontrol ediliyor...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.merkezle}>
            <Ionicons name="camera-outline" size={64} color={Colors.gray} />
            <Text style={styles.mesaj}>Barkod okumak için kamera iznine ihtiyaç var.</Text>
            <TouchableOpacity style={styles.izinBtn} onPress={requestPermission}>
              <Text style={styles.izinBtnText}>İzin Ver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.kapat} onPress={onClose}>
              <Text style={styles.kapatText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Üst bar */}
            <View style={styles.ustBar}>
              <TouchableOpacity onPress={onClose} style={styles.geriBtn}>
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
              <Text style={styles.baslik}>Barkod Tara</Text>
              <TouchableOpacity onPress={() => setTorchOn((t) => !t)} style={styles.fenBtn}>
                <Ionicons
                  name={torchOn ? 'flashlight' : 'flashlight-outline'}
                  size={24}
                  color={torchOn ? '#ffa500' : Colors.white}
                />
              </TouchableOpacity>
            </View>

            {/* Kamera — sadece modal açıkken ve taranmamışsa aktif */}
            {visible && (
              <GestureDetector gesture={pinchGesture}>
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
                  {/* Zoom göstergesi */}
                  {zoomGoster && (
                    <View style={styles.zoomGosterge}>
                      <Text style={styles.zoomText}>
                        {(1 + zoom * 9).toFixed(1)}×
                      </Text>
                    </View>
                  )}
                </View>
              </GestureDetector>
            )}

            {/* Tarama çerçevesi */}
            <View style={styles.cerceve} pointerEvents="none">
              <View style={styles.cerceveKose} />
              <View style={[styles.cerceveKose, styles.sagUst]} />
              <View style={[styles.cerceveKose, styles.solAlt]} />
              <View style={[styles.cerceveKose, styles.sagAlt]} />
              <View style={styles.taramaСizgisi} />
            </View>

            {/* Alt mesaj */}
            <View style={styles.altBar}>
              <Text style={styles.altMesaj}>Barkodu çerçeve içine hizalayın</Text>
            </View>
          </>
        )}
      </View>
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
    color: Colors.white,
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
    color: Colors.white,
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
    // sol üst
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
  taramaСizgisi: {
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
    color: Colors.white,
    fontSize: 14,
    opacity: 0.8,
  },

  merkezle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
    backgroundColor: Colors.white,
  },
  mesaj: {
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: 'center',
    lineHeight: 24,
  },
  izinBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  izinBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  kapat: { marginTop: 8, padding: 8 },
  kapatText: { color: Colors.gray, fontSize: 14 },
});
