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
            Alert.alert("Libraries Missing", "Please run 'npx expo install expo-print expo-sharing' to enable this feature.");
            return;
        }

        const userName = user?.user_metadata?.full_name || user?.email || 'Farmer';
        const tableRows = [...processedData].reverse().map((r, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${format(parseISO(r.date), 'dd MMM yyyy')}</td>
                <td style="padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">${r.displayTime}</td>
                <td style="padding: 14px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #2563eb; font-weight: 700; font-size: 14px;">${r.amount} mm</td>
                <td style="padding: 14px 12px; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 12px;">${r.note || '-'}</td>
                <td style="padding: 14px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 800; color: #1e293b; font-size: 14px;">${r.cumulativeTotal.toFixed(1)} mm</td>
            </tr>
        `).join('');

        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #2563eb; padding-bottom: 25px; margin-bottom: 35px; }
                        .logo-container { flex: 1; }
                        .logo-text { font-size: 38px; font-weight: 900; color: #2563eb; letter-spacing: -1.5px; margin: 0; }
                        .logo-sub { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; margin-top: -5px; }
                        .report-meta { text-align: right; flex: 1; }
                        .report-title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                        .user-info { font-size: 15px; color: #475569; margin-top: 8px; }
                        
                        .stats-grid { display: flex; gap: 20px; margin-bottom: 35px; }
                        .stat-card { flex: 1; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; }
                        .stat-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
                        .stat-value { font-size: 24px; font-weight: 900; color: #2563eb; }
                        
                        .table-container { border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                        table { width: 100%; border-collapse: collapse; background: white; }
                        th { background-color: #2563eb; color: white; text-align: left; padding: 16px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
                        
                        .footer { margin-top: 60px; padding-top: 30px; border-top: 2px solid #f1f5f9; text-align: center; }
                        .footer-brand { font-size: 18px; font-weight: 800; color: #2563eb; margin-bottom: 5px; }
                        .footer-tagline { font-size: 13px; color: #64748b; font-weight: 500; }
                        .disclaimer { font-size: 11px; color: #94a3b8; margin-top: 20px; font-style: italic; max-width: 80%; margin-left: auto; margin-right: auto; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo-container">
                            <h1 class="logo-text">FarmEzy</h1>
                            <p class="logo-sub">Smart Agriculture</p>
                        </div>
                        <div class="report-meta">
                            <h2 class="report-title">Rainfall Ledger</h2>
                            <div class="user-info">Prepared for: <b>${userName}</b></div>
                            <div style="font-size: 12px; color: #94a3b8; margin-top: 5px;">Period: ${filterType === 'all' ? 'All Records' : `${format(startDate, 'dd MMM')} - ${format(endDate, 'dd MMM yyyy')}`}</div>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Total Volume</div>
                            <div class="stat-value">${stats.total.toFixed(1)} <small style="font-size: 14px;">mm</small></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Rainy Days</div>
                            <div class="stat-value">${stats.distinctDays}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Last Rainfall</div>
                            <div class="stat-value" style="font-size: 18px;">${stats.lastRecord ? format(parseISO(stats.lastRecord.date), 'dd MMM yyyy') : 'N/A'}</div>
                        </div>
                    </div>

                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th style="text-align: center;">Amt (mm)</th>
                                    <th>Observations</th>
                                    <th style="text-align: right;">Cumulative</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>

                    <div class="footer">
                        <div class="footer-brand">FarmEzy</div>
                        <div class="footer-tagline">Your Digital Partner in Modern Agriculture</div>
                        <p class="disclaimer">
                            This Rainfall Ledger is a system-generated document based on data provided by the user. 
                            It is intended for agricultural planning and historical reference. FarmEzy is not liable for 
                            any discrepancies in manual data entry.
                        </p>
                        <p style="font-size: 10px; color: #cbd5e1; margin-top: 15px;">Generated on: ${format(new Date(), 'dd MMMM yyyy, hh:mm a')}</p>
                    </div>
                </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share FarmEzy Rain Report' });
        } catch (e) { Alert.alert("Error", "Failed to generate PDF"); }
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
