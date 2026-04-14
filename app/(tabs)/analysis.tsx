import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import { Palette } from '@/constants/Colors';
import { Stack } from 'expo-router';
import { useFarm } from '@/context/FarmContext';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;

const chartConfig = {
    backgroundColor: 'white',
    backgroundGradientFrom: 'white',
    backgroundGradientTo: 'white',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Palette.primary
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
        borderRadius: 16,
    },
    propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: Palette.primary,
    },
};

export default function AnalysisPage() {
    const { transactions, inventory, plots } = useFarm();
    const [period, setPeriod] = useState<'6M' | '1Y' | 'ALL'>('6M');

    // Calculate monthly data for the chart
    const monthlyStats = useMemo(() => {
        const now = new Date();
        const interval = period === '6M' ? 6 : period === '1Y' ? 12 : 24;
        const months = eachMonthOfInterval({
            start: subMonths(now, interval - 1),
            end: now,
        });

        return months.map(month => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);

            const income = transactions
                .filter(t => t.type === 'Income' && new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd)
                .reduce((total, t) => total + t.amount, 0);

            const expense = transactions
                .filter(t => t.type === 'Expense' && t.category !== 'Shop Payment' && new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd)
                .reduce((total, t) => total + t.amount, 0);

            // Add inventory purchases for that month
            const invExpense = inventory
                .filter(i => i.purchaseDate && new Date(i.purchaseDate) >= monthStart && new Date(i.purchaseDate) <= monthEnd)
                .reduce((total, i) => total + ((i.pricePerUnit || 0) * i.quantity), 0);

            return {
                label: format(month, 'MMM'),
                income,
                expense: expense + invExpense,
                profit: income - (expense + invExpense)
            };
        });
    }, [transactions, inventory, period]);

    const totalStats = useMemo(() => {
        const income = transactions.filter(t => t.type === 'Income').reduce((a, b) => a + b.amount, 0);
        const expense = transactions
            .filter(t => t.type === 'Expense' && t.category !== 'Shop Payment')
            .reduce((a, b) => a + b.amount, 0);
        const invExpense = inventory.reduce((a, b) => a + ((b.pricePerUnit || 0) * b.quantity), 0);
        
        const totalExp = expense + invExpense;
        return {
            income,
            expense: totalExp,
            profit: income - totalExp,
            margin: income > 0 ? ((income - totalExp) / income) * 100 : 0
        };
    }, [transactions, inventory]);

    const plotPerformance = useMemo(() => {
        return plots.map(plot => {
            const plotIncome = transactions
                .filter(t => t.plotId === plot.id && t.type === 'Income')
                .reduce((a, b) => a + b.amount, 0);
            
            // Note: Expenses might not always have plotId, this is an estimate
            const plotExpense = transactions
                .filter(t => t.plotId === plot.id && t.type === 'Expense')
                .reduce((a, b) => a + b.amount, 0);

            return {
                name: plot.name,
                profit: plotIncome - plotExpense,
                income: plotIncome,
                expense: plotExpense
            };
        }).sort((a, b) => b.profit - a.profit);
    }, [plots, transactions]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Financial Intelligence', headerShadowVisible: false }} />
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Period Selector */}
                <View style={styles.periodRow}>
                    {(['6M', '1Y', 'ALL'] as const).map(p => (
                        <Pressable 
                            key={p} 
                            onPress={() => setPeriod(p)}
                            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                        >
                            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Key Metrics */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Net Profit</Text>
                        <Text style={[styles.metricValue, { color: totalStats.profit >= 0 ? Palette.success : Palette.danger }]}>
                            ₹{totalStats.profit.toLocaleString('en-IN')}
                        </Text>
                        <View style={styles.miniTrend}>
                            <Ionicons name={totalStats.profit >= 0 ? "trending-up" : "trending-down"} size={12} color={totalStats.profit >= 0 ? Palette.success : Palette.danger} />
                            <Text style={[styles.miniTrendText, { color: totalStats.profit >= 0 ? Palette.success : Palette.danger }]}>
                                {totalStats.margin.toFixed(1)}% Margin
                            </Text>
                        </View>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>OpEx Ratio</Text>
                        <Text style={styles.metricValue}>
                            {totalStats.income > 0 ? ((totalStats.expense / totalStats.income) * 100).toFixed(1) : '0'}%
                        </Text>
                        <Text style={styles.metricSub}>Expense vs Income</Text>
                    </View>
                </View>

                {/* Cash Flow Chart */}
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Trend Analysis</Text>
                    <View style={styles.card}>
                        <LineChart
                            data={{
                                labels: monthlyStats.map(m => m.label),
                                datasets: [
                                    {
                                        data: monthlyStats.map(m => m.income),
                                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Success
                                        strokeWidth: 3
                                    },
                                    {
                                        data: monthlyStats.map(m => m.expense),
                                        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Danger
                                        strokeWidth: 3
                                    }
                                ],
                                legend: ['Income', 'Expense']
                            }}
                            width={SCREEN_WIDTH - 40}
                            height={220}
                            chartConfig={{...chartConfig, backgroundGradientFrom: 'white', backgroundGradientTo: 'white'}}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                </View>

                {/* Plot Performance */}
                <View style={styles.chartSection}>
                    <View style={styles.headerRow}>
                        <Text style={styles.sectionTitle}>Performance by Plot</Text>
                        <Pressable><Text style={styles.seeAll}>See Details</Text></Pressable>
                    </View>
                    <View style={styles.card}>
                        {plotPerformance.length > 0 ? (
                            plotPerformance.map((plot, i) => (
                                <View key={plot.name} style={[styles.plotRow, i === plotPerformance.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.plotInfo}>
                                        <Text style={styles.plotName}>{plot.name}</Text>
                                        <View style={styles.plotBarBg}>
                                            <View style={[styles.plotBarFill, { 
                                                width: `${totalStats.income > 0 ? (plot.income / totalStats.income) * 100 : 0}%`,
                                                backgroundColor: Palette.primary 
                                            }]} />
                                        </View>
                                    </View>
                                    <View style={styles.plotStats}>
                                        <Text style={[styles.plotProfit, { color: plot.profit >= 0 ? Palette.success : Palette.danger }]}>
                                            ₹{plot.profit.toLocaleString('en-IN')}
                                        </Text>
                                        <Text style={styles.plotMargin}>
                                            {plot.income > 0 ? (100 * (plot.profit / plot.income)).toFixed(0) : 0}% margin
                                        </Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No plot data available</Text>
                        )}
                    </View>
                </View>

                {/* Seasonal Activity */}
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Monthly Profitability</Text>
                    <View style={styles.card}>
                        <BarChart
                            data={{
                                labels: monthlyStats.slice(-6).map(m => m.label),
                                datasets: [{
                                    data: monthlyStats.slice(-6).map(m => m.profit)
                                }]
                            }}
                            width={SCREEN_WIDTH - 40}
                            height={220}
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                            }}
                            style={styles.chart}
                            yAxisLabel="₹"
                            yAxisSuffix=""
                            fromZero
                        />
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#F8FAFC', // Slate 50
    },
    scrollContent: {
        padding: 20,
    },
    periodRow: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        padding: 4,
        borderRadius: 12,
        marginBottom: 24,
        alignSelf: 'flex-start',
    },
    periodBtn: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    periodBtnActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    periodText: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: '#64748B',
    },
    periodTextActive: {
        color: Palette.primary,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    metricCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    metricLabel: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: '#64748B',
        marginBottom: 8,
    },
    metricValue: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#1E293B',
    },
    metricSub: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 4,
        fontFamily: 'Outfit',
    },
    miniTrend: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    miniTrendText: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
    },
    chartSection: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: '#1E293B',
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    seeAll: {
        fontSize: 13,
        color: Palette.primary,
        fontFamily: 'Outfit-SemiBold',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        alignItems: 'center',
    },
    chart: {
        borderRadius: 16,
        marginVertical: 8,
    },
    plotRow: {
        width: '100%',
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
    },
    plotInfo: {
        flex: 1,
        marginRight: 16,
    },
    plotName: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: '#1E293B',
        marginBottom: 8,
    },
    plotBarBg: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        width: '100%',
    },
    plotBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    plotStats: {
        alignItems: 'flex-end',
    },
    plotProfit: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
    },
    plotMargin: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 2,
        fontFamily: 'Outfit',
    },
    emptyText: {
        fontFamily: 'Outfit',
        color: '#94A3B8',
        padding: 20,
    }
});
