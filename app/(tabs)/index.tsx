import { CATEGORIES, CATEGORY_COLORS } from '@/constants/Categories';
import { Palette } from '@/constants/Colors';
import { useExpenses } from '@/context/ExpensesContext';
import * as Storage from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

export default function Dashboard() {
  const { expenses, refreshExpenses } = useExpenses();
  const [seasonStart, setSeasonStart] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadData = async () => {
      await refreshExpenses();
      const seasonDate = await Storage.getSeasonStartDate();
      setSeasonStart(seasonDate);
  }

  useFocusEffect(
    useCallback(() => {
        loadData();
    }, [])
  );

  const today = new Date();
  
  const todayExpenses = expenses.filter(e => isSameDay(new Date(e.date), today));
  const monthExpenses = expenses.filter(e => isSameMonth(new Date(e.date), today));
  const seasonExpenses = expenses.filter(e => new Date(e.date) >= seasonStart);

  const totalToday = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalMonth = monthExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalSeason = seasonExpenses.reduce((acc, e) => acc + e.amount, 0);

  const categoryData = CATEGORIES.map(cat => {
    const total = seasonExpenses.filter(e => e.category === cat).reduce((acc, e) => acc + e.amount, 0);
    return {
        name: cat,
        population: total,
        color: CATEGORY_COLORS[cat], // Keep using category colors
        legendFontColor: Palette.textSecondary,
        legendFontSize: 12
    };
  }).filter(d => d.population > 0);

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
                <Text style={styles.balanceLabel}>Total Spend (Season)</Text>
                <Text style={styles.balanceAmount}>₹{totalSeason.toLocaleString('en-IN')}</Text>
                <View style={styles.seasonBadge}>
                     <Text style={styles.seasonText}>Since {format(seasonStart, 'dd MMM')}</Text>
                     <Ionicons name="chevron-down" size={12} color="white" style={{marginLeft: 4}} />
                </View>
              </View>
              <View style={styles.balanceIcon}>
                  <Ionicons name="wallet-outline" size={32} color={Palette.primary} />
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

        <View style={styles.statsRow}>
             <View style={styles.statCard}>
                 <View style={[styles.iconCircle, { backgroundColor: Palette.primaryLight + '40' }]}>
                     <Ionicons name="today-outline" size={20} color={Palette.primary} />
                 </View>
                 <Text style={styles.statLabel}>Today</Text>
                 <Text style={styles.statValue}>₹{totalToday.toLocaleString('en-IN')}</Text>
             </View>
             <View style={styles.statCard}>
                 <View style={[styles.iconCircle, { backgroundColor: '#E1F5FE' }]}>
                     <Ionicons name="calendar-outline" size={20} color="#0288D1" />
                 </View>
                 <Text style={styles.statLabel}>Month</Text>
                 <Text style={styles.statValue}>₹{totalMonth.toLocaleString('en-IN')}</Text>
             </View>
        </View>

        {/* Charts Section */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expense Analysis</Text>
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
                <Text style={styles.emptyText}>No data for charts yet.</Text>
            </View>
        )}

        {/* Recent Transactions Preview */}
        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <Pressable onPress={() => { /* Navigate to list tab logic if needed or just let user tap tab */ }}>
                <Text style={{ color: Palette.primary, fontWeight: '600' }}>See all</Text>
            </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
            {expenses.slice(0, 3).map((expense) => (
                <View key={expense.id} style={styles.miniTransactionCard}>
                    <View style={[styles.miniIcon, { backgroundColor: CATEGORY_COLORS[expense.category] + '20' }]}>
                        <Ionicons name={require('@/constants/Categories').CATEGORY_ICONS[expense.category]} size={16} color={CATEGORY_COLORS[expense.category]} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.miniTitle}>{expense.title}</Text>
                        <Text style={styles.miniDate}>{format(new Date(expense.date), 'd MMM')}</Text>
                    </View>
                    <Text style={styles.miniAmount}>-₹{expense.amount.toFixed(0)}</Text>
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
        paddingBottom: 30, // Space for the card to overlap if we wanted, or just clean spacing
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
        fontSize: 22, // Slightly smaller header per design
        fontWeight: 'bold',
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
        fontWeight: 'bold',
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
        fontWeight: '500',
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
        fontSize: 14,
        color: Palette.textSecondary,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Palette.text,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginTop: 24,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Palette.text,
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
        fontWeight: '600',
        color: Palette.text,
    },
    miniDate: {
        fontSize: 12,
        color: Palette.textSecondary,
    },
    miniAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Palette.danger,
    }
});
