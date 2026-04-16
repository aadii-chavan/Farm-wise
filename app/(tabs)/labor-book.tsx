import React, { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, TouchableOpacity } from 'react-native';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { LaborType, LaborProfile, LaborAttendance, LaborContract } from '@/types/farm';
import { LaborModal } from '@/components/LaborModal';
import { ContractModal } from '@/components/ContractModal';
import { ContractDetailModal } from '@/components/ContractDetailModal';

const { width } = Dimensions.get('window');

export default function LaborBookScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<LaborType>('Daily');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [contractStatusFilter, setContractStatusFilter] = useState<'Active' | 'Completed'>('Active');
    const [selectedContractor, setSelectedContractor] = useState<LaborProfile | null>(null);
    const [selectedContract, setSelectedContract] = useState<LaborContract | null>(null);
    const { 
        laborProfiles, 
        laborContracts, 
        laborTransactions, 
        laborAttendance, 
        plots, 
        addLaborProfile,
        addLaborContract,
        updateLaborContract,
        deleteLaborContract,
        addLaborTransaction
    } = useFarm();

    const dailyWorkers = useMemo(() => laborProfiles.filter(p => p.type === 'Daily'), [laborProfiles]);
    const annualStaff = useMemo(() => laborProfiles.filter(p => p.type === 'Annual'), [laborProfiles]);
    const contractors = useMemo(() => laborProfiles.filter(p => p.type === 'Contract'), [laborProfiles]);

    const stats = useMemo(() => {
        // 1. Total Staff Advance Outstanding (Excluding Contract Payments)
        const staffAdvances = laborTransactions
            .filter(t => t.type === 'Advance')
            .reduce((acc, t) => acc + t.amount, 0);
        const staffRepayments = laborTransactions
            .filter(t => t.type === 'Advance Repayment')
            .reduce((acc, t) => acc + t.amount, 0);
        const advanceOutstanding = staffAdvances - staffRepayments;

        // 2. Active Contract Remaining Balance
        const activeContracts = laborContracts.filter(c => c.status === 'Active');
        const contractObligation = activeContracts.reduce((acc, c) => acc + (c.totalAmount - c.advancePaid), 0);

        // 3. Today's Labor Strength
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAttendance = laborAttendance.filter(a => a.date === todayStr && a.status === 'Present').length;

        return {
            advanceOutstanding,
            contractObligation,
            todayAttendance,
            activeContracts: activeContracts.length
        };
    }, [laborProfiles, laborContracts, laborTransactions, laborAttendance]);

    return (
        <View style={styles.container}>
            {/* Header Stats */}
            <View style={styles.statsOverview}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Advances</Text>
                    <Text style={[styles.statValue, { color: Palette.danger }]}>₹{stats.advanceOutstanding.toLocaleString()}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Contract Bal.</Text>
                    <Text style={[styles.statValue, { color: Palette.primary }]}>₹{stats.contractObligation.toLocaleString()}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Today Present</Text>
                    <Text style={styles.statValue}>{stats.todayAttendance}</Text>
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
                                <TouchableOpacity 
                                    key={worker.id} 
                                    style={styles.laborCard}
                                    onPress={() => router.push({ pathname: '/worker-detail', params: { id: worker.id } })}
                                >
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
                                    </TouchableOpacity>
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
                                <TouchableOpacity 
                                    key={worker.id} 
                                    style={styles.laborCard}
                                    onPress={() => router.push({ pathname: '/worker-detail', params: { id: worker.id } })}
                                >
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
                                    </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'Contract' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Contracts</Text>
                            <View style={styles.miniToggle}>
                                <TouchableOpacity 
                                    style={[styles.miniToggleBtn, contractStatusFilter === 'Active' && styles.activeMiniToggle]}
                                    onPress={() => setContractStatusFilter('Active')}
                                >
                                    <Text style={[styles.miniToggleText, contractStatusFilter === 'Active' && styles.activeMiniToggleText]}>Ongoing</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.miniToggleBtn, contractStatusFilter === 'Completed' && styles.activeMiniToggle]}
                                    onPress={() => setContractStatusFilter('Completed')}
                                >
                                    <Text style={[styles.miniToggleText, contractStatusFilter === 'Completed' && styles.activeMiniToggleText]}>Completed</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        {contractors.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="document-text-outline" size={48} color={Palette.textSecondary + '40'} />
                                <Text style={styles.emptyText}>No contractor labor added yet.</Text>
                            </View>
                        ) : (
                            contractors.map(worker => {
                                const filteredContracts = laborContracts.filter(c => 
                                    c.contractorId === worker.id && 
                                    c.status === contractStatusFilter
                                );
                                
                                // Always show contractor card in Ongoing tab (so we can see names and create contracts)
                                // Only hide in Completed tab if they have NO completed contracts
                                if (contractStatusFilter === 'Completed' && filteredContracts.length === 0) return null;

                                return (
                                    <View 
                                        key={worker.id} 
                                        style={styles.laborCard}
                                    >
                                        <TouchableOpacity 
                                            style={styles.cardHeader}
                                            onPress={() => router.push({ pathname: '/worker-detail', params: { id: worker.id } })}
                                        >
                                            <Text style={styles.workerName}>{worker.name}</Text>
                                            {filteredContracts.length > 0 && (
                                                <View style={[styles.badge, { backgroundColor: (contractStatusFilter === 'Active' ? Palette.primary : Palette.success) + '20' }]}>
                                                    <Text style={[styles.badgeText, { color: contractStatusFilter === 'Active' ? Palette.primary : Palette.success }]}>
                                                        {filteredContracts.length} {contractStatusFilter}
                                                    </Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>

                                        {filteredContracts.length > 0 && (
                                            <View style={styles.contractsList}>
                                                {filteredContracts.map(contract => (
                                                    <View key={contract.id} style={styles.contractItem}>
                                                        <View style={styles.contractItemHeader}>
                                                            <Text style={styles.projectName}>{contract.projectName}</Text>
                                                            <TouchableOpacity 
                                                                style={styles.viewDetailBtn}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedContract(contract);
                                                                    setSelectedContractor(worker);
                                                                    setShowDetailModal(true);
                                                                }}
                                                            >
                                                                <Text style={styles.viewDetailText}>Manage</Text>
                                                                <Ionicons name="settings-outline" size={14} color={Palette.primary} />
                                                            </TouchableOpacity>
                                                        </View>
                                                        
                                                        <View style={styles.progressBarBg}>
                                                            <View style={[styles.progressBarFill, { width: `${(contract.advancePaid / contract.totalAmount) * 100}%` }]} />
                                                        </View>
                                                        <Text style={styles.payoutText}>
                                                            ₹{contract.advancePaid.toLocaleString()} paid of ₹{contract.totalAmount.toLocaleString()}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {worker.phone && (
                                            <View style={[styles.cardInfoRow, { marginTop: filteredContracts.length > 0 ? 12 : 4 }]}>
                                                <Ionicons name="call-outline" size={14} color={Palette.textSecondary} />
                                                <Text style={styles.infoLabel}>{worker.phone}</Text>
                                            </View>
                                        )}
                                        {worker.notes && (
                                            <Text style={styles.cardNote} numberOfLines={2}>{worker.notes}</Text>
                                        )}

                                        {contractStatusFilter === 'Active' && (
                                            <TouchableOpacity 
                                                style={styles.createContractBtn}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedContractor(worker);
                                                    setShowContractModal(true);
                                                }}
                                            >
                                                <Ionicons name="add-circle-outline" size={16} color="white" />
                                                <Text style={styles.createContractText}>Create Contract</Text>
                                            </TouchableOpacity>
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

            <ContractModal
                visible={showContractModal}
                onClose={() => setShowContractModal(false)}
                onSave={addLaborContract}
                contractor={selectedContractor}
                plots={plots}
            />

            <ContractDetailModal
                visible={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                contract={selectedContract}
                contractor={selectedContractor}
                plots={plots}
                onUpdate={async (updated) => {
                    await updateLaborContract(updated);
                    setSelectedContract(updated);
                }}
                onDelete={deleteLaborContract}
                onRecordPayment={async (cid, amt) => {
                    if (!selectedContractor || !selectedContract) return;
                    
                    // 1. Record the transaction
                    await addLaborTransaction({
                        id: '',
                        workerId: selectedContractor.id,
                        amount: amt,
                        date: new Date().toISOString().split('T')[0],
                        type: 'Contract Payment',
                        note: `Payment: ${selectedContract.projectName}`
                    });

                    // 2. Update the contract's cumulative paid amount
                    const updatedContract = { 
                        ...selectedContract, 
                        advancePaid: (selectedContract.advancePaid || 0) + amt 
                    };
                    await updateLaborContract(updatedContract);
                    
                    // 3. Refresh local state to update the modal UI immediately
                    setSelectedContract(updatedContract);
                }}
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
    miniToggle: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        padding: 2,
    },
    miniToggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    activeMiniToggle: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    miniToggleText: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    activeMiniToggleText: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
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
    contractDetails: {
        marginTop: 12,
    },
    contractsList: {
        marginTop: 12,
        gap: 12,
    },
    contractItem: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    contractItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
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
    createContractBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Palette.primary,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 12,
        gap: 8,
    },
    createContractText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
    },
    viewDetailBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4,
    },
    viewDetailText: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
});
