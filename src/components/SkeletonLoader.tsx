import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '../contexts/ThemeContext';

interface SkeletonLoaderProps {
  satirSayisi?: number;
}

function SkeletonSatir() {
  const Colors = useColors();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.satir, { backgroundColor: Colors.card }, animStyle]}>
      <View style={[styles.solBlok, { backgroundColor: Colors.border }]} />
      <View style={styles.icerik}>
        <View style={[styles.ustCizgi, { backgroundColor: Colors.border }]} />
        <View style={[styles.altCizgi, { backgroundColor: Colors.border }]} />
      </View>
      <View style={[styles.sagBlok, { backgroundColor: Colors.border }]} />
    </Animated.View>
  );
}

export default function SkeletonLoader({ satirSayisi = 6 }: SkeletonLoaderProps) {
  return (
    <View style={styles.kapsayici}>
      {Array.from({ length: satirSayisi }).map((_, i) => (
        <SkeletonSatir key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 8,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  solBlok: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  icerik: {
    flex: 1,
    gap: 8,
  },
  ustCizgi: {
    height: 12,
    width: '70%',
    borderRadius: 6,
  },
  altCizgi: {
    height: 10,
    width: '45%',
    borderRadius: 6,
  },
  sagBlok: {
    width: 50,
    height: 14,
    borderRadius: 6,
  },
});
