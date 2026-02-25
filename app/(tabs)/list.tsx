import { ExpenseCard } from '@/components/ExpenseCard';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { useExpenses } from '@/context/ExpensesContext';
import { useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

export default function ExpensesList() {
  const { expenses, deleteExpense, refreshExpenses } = useExpenses();

  useFocusEffect(
    useCallback(() => {
        refreshExpenses();
    }, [])
  );

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteExpense(id) }
      ]
    );
  };

  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpenseCard expense={item} onDelete={confirmDelete} />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
        ListHeaderComponent={() => (
            <View style={{ marginBottom: 16 }}>
                 <Text style={styles.title}>All Transactions</Text>
            </View>
        )}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No expenses found. Add some!</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background, // Updated background
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
