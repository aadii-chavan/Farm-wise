import React, { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { LaborType, LaborProfile, LaborAttendance } from '@/types/farm';
import { LaborModal } from '@/components/LaborModal';

const { width } = Dimensions.get('window');

export default function LaborBookScreen() {
    const router = useRouter();
    const { laborProfiles, laborContracts, laborTransactions, laborAttendance, plots, addLaborProfile } = useFarm();
    const [activeTab, setActiveTab] = useState<LaborType>('Daily');
    const [showAddModal, setShowAddModal] = useState(false);

    const dailyWorkers = useMemo(() => laborProfiles.filter(p => p.type === 'Daily'), [laborProfiles]);
    const annualStaff = useMemo(() => laborProfiles.filter(p => p.type === 'Annual'), [laborProfiles]);
    const contractors = useMemo(() => laborProfiles.filter(p => p.type === 'Contract'), [laborProfiles]);

    const stats = useMemo(() => {
        return {
            totalWorkers: laborProfiles.length,
            activeContracts: laborContracts.filter(c => c.status === 'Active').length,
            todayAttendance: 0, // Placeholder
        };
    }, [laborProfiles, laborContracts]);

    return (
        <View style={styles.container}>
            {/* Header Stats */}
            <View style={styles.statsOverview}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Staff</Text>
                    <Text style={styles.statValue}>{stats.totalWorkers}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Contracts</Text>
                    <Text style={styles.statValue}>{stats.activeContracts}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Attendance</Text>
                    <Text style={styles.statValue}>{stats.todayAttendance}%</Text>
                </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                {(['Daily', 'Annual', 'Contract'] as LaborType[]).map((tab) => (
                    <Pressable
                        key={tab}
                        style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'Daily' ? 'Daily Wage' : tab === 'Annual' ? 'Annual Staff' : 'Contractors'}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {activeTab === 'Daily' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Daily Wage Workers</Text>
                            <Pressable 
                                style={styles.headerAction} 
                                onPress={() => router.push({ pathname: '/labor-attendance-sheet', params: { type: 'Daily' } })}
                            >
                                <Ionicons name="grid-outline" size={18} color={Palette.primary} />
                                <Text style={styles.headerActionText}>Attendance Sheet</Text>
                            </Pressable>
                        </View>
                        {dailyWorkers.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={48} color={Palette.textSecondary + '40'} />
                                <Text style={styles.emptyText}>No daily wage workers added yet.</Text>
                            </View>
                        ) : (
                            dailyWorkers.map(worker => (
                                <View key={worker.id} style={styles.laborCard}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.workerName}>{worker.name}</Text>
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>₹{worker.baseWage}/Day</Text>
                                        </View>
                                    </View>
                                    {worker.phone && (
                                        <View style={styles.cardInfoRow}>
                                            <Ionicons name="call-outline" size={14} color={Palette.textSecondary} />
                                            <Text style={styles.infoLabel}>{worker.phone}</Text>
                                        </View>
                                    )}
                                    {worker.notes && (
                                        <Text style={styles.cardNote} numberOfLines={2}>{worker.notes}</Text>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'Annual' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Annual Tenure Staff</Text>
                            <Pressable 
                                style={styles.headerAction} 
                                onPress={() => router.push({ pathname: '/labor-attendance-sheet', params: { type: 'Annual' } })}
                            >
                                <Ionicons name="grid-outline" size={18} color={Palette.primary} />
                                <Text style={styles.headerActionText}>Attendance Sheet</Text>
                            </Pressable>
                        </View>
                        {annualStaff.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="briefcase-outline" size={48} color={Palette.textSecondary + '40'} />
                                <Text style={styles.emptyText}>No annual tenure staff added yet.</Text>
                            </View>
                        ) : (
                            annualStaff.map(worker => (
                                <View key={worker.id} style={styles.laborCard}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.workerName}>{worker.name}</Text>
                                        <View style={[styles.badge, { backgroundColor: Palette.success + '20' }]}>
                                            <Text style={[styles.badgeText, { color: Palette.success }]}>₹{(worker.baseWage || 0).toLocaleString()}/Yr</Text>
                                        </View>
                                    </View>
                                    <View style={styles.cardInfoRow}>
                                        <Text style={styles.infoLabel}>Daily Cost: ₹{Math.round((worker.baseWage || 0) / 365)}</Text>
                                        {worker.phone && (
                                            <>
                                                <Text style={[styles.infoLabel, { marginHorizontal: 8 }]}>|</Text>
                                                <Ionicons name="call-outline" size={12} color={Palette.textSecondary} />
                                                <Text style={styles.infoLabel}>{worker.phone}</Text>
                                            </>
                                        )}
                                    </View>
                                    {worker.notes && (
                                        <Text style={styles.cardNote} numberOfLines={2}>{worker.notes}</Text>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'Contract' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Active Contracts</Text>
                        </View>
                        {contractors.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="document-text-outline" size={48} color={Palette.textSecondary + '40'} />
                                <Text style={styles.emptyText}>No contractor labor added yet.</Text>
                            </View>
                        ) : (
                            contractors.map(worker => {
                                const activeContract = laborContracts.find(c => c.contractorId === worker.id && c.status === 'Active');
                                return (
                                    <View key={worker.id} style={styles.laborCard}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.workerName}>{worker.name}</Text>
                                            {activeContract && (
                                                <View style={[styles.badge, { backgroundColor: Palette.primary + '20' }]}>
                                                    <Text style={[styles.badgeText, { color: Palette.primary }]}>Active</Text>
                                                </View>
                                            )}
                                        </View>
                                        {activeContract && (
                                            <View style={styles.contractDetails}>
                                                <Text style={styles.projectName}>{activeContract.projectName}</Text>
                                                <View style={styles.progressBarBg}>
                                                    <View style={[styles.progressBarFill, { width: `${(activeContract.advancePaid / activeContract.totalAmount) * 100}%` }]} />
                                                </View>
                                                <Text style={styles.payoutText}>
                                                    ₹{activeContract.advancePaid.toLocaleString()} paid of ₹{activeContract.totalAmount.toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                        {worker.phone && (
                                            <View style={[styles.cardInfoRow, { marginTop: activeContract ? 12 : 4 }]}>
                                                <Ionicons name="call-outline" size={14} color={Palette.textSecondary} />
                                                <Text style={styles.infoLabel}>{worker.phone}</Text>
                                            </View>
                                        )}
                                        {worker.notes && (
                                            <Text style={styles.cardNote} numberOfLines={2}>{worker.notes}</Text>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}
            </ScrollView>

            <Pressable style={styles.fab} onPress={() => setShowAddModal(true)}>
                <Ionicons name="add" size={32} color="white" />
            </Pressable>

            <LaborModal 
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSave={addLaborProfile}
                initialType={activeTab}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    statsOverview: {
        flexDirection: 'row',
        backgroundColor: 'white',
        margin: 20,
        padding: 20,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
        alignItems: 'center',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#F1F5F9',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        marginHorizontal: 20,
        padding: 4,
        borderRadius: 12,
        marginBottom: 20,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTabButton: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    tabText: {
        fontFamily: 'Outfit-Medium',
        fontSize: 14,
        color: Palette.textSecondary,
    },
    activeTabText: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    headerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.primary + '10',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    headerActionText: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
        fontSize: 12,
        marginLeft: 6,
    },
    laborCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    workerName: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    badge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    cardInfoRow: {
        marginTop: 8,
    },
    infoLabel: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
    },
    contractDetails: {
        marginTop: 12,
    },
    projectName: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
        marginBottom: 8,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Palette.primary,
    },
    payoutText: {
        fontSize: 11,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 6,
    },
    infoLabel: {
        fontSize: 13,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginLeft: 4,
    },
    cardNote: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        fontStyle: 'italic',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginTop: 12,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Palette.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 999,
    },
});
