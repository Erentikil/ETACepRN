import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';

let sepetSesi: Audio.Sound | null = null;

async function sepetSesiCal() {
  try {
    const sesAyar = await AsyncStorage.getItem(Config.STORAGE_KEYS.SEPET_SES);
    if (sesAyar === 'false') return;

    if (!sepetSesi) {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/sepet-bip.wav'),
        { volume: 0.5 }
      );
      sepetSesi = sound;
    } else {
      await sepetSesi.setPositionAsync(0);
    }
    await sepetSesi.playAsync();
  } catch (_) {
    // Ses çalamazsa sessizce devam et
  }
}

export function hafifTitresim() {
  Vibration.vibrate(200);
  sepetSesiCal();
}

export function ortaTitresim() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function basariliTitresim() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
