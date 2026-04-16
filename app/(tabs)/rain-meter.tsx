import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useFarm } from '@/context/FarmContext';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, addMinutes, parseISO, isBefore, startOfDay, addDays } from 'date-fns';
import CalendarModal from '@/components/CalendarModal';
import { RainRecord } from '@/types/farm';

export default function RainMeterScreen() {
    const { rainRecords, addRainRecord, updateRainRecord, deleteRainRecord } = useFarm();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<RainRecord | null>(null);
    
    // Form state
    const [date, setDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [time, setTime] = useState(format(new Date(), 'HH:mm'));
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const resetForm = (item?: RainRecord) => {
        if (item) {
            setEditingItem(item);
            setDate(parseISO(item.date));
            setTime(item.time);
            setAmount(item.amount.toString());
            setNote(item.note || '');
        } else {
            setEditingItem(null);
            setDate(new Date());
            setTime(format(new Date(), 'HH:mm'));
            setAmount('');
            setNote('');
        }
    };

    const handleSave = async () => {
        if (!amount || isNaN(parseFloat(amount))) return;

        const record: RainRecord = {
            id: editingItem?.id || '',
            date: format(date, 'yyyy-MM-dd'),
            time: time,
            amount: parseFloat(amount),
            note: note,
        };

        if (editingItem) {
            await updateRainRecord(record);
        } else {
            await addRainRecord(record);
        }
        setModalVisible(false);
    };

    // Calculate Rain Day and Cumulative Totals
    const processedData = useMemo(() => {
        // 1. Assign "Rain Day" to each record (8 AM to 8 AM cycle)
        const recordsWithRainDay = rainRecords.map(r => {
            const [hours, minutes] = r.time.split(':').map(Number);
            const recordDate = parseISO(r.date);
            
            // If time is before 8:00 AM, it belongs to the PREVIOUS day's cycle
            let rainDayStr = r.date;
            if (hours < 8) {
                rainDayStr = format(subDays(recordDate, 1), 'yyyy-MM-dd');
            }
            
            return { ...r, rainDay: rainDayStr };
        });

        // 2. Group by Rain Day
        const groups: Record<string, { date: string, amount: number, records: any[] }> = {};
        recordsWithRainDay.forEach(r => {
            if (!groups[r.rainDay]) {
                groups[r.rainDay] = { date: r.rainDay, amount: 0, records: [] };
            }
            groups[r.rainDay].amount += r.amount;
            groups[r.rainDay].records.push(r);
        });

        // 3. Sort by date and calculate cumulative
        const sortedDays = Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
        
        // Cumulative needs to be calculated in ascending order
        const ascendingDays = [...sortedDays].reverse();
        let runningTotal = 0;
        const finalDays = ascendingDays.map(day => {
            runningTotal += day.amount;
            return { ...day, cumulative: runningTotal };
        });

        return finalDays.reverse(); // Newest first for list
    }, [rainRecords]);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.dayCard}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardDate}>{format(parseISO(item.date), 'dd MMM yyyy')}</Text>
                    <Text style={styles.cardCycle}>8 AM to 8 AM Cycle</Text>
                </View>
                <View style={styles.amountBadge}>
                    <Text style={styles.amountText}>{item.amount} mm</Text>
                </View>
            </View>

            <View style={styles.recordsList}>
                {item.records.map((r: RainRecord) => (
                    <Pressable 
                        key={r.id} 
                        style={styles.recordRow}
                        onPress={() => { resetForm(r); setModalVisible(true); }}
                    >
                        <View style={styles.recordLeft}>
                            <Ionicons name="water-outline" size={16} color={Palette.primary} />
                            <Text style={styles.recordTime}>{r.time}</Text>
                            <Text style={styles.recordNote} numberOfLines={1}>{r.note || 'No description'}</Text>
                        </View>
                        <Text style={styles.recordAmount}>{r.amount} mm</Text>
                    </Pressable>
                ))}
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.cumulativeLabel}>Season Cumulative Total</Text>
                <Text style={styles.cumulativeValue}>{item.cumulative.toFixed(1)} mm</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.summaryContainer}>
                <View style={[styles.summaryBox, { backgroundColor: Palette.primary + '10' }]}>
                    <Ionicons name="rainy" size={24} color={Palette.primary} />
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>Total Rainfall</Text>
                        <Text style={styles.summaryVal}>{processedData[0]?.cumulative.toFixed(1) || '0.0'} mm</Text>
                    </View>
                </View>
                <View style={[styles.summaryBox, { backgroundColor: '#F59E0B10' }]}>
                    <Ionicons name="calendar-outline" size={24} color="#F59E0B" />
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>Last Recorded</Text>
                        <Text style={styles.summaryVal}>{processedData[0] ? format(parseISO(processedData[0].date), 'dd MMM') : 'None'}</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={processedData}
                keyExtractor={item => item.date}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="umbrella-outline" size={64} color={Palette.textSecondary + '40'} />
                        <Text style={styles.emptyText}>No rain records found.</Text>
                        <Pressable style={styles.addBtn} onPress={() => { resetForm(); setModalVisible(true); }}>
                            <Text style={styles.addBtnText}>Add Rain Record</Text>
                        </Pressable>
                    </View>
                }
            />

            <Pressable 
                style={styles.fab} 
                onPress={() => { resetForm(); setModalVisible(true); }}
            >
                <Ionicons name="add" size={30} color="white" />
            </Pressable>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingItem ? 'Edit Record' : 'New Rain Entry'}</Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={Palette.text} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Date</Text>
                                <Pressable style={styles.input} onPress={() => setShowCalendar(true)}>
                                    <View style={styles.row}>
                                        <Ionicons name="calendar-outline" size={20} color={Palette.textSecondary} />
                                        <Text style={styles.inputText}>{format(date, 'dd MMM yyyy')}</Text>
                                    </View>
                                </Pressable>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Time</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={time} 
                                    onChangeText={setTime} 
                                    placeholder="HH:mm (e.g. 08:30)" 
                                />
                                <Text style={styles.helperText}>Records after 8:00 AM count for today. Before 8:00 AM count for previous day.</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Rainfall Amount (mm)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={amount} 
                                    onChangeText={setAmount} 
                                    keyboardType="numeric" 
                                    placeholder="Enter mm" 
                                    autoFocus
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Description (Optional)</Text>
                                <TextInput 
                                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                                    value={note} 
                                    onChangeText={setNote} 
                                    placeholder="Observation notes..." 
                                    multiline
                                />
                            </View>

                            <Pressable style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveBtnText}>Save Record</Text>
                            </Pressable>

                            {editingItem && (
                                <Pressable 
                                    style={styles.deleteBtn} 
                                    onPress={() => {
                                        deleteRainRecord(editingItem.id);
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.deleteBtnText}>Delete Record</Text>
                                </Pressable>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <CalendarModal
                visible={showCalendar}
                initialDate={date}
                onClose={() => setShowCalendar(false)}
                onSelectDate={(d) => { setDate(d); setShowCalendar(false); }}
                maximumDate={new Date()}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    summaryContainer: { flexDirection: 'row', padding: 20, gap: 12 },
    summaryBox: { flex: 1, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    summaryContent: { flex: 1 },
    summaryLabel: { fontSize: 11, fontFamily: 'Outfit-Medium', color: Palette.textSecondary, textTransform: 'uppercase' },
    summaryVal: { fontSize: 18, fontFamily: 'Outfit-Bold', color: Palette.text },
    listContent: { padding: 20, paddingBottom: 100 },
    dayCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    cardDate: { fontSize: 17, fontFamily: 'Outfit-Bold', color: Palette.text },
    cardCycle: { fontSize: 12, fontFamily: 'Outfit-Medium', color: Palette.textSecondary, marginTop: 2 },
    amountBadge: { backgroundColor: Palette.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    amountText: { color: Palette.primary, fontFamily: 'Outfit-Bold', fontSize: 15 },
    recordsList: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
    recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    recordLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    recordTime: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: Palette.text },
    recordNote: { fontSize: 13, fontFamily: 'Outfit', color: Palette.textSecondary, flex: 1, marginLeft: 4 },
    recordAmount: { fontSize: 14, fontFamily: 'Outfit-Bold', color: Palette.textSecondary },
    cardFooter: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cumulativeLabel: { fontSize: 12, fontFamily: 'Outfit-Medium', color: Palette.textSecondary },
    cumulativeValue: { fontSize: 16, fontFamily: 'Outfit-Bold', color: Palette.primary },
    fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: Palette.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: Palette.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: Palette.text, marginBottom: 8 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', fontFamily: 'Outfit' },
    inputText: { fontFamily: 'Outfit', color: Palette.text },
    helperText: { fontSize: 11, color: Palette.textSecondary, marginTop: 4, fontFamily: 'Outfit' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    saveBtn: { backgroundColor: Palette.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 12 },
    saveBtnText: { color: 'white', fontFamily: 'Outfit-Bold', fontSize: 16 },
    deleteBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
    deleteBtnText: { color: Palette.danger, fontFamily: 'Outfit-Bold' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { fontSize: 16, color: Palette.textSecondary, fontFamily: 'Outfit-Medium', marginTop: 16 },
    addBtn: { marginTop: 20, backgroundColor: Palette.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    addBtnText: { color: 'white', fontFamily: 'Outfit-Bold' },
});
