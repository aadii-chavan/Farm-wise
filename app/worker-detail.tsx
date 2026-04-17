import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { LaborModal } from '@/components/LaborModal';
import { LaborTransactionModal } from '@/components/LaborTransactionModal';
import { LaborProfile, LaborTransaction } from '@/types/farm';

export default function WorkerDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { laborProfiles, laborTransactions, laborAttendance, laborContracts, updateLaborProfile, deleteLaborProfile, addLaborTransaction } = useFarm();
    
    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const [isPayModalVisible, setIsPayModalVisible] = React.useState(false);
    
    const worker = useMemo(() => laborProfiles.find(p => p.id === id), [laborProfiles, id]);
    
    const transactions = useMemo(() => 
        laborTransactions.filter(t => t.workerId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [laborTransactions, id]);

    const attendanceRecords = useMemo(() => 
        laborAttendance.filter(a => a.workerId === id),
    [laborAttendance, id]);

    const stats = useMemo(() => {
        if (!worker) return { l1: '', v1: 0, l2: '', v2: 0, l3: '', v3: 0, l4: '', v4: 0 };
        
        let totalEarned = 0;
        let totalPaid = 0;
        let advanceTotal = 0;
        let repaidTotal = 0;

        if (worker.type === 'Contract') {
            const myContracts = laborContracts.filter(c => c.contractorId === id);
            totalEarned = myContracts.reduce((acc, c) => acc + c.totalAmount, 0);
            
            // For contracts, net paid is sum(payouts) - sum(repayments)
            totalPaid = transactions.reduce((acc, t) => {
                const isExpense = ['Weekly Settle', 'Advance', 'Annual Installment', 'Contract Payment', 'Other'].includes(t.type);
                return acc + (isExpense ? t.amount : -t.amount);
            }, 0);

            advanceTotal = transactions.filter(t => t.type === 'Advance').reduce((acc, t) => acc + t.amount, 0);
            repaidTotal = transactions.filter(t => t.type === 'Advance Repayment').reduce((acc, t) => acc + t.amount, 0);

            return {
                l1: 'Total Earned', v1: totalEarned,
                l2: 'Total Paid', v2: totalPaid,
                l3: 'Adv. Balance', v3: advanceTotal - repaidTotal,
                l4: 'Due Amount', v4: totalEarned - totalPaid
            };
        } else if (worker.type === 'Annual') {
            const totalSalary = worker.baseWage || 0;
            const deductions = transactions.filter(t => t.type === 'Salary Deduction').reduce((acc, t) => acc + t.amount, 0);
            const totalPaid = transactions.filter(t => t.type === 'Annual Installment' || t.type === 'Advance').reduce((acc, t) => acc + t.amount, 0);
            
            const dailyWage = totalSalary / 365;
            let totalPenaltyIncurred = 0;
            attendanceRecords.forEach(a => {
                if (a.status === 'Absent') totalPenaltyIncurred += dailyWage;
                if (a.status === 'Half-Day') totalPenaltyIncurred += dailyWage / 2;
            });

            return {
                l1: 'Total Salary', v1: totalSalary,
                l2: 'Total Paid', v2: totalPaid,
                l3: 'Deductions', v3: deductions,
                l4: 'To Pay', v4: totalSalary - totalPaid - deductions,
                remainingToCut: totalPenaltyIncurred - deductions
            };
        } else {
            // Daily staff
            attendanceRecords.forEach(a => {
                if (a.status === 'Present') totalEarned += (worker.baseWage || 0);
                if (a.status === 'Half-Day') totalEarned += (worker.baseWage || 0) / 2;
            });

            totalPaid = transactions.filter(t => ['Weekly Settle', 'Other'].includes(t.type)).reduce((acc, t) => acc + t.amount, 0);
            advanceTotal = transactions.filter(t => t.type === 'Advance').reduce((acc, t) => acc + t.amount, 0);
            repaidTotal = transactions.filter(t => t.type === 'Advance Repayment').reduce((acc, t) => acc + t.amount, 0);
            const advBalance = advanceTotal - repaidTotal;

            return {
                l1: 'Total Earned', v1: totalEarned,
                l2: 'Total Paid', v2: totalPaid,
                l3: 'Adv. Balance', v3: advBalance,
                l4: 'To Pay', v4: totalEarned - totalPaid - advBalance
            };
        }
    }, [worker, transactions, attendanceRecords, laborContracts, id]);

    if (!worker) return <View style={styles.container}><Text>Worker not found</Text></View>;

    const handleDelete = () => {
        Alert.alert(
            'Delete Profile',
            'Are you sure you want to delete this profile? All historical data will be preserved but the worker will no longer appear in active lists.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        await deleteLaborProfile(worker.id);
                        router.back();
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerShown: true, 
                title: worker.name,
                headerTitleStyle: { fontFamily: 'Outfit-Bold' },
                headerRight: () => (
                    <View style={{ flexDirection: 'row', marginRight: 8, gap: 12 }}>
                        <TouchableOpacity onPress={() => setIsEditModalVisible(true)}>
                            <Ionicons name="pencil-outline" size={22} color={Palette.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={22} color={Palette.danger} />
                        </TouchableOpacity>
                    </View>
                ),
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="arrow-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Header Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{worker.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.workerName}>{worker.name}</Text>
                        </View>
                        <Text style={styles.workerType}>{worker.type} Staff • Joined {format(parseISO(worker.startDate || new Date().toISOString()), 'MMM d, yyyy')}</Text>
                        {worker.phone && (
                            <TouchableOpacity style={styles.phoneLink}>
                                <Ionicons name="call" size={14} color={Palette.primary} />
                                <Text style={styles.phoneText}>{worker.phone}</Text>
                            </TouchableOpacity>
                        )}
                        {worker.notes && (
                            <View style={styles.notesSection}>
                                <Text style={styles.notesLabel}>PERSONAL NOTE</Text>
                                <Text style={styles.notesText}>{worker.notes}</Text>
                            </View>
                        )}
                    </View>
                    {worker.type !== 'Contract' && (
                        <TouchableOpacity 
                            style={styles.payButton}
                            onPress={() => setIsPayModalVisible(true)}
                        >
                            <Ionicons name="card-outline" size={20} color="white" />
                            <Text style={styles.payButtonText}>+ Pay</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.summaryRow}>
                    <View style={[styles.summaryBox, { backgroundColor: Palette.primary + '10' }]}>
                        <Text style={styles.summaryLabel}>{stats.l1}</Text>
                        <Text style={[styles.summaryValue, { color: Palette.primary }]}>₹{Math.round(stats.v1).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.summaryBox, { backgroundColor: Palette.success + '10' }]}>
                        <Text style={styles.summaryLabel}>{stats.l2}</Text>
                        <Text style={[styles.summaryValue, { color: Palette.success }]}>₹{Math.round(stats.v2).toLocaleString()}</Text>
                    </View>
                </View>

                <View style={styles.summaryRow}>
                    <View style={[styles.summaryBox, { backgroundColor: (worker.type === 'Annual' ? Palette.danger : Palette.danger) + '10' }]}>
                        <Text style={styles.summaryLabel}>{stats.l3}</Text>
                        <Text style={[styles.summaryValue, { color: Palette.danger }]}>₹{Math.round(stats.v3).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.summaryBox, { backgroundColor: '#F59E0B10' }]}>
                        <Text style={styles.summaryLabel}>{stats.l4}</Text>
                        <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>₹{Math.round(stats.v4).toLocaleString()}</Text>
                    </View>
                </View>

                {/* History Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Transaction History</Text>
                    {worker.type !== 'Contract' && (
                        <TouchableOpacity onPress={() => router.push({ pathname: '/labor-attendance-sheet', params: { type: worker.type } })}>
                            <Text style={styles.attendanceLink}>View Sheet</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {transactions.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="receipt-outline" size={32} color={Palette.textSecondary + '40'} />
                        <Text style={styles.emptyText}>No transactions yet.</Text>
                    </View>
                ) : (
                    transactions.map((t) => (
                        <View key={t.id} style={styles.transactionCard}>
                            <View style={styles.transactionHeader}>
                                <View style={[styles.typeBadge, 
                                    t.type === 'Advance' ? styles.badgeAdvance : 
                                    t.type === 'Advance Repayment' ? styles.badgeRepayment : 
                                    t.type === 'Contract Payment' ? styles.badgeContract : 
                                    t.type === 'Salary Deduction' ? styles.badgeDeduction : styles.badgeSettle
                                ]}>
                                    <Text style={styles.typeText}>{t.type === 'Salary Deduction' ? 'Deduction' : t.type}</Text>
                                </View>
                                <Text style={styles.transactionDate}>{format(parseISO(t.date), 'MMM d, yyyy')}</Text>
                            </View>
                            <View style={styles.transactionContent}>
                                <Text style={styles.amountText}>₹{t.amount.toLocaleString()}</Text>
                                {t.note && <Text style={styles.noteText}>{t.note}</Text>}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <LaborModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                onSave={async (updated) => {
                    await updateLaborProfile(updated);
                    setIsEditModalVisible(false);
                }}
                worker={worker}
            />

            <LaborTransactionModal
                visible={isPayModalVisible}
                onClose={() => setIsPayModalVisible(false)}
                onSave={async (transaction) => {
                    await addLaborTransaction(transaction);
                    setIsPayModalVisible(false);
                }}
                worker={worker}
                advancePending={worker.type === 'Annual' ? 0 : (stats.l3 === 'Adv. Balance' ? stats.v3 : 0)}
                wagesDue={worker.type === 'Annual' ? (stats.remainingToCut || 0) : (stats.l4 === 'To Pay' ? stats.v4 : 0)}
            />
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
        paddingBottom: 40,
    },
    profileCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 24,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Palette.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 24,
        fontFamily: 'Outfit-Bold',
        color: 'white',
    },
    profileInfo: {
        flex: 1,
    },
    payButton: {
        backgroundColor: Palette.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    payButtonText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
    },
    workerName: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    headFeeBadge: {
        backgroundColor: '#F59E0B20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 10,
    },
    headFeeText: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: '#F59E0B',
    },
    workerType: {
        fontSize: 13,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginTop: 2,
    },
    phoneLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    phoneText: {
        color: Palette.primary,
        fontFamily: 'Outfit-Medium',
        fontSize: 13,
        marginLeft: 6,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryBox: {
        flex: 1,
        marginHorizontal: 6,
        padding: 16,
        borderRadius: 20,
    },
    summaryLabel: {
        fontSize: 10,
        color: Palette.textSecondary,
        fontFamily: 'Outfit-Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    summaryValue: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    attendanceLink: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
        fontSize: 13,
    },
    transactionCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    transactionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    transactionDate: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
    },
    transactionContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    typeBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    badgeSettle: { backgroundColor: Palette.success + '15' },
    badgeAdvance: { backgroundColor: Palette.danger + '15' },
    badgeRepayment: { backgroundColor: '#F59E0B15' },
    badgeDeduction: {
        backgroundColor: Palette.danger + '15',
    },
    badgeContract: {
        backgroundColor: Palette.primary + '15' 
    },
    typeText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
    },
    amountText: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    noteText: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginTop: 4,
        fontStyle: 'italic',
    },
    emptyBox: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        fontSize: 14,
    },
    notesSection: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    notesLabel: {
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    notesText: {
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: '#64748B',
        lineHeight: 18,
    },
});
