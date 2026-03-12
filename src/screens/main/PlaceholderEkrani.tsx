import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useRoute } from '@react-navigation/native';

export default function PlaceholderEkrani() {
  const route = useRoute();
  return (
    <View style={styles.container}>
      <Ionicons name="construct-outline" size={60} color={Colors.gray} />
      <Text style={styles.baslik}>{route.name}</Text>
      <Text style={styles.aciklama}>Bu ekran yakında eklenecek.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    gap: 12,
  },
  baslik: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.darkGray,
  },
  aciklama: {
    fontSize: 14,
    color: Colors.gray,
  },
});
