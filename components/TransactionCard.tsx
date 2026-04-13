import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/Categories';
import { Palette } from '../constants/Colors';
import { Category, Transaction } from '../types/farm';
import { Text } from './Themed';
import { useFarm } from '../context/FarmContext';

interface Props {
  transaction: Transaction;
  onDelete?: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  plotName?: string;
}

export function TransactionCard({ transaction, onDelete, onEdit, plotName }: Props) {
  const { inventory } = useFarm();
  const [expanded, setExpanded] = useState(false);

  const isIncome = transaction.type === 'Income';
  const color = CATEGORY_COLORS[transaction.category as Category] || Palette.primary;
  const iconName = (CATEGORY_ICONS[transaction.category as Category] as any) || 'apps';
  const inventoryItem = transaction.inventoryItemId ? inventory.find(i => i.id === transaction.inventoryItemId) : null;

  return (
    <View style={styles.card}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={iconName} size={20} color={color} />
        </View>
        
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={1}>{transaction.title}</Text>
          <View style={styles.subDetailRow}>
              <Text style={styles.date}>{format(new Date(transaction.date), 'dd MMM')}</Text>
              <Text style={styles.categoryBadge}> • {transaction.category}</Text>
              {plotName && <Text style={styles.plotBadge}> • {plotName}</Text>}
          </View>
        </View>
        
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: isIncome ? Palette.success : Palette.danger }]}>
              {isIncome ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
          </Text>
        </View>

        <Ionicons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={18} 
            color={Palette.textSecondary} 
            style={{ marginLeft: 6 }}
        />
      </Pressable>

      {expanded && (
        <View style={styles.expandedContent}>
            <View style={styles.detailList}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Title</Text>
                    <Text style={styles.detailValue}>{transaction.title}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue}>{transaction.category}</Text>
                </View>
                {inventoryItem && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Inventory Item</Text>
                        <Text style={styles.detailValue}>{inventoryItem.name} {transaction.quantity ? `(${transaction.quantity} ${inventoryItem.unit})` : ''}</Text>
                    </View>
                )}
                {transaction.note ? (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Note</Text>
                        <Text style={styles.detailValue}>{transaction.note}</Text>
                    </View>
                ) : null}
            </View>

            {(onEdit || onDelete) && (
              <View style={styles.actions}>
                {onEdit && (
                  <Pressable onPress={() => onEdit(transaction)} style={[styles.actionButton, { backgroundColor: Palette.primary + '10' }]}>
                    <Ionicons name="pencil-outline" size={16} color={Palette.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.actionText, { color: Palette.primary }]}>Edit</Text>
                  </Pressable>
                )}
                {onDelete && (
                  <Pressable onPress={() => onDelete(transaction.id)} style={[styles.actionButton, { backgroundColor: Palette.danger + '10' }]}>
                    <Ionicons name="trash-bin-outline" size={16} color={Palette.danger} style={{ marginRight: 6 }} />
                    <Text style={[styles.actionText, { color: Palette.danger }]}>Delete</Text>
                  </Pressable>
                )}
              </View>
            )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    marginVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
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
  categoryBadge: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontFamily: 'Outfit-Medium',
  },
  plotBadge: {
    fontSize: 12,
    color: Palette.primary,
    fontFamily: 'Outfit-Medium',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailList: {
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: Palette.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Outfit',
    color: Palette.text,
    maxWidth: '70%',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
  },
});
