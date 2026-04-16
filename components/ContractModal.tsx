import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { Text } from './Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LaborProfile, LaborContract, Plot, ExpenseCategory } from '@/types/farm';
import { CalendarModal } from './CalendarModal';
import { format } from 'date-fns';

interface ContractModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (contract: LaborContract) => Promise<void>;
    contractor: LaborProfile | null;
    plots: Plot[];
    initialContract?: LaborContract | null;
}

export function ContractModal({ visible, onClose, onSave, contractor, plots, initialContract }: ContractModalProps) {
    const [projectName, setProjectName] = useState('');
    const [service, setService] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [deadline, setDeadline] = useState(new Date());
    const [plotId, setPlotId] = useState<string | null>(null);
    const [totalAmount, setTotalAmount] = useState('');
    const [advancePaid, setAdvancePaid] = useState('');
    const [notes, setNotes] = useState('');
    
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            if (initialContract) {
                setProjectName(initialContract.projectName);
                setService(initialContract.service || '');
                setStartDate(initialContract.startDate ? new Date(initialContract.startDate) : new Date());
                setDeadline(initialContract.deadline ? new Date(initialContract.deadline) : new Date());
                setPlotId(initialContract.plotId || null);
                setTotalAmount(initialContract.totalAmount.toString());
                setAdvancePaid(initialContract.advancePaid.toString());
                setNotes(initialContract.notes || '');
            } else {
                reset();
            }
        }
    }, [visible, initialContract]);

    const reset = () => {
        setProjectName('');
        setService('');
        setStartDate(new Date());
        setDeadline(new Date());
        setPlotId(null);
        setTotalAmount('');
        setAdvancePaid('');
        setNotes('');
        setIsSaving(false);
    };

    const handleSave = async () => {
        if (!contractor) return;
        if (!projectName.trim()) {
            Alert.alert('Error', 'Please enter a project title');
            return;
        }
        if (!totalAmount || isNaN(parseFloat(totalAmount))) {
            Alert.alert('Error', 'Please enter a valid total amount');
            return;
        }

        try {
            setIsSaving(true);
            const contract: LaborContract = {
                id: initialContract?.id || '', 
                contractorId: contractor.id,
                projectName: projectName.trim(),
                service: service.trim(),
                startDate: format(startDate, 'yyyy-MM-dd'),
                deadline: format(deadline, 'yyyy-MM-dd'),
                totalAmount: parseFloat(totalAmount),
                advancePaid: advancePaid ? parseFloat(advancePaid) : 0,
                status: initialContract?.status || 'Active',
                plotId: plotId || undefined,
                notes: notes.trim(),
            };

            await onSave(contract);
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to save contract');
        } finally {
            setIsSaving(false);
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
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalContent}
                >
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Create Contract</Text>
                            <Text style={styles.subtitle}>For {contractor?.name}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isSaving}>
                            <Ionicons name="close" size={24} color={Palette.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        showsVerticalScrollIndicator={false} 
                        style={styles.form}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Project Title</Text>
                            <TextInput
                                style={styles.input}
                                value={projectName}
                                onChangeText={setProjectName}
                                placeholder="e.g. Cotton Harvesting 2024"
                                placeholderTextColor={Palette.textSecondary + '80'}
                                editable={!isSaving}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Service Type</Text>
                            <View style={styles.serviceSelector}>
                                {['Harvesting', 'Spraying', 'Sowing', 'Weeding', 'Tilling', 'Other'].map((s) => (
                                    <TouchableOpacity 
                                        key={s}
                                        style={[styles.serviceChip, service === s && styles.activeServiceChip]}
                                        onPress={() => setService(s)}
                                    >
                                        <Text style={[styles.serviceText, service === s && styles.activeServiceText]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {service === 'Other' && (
                                <TextInput
                                    style={[styles.input, { marginTop: 8 }]}
                                    placeholder="Enter custom service"
                                    onChangeText={setService}
                                    placeholderTextColor={Palette.textSecondary + '80'}
                                />
                            )}
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Start Date</Text>
                                <TouchableOpacity 
                                    style={styles.dateSelector} 
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <Ionicons name="calendar-outline" size={18} color={Palette.primary} />
                                    <Text style={styles.dateText}>{format(startDate, 'dd MMM yyyy')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Deadline</Text>
                                <TouchableOpacity 
                                    style={styles.dateSelector} 
                                    onPress={() => setShowEndPicker(true)}
                                >
                                    <Ionicons name="calendar-outline" size={18} color={Palette.danger} />
                                    <Text style={styles.dateText}>{format(deadline, 'dd MMM yyyy')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Select Plot (Optional)</Text>
                            <View style={styles.serviceSelector}>
                                {plots.map((p) => (
                                    <TouchableOpacity 
                                        key={p.id}
                                        style={[styles.serviceChip, plotId === p.id && styles.activeServiceChip]}
                                        onPress={() => setPlotId(plotId === p.id ? null : p.id)}
                                    >
                                        <Text style={[styles.serviceText, plotId === p.id && styles.activeServiceText]}>{p.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Total Amount (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={totalAmount}
                                    onChangeText={setTotalAmount}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={Palette.textSecondary + '80'}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Initial Advance (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={advancePaid}
                                    onChangeText={setAdvancePaid}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={Palette.textSecondary + '80'}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Contract Note</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={3}
                                placeholder="Terms, conditions or task details..."
                                placeholderTextColor={Palette.textSecondary + '80'}
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            <Text style={styles.saveButtonText}>
                                {isSaving ? 'Saving...' : initialContract ? 'Update Project' : 'Start Project'}
                            </Text>
                        </TouchableOpacity>
                        
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            <CalendarModal
                visible={showStartPicker}
                initialDate={startDate}
                onClose={() => setShowStartPicker(false)}
                onSelectDate={(date) => {
                    setStartDate(date);
                    setShowStartPicker(false);
                }}
            />
            <CalendarModal
                visible={showEndPicker}
                initialDate={deadline}
                onClose={() => setShowEndPicker(false)}
                onSelectDate={(date) => {
                    setDeadline(date);
                    setShowEndPicker(false);
                }}
            />
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
        maxHeight: '90%',
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
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
    closeButton: {
        padding: 4,
    },
    form: {
    },
    inputGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        fontFamily: 'Outfit',
        color: Palette.text,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    dateText: {
        marginLeft: 8,
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    serviceSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    serviceChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeServiceChip: {
        backgroundColor: Palette.primary + '15',
        borderColor: Palette.primary,
    },
    serviceText: {
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    activeServiceText: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
    },
    saveButton: {
        backgroundColor: Palette.primary,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
});
