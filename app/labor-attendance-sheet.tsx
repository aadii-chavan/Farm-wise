import React, { useState, useMemo, useEffect } from 'react';
import { 
    View, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Dimensions, 
    Modal, 
    TextInput, 
    Alert, 
    Platform, 
    KeyboardAvoidingView 
} from 'react-native';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { LaborProfile, LaborAttendance, AttendanceStatus } from '@/types/farm';
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    startOfWeek, 
    endOfWeek, 
    addDays, 
    subDays, 
    isWithinInterval,
    differenceInDays
} from 'date-fns';
import { CalendarModal } from '@/components/CalendarModal';

const { width } = Dimensions.get('window');

export default function AttendanceSheetScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const sheetType = (params.type as string) || 'Daily';
    
    const { 
        laborProfiles, 
        laborAttendance, 
        saveLaborAttendance, 
        laborTransactions, 
        addLaborTransaction 
    } = useFarm();

    const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [endDate, setEndDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [showRangePresets, setShowRangePresets] = useState(false);
    
    const [payingWorker, setPayingWorker] = useState<{ worker: LaborProfile, amount: number } | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [paymentType, setPaymentType] = useState<'Weekly Settle' | 'Advance' | 'Advance Repayment' | 'Annual Installment' | 'Salary Deduction'>('Weekly Settle');
    const [paymentNote, setPaymentNote] = useState('');
    const [repaymentMethod, setRepaymentMethod] = useState<'Cash' | 'Wage Income'>('Cash');
    const [isPaying, setIsPaying] = useState(false);

    const workers = useMemo(() => 
        laborProfiles.filter(p => p.type === sheetType && p.isActive),
    [laborProfiles, sheetType]);

    const days = useMemo(() => 
        eachDayOfInterval({ start: startDate, end: endDate }),
    [startDate, endDate]);

    // Navigation logic
    const navigateCycle = (direction: 'next' | 'prev') => {
        const diff = differenceInDays(endDate, startDate) + 1;
        if (direction === 'next') {
            setStartDate(addDays(startDate, diff));
            setEndDate(addDays(endDate, diff));
        } else {
            setStartDate(subDays(startDate, diff));
            setEndDate(subDays(endDate, diff));
        }
    };

    const [localAttendance, setLocalAttendance] = useState<LaborAttendance[]>([]);
    const [selectedCell, setSelectedCell] = useState<{ worker: LaborProfile, date: Date } | null>(null);
    const [editStatus, setEditStatus] = useState<AttendanceStatus>('Present');
    const [editNote, setEditNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Sync local state with context state
    React.useEffect(() => {
        setLocalAttendance(laborAttendance);
    }, [laborAttendance]);

    // Reset payment type based on sheet type when opening modal
    useEffect(() => {
        if (payingWorker) {
            if (sheetType === 'Annual') {
                setPaymentType('Salary Deduction');
                setEditAmount(String(payingWorker.amount));
            } else {
                setPaymentType('Weekly Settle');
                setEditAmount(String(payingWorker.amount));
            }
        }
    }, [payingWorker, sheetType]);

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

    const advancePending = useMemo(() => {
        if (!payingWorker) return 0;
        const workerTransactions = laborTransactions.filter(t => t.workerId === payingWorker.worker.id);
        const advances = workerTransactions
            .filter(t => (t.type as string) === 'Advance')
            .reduce((acc, t) => acc + t.amount, 0);
        const repayments = workerTransactions
            .filter(t => (t.type as string) === 'Advance Repayment')
            .reduce((acc, t) => acc + t.amount, 0);
        return advances - repayments;
    }, [payingWorker, laborTransactions]);

    const handleSavePayment = async () => {
        if (!payingWorker) return;
        setIsPaying(true);
        try {
            await addLaborTransaction({
                id: '',
                workerId: payingWorker.worker.id,
                amount: editAmount ? parseFloat(editAmount) : (paymentType === 'Weekly Settle' ? payingWorker.amount : 0),
                date: new Date().toISOString().split('T')[0],
                type: paymentType as any,
                repaymentMethod: paymentType === 'Advance Repayment' ? repaymentMethod : undefined,
                note: paymentNote.trim() || `${paymentType === 'Weekly Settle' || paymentType === 'Annual Installment' ? (sheetType === 'Annual' ? 'Salary Installment' : 'Weekly Settle') : paymentType} for period ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
            });
            Alert.alert('Success', 'Transaction recorded successfully');
            setPayingWorker(null);
            setEditAmount('');
            setPaymentNote('');
        } catch (error) {
            Alert.alert('Error', 'Failed to record transaction');
        } finally {
            setIsPaying(false);
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

    const setCycleRange = (type: 'thisWeek' | 'lastWeek' | 'thisMonth') => {
        const today = new Date();
        if (type === 'thisWeek') {
            setStartDate(startOfWeek(today, { weekStartsOn: 1 }));
            setEndDate(endOfWeek(today, { weekStartsOn: 1 }));
        } else if (type === 'lastWeek') {
            const lastWeek = subDays(today, 7);
            setStartDate(startOfWeek(lastWeek, { weekStartsOn: 1 }));
            setEndDate(endOfWeek(lastWeek, { weekStartsOn: 1 }));
        } else if (type === 'thisMonth') {
            setStartDate(startOfMonth(today));
            setEndDate(endOfMonth(today));
        }
        setShowRangePresets(false);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerShown: true, 
                title: `${sheetType} Attendance`,
                headerTitleStyle: { fontFamily: 'Outfit-Bold' },
                headerRight: () => (
                    <TouchableOpacity 
                        onPress={() => setShowRangePresets(true)} 
                        style={styles.rangeSelectBtn}
                    >
                        <Ionicons name="options" size={18} color={Palette.primary} />
                    </TouchableOpacity>
                ),
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="arrow-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                )
            }} />

            {/* Range Indicator & Navigation */}
            <View style={styles.rangeIndicator}>
                <TouchableOpacity onPress={() => navigateCycle('prev')} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={Palette.primary} />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.rangeInfo}
                    onPress={() => setShowRangePresets(true)}
                >
                    <Text style={styles.rangeLabel}>Attendance period</Text>
                    <Text style={styles.rangeDates}>
                        {format(startDate, 'MMM d')} — {format(endDate, 'MMM d')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigateCycle('next')} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color={Palette.primary} />
                </TouchableOpacity>
            </View>

            {/* Custom Range Selection (Alternative to presets) */}
            <View style={styles.customRangeBar}>
                <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.datePickerTrigger}>
                    <Text style={styles.datePickerLabel}>Start</Text>
                    <Text style={styles.datePickerValue}>{format(startDate, 'dd/MM/yy')}</Text>
                </TouchableOpacity>
                <View style={styles.dateLink} />
                <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.datePickerTrigger}>
                    <Text style={styles.datePickerLabel}>End</Text>
                    <Text style={styles.datePickerValue}>{format(endDate, 'dd/MM/yy')}</Text>
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
                                workers.map(worker => {
                                    // Calculate advance pending for the icon
                                    const workerTransactions = laborTransactions.filter(t => t.workerId === worker.id);
                                    const totalAdv = workerTransactions
                                        .filter(t => (t.type as string) === 'Advance')
                                        .reduce((acc, t) => acc + t.amount, 0);
                                    const totalRepay = workerTransactions
                                        .filter(t => (t.type as string) === 'Advance Repayment')
                                        .reduce((acc, t) => acc + t.amount, 0);
                                    const advancePendingAmount = totalAdv - totalRepay;

                                    return (
                                        <View key={worker.id} style={[styles.row, styles.contentRow]}>
                                            <TouchableOpacity 
                                                style={styles.nameCell}
                                                onPress={() => router.push({ pathname: '/worker-detail', params: { id: worker.id } })}
                                            >
                                                <View style={styles.nameRow}>
                                                    <Text style={styles.workerName} numberOfLines={1}>{worker.name}</Text>
                                                    {advancePendingAmount > 0 && (
                                                        <Ionicons name="alert-circle" size={12} color={Palette.danger} style={{ marginLeft: 4 }} />
                                                    )}
                                                </View>
                                                <Text style={styles.workerSub}>Base: ₹{worker.baseWage}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })
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

                                    const grossWages = sheetType === 'Daily' 
                                        ? (totalPresent * (worker.baseWage || 0))
                                        : (totalAbsent * ((worker.baseWage || 0) / 365));

                                    // Transaction adjustments
                                    const workerTransactions = laborTransactions.filter(t => t.workerId === worker.id);
                                    
                                    const periodPayments = workerTransactions.filter(t => {
                                        const tDate = new Date(t.date);
                                        // Simple string comparison for dates often better with Supabase dates
                                        const dateStr = t.date;
                                        const startStr = format(startDate, 'yyyy-MM-dd');
                                        const endStr = format(endDate, 'yyyy-MM-dd');
                                        return dateStr >= startStr && dateStr <= endStr && t.type === 'Weekly Settle';
                                    }).reduce((acc, t) => acc + t.amount, 0);

                                    const wageRepayments = workerTransactions.filter(t => {
                                        const dateStr = t.date;
                                        const startStr = format(startDate, 'yyyy-MM-dd');
                                        const endStr = format(endDate, 'yyyy-MM-dd');
                                        return dateStr >= startStr && dateStr <= endStr && 
                                               t.type === 'Advance Repayment' && t.repaymentMethod === 'Wage Income';
                                    }).reduce((acc, t) => acc + t.amount, 0);

                                    const periodDeductions = workerTransactions.filter(t => {
                                        const dateStr = t.date;
                                        const startStr = format(startDate, 'yyyy-MM-dd');
                                        const endStr = format(endDate, 'yyyy-MM-dd');
                                        return dateStr >= startStr && dateStr <= endStr && t.type === 'Salary Deduction';
                                    }).reduce((acc, t) => acc + t.amount, 0);

                                    const netPayout = sheetType === 'Daily' 
                                        ? Math.round(grossWages - periodPayments - wageRepayments)
                                        : Math.round(grossWages - periodDeductions);

                                    // Total advance for the icon
                                    const totalAdv = workerTransactions
                                        .filter(t => (t.type as string) === 'Advance')
                                        .reduce((acc, t) => acc + t.amount, 0);
                                    const totalRepay = workerTransactions
                                        .filter(t => (t.type as string) === 'Advance Repayment')
                                        .reduce((acc, t) => acc + t.amount, 0);
                                    const workerAdvancePending = totalAdv - totalRepay;

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
                                            <TouchableOpacity 
                                                style={[styles.totalCell, { width: 80 }]}
                                                onPress={() => setPayingWorker({ worker, amount: Math.round(netPayout) })}
                                            >
                                                <Text style={[styles.totalText, { color: sheetType === 'Daily' ? Palette.success : Palette.danger }]}>
                                                    {sheetType === 'Daily' ? '+' : '-'}₹{Math.round(netPayout)}
                                                </Text>
                                                <View style={styles.payIcon}>
                                                    <Ionicons name="card-outline" size={10} color={sheetType === 'Daily' ? Palette.success : Palette.danger} />
                                                </View>
                                            </TouchableOpacity>
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

            {/* Range Presets Modal */}
            <Modal
                visible={showRangePresets}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowRangePresets(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setShowRangePresets(false)}
                >
                    <View style={styles.pickerContent}>
                        <Text style={styles.pickerTitle}>Quick Select</Text>
                        
                        <TouchableOpacity style={styles.presetBtn} onPress={() => setCycleRange('thisWeek')}>
                            <Ionicons name="calendar-outline" size={20} color={Palette.primary} />
                            <Text style={styles.presetBtnText}>This Week (Mon - Sun)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.presetBtn} onPress={() => setCycleRange('lastWeek')}>
                            <Ionicons name="time-outline" size={20} color={Palette.primary} />
                            <Text style={styles.presetBtnText}>Last Week</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.presetBtn} onPress={() => setCycleRange('thisMonth')}>
                            <Ionicons name="calendar-clear-outline" size={20} color={Palette.primary} />
                            <Text style={styles.presetBtnText}>Full Month</Text>
                        </TouchableOpacity>

                        <Text style={styles.pickerHint}>You can also tap the dates at the top to select exact custom days.</Text>
                        
                        <TouchableOpacity 
                            style={styles.pickerCloseBtn}
                            onPress={() => setShowRangePresets(false)}
                        >
                            <Text style={styles.pickerCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Date Pickers */}
            <CalendarModal
                visible={showStartPicker}
                onClose={() => setShowStartPicker(false)}
                onSelectDate={(date) => {
                    setStartDate(date);
                    setShowStartPicker(false);
                }}
                initialDate={startDate}
            />
            <CalendarModal
                visible={showEndPicker}
                onClose={() => setShowEndPicker(false)}
                onSelectDate={(date) => {
                    setEndDate(date);
                    setShowEndPicker(false);
                }}
                initialDate={endDate}
            />

            {/* Payment Modal */}
            <Modal
                visible={!!payingWorker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setPayingWorker(null)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Record Transaction</Text>
                                <Text style={styles.modalSub}>{payingWorker?.worker.name}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setPayingWorker(null)}>
                                <Ionicons name="close" size={24} color={Palette.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.financialSummary}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>{sheetType === 'Annual' ? 'Amount to Cut' : 'Wages Due'}</Text>
                                <Text style={[styles.summaryValue, { color: sheetType === 'Annual' ? Palette.danger : Palette.success }]}>₹{payingWorker?.amount.toLocaleString()}</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Advance Pending</Text>
                                <Text style={[styles.summaryValue, { color: Palette.danger }]}>₹{advancePending.toLocaleString()}</Text>
                            </View>
                        </View>

                        <View style={styles.typeSelectorSmall}>
                            {(sheetType === 'Daily' ? 
                                (['Weekly Settle', 'Advance', 'Advance Repayment'] as const) :
                                (['Annual Installment', 'Salary Deduction'] as const)
                            ).map((t) => (
                                <TouchableOpacity 
                                    key={t}
                                    style={[styles.typeBtnSmall, paymentType === t && styles.activeTypeBtnSmall]}
                                    onPress={() => {
                                        setPaymentType(t);
                                        if (t === 'Salary Deduction' || (t === 'Weekly Settle' && sheetType === 'Daily')) {
                                            setEditAmount(String(payingWorker?.amount || ''));
                                        } else {
                                            setEditAmount('');
                                        }
                                    }}
                                >
                                    <Text style={[styles.typeTextSmall, paymentType === t && styles.activeTypeTextSmall]}>
                                        {t === 'Weekly Settle' ? 'Settle Wages' : 
                                         t === 'Annual Installment' ? 'Payment / Installment' :
                                         t === 'Advance' ? 'Give Advance' : 
                                         t === 'Salary Deduction' ? 'Apply Deduction' : 'Repayment'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.paymentSummary}>
                            <View style={styles.amountInputContainer}>
                                <Text style={styles.currencyPrefix}>₹</Text>
                                <TextInput
                                    style={styles.paymentAmountInput}
                                    value={editAmount}
                                    onChangeText={setEditAmount}
                                    keyboardType="numeric"
                                    placeholder={ (paymentType === 'Salary Deduction' || (paymentType === 'Weekly Settle' && sheetType === 'Daily')) ? String(payingWorker?.amount || '0') : "0"}
                                    placeholderTextColor={Palette.textSecondary + '40'}
                                />
                            </View>
                            <Text style={styles.paymentPeriod}>
                                {paymentType === 'Salary Deduction' ? 'Penalty deduction for absences' :
                                 paymentType === 'Annual Installment' ? 'New payout or installment amount' :
                                 paymentType === 'Weekly Settle' ? `Calculated amount for period` : 
                                 paymentType === 'Advance' ? 'New advance amount to record' : 'Amount being repaid by worker'}
                            </Text>
                        </View>

                        {paymentType === 'Advance Repayment' && (
                            <View style={styles.repaymentMethodSection}>
                                <Text style={styles.inputLabel}>Repayment Method</Text>
                                <View style={styles.methodToggle}>
                                    {(['Cash', 'Wage Income'] as const).map((m) => (
                                        <TouchableOpacity 
                                            key={m}
                                            style={[styles.methodBtn, repaymentMethod === m && styles.activeMethodBtn]}
                                            onPress={() => setRepaymentMethod(m)}
                                        >
                                            <Ionicons 
                                                name={m === 'Cash' ? 'cash-outline' : 'wallet-outline'} 
                                                size={16} 
                                                color={repaymentMethod === m ? 'white' : Palette.textSecondary} 
                                            />
                                            <Text style={[styles.methodText, repaymentMethod === m && styles.activeMethodText]}>
                                                {m === 'Wage Income' ? (sheetType === 'Annual' ? 'Salary Cut' : 'Wage Income') : m}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        <Text style={styles.inputLabel}>Transaction Note</Text>
                        <TextInput
                            style={styles.modalNoteInput}
                            placeholder="Add payment details..."
                            value={paymentNote}
                            onChangeText={setPaymentNote}
                            multiline
                            numberOfLines={2}
                            placeholderTextColor={Palette.textSecondary + '70'}
                        />

                        <TouchableOpacity 
                            style={[styles.paySubmitBtn, isPaying && { opacity: 0.7 }]}
                            onPress={handleSavePayment}
                            disabled={isPaying}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="white" />
                            <Text style={styles.paySubmitText}>
                                {isPaying ? 'Recording...' : `Confirm ${paymentType}`}
                            </Text>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

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
    navBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Palette.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
    customRangeBar: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingBottom: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    datePickerTrigger: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    datePickerLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
        textTransform: 'uppercase',
    },
    datePickerValue: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
        marginTop: 2,
    },
    dateLink: {
        width: 20,
        height: 1,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 10,
    },
    typeSelectorSmall: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        padding: 4,
        borderRadius: 12,
        marginBottom: 20,
    },
    typeBtnSmall: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTypeBtnSmall: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    typeTextSmall: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    activeTypeTextSmall: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    currencyPrefix: {
        fontSize: 32,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        marginRight: 4,
    },
    paymentAmountInput: {
        fontSize: 32,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        minWidth: 100,
        textAlign: 'center',
    },
    rangeIndicator: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    rangeInfo: {
        flex: 1,
    },
    rangeLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    rangeDates: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        marginTop: 2,
    },
    changeRangeBtn: {
        backgroundColor: Palette.primary + '10',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    changeRangeText: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
        fontSize: 12,
    },
    rangeSelectBtn: {
        marginRight: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Palette.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '85%',
        alignSelf: 'center',
    },
    pickerTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    presetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        marginBottom: 12,
    },
    presetBtnText: {
        marginLeft: 12,
        fontSize: 16,
        fontFamily: 'Outfit-Medium',
        color: Palette.text,
    },
    pickerHint: {
        fontSize: 12,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    pickerCloseBtn: {
        alignItems: 'center',
        padding: 12,
    },
    pickerCloseText: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
    },
    paymentSummary: {
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 24,
        borderRadius: 20,
        marginBottom: 20,
    },
    paymentAmount: {
        fontSize: 32,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    paymentPeriod: {
        fontSize: 13,
        color: Palette.textSecondary,
        fontFamily: 'Outfit',
        marginTop: 4,
    },
    paySubmitBtn: {
        flexDirection: 'row',
        backgroundColor: Palette.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    paySubmitText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
        marginLeft: 8,
    },
    payIcon: {
        position: 'absolute',
        bottom: 4,
        right: 4,
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
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    noteIndicatorContainer: {
        position: 'absolute',
        top: 4,
        right: 4,
    },
    hasNote: {
        // Option to style cells with notes differently
    },
    financialSummary: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    summaryDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 12,
    },
    repaymentMethodSection: {
        marginBottom: 20,
    },
    methodToggle: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        padding: 4,
        borderRadius: 12,
    },
    methodBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    activeMethodBtn: {
        backgroundColor: Palette.primary,
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    methodText: {
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    activeMethodText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
    },
});
