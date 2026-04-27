import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import { Palette } from '@/constants/Colors';
import { Stack } from 'expo-router';
import { useFarm } from '@/context/FarmContext';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;

const chartConfig = {
    backgroundColor: 'white',
    backgroundGradientFrom: 'white',
    backgroundGradientTo: 'white',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Palette.primary
    labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`, // Palette.textSecondary
    style: {
        borderRadius: 16,
    },
    propsForDots: {
        r: '5',
        strokeWidth: '2',
        stroke: Palette.primary,
    },
    propsForLabels: {
        fontFamily: 'Outfit-Medium',
        fontSize: 10,
    }
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
        const totalIncome = transactions.filter(t => t.type === 'Income').reduce((a, b) => a + b.amount, 0);
        const directExpense = transactions
            .filter(t => t.type === 'Expense' && t.category !== 'Shop Payment')
            .reduce((a, b) => a + b.amount, 0);
        const totalInvPurchases = inventory.reduce((a, b) => a + ((b.pricePerUnit || 0) * b.quantity), 0);
        
        const totalExpense = directExpense + totalInvPurchases;
        const netProfit = totalIncome - totalExpense;
        const roi = totalExpense > 0 ? (netProfit / totalExpense) * 100 : 0;
        
        // Calculate Inventory Asset Value (current stock sitting)
        const inventoryAssetValue = inventory.reduce((acc, item) => acc + (item.quantity * (item.pricePerUnit || 0)), 0);

        // Calculate Outstanding Dues (Credit)
        // This logic mimics the shop-detail logic for credit
        const creditItems = inventory.filter(i => i.paymentMode === 'Credit');
        const principalCredit = creditItems.reduce((acc, it) => acc + (it.quantity * (it.pricePerUnit || 0)), 0);
        const totalPayments = transactions
            .filter(t => t.type === 'Expense' && t.category === 'Shop Payment')
            .reduce((acc, p) => acc + p.amount, 0);
        const outstandingDues = Math.max(0, principalCredit - totalPayments);

        return {
            income: totalIncome,
            expense: totalExpense,
            profit: netProfit,
            roi,
            inventoryAssetValue,
            outstandingDues
        };
    }, [transactions, inventory]);

    const expenseBreakdown = useMemo(() => {
        const categories: Record<string, number> = {};
        
        // From direct transactions
        transactions.filter(t => t.type === 'Expense' && t.category !== 'Shop Payment').forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + t.amount;
        });

        // From inventory purchases
        inventory.forEach(i => {
            categories[i.category] = (categories[i.category] || 0) + ((i.pricePerUnit || 0) * i.quantity);
        });

        const sorted = Object.entries(categories)
            .map(([name, amount]) => ({
                name,
                population: amount,
                color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
                legendFontColor: Palette.textSecondary,
                legendFontSize: 12
            }))
            .sort((a, b) => b.population - a.population);

        return sorted.slice(0, 5); // Top 5 categories
    }, [transactions, inventory]);

    const plotInsights = useMemo(() => {
        return plots.map(plot => {
            const income = transactions
                .filter(t => t.plotId === plot.id && t.type === 'Income')
                .reduce((a, b) => a + b.amount, 0);
            
            const expense = transactions
                .filter(t => t.plotId === plot.id && t.type === 'Expense')
                .reduce((a, b) => a + b.amount, 0);

            const profit = income - expense;
            const profitPerAcre = plot.area > 0 ? profit / plot.area : 0;
            const roi = expense > 0 ? (profit / expense) * 100 : 0;

            return {
                name: plot.name,
                profit,
                income,
                expense,
                area: plot.area,
                profitPerAcre,
                roi
            };
        }).sort((a, b) => b.profitPerAcre - a.profitPerAcre);
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

                {/* Key Metrics Dashboard */}
                <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                        <View style={[styles.iconBox, { backgroundColor: Palette.success + '15' }]}>
                             <Ionicons name="cash" size={18} color={Palette.success} />
                        </View>
                        <Text style={styles.metricLabel}>Net Profit</Text>
                        <Text style={[styles.metricValue, { color: totalStats.profit >= 0 ? Palette.success : Palette.danger }]}>
                            ₹{totalStats.profit.toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.metricSub}>{totalStats.roi.toFixed(1)}% ROI</Text>
                    </View>
                    
                    <View style={styles.metricItem}>
                        <View style={[styles.iconBox, { backgroundColor: Palette.primary + '15' }]}>
                             <Ionicons name="cube" size={18} color={Palette.primary} />
                        </View>
                        <Text style={styles.metricLabel}>Inventory Value</Text>
                        <Text style={styles.metricValue}>₹{totalStats.inventoryAssetValue.toLocaleString('en-IN')}</Text>
                        <Text style={styles.metricSub}>Assets in Stock</Text>
                    </View>

                    <View style={styles.metricItem}>
                        <View style={[styles.iconBox, { backgroundColor: '#f59e0b15' }]}>
                             <Ionicons name="alert-circle" size={18} color="#f59e0b" />
                        </View>
                        <Text style={styles.metricLabel}>Total Dues</Text>
                        <Text style={[styles.metricValue, { color: '#f59e0b' }]}>₹{totalStats.outstandingDues.toLocaleString('en-IN')}</Text>
                        <Text style={styles.metricSub}>Payable to Shops</Text>
                    </View>

                    <View style={styles.metricItem}>
                        <View style={[styles.iconBox, { backgroundColor: '#8b5cf615' }]}>
                             <Ionicons name="trending-up" size={18} color="#8b5cf6" />
                        </View>
                        <Text style={styles.metricLabel}>Total Income</Text>
                        <Text style={styles.metricValue}>₹{totalStats.income.toLocaleString('en-IN')}</Text>
                        <Text style={styles.metricSub}>Revenue Generated</Text>
                    </View>
                </View>

                {/* Main Trend Chart */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cash Flow Trend</Text>
                    <View style={styles.card}>
                        <LineChart
                            data={{
                                labels: monthlyStats.map(m => m.label),
                                datasets: [
                                    {
                                        data: monthlyStats.map(m => m.income),
                                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                                        strokeWidth: 3
                                    },
                                    {
                                        data: monthlyStats.map(m => m.expense),
                                        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
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
                            yAxisLabel="₹"
                            yAxisSuffix=""
                        />
                    </View>
                </View>

                {/* Expense Breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Where your money goes</Text>
                    <View style={styles.card}>
                        {expenseBreakdown.length > 0 ? (
                            <PieChart
                                data={expenseBreakdown}
                                width={SCREEN_WIDTH - 40}
                                height={180}
                                chartConfig={chartConfig}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={"15"}
                                absolute
                            />
                        ) : (
                            <Text style={styles.emptyText}>No expense data to analyze</Text>
                        )}
                    </View>
                </View>

                {/* Plot Efficiency Analysis */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Plot Efficiency (Profit/Acre)</Text>
                    <View style={styles.card}>
                        {plotInsights.length > 0 ? (
                            plotInsights.map((plot, i) => (
                                <View key={plot.name} style={[styles.plotAnalysisRow, i === plotInsights.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.plotMeta}>
                                        <Text style={styles.plotName}>{plot.name}</Text>
                                        <Text style={styles.plotSubtitle}>{plot.area} Acres • {plot.roi.toFixed(0)}% ROI</Text>
                                    </View>
                                    <View style={styles.plotPerformance}>
                                        <Text style={styles.profitPerAcre}>₹{plot.profitPerAcre.toLocaleString('en-IN', {maximumFractionDigits: 0})}</Text>
                                        <Text style={styles.profitLabel}>per acre</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No plot performance data</Text>
                        )}
                    </View>
                </View>

                {/* Monthly Profitability */}
                <View style={styles.section}>
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
        backgroundColor: '#F8FAFC', 
    },
    scrollContent: {
        padding: 20,
    },
    periodRow: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        padding: 4,
        borderRadius: 14,
        marginBottom: 24,
        alignSelf: 'flex-start',
    },
    periodBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
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
        color: Palette.textSecondary,
    },
    periodTextActive: {
        color: Palette.primary,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32,
    },
    metricItem: {
        width: (SCREEN_WIDTH - 52) / 2,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    metricLabel: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    metricSub: {
        fontSize: 11,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 4,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        marginBottom: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 28,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    chart: {
        borderRadius: 20,
    },
    plotAnalysisRow: {
        width: '100%',
        flexDirection: 'row',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    plotMeta: {
        flex: 1,
    },
    plotName: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    plotSubtitle: {
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 2,
    },
    plotPerformance: {
        alignItems: 'flex-end',
    },
    profitPerAcre: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
    profitLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
        textTransform: 'uppercase',
    },
    emptyText: {
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        padding: 24,
        textAlign: 'center',
    }
});
