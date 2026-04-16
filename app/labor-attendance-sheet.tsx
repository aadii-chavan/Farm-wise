import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { Stack, useRouter } from 'expo-router';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

const { width } = Dimensions.get('window');

import { useLocalSearchParams } from 'expo-router';

export default function AttendanceSheetScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const sheetType = (params.type as string) || 'Daily';
    
    const { laborProfiles, laborAttendance, saveLaborAttendance } = useFarm();
    const [selectedDate, setSelectedDate] = useState(new Date());

    const workers = useMemo(() => 
        laborProfiles.filter(p => p.type === sheetType && p.isActive),
    [laborProfiles, sheetType]);

    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const [localAttendance, setLocalAttendance] = useState<LaborAttendance[]>([]);
    const [selectedCell, setSelectedCell] = useState<{ worker: LaborProfile, date: Date } | null>(null);
    const [editStatus, setEditStatus] = useState<AttendanceStatus>('Present');
    const [editNote, setEditNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Sync local state with context state
    React.useEffect(() => {
        setLocalAttendance(laborAttendance);
    }, [laborAttendance]);

    const getAttendance = (workerId: string, date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return localAttendance.find(a => a.workerId === workerId && a.date === dateStr);
    };

    const handleOpenEdit = (worker: LaborProfile, date: Date) => {
        const record = getAttendance(worker.id, date);
        setSelectedCell({ worker, date });
        setEditStatus(record?.status || 'Present');
        setEditNote(record?.notes || '');
    };

    const handleSaveDetail = async () => {
        if (!selectedCell) return;
        
        setIsSaving(true);
        const dateStr = format(selectedCell.date, 'yyyy-MM-dd');
        const currentRecord = getAttendance(selectedCell.worker.id, selectedCell.date);
        
        const newRecord: LaborAttendance = {
            id: currentRecord?.id || '',
            workerId: selectedCell.worker.id,
            date: dateStr,
            status: editStatus,
            notes: editNote.trim()
        };

        // Optimistic Update
        setLocalAttendance(prev => {
            const index = prev.findIndex(a => a.workerId === selectedCell.worker.id && a.date === dateStr);
            if (index > -1) {
                const copy = [...prev];
                copy[index] = newRecord;
                return copy;
            }
            return [...prev, newRecord];
        });

        try {
            await saveLaborAttendance([newRecord]);
            setSelectedCell(null);
        } catch (error) {
            setLocalAttendance(laborAttendance);
            Alert.alert('Error', 'Failed to save attendance');
        } finally {
            setIsSaving(false);
        }
    };

    const renderCell = (worker: LaborProfile, date: Date) => {
        const record = getAttendance(worker.id, date);
        
        let char = '';
        let color = '#E2E8F0';
        let bg = 'transparent';

        if (record?.status === 'Present') { char = 'P'; color = Palette.success; bg = Palette.success + '15'; }
        else if (record?.status === 'Absent') { char = 'A'; color = Palette.danger; bg = Palette.danger + '15'; }
        else if (record?.status === 'Half-Day') { char = 'H'; color = '#F59E0B'; bg = '#F59E0B' + '15'; }

        const hasNote = record?.notes && record.notes.length > 0;

        return (
            <TouchableOpacity 
                activeOpacity={0.6}
                onPress={() => handleOpenEdit(worker, date)}
                style={[styles.cell, { backgroundColor: bg }]}
                delayPressIn={0}
            >
                <Text style={[styles.cellText, { color }]}>{char || '·'}</Text>
                {hasNote && (
                    <View style={styles.noteIndicatorContainer}>
                        <Ionicons name="document-text" size={10} color={color} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setSelectedDate(newDate);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerShown: true, 
                title: `${sheetType} Attendance`,
                headerTitleStyle: { fontFamily: 'Outfit-Bold' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="arrow-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                )
            }} />

            {/* Header Controls */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNav}>
                    <Ionicons name="chevron-back" size={20} color={Palette.primary} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{format(selectedDate, 'MMMM yyyy')}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNav}>
                    <Ionicons name="chevron-forward" size={20} color={Palette.primary} />
                </TouchableOpacity>
            </View>

            {/* Main Content Areas */}
            <View style={styles.gridContainer}>
                {/* Vertical Scroll for all rows */}
                <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                    <View style={styles.flexRow}>
                        
                        {/* 1. FIXED COLUMN (Names) */}
                        <View style={styles.fixedColumn}>
                            {/* Static Header for Names */}
                            <View style={[styles.row, styles.headerRow]}>
                                <View style={styles.nameHeader}>
                                    <Text style={styles.headerText}>Staff Name</Text>
                                </View>
                            </View>
                            {/* Name cells */}
                            {workers.length === 0 ? (
                                <View style={styles.nameCell}>
                                    <Text style={styles.emptyText}>No {sheetType.toLowerCase()} staff found</Text>
                                </View>
                            ) : (
                                workers.map(worker => (
                                    <View key={worker.id} style={[styles.row, styles.contentRow]}>
                                        <View style={styles.nameCell}>
                                            <Text style={styles.workerName} numberOfLines={1}>{worker.name}</Text>
                                            <Text style={styles.workerSub}>Base: ₹{worker.baseWage}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* 2. SCROLLABLE GRID (Dates + Data) */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
                            <View>
                                {/* Dates Header */}
                                <View style={[styles.row, styles.headerRow]}>
                                    {days.map(day => (
                                        <View key={day.toISOString()} style={styles.dayHeader}>
                                            <Text style={styles.dayNum}>{format(day, 'd')}</Text>
                                            <Text style={styles.dayName}>{format(day, 'EEEEE')}</Text>
                                        </View>
                                    ))}
                                    <View style={styles.totalHeader}>
                                        <Text style={styles.headerText}>Days</Text>
                                    </View>
                                    <View style={[styles.totalHeader, { width: 80 }]}>
                                        <Text style={styles.headerText}>{sheetType === 'Daily' ? 'Pay' : 'Cut'}</Text>
                                    </View>
                                </View>

                                {/* Grid Cells */}
                                {workers.map(worker => {
                                    const totalPresent = days.reduce((acc, d) => {
                                        const r = getAttendance(worker.id, d);
                                        if (r?.status === 'Present') return acc + 1;
                                        if (r?.status === 'Half-Day') return acc + 0.5;
                                        return acc;
                                    }, 0);

                                    const totalAbsent = days.reduce((acc, d) => {
                                        const r = getAttendance(worker.id, d);
                                        if (r?.status === 'Absent') return acc + 1;
                                        if (r?.status === 'Half-Day') return acc + 0.5;
                                        return acc;
                                    }, 0);

                                    const financialValue = sheetType === 'Daily' 
                                        ? (totalPresent * (worker.baseWage || 0))
                                        : (totalAbsent * ((worker.baseWage || 0) / 365));

                                    return (
                                        <View key={worker.id} style={[styles.row, styles.contentRow]}>
                                            {days.map(day => (
                                                <View key={day.toISOString()}>
                                                    {renderCell(worker, day)}
                                                </View>
                                            ))}
                                            <View style={styles.totalCell}>
                                                <Text style={styles.totalText}>{totalPresent}</Text>
                                            </View>
                                            <View style={[styles.totalCell, { width: 80 }]}>
                                                <Text style={[styles.totalText, { color: sheetType === 'Daily' ? Palette.success : Palette.danger }]}>
                                                    {sheetType === 'Daily' ? '+' : '-'}₹{Math.round(financialValue)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>

                    </View>
                </ScrollView>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: Palette.success }]} />
                        <Text style={styles.legendText}>P (Present)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.legendText}>H (Half Day)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: Palette.danger }]} />
                        <Text style={styles.legendText}>A (Absent)</Text>
                    </View>
                </View>
                <Text style={styles.legendSub}>Tap any cell once to change attendance</Text>
            </View>

            {/* Attendance Detail Modal */}
            <Modal
                visible={!!selectedCell}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedCell(null)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{selectedCell?.worker.name}</Text>
                                <Text style={styles.modalSub}>
                                    {selectedCell ? format(selectedCell.date, 'PPPP') : ''}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedCell(null)}>
                                <Ionicons name="close" size={24} color={Palette.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statusOptions}>
                            {(['Present', 'Half-Day', 'Absent'] as AttendanceStatus[]).map((status) => {
                                const active = editStatus === status;
                                return (
                                    <TouchableOpacity
                                        key={status}
                                        onPress={() => setEditStatus(status)}
                                        style={[
                                            styles.statusBtn,
                                            active && styles.statusBtnActive,
                                            active && status === 'Present' && { backgroundColor: Palette.success },
                                            active && status === 'Absent' && { backgroundColor: Palette.danger },
                                            active && status === 'Half-Day' && { backgroundColor: '#F59E0B' },
                                        ]}
                                    >
                                        <Text style={[styles.statusBtnText, active && { color: 'white' }]}>
                                            {status}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.inputLabel}>Notes</Text>
                        <TextInput
                            style={styles.modalNoteInput}
                            placeholder="Add a reason or note..."
                            value={editNote}
                            onChangeText={setEditNote}
                            multiline
                            numberOfLines={3}
                            placeholderTextColor={Palette.textSecondary + '70'}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalActionBtn, styles.cancelBtn]} 
                                onPress={() => setSelectedCell(null)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalActionBtn, styles.saveBtn]} 
                                onPress={handleSaveDetail}
                                disabled={isSaving}
                            >
                                <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    monthNav: {
        padding: 6,
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        marginHorizontal: 15,
    },
    monthTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        minWidth: 120,
        textAlign: 'center',
    },
    gridContainer: {
        flex: 1,
    },
    flexRow: {
        flexDirection: 'row',
    },
    fixedColumn: {
        backgroundColor: 'white',
        zIndex: 1,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
    },
    headerRow: {
        backgroundColor: '#F8FAFC',
        height: 50,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    contentRow: {
        height: 54,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    nameHeader: {
        width: 130,
        paddingHorizontal: 12,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#E2E8F0',
    },
    nameCell: {
        width: 130,
        paddingHorizontal: 12,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#F1F5F9',
        backgroundColor: 'white',
    },
    headerText: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
        textTransform: 'uppercase',
    },
    dayHeader: {
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#F1F5F9',
    },
    dayNum: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    dayName: {
        fontSize: 10,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
    },
    cell: {
        width: 44,
        height: 53,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#F1F5F9',
    },
    cellText: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
    },
    totalHeader: {
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
    },
    totalCell: {
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
    },
    totalText: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
    workerName: {
        fontSize: 13,
        fontFamily: 'Outfit-SemiBold',
        color: Palette.text,
    },
    workerSub: {
        fontSize: 10,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
    },
    legend: {
        padding: 16,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#F8FAFC',
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    legendText: {
        fontSize: 11,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    legendSub: {
        fontSize: 12,
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        padding: 12,
    },
    // New Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    modalSub: {
        fontSize: 13,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginTop: 2,
    },
    statusOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statusBtn: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    statusBtnActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statusBtnText: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        color: Palette.text,
        marginBottom: 8,
    },
    modalNoteInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        height: 100,
        textAlignVertical: 'top',
        fontSize: 15,
        fontFamily: 'Outfit',
        color: Palette.text,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalActionBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    cancelBtn: {
        marginRight: 8,
        backgroundColor: '#F1F5F9',
    },
    saveBtn: {
        marginLeft: 8,
        backgroundColor: Palette.primary,
    },
    cancelBtnText: {
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
    },
    saveBtnText: {
        fontFamily: 'Outfit-Bold',
        color: 'white',
    },
    noteIndicatorContainer: {
        position: 'absolute',
        top: 4,
        right: 4,
    },
    hasNote: {
        // Option to style cells with notes differently
    }
});
