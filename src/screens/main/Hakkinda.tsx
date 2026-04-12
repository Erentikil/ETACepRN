import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useTheme } from '../../contexts/ThemeContext';
import { Config } from '../../constants/Config';

export default function Hakkinda() {
  const Colors = useColors();
  const { isDark } = useTheme();

  const versiyon = Config.VERSIYON.replace(/-/g, '.');

  const handleLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={
            isDark
              ? require('../../../assets/eta-logo-white-red.png')
              : require('../../../assets/eta-logo-blue.png')
          }
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={styles.titleRow}>
          <Text style={[styles.titleETA, { color: Colors.primary }]}>ETA </Text>
          <Text style={[styles.titleMobil, { color: Colors.error }]}>Mobil</Text>
        </View>
        {/* <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Horizon</Text> */}
      </View>

      {/* Firma Bilgileri */}
      <View style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
        <Text style={[styles.firmaAdi, { color: Colors.text }]}>
          Horizon Software Bilişim Teknolojileri Ltd. Şti.
        </Text>

        <View style={styles.separator} />

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => handleLink('https://www.horizonyazilim.com.tr')}
          activeOpacity={0.7}
        >
          <Ionicons name="globe-outline" size={18} color={Colors.primary} />
          <Text style={[styles.linkText, { color: Colors.primary }]}>
            www.horizonyazilim.com.tr
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => handleLink('https://www.etahrzone.com')}
          activeOpacity={0.7}
        >
          <Ionicons name="globe-outline" size={18} color={Colors.primary} />
          <Text style={[styles.linkText, { color: Colors.primary }]}>
            www.horizonyazilim.com
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => handleLink('mailto:info@horizonyazilim.com.tr')}
          activeOpacity={0.7}
        >
          <Ionicons name="mail-outline" size={18} color={Colors.primary} />
          <Text style={[styles.linkText, { color: Colors.primary }]}>
            info@horizonyazilim.com.tr
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => handleLink('tel:02123207153')}
          activeOpacity={0.7}
        >
          <Ionicons name="call-outline" size={18} color={Colors.primary} />
          <Text style={[styles.linkText, { color: Colors.primary }]}>
            (0212) 320 71 53
          </Text>
        </TouchableOpacity>
      </View>

      {/* Versiyon */}
      <Text style={[styles.versiyon, { color: Colors.error }]}>
        ETA Mobil Ver:{versiyon}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 32,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 90,
    height: 90,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  titleETA: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  titleMobil: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 11,
    letterSpacing: 1,
  },
  card: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 4,
  },
  firmaAdi: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginBottom: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  versiyon: {
    fontSize: 13,
    fontWeight: '500',
  },
});
