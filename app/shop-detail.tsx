import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, Text, Pressable, ScrollView } from 'react-native';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { format } from 'date-fns';

export default function ShopDetailScreen() {
    const { name } = useLocalSearchParams();
    const { inventory } = useFarm();
    const router = useRouter();

    const shopItems = useMemo(() => {
        return inventory.filter(i => i.shopName === name);
    }, [inventory, name]);

    // Group items by batchId (Bills)
    const bills = useMemo(() => {
        const groups: Record<string, typeof shopItems> = {};
        const individualItems: typeof shopItems = [];

        shopItems.forEach(item => {
            const groupKey = item.invoiceNo || item.batchId;
            if (groupKey) {
                if (!groups[groupKey]) groups[groupKey] = [];
                groups[groupKey].push(item);
            } else {
                individualItems.push(item);
            }
        });

        const groupedBills = Object.entries(groups).map(([groupKey, items]) => ({
            id: groupKey,
            date: items[0].purchaseDate ? new Date(items[0].purchaseDate) : new Date(),
            items,
            invoiceNo: items[0].invoiceNo,
            paymentMode: items[0].paymentMode,
            interestRate: items[0].interestRate,
            interestPeriod: items[0].interestPeriod,
            total: items.reduce((acc, curr) => acc + (curr.pricePerUnit ? curr.pricePerUnit * curr.quantity : 0), 0),
            note: items[0].note,
        }));

        // Handle items without batchId as separate bills
        const individualBills = individualItems.map(item => ({
            id: item.id,
            date: item.purchaseDate ? new Date(item.purchaseDate) : new Date(),
            items: [item],
            invoiceNo: item.invoiceNo,
            paymentMode: item.paymentMode,
            interestRate: item.interestRate,
            interestPeriod: item.interestPeriod,
            total: item.pricePerUnit ? item.pricePerUnit * item.quantity : 0,
            note: item.note,
        }));

        return [...groupedBills, ...individualBills].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [shopItems]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: (name as string) || 'Shop Details' }} />
            
            <FlatList
                data={bills}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                    <View style={styles.billCard}>
                        <View style={styles.billHeader}>
                            <View>
                                <Text style={styles.billDate}>{format(item.date, 'dd MMM yyyy')}</Text>
                                {item.invoiceNo && <Text style={styles.invoiceNo}>Invoice: {item.invoiceNo}</Text>}
                            </View>
                            <View style={[styles.badge, item.paymentMode === 'Credit' ? styles.badgeCredit : styles.badgeCash]}>
                                <Text style={[styles.badgeText, item.paymentMode === 'Credit' ? styles.badgeTextCredit : styles.badgeTextCash]}>
                                    {item.paymentMode || 'Cash'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.billTable}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Item</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'right' }]}>Amount</Text>
                            </View>
                            
                            {item.items.map((sub, idx) => (
                                <View key={idx} style={styles.tableRow}>
                                    <Text style={[styles.rowText, { flex: 2 }]} numberOfLines={1}>{sub.name}</Text>
                                    <Text style={[styles.rowText, { flex: 1, textAlign: 'center' }]}>{sub.numPackages || (sub.quantity / (sub.sizePerPackage || 1))} x</Text>
                                    <Text style={[styles.rowText, { flex: 1.2, textAlign: 'right', fontFamily: 'Outfit-Bold' }]}>
                                        ₹{(sub.pricePerUnit ? sub.pricePerUnit * sub.quantity : 0).toLocaleString()}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.billFooter}>
                            {item.interestRate && item.paymentMode === 'Credit' && (
                                <Text style={styles.interestNote}>
                                    Interest: {item.interestRate}% per {item.interestPeriod}
                                </Text>
                            )}
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total Bill</Text>
                                <Text style={styles.totalValue}>₹{item.total.toLocaleString()}</Text>
                            </View>
                            {item.note && (
                                <View style={styles.noteBox}>
                                    <Ionicons name="document-text-outline" size={14} color={Palette.textSecondary} />
                                    <Text style={styles.noteText}>{item.note}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.background,
    },
    billCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    billHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 15,
        marginBottom: 15,
    },
    billDate: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        color: Palette.textSecondary,
    },
    invoiceNo: {
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeCash: {
        backgroundColor: Palette.success + '15',
    },
    badgeCredit: {
        backgroundColor: '#fffbeb',
    },
    badgeText: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
    },
    badgeTextCash: {
        color: Palette.success,
    },
    badgeTextCredit: {
        color: '#d97706',
    },
    billTable: {
        marginBottom: 15,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    tableHeaderText: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    rowText: {
        fontSize: 14,
        fontFamily: 'Outfit',
        color: Palette.text,
    },
    billFooter: {
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 15,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    totalValue: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
    interestNote: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: '#d97706',
        marginBottom: 8,
    },
    noteBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: Palette.background,
        padding: 10,
        borderRadius: 12,
    },
    noteText: {
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginLeft: 6,
        flex: 1,
    }
});
