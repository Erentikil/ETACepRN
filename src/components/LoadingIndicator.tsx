import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Text,
} from 'react-native';
import { Colors } from '../constants/Colors';

interface Props {
  visible: boolean;
  mesaj?: string;
}

export default function LoadingIndicator({ visible, mesaj }: Props) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={Colors.accent} />
          {mesaj ? <Text style={styles.mesaj}>{mesaj}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    minWidth: 140,
    gap: 14,
  },
  mesaj: {
    color: Colors.darkGray,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
