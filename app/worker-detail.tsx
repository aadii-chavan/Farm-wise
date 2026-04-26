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
import { ContractModal } from '@/components/ContractModal';
import { ContractDetailModal } from '@/components/ContractDetailModal';
import { LaborProfile, LaborTransaction, LaborContract } from '@/types/farm';

export default function WorkerDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { 
        laborProfiles, 
        laborTransactions, 
        laborAttendance, 
        laborContracts, 
        plots,
        updateLaborProfile, 
        deleteLaborProfile, 
        addLaborTransaction,
        addLaborContract,
        updateLaborContract,
        deleteLaborContract
    } = useFarm();
    
    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const [isPayModalVisible, setIsPayModalVisible] = React.useState(false);
    const [showContractModal, setShowContractModal] = React.useState(false);
    const [showDetailModal, setShowDetailModal] = React.useState(false);
    const [selectedContract, setSelectedContract] = React.useState<LaborContract | null>(null);
    
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
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Staff Profile</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => setIsEditModalVisible(true)} style={styles.actionBtn}>
                            <Ionicons name="pencil-outline" size={20} color={Palette.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
                            <Ionicons name="trash-outline" size={20} color={Palette.danger} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Header Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{worker.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.workerName}>{worker.name}</Text>
                        <Text style={styles.workerType}>{worker.type} Staff • Joined {format(parseISO(worker.startDate || new Date().toISOString()), 'MMM d, yyyy')}</Text>
                        {worker.phone && (
                            <TouchableOpacity style={styles.phoneLink}>
                                <Ionicons name="call" size={14} color={'#475569'} />
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
                </View>

                {worker.type !== 'Contract' && (
                    <TouchableOpacity 
                        style={styles.payButton}
                        onPress={() => setIsPayModalVisible(true)}
                    >
                        <Ionicons name="card-outline" size={20} color="white" />
                        <Text style={styles.payButtonText}>Record Payment or Advance</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>{stats.l1}</Text>
                        <Text style={styles.statValue}>₹{Math.round(stats.v1).toLocaleString()}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>{stats.l2}</Text>
                        <Text style={[styles.statValue, { color: Palette.success }]}>₹{Math.round(stats.v2).toLocaleString()}</Text>
                    </View>
                </View>

                <View style={[styles.statsGrid, { marginBottom: 24 }]}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>{stats.l3}</Text>
                        <Text style={[styles.statValue, { color: Palette.danger }]}>₹{Math.round(stats.v3).toLocaleString()}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>{stats.l4}</Text>
                        <Text style={[styles.statValue, { color: '#F59E0B' }]}>₹{Math.round(stats.v4).toLocaleString()}</Text>
                    </View>
                </View>

                {/* History Section */}
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Transaction History</Text>
                    {worker.type !== 'Contract' && (
                        <TouchableOpacity onPress={() => router.push({ pathname: '/labor-attendance-sheet', params: { type: worker.type } })}>
                            <Text style={styles.attendanceLink}>View Sheet</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {transactions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No transactions yet</Text>
                    </View>
                ) : (
                    transactions.map((t) => {
                        const isPayout = ['Weekly Settle', 'Advance', 'Annual Installment', 'Contract Payment', 'Other'].includes(t.type);
                        
                        return (
                            <View key={t.id} style={styles.transactionItem}>
                                <View style={styles.transactionMain}>
                                    <View style={[styles.indicator, { backgroundColor: isPayout ? Palette.danger : Palette.success }]} />
                                    <View style={styles.transactionInfo}>
                                        <Text style={styles.workerNameText}>{t.type === 'Salary Deduction' ? 'Deduction' : t.type}</Text>
                                        <View style={styles.typeRow}>
                                            <Text style={styles.dateLabelText}>{format(parseISO(t.date), 'dd MMM yyyy')}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.amountArea}>
                                        <Text style={[styles.amountText, { color: isPayout ? '#1e293b' : Palette.success }]}>
                                            {isPayout ? '-' : '+'}₹{t.amount.toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                                {t.note && (
                                    <View style={styles.noteContainer}>
                                        <Text style={styles.noteLabel}>NOTE:</Text>
                                        <Text style={styles.noteContent}>{t.note}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
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

            <ContractModal
                visible={showContractModal}
                onClose={() => setShowContractModal(false)}
                onSave={addLaborContract}
                contractor={worker}
                plots={plots}
            />

            <ContractDetailModal
                visible={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                contract={selectedContract}
                contractor={worker}
                plots={plots}
                onUpdate={async (updated) => {
                    await updateLaborContract(updated);
                    setSelectedContract(updated);
                }}
                onDelete={deleteLaborContract}
                onRecordPayment={async (cid, amt) => {
                    if (!worker || !selectedContract) return;
                    
                    await addLaborTransaction({
                        id: '',
                        workerId: worker.id,
                        amount: amt,
                        date: new Date().toISOString().split('T')[0],
                        type: 'Contract Payment',
                        note: `Payment: ${selectedContract.projectName}`,
                        contractId: cid
                    });

                    const updatedContract = { 
                        ...selectedContract, 
                        advancePaid: (selectedContract.advancePaid || 0) + amt 
                    };
                    await updateLaborContract(updatedContract);
                    setSelectedContract(updatedContract);
                }}
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
        paddingBottom: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        justifyContent: 'space-between',
        marginBottom: 10,
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
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 10,
    },
    profileCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 24,
        marginBottom: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Palette.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 24,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
    profileInfo: {
        flex: 1,
    },
    workerName: {
        fontSize: 22,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    workerType: {
        fontSize: 13,
        color: '#64748B',
        fontFamily: 'Outfit-Medium',
    },
    phoneLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#F8FAFC',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    phoneText: {
        color: '#475569',
        fontFamily: 'Outfit-Medium',
        fontSize: 12,
        marginLeft: 6,
    },
    notesSection: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    notesLabel: {
        fontSize: 10,
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
    payButton: {
        backgroundColor: Palette.primary,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    payButtonText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 15,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 88,
    },
    statLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    listTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    attendanceLink: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
        fontSize: 13,
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
    workerNameText: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateLabelText: {
        fontSize: 12,
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
    contractCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    contractTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    contractProject: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        textTransform: 'uppercase',
    },
    progressRow: {
        gap: 8,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Palette.primary,
    },
    progressLabel: {
        fontSize: 11,
        fontFamily: 'Outfit-Medium',
        color: '#64748B',
    },
    newContractBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: Palette.primary + '08',
        borderWidth: 1.5,
        borderColor: Palette.primary,
        borderStyle: 'dashed',
        gap: 8,
    },
    newContractText: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
});
