import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { Stack, useRouter } from 'expo-router';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { CalendarModal } from '@/components/CalendarModal';

const { width } = Dimensions.get('window');

export default function LaborAttendanceRecordScreen() {
    const router = useRouter();
    const { laborAttendance, laborProfiles } = useFarm();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const dayAttendance = useMemo(() => {
        return laborAttendance.filter(a => a.date === dateStr);
    }, [laborAttendance, dateStr]);

    const stats = useMemo(() => {
        const present = dayAttendance.filter(a => a.status === 'Present').length;
        const halfDay = dayAttendance.filter(a => a.status === 'Half-Day').length;
        const absent = dayAttendance.filter(a => a.status === 'Absent').length;
        return { present, halfDay, absent };
    }, [dayAttendance]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                title: 'Attendance Record',
                headerTitleStyle: { fontFamily: 'Outfit-Bold' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="arrow-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                )
            }} />

            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.dateSelector}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Ionicons name="calendar-outline" size={20} color={Palette.primary} />
                    <Text style={styles.dateText}>{format(selectedDate, 'MMMM d, yyyy')}</Text>
                    <Ionicons name="chevron-down" size={16} color={Palette.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: Palette.success + '10' }]}>
                    <Text style={[styles.statValue, { color: Palette.success }]}>{stats.present}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#F59E0B10' }]}>
                    <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.halfDay}</Text>
                    <Text style={styles.statLabel}>Half Day</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: Palette.danger + '10' }]}>
                    <Text style={[styles.statValue, { color: Palette.danger }]}>{stats.absent}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                <Text style={styles.sectionTitle}>Daily Attendance Log</Text>
                {dayAttendance.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="clipboard-outline" size={48} color={Palette.textSecondary + '40'} />
                        <Text style={styles.emptyText}>No attendance recorded for this day.</Text>
                        <TouchableOpacity 
                            style={styles.markBtn}
                            onPress={() => router.push('/labor-attendance-sheet')}
                        >
                            <Text style={styles.markBtnText}>Mark Attendance</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    dayAttendance.map((record) => {
                        const worker = laborProfiles.find(p => p.id === record.workerId);
                        const statusColor = record.status === 'Present' ? Palette.success : 
                                         record.status === 'Half-Day' ? '#F59E0B' : Palette.danger;
                        
                        return (
                            <View key={record.id} style={styles.attendanceCard}>
                                <View style={styles.workerInfo}>
                                    <Text style={styles.workerName}>{worker?.name || 'Unknown Worker'}</Text>
                                    <Text style={styles.workerType}>{worker?.type || 'Staff'}</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                    <Text style={[styles.statusText, { color: statusColor }]}>{record.status}</Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <CalendarModal 
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                onSelectDate={(date) => {
                    setSelectedDate(date);
                    setShowDatePicker(false);
                }}
                initialDate={selectedDate}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 10,
    },
    dateText: {
        flex: 1,
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
        color: Palette.text,
    },
    statsRow: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
        marginTop: 4,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    attendanceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    workerInfo: {
        flex: 1,
    },
    workerName: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    workerType: {
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    markBtn: {
        backgroundColor: Palette.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    markBtnText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
    },
});
