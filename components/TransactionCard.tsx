import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/Categories';
import { Palette } from '../constants/Colors';
import { Transaction } from '../types/farm';
import { Text } from './Themed';

interface Props {
  transaction: Transaction;
  onDelete?: (id: string) => void;
  plotName?: string;
}

export function TransactionCard({ transaction, onDelete, plotName }: Props) {
  const isIncome = transaction.type === 'Income';
  const color = CATEGORY_COLORS[transaction.category];
  const iconName = CATEGORY_ICONS[transaction.category] as any;

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>
      
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>{transaction.title}</Text>
        <View style={styles.subDetailRow}>
            <Text style={styles.date}>{format(new Date(transaction.date), 'dd MMM')}</Text>
            {plotName && <Text style={styles.plotBadge}> • {plotName}</Text>}
        </View>
      </View>
      
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: isIncome ? Palette.success : Palette.danger }]}>
            {isIncome ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
        </Text>
      </View>

      {onDelete && (
        <Pressable onPress={() => onDelete(transaction.id)} style={styles.deleteButton}>
           <Ionicons name="trash-bin-outline" size={18} color={Palette.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: Palette.text,
    marginBottom: 4,
  },
  subDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontFamily: 'Outfit',
  },
  plotBadge: {
    fontSize: 12,
    color: Palette.primary,
    fontFamily: 'Outfit-Medium',
  },
  amountContainer: {
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
});
