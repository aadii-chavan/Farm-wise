import CalendarModal from '@/components/CalendarModal';
import { Text } from '@/components/Themed';
import { TransactionCard } from '@/components/TransactionCard';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/Categories';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Category } from '@/types/farm';
import * as Storage from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';


export default function Dashboard() {
  const { transactions, plots, inventory, loading, refreshAll } = useFarm();
  const { signOut } = useAuth();
  const router = useRouter();

  const [seasonStart, setSeasonStart] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [showCalendar, setShowCalendar] = useState(false);

  const loadData = async () => {
      await refreshAll();
      const seasonDate = await Storage.getSeasonStartDate();
      setSeasonStart(seasonDate);
  }

  useFocusEffect(
    useCallback(() => {
        loadData();
    }, [])
  );

  const today = new Date();
  
  // Filter data by periods
  const seasonTransactions = transactions.filter(t => new Date(t.date) >= seasonStart);
  const seasonInventory = inventory.filter(i => i.purchaseDate && new Date(i.purchaseDate) >= seasonStart);
  
  const todayTransactions = seasonTransactions.filter(t => isSameDay(new Date(t.date), today));
  const todayInventory = seasonInventory.filter(i => i.purchaseDate && isSameDay(new Date(i.purchaseDate), today));
  
  const monthTransactions = seasonTransactions.filter(t => isSameMonth(new Date(t.date), today));
  const monthInventory = seasonInventory.filter(i => i.purchaseDate && isSameMonth(new Date(i.purchaseDate), today));

  // Robust helper to calculate interest paid within a period using lifetime deltas
  const getInterestPaidInPeriod = (startDate: Date, endDate: Date) => {
    const calculateLifetimeInterest = (targetDate: Date) => {
        const shopNames = Array.from(new Set(inventory.map(i => i.shopName).filter((s): s is string => !!s)));
        let totalInterest = 0;
        shopNames.forEach(name => {
            const payments = transactions.filter(t => t.type === 'Expense' && t.category === 'Shop Payment' && t.title === name && new Date(t.date) <= targetDate);
            const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
            
            const inv = inventory.filter(i => i.shopName === name && i.purchaseDate && new Date(i.purchaseDate) <= targetDate);
            const totalPrincipal = inv.reduce((acc, i) => acc + ((i.pricePerUnit || 0) * i.quantity), 0);
            
            if (totalPaid > totalPrincipal) {
                totalInterest += (totalPaid - totalPrincipal);
            }
        });
        return totalInterest;
    };

    const interestAtEnd = calculateLifetimeInterest(endDate);
    const interestAtStart = calculateLifetimeInterest(startDate);
    return Math.max(0, interestAtEnd - interestAtStart);
  };

  const getStats = (txList: typeof transactions, invList: typeof inventory = [], startDate: Date = seasonStart, endDate: Date = today) => {
    const income = txList.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    
    // Base expenses (non-shop transactions)
    const baseTxExpense = txList.filter(t => t.type === 'Expense' && t.category !== 'Shop Payment').reduce((acc, t) => acc + t.amount, 0);
    
    // Inventory purchases (Accrual basis)
    const invExpense = invList.reduce((acc, i) => acc + ((i.pricePerUnit || 0) * i.quantity), 0);
    
    // Actual Interest Paid in this specific period
    const interestPaid = getInterestPaidInPeriod(startDate, endDate);
    
    const expense = baseTxExpense + invExpense + interestPaid;
    return { income, expense, profit: income - expense };
  };

  const seasonStats = getStats(seasonTransactions, seasonInventory, seasonStart, today);
  const todayStats = getStats(todayTransactions, todayInventory, today, today);
  const monthStats = getStats(monthTransactions, monthInventory, new Date(today.getFullYear(), today.getMonth(), 1), today);

  // Prepare Category Data for Chart
  const categoryData = React.useMemo(() => {
    const categoriesMap: Record<string, number> = {};
    
    // 1. Add base expenses (excluding shop payments)
    seasonTransactions.filter(t => t.type === 'Expense' && t.category !== 'Shop Payment').forEach(t => {
        categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.amount;
    });
    
    // 2. Add inventory purchases (grouped by category: Seeds, Fertilizer, etc.)
    seasonInventory.forEach(i => {
        const amount = (i.pricePerUnit || 0) * i.quantity;
        categoriesMap[i.category] = (categoriesMap[i.category] || 0) + amount;
    });
    
    // 3. Add Interest Paid
    const interestPaid = getInterestPaidInPeriod(seasonStart, today);
    if (interestPaid > 0) {
        categoriesMap['Interest & Finance'] = (categoriesMap['Interest & Finance'] || 0) + interestPaid;
    }

    return Object.entries(categoriesMap)
        .map(([name, total]) => ({
            name,
            population: total,
            percentage: seasonStats.expense > 0 ? (total / seasonStats.expense) * 100 : 0,
            color: CATEGORY_COLORS[name as Category] || Palette.primary,
        }))
        .filter(d => d.population > 0)
        .sort((a, b) => b.population - a.population);
  }, [seasonTransactions, seasonInventory, seasonStats.expense, seasonStart]);

  const screenWidth = Dimensions.get('window').width;

  const onSelectSeasonStart = (selectedDate: Date) => {
    setSeasonStart(selectedDate);
    Storage.setSeasonStartDate(selectedDate);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
              <View>
                  <Text style={styles.greeting}>Welcome Back,</Text>
                  <Text style={styles.date}>{format(today, 'EEEE, d MMMM')}</Text>
              </View>
              <Pressable 
                  style={styles.profileButton} 
                  onPress={() => router.push('/(tabs)/schedule')}
              >
                  <Ionicons name="notifications-outline" size={32} color="yellow" />
              </Pressable>
          </View>
          
          <View style={styles.balanceCard}>
              <View>
                <Text style={styles.balanceLabel}>Net Profit (Season)</Text>
                <Text style={styles.balanceAmount}>₹{seasonStats.profit.toLocaleString('en-IN')}</Text>
                <Pressable style={styles.seasonBadge} onPress={(e) => { e.stopPropagation(); setShowCalendar(true); }}>
                     <Text style={styles.seasonText}>Since {format(seasonStart, 'dd MMM')}</Text>
                     <Ionicons name="calendar-outline" size={12} color="white" style={{marginLeft: 4}} />
                </Pressable>
              </View>
          </View>
        </View>

        <CalendarModal
          visible={showCalendar}
          initialDate={seasonStart}
          onClose={() => setShowCalendar(false)}
          onSelectDate={onSelectSeasonStart}
          maximumDate={new Date()}
        />

        {/* Summary Stats */}
        <View style={styles.statsRow}>
             <View style={styles.statCard}>
                 <View style={[styles.iconCircle, { backgroundColor: Palette.success + '20' }]}>
                     <Ionicons name="arrow-up-circle" size={20} color={Palette.success} />
                 </View>
                 <Text style={styles.statLabel}>Total Income</Text>
                 <Text style={[styles.statValue, { color: Palette.success }]}>₹{seasonStats.income.toLocaleString('en-IN')}</Text>
             </View>
             <View style={styles.statCard}>
                 <View style={[styles.iconCircle, { backgroundColor: Palette.danger + '20' }]}>
                     <Ionicons name="arrow-down-circle" size={20} color={Palette.danger} />
                 </View>
                 <Text style={styles.statLabel}>Total Expense</Text>
                 <Text style={[styles.statValue, { color: Palette.danger }]}>₹{seasonStats.expense.toLocaleString('en-IN')}</Text>
             </View>
        </View>

        {/* Plots Quick View */}
        {plots.length > 0 && (
            <View>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Plot Performance</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                    {plots.map(plot => {
                        const pStats = getStats(transactions.filter(t => t.plotId === plot.id), [], seasonStart, today);
                        return (
                            <Pressable 
                                key={plot.id} 
                                style={styles.plotMiniCard}
                                onPress={() => router.push(`/plot/${plot.id}`)}
                            >
                                <Text style={styles.plotMiniName}>{plot.name}</Text>
                                <Text style={styles.plotMiniCrop}>{plot.cropType}</Text>
                                <View style={styles.plotMiniStats}>
                                    <Text style={[styles.plotMiniValue, { color: pStats.profit >= 0 ? Palette.primary : Palette.danger }]}>
                                        ₹{pStats.profit >= 1000 ? (pStats.profit/1000).toFixed(1) + 'k' : pStats.profit}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>
        )}

        {/* Charts Section */}
        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={styles.sectionTitle}>Financial Analysis</Text>
        </View>

        {categoryData.length > 0 ? (
            <View style={styles.analysisCard}>
                <View style={styles.analysisHeader}>
                    <View>
                        <Text style={styles.analysisTitle}>Spending by category</Text>
                        <Text style={styles.analysisSubtitle}>Season overview</Text>
                    </View>
                    <View style={styles.analysisChip}>
                        <Ionicons name="pie-chart-outline" size={16} color="white" />
                        <Text style={styles.analysisChipText}>
                            ₹{seasonStats.expense.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>

                <View style={styles.analysisPillsRow}>
                    {[
                        { label: 'Today', value: todayStats.profit },
                        { label: 'This Month', value: monthStats.profit },
                        { label: 'Season', value: seasonStats.profit },
                    ].map((item) => (
                        <View
                            key={item.label}
                            style={[
                                styles.analysisPill,
                                item.label === 'Season' && styles.analysisPillPrimary,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.analysisPillLabel,
                                    item.label === 'Season' && styles.analysisPillLabelPrimary,
                                ]}
                            >
                                {item.label}
                            </Text>
                            <Text
                                style={[
                                    styles.analysisPillValue,
                                    item.value >= 0
                                        ? { color: Palette.success }
                                        : { color: Palette.danger },
                                ]}
                            >
                                {item.value >= 0 ? '₹' : '-₹'}
                                {Math.abs(item.value).toLocaleString('en-IN')}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.breakdownContainer}>
                    {categoryData.map((item) => (
                        <View key={item.name} style={styles.breakdownItem}>
                            <View style={styles.breakdownHeader}>
                                <View style={styles.breakdownLeft}>
                                    <View style={[styles.breakdownIconBadge, { backgroundColor: item.color + '20' }]}>
                                        <Ionicons 
                                            name={(CATEGORY_ICONS[item.name as Category] as any) || 'cash'} 
                                            size={14} 
                                            color={item.color} 
                                        />
                                    </View>
                                    <Text style={styles.breakdownLabel}>{item.name}</Text>
                                </View>
                                <View style={styles.breakdownRight}>
                                    <Text style={styles.breakdownAmount}>
                                        ₹{item.population.toLocaleString('en-IN')}
                                    </Text>
                                    <Text style={styles.breakdownPercent}>
                                        {item.percentage.toFixed(1)}%
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View 
                                    style={[
                                        styles.progressBarFill, 
                                        { width: `${item.percentage}%`, backgroundColor: item.color }
                                    ]} 
                                />
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        ) : (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No transactions yet.</Text>
            </View>
        )}

        {/* Recent Transactions Preview */}
        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={() => { router.push('/list') }}>
                <Text style={{ color: Palette.primary, fontFamily: 'Outfit-SemiBold' }}>See all</Text>
            </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
            {transactions.slice(0, 5).map((t) => {
                const plotName = t.plotId ? plots.find(p => p.id === t.plotId)?.name : undefined;
                return <TransactionCard key={t.id} transaction={t} plotName={plotName} />;
            })}
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
    headerContainer: {
        backgroundColor: Palette.primary,
        paddingTop: 20,
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greeting: {
        fontSize: 18,
        fontFamily: 'Outfit-Medium',
        color: 'white',
        opacity: 0.9,
    },
    date: {
        fontSize: 24,
        fontFamily: 'Outfit-Bold',
        color: 'white',
        marginTop: 2,
    },
    profileButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceLabel: {
        color: '#E0F2F1',
        fontSize: 14,
        marginBottom: 8,
    },
    balanceAmount: {
        color: 'white',
        fontSize: 32,
        fontFamily: 'Outfit-Bold',
    },
    balanceIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    seasonBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    seasonText: {
        color: 'white',
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 20,
        gap: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
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
    sectionHeader: {
        paddingHorizontal: 20,
        marginTop: 24,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    plotMiniCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        marginRight: 12,
        width: 140,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    plotMiniName: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    plotMiniCrop: {
        fontSize: 11,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginBottom: 8,
    },
    plotMiniStats: {
        marginTop: 4,
    },
    plotMiniValue: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
    analysisCard: {
        marginHorizontal: 20,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    analysisHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    analysisTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    analysisSubtitle: {
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 2,
    },
    analysisChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.primary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    analysisChipText: {
        marginLeft: 6,
        color: 'white',
        fontSize: 13,
        fontFamily: 'Outfit-SemiBold',
    },
    analysisPillsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    analysisPill: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 14,
        backgroundColor: Palette.background,
        marginRight: 8,
    },
    analysisPillPrimary: {
        backgroundColor: Palette.primary + '10',
        marginRight: 0,
    },
    analysisPillLabel: {
        fontSize: 11,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    analysisPillLabelPrimary: {
        color: Palette.primary,
    },
    analysisPillValue: {
        marginTop: 4,
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
    },
    breakdownContainer: {
        marginTop: 16,
        gap: 16,
    },
    breakdownItem: {
        width: '100%',
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
    breakdownIconBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    breakdownLabel: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: Palette.text,
    },
    breakdownRight: {
        alignItems: 'flex-end',
    },
    breakdownAmount: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    breakdownPercent: {
        fontSize: 11,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 2,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: Palette.background,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
    }
});
