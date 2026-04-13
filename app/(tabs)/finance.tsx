import { Text } from '@/components/Themed';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/Categories';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Category } from '@/types/farm';
import { Ionicons } from '@expo/vector-icons';
import { format, isAfter, startOfMonth, startOfYear } from 'date-fns';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

type PeriodType = 'This Month' | 'This Year' | 'All Time';
type BreakdownType = 'Expenses' | 'Income';

export default function FinanceAnalysis() {
  const { transactions, plots } = useFarm();
  const router = useRouter();

  const [period, setPeriod] = useState<PeriodType>('All Time');
  const [selectedPlots, setSelectedPlots] = useState<string[]>([]);
  const [breakdownType, setBreakdownType] = useState<BreakdownType>('Expenses');

  // Filter Data
  const baseTransactions = useMemo(() => {
    const now = new Date();
    const startDate = period === 'This Month' ? startOfMonth(now) : period === 'This Year' ? startOfYear(now) : new Date(0);
    return transactions.filter(t => isAfter(new Date(t.date), startDate) || new Date(t.date).getTime() === startDate.getTime());
  }, [transactions, period]);

  const filteredTransactions = useMemo(() => {
    return baseTransactions.filter(t => {
      const matchPlot = selectedPlots.length === 0 || (t.plotId && selectedPlots.includes(t.plotId));
      return matchPlot;
    });
  }, [baseTransactions, selectedPlots]);

  // Toggle helpers
  const togglePlot = (id: string) => {
    if (selectedPlots.includes(id)) {
      setSelectedPlots(selectedPlots.filter(p => p !== id));
    } else {
      setSelectedPlots([...selectedPlots, id]);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'Income').reduce((a, b) => a + b.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'Expense').reduce((a, b) => a + b.amount, 0);
    const profit = income - expense;
    const margin = income > 0 ? (profit / income) * 100 : 0;
    const opRatio = income > 0 ? (expense / income) * 100 : (expense > 0 ? 100 : 0);
    return { income, expense, profit, margin, opRatio };
  }, [filteredTransactions]);

  // Chart Data: Monthly Cash Flow
  const chartData = useMemo(() => {
    const grouped: Record<string, { income: number; expense: number }> = {};
    const monthsSorted = [...filteredTransactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Default months population so chart doesn't break
    if (period === 'This Year' || period === 'This Month') {
      const now = new Date();
      const startM = period === 'This Year' ? 0 : now.getMonth();
      for(let m = startM; m <= now.getMonth(); m++) {
          const d = new Date(now.getFullYear(), m, 1);
          grouped[format(d, 'MMM yy')] = { income: 0, expense: 0 };
      }
    }

    monthsSorted.forEach(t => {
       const m = format(new Date(t.date), 'MMM yy');
       if (!grouped[m]) grouped[m] = { income: 0, expense: 0 };
       if (t.type === 'Income') grouped[m].income += t.amount;
       else grouped[m].expense += t.amount;
    });

    const labels = Object.keys(grouped);
    const displayLabels = labels.slice(-6); // Max 6 points for visual clarity
    const incomes = displayLabels.map(l => grouped[l].income);
    const expenses = displayLabels.map(l => grouped[l].expense);

    if (displayLabels.length === 0) {
        displayLabels.push(format(new Date(), 'MMM yy'));
        incomes.push(0);
        expenses.push(0);
    }
    if (displayLabels.length === 1) {
        displayLabels.unshift('');
        incomes.unshift(0);
        expenses.unshift(0);
    }

    return {
      labels: displayLabels.map(l => l.split(' ')[0]),
      datasets: [
        {
          data: incomes,
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // success
          strokeWidth: 3
        },
        {
          data: expenses,
          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // danger
          strokeWidth: 3
        }
      ],
      legend: ["Income", "Expenses"]
    };
  }, [filteredTransactions, period]);

  const categoryPieData = useMemo(() => {
    const typeFilter = breakdownType === 'Expenses' ? 'Expense' : 'Income';
    const subset = filteredTransactions.filter(t => t.type === typeFilter);
    const totalAmount = breakdownType === 'Expenses' ? stats.expense : stats.income;
    const categories = Array.from(new Set(subset.map(t => t.category)));
    
    return categories.map(cat => {
      const total = subset.filter(t => t.category === cat).reduce((acc, t) => acc + t.amount, 0);
      return {
        name: cat,
        population: total,
        color: CATEGORY_COLORS[cat as Category] || Palette.primary,
        legendFontColor: Palette.textSecondary,
        legendFontSize: 12,
        percentage: totalAmount > 0 ? (total / totalAmount) * 100 : 0
      };
    }).sort((a, b) => b.population - a.population);
  }, [filteredTransactions, stats, breakdownType]);

  const plotBreakdown = useMemo(() => {
    return plots.map(plot => {
      const pTrans = filteredTransactions.filter(t => t.plotId === plot.id);
      
      const incomeTrans = pTrans.filter(t => t.type === 'Income');
      const expenseTrans = pTrans.filter(t => t.type === 'Expense');
      
      const income = incomeTrans.reduce((a, b) => a + b.amount, 0);
      const expense = expenseTrans.reduce((a, b) => a + b.amount, 0);
      
      // Get category breakdowns for THIS plot specifically
      const getTop = (trans: typeof transactions) => {
         const cats = Array.from(new Set(trans.map(t => t.category)));
         return cats.map(cat => ({
            name: cat,
            amount: trans.filter(t => t.category === cat).reduce((a,b)=>a+b.amount,0)
         })).sort((a,b) => b.amount - a.amount);
      };

      return {
        ...plot,
        income,
        expense,
        profit: income - expense,
        total: pTrans.length,
        margin: income > 0 ? ((income - expense) / income) * 100 : 0,
        topIncome: getTop(incomeTrans),
        topExpenses: getTop(expenseTrans)
      };
    }).filter(p => p.total > 0).sort((a, b) => b.profit - a.profit);
  }, [plots, filteredTransactions]);

  const topPlot = plotBreakdown.length > 0 ? plotBreakdown[0] : null;
  const maxExpenseCat = categoryPieData.length > 0 && breakdownType === 'Expenses' ? categoryPieData[0] : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Dashboard",
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
        
        {/* Filters */}
        <View style={styles.filterSection}>
            <View style={styles.segmentContainer}>
                {(['This Month', 'This Year', 'All Time'] as PeriodType[]).map(p => (
                    <Pressable 
                        key={p} 
                        onPress={() => setPeriod(p)} 
                        style={[styles.segmentBtn, period === p && styles.segmentBtnActive]}
                    >
                        <Text style={[styles.segmentText, period === p && styles.segmentTextActive]}>{p}</Text>
                    </Pressable>
                ))}
            </View>
            
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

        {/* Global KPIs (Premium Dark Card) */}
        <View style={styles.kpiHero}>
            <Text style={styles.kpiHeroLabel}>Net Profit ({period})</Text>
            <Text style={[styles.kpiHeroValue, { color: stats.profit >= 0 ? Palette.success : Palette.danger }]}>
                {stats.profit >= 0 ? '+' : '-'}₹{Math.abs(stats.profit).toLocaleString('en-IN')}
            </Text>
            
            <View style={styles.kpiGrid}>
                <View style={styles.kpiBox}>
                    <Text style={styles.kpiLabel}>Total Income</Text>
                    <Text style={styles.kpiVal}>₹{stats.income.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.kpiBox}>
                    <Text style={styles.kpiLabel}>Total Expenses</Text>
                    <Text style={styles.kpiVal}>₹{stats.expense.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.kpiBox}>
                    <Text style={styles.kpiLabel}>Profit Margin</Text>
                    <Text style={[styles.kpiVal, { color: stats.margin >= 0 ? Palette.success : Palette.danger }]}>{stats.margin.toFixed(1)}%</Text>
                </View>
                <View style={styles.kpiBox}>
                    <Text style={styles.kpiLabel}>Expense Ratio</Text>
                    <Text style={[styles.kpiVal, { color: 'white' }]}>{stats.opRatio.toFixed(1)}%</Text>
                </View>
            </View>
        </View>

        {/* Quick Insights (Farmer friendly overview) */}
        <View style={styles.insightsSection}>
           <Text style={styles.sectionTitle}>Quick Insights</Text>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                {topPlot && (
                    <View style={styles.insightCard}>
                         <View style={[styles.insightIconBadge, { backgroundColor: Palette.success + '20' }]}>
                             <Ionicons name="trophy" size={16} color={Palette.success} />
                         </View>
                         <Text style={styles.insightLabel}>Top Plot</Text>
                         <Text style={styles.insightValue}>{topPlot.name}</Text>
                         <Text style={styles.insightSub}>₹{topPlot.profit.toLocaleString('en-IN')} Net</Text>
                    </View>
                )}
                {maxExpenseCat && (
                    <View style={styles.insightCard}>
                         <View style={[styles.insightIconBadge, { backgroundColor: Palette.danger + '20' }]}>
                             <Ionicons name="trending-down" size={16} color={Palette.danger} />
                         </View>
                         <Text style={styles.insightLabel}>Highest Expense</Text>
                         <Text style={styles.insightValue}>{maxExpenseCat.name}</Text>
                         <Text style={styles.insightSub}>₹{maxExpenseCat.population.toLocaleString('en-IN')} Total</Text>
                    </View>
                )}
                <View style={styles.insightCard}>
                     <View style={[styles.insightIconBadge, { backgroundColor: Palette.primary + '20' }]}>
                         <Ionicons name="pie-chart" size={16} color={Palette.primary} />
                     </View>
                     <Text style={styles.insightLabel}>Total Transactions</Text>
                     <Text style={styles.insightValue}>{filteredTransactions.length}</Text>
                     <Text style={styles.insightSub}>Period count</Text>
                </View>
           </ScrollView>
        </View>

        {/* Trend Analysis */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Income vs Expense Trend</Text>
            <Text style={styles.cardSubtitle}>Your financial trends over time</Text>
            <View style={styles.chartWrapper}>
              <LineChart
                data={chartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                    backgroundColor: 'white',
                    backgroundGradientFrom: 'white',
                    backgroundGradientTo: 'white',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => Palette.textSecondary,
                    propsForDots: { r: "4", strokeWidth: "2", stroke: "white" }
                }}
                bezier
                style={{ marginLeft: -16 }} 
              />
            </View>
        </View>

        {/* Category Breakdown (Toggle Income/Expense) */}
        <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
                <View>
                    <Text style={styles.cardTitle}>Category Breakdown</Text>
                    <Text style={styles.cardSubtitle}>Where your money is going / coming from</Text>
                </View>
            </View>
            
            <View style={styles.toggleRow}>
                 <Pressable 
                    style={[styles.toggleBtn, breakdownType === 'Income' && {backgroundColor: Palette.success}]} 
                    onPress={() => setBreakdownType('Income')}
                 >
                     <Text style={[styles.toggleText, breakdownType === 'Income' && {color: 'white'}]}>Income</Text>
                 </Pressable>
                 <Pressable 
                    style={[styles.toggleBtn, breakdownType === 'Expenses' && {backgroundColor: Palette.danger}]} 
                    onPress={() => setBreakdownType('Expenses')}
                 >
                     <Text style={[styles.toggleText, breakdownType === 'Expenses' && {color: 'white'}]}>Expenses</Text>
                 </Pressable>
            </View>

            {categoryPieData.length > 0 ? (
                <>
                    <PieChart
                      data={categoryPieData}
                      width={screenWidth - 40}
                      height={180}
                      chartConfig={{
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      }}
                      accessor={"population"}
                      backgroundColor={"transparent"}
                      paddingLeft={"0"}
                      center={[8, 0]}
                    />

                    {/* Detailed List */}
                    <View style={styles.detailedList}>
                        {categoryPieData.map(item => (
                            <View key={item.name} style={styles.breakdownItem}>
                                <View style={styles.breakdownHeader}>
                                    <View style={styles.breakdownLeft}>
                                        <View style={[styles.iconBadge, { backgroundColor: item.color + '20' }]}>
                                            <Ionicons name={(CATEGORY_ICONS[item.name as Category] as any) || 'cash'} size={14} color={item.color} />
                                        </View>
                                        <Text style={styles.breakdownItemLabel}>{item.name}</Text>
                                    </View>
                                    <View style={styles.breakdownRight}>
                                        <Text style={styles.breakdownAmount}>₹{item.population.toLocaleString('en-IN')}</Text>
                                        <Text style={styles.breakdownPercent}>{item.percentage.toFixed(1)}%</Text>
                                    </View>
                                </View>
                                <View style={styles.progressBg}>
                                    <View style={[styles.progressFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
                                </View>
                            </View>
                        ))}
                    </View>
                </>
            ) : (
                <Text style={styles.emptyText}>No {breakdownType.toLowerCase()} found for this period.</Text>
            )}
        </View>

        {/* Asset / Plot Performance Details */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plot-Wise Performance</Text>
            <Text style={{ fontFamily: 'Outfit', color: Palette.textSecondary, marginBottom: 16 }}>Every plot's individual contribution and specific expenses</Text>
            {plotBreakdown.map(plot => (
                <View key={plot.id} style={styles.plotItem}>
                    <View style={styles.plotHeader}>
                        <Text style={styles.plotName}>{plot.name} <Text style={styles.plotCrop}>({plot.cropType})</Text></Text>
                        <Text style={[styles.plotProfit, { color: plot.profit >= 0 ? Palette.success : Palette.danger }]}>
                            {plot.profit >= 0 ? '+' : '-'}₹{Math.abs(plot.profit).toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <View style={styles.plotDetailsRow}>
                        <View style={styles.plotDetailBox}>
                            <Text style={styles.plotDetailLabel}>Total Income</Text>
                            <Text style={[styles.plotDetailVal, {color: Palette.success}]}>₹{plot.income.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.plotDetailBox}>
                            <Text style={styles.plotDetailLabel}>Total Expenses</Text>
                            <Text style={[styles.plotDetailVal, {color: Palette.danger}]}>₹{plot.expense.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={[styles.plotDetailBox, { borderRightWidth: 0, alignItems: 'flex-end', paddingRight: 8 }]}>
                            <Text style={styles.plotDetailLabel}>Profit Margin</Text>
                            <Text style={styles.plotDetailVal}>{plot.margin.toFixed(1)}%</Text>
                        </View>
                    </View>

                    {/* Sub-Category Breakdowns per plot */}
                    <View style={styles.subBreakdownArea}>
                        {plot.topIncome.length > 0 && (
                            <View style={styles.subBreakdownCol}>
                                <Text style={styles.subBreakdownTitle}>Income Sources</Text>
                                {plot.topIncome.slice(0,3).map(inc => (
                                    <Text key={inc.name} style={styles.subBreakdownLine}>• {inc.name}: ₹{inc.amount.toLocaleString('en-IN')}</Text>
                                ))}
                            </View>
                        )}
                        {plot.topExpenses.length > 0 && (
                            <View style={styles.subBreakdownCol}>
                                <Text style={styles.subBreakdownTitle}>Main Expenses</Text>
                                {plot.topExpenses.slice(0,3).map(exp => (
                                    <Text key={exp.name} style={styles.subBreakdownLine}>• {exp.name}: ₹{exp.amount.toLocaleString('en-IN')}</Text>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            ))}
            {plotBreakdown.length === 0 && (
                <Text style={styles.emptyText}>No plot transactions found.</Text>
            )}
        </View>
        
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  filterSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: Palette.textSecondary,
  },
  segmentTextActive: {
    color: Palette.primary,
    fontFamily: 'Outfit-Bold',
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 10,
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
  kpiHero: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  kpiHeroLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
    textAlign: 'center',
  },
  kpiHeroValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 36,
    textAlign: 'center',
    marginBottom: 24,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 20,
    gap: 16,
  },
  kpiBox: {
    width: '45%',
  },
  kpiLabel: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  kpiVal: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: 'white',
  },
  insightsSection: {
    marginTop: 24,
  },
  insightCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    width: 140,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  insightIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: Palette.textSecondary,
    marginBottom: 4,
  },
  insightValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: Palette.text,
  },
  insightSub: {
    fontFamily: 'Outfit',
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 4,
  },
  card: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: Palette.text,
  },
  cardSubtitle: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Palette.textSecondary,
    marginBottom: 16,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: Palette.textSecondary,
  },
  chartWrapper: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  detailedList: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
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
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  breakdownItemLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: Palette.text,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownAmount: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  breakdownPercent: {
    fontFamily: 'Outfit',
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
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
  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
    marginBottom: 4,
  },
  plotItem: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  plotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  plotName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
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
  plotDetailsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  plotDetailBox: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  plotDetailLabel: {
    fontFamily: 'Outfit',
    fontSize: 11,
    color: Palette.textSecondary,
    marginBottom: 4,
  },
  plotDetailVal: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: Palette.text,
  },
  subBreakdownArea: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  subBreakdownCol: {
    flex: 1,
  },
  subBreakdownTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: Palette.text,
    marginBottom: 8,
  },
  subBreakdownLine: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Palette.textSecondary,
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    margin: 20,
    color: Palette.textSecondary,
    fontFamily: 'Outfit',
  }
});
