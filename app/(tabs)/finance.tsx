import { Text } from '@/components/Themed';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/Categories';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Category } from '@/types/farm';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function FinanceAnalysis() {
  const { transactions, plots } = useFarm();
  const router = useRouter();

  const [selectedPlots, setSelectedPlots] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Toggle helpers
  const togglePlot = (id: string) => {
    if (selectedPlots.includes(id)) {
      setSelectedPlots(selectedPlots.filter(p => p !== id));
    } else {
      setSelectedPlots([...selectedPlots, id]);
    }
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Filter Data
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchPlot = selectedPlots.length === 0 || (t.plotId && selectedPlots.includes(t.plotId));
      const matchCat = selectedCategories.length === 0 || selectedCategories.includes(t.category);
      return matchPlot && matchCat;
    });
  }, [transactions, selectedPlots, selectedCategories]);

  // Aggregation
  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'Income').reduce((a, b) => a + b.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'Expense').reduce((a, b) => a + b.amount, 0);
    return { income, expense, profit: income - expense };
  }, [filteredTransactions]);

  const categoryBreakdown = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'Expense');
    const categories = Array.from(new Set(expenses.map(t => t.category)));
    return categories.map(cat => {
      const total = expenses.filter(t => t.category === cat).reduce((acc, t) => acc + t.amount, 0);
      return {
        name: cat,
        total,
        percentage: stats.expense > 0 ? (total / stats.expense) * 100 : 0,
        color: CATEGORY_COLORS[cat as Category] || Palette.primary,
        icon: CATEGORY_ICONS[cat as Category] || 'cash'
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredTransactions, stats.expense]);

  const plotBreakdown = useMemo(() => {
    return plots.map(plot => {
      const pTrans = filteredTransactions.filter(t => t.plotId === plot.id);
      const income = pTrans.filter(t => t.type === 'Income').reduce((a, b) => a + b.amount, 0);
      const expense = pTrans.filter(t => t.type === 'Expense').reduce((a, b) => a + b.amount, 0);
      return {
        ...plot,
        income,
        expense,
        profit: income - expense,
        total: pTrans.length
      };
    }).filter(p => p.total > 0).sort((a, b) => b.profit - a.profit);
  }, [plots, filteredTransactions]);

  const allCategories = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.category)));
  }, [transactions]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Analysis",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <Ionicons name="arrow-back" size={24} color={Palette.text} />
            </Pressable>
          ),
          headerStyle: {
            backgroundColor: Palette.background,
          },
          headerShadowVisible: false,
        }}
      />
      
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Filter Section */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Filter by Plot</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <Pressable
                  style={[styles.chip, selectedPlots.length === 0 && styles.chipActive]}
                  onPress={() => setSelectedPlots([])}
                >
                  <Text style={[styles.chipText, selectedPlots.length === 0 && styles.chipTextActive]}>All Plots</Text>
                </Pressable>
                {plots.map(plot => (
                  <Pressable
                      key={plot.id}
                      style={[styles.chip, selectedPlots.includes(plot.id) && styles.chipActive]}
                      onPress={() => togglePlot(plot.id)}
                  >
                      <Text style={[styles.chipText, selectedPlots.includes(plot.id) && styles.chipTextActive]}>{plot.name}</Text>
                  </Pressable>
                ))}
            </ScrollView>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Filter by Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <Pressable
                  style={[styles.chip, selectedCategories.length === 0 && styles.chipActive]}
                  onPress={() => setSelectedCategories([])}
                >
                  <Text style={[styles.chipText, selectedCategories.length === 0 && styles.chipTextActive]}>All Categories</Text>
                </Pressable>
                {allCategories.map(cat => (
                  <Pressable
                      key={cat}
                      style={[styles.chip, selectedCategories.includes(cat) && styles.chipActive]}
                      onPress={() => toggleCategory(cat)}
                  >
                      <Text style={[styles.chipText, selectedCategories.includes(cat) && styles.chipTextActive]}>{cat}</Text>
                  </Pressable>
                ))}
            </ScrollView>
        </View>

        {/* Global Stats */}
        <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Overview</Text>
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Income</Text>
                    <Text style={[styles.statValue, { color: Palette.success }]}>₹{stats.income.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Expense</Text>
                    <Text style={[styles.statValue, { color: Palette.danger }]}>₹{stats.expense.toLocaleString('en-IN')}</Text>
                </View>
                <View style={[styles.statBox, { borderRightWidth: 0 }]}>
                    <Text style={styles.statLabel}>Profit</Text>
                    <Text style={[styles.statValue, { color: stats.profit >= 0 ? Palette.primary : Palette.danger }]}>
                        {stats.profit >= 0 ? '+' : '-'}₹{Math.abs(stats.profit).toLocaleString('en-IN')}
                    </Text>
                </View>
            </View>
        </View>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Expense Breakdown</Text>
                {categoryBreakdown.map(item => (
                    <View key={item.name} style={styles.breakdownItem}>
                        <View style={styles.breakdownHeader}>
                            <View style={styles.breakdownLeft}>
                                <View style={[styles.iconBadge, { backgroundColor: item.color + '20' }]}>
                                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                                </View>
                                <Text style={styles.breakdownLabel}>{item.name}</Text>
                            </View>
                            <View style={styles.breakdownRight}>
                                <Text style={styles.breakdownAmount}>₹{item.total.toLocaleString('en-IN')}</Text>
                            </View>
                        </View>
                        <View style={styles.progressBg}>
                            <View style={[styles.progressFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
                        </View>
                    </View>
                ))}
            </View>
        )}

        {/* Plot Breakdown */}
        {plotBreakdown.length > 0 && (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Plot Profitability</Text>
                {plotBreakdown.map(plot => (
                    <View key={plot.id} style={styles.plotItem}>
                        <View style={styles.plotHeader}>
                            <Text style={styles.plotName}>{plot.name} <Text style={styles.plotCrop}>({plot.cropType})</Text></Text>
                            <Text style={[styles.plotProfit, { color: plot.profit >= 0 ? Palette.primary : Palette.danger }]}>
                                {plot.profit >= 0 ? '+' : '-'}₹{Math.abs(plot.profit).toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={styles.plotDetails}>
                            <Text style={styles.plotDetailText}>In: ₹{plot.income.toLocaleString('en-IN')}</Text>
                            <Text style={styles.plotDetailText}>Out: ₹{plot.expense.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                ))}
            </View>
        )}
        
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: Palette.textSecondary,
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  chipText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: Palette.textSecondary,
  },
  chipTextActive: {
    color: 'white',
  },
  statsCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statsTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginBottom: 16,
    color: Palette.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Outfit',
    color: Palette.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  card: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginBottom: 16,
    color: Palette.text,
  },
  breakdownItem: {
    marginBottom: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  breakdownLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: Palette.text,
  },
  breakdownRight: {
  },
  breakdownAmount: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  progressBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  plotItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  plotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  plotName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: Palette.text,
  },
  plotCrop: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Palette.textSecondary,
  },
  plotProfit: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  plotDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  plotDetailText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Palette.textSecondary,
  }
});
