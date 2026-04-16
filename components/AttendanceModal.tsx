import React, { useState, useMemo } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { Text } from './Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LaborProfile, LaborAttendance, AttendanceStatus } from '@/types/farm';

interface AttendanceModalProps {
    visible: boolean;
    onClose: () => void;
    workers: LaborProfile[];
    onSave: (records: LaborAttendance[]) => Promise<void>;
}

export function AttendanceModal({ visible, onClose, workers, onSave }: AttendanceModalProps) {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [attendances, setAttendances] = useState<Record<string, AttendanceStatus>>({});

    // Initialize/Reset attendances when modal opens
    React.useEffect(() => {
        if (visible) {
            const initial: Record<string, AttendanceStatus> = {};
            workers.forEach(w => {
                initial[w.id] = 'Present'; // Default to present
            });
            setAttendances(initial);
        }
    }, [visible, workers]);

    const toggleStatus = (workerId: string) => {
        setAttendances(prev => {
            const current = prev[workerId];
            let next: AttendanceStatus = 'Present';
            if (current === 'Present') next = 'Half-Day';
            else if (current === 'Half-Day') next = 'Absent';
            else next = 'Present';
            
            return { ...prev, [workerId]: next };
        });
    };

    const handleSave = async () => {
        const records: LaborAttendance[] = Object.entries(attendances).map(([workerId, status]) => ({
            id: '', // Generated
            workerId,
            date,
            status,
        }));

        await onSave(records);
        Alert.alert('Success', 'Attendance logged successfully');
        onClose();
    };

    const getStatusStyle = (status: AttendanceStatus) => {
        switch (status) {
            case 'Present': return { bg: Palette.success + '15', text: Palette.success, icon: 'checkmark-circle' };
            case 'Half-Day': return { bg: '#F59E0B' + '15', text: '#F59E0B', icon: 'contrast' };
            case 'Absent': return { bg: Palette.danger + '15', text: Palette.danger, icon: 'close-circle' };
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Log Attendance</Text>
                            <Text style={styles.subtitle}>{new Date(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={Palette.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
                        {workers.length === 0 ? (
                            <Text style={styles.emptyText}>No workers found to log.</Text>
                        ) : (
                            workers.map(worker => {
                                const status = attendances[worker.id] || 'Present';
                                const style = getStatusStyle(status);
                                return (
                                    <View key={worker.id} style={styles.workerRow}>
                                        <View style={styles.workerInfo}>
                                            <Text style={styles.workerName}>{worker.name}</Text>
                                            <Text style={styles.workerType}>{worker.type} Wage</Text>
                                        </View>
                                        <TouchableOpacity 
                                            style={[styles.statusToggle, { backgroundColor: style.bg }]}
                                            onPress={() => toggleStatus(worker.id)}
                                        >
                                            <Ionicons name={style.icon as any} size={18} color={style.text} />
                                            <Text style={[styles.statusText, { color: style.text }]}>{status}</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Save Daily Log</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        maxHeight: '80%',
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    subtitle: {
        fontSize: 13,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    list: {
        marginVertical: 10,
    },
    workerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    workerInfo: {
        flex: 1,
    },
    workerName: {
        fontSize: 16,
        fontFamily: 'Outfit-Medium',
        color: Palette.text,
    },
    workerType: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginTop: 2,
    },
    statusToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        minWidth: 110,
        justifyContent: 'center',
    },
    statusText: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        marginLeft: 6,
    },
    saveButton: {
        backgroundColor: Palette.primary,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
    emptyText: {
        textAlign: 'center',
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginVertical: 20,
    },
});
