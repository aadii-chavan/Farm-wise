import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Text, Pressable, ScrollView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { format, differenceInDays } from 'date-fns';
import CalendarModal from '@/components/CalendarModal';

export default function ShopDetailScreen() {
    const { name } = useLocalSearchParams();
    const { inventory, transactions, addTransaction } = useFarm();
    const router = useRouter();

    // Payment Modal State
    const [isPayModalVisible, setIsPayModalVisible] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payDate, setPayDate] = useState(new Date());
    const [payMethod, setPayMethod] = useState<'Cash' | 'UPI' | 'Bank' | 'Check'>('Cash');
    const [payNote, setPayNote] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // View Toggle State
    const [activeTab, setActiveTab] = useState<'bills' | 'payments'>('bills');

    const shopItems = useMemo(() => {
        return inventory.filter(i => i.shopName === name);
    }, [inventory, name]);

    const shopPayments = useMemo(() => {
        return transactions
            .filter(t => t.type === 'Expense' && t.category === 'Shop Payment' && t.title === name)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, name]);

    // Group items by invoiceNo or batchId (Bills) with FIFO Interest logic
    const bills = useMemo(() => {
        // 1. Get payment pool
        const totalPaid = shopPayments.reduce((acc, p) => acc + p.amount, 0);
        let paymentPoolForBills = totalPaid;

        // 2. Sort all items by date to determine interest correctly (Oldest first)
        const sortedAllItems = [...shopItems].sort((a,b) => {
             const da = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
             const db = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
             return da - db;
        });

        // 3. Map items to their accumulated interest based on FIFO pool
        const itemInterestMap: Record<string, number> = {};
        sortedAllItems.forEach(it => {
            const principal = (it.pricePerUnit || 0) * it.quantity;
            if (it.paymentMode === 'Credit') {
                const paidOff = Math.min(principal, paymentPoolForBills);
                const unpaid = principal - paidOff;
                paymentPoolForBills -= paidOff;

                if (unpaid > 0 && it.purchaseDate && it.interestRate && it.interestPeriod) {
                    const days = differenceInDays(new Date(), new Date(it.purchaseDate));
                    if (days > 0) {
                        let dr = 0;
                        if (it.interestPeriod === 'day') dr = it.interestRate / 100;
                        else if (it.interestPeriod === 'week') dr = (it.interestRate / 100) / 7;
                        else if (it.interestPeriod === 'month') dr = (it.interestRate / 100) / 30;
                        else if (it.interestPeriod === 'year') dr = (it.interestRate / 100) / 365;
                        itemInterestMap[it.id!] = unpaid * dr * days;
                    }
                }
            }
        });

        // 4. Create groups
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

        const groupedBills = Object.entries(groups).map(([groupKey, items]) => {
            const totalPrincipal = items.reduce((acc, curr) => acc + (curr.pricePerUnit ? curr.pricePerUnit * curr.quantity : 0), 0);
            const totalInterest = items.reduce((acc, it) => acc + (itemInterestMap[it.id!] || 0), 0);
            
            return {
                id: groupKey,
                date: items[0].purchaseDate ? new Date(items[0].purchaseDate) : new Date(),
                items,
                invoiceNo: items[0].invoiceNo,
                paymentMode: items[0].paymentMode,
                interestRate: items[0].interestRate,
                interestPeriod: items[0].interestPeriod,
                principal: totalPrincipal,
                accumulatedInterest: totalInterest,
                total: totalPrincipal,
                note: items[0].note,
            };
        });

        const individualBills = individualItems.map(item => {
            const principal = item.pricePerUnit ? item.pricePerUnit * item.quantity : 0;
            return {
                id: item.id,
                date: item.purchaseDate ? new Date(item.purchaseDate) : new Date(),
                items: [item],
                invoiceNo: item.invoiceNo,
                paymentMode: item.paymentMode,
                interestRate: item.interestRate,
                interestPeriod: item.interestPeriod,
                principal: principal,
                accumulatedInterest: itemInterestMap[item.id!] || 0,
                total: principal,
                note: item.note,
            };
        });

        return [...groupedBills, ...individualBills].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [shopItems, shopPayments]);

    // Financial Summary Logic with TRUE FIFO Interest Calculation
    const summary = useMemo(() => {
        // 1. Sort all credit items by date (Oldest first)
        const creditItems = [...inventory]
            .filter(i => i.shopName === name && i.paymentMode === 'Credit')
            .sort((a, b) => {
                const da = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
                const db = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
                return da - db;
            });

        // 2. Get total amount paid to this shop
        const totalPaid = shopPayments.reduce((acc, p) => acc + p.amount, 0);
        let paymentPool = totalPaid;

        let totalPrincipalCredit = 0;
        let totalInterestAccrued = 0;
        let totalCashPurchases = inventory
            .filter(i => i.shopName === name && i.paymentMode !== 'Credit')
            .reduce((acc, i) => acc + ((i.pricePerUnit || 0) * i.quantity), 0);

        // 3. Apply payments to oldest principal first (FIFO)
        creditItems.forEach(i => {
            const principal = (i.pricePerUnit || 0) * i.quantity;
            totalPrincipalCredit += principal;

            // How much of this specific item's principal is still UNPAID?
            const amountAlreadyPaidForItem = Math.min(principal, paymentPool);
            const unpaidPrincipal = principal - amountAlreadyPaidForItem;
            paymentPool -= amountAlreadyPaidForItem;

            // Charge interest ONLY on the unpaid portion
            if (unpaidPrincipal > 0 && i.purchaseDate && i.interestRate && i.interestPeriod) {
                const days = differenceInDays(new Date(), new Date(i.purchaseDate));
                if (days > 0) {
                    let dailyRate = 0;
                    if (i.interestPeriod === 'day') dailyRate = i.interestRate / 100;
                    else if (i.interestPeriod === 'week') dailyRate = (i.interestRate / 100) / 7;
                    else if (i.interestPeriod === 'month') dailyRate = (i.interestRate / 100) / 30;
                    else if (i.interestPeriod === 'year') dailyRate = (i.interestRate / 100) / 365;
                    
                    totalInterestAccrued += unpaidPrincipal * dailyRate * days;
                }
            }
        });

        const currentBalance = (totalPrincipalCredit + totalInterestAccrued) - totalPaid;

        return {
            totalSpent: totalPrincipalCredit + totalCashPurchases,
            totalPaid,
            currentBalance: Math.max(0, currentBalance),
            interest: totalInterestAccrued,
        };
    }, [inventory, shopPayments, name]);

    const handleRecordPayment = async () => {
        const amount = parseFloat(payAmount);
        if (!payAmount || isNaN(amount) || amount <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid payment amount.");
            return;
        }

        if (amount > Math.ceil(summary.currentBalance)) {
            Alert.alert("Amount Exceeds Balance", `You can only record a maximum payment of ₹${Math.ceil(summary.currentBalance).toLocaleString('en-IN')}.`);
            return;
        }

        setIsSubmitting(true);
        try {
            await addTransaction({
                id: Date.now().toString(),
                title: (name as string),
                type: 'Expense',
                category: 'Shop Payment',
                amount: parseFloat(payAmount),
                date: payDate.toISOString(),
                note: `Method: ${payMethod} | ${payNote}`,
            });
            setIsPayModalVisible(false);
            setPayAmount('');
            setPayNote('');
            setPayMethod('Cash');
            Alert.alert("Success", "Payment recorded successfully.");
        } catch (e) {
            Alert.alert("Error", "Failed to record payment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.headerSection}>
            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Total Spent</Text>
                        <Text style={styles.summaryVal}>₹{summary.totalSpent.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Total Paid</Text>
                        <Text style={[styles.summaryVal, { color: Palette.success }]}>₹{summary.totalPaid.toLocaleString()}</Text>
                    </View>
                </View>
                
                <View style={styles.balanceDivider} />
                
                <View style={styles.balanceRow}>
                    <View>
                        <Text style={styles.balanceLabel}>Current Balance Due</Text>
                        {summary.interest > 0 && (
                            <Text style={styles.interestSubtext}>Includes ₹{summary.interest.toFixed(0)} interest</Text>
                        )}
                    </View>
                    <Text style={[styles.balanceVal, { color: summary.currentBalance > 0 ? Palette.danger : Palette.success }]}>
                        ₹{summary.currentBalance.toLocaleString()}
                    </Text>
                </View>
            </View>

            <Pressable 
                style={[styles.payBtn, summary.currentBalance <= 0 && { backgroundColor: Palette.textSecondary, opacity: 0.8 }]} 
                onPress={() => {
                    if (summary.currentBalance <= 0) {
                        Alert.alert("No Outstanding Balance", "There are no outstanding bills to pay.");
                        return;
                    }
                    setIsPayModalVisible(true);
                }}
            >
                <Ionicons name="card-outline" size={20} color="white" />
                <Text style={styles.payBtnText}>Record Payment</Text>
            </Pressable>

            <View style={styles.tabBar}>
                <Pressable 
                    onPress={() => setActiveTab('bills')} 
                    style={[styles.tab, activeTab === 'bills' && styles.tabActive]}
                >
                    <Text style={[styles.tabText, activeTab === 'bills' && styles.tabTextActive]}>Bill History</Text>
                </Pressable>
                <Pressable 
                    onPress={() => setActiveTab('payments')} 
                    style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
                >
                    <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>Payment History</Text>
                </Pressable>
            </View>
        </View>
    );

    const renderBillItem = ({ item }: { item: any }) => (
        <View style={styles.billCard}>
            <View style={styles.billHeader}>
                <View>
                    <Text style={styles.billDate}>{format(item.date, 'dd MMM yyyy')}</Text>
                    {item.invoiceNo && (
                        <View style={styles.invoiceTag}>
                            <Ionicons name="receipt-outline" size={12} color={Palette.textSecondary} />
                            <Text style={styles.invoiceNo}> #{item.invoiceNo}</Text>
                        </View>
                    )}
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
                
                {item.items.map((sub: any, idx: number) => (
                    <View key={idx} style={styles.tableRow}>
                        <Text style={[styles.rowText, { flex: 2 }]} numberOfLines={1}>{sub.name}</Text>
                        <Text style={[styles.rowText, { flex: 1, textAlign: 'center' }]}>
                            {sub.numPackages ? `${sub.numPackages} x` : `${sub.quantity}${sub.unit}`}
                        </Text>
                        <Text style={[styles.rowText, { flex: 1.2, textAlign: 'right', fontFamily: 'Outfit-Bold' }]}>
                            ₹{(sub.pricePerUnit ? sub.pricePerUnit * sub.quantity : 0).toLocaleString()}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.billFooter}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Bill Principal</Text>
                    <Text style={styles.totalValue}>₹{item.principal.toLocaleString()}</Text>
                </View>

                {item.paymentMode === 'Credit' && (
                    <>
                        <View style={[styles.totalRow, { marginTop: 8 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="trending-up" size={12} color="#d97706" style={{ marginRight: 4 }} />
                                <Text style={styles.interestNote}>
                                    Accrued Interest
                                </Text>
                            </View>
                            <Text style={[styles.totalValue, { color: '#d97706', fontSize: 16 }]}>
                                + ₹{item.accumulatedInterest.toFixed(0)}
                            </Text>
                        </View>
                    </>
                )}

                {item.note && (
                    <View style={styles.noteBox}>
                        <Ionicons name="document-text-outline" size={14} color={Palette.textSecondary} />
                        <Text style={styles.noteText}>{item.note}</Text>
                    </View>
                )}
            </View>
        </View>
    );

    const renderPaymentItem = ({ item }: { item: any }) => (
        <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
                <View style={styles.paymentIcon}>
                    <Ionicons name="checkmark-circle" size={20} color={Palette.success} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.paymentDateText}>{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                    <Text style={styles.paymentNoteText}>{item.note || 'No additional note'}</Text>
                </View>
                <Text style={styles.paymentAmountText}>- ₹{item.amount.toLocaleString()}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                title: (name as string) || 'Shop Details',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: Palette.background }
            }} />
            
            <FlatList
                data={activeTab === 'bills' ? bills : shopPayments}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                renderItem={activeTab === 'bills' ? renderBillItem : renderPaymentItem}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No {activeTab} found for this shop.</Text>
                }
            />

            {/* PAYMENT MODAL */}
            <Modal visible={isPayModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Record Payment</Text>
                            <Pressable onPress={() => setIsPayModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={Palette.text} />
                            </Pressable>
                        </View>

                        <ScrollView style={{ padding: 20 }}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Amount Paid (₹)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    keyboardType="numeric" 
                                    placeholder="Enter amount" 
                                    value={payAmount} 
                                    onChangeText={setPayAmount} 
                                    autoFocus
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Payment Date</Text>
                                <Pressable style={styles.datePicker} onPress={() => setShowCalendar(true)}>
                                    <View style={styles.datePickerInner}>
                                        <Ionicons name="calendar-outline" size={20} color={Palette.primary} />
                                        <Text style={styles.dateText}>{format(payDate, 'dd MMMM yyyy')}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={Palette.textSecondary} />
                                </Pressable>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Payment Mode</Text>
                                <View style={styles.modeToggle}>
                                    {['Cash', 'UPI', 'Bank', 'Check'].map(m => (
                                        <Pressable 
                                            key={m} 
                                            onPress={() => setPayMethod(m as any)}
                                            style={[styles.modeBtn, payMethod === m && styles.modeBtnActive]}
                                        >
                                            <Text style={[styles.modeBtnText, payMethod === m && styles.modeBtnTextActive]}>{m}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Note / Remark</Text>
                                <TextInput 
                                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                                    multiline 
                                    placeholder="e.g. Paid via PhonePe" 
                                    value={payNote} 
                                    onChangeText={setPayNote} 
                                />
                            </View>

                            <Pressable 
                                style={[styles.confirmBtn, isSubmitting && { opacity: 0.7 }]} 
                                onPress={handleRecordPayment}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.confirmBtnText}>{isSubmitting ? "Saving..." : "Recording Payment"}</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <CalendarModal 
                visible={showCalendar} 
                initialDate={payDate} 
                onClose={() => setShowCalendar(false)} 
                onSelectDate={setPayDate} 
                maximumDate={new Date()}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.background,
    },
    headerSection: {
        marginBottom: 10,
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryBox: {
        flex: 1,
    },
    summaryLabel: {
        fontFamily: 'Outfit-Medium',
        fontSize: 12,
        color: Palette.textSecondary,
        marginBottom: 4,
    },
    summaryVal: {
        fontFamily: 'Outfit-Bold',
        fontSize: 18,
        color: Palette.text,
    },
    balanceDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 20,
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceLabel: {
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
        color: Palette.text,
    },
    interestSubtext: {
        fontFamily: 'Outfit',
        fontSize: 11,
        color: '#d97706',
        marginTop: 2,
    },
    balanceVal: {
        fontFamily: 'Outfit-Bold',
        fontSize: 24,
    },
    payBtn: {
        backgroundColor: Palette.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    payBtnText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
        marginLeft: 10,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#e2e8f0',
        padding: 4,
        borderRadius: 14,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 11,
    },
    tabActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontFamily: 'Outfit-Bold',
        fontSize: 13,
        color: Palette.textSecondary,
    },
    tabTextActive: {
        color: Palette.primary,
    },
    billCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
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
        color: Palette.text,
    },
    invoiceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    invoiceNo: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
    },
    badgeCash: {
        backgroundColor: Palette.success + '15',
    },
    badgeCredit: {
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: '#fef3c7',
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
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
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
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        color: Palette.textSecondary,
    },
    totalValue: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    interestNote: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: '#d97706',
    },
    noteBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        backgroundColor: Palette.background,
        padding: 12,
        borderRadius: 14,
    },
    noteText: {
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginLeft: 8,
        flex: 1,
    },
    paymentCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    paymentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Palette.success + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentDateText: {
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
        color: Palette.text,
    },
    paymentNoteText: {
        fontFamily: 'Outfit',
        fontSize: 12,
        color: Palette.textSecondary,
        marginTop: 2,
    },
    paymentAmountText: {
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
        color: Palette.success,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        fontSize: 14,
    },
    // Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '85%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontFamily: 'Outfit-Bold',
        fontSize: 20,
        color: Palette.text,
    },
    closeBtn: {
        padding: 4,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
        color: Palette.text,
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        padding: 16,
        fontFamily: 'Outfit',
        fontSize: 16,
        color: Palette.text,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    datePicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    datePickerInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontFamily: 'Outfit-Medium',
        fontSize: 15,
        color: Palette.text,
        marginLeft: 12,
    },
    modeToggle: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    modeBtn: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: 'white',
    },
    modeBtnActive: {
        backgroundColor: Palette.primary,
        borderColor: Palette.primary,
    },
    modeBtnText: {
        fontFamily: 'Outfit-Bold',
        fontSize: 13,
        color: Palette.textSecondary,
    },
    modeBtnTextActive: {
        color: 'white',
    },
    confirmBtn: {
        backgroundColor: Palette.primary,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    confirmBtnText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
    }
});
