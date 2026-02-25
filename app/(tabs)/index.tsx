import { Text } from '@/components/Themed';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/Categories';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Category } from '@/types/farm';
import * as Storage from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

export default function Dashboard() {
  const { transactions, plots, refreshAll } = useFarm();
  const [seasonStart, setSeasonStart] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

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
  
  const seasonTransactions = transactions.filter(t => new Date(t.date) >= seasonStart);
  const todayTransactions = seasonTransactions.filter(t => isSameDay(new Date(t.date), today));
  const monthTransactions = seasonTransactions.filter(t => isSameMonth(new Date(t.date), today));

  const getStats = (list: typeof transactions) => {
    const income = list.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const expense = list.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, profit: income - expense };
  };

  const seasonStats = getStats(seasonTransactions);
  const todayStats = getStats(todayTransactions);
  const monthStats = getStats(monthTransactions);

  const categoryData = Array.from(new Set(seasonTransactions.map(t => t.category))).map(cat => {
    const total = seasonTransactions.filter(t => t.category === cat).reduce((acc, t) => acc + t.amount, 0);
    return {
        name: cat,
        population: total,
        color: CATEGORY_COLORS[cat as Category] || Palette.primary,
        legendFontColor: Palette.textSecondary,
        legendFontSize: 12
    };
  }).filter(d => d.population > 0).sort((a, b) => b.population - a.population);

  const screenWidth = Dimensions.get('window').width;

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
        setSeasonStart(selectedDate);
        Storage.setSeasonStartDate(selectedDate);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
              <View>
                  <Text style={styles.greeting}>Farm Wise</Text>
                  <Text style={styles.date}>{format(today, 'EEEE, d MMM yyyy')}</Text>
              </View>
              <Pressable style={styles.profileButton}>
                  <Ionicons name="notifications-outline" size={24} color="white" />
              </Pressable>
          </View>
          
          <Pressable style={styles.balanceCard} onPress={() => setShowDatePicker(true)}>
              <View>
                <Text style={styles.balanceLabel}>Net Profit (Season)</Text>
                <Text style={styles.balanceAmount}>₹{seasonStats.profit.toLocaleString('en-IN')}</Text>
                <View style={styles.seasonBadge}>
                     <Text style={styles.seasonText}>Since {format(seasonStart, 'dd MMM')}</Text>
                     <Ionicons name="chevron-down" size={12} color="white" style={{marginLeft: 4}} />
                </View>
              </View>
              <View style={styles.balanceIcon}>
                  <Ionicons name={seasonStats.profit >= 0 ? "trending-up" : "trending-down"} size={32} color={seasonStats.profit >= 0 ? Palette.success : Palette.danger} />
              </View>
          </Pressable>
        </View>

        {showDatePicker && (
            <DateTimePicker
                value={seasonStart}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
            />
        )}

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
                        const pStats = getStats(transactions.filter(t => t.plotId === plot.id));
                        return (
                            <View key={plot.id} style={styles.plotMiniCard}>
                                <Text style={styles.plotMiniName}>{plot.name}</Text>
                                <Text style={styles.plotMiniCrop}>{plot.cropType}</Text>
                                <View style={styles.plotMiniStats}>
                                    <Text style={[styles.plotMiniValue, { color: pStats.profit >= 0 ? Palette.primary : Palette.danger }]}>
                                        ₹{pStats.profit >= 1000 ? (pStats.profit/1000).toFixed(1) + 'k' : pStats.profit}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        )}

        {/* Charts Section */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Financial Analysis</Text>
        </View>

        {categoryData.length > 0 ? (
            <View style={styles.chartCard}>
                <PieChart
                    data={categoryData}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={{
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"0"}
                    center={[10, 0]}
                    absolute
                />
            </View>
        ) : (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No transactions yet.</Text>
            </View>
        )}

        {/* Recent Transactions Preview */}
        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={() => { /* Navigate */ }}>
                <Text style={{ color: Palette.primary, fontFamily: 'Outfit-SemiBold' }}>See all</Text>
            </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
            {transactions.slice(0, 5).map((t) => (
                <View key={t.id} style={styles.miniTransactionCard}>
                    <View style={[styles.miniIcon, { backgroundColor: (CATEGORY_COLORS[t.category] || Palette.primary) + '20' }]}>
                        <Ionicons 
                            name={(CATEGORY_ICONS[t.category] as any) || 'cash'} 
                            size={16} 
                            color={CATEGORY_COLORS[t.category] || Palette.primary} 
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.miniTitle}>{t.title}</Text>
                        <Text style={styles.miniDate}>{format(new Date(t.date), 'd MMM')}</Text>
                    </View>
                    <Text style={[styles.miniAmount, { color: t.type === 'Income' ? Palette.success : Palette.danger }]}>
                        {t.type === 'Income' ? '+' : '-'}₹{t.amount.toFixed(0)}
                    </Text>
                </View>
            ))}
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
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    greeting: {
        fontSize: 22,
        fontFamily: 'Outfit-Bold',
        color: 'white',
    },
    date: {
        fontSize: 14,
        color: '#E0F2F1',
        marginTop: 4,
        opacity: 0.9,
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
    chartCard: {
        marginHorizontal: 20,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
    },
    miniTransactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    miniIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniTitle: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        color: Palette.text,
    },
    miniDate: {
        fontSize: 12,
        color: Palette.textSecondary,
    },
    miniAmount: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
    }
});
