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

    const dailyWorkers = useMemo(() => laborProfiles.filter(p => p.type === 'Daily' && p.isActive !== false), [laborProfiles]);
    const annualStaff = useMemo(() => laborProfiles.filter(p => p.type === 'Annual' && p.isActive !== false), [laborProfiles]);
    const contractors = useMemo(() => laborProfiles.filter(p => p.type === 'Contract' && p.isActive !== false), [laborProfiles]);


    return (
        <View style={styles.container}>
            <View style={styles.topHeader}>
                {/* Quick Access Grid */}
                <View style={styles.quickGrid}>
                    <TouchableOpacity 
                        style={[styles.gridItem, { backgroundColor: Palette.primary + '08' }]}
                        onPress={() => router.push('/labor-attendance-record')}
                    >
                        <Ionicons name="calendar" size={20} color={Palette.primary} />
                        <Text style={[styles.gridLabel, { color: Palette.primary }]}>Attendance</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.gridItem, { backgroundColor: Palette.success + '08' }]}
                        onPress={() => router.push('/labor-transactions')}
                    >
                        <Ionicons name="receipt" size={20} color={Palette.success} />
                        <Text style={[styles.gridLabel, { color: Palette.success }]}>Transactions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.gridItem, { backgroundColor: '#F59E0B' + '08' }]}
                        onPress={() => router.push('/labor-analytics')}
                    >
                        <Ionicons name="bar-chart" size={20} color="#F59E0B" />
                        <Text style={[styles.gridLabel, { color: '#F59E0B' }]}>Analytics</Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabBar}>
                    {(['Daily', 'Annual', 'Contract'] as LaborType[]).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabItemText, activeTab === tab && styles.activeTabItemText]}>
                                {tab === 'Daily' ? 'Daily Wage' : tab === 'Annual' ? 'Annual' : 'Contractors'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {activeTab === 'Daily' && (
                    <View>
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>Staff Directory</Text>
                            <TouchableOpacity 
                                style={styles.sheetBtn} 
                                onPress={() => router.push({ pathname: '/labor-attendance-sheet', params: { type: 'Daily' } })}
                            >
                                <Ionicons name="grid-outline" size={14} color="white" />
                                <Text style={styles.sheetBtnText}>Attendance Sheet</Text>
                            </TouchableOpacity>
                        </View>
                        {dailyWorkers.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons name="people-outline" size={40} color="#94A3B8" />
                                <Text style={styles.emptyCardText}>No daily staff found</Text>
                            </View>
                        ) : (
                            dailyWorkers.map(worker => (
                                <TouchableOpacity 
                                    key={worker.id} 
                                    style={styles.profileCard}
                                    onPress={() => router.push({ pathname: '/worker-detail', params: { id: worker.id } })}
                                >
                                    <View style={styles.profileMain}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{worker.name.charAt(0)}</Text>
                                        </View>
                                        <View style={styles.profileInfo}>
                                            <Text style={styles.profileName}>{worker.name}</Text>
                                            <View style={styles.profileMeta}>
                                                <Ionicons name="wallet-outline" size={12} color="#64748B" />
                                                <Text style={styles.profileMetaText}>₹{worker.baseWage}/day</Text>
                                            </View>
                                            {worker.notes && (
                                                <Text style={styles.workerNote} numberOfLines={1}>{worker.notes}</Text>
                                            )}
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'Annual' && (
                    <View>
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>Fixed Staff</Text>
                            <TouchableOpacity 
                                style={styles.sheetBtn} 
                                onPress={() => router.push({ pathname: '/labor-attendance-sheet', params: { type: 'Annual' } })}
                            >
                                <Ionicons name="grid-outline" size={14} color="white" />
                                <Text style={styles.sheetBtnText}>Attendance Sheet</Text>
                            </TouchableOpacity>
                        </View>
                        {annualStaff.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons name="briefcase-outline" size={40} color="#94A3B8" />
                                <Text style={styles.emptyCardText}>No annual staff found</Text>
                            </View>
                        ) : (
                            annualStaff.map(worker => (
                                <TouchableOpacity 
                                    key={worker.id} 
                                    style={styles.profileCard}
                                    onPress={() => router.push({ pathname: '/worker-detail', params: { id: worker.id } })}
                                >
                                    <View style={styles.profileMain}>
                                        <View style={[styles.avatar, { backgroundColor: Palette.success + '10' }]}>
                                            <Text style={[styles.avatarText, { color: Palette.success }]}>{worker.name.charAt(0)}</Text>
                                        </View>
                                        <View style={styles.profileInfo}>
                                            <Text style={styles.profileName}>{worker.name}</Text>
                                            <View style={styles.profileMeta}>
                                                <Ionicons name="cash-outline" size={12} color="#64748B" />
                                                <Text style={styles.profileMetaText}>₹{(worker.baseWage || 0).toLocaleString()} Annual</Text>
                                            </View>
                                            {worker.notes && (
                                                <Text style={styles.workerNote} numberOfLines={1}>{worker.notes}</Text>
                                            )}
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'Contract' && (
                    <View>
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>Project Contracts</Text>
                            <View style={styles.filterPillGroup}>
                                <TouchableOpacity 
                                    style={[styles.filterPill, contractStatusFilter === 'Active' && styles.activeFilterPill]}
                                    onPress={() => setContractStatusFilter('Active')}
                                >
                                    <Text style={[styles.filterPillText, contractStatusFilter === 'Active' && styles.activeFilterPillText]}>Active</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.filterPill, contractStatusFilter === 'Completed' && styles.activeFilterPill]}
                                    onPress={() => setContractStatusFilter('Completed')}
                                >
                                    <Text style={[styles.filterPillText, contractStatusFilter === 'Completed' && styles.activeFilterPillText]}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {contractors.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
                                <Text style={styles.emptyCardText}>No contractors found</Text>
                            </View>
                        ) : (
                            contractors.map(worker => {
                                const filteredContracts = laborContracts.filter(c => 
                                    c.contractorId === worker.id && 
                                    c.status === contractStatusFilter
                                );
                                
                                if (contractStatusFilter === 'Completed' && filteredContracts.length === 0) return null;

                                return (
                                    <View key={worker.id} style={styles.contractorBlock}>
                                        <TouchableOpacity 
                                            style={styles.contractorHead}
                                            onPress={() => router.push({ pathname: '/worker-detail', params: { id: worker.id } })}
                                        >
                                            <View style={styles.contractorInfo}>
                                                <Text style={styles.contractorName}>{worker.name}</Text>
                                                <Text style={styles.contractorSub}>Contractor</Text>
                                                {worker.notes && (
                                                    <Text style={[styles.workerNote, { marginTop: 4 }]} numberOfLines={1}>{worker.notes}</Text>
                                                )}
                                            </View>
                                            <Ionicons name="arrow-forward-circle-outline" size={24} color={Palette.primary} />
                                        </TouchableOpacity>

                                        {filteredContracts.length > 0 ? (
                                            <View style={styles.contractsStack}>
                                                {filteredContracts.map(contract => (
                                                    <View key={contract.id} style={styles.contractDetailCard}>
                                                        <View style={styles.contractTopRow}>
                                                            <Text style={styles.projectNameText}>{contract.projectName}</Text>
                                                            <TouchableOpacity 
                                                                style={styles.manageIconBtn}
                                                                onPress={() => {
                                                                    setSelectedContract(contract);
                                                                    setSelectedContractor(worker);
                                                                    setShowDetailModal(true);
                                                                }}
                                                            >
                                                                <Ionicons name="ellipsis-vertical" size={16} color="#64748B" />
                                                            </TouchableOpacity>
                                                        </View>
                                                        
                                                        <View style={styles.progressSection}>
                                                            <View style={styles.progressTrack}>
                                                                <View style={[styles.progressIndicator, { width: `${Math.min((contract.advancePaid / contract.totalAmount) * 100, 100)}%` }]} />
                                                            </View>
                                                            <View style={styles.progressLabels}>
                                                                <Text style={styles.progressVal}>₹{contract.advancePaid.toLocaleString()}</Text>
                                                                <Text style={styles.progressTotal}>of ₹{contract.totalAmount.toLocaleString()}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : (
                                            <TouchableOpacity 
                                                style={styles.ghostAddBtn}
                                                onPress={() => {
                                                    setSelectedContractor(worker);
                                                    setShowContractModal(true);
                                                }}
                                            >
                                                <Ionicons name="add" size={16} color="#94A3B8" />
                                                <Text style={styles.ghostAddText}>Create new contract</Text>
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
                        note: `Payment: ${selectedContract.projectName}`,
                        contractId: cid
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
        backgroundColor: '#FFFFFF',
    },
    topHeader: {
        backgroundColor: 'white',
        paddingTop: 10,
        paddingBottom: 10,
        paddingHorizontal: 20,
    },
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 26,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    headerStats: {
        flexDirection: 'row',
        gap: 12,
    },
    headerStatItem: {
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    headerStatValue: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
    headerStatLabel: {
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    quickGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    gridItem: {
        flex: 1,
        height: 70,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    gridLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        padding: 4,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    tabItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTabItem: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    tabItemText: {
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: '#64748B',
    },
    activeTabItemText: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 16,
    },
    listTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    sheetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    sheetBtnText: {
        color: 'white',
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
    },
    profileCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    profileMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: Palette.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
        marginBottom: 2,
    },
    profileMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    profileMetaText: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: '#64748B',
    },
    filterPillGroup: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        padding: 2,
    },
    filterPill: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    activeFilterPill: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    filterPillText: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
    },
    activeFilterPillText: {
        color: Palette.primary,
    },
    contractorBlock: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    contractorHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    contractorInfo: {
        flex: 1,
    },
    contractorName: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    contractorSub: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: '#94A3B8',
    },
    contractsStack: {
        gap: 12,
    },
    contractDetailCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    contractTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    projectNameText: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: '#475569',
    },
    manageIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    progressSection: {
        gap: 8,
    },
    progressTrack: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressIndicator: {
        height: '100%',
        backgroundColor: Palette.primary,
    },
    progressLabels: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    progressVal: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    progressTotal: {
        fontSize: 11,
        fontFamily: 'Outfit-Medium',
        color: '#94A3B8',
    },
    workerNote: {
        fontSize: 11,
        fontFamily: 'Outfit-Medium',
        color: '#94A3B8',
        marginTop: 2,
    },
    ghostAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        gap: 8,
    },
    ghostAddText: {
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: '#94A3B8',
    },
    emptyCard: {
        paddingVertical: 40,
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderStyle: 'dashed',
    },
    emptyCardText: {
        marginTop: 12,
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: '#94A3B8',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 60,
        height: 60,
        borderRadius: 22,
        backgroundColor: Palette.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
});
