import { Text } from '@/components/Themed';
import { TransactionCard } from '@/components/TransactionCard';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, SectionList, StyleSheet, View, Pressable, StatusBar } from 'react-native';
import { format, isToday, isYesterday, isSameYear } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

type TransactionFilter = 'All' | 'Income' | 'Expense';

export default function TransactionsList() {
  const router = useRouter();
  const { transactions, plots, deleteTransaction, refreshTransactions } = useFarm();
  const [filter, setFilter] = useState<TransactionFilter>('All');

  useFocusEffect(
    useCallback(() => {
        refreshTransactions();
    }, [])
  );

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this transaction? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTransaction(id) }
      ]
    );
  };

  // Group transactions by date
  const sections = useMemo(() => {
    const filtered = transactions.filter(t => {
        if (filter === 'All') return true;
        return t.type === filter;
    });

    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const groups: Record<string, typeof transactions> = {};
    
    sorted.forEach(t => {
        const date = new Date(t.date);
        let dateLabel = '';
        if (isToday(date)) dateLabel = 'Today';
        else if (isYesterday(date)) dateLabel = 'Yesterday';
        else if (isSameYear(date, new Date())) dateLabel = format(date, 'MMMM d');
        else dateLabel = format(date, 'MMMM d, yyyy');
        
        if (!groups[dateLabel]) groups[dateLabel] = [];
        groups[dateLabel].push(t);
    });

    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [transactions, filter]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ 
        title: 'Transaction History',
        headerStyle: { backgroundColor: Palette.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Outfit-Bold', fontSize: 20 },
        headerTintColor: Palette.text,
      }} />

      {/* Filter Row */}
      <View style={styles.filterContainer}>
          {(['All', 'Income', 'Expense'] as TransactionFilter[]).map((f) => (
              <Pressable 
                key={f} 
                onPress={() => setFilter(f)}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
              >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
              </Pressable>
          ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        renderItem={({ item }) => {
          const plot = plots.find(p => p.id === item.plotId);
          return (
            <TransactionCard 
                transaction={item} 
                onDelete={() => confirmDelete(item.id)} 
                onEdit={() => router.push({ pathname: '/add', params: { editId: item.id } })}
                plotName={plot?.name}
            />
          );
        }}
        renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <View style={styles.sectionLine} />
            </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                    <Ionicons name="receipt-outline" size={40} color={Palette.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>No Records Found</Text>
                <Text style={styles.emptySubtitle}>
                    {filter === 'All' 
                        ? "You haven't recorded any transactions yet." 
                        : `No ${filter.toLowerCase()} records match your filter.`}
                </Text>
                {filter !== 'All' && (
                    <Pressable style={styles.resetBtn} onPress={() => setFilter('All')}>
                        <Text style={styles.resetBtnText}>Clear Filter</Text>
                    </Pressable>
                )}
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
  filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 10,
  },
  filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: 'white',
      borderWidth: 1,
      borderColor: '#f0f0f0',
  },
  filterChipActive: {
      backgroundColor: Palette.primary,
      borderColor: Palette.primary,
  },
  filterText: {
      fontSize: 14,
      fontFamily: 'Outfit-Medium',
      color: Palette.textSecondary,
  },
  filterTextActive: {
      color: 'white',
  },
  listContent: {
      paddingHorizontal: 20,
      paddingBottom: 100,
  },
  sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 12,
  },
  sectionTitle: {
      fontSize: 14,
      fontFamily: 'Outfit-Bold',
      color: Palette.textSecondary,
      marginRight: 10,
      textTransform: 'uppercase',
      letterSpacing: 1,
  },
  sectionLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#f0f0f0',
  },
  emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 80,
      paddingHorizontal: 40,
  },
  emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#f1f1f1',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
  },
  emptyTitle: {
      fontSize: 20,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
      marginBottom: 8,
  },
  emptySubtitle: {
      fontSize: 15,
      color: Palette.textSecondary,
      fontFamily: 'Outfit',
      textAlign: 'center',
      lineHeight: 22,
  },
  resetBtn: {
      marginTop: 24,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: Palette.primary + '10',
  },
  resetBtnText: {
      color: Palette.primary,
      fontFamily: 'Outfit-Bold',
      fontSize: 15,
  }
});
