import React, { useState } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Text } from './Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LaborContract, LaborProfile, Plot } from '@/types/farm';
import { format } from 'date-fns';
import { ContractModal } from './ContractModal';

interface ContractDetailModalProps {
    visible: boolean;
    onClose: () => void;
    contract: LaborContract | null;
    contractor: LaborProfile | null;
    plots: Plot[];
    onUpdate: (contract: LaborContract) => Promise<void>;
    onDelete: (contractId: string) => Promise<void>;
    onRecordPayment: (contractId: string, amount: number) => Promise<void>;
}

export function ContractDetailModal({ 
    visible, 
    onClose, 
    contract, 
    contractor, 
    plots,
    onUpdate,
    onDelete,
    onRecordPayment
}: ContractDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [showPaymentInput, setShowPaymentInput] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!contract || !contractor) return null;

    const remaining = contract.totalAmount - contract.advancePaid;
    const progress = (contract.advancePaid / contract.totalAmount) * 100;
    const plot = plots.find(p => p.id === contract.plotId);

    const handleEndContract = async () => {
        Alert.alert(
            'End Contract',
            'Are you sure you want to mark this contract as Completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Yes, Complete', 
                    onPress: async () => {
                        setIsProcessing(true);
                        await onUpdate({ ...contract, status: 'Completed' });
                        setIsProcessing(false);
                        onClose();
                    } 
                }
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Contract',
            'This will permanently remove the contract record. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        await onDelete(contract.id);
                        onClose();
                    } 
                }
            ]
        );
    };

    const handlePayment = async () => {
        const amt = parseFloat(paymentAmount);
        
        // Start processing lock
        setIsProcessing(true);

        if (isNaN(amt) || amt <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            setIsProcessing(false);
            return;
        }
        
        if (amt > remaining) {
            Alert.alert(
                'Payment Exceeded', 
                `This payment exceeds the remaining due amount. The maximum allowed is ₹${remaining.toLocaleString()}.`
            );
            setIsProcessing(false);
            return;
        }

        try {
            await onRecordPayment(contract.id, amt);
            setPaymentAmount('');
            setShowPaymentInput(false);
            Alert.alert('Success', 'Payment recorded successfully.');
        } catch (e) {
            Alert.alert('Error', 'Failed to record payment');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title} numberOfLines={1}>{contract.projectName}</Text>
                            <Text style={styles.subtitle}>Contract with {contractor.name}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerIconButton}>
                                <Ionicons name="create-outline" size={22} color={Palette.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={Palette.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Financial Progress Card */}
                        <View style={styles.progressCard}>
                            <View style={styles.progressHeader}>
                                <View>
                                    <Text style={styles.progressLabel}>Total Payout Progress</Text>
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusText}>{contract.status}</Text>
                                    </View>
                                </View>
                                <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
                            </View>
                            
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                            </View>

                            <View style={styles.financialRows}>
                                <View style={styles.finRow}>
                                    <Text style={styles.finLabel}>Total Amount</Text>
                                    <Text style={styles.finValue}>₹{contract.totalAmount.toLocaleString()}</Text>
                                </View>
                                <View style={styles.finRow}>
                                    <Text style={styles.finLabel}>Paid So Far</Text>
                                    <Text style={[styles.finValue, { color: Palette.success }]}>₹{contract.advancePaid.toLocaleString()}</Text>
                                </View>
                                <View style={styles.finDivider} />
                                <View style={styles.finRow}>
                                    <Text style={styles.finLabel}>Remaining Balance</Text>
                                    <Text style={[styles.finValue, { color: Palette.danger, fontFamily: 'Outfit-Bold' }]}>
                                        ₹{remaining.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Details Sections */}
                        <View style={styles.detailsGrid}>
                            <View style={styles.detailItem}>
                                <Ionicons name="construct-outline" size={18} color={Palette.primary} />
                                <View style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Service</Text>
                                    <Text style={styles.detailValue}>{contract.service || 'Not specified'}</Text>
                                </View>
                            </View>
                            <View style={styles.detailItem}>
                                <Ionicons name="map-outline" size={18} color={Palette.primary} />
                                <View style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Plot</Text>
                                    <Text style={styles.detailValue}>{plot?.name || 'Any Plot'}</Text>
                                </View>
                            </View>
                            <View style={styles.detailItem}>
                                <Ionicons name="calendar-outline" size={18} color={Palette.primary} />
                                <View style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Timeline</Text>
                                    <Text style={styles.detailValue}>
                                        {format(new Date(contract.startDate || ''), 'dd MMM')} - {format(new Date(contract.deadline), 'dd MMM yyyy')}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {contract.notes && (
                            <View style={styles.notesBox}>
                                <Text style={styles.notesLabel}>Project Notes</Text>
                                <Text style={styles.notesContent}>{contract.notes}</Text>
                            </View>
                        )}

                        {/* Actions */}
                        {contract.status === 'Active' && (
                            <View style={styles.actionSection}>
                                <Text style={styles.sectionTitle}>Manage Contract</Text>
                                
                                {showPaymentInput ? (
                                    <View style={styles.paymentForm}>
                                        <TextInput
                                            style={styles.paymentInput}
                                            placeholder="Enter payment amount"
                                            keyboardType="numeric"
                                            value={paymentAmount}
                                            onChangeText={setPaymentAmount}
                                            autoFocus
                                        />
                                        <View style={styles.paymentActions}>
                                            <TouchableOpacity 
                                                style={[styles.btn, styles.cancelBtn]}
                                                onPress={() => setShowPaymentInput(false)}
                                            >
                                                <Text style={styles.btnTextDark}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[styles.btn, styles.payConfirmBtn, isProcessing && { opacity: 0.8 }]}
                                                onPress={handlePayment}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? (
                                                    <ActivityIndicator color="white" size="small" />
                                                ) : (
                                                    <Text style={styles.btnText}>Confirm Payment</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        style={styles.mainActionBtn}
                                        onPress={() => setShowPaymentInput(true)}
                                    >
                                        <Ionicons name="card-outline" size={20} color="white" />
                                        <Text style={styles.mainActionText}>Add Payment / Advance</Text>
                                    </TouchableOpacity>
                                )}

                                <View style={styles.secondaryActions}>
                                    <TouchableOpacity style={styles.secBtn} onPress={handleEndContract}>
                                        <Ionicons name="checkmark-done" size={18} color={Palette.success} />
                                        <Text style={styles.secBtnText}>Mark Completed</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.secBtn} onPress={handleDelete}>
                                        <Ionicons name="trash-outline" size={18} color={Palette.danger} />
                                        <Text style={[styles.secBtnText, { color: Palette.danger }]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>

                    <ContractModal
                        visible={isEditing}
                        onClose={() => setIsEditing(false)}
                        onSave={async (updated) => {
                            await onUpdate(updated);
                            setIsEditing(false);
                        }}
                        contractor={contractor}
                        plots={plots}
                        initialContract={contract}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '85%',
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
    },
    headerIconButton: {
        padding: 4,
    },
    closeButton: {
        padding: 4,
    },
    progressCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressLabel: {
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    progressPercent: {
        fontSize: 24,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
    statusBadge: {
        backgroundColor: Palette.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
        textTransform: 'uppercase',
    },
    progressBarBg: {
        height: 10,
        backgroundColor: '#E2E8F0',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 20,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Palette.primary,
    },
    financialRows: {
        gap: 12,
    },
    finRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    finDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 4,
    },
    finLabel: {
        fontSize: 14,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
    },
    finValue: {
        fontSize: 16,
        fontFamily: 'Outfit-Medium',
        color: Palette.text,
    },
    detailsGrid: {
        gap: 16,
        marginBottom: 24,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 12,
        borderRadius: 16,
    },
    detailText: {
        marginLeft: 12,
    },
    detailLabel: {
        fontSize: 11,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
    },
    detailValue: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    notesBox: {
        marginBottom: 24,
    },
    notesLabel: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
        marginBottom: 8,
    },
    notesContent: {
        fontSize: 14,
        fontFamily: 'Outfit',
        color: Palette.text,
        lineHeight: 20,
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    actionSection: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    sectionTitle: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        marginBottom: 16,
    },
    mainActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Palette.primary,
        padding: 16,
        borderRadius: 16,
        gap: 8,
        marginBottom: 12,
    },
    mainActionText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: 12,
    },
    secBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    secBtnText: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    paymentForm: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Palette.primary + '20',
        marginBottom: 16,
    },
    paymentInput: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 14,
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
    },
    paymentActions: {
        flexDirection: 'row',
        gap: 12,
    },
    btn: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#E2E8F0',
    },
    payConfirmBtn: {
        backgroundColor: Palette.success,
    },
    btnText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
    },
    btnTextDark: {
        color: Palette.text,
        fontFamily: 'Outfit-Bold',
    }
});
