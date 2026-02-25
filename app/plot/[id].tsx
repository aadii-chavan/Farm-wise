import { Text } from '@/components/Themed';
import { TransactionCard } from '@/components/TransactionCard';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { plots, transactions, deleteTransaction } = useFarm();

  const plot = plots.find((p) => p.id === id);
  const plotTransactions = transactions.filter((t) => t.plotId === id);

  if (!plot) {
    return (
      <View style={styles.container}>
        <Text>Plot not found</Text>
      </View>
    );
  }

  const income = plotTransactions
    .filter((t) => t.type === 'Income')
    .reduce((acc, t) => acc + t.amount, 0);
  const expense = plotTransactions
    .filter((t) => t.type === 'Expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const profit = income - expense;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: plot.name,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Palette.background },
        }} 
      />
      
      <View style={styles.content}>
          <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                  <View>
                      <Text style={styles.statsTitle}>{plot.cropType}</Text>
                      <Text style={styles.statsSubtitle}>{plot.area} Acres</Text>
                  </View>
                  <View style={[styles.profitBadge, { backgroundColor: profit >= 0 ? Palette.success + '20' : Palette.danger + '20' }]}>
                      <Text style={[styles.profitText, { color: profit >= 0 ? Palette.success : Palette.danger }]}>
                          {profit >= 0 ? '↑' : '↓'} ₹{Math.abs(profit).toLocaleString()}
                      </Text>
                  </View>
              </View>

              <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Total Income</Text>
                      <Text style={[styles.statValue, { color: Palette.success }]}>₹{income.toLocaleString()}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Total Expense</Text>
                      <Text style={[styles.statValue, { color: Palette.danger }]}>₹{expense.toLocaleString()}</Text>
                  </View>
              </View>
          </View>

          <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Plot History</Text>
              <Text style={styles.historyCount}>{plotTransactions.length} entries</Text>
          </View>

          <FlatList
            data={plotTransactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <TransactionCard 
                    transaction={item} 
                    onDelete={() => deleteTransaction(item.id)}
                />
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={48} color={Palette.textSecondary + '40'} />
                    <Text style={styles.emptyText}>No transactions for this plot yet.</Text>
                </View>
            }
          />
      </View>

      <Pressable 
        style={styles.fab} 
        onPress={() => router.push({ pathname: '/add', params: { plotId: plot.id } })}
      >
        <Ionicons name="add" size={32} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
      flex: 1,
      padding: 20,
  },
  statsCard: {
      backgroundColor: 'white',
      borderRadius: 24,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 15,
      elevation: 5,
  },
  statsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
  },
  statsTitle: {
      fontSize: 24,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
  },
  statsSubtitle: {
      fontSize: 14,
      color: Palette.textSecondary,
      fontFamily: 'Outfit',
  },
  profitBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
  },
  profitText: {
      fontSize: 14,
      fontFamily: 'Outfit-Bold',
  },
  statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#f5f5f5',
      paddingTop: 20,
  },
  statItem: {
      flex: 1,
      alignItems: 'center',
  },
  statLabel: {
      fontSize: 12,
      color: Palette.textSecondary,
      fontFamily: 'Outfit-Medium',
      marginBottom: 4,
  },
  statValue: {
      fontSize: 18,
      fontFamily: 'Outfit-Bold',
  },
  divider: {
      width: 1,
      height: 30,
      backgroundColor: '#f0f0f0',
  },
  historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 4,
  },
  historyTitle: {
      fontSize: 18,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
  },
  historyCount: {
      fontSize: 12,
      color: Palette.textSecondary,
      fontFamily: 'Outfit-Medium',
  },
  emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 40,
  },
  emptyText: {
      fontSize: 14,
      color: Palette.textSecondary,
      fontFamily: 'Outfit',
      marginTop: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: Palette.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
