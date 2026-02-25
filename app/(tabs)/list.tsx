import { Text } from '@/components/Themed';
import { TransactionCard } from '@/components/TransactionCard';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

export default function TransactionsList() {
  const { transactions, plots, deleteTransaction, refreshTransactions } = useFarm();

  useFocusEffect(
    useCallback(() => {
        refreshTransactions();
    }, [])
  );

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this record?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTransaction(id) }
      ]
    );
  };

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const plot = plots.find(p => p.id === item.plotId);
          return (
            <TransactionCard 
                transaction={item} 
                onDelete={confirmDelete} 
                plotName={plot?.name}
            />
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
        ListHeaderComponent={() => (
            <View style={{ marginBottom: 16 }}>
                 <Text style={styles.title}>All Transactions</Text>
            </View>
        )}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No transactions found.</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  title: {
      fontSize: 20,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
  },
  emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 100,
  },
  emptyText: {
      fontSize: 16,
      color: Palette.textSecondary,
      fontFamily: 'Outfit-Medium',
  }
});
