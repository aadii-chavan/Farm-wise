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
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={Palette.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Attendance Log</Text>
                    <View style={{ width: 40 }} />
                </View>

                <TouchableOpacity 
                    style={styles.dateSelector}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Ionicons name="calendar-outline" size={18} color={Palette.primary} />
                    <Text style={styles.dateText}>{format(selectedDate, 'MMMM d, yyyy')}</Text>
                    <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: Palette.success }]}>{stats.present}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.halfDay}</Text>
                    <Text style={styles.statLabel}>Half Day</Text>
                </View>
                <View style={styles.statCard}>
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
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: 'white',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    dateText: {
        flex: 1,
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
        color: '#1e293b',
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 24,
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
    },
    statLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 4,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
        marginBottom: 16,
    },
    attendanceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    workerInfo: {
        flex: 1,
    },
    workerName: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: '#1e293b',
    },
    workerType: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: '#94A3B8',
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
        fontFamily: 'Outfit-Medium',
        color: '#94A3B8',
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
