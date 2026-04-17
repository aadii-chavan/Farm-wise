import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { Stack, useRouter } from 'expo-router';
import { format, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';
import { CalendarModal } from '@/components/CalendarModal';

const { width } = Dimensions.get('window');

export default function LaborAnalyticsScreen() {
    const router = useRouter();
    const { laborTransactions, laborProfiles } = useFarm();
    
    const [startDate, setStartDate] = useState(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState(endOfMonth(new Date()));
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [filterLaborType, setFilterLaborType] = useState<string | null>(null);

    const filteredTransactions = useMemo(() => {
        return laborTransactions.filter(t => {
            const date = new Date(t.date);
            const isInRange = isWithinInterval(date, { start: startDate, end: endDate });
            
            if (!filterLaborType) return isInRange;
            
            const worker = laborProfiles.find(p => p.id === t.workerId);
            return isInRange && worker?.type === filterLaborType;
        });
    }, [laborTransactions, laborProfiles, startDate, endDate, filterLaborType]);

    const stats = useMemo(() => {
        const payouts = filteredTransactions
            .filter(t => ['Weekly Settle', 'Annual Installment', 'Contract Payment', 'Advance', 'Other'].includes(t.type))
            .reduce((acc, t) => acc + t.amount, 0);
        
        const totalAdvance = filteredTransactions
            .filter(t => t.type === 'Advance')
            .reduce((acc, t) => acc + t.amount, 0);
        
        const totalCredits = filteredTransactions
            .filter(t => t.type === 'Advance Repayment' || t.type === 'Salary Deduction')
            .reduce((acc, t) => acc + t.amount, 0);

        const netPayout = payouts - totalCredits;

        return { totalPaid: payouts, totalAdvance, totalRepayment: totalCredits, netPayout };
    }, [filteredTransactions]);

    const typeData = useMemo(() => {
        const data: Record<string, number> = {
            'Daily': 0,
            'Annual': 0,
            'Contract': 0
        };

        filteredTransactions.forEach(t => {
            const worker = laborProfiles.find(p => p.id === t.workerId);
            if (worker && data[worker.type] !== undefined) {
                const isExpense = ['Weekly Settle', 'Advance', 'Annual Installment', 'Contract Payment', 'Other'].includes(t.type);
                data[worker.type] += (isExpense ? t.amount : -t.amount);
            }
        });

        const total = Object.values(data).reduce((acc, v) => acc + v, 0);
        
        return Object.entries(data).map(([name, value]) => ({
            name,
            value,
            percentage: total > 0 ? (value / total) * 100 : 0,
            color: name === 'Daily' ? Palette.primary : name === 'Annual' ? Palette.success : '#F59E0B'
        })).sort((a, b) => b.value - a.value);
    }, [filteredTransactions, laborProfiles]);

    const transactionTypeData = useMemo(() => {
        const data: Record<string, number> = {};
        filteredTransactions.forEach(t => {
            const isExpense = ['Weekly Settle', 'Advance', 'Annual Installment', 'Contract Payment', 'Other'].includes(t.type);
            data[t.type] = (data[t.type] || 0) + (isExpense ? t.amount : -t.amount);
        });

        const total = Object.values(data).reduce((acc, v) => acc + v, 0);
        const colors = [Palette.primary, Palette.success, '#F59E0B', '#EF4444', '#8B5CF6'];

        return Object.entries(data).map(([name, value], index) => ({
            name,
            value,
            percentage: total > 0 ? (value / total) * 100 : 0,
            color: colors[index % colors.length]
        })).sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Labor Insights</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Filters */}
                <View style={styles.filterBar}>
                    <View style={styles.dateRow}>
                        <TouchableOpacity style={styles.dateSelector} onPress={() => setShowStartPicker(true)}>
                            <Text style={styles.dateLabel}>From</Text>
                            <Text style={styles.dateValue}>{format(startDate, 'dd MMM')}</Text>
                        </TouchableOpacity>
                        <View style={styles.dateDivider} />
                        <TouchableOpacity style={styles.dateSelector} onPress={() => setShowEndPicker(true)}>
                            <Text style={styles.dateLabel}>To</Text>
                            <Text style={styles.dateValue}>{format(endDate, 'dd MMM')}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                        <TouchableOpacity 
                            style={[styles.typePill, !filterLaborType && styles.activePill]}
                            onPress={() => setFilterLaborType(null)}
                        >
                            <Text style={[styles.pillText, !filterLaborType && styles.activePillText]}>All staff</Text>
                        </TouchableOpacity>
                        {['Daily', 'Annual', 'Contract'].map(type => (
                            <TouchableOpacity 
                                key={type}
                                style={[styles.typePill, filterLaborType === type && styles.activePill]}
                                onPress={() => setFilterLaborType(type)}
                            >
                                <Text style={[styles.pillText, filterLaborType === type && styles.activePillText]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Net Payout</Text>
                        <Text style={styles.statValue}>₹{stats.netPayout.toLocaleString()}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Paid</Text>
                        <Text style={[styles.statValue, { color: Palette.danger }]}>₹{stats.totalPaid.toLocaleString()}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Credits</Text>
                        <Text style={[styles.statValue, { color: Palette.success }]}>₹{stats.totalRepayment.toLocaleString()}</Text>
                    </View>
                </View>

                {/* Type Breakdown */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Expense by Labor Type</Text>
                    {typeData.map((item) => (
                        <View key={item.name} style={styles.breakdownItem}>
                            <View style={styles.breakdownHeader}>
                                <Text style={styles.breakdownLabel}>{item.name}</Text>
                                <Text style={styles.breakdownAmount}>₹{item.value.toLocaleString()}</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View 
                                    style={[
                                        styles.progressBarFill, 
                                        { width: `${item.percentage}%`, backgroundColor: item.color }
                                    ]} 
                                />
                            </View>
                            <Text style={styles.breakdownPercent}>{item.percentage.toFixed(1)}% of total</Text>
                        </View>
                    ))}
                </View>

                {/* Transaction Type Breakdown */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Transaction Breakdown</Text>
                    {transactionTypeData.map((item) => (
                        <View key={item.name} style={styles.breakdownItem}>
                            <View style={styles.breakdownHeader}>
                                <Text style={styles.breakdownLabel}>{item.name}</Text>
                                <Text style={styles.breakdownAmount}>₹{item.value.toLocaleString()}</Text>
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
                    {transactionTypeData.length === 0 && (
                        <Text style={styles.emptyText}>No data available for selected period.</Text>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <CalendarModal 
                visible={showStartPicker}
                onClose={() => setShowStartPicker(false)}
                onSelectDate={(date) => {
                    setStartDate(date);
                    setShowStartPicker(false);
                }}
                initialDate={startDate}
            />
            <CalendarModal 
                visible={showEndPicker}
                onClose={() => setShowEndPicker(false)}
                onSelectDate={(date) => {
                    setEndDate(date);
                    setShowEndPicker(false);
                }}
                initialDate={endDate}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: 'white',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    filterBar: {
        gap: 16,
    },
    dateRow: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    dateSelector: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    dateDivider: {
        width: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 10,
    },
    dateLabel: {
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    dateValue: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    pillScroll: {
        flexDirection: 'row',
    },
    typePill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activePill: {
        backgroundColor: Palette.primary,
        borderColor: Palette.primary,
    },
    pillText: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: '#64748B',
    },
    activePillText: {
        color: 'white',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
    },
    statLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    sectionCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
        marginBottom: 20,
    },
    breakdownItem: {
        marginBottom: 20,
    },
    breakdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    breakdownLabel: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: '#475569',
    },
    breakdownAmount: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    breakdownPercent: {
        fontSize: 10,
        color: '#94A3B8',
        fontFamily: 'Outfit-Medium',
        marginTop: 6,
        textAlign: 'right',
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 20,
        color: '#94A3B8',
        fontFamily: 'Outfit-Medium',
    }
});
