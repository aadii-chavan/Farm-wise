import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, ScrollView, Platform, KeyboardAvoidingView, Alert, ActivityIndicator } from 'react-native';
import { useFarm } from '@/context/FarmContext';
import { useAuth } from '@/context/AuthContext';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import CalendarModal from '@/components/CalendarModal';
import { RainRecord } from '@/types/farm';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

let Print: any;
let Sharing: any;
try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
} catch (e) {}

export default function RainMeterScreen() {
    const { rainRecords, addRainRecord, updateRainRecord, deleteRainRecord } = useFarm();
    const { user } = useAuth();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<RainRecord | null>(null);
    const [saving, setSaving] = useState(false);
    
    // Filtering state
    const [filterType, setFilterType] = useState<'range' | 'all'>('all');
    const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [selectingRange, setSelectingRange] = useState<'start' | 'end' | null>(null);

    // Form state
    const [date, setDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [timeValue, setTimeValue] = useState(new Date());
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const resetForm = (item?: RainRecord) => {
        if (item) {
            setEditingItem(item);
            setDate(parseISO(item.date));
            const [h, m] = item.time.split(':').map(Number);
            const t = new Date(); t.setHours(h, m);
            setTimeValue(t);
            setAmount(item.amount.toString());
            setNote(item.note || '');
        } else {
            setEditingItem(null);
            setDate(new Date());
            setTimeValue(new Date());
            setAmount('');
            setNote('');
        }
    };

    const handleSave = async () => {
        if (!amount || isNaN(parseFloat(amount)) || saving) return;
        setSaving(true);
        try {
            const record: RainRecord = {
                id: editingItem?.id || '',
                date: format(date, 'yyyy-MM-dd'),
                time: format(timeValue, 'HH:mm'),
                amount: parseFloat(amount),
                note: note,
            };
            if (editingItem) await updateRainRecord(record);
            else await addRainRecord(record);
            setModalVisible(false);
        } catch (e) {
            Alert.alert("Error", "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingItem || saving) return;
        setSaving(true);
        try {
            await deleteRainRecord(editingItem.id);
            setModalVisible(false);
        } finally {
            setSaving(false);
        }
    };

    const processedData = useMemo(() => {
        let filtered = rainRecords;
        if (filterType === 'range') {
            filtered = filtered.filter(r => {
                const d = parseISO(r.date);
                return isWithinInterval(d, { start: startOfDay(startDate), end: endOfDay(endDate) });
            });
        }

        const sorted = [...filtered].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });

        let total = 0;
        const withTotals = sorted.map(r => {
            total += r.amount;
            const [h, m] = r.time.split(':').map(Number);
            const t = new Date(); t.setHours(h, m);
            return { ...r, cumulativeTotal: total, displayTime: format(t, 'hh:mm a') };
        });

        return withTotals.reverse();
    }, [rainRecords, filterType, startDate, endDate]);

    const stats = useMemo(() => {
        const total = processedData.reduce((acc, curr) => acc + curr.amount, 0);
        const lastRecord = processedData[0];
        // Count distinct days with rain records
        const distinctDays = new Set(processedData.map(r => r.date)).size;
        return { total, lastRecord, distinctDays };
    }, [processedData]);

    const handlePDF = async () => {
        if (!Print || !Sharing) {
            Alert.alert("Error", "PDF libraries not available");
            return;
        }
        const userName = user?.user_metadata?.full_name || user?.email || 'Farmer';
        const tableRows = [...processedData].reverse().map((r, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? 'white' : '#f8fafc'};">
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${format(parseISO(r.date), 'dd MMM yyyy')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${r.displayTime}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #2563eb;">${r.amount} mm</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${r.note || '-'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${r.cumulativeTotal.toFixed(1)} mm</td>
            </tr>
        `).join('');

        const html = `<html><body style="font-family: Arial; padding: 40px;">
            <h1 style="color: #2563eb;">FarmEzy Rainfall Report</h1>
            <p>Prepared for: ${userName}</p>
            <div style="display: flex; gap: 20px; margin: 20px 0;">
                <div style="background: #f1f5f9; padding: 15px; border-radius: 10px; flex: 1;">Total: ${stats.total.toFixed(1)} mm</div>
                <div style="background: #f1f5f9; padding: 15px; border-radius: 10px; flex: 1;">Rainy Days: ${stats.distinctDays}</div>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #2563eb; color: white;">
                    <tr><th>Date</th><th>Time</th><th style="text-align: center;">Amt</th><th>Note</th><th style="text-align: right;">Total</th></tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </body></html>`;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri);
        } catch (e) { Alert.alert("Error", "PDF generation failed"); }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.headerCard}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerLabel}>Total Rainfall</Text>
                        <Text style={styles.headerValue}>{stats.total.toFixed(1)} <Text style={styles.headerUnit}>mm</Text></Text>
                    </View>
                    <Pressable style={styles.headerIconBtn} onPress={handlePDF}>
                        <Ionicons name="cloud-download-outline" size={24} color="white" />
                    </Pressable>
                </View>
                <View style={styles.headerStats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Rainfall Days</Text>
                        <Text style={styles.statVal}>{stats.distinctDays} Days</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Last Record</Text>
                        <Text style={styles.statVal}>{stats.lastRecord ? format(parseISO(stats.lastRecord.date), 'dd MMM') : 'N/A'}</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.filterSection}>
                <View style={styles.filterRow}>
                    <Pressable style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]} onPress={() => setFilterType('all')}>
                        <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>All Time</Text>
                    </Pressable>
                    <Pressable style={[styles.filterChip, filterType === 'range' && styles.filterChipActive]} onPress={() => setFilterType('range')}>
                        <Ionicons name="calendar-outline" size={14} color={filterType === 'range' ? 'white' : Palette.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={[styles.filterChipText, filterType === 'range' && styles.filterChipTextActive]}>Custom Range</Text>
                    </Pressable>
                </View>
            </View>

            {filterType === 'range' && (
                <View style={styles.rangeOptions}>
                    <Pressable style={styles.rangeBtn} onPress={() => setSelectingRange('start')}><Text style={styles.rangeBtnLabel}>From: {format(startDate, 'dd MMM')}</Text></Pressable>
                    <Pressable style={styles.rangeBtn} onPress={() => setSelectingRange('end')}><Text style={styles.rangeBtnLabel}>To: {format(endDate, 'dd MMM')}</Text></Pressable>
                </View>
            )}

            <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 1 }]}>Date & Time</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Amt</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Total</Text>
                    <View style={{ width: 20 }} />
                </View>
                <FlatList
                    data={processedData}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <Pressable style={styles.tr} onPress={() => { resetForm(item); setModalVisible(true); }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.trDate}>{format(parseISO(item.date), 'dd MMM yy')}</Text>
                                <Text style={styles.trTime}>{item.displayTime}</Text>
                                {item.note && <Text style={styles.trNote} numberOfLines={1}>{item.note}</Text>}
                            </View>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={styles.trAmt}>{item.amount} mm</Text>
                            </View>
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={styles.trTotal}>{item.cumulativeTotal.toFixed(1)} mm</Text>
                            </View>
                            <View style={{ width: 20, alignItems: 'flex-end', justifyContent: 'center' }}>
                                <Ionicons name="chevron-forward" size={14} color={Palette.border} />
                            </View>
                        </Pressable>
                    )}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No records found</Text></View>}
                />
            </View>

            <Pressable style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
                <Ionicons name="add" size={32} color="white" />
            </Pressable>

            {/* Modals */}
            <CalendarModal visible={selectingRange === 'start'} initialDate={startDate} onClose={() => setSelectingRange(null)} onSelectDate={(d) => { setStartDate(d); setSelectingRange(null); }} maximumDate={endDate} />
            <CalendarModal visible={selectingRange === 'end'} initialDate={endDate} onClose={() => setSelectingRange(null)} onSelectDate={(d) => { setEndDate(d); setSelectingRange(null); }} minimumDate={startDate} maximumDate={new Date()} />
            
            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>{editingItem ? 'Edit Entry' : 'Log Rainfall'}</Text><Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} color={Palette.text} /></Pressable></View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputRow}>
                                <Pressable style={styles.inputField} onPress={() => setShowCalendar(true)}><Text style={styles.label}>Date</Text><Text style={styles.inputValue}>{format(date, 'dd MMM yyyy')}</Text></Pressable>
                                <Pressable style={[styles.inputField, { marginLeft: 12 }]} onPress={() => setShowTimePicker(true)}><Text style={styles.label}>Time</Text><Text style={styles.inputValue}>{format(timeValue, 'hh:mm a')}</Text></Pressable>
                            </View>
                            {showTimePicker && <DateTimePicker value={timeValue} mode="time" is24Hour={false} display={Platform.OS === 'ios' ? 'spinner' : 'clock'} onChange={(e, t) => { setShowTimePicker(false); if (t) setTimeValue(t); }} />}
                            <View style={styles.formGroup}><Text style={styles.label}>Amount (mm)</Text><TextInput style={styles.textInput} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.0" editable={!saving} /></View>
                            <View style={styles.formGroup}><Text style={styles.label}>Description</Text><TextInput style={[styles.textInput, { height: 100 }]} value={note} onChangeText={setNote} placeholder="Any observations..." multiline editable={!saving} /></View>
                            <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Record</Text>}</Pressable>
                            {editingItem && <Pressable style={styles.deleteBtn} onPress={handleDelete} disabled={saving}>{saving ? <ActivityIndicator color="#ef4444" /> : <Text style={styles.deleteBtnText}>Delete Record</Text>}</Pressable>}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            <CalendarModal visible={showCalendar} initialDate={date} onClose={() => setShowCalendar(false)} onSelectDate={(d) => { setDate(d); setShowCalendar(false); }} maximumDate={new Date()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    headerCard: { padding: 24, paddingBottom: 32, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Outfit-Medium', textTransform: 'uppercase', letterSpacing: 1 },
    headerValue: { fontSize: 40, color: 'white', fontFamily: 'Outfit-Bold' },
    headerUnit: { fontSize: 20, fontFamily: 'Outfit-Medium' },
    headerIconBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 16 },
    statItem: { flex: 1.2, alignItems: 'center' },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Outfit' },
    statVal: { fontSize: 16, color: 'white', fontFamily: 'Outfit-Bold', marginTop: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
    filterSection: { paddingHorizontal: 20, marginTop: 24 },
    filterRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
    filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    filterChipText: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#64748b' },
    filterChipTextActive: { color: 'white' },
    rangeOptions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 16 },
    rangeBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' },
    rangeBtnLabel: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#2563eb' },
    tableCard: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 20, marginTop: 20 },
    tableHeader: { flexDirection: 'row', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    th: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
    tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    trDate: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1e293b' },
    trTime: { fontSize: 11, fontFamily: 'Outfit', color: '#64748b' },
    trNote: { fontSize: 11, fontFamily: 'Outfit', color: '#94a3b8', fontStyle: 'italic', marginTop: 2 },
    trAmt: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#2563eb' },
    trTotal: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1e293b' },
    fab: { position: 'absolute', bottom: 30, right: 30, width: 72, height: 72, borderRadius: 36, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '90%' },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontFamily: 'Outfit-Bold' },
    inputRow: { flexDirection: 'row', marginBottom: 20 },
    inputField: { flex: 1, backgroundColor: '#f8fafc', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    label: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    inputValue: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1e293b' },
    formGroup: { marginBottom: 20 },
    textInput: { backgroundColor: '#f8fafc', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', fontFamily: 'Outfit', fontSize: 16 },
    saveBtn: { backgroundColor: '#2563eb', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: 'white', fontFamily: 'Outfit-Bold', fontSize: 18 },
    deleteBtn: { padding: 20, alignItems: 'center' },
    deleteBtnText: { color: '#ef4444', fontFamily: 'Outfit-Bold' },
    empty: { marginTop: 100, alignItems: 'center' },
    emptyText: { fontFamily: 'Outfit-Medium', color: '#94a3b8' }
});
