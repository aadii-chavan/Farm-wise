import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/Categories';
import { Palette } from '../constants/Colors';
import { Category, InventoryItem } from '../types/farm';
import { Text } from './Themed';

interface Props {
  item: InventoryItem;
  onUpdateQuantity: (delta: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function InventoryCard({ item, onUpdateQuantity, onEdit, onDelete }: Props) {
  const color = CATEGORY_COLORS[item.category as Category] || Palette.primary;
  const iconName = (CATEGORY_ICONS[item.category as Category] as any) || 'cube';
  const [expanded, setExpanded] = React.useState(false);

  const creditAmount = React.useMemo(() => {
     if (item.paymentMode !== 'Credit' || !item.pricePerUnit) return null;
     const principal = item.pricePerUnit * item.quantity;
     if (!item.purchaseDate || !item.interestRate || !item.interestPeriod) return principal;
     
     const daysElapsed = Math.max(0, Math.floor((Date.now() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)));
     let ratePerDay = 0;
     if (item.interestPeriod === 'day') ratePerDay = item.interestRate / 100;
     else if (item.interestPeriod === 'week') ratePerDay = (item.interestRate / 100) / 7;
     else if (item.interestPeriod === 'month') ratePerDay = (item.interestRate / 100) / 30;
     else if (item.interestPeriod === 'year') ratePerDay = (item.interestRate / 100) / 365;
     
     const interestAmt = principal * ratePerDay * daysElapsed;
     return principal + interestAmt;
  }, [item]);

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>
      
      <Pressable style={styles.details} onPress={() => setExpanded(!expanded)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 10 }}>
            <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.category}>{item.category}</Text>
            </View>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={Palette.textSecondary} />
        </View>

        {item.pricePerUnit && (
            <Text style={styles.priceText}>₹{item.pricePerUnit.toLocaleString()} / {item.unit}</Text>
        )}
        
        {expanded ? (
            <View style={{ marginTop: 8, gap: 2, paddingRight: 8 }}>
                {item.shopName && <Text style={styles.subDetail}>Shop: {item.shopName}</Text>}
                {item.companyName && <Text style={styles.subDetail}>Brand: {item.companyName}</Text>}
                {item.batchNo && <Text style={styles.subDetail}>Batch: {item.batchNo}</Text>}
                {item.invoiceNo && <Text style={styles.subDetail}>Inv: {item.invoiceNo}</Text>}
                {item.purchaseDate && <Text style={styles.subDetail}>Purchased: {new Date(item.purchaseDate).toLocaleDateString()}</Text>}
                {item.paymentMode === 'Credit' && (
                    <View style={{ backgroundColor: '#fffbeb', padding: 8, borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#fef3c7' }}>
                        <Text style={[styles.subDetail, { color: '#d97706', fontFamily: 'Outfit-Medium' }]}>
                            💳 Credit {item.interestRate ? `(${item.interestRate}% per ${item.interestPeriod})` : ''}
                        </Text>
                        {creditAmount !== null && (
                            <Text style={[styles.subDetail, { color: '#d97706', fontFamily: 'Outfit-Bold' }]}>
                                Est. Due Now: ₹{creditAmount.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                            </Text>
                        )}
                    </View>
                )}
                {item.note && <Text style={[styles.subDetail, { marginTop: 4, fontStyle: 'italic' }]}>Note: {item.note}</Text>}
                
                {!(item.shopName || item.companyName || item.batchNo || item.invoiceNo || item.purchaseDate || item.paymentMode === 'Credit' || item.note) && (
                    <Text style={[styles.subDetail, { fontStyle: 'italic', opacity: 0.6 }]}>No additional tracking details.</Text>
                )}
            </View>
        ) : (
            <View style={{ marginTop: 4 }}>
                {item.shopName && <Text style={styles.subDetail} numberOfLines={1}>Shop: {item.shopName}</Text>}
                {item.paymentMode === 'Credit' && (
                    <Text style={[styles.subDetail, { color: '#d97706' }]} numberOfLines={1}>
                        Credit {item.interestRate ? `(${item.interestRate}% ${item.interestPeriod})` : ''}
                    </Text>
                )}
            </View>
        )}
      </Pressable>

      <View style={styles.actionColumn}>
          <View style={styles.qDisplay}>
                <Text style={styles.qValue}>{item.quantity}</Text>
                <Text style={styles.qUnit}>{item.unit}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <Pressable onPress={onEdit}>
                  <Text style={[styles.actionText, { color: Palette.primary }]}>Edit</Text>
              </Pressable>
              <Pressable onPress={onDelete}>
                  <Text style={[styles.actionText, { color: Palette.danger }]}>Remove</Text>
              </Pressable>
          </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  category: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontFamily: 'Outfit',
    marginTop: 2,
  },
  actionColumn: {
      alignItems: 'flex-end',
  },
  quantityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Palette.background,
      borderRadius: 12,
      padding: 4,
  },
  qBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 1,
  },
  qDisplay: {
      paddingHorizontal: 12,
      alignItems: 'center',
  },
  qValue: {
      fontSize: 14,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
  },
  qUnit: {
      fontSize: 9,
      fontFamily: 'Outfit-Medium',
      color: Palette.textSecondary,
      marginTop: -2,
  },
  actionText: {
      fontSize: 13,
      fontFamily: 'Outfit-Bold',
  },
  priceText: {
      fontSize: 12,
      color: Palette.primary,
      fontFamily: 'Outfit-Medium',
      marginTop: 2,
  },
  subDetail: {
      fontSize: 11,
      color: Palette.textSecondary,
      fontFamily: 'Outfit',
      marginTop: 1,
  }
});
