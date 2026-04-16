import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';

export default function WorkerDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { laborProfiles, laborTransactions, laborAttendance } = useFarm();
    
    const worker = useMemo(() => laborProfiles.find(p => p.id === id), [laborProfiles, id]);
    
    const transactions = useMemo(() => 
        laborTransactions.filter(t => t.workerId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [laborTransactions, id]);

    const attendanceRecords = useMemo(() => 
        laborAttendance.filter(a => a.workerId === id),
    [laborAttendance, id]);

    const stats = useMemo(() => {
        if (!worker) return { totalEarned: 0, totalPaid: 0, balance: 0, advanceTotal: 0 };
        
        let totalEarned = 0;
        attendanceRecords.forEach(a => {
            if (a.status === 'Present') totalEarned += (worker.baseWage || 0);
            if (a.status === 'Half-Day') totalEarned += (worker.baseWage || 0) / 2;
        });

        const totalPaid = transactions.filter(t => t.type === 'Weekly Settle' || t.type === 'Annual Installment').reduce((acc, t) => acc + t.amount, 0);
        const advanceTotal = transactions.filter(t => t.type === 'Advance').reduce((acc, t) => acc + t.amount, 0);
        const repaidTotal = transactions.filter(t => t.type === 'Advance Repayment').reduce((acc, t) => acc + t.amount, 0);
        
        const outstandingAdvance = advanceTotal - repaidTotal;

        return {
            totalEarned: Math.round(totalEarned),
            totalPaid: Math.round(totalPaid),
            advanceTotal: Math.round(outstandingAdvance),
            balance: Math.round(totalEarned - totalPaid - repaidTotal) // Remaining to pay for attendance
        };
    }, [worker, transactions, attendanceRecords]);

    if (!worker) return <View style={styles.container}><Text>Worker not found</Text></View>;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerShown: true, 
                title: worker.name,
                headerTitleStyle: { fontFamily: 'Outfit-Bold' },
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
                        <Text style={styles.workerName}>{worker.name}</Text>
                        <Text style={styles.workerType}>{worker.type} Staff • Joined {format(parseISO(worker.startDate), 'MMM d, yyyy')}</Text>
                        {worker.phone && (
                            <TouchableOpacity style={styles.phoneLink}>
                                <Ionicons name="call" size={14} color={Palette.primary} />
                                <Text style={styles.phoneText}>{worker.phone}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Financial Summary */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryBox, { backgroundColor: Palette.primary + '10' }]}>
                        <Text style={styles.summaryLabel}>Total Earned</Text>
                        <Text style={[styles.summaryValue, { color: Palette.primary }]}>₹{stats.totalEarned.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.summaryBox, { backgroundColor: Palette.success + '10' }]}>
                        <Text style={styles.summaryLabel}>Total Paid</Text>
                        <Text style={[styles.summaryValue, { color: Palette.success }]}>₹{stats.totalPaid.toLocaleString()}</Text>
                    </View>
                </View>

                <View style={styles.summaryRow}>
                    <View style={[styles.summaryBox, { backgroundColor: Palette.danger + '10' }]}>
                        <Text style={styles.summaryLabel}>Adv. Balance</Text>
                        <Text style={[styles.summaryValue, { color: Palette.danger }]}>₹{stats.advanceTotal.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.summaryBox, { backgroundColor: '#F59E0B10' }]}>
                        <Text style={styles.summaryLabel}>To Pay</Text>
                        <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>₹{stats.balance.toLocaleString()}</Text>
                    </View>
                </View>

                {/* History Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Transaction History</Text>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/labor-attendance-sheet', params: { type: worker.type } })}>
                        <Text style={styles.attendanceLink}>View Sheet</Text>
                    </TouchableOpacity>
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
                                    t.type === 'Advance Repayment' ? styles.badgeRepayment : styles.badgeSettle
                                ]}>
                                    <Text style={styles.typeText}>{t.type}</Text>
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
    workerName: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
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
        marginBottom: 12,
    },
    transactionDate: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
    },
    typeBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    badgeSettle: { backgroundColor: Palette.success + '15' },
    badgeAdvance: { backgroundColor: Palette.danger + '15' },
    badgeRepayment: { backgroundColor: '#F59E0B15' },
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
    }
});
