import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';

export function useTarayiciAyarlari() {
  const [manuelOkuma, setManuelOkuma] = useState(false);
  const [baslangicZoom, setBaslangicZoom] = useState(0);

  useEffect(() => {
    (async () => {
      const okuma = await AsyncStorage.getItem(Config.STORAGE_KEYS.KAMERA_OKUMA);
      const zoom = await AsyncStorage.getItem(Config.STORAGE_KEYS.KAMERA_BASLANGIC_ZOOM);
      if (okuma === 'elle') setManuelOkuma(true);
      if (zoom) setBaslangicZoom(parseFloat(zoom) || 0);
    })();
  }, []);

  return { manuelOkuma, baslangicZoom };
}
