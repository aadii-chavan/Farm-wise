import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import * as Storage from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';

export default function ShopDetails() {
    const { name } = useLocalSearchParams<{ name: string }>();
    const decodedName = decodeURIComponent(name || '');
    const { inventory, transactions, refreshAll } = useFarm();
    const router = useRouter();

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [activeItemId, setActiveItemId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { items, payments, totalSpent, initialUdhaari, currentUdhaari } = useMemo(() => {
        const shopItems = inventory.filter(i => i.shopName === decodedName);
        
        let initialUdh = 0;
        let tSpent = 0;

        const now = new Date();

        shopItems.forEach(item => {
            const principal = item.quantity * (item.pricePerUnit || 0);
            tSpent += principal;

            if (item.paymentMode === 'Udari') {
                initialUdh += principal;
            }
        });

        // Get all general shop payments that apply to this shop Name
        const shopPayments = transactions.filter(t => t.type === 'Expense' && t.category === 'Shop Payment' && t.title === decodedName);
        const totalPaid = shopPayments.reduce((acc, p) => acc + p.amount, 0);

        const cUdhaari = Math.max(0, initialUdh - totalPaid);

        return {
            items: shopItems.sort((a,b) => new Date(b.purchaseDate || 0).getTime() - new Date(a.purchaseDate || 0).getTime()),
            payments: shopPayments,
            totalSpent: tSpent,
            initialUdhaari: initialUdh,
            currentUdhaari: cUdhaari,
        };
    }, [inventory, transactions, decodedName]);


    const handleSavePayment = async () => {
        if (isSubmitting) return;

        const amountNum = parseFloat(paymentAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            Alert.alert("Invalid Input", "Please enter a valid payment amount.");
            return;
        }

        setIsSubmitting(true);
        try {
            await Storage.saveTransaction({
                id: '', // Will be generated
                title: decodedName,
                type: 'Expense',
                category: 'Shop Payment',
                amount: amountNum,
                date: new Date().toISOString(),
                note: 'General Shop Payment'
            });
            setShowPaymentModal(false);
            setPaymentAmount('');
            setActiveItemId(null);
            await refreshAll();
            Alert.alert("Success", "Payment recorded successfully.");
        } catch (e) {
            Alert.alert("Error", "Could not record payment.");
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <>
            <Stack.Screen 
               options={{ 
                   title: decodedName, 
                   headerShown: true, 
                   headerShadowVisible: false, 
                   headerStyle: { backgroundColor: Palette.background } 
               }} 
            />
            
            <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                <View style={styles.statsCard}>
                    <View style={styles.statsHeader}>
                        <View>
                            <Text style={styles.statsTitle}>{decodedName}</Text>
                            <Text style={styles.statsSubtitle}>{items.length} items purchased</Text>
                        </View>
                        <Pressable style={styles.btnMiniPayment} onPress={() => setShowPaymentModal(true)}>
                            <Ionicons name="card" size={16} color="white" />
                            <Text style={styles.btnMiniPaymentText}>Record Payment</Text>
                        </Pressable>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Spent</Text>
                            <Text style={[styles.statValue, { color: Palette.text }]}>₹{totalSpent.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Paid</Text>
                            <Text style={[styles.statValue, { color: Palette.success }]}>₹{payments.reduce((a,b)=>a+b.amount, 0).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Current Udhaari</Text>
                            <Text style={[styles.statValue, { color: currentUdhaari > 0 ? Palette.danger : Palette.success }]}>
                                ₹{currentUdhaari.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* History of Purchase */}
                <Text style={styles.sectionTitle}>Item Purchase History</Text>
                {items.map(item => (
                    <View key={item.id} style={styles.historyCard}>
                        <View style={styles.historyTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemMeta}>
                                    {item.purchaseDate ? format(new Date(item.purchaseDate), 'dd MMM yyyy') : 'No Date'} • {item.quantity} {item.unit}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                                <Text style={styles.itemPrice}>₹{(item.quantity * (item.pricePerUnit || 0)).toLocaleString('en-IN')}</Text>
                                <Text style={[styles.itemBadge, item.paymentMode === 'Udari' ? styles.badgeUdari : styles.badgePaid]}>
                                    {item.paymentMode || 'Cash'}
                                </Text>
                            </View>
                        </View>
                        
                        {(item.companyName || item.invoiceNo || item.batchNo) && (
                             <View style={styles.detailRowWrapper}>
                                 {item.companyName && <Text style={styles.detailText}>Company: {item.companyName}</Text>}
                                 {item.invoiceNo && <Text style={styles.detailText}>Invoice: {item.invoiceNo}</Text>}
                                 {item.batchNo && <Text style={styles.detailText}>Batch: {item.batchNo}</Text>}
                             </View>
                        )}
                        
                        {item.note && (
                            <Text style={styles.noteText}>Note: {item.note}</Text>
                        )}

                        {item.paymentMode === 'Udari' && item.interestRate && (
                            <View style={styles.interestContext}>
                                <Ionicons name="time-outline" size={12} color={Palette.danger} />
                                <Text style={styles.interestText}>
                                    Interest at {item.interestRate}% {item.interestPeriod}
                                </Text>
                            </View>
                        )}

                    </View>
                ))}

                {payments.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Payment History</Text>
                        {payments.map(p => (
                             <View key={p.id} style={[styles.historyCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                                 <View style={styles.historyTop}>
                                     <View>
                                         <Text style={styles.itemName}>Payment</Text>
                                         <Text style={styles.itemMeta}>{format(new Date(p.date), 'dd MMM yyyy, HH:mm')}</Text>
                                     </View>
                                     <Text style={[styles.itemPrice, { color: Palette.success }]}>₹{p.amount.toLocaleString('en-IN')}</Text>
                                 </View>
                             </View>
                        ))}
                    </>
                )}
            </ScrollView>

            <Modal visible={showPaymentModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Record Payment</Text>
                            <Pressable onPress={() => setShowPaymentModal(false)}>
                                <Ionicons name="close" size={24} color={Palette.text} />
                            </Pressable>
                        </View>
                        
                        <Text style={styles.modalWarning}>
                            This payment will be deducted directly from your outstanding udhaari limit with {decodedName}.
                        </Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Amount (₹)</Text>
                            <TextInput 
                                style={styles.input} 
                                keyboardType="numeric" 
                                placeholder="Enter payment amount" 
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                            />
                        </View>

                        <Pressable 
                            style={[styles.btnSave, isSubmitting && { opacity: 0.7 }]} 
                            onPress={handleSavePayment}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.btnSaveText}>Save Payment</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.background,
    },
    statsCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
    },
    statsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statsTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    statsSubtitle: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
        paddingTop: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit-Medium',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: '#f0f0f0',
    },
    btnMiniPayment: {
        flexDirection: 'row',
        backgroundColor: Palette.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
        gap: 6,
    },
    btnMiniPaymentText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 13,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        marginBottom: 16,
    },
    historyCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    historyTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemName: {
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
        color: Palette.text,
        marginBottom: 4,
    },
    itemMeta: {
        fontFamily: 'Outfit',
        fontSize: 13,
        color: Palette.textSecondary,
    },
    itemPrice: {
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
        color: Palette.text,
        marginBottom: 4,
    },
    itemBadge: {
        fontSize: 11,
        fontFamily: 'Outfit-Medium',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        overflow: 'hidden',
    },
    badgeUdari: {
        backgroundColor: Palette.danger + '20',
        color: Palette.danger,
    },
    badgePaid: {
        backgroundColor: Palette.success + '20',
        color: Palette.success,
    },
    detailRowWrapper: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    detailText: {
        fontFamily: 'Outfit-Medium',
        fontSize: 12,
        color: Palette.textSecondary,
    },
    noteText: {
        fontFamily: 'Outfit',
        fontStyle: 'italic',
        fontSize: 13,
        color: '#64748b',
        marginTop: 8,
    },
    interestContext: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: '#fef2f2',
        padding: 8,
        borderRadius: 8,
        gap: 6,
    },
    interestText: {
        fontFamily: 'Outfit-Medium',
        fontSize: 11,
        color: Palette.danger,
    },
    udariItemFooter: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    udariItemMetricsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    udariMetricBox: {
        alignItems: 'flex-start',
    },
    udariLabel: {
        fontFamily: 'Outfit-Medium',
        fontSize: 11,
        color: Palette.textSecondary,
        marginBottom: 2,
    },
    udariValue: {
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
        color: Palette.danger,
    },
    btnItemPayment: {
        backgroundColor: Palette.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    btnItemPaymentText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    modalWarning: {
        fontFamily: 'Outfit',
        fontSize: 13,
        color: Palette.textSecondary,
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontFamily: 'Outfit-Medium',
        fontSize: 14,
        color: Palette.text,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
        fontFamily: 'Outfit-Medium',
        fontSize: 16,
        backgroundColor: '#f8fafc',
    },
    btnSave: {
        backgroundColor: Palette.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnSaveText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
    }
});
