import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { Stack, useRouter } from 'expo-router';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function LaborTransactionsScreen() {
    const router = useRouter();
    const { laborTransactions, laborProfiles } = useFarm();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string | null>(null);

    const sortedTransactions = useMemo(() => {
        return [...laborTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [laborTransactions]);

    const filteredTransactions = useMemo(() => {
        return sortedTransactions.filter(t => {
            const worker = laborProfiles.find(p => p.id === t.workerId);
            const matchesSearch = worker?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 (t.note || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = !filterType || t.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [sortedTransactions, searchQuery, filterType, laborProfiles]);

    const transactionTypes = Array.from(new Set(laborTransactions.map(t => t.type)));

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                title: 'Transaction History',
                headerTitleStyle: { fontFamily: 'Outfit-Bold' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="arrow-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                )
            }} />

            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color={Palette.textSecondary} />
                <TextInput 
                    style={styles.searchInput}
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
                <TouchableOpacity 
                    style={[styles.filterBtn, !filterType && styles.activeFilterBtn]}
                    onPress={() => setFilterType(null)}
                >
                    <Text style={[styles.filterText, !filterType && styles.activeFilterText]}>All</Text>
                </TouchableOpacity>
                {transactionTypes.map(type => (
                    <TouchableOpacity 
                        key={type}
                        style={[styles.filterBtn, filterType === type && styles.activeFilterBtn]}
                        onPress={() => setFilterType(type)}
                    >
                        <Text style={[styles.filterText, filterType === type && styles.activeFilterText]}>{type}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView contentContainerStyle={styles.listContent}>
                {filteredTransactions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={48} color={Palette.textSecondary + '40'} />
                        <Text style={styles.emptyText}>No transactions found.</Text>
                    </View>
                ) : (
                    filteredTransactions.map((transaction) => {
                        const worker = laborProfiles.find(p => p.id === transaction.workerId);
                        const isExpense = ['Weekly Settle', 'Advance', 'Annual Installment', 'Contract Payment'].includes(transaction.type);
                        
                        return (
                            <View key={transaction.id} style={styles.transactionCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons 
                                            name={isExpense ? "arrow-up-circle" : "arrow-down-circle"} 
                                            size={24} 
                                            color={isExpense ? Palette.danger : Palette.success} 
                                        />
                                    </View>
                                    <View style={styles.headerInfo}>
                                        <Text style={styles.workerName}>{worker?.name || 'Unknown Worker'}</Text>
                                        <Text style={styles.date}>{format(new Date(transaction.date), 'MMMM d, yyyy')}</Text>
                                    </View>
                                    <Text style={[styles.amount, { color: isExpense ? Palette.danger : Palette.success }]}>
                                        {isExpense ? '-' : '+'}₹{transaction.amount.toLocaleString()}
                                    </Text>
                                </View>
                                <View style={styles.cardFooter}>
                                    <View style={styles.typeBadge}>
                                        <Text style={styles.typeText}>{transaction.type}</Text>
                                    </View>
                                    {transaction.note && (
                                        <Text style={styles.note} numberOfLines={1}>{transaction.note}</Text>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        margin: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontFamily: 'Outfit',
        fontSize: 14,
        color: Palette.text,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        maxHeight: 40,
    },
    filterBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'white',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activeFilterBtn: {
        backgroundColor: Palette.primary,
        borderColor: Palette.primary,
    },
    filterText: {
        fontFamily: 'Outfit-Medium',
        fontSize: 12,
        color: Palette.textSecondary,
    },
    activeFilterText: {
        color: 'white',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    transactionCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    workerName: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    date: {
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 2,
    },
    amount: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    typeBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    typeText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
        textTransform: 'uppercase',
    },
    note: {
        flex: 1,
        marginLeft: 12,
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        fontStyle: 'italic',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 12,
    },
});
