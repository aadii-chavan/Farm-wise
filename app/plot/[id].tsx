import { Text } from '@/components/Themed';
import { TransactionCard } from '@/components/TransactionCard';
import { FilterModal, FilterState } from '@/components/FilterModal';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { WorkbookSection } from '@/components/WorkbookSection';

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { plots, transactions, deleteTransaction } = useFarm();

  const confirmDelete = (txId: string) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this activity record? This will also revert any inventory deductions.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTransaction(txId) }
      ]
    );
  };

  const plot = plots.find((p) => p.id === id);
  const plotTransactions = transactions.filter((t) => t.plotId === id);



  const [filterState, setFilterState] = useState<FilterState>({
      type: 'Both',
      categories: [],
      dateFilter: 'All Time',
      customDate: null,
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'History' | 'WorkBook'>('History');

  const allCategories = useMemo(() => {
    return Array.from(new Set(plotTransactions.map(t => t.category)));
  }, [plotTransactions]);

  const filteredTransactions = useMemo(() => {
    return plotTransactions.filter((t) => {
        const d = new Date(t.date);
        const today = new Date();
        
        // Type filter
        if (filterState.type !== 'Both' && t.type !== filterState.type) return false;

        // Date Match
        let dateMatch = true;
        if (filterState.dateFilter === 'This Week') {
            // Simplified this week logic (last 7 days could also work, but "This Week" strictly is since sunday/monday)
            const sun = new Date(today);
            sun.setDate(today.getDate() - today.getDay());
            sun.setHours(0,0,0,0);
            dateMatch = d >= sun;
        } else if (filterState.dateFilter === 'This Month') {
            dateMatch = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        } else if (filterState.dateFilter === 'Last Month') {
            const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            dateMatch = d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
        } else if (filterState.dateFilter === 'Custom Date' && filterState.customDate) {
            dateMatch = d.toDateString() === filterState.customDate.toDateString();
        }
        if (!dateMatch) return false;

        let catMatch = true;
        if (filterState.categories.length > 0) {
            catMatch = filterState.categories.includes(t.category);
        }

        return catMatch;
    });
  }, [plotTransactions, filterState]);

  const income = filteredTransactions
    .filter((t) => t.type === 'Income')
    .reduce((acc, t) => acc + t.amount, 0);
  const expense = filteredTransactions
    .filter((t) => t.type === 'Expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const profit = income - expense;

  const groupedTransactions = useMemo(() => {
      const grouped = filteredTransactions.reduce((acc: any, t) => {
          const dateStr = new Date(t.date).toDateString();
          if (!acc[dateStr]) acc[dateStr] = [];
          acc[dateStr].push(t);
          return acc;
      }, {});

      return Object.keys(grouped)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map(date => ({
            date,
            data: grouped[date]
        }));
  }, [filteredTransactions]);

  if (!plot) {
    return (
      <View style={styles.container}>
        <Text>Plot not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: plot.name,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Palette.background },
          headerTintColor: Palette.text,
          headerTitleStyle: { fontFamily: 'Outfit-Bold' },
        }} 
      />
      
      <View style={styles.content}>
          <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                  <View>
                      <Text style={styles.statsTitle}>
                          {plot.cropType}{plot.variety ? ` (${plot.variety})` : ''}
                      </Text>
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

          <View style={styles.tabContainer}>
            <Pressable 
              style={[styles.tabButton, activeTab === 'History' && styles.activeTabButton]}
              onPress={() => setActiveTab('History')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'History' && styles.activeTabButtonText]}>History</Text>
            </Pressable>
            <Pressable 
              style={[styles.tabButton, activeTab === 'WorkBook' && styles.activeTabButton]}
              onPress={() => setActiveTab('WorkBook')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'WorkBook' && styles.activeTabButtonText]}>WorkBook</Text>
            </Pressable>
          </View>

          {activeTab === 'History' ? (
              <>
                  <View style={styles.filterRow}>
                      <Pressable style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
                          <Ionicons name="options" size={16} color={Palette.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.filterButtonText}>Filter</Text>
                          {((filterState.type !== 'Both' ? 1 : 0) + (filterState.dateFilter !== 'All Time' ? 1 : 0) + (filterState.categories.length > 0 ? 1 : 0)) > 0 && (
                          <View style={styles.filterBadge}>
                              <Text style={styles.filterBadgeText}>
                                  {(filterState.type !== 'Both' ? 1 : 0) + (filterState.dateFilter !== 'All Time' ? 1 : 0) + (filterState.categories.length > 0 ? 1 : 0)}
                              </Text>
                          </View>
                          )}
                          <Ionicons name="chevron-down" size={14} color={Palette.textSecondary} style={{ marginLeft: 6 }} />
                      </Pressable>
                      <Text style={styles.historyCount}>{filteredTransactions.length} entries</Text>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                      {groupedTransactions.length === 0 ? (
                          <View style={styles.emptyContainer}>
                              <Ionicons name="receipt-outline" size={48} color={Palette.textSecondary + '40'} />
                              <Text style={styles.emptyText}>No transactions for this plot yet.</Text>
                          </View>
                      ) : (
                          groupedTransactions.map((group, index) => (
                              <View key={group.date} style={styles.timelineGroup}>
                                  <View style={styles.timelineDateContainer}>
                                      <View style={styles.timelineDot} />
                                      <Text style={styles.timelineDateText}>
                                        {new Date(group.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                      </Text>
                                  </View>
                                  <View style={styles.timelineContent}>
                                      {group.data.map((item: any, idx: number) => (
                                          <View key={item.id} style={styles.timelineItemWrapper}>
                                              <TransactionCard 
                                                  transaction={item} 
                                                  onDelete={() => confirmDelete(item.id)}
                                                  onEdit={() => router.push({ pathname: '/add', params: { editId: item.id } })}
                                              />
                                          </View>
                                      ))}
                                  </View>
                              </View>
                          ))
                      )}
                  </ScrollView>
              </>
          ) : (
              <WorkbookSection plotId={id as string} />
          )}
      </View>

      {activeTab === 'History' && (
        <Pressable 
          style={styles.fab} 
          onPress={() => router.push({ pathname: '/add', params: { plotId: plot.id } })}
        >
          <Ionicons name="add" size={32} color="white" />
        </Pressable>
      )}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={setFilterState}
        initialFilters={filterState}
        availableCategories={allCategories}
      />
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
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
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
      marginBottom: 12,
  },
  statsTitle: {
      fontSize: 20,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
  },
  statsSubtitle: {
      fontSize: 12,
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
      paddingTop: 12,
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
      fontSize: 16,
      fontFamily: 'Outfit-Bold',
  },
  divider: {
      width: 1,
      height: 20,
      backgroundColor: '#f0f0f0',
  },
  filterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
  },
  filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'white',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#f0f0f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 3,
      elevation: 1,
  },
  filterButtonText: {
      fontFamily: 'Outfit-Medium',
      fontSize: 14,
      color: Palette.text,
  },
  filterBadge: {
      backgroundColor: Palette.primary,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 6,
      justifyContent: 'center',
      alignItems: 'center',
  },
  filterBadgeText: {
      color: 'white',
      fontSize: 10,
      fontFamily: 'Outfit-Bold',
  },
  historyCount: {
      fontSize: 12,
      color: Palette.textSecondary,
      fontFamily: 'Outfit-Medium',
  },
  tabContainer: {
      flexDirection: 'row',
      backgroundColor: '#f5f5f5',
      padding: 4,
      borderRadius: 12,
      marginBottom: 16,
  },
  tabButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
  },
  activeTabButton: {
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
  },
  tabButtonText: {
      fontFamily: 'Outfit-Medium',
      fontSize: 14,
      color: Palette.textSecondary,
  },
  activeTabButtonText: {
      color: Palette.primary,
      fontFamily: 'Outfit-Bold',
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
  timelineGroup: {
      marginBottom: 16,
  },
  timelineDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: Palette.primary,
      marginRight: 10,
      shadowColor: Palette.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 2,
  },
  timelineDateText: {
      fontSize: 15,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
  },
  timelineContent: {
      borderLeftWidth: 2,
      borderLeftColor: Palette.border,
      marginLeft: 4,
      paddingLeft: 16,
      paddingBottom: 8,
  },
  timelineItemWrapper: {
      marginBottom: 4,
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
