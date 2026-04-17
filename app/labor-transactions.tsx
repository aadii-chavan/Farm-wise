import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { Stack, useRouter } from 'expo-router';
import { format, isWithinInterval, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { CalendarModal } from '@/components/CalendarModal';

const { width } = Dimensions.get('window');

export default function LaborTransactionsScreen() {
    const router = useRouter();
    const { laborTransactions, laborProfiles } = useFarm();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string | null>(null);
    const [laborTypeFilter, setLaborTypeFilter] = useState<string | null>(null);
    const [startDate, setStartDate] = useState(startOfMonth(subDays(new Date(), 30)));
    const [endDate, setEndDate] = useState(new Date());
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
        const payouts = filteredTransactions
            .filter(t => ['Weekly Settle', 'Advance', 'Annual Installment', 'Contract Payment', 'Other'].includes(t.type))
            .reduce((acc, t) => acc + t.amount, 0);
        
        const credits = filteredTransactions
            .filter(t => ['Advance Repayment', 'Salary Deduction'].includes(t.type))
            .reduce((acc, t) => acc + t.amount, 0);

        return { payouts, credits, total: payouts - credits };
    }, [filteredTransactions]);

    const transactionTypes = Array.from(new Set(laborTransactions.map(t => t.type)));

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Transaction Ledger</Text>
                    <TouchableOpacity 
                        onPress={() => setShowFilters(!showFilters)} 
                        style={[styles.filterToggle, showFilters && styles.activeFilterToggle]}
                    >
                        <Ionicons name="options-outline" size={20} color={showFilters ? 'white' : Palette.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchBarContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color="#94A3B8" />
                        <TextInput 
                            style={styles.searchInput}
                            placeholder="Search by name, type or note..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Net Payout</Text>
                        <Text style={styles.statValue}>₹{stats.total.toLocaleString()}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Paid</Text>
                        <Text style={[styles.statValue, { color: Palette.danger }]}>₹{stats.payouts.toLocaleString()}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Credits</Text>
                        <Text style={[styles.statValue, { color: Palette.success }]}>₹{stats.credits.toLocaleString()}</Text>
                    </View>
                </View>

                {showFilters && (
                    <View style={styles.advancedFilters}>
                        <View style={styles.filterGroup}>
                            <Text style={styles.filterGroupLabel}>Transaction Period</Text>
                            <View style={styles.dateRow}>
                                <TouchableOpacity style={styles.dateControl} onPress={() => setShowStartPicker(true)}>
                                    <Text style={styles.dateControlLabel}>From</Text>
                                    <Text style={styles.dateControlValue}>{format(startDate, 'dd MMM yy')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.dateControl} onPress={() => setShowEndPicker(true)}>
                                    <Text style={styles.dateControlLabel}>To</Text>
                                    <Text style={styles.dateControlValue}>{format(endDate, 'dd MMM yy')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.filterGroup}>
                            <Text style={styles.filterGroupLabel}>Filter by Staff Type</Text>
                            <View style={styles.pillsRow}>
                                {['All', 'Daily', 'Annual', 'Contract'].map(type => (
                                    <TouchableOpacity 
                                        key={type}
                                        style={[styles.typePill, (type === 'All' ? !laborTypeFilter : laborTypeFilter === type) && styles.activePill]}
                                        onPress={() => setLaborTypeFilter(type === 'All' ? null : type)}
                                    >
                                        <Text style={[styles.pillText, (type === 'All' ? !laborTypeFilter : laborTypeFilter === type) && styles.activePillText]}>{type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Transaction History</Text>
                    <View style={styles.itemCountBadge}>
                        <Text style={styles.itemCountText}>{filteredTransactions.length} Items</Text>
                    </View>
                </View>

                {filteredTransactions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No matching records found</Text>
                    </View>
                ) : (
                    filteredTransactions.map((transaction, index) => {
                        const worker = laborProfiles.find(p => p.id === transaction.workerId);
                        const isPayout = ['Weekly Settle', 'Advance', 'Annual Installment', 'Contract Payment', 'Other'].includes(transaction.type);
                        
                        return (
                            <View key={transaction.id} style={styles.transactionItem}>
                                <View style={styles.transactionMain}>
                                    <View style={[styles.indicator, { backgroundColor: isPayout ? Palette.danger : Palette.success }]} />
                                    <View style={styles.transactionInfo}>
                                        <View style={styles.workerRow}>
                                            <Text style={styles.workerNameText}>{worker?.name || 'Unknown'}</Text>
                                            <View style={styles.staffBadge}>
                                                <Text style={styles.staffBadgeText}>{worker?.type}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.typeRow}>
                                            <Text style={styles.typeLabelText}>{transaction.type}</Text>
                                            <Text style={styles.bullet}>•</Text>
                                            <Text style={styles.dateLabelText}>{format(new Date(transaction.date), 'dd MMM yyyy')}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.amountArea}>
                                        <Text style={[styles.amountText, { color: isPayout ? '#1e293b' : Palette.success }]}>
                                            {isPayout ? '-' : '+'}₹{transaction.amount.toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                                {transaction.note && (
                                    <View style={styles.noteContainer}>
                                        <Text style={styles.noteLabel}>NOTE:</Text>
                                        <Text style={styles.noteContent}>{transaction.note}</Text>
                                    </View>
                                )}
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
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: 'white',
        paddingTop: 50,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
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
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    filterToggle: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
    },
    activeFilterToggle: {
        backgroundColor: Palette.primary,
    },
    searchBarContainer: {
        paddingHorizontal: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontFamily: 'Outfit-Medium',
        fontSize: 14,
        color: '#1e293b',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
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
    advancedFilters: {
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    filterGroup: {
        marginBottom: 20,
    },
    filterGroupLabel: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: '#64748B',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    dateRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateControl: {
        flex: 1,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    dateControlLabel: {
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    dateControlValue: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    pillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typePill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'white',
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
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    listTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    itemCountBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    itemCountText: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
        color: '#64748B',
    },
    transactionItem: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    transactionMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    indicator: {
        width: 4,
        height: 32,
        borderRadius: 2,
        marginRight: 16,
    },
    transactionInfo: {
        flex: 1,
    },
    workerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    workerNameText: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    staffBadge: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    staffBadgeText: {
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    typeLabelText: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: '#64748B',
    },
    bullet: {
        fontSize: 12,
        color: '#CBD5E1',
    },
    dateLabelText: {
        fontSize: 11,
        fontFamily: 'Outfit-Medium',
        color: '#94A3B8',
    },
    amountArea: {
        alignItems: 'flex-end',
    },
    amountText: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
    noteContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
        flexDirection: 'row',
        gap: 6,
    },
    noteLabel: {
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        marginTop: 2,
    },
    noteContent: {
        flex: 1,
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: '#64748B',
        lineHeight: 16,
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: '#94A3B8',
    },
});
