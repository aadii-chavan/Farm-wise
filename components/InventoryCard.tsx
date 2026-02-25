import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/Categories';
import { Palette } from '../constants/Colors';
import { InventoryItem } from '../types/farm';
import { Text } from './Themed';

interface Props {
  item: InventoryItem;
  onUpdateQuantity: (delta: number) => void;
  onDelete: () => void;
}

export function InventoryCard({ item, onUpdateQuantity, onDelete }: Props) {
  const color = CATEGORY_COLORS[item.category];
  const iconName = CATEGORY_ICONS[item.category] as any;

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>
      
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.category}>{item.category}</Text>
      </View>

      <View style={styles.actionColumn}>
          <View style={styles.quantityRow}>
            <Pressable 
                onPress={() => onUpdateQuantity(-1)} 
                style={[styles.qBtn, item.quantity <= 0 && { opacity: 0.5 }]}
                disabled={item.quantity <= 0}
            >
                <Ionicons name="remove" size={16} color={Palette.text} />
            </Pressable>
            <View style={styles.qDisplay}>
                <Text style={styles.qValue}>{item.quantity}</Text>
                <Text style={styles.qUnit}>{item.unit}</Text>
            </View>
            <Pressable onPress={() => onUpdateQuantity(1)} style={styles.qBtn}>
                <Ionicons name="add" size={16} color={Palette.text} />
            </Pressable>
          </View>
          <Pressable onPress={onDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Remove</Text>
          </Pressable>
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
  deleteBtn: {
      marginTop: 8,
  },
  deleteText: {
      fontSize: 10,
      color: Palette.danger,
      fontFamily: 'Outfit-Medium',
  }
});
