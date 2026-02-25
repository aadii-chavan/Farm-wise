import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Palette } from '../constants/Colors';
import { Plot } from '../types/farm';
import { Text } from './Themed';

interface Props {
  plot: Plot;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  stats?: { income: number, expense: number };
}

export function PlotCard({ plot, onPress, onDelete, onEdit, stats }: Props) {
  const profit = stats ? stats.income - stats.expense : 0;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
            <View style={styles.iconCircle}>
                <Ionicons name="map" size={20} color={Palette.primary} />
            </View>
            <View>
                <Text style={styles.name}>{plot.name}</Text>
                <Text style={styles.details}>{plot.cropType} • {plot.area} Acres</Text>
            </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {onEdit && (
                <Pressable onPress={onEdit} style={styles.editBtn}>
                    <Ionicons name="pencil-outline" size={18} color={Palette.textSecondary} />
                </Pressable>
            )}
            {onDelete && (
                <Pressable onPress={onDelete} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={Palette.danger} />
                </Pressable>
            )}
        </View>
      </View>

      {stats && (
          <View style={styles.statsRow}>
              <View style={styles.stat}>
                  <Text style={styles.statLabel}>Expense</Text>
                  <Text style={[styles.statValue, { color: Palette.danger }]}>₹{stats.expense.toLocaleString()}</Text>
              </View>
              <View style={styles.stat}>
                  <Text style={styles.statLabel}>Income</Text>
                  <Text style={[styles.statValue, { color: Palette.success }]}>₹{stats.income.toLocaleString()}</Text>
              </View>
              <View style={styles.stat}>
                  <Text style={styles.statLabel}>Net Profit</Text>
                  <Text style={[styles.statValue, { color: profit >= 0 ? Palette.primary : Palette.danger }]}>
                      ₹{profit.toLocaleString()}
                  </Text>
              </View>
          </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: Palette.primaryLight + '40',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  details: {
    fontSize: 14,
    color: Palette.textSecondary,
    fontFamily: 'Outfit',
  },
  deleteBtn: {
      padding: 8,
  },
  editBtn: {
      padding: 8,
      marginRight: 4,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingTop: 12,
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontFamily: 'Outfit-Medium',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
  },
});
