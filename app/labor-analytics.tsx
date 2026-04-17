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
            <Stack.Screen options={{ 
                title: 'Labor Analytics',
                headerTitleStyle: { fontFamily: 'Outfit-Bold' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="arrow-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Filters */}
                <View style={styles.filterSection}>
                    <View style={styles.dateRangeRow}>
                        <TouchableOpacity 
                            style={styles.dateBtn} 
                            onPress={() => setShowStartPicker(true)}
                        >
                            <Text style={styles.dateBtnLabel}>From</Text>
                            <Text style={styles.dateBtnValue}>{format(startDate, 'MMM d, yyyy')}</Text>
                        </TouchableOpacity>
                        <Ionicons name="arrow-forward" size={16} color={Palette.textSecondary} />
                        <TouchableOpacity 
                            style={styles.dateBtn} 
                            onPress={() => setShowEndPicker(true)}
                        >
                            <Text style={styles.dateBtnLabel}>To</Text>
                            <Text style={styles.dateBtnValue}>{format(endDate, 'MMM d, yyyy')}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilterRow}>
                        <TouchableOpacity 
                            style={[styles.typePill, !filterLaborType && styles.activeTypePill]}
                            onPress={() => setFilterLaborType(null)}
                        >
                            <Text style={[styles.typePillText, !filterLaborType && styles.activeTypePillText]}>All Types</Text>
                        </TouchableOpacity>
                        {['Daily', 'Annual', 'Contract'].map(type => (
                            <TouchableOpacity 
                                key={type}
                                style={[styles.typePill, filterLaborType === type && styles.activeTypePill]}
                                onPress={() => setFilterLaborType(type)}
                            >
                                <Text style={[styles.typePillText, filterLaborType === type && styles.activeTypePillText]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                    <View style={[styles.mainSummaryCard, { backgroundColor: Palette.primary }]}>
                        <Text style={styles.mainSummaryLabel}>Total Net Payout</Text>
                        <Text style={styles.mainSummaryValue}>₹{stats.netPayout.toLocaleString()}</Text>
                        <View style={styles.mainSummaryDecoration}>
                            <Ionicons name="wallet-outline" size={80} color="white" style={{ opacity: 0.1 }} />
                        </View>
                    </View>
                    
                    <View style={styles.subSummaryRow}>
                        <View style={styles.subSummaryCard}>
                            <Text style={styles.subSummaryLabel}>Total Advance</Text>
                            <Text style={[styles.subSummaryValue, { color: Palette.danger }]}>₹{stats.totalAdvance.toLocaleString()}</Text>
                        </View>
                        <View style={styles.subSummaryCard}>
                            <Text style={styles.subSummaryLabel}>Credits (Repay/Deduct)</Text>
                            <Text style={[styles.subSummaryValue, { color: Palette.success }]}>₹{stats.totalRepayment.toLocaleString()}</Text>
                        </View>
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
        backgroundColor: '#F8FAFC',
    },
    filterSection: {
        backgroundColor: 'white',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    dateRangeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dateBtn: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 12,
        marginHorizontal: 4,
    },
    dateBtnLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    dateBtnValue: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    typeFilterRow: {
        flexDirection: 'row',
    },
    typePill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activeTypePill: {
        backgroundColor: Palette.primary + '15',
        borderColor: Palette.primary,
    },
    typePillText: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    activeTypePillText: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
    },
    summaryContainer: {
        padding: 20,
    },
    mainSummaryCard: {
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    mainSummaryLabel: {
        color: 'white',
        opacity: 0.8,
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
    },
    mainSummaryValue: {
        color: 'white',
        fontSize: 32,
        fontFamily: 'Outfit-Bold',
        marginTop: 8,
    },
    mainSummaryDecoration: {
        position: 'absolute',
        bottom: -20,
        right: -20,
    },
    subSummaryRow: {
        flexDirection: 'row',
        gap: 12,
    },
    subSummaryCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    subSummaryLabel: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit-Medium',
    },
    subSummaryValue: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        marginTop: 4,
    },
    sectionCard: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        marginBottom: 20,
    },
    breakdownItem: {
        marginBottom: 16,
    },
    breakdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    breakdownLabel: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: Palette.text,
    },
    breakdownAmount: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
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
        fontSize: 11,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginTop: 4,
        textAlign: 'right',
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 20,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
    }
});
