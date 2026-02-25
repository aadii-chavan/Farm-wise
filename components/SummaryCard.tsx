import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  title: string;
  amount: number;
  color?: string;
}

export function SummaryCard({ title, amount, color = '#4CAF50' }: Props) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.amount, { color }]}>₹{amount.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flex: 1,
    marginHorizontal: 4,
  },
  title: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
    fontWeight: '500',
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
