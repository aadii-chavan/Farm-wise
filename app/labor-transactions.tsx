import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { Stack, useRouter } from 'expo-router';
import { format, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarModal } from '@/components/CalendarModal';

const { width } = Dimensions.get('window');

export default function LaborTransactionsScreen() {
    const router = useRouter();
    const { laborTransactions, laborProfiles } = useFarm();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string | null>(null);
    const [laborTypeFilter, setLaborTypeFilter] = useState<string | null>(null);
    const [startDate, setStartDate] = useState(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState(endOfMonth(new Date()));
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const sortedTransactions = useMemo(() => {
        return [...laborTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [laborTransactions]);

    const filteredTransactions = useMemo(() => {
        return sortedTransactions.filter(t => {
            const worker = laborProfiles.find(p => p.id === t.workerId);
            const date = new Date(t.date);
            
            const matchesSearch = (worker?.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
                                 (t.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                 ((t.note || '').toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesType = !filterType || t.type === filterType;
            const matchesLaborType = !laborTypeFilter || worker?.type === laborTypeFilter;
            const matchesDate = isWithinInterval(date, { start: startDate, end: endDate });

            return matchesSearch && matchesType && matchesLaborType && matchesDate;
        });
    }, [sortedTransactions, searchQuery, filterType, laborTypeFilter, startDate, endDate, laborProfiles]);

    const stats = useMemo(() => {
        const total = filteredTransactions.reduce((acc, t) => {
            const isExpense = ['Weekly Settle', 'Advance', 'Annual Installment', 'Contract Payment', 'Salary Deduction'].includes(t.type);
            return acc + (isExpense ? t.amount : -t.amount);
        }, 0);
        return { total };
    }, [filteredTransactions]);

    const transactionTypes = Array.from(new Set(laborTransactions.map(t => t.type)));

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                title: 'Transactions',
                headerTitleStyle: { fontFamily: 'Outfit-Bold' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="arrow-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <TouchableOpacity 
                        onPress={() => setShowFilters(!showFilters)} 
                        style={[styles.headerIconBtn, showFilters && styles.activeHeaderIconBtn]}
                    >
                        <Ionicons name="funnel-outline" size={20} color={showFilters ? 'white' : Palette.primary} />
                    </TouchableOpacity>
                )
            }} />

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={Palette.textSecondary} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search name, type or notes..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={Palette.textSecondary + '70'}
                    />
                </View>
            </View>

            {showFilters && (
                <View style={styles.filterSection}>
                    <Text style={styles.filterTitle}>Advanced Filters</Text>
                    
                    <View style={styles.dateRangeRow}>
                        <TouchableOpacity style={styles.datePicker} onPress={() => setShowStartPicker(true)}>
                            <Text style={styles.dateLabel}>From</Text>
                            <Text style={styles.dateValue}>{format(startDate, 'MMM d, yy')}</Text>
                        </TouchableOpacity>
                        <View style={styles.dateConnector} />
                        <TouchableOpacity style={styles.datePicker} onPress={() => setShowEndPicker(true)}>
                            <Text style={styles.dateLabel}>To</Text>
                            <Text style={styles.dateValue}>{format(endDate, 'MMM d, yy')}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subFilterTitle}>Labor Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                        <TouchableOpacity 
                            style={[styles.pill, !laborTypeFilter && styles.activePill]}
                            onPress={() => setLaborTypeFilter(null)}
                        >
                            <Text style={[styles.pillText, !laborTypeFilter && styles.activePillText]}>All Staff</Text>
                        </TouchableOpacity>
                        {['Daily', 'Annual', 'Contract'].map(type => (
                            <TouchableOpacity 
                                key={type}
                                style={[styles.pill, laborTypeFilter === type && styles.activePill]}
                                onPress={() => setLaborTypeFilter(type)}
                            >
                                <Text style={[styles.pillText, laborTypeFilter === type && styles.activePillText]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={styles.subFilterTitle}>Transaction Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                        <TouchableOpacity 
                            style={[styles.pill, !filterType && styles.activePill]}
                            onPress={() => setFilterType(null)}
                        >
                            <Text style={[styles.pillText, !filterType && styles.activePillText]}>All Types</Text>
                        </TouchableOpacity>
                        {transactionTypes.map(type => (
                            <TouchableOpacity 
                                key={type}
                                style={[styles.pill, filterType === type && styles.activePill]}
                                onPress={() => setFilterType(type)}
                            >
                                <Text style={[styles.pillText, filterType === type && styles.activePillText]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={styles.summaryBar}>
                <View>
                    <Text style={styles.summaryLabel}>Total Net Payout</Text>
                    <Text style={styles.summaryValue}>₹{stats.total.toLocaleString()}</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{filteredTransactions.length} items</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {filteredTransactions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="receipt-outline" size={48} color={Palette.textSecondary + '40'} />
                        </View>
                        <Text style={styles.emptyText}>No transactions found for these filters.</Text>
                        <TouchableOpacity 
                            style={styles.resetBtn}
                            onPress={() => {
                                setFilterType(null);
                                setLaborTypeFilter(null);
                                setSearchQuery('');
                                setStartDate(startOfMonth(new Date()));
                                setEndDate(endOfMonth(new Date()));
                            }}
                        >
                            <Text style={styles.resetBtnText}>Reset Filters</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    filteredTransactions.map((transaction) => {
                        const worker = laborProfiles.find(p => p.id === transaction.workerId);
                        const isExpense = ['Weekly Settle', 'Advance', 'Annual Installment', 'Contract Payment', 'Salary Deduction'].includes(transaction.type);
                        
                        return (
                            <View key={transaction.id} style={styles.transactionCard}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconContainer, { backgroundColor: (isExpense ? Palette.danger : Palette.success) + '10' }]}>
                                        <Ionicons 
                                            name={isExpense ? "arrow-up-circle" : "arrow-down-circle"} 
                                            size={24} 
                                            color={isExpense ? Palette.danger : Palette.success} 
                                        />
                                    </View>
                                    <View style={styles.headerInfo}>
                                        <View style={styles.nameRow}>
                                            <Text style={styles.workerName}>{worker?.name || 'Unknown Worker'}</Text>
                                            <View style={styles.laborTypeBadge}>
                                                <Text style={styles.laborTypeText}>{worker?.type}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.dateText}>{format(new Date(transaction.date), 'MMMM d, yyyy')}</Text>
                                    </View>
                                    <View style={styles.amountContainer}>
                                        <Text style={[styles.amount, { color: isExpense ? Palette.danger : Palette.success }]}>
                                            {isExpense ? '-' : '+'}₹{transaction.amount.toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                                
                                <View style={styles.cardDivider} />
                                
                                <View style={styles.cardDetails}>
                                    <View style={styles.typeTag}>
                                        <Ionicons name="pricetag-outline" size={12} color={Palette.textSecondary} />
                                        <Text style={styles.typeTagText}>{transaction.type}</Text>
                                    </View>
                                    
                                    {transaction.note && (
                                        <View style={styles.noteBox}>
                                            <Ionicons name="chatbox-ellipses-outline" size={14} color={Palette.textSecondary} style={{ marginTop: 2 }} />
                                            <Text style={styles.noteText}>{transaction.note}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
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
        backgroundColor: '#F8F9FD',
    },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Palette.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    activeHeaderIconBtn: {
        backgroundColor: Palette.primary,
    },
    searchContainer: {
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FD',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#EDF2F7',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontFamily: 'Outfit-Regular',
        fontSize: 15,
        color: Palette.text,
    },
    filterSection: {
        backgroundColor: 'white',
        padding: 20,
        paddingTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    filterTitle: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        marginBottom: 16,
    },
    subFilterTitle: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
        marginTop: 16,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateRangeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    datePicker: {
        flex: 1,
        backgroundColor: '#F8F9FD',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EDF2F7',
    },
    dateLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
        marginBottom: 4,
    },
    dateValue: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    dateConnector: {
        width: 10,
        height: 2,
        backgroundColor: '#E2E8F0',
    },
    pillsRow: {
        flexDirection: 'row',
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activePill: {
        backgroundColor: Palette.primary + '10',
        borderColor: Palette.primary,
    },
    pillText: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    activePillText: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
    },
    summaryBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    summaryLabel: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    summaryValue: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    countBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countText: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    transactionCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(241, 245, 249, 0.8)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 14,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    workerName: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    laborTypeBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    laborTypeText: {
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
        textTransform: 'uppercase',
    },
    dateText: {
        fontSize: 12,
        fontFamily: 'Outfit-Regular',
        color: Palette.textSecondary,
        marginTop: 2,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 17,
        fontFamily: 'Outfit-Bold',
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#F8F9FD',
        marginVertical: 12,
    },
    cardDetails: {
        gap: 10,
    },
    typeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    typeTagText: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    noteBox: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FD',
        padding: 10,
        borderRadius: 10,
        gap: 8,
    },
    noteText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Outfit-Regular',
        color: Palette.textSecondary,
        lineHeight: 18,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        width: 200,
    },
    resetBtn: {
        backgroundColor: Palette.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
    },
    resetBtnText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
    },
});
