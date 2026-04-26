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

    const stats = useMemo(() => {
        if (workers.length === 0 || days.length === 0) return { avg: 0, present: 0, payout: 0 };
        
        let totalPresentDays = 0;
        let totalWages = 0;
        
        workers.forEach(worker => {
            const workerPresent = days.reduce((acc, d) => {
                const r = getAttendance(worker.id, d);
                if (r?.status === 'Present') return acc + 1;
                if (r?.status === 'Half-Day') return acc + 0.5;
                return acc;
            }, 0);
            
            totalPresentDays += workerPresent;
            
            if (sheetType === 'Daily') {
                totalWages += workerPresent * (worker.baseWage || 0);
            } else {
                // For annual, we might show total deductions or just keep it 0
                const totalAbsent = days.reduce((acc, d) => {
                    const r = getAttendance(worker.id, d);
                    if (r?.status === 'Absent') return acc + 1;
                    if (r?.status === 'Half-Day') return acc + 0.5;
                    return acc;
                }, 0);
                totalWages += totalAbsent * ((worker.baseWage || 0) / 365);
            }
        });

        const avgAttendance = (totalPresentDays / (workers.length * days.length)) * 100;
        
        return { 
            avg: Math.round(avgAttendance), 
            present: totalPresentDays, 
            payout: Math.round(totalWages) 
        };
    }, [workers, days, localAttendance, sheetType]);

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
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>{sheetType} Attendance</Text>
                        <Text style={styles.headerSubtitle}>
                            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
                        </Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => setShowRangePresets(true)} 
                        style={styles.rangeToggle}
                    >
                        <Ionicons name="calendar-outline" size={20} color={Palette.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.scrollPadding}>
                    {/* Stats Grid - Matching Ledger Style */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Avg Attendance</Text>
                            <Text style={styles.statValue}>{stats.avg}%</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Present Count</Text>
                            <Text style={[styles.statValue, { color: Palette.success }]}>{stats.present}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>{sheetType === 'Daily' ? 'Est. Payout' : 'Est. Cut'}</Text>
                            <Text style={[styles.statValue, { color: sheetType === 'Daily' ? Palette.primary : Palette.danger }]}>₹{stats.payout.toLocaleString()}</Text>
                        </View>
                    </View>

                    {/* Custom Range Selector - Always Visible for User Friendliness */}
                    <View style={styles.mainRangeSelector}>
                        <TouchableOpacity 
                            style={styles.mainDateBtn} 
                            onPress={() => setShowStartPicker(true)}
                        >
                            <View style={styles.dateBtnIcon}>
                                <Ionicons name="calendar-outline" size={14} color={Palette.primary} />
                            </View>
                            <View>
                                <Text style={styles.mainDateLabel}>START DATE</Text>
                                <Text style={styles.mainDateValue}>{format(startDate, 'dd MMM, yyyy')}</Text>
                            </View>
                        </TouchableOpacity>
                        
                        <View style={styles.rangeConnector}>
                            <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
                        </View>

                        <TouchableOpacity 
                            style={styles.mainDateBtn} 
                            onPress={() => setShowEndPicker(true)}
                        >
                            <View style={styles.dateBtnIcon}>
                                <Ionicons name="calendar-outline" size={14} color={Palette.primary} />
                            </View>
                            <View>
                                <Text style={styles.mainDateLabel}>END DATE</Text>
                                <Text style={styles.mainDateValue}>{format(endDate, 'dd MMM, yyyy')}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Range Navigation Controls */}
                    <View style={styles.rangeNavControls}>
                        <TouchableOpacity onPress={() => navigateCycle('prev')} style={styles.cycleBtn}>
                            <Ionicons name="chevron-back" size={16} color={Palette.primary} />
                            <Text style={styles.cycleBtnText}>Previous Period</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigateCycle('next')} style={styles.cycleBtn}>
                            <Text style={styles.cycleBtnText}>Next Period</Text>
                            <Ionicons name="chevron-forward" size={16} color={Palette.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Main Attendance Grid */}
                    <View style={styles.gridWrapper}>
                        <View style={styles.flexRow}>
                            
                            {/* FIXED COLUMN (Names) */}
                            <View style={styles.fixedColumn}>
                                <View style={[styles.row, styles.headerRow]}>
                                    <View style={styles.nameHeader}>
                                        <Text style={styles.headerText}>Staff</Text>
                                    </View>
                                </View>
                                {workers.length === 0 ? (
                                    <View style={styles.nameCell}>
                                        <Text style={styles.emptyText}>No staff found</Text>
                                    </View>
                                ) : (
                                    workers.map(worker => {
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
                                                            <View style={styles.advBadge}>
                                                                <Text style={styles.advBadgeText}>ADV</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={styles.workerSub}>₹{worker.baseWage}/{sheetType === 'Daily' ? 'd' : 'y'}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })
                                )}
                            </View>

                            {/* SCROLLABLE GRID */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
                                <View>
                                    <View style={[styles.row, styles.headerRow]}>
                                        {days.map(day => (
                                            <View key={day.toISOString()} style={styles.dayHeader}>
                                                <Text style={styles.dayNum}>{format(day, 'd')}</Text>
                                                <Text style={styles.dayName}>{format(day, 'EEEEE')}</Text>
                                            </View>
                                        ))}
                                        <View style={styles.totalHeader}>
                                            <Text style={styles.headerText}>Total</Text>
                                        </View>
                                        <View style={[styles.totalHeader, { width: 70 }]}>
                                            <Text style={styles.headerText}>Action</Text>
                                        </View>
                                    </View>

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

                                        const workerTransactions = laborTransactions.filter(t => t.workerId === worker.id);
                                        const startStr = format(startDate, 'yyyy-MM-dd');
                                        const endStr = format(endDate, 'yyyy-MM-dd');

                                        const periodPayments = workerTransactions.filter(t => 
                                            t.date >= startStr && t.date <= endStr && t.type === 'Weekly Settle'
                                        ).reduce((acc, t) => acc + t.amount, 0);

                                        const wageRepayments = workerTransactions.filter(t => 
                                            t.date >= startStr && t.date <= endStr && 
                                            t.type === 'Advance Repayment' && t.repaymentMethod === 'Wage Income'
                                        ).reduce((acc, t) => acc + t.amount, 0);

                                        const periodDeductions = workerTransactions.filter(t => 
                                            t.date >= startStr && t.date <= endStr && t.type === 'Salary Deduction'
                                        ).reduce((acc, t) => acc + t.amount, 0);

                                        const netPayout = sheetType === 'Daily' 
                                            ? Math.round(grossWages - periodPayments - wageRepayments)
                                            : Math.round(grossWages - periodDeductions);

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
                                                    style={[styles.totalCell, { width: 70 }]}
                                                    onPress={() => setPayingWorker({ worker, amount: Math.round(netPayout) })}
                                                >
                                                    <View style={[styles.payActionBtn, { backgroundColor: netPayout > 0 ? Palette.primary : '#F1F5F9' }]}>
                                                        <Text style={[styles.payActionText, { color: netPayout > 0 ? 'white' : '#94A3B8' }]}>
                                                            ₹{Math.abs(Math.round(netPayout))}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    </View>

                    {/* Legend */}
                    <View style={styles.legend}>
                        <View style={styles.legendRow}>
                            <View style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: Palette.success }]} />
                                <Text style={styles.legendText}>P: Present</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                                <Text style={styles.legendText}>H: Half Day</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: Palette.danger }]} />
                                <Text style={styles.legendText}>A: Absent</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

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

                        <TouchableOpacity style={styles.presetBtn} onPress={() => setCycleRange('thisMonth')}>
                            <Ionicons name="calendar-clear-outline" size={20} color={Palette.primary} />
                            <Text style={styles.presetBtnText}>Full Month</Text>
                        </TouchableOpacity>

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
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: 'white',
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
    },
    titleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: '#94A3B8',
        marginTop: 2,
    },
    rangeToggle: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
    },
    scrollPadding: {
        paddingTop: 20,
        paddingBottom: 40,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 70,
    },
    statLabel: {
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
        textAlign: 'center',
    },
    statValue: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    rangeNavControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 12,
    },
    cycleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    cycleBtnText: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
    gridWrapper: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F1F5F9',
    },
    flexRow: {
        flexDirection: 'row',
    },
    fixedColumn: {
        backgroundColor: 'white',
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
    },
    headerRow: {
        backgroundColor: '#F8FAFC',
        height: 44,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    contentRow: {
        height: 54,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    nameHeader: {
        width: 110,
        paddingHorizontal: 12,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#E2E8F0',
    },
    nameCell: {
        width: 110,
        paddingHorizontal: 12,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#F1F5F9',
        backgroundColor: 'white',
    },
    headerText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dayHeader: {
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#F1F5F9',
    },
    dayNum: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    dayName: {
        fontSize: 9,
        color: '#94A3B8',
        fontFamily: 'Outfit-Medium',
        textTransform: 'uppercase',
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
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
    },
    totalHeader: {
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
    },
    totalCell: {
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
    },
    totalText: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    workerName: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    workerSub: {
        fontSize: 9,
        color: '#94A3B8',
        fontFamily: 'Outfit-Medium',
        marginTop: 2,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    advBadge: {
        backgroundColor: Palette.danger + '10',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        marginLeft: 4,
    },
    advBadgeText: {
        fontSize: 7,
        fontFamily: 'Outfit-Bold',
        color: Palette.danger,
    },
    payActionBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 50,
        alignItems: 'center',
    },
    payActionText: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
    },
    legend: {
        padding: 20,
        backgroundColor: '#F8FAFC',
        marginTop: 20,
        marginHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: '#64748B',
    },
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
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    modalSub: {
        fontSize: 13,
        color: '#94A3B8',
        fontFamily: 'Outfit-Medium',
        marginTop: 2,
    },
    pickerContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '90%',
        alignSelf: 'center',
    },
    pickerTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
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
        gap: 12,
    },
    presetBtnText: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    pickerHint: {
        fontSize: 12,
        color: '#94A3B8',
        fontFamily: 'Outfit-Medium',
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
        fontSize: 14,
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
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    summaryDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 12,
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
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
    },
    activeTypeTextSmall: {
        color: Palette.primary,
    },
    paymentSummary: {
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    currencyPrefix: {
        fontSize: 28,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
        marginRight: 4,
    },
    paymentAmountInput: {
        fontSize: 28,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
        minWidth: 80,
        textAlign: 'center',
    },
    paymentPeriod: {
        fontSize: 11,
        color: '#94A3B8',
        fontFamily: 'Outfit-Medium',
        marginTop: 4,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    modalNoteInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        height: 80,
        textAlignVertical: 'top',
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: '#1e293b',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    paySubmitBtn: {
        flexDirection: 'row',
        backgroundColor: Palette.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    paySubmitText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 15,
    },
    statusOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 8,
    },
    statusBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
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
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: '#64748B',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalActionBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#F1F5F9',
    },
    saveBtn: {
        backgroundColor: Palette.primary,
    },
    cancelBtnText: {
        fontFamily: 'Outfit-Bold',
        color: '#64748B',
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
    repaymentMethodSection: {
        marginBottom: 20,
    },
    methodToggle: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        padding: 4,
        borderRadius: 10,
        gap: 4,
    },
    methodBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 6,
        gap: 6,
    },
    activeMethodBtn: {
        backgroundColor: Palette.primary,
    },
    methodText: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: '#64748B',
    },
    activeMethodText: {
        color: 'white',
    },
    customRangeSection: {
        marginTop: 12,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    mainRangeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
        gap: 10,
    },
    mainDateBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
    },
    dateBtnIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    mainDateLabel: {
        fontSize: 8,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    mainDateValue: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
        marginTop: 1,
    },
    rangeConnector: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        textAlign: 'center',
    },
    dateSelectorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    dateSelector: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    dateLabel: {
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    dateValue: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
    dateArrow: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 12,
        color: '#94A3B8',
        fontFamily: 'Outfit-Medium',
        fontStyle: 'italic',
    },
});
