import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, ScrollView, Platform, KeyboardAvoidingView, Alert, ActivityIndicator } from 'react-native';
import { useFarm } from '@/context/FarmContext';
import { useAuth } from '@/context/AuthContext';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, parseISO, isWithinInterval, startOfDay, endOfDay, isToday } from 'date-fns';
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
    const [searchQuery, setSearchQuery] = useState('');

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
                time: format(timeValue, 'HH:mm'), // Database stays 24h for sorting/logic
                amount: parseFloat(amount),
                note: note,
            };
            if (editingItem) await updateRainRecord(record);
            else await addRainRecord(record);
            setModalVisible(false);
        } catch (e) {
            Alert.alert("Error", "Failed to save record");
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
        } catch (e) {
            Alert.alert("Error", "Failed to delete record");
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
        if (searchQuery) {
            filtered = filtered.filter(r => r.note?.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        const sorted = [...filtered].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });

        let total = 0;
        const withTotals = sorted.map(r => {
            total += r.amount;
            // Convert storage time (24h) to display time (12h)
            const [h, m] = r.time.split(':').map(Number);
            const t = new Date(); t.setHours(h, m);
            return { ...r, cumulativeTotal: total, displayTime: format(t, 'hh:mm a') };
        });

        return withTotals.reverse();
    }, [rainRecords, filterType, startDate, endDate, searchQuery]);

    const stats = useMemo(() => {
        const total = processedData.reduce((acc, curr) => acc + curr.amount, 0);
        const lastRecord = processedData[0];
        const todayRain = processedData.filter(r => isToday(parseISO(r.date))).reduce((acc, curr) => acc + curr.amount, 0);
        return { total, lastRecord, todayRain };
    }, [processedData]);

    const handlePDF = async (mode: 'share' | 'download') => {
        if (!Print || !Sharing) {
            Alert.alert("Libraries Missing", "Please run 'npx expo install expo-print expo-sharing' to enable this feature.");
            return;
        }

        const userName = user?.user_metadata?.full_name || user?.email || 'Farmer';
        const tableRows = [...processedData].reverse().map((r, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${format(parseISO(r.date), 'dd MMM yyyy')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${r.displayTime}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #2563eb; font-weight: bold;">${r.amount} mm</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-style: italic;">${r.note || '-'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 800; color: #1e293b;">${r.cumulativeTotal.toFixed(1)} mm</td>
            </tr>
        `).join('');

        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                        .header { flex-direction: row; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo-text { font-size: 32px; font-weight: 900; color: #2563eb; letter-spacing: -1px; }
                        .report-info { text-align: right; }
                        .report-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0; }
                        .user-name { font-size: 14px; color: #64748b; margin-top: 4px; }
                        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                        .summary-card { background-color: #f1f5f9; padding: 15px; border-radius: 12px; text-align: center; }
                        table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
                        th { background-color: #2563eb; color: white; text-align: left; padding: 15px 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo-text">FarmEzy</div>
                        <div class="report-info">
                            <h2 class="report-title">Rainfall Ledger</h2>
                            <p class="user-name">Prepared for: <b>${userName}</b></p>
                        </div>
                    </div>
                    <div class="summary-grid">
                        <div class="summary-card"><b>Total Rainfall:</b><br/>${stats.total.toFixed(1)} mm</div>
                        <div class="summary-card"><b>Period:</b><br/>${filterType === 'all' ? 'All Time' : `${format(startDate, 'dd MMM')} - ${format(endDate, 'dd MMM')}`}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th style="text-align: right;">Amount</th>
                                <th>Notes</th>
                                <th style="text-align: right;">Cumulative</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            Alert.alert("Error", "Failed to generate PDF");
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.headerCard}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerLabel}>Total Rainfall</Text>
                        <Text style={styles.headerValue}>{stats.total.toFixed(1)} <Text style={styles.headerUnit}>mm</Text></Text>
                    </View>
                    <Pressable style={styles.headerIconBtn} onPress={() => handlePDF('share')}>
                        <Ionicons name="cloud-download-outline" size={24} color="white" />
                    </Pressable>
                </View>
                <View style={styles.headerStats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Last 24h</Text>
                        <Text style={styles.statVal}>{stats.todayRain.toFixed(1)} mm</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Last Record</Text>
                        <Text style={styles.statVal}>{stats.lastRecord ? format(parseISO(stats.lastRecord.date), 'dd MMM') : 'N/A'}</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.searchFilterContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color={Palette.textSecondary} />
                    <TextInput style={styles.searchInput} placeholder="Search records..." value={searchQuery} onChangeText={setSearchQuery} />
                </View>
                <View style={styles.filterStrip}>
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
                    <Pressable style={styles.rangeBtn} onPress={() => setSelectingRange('start')}>
                        <Text style={styles.rangeBtnLabel}>From: {format(startDate, 'dd MMM')}</Text>
                    </Pressable>
                    <Pressable style={styles.rangeBtn} onPress={() => setSelectingRange('end')}>
                        <Text style={styles.rangeBtnLabel}>To: {format(endDate, 'dd MMM')}</Text>
                    </Pressable>
                </View>
            )}

            <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 1 }]}>Date & Time</Text>
                    <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>Amt</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Total</Text>
                    <View style={{ width: 30 }} />
                </View>
                <FlatList
                    data={processedData}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <Pressable style={styles.tr} onPress={() => { resetForm(item); setModalVisible(true); }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.trDate}>{format(parseISO(item.date), 'dd MMM yy')}</Text>
                                <Text style={styles.trTime}>{item.displayTime}</Text>
                            </View>
                            <Text style={[styles.trAmt, { flex: 0.8, textAlign: 'right' }]}>{item.amount} mm</Text>
                            <Text style={[styles.trTotal, { flex: 1, textAlign: 'right' }]}>{item.cumulativeTotal.toFixed(1)} mm</Text>
                            <View style={{ width: 30, alignItems: 'center' }}><Ionicons name="chevron-forward" size={16} color={Palette.border} /></View>
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
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>{editingItem ? 'Edit Rain Record' : 'Log Rainfall'}</Text>
                            <Pressable onPress={() => setModalVisible(false)} disabled={saving}><Ionicons name="close" size={28} color={Palette.text} /></Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputRow}>
                                <Pressable style={styles.inputField} onPress={() => setShowCalendar(true)} disabled={saving}>
                                    <Text style={styles.label}>Date</Text>
                                    <Text style={styles.inputValue}>{format(date, 'dd MMM yyyy')}</Text>
                                </Pressable>
                                <Pressable style={[styles.inputField, { marginLeft: 12 }]} onPress={() => setShowTimePicker(true)} disabled={saving}>
                                    <Text style={styles.label}>Time (12h)</Text>
                                    <Text style={styles.inputValue}>{format(timeValue, 'hh:mm a')}</Text>
                                </Pressable>
                            </View>
                            {showTimePicker && <DateTimePicker value={timeValue} mode="time" is24Hour={false} display={Platform.OS === 'ios' ? 'spinner' : 'clock'} onChange={(e, t) => { setShowTimePicker(false); if (t) setTimeValue(t); }} />}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Amount (mm)</Text>
                                <TextInput style={styles.textInput} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.0" editable={!saving} />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput style={[styles.textInput, { height: 100 }]} value={note} onChangeText={setNote} placeholder="Any observations..." multiline editable={!saving} />
                            </View>
                            
                            <Pressable 
                                style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>{editingItem ? 'Update Record' : 'Save Record'}</Text>}
                            </Pressable>
                            
                            {editingItem && (
                                <Pressable 
                                    style={styles.deleteBtn} 
                                    onPress={handleDelete}
                                    disabled={saving}
                                >
                                    {saving ? <ActivityIndicator color="#ef4444" /> : <Text style={styles.deleteBtnText}>Delete Record</Text>}
                                </Pressable>
                            )}
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
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Outfit' },
    statVal: { fontSize: 16, color: 'white', fontFamily: 'Outfit-Bold', marginTop: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
    searchFilterContainer: { paddingHorizontal: 20, marginTop: -20, zIndex: 10 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 16, height: 56, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    searchInput: { flex: 1, marginLeft: 12, fontFamily: 'Outfit', fontSize: 16 },
    filterStrip: { flexDirection: 'row', paddingVertical: 16, gap: 10, justifyContent: 'center' },
    filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' },
    filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    filterChipText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#64748b' },
    filterChipTextActive: { color: 'white' },
    rangeOptions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 },
    rangeBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' },
    rangeBtnLabel: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#2563eb' },
    tableCard: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 20 },
    tableHeader: { flexDirection: 'row', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    th: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#94a3b8', textTransform: 'uppercase' },
    tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    trDate: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#1e293b' },
    trTime: { fontSize: 11, fontFamily: 'Outfit', color: '#64748b' },
    trAmt: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#2563eb' },
    trTotal: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1e293b' },
    fab: { position: 'absolute', bottom: 30, right: 30, width: 70, height: 70, borderRadius: 35, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', elevation: 8 },
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
