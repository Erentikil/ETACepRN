import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  baslik: string;
  aciklama?: string;
}

export default function EmptyState({
  icon = 'file-tray-outline',
  baslik,
  aciklama,
}: EmptyStateProps) {
  return (
    <View style={styles.kapsayici}>
      <View style={styles.ikonKutu}>
        <Ionicons name={icon} size={72} color={`${Colors.primary}40`} />
      </View>
      <Text style={styles.baslik}>{baslik}</Text>
      {aciklama ? <Text style={styles.aciklama}>{aciklama}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
    gap: 8,
  },
  ikonKutu: {
    marginBottom: 8,
  },
  baslik: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
    textAlign: 'center',
  },
  aciklama: {
    fontSize: 13,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
});
