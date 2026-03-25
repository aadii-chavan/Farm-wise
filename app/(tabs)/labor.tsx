import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function LaborScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Labor coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
});
