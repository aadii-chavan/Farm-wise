import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
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

    // Sync local state with context state
    React.useEffect(() => {
        setLocalAttendance(laborAttendance);
    }, [laborAttendance]);

    const getAttendance = (workerId: string, date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return localAttendance.find(a => a.workerId === workerId && a.date === dateStr);
    };

    const handleCycleStatus = async (workerId: string, date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const currentRecord = getAttendance(workerId, date);
        
        let nextStatus: AttendanceStatus = 'Present';
        if (currentRecord?.status === 'Present') nextStatus = 'Half-Day';
        else if (currentRecord?.status === 'Half-Day') nextStatus = 'Absent';
        else if (currentRecord?.status === 'Absent') nextStatus = 'Present';

        // Optimistic Update
        const newRecord: LaborAttendance = {
            id: currentRecord?.id || '',
            workerId,
            date: dateStr,
            status: nextStatus
        };

        setLocalAttendance(prev => {
            const index = prev.findIndex(a => a.workerId === workerId && a.date === dateStr);
            if (index > -1) {
                const copy = [...prev];
                copy[index] = newRecord;
                return copy;
            }
            return [...prev, newRecord];
        });

        try {
            await saveLaborAttendance([newRecord]);
        } catch (error) {
            setLocalAttendance(laborAttendance);
            Alert.alert('Error', 'Failed to save attendance');
        }
    };

    const renderCell = (workerId: string, date: Date) => {
        const record = getAttendance(workerId, date);
        
        let char = '';
        let color = '#E2E8F0';
        let bg = 'transparent';

        if (record?.status === 'Present') { char = 'P'; color = Palette.success; bg = Palette.success + '15'; }
        else if (record?.status === 'Absent') { char = 'A'; color = Palette.danger; bg = Palette.danger + '15'; }
        else if (record?.status === 'Half-Day') { char = 'H'; color = '#F59E0B'; bg = '#F59E0B' + '15'; }

        return (
            <TouchableOpacity 
                activeOpacity={0.6}
                onLongPress={() => handleCycleStatus(workerId, date)}
                onPress={() => handleCycleStatus(workerId, date)}
                style={[styles.cell, { backgroundColor: bg }]}
                delayPressIn={0}
            >
                <Text style={[styles.cellText, { color }]}>{char || '·'}</Text>
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
                                                    {renderCell(worker.id, day)}
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
    }
});
