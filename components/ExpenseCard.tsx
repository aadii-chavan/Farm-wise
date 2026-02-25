import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/Categories';
import { Palette } from '../constants/Colors';
import { Expense } from '../types/expense';
import { Text } from './Themed';

interface Props {
  expense: Expense;
  onDelete?: (id: string) => void;
}

export function ExpenseCard({ expense, onDelete }: Props) {
  const color = CATEGORY_COLORS[expense.category];
  const iconName = CATEGORY_ICONS[expense.category] as any;

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>
      
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>{expense.title}</Text>
        <Text style={styles.date}>{format(new Date(expense.date), 'dd MMM, hh:mm a')}</Text>
      </View>
      
      <View style={styles.amountContainer}>
        <Text style={styles.amount}>-₹{expense.amount.toLocaleString('en-IN')}</Text>
      </View>

      {onDelete && (
        <Pressable onPress={() => onDelete(expense.id)} style={styles.deleteButton}>
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
    // marginHorizontal: 16, // Removed as parent handles padding now
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, // Much softer shadow
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
  date: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  amountContainer: {
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: Palette.danger, // Red for expense
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
});
