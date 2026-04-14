import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { useFarm } from '@/context/FarmContext';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { format, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Stack } from 'expo-router';
import CalendarModal from '@/components/CalendarModal';
import { FilterModal, FilterState } from '@/components/FilterModal';
import { GeneralExpense } from '@/types/farm';

const DEFAULT_CATEGORIES = ['Personal', 'Family', 'Travel', 'Food', 'Medical'];

export default function GeneralExpensesScreen() {
    const { 
        generalExpenses, 
        addGeneralExpense, 
        updateGeneralExpense, 
        deleteGeneralExpense,
        customEntities,
        addCustomEntity
    } = useFarm();

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<GeneralExpense | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [showNewCatModal, setShowNewCatModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');

    // Filtering
    const [filterState, setFilterState] = useState<FilterState>({
        type: 'Both',
        categories: [],
        dateFilter: 'This Month', // Default to current month
        customDate: null,
    });
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
    const [date, setDate] = useState(new Date());
    const [note, setNote] = useState('');

    const dynamicCategories = useMemo(() => {
        const custom = customEntities
            .filter(e => e.entityType === 'general_category')
            .map(e => e.name);
        return [...new Set([...DEFAULT_CATEGORIES, ...custom])];
    }, [customEntities]);

    // Filtering Logic
    const filteredExpenses = useMemo(() => {
        return generalExpenses.filter(item => {
            const d = new Date(item.date);
            const today = new Date();

            // Date filtering
            let dateMatch = true;
            if (filterState.dateFilter === 'This Week') {
                dateMatch = isWithinInterval(d, { start: startOfWeek(today), end: endOfWeek(today) });
            } else if (filterState.dateFilter === 'This Month') {
                dateMatch = isWithinInterval(d, { start: startOfMonth(today), end: endOfMonth(today) });
            } else if (filterState.dateFilter === 'Last Month') {
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                dateMatch = isWithinInterval(d, { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) });
            } else if (filterState.dateFilter === 'Custom Date' && filterState.customDate) {
                dateMatch = d.toDateString() === filterState.customDate.toDateString();
            }

            if (!dateMatch) return false;

            // Category filtering
            if (filterState.categories.length > 0) {
                if (!filterState.categories.includes(item.category)) return false;
            }

            return true;
        });
    }, [generalExpenses, filterState]);

    const totalFilteredAmount = useMemo(() => {
        return filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    }, [filteredExpenses]);

    // Grouping for Timeline View
    const groupedExpenses = useMemo(() => {
        const grouped = filteredExpenses.reduce((acc: any, t) => {
            const dateStr = new Date(t.date).toDateString();
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(t);
            return acc;
        }, {});

        return Object.keys(grouped)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map(dateKey => ({
                date: dateKey,
                data: grouped[dateKey]
            }));
    }, [filteredExpenses]);

    const handleOpenModal = (item?: GeneralExpense) => {
        if (item) {
            setEditingItem(item);
            setTitle(item.title);
            setAmount(item.amount.toString());
            setCategory(item.category);
            setDate(new Date(item.date));
            setNote(item.note || '');
        } else {
            setEditingItem(null);
            setTitle('');
            setAmount('');
            setCategory(dynamicCategories[0]);
            setDate(new Date());
            setNote('');
        }
        setIsModalVisible(true);
    };

    const handleSave = async () => {
        if (!title.trim() || !amount || isNaN(parseFloat(amount))) {
            Alert.alert("Error", "Please enter a valid title and amount.");
            return;
        }

        setIsSubmitting(true);
        try {
            const newItem: GeneralExpense = {
                id: editingItem?.id || Date.now().toString(),
                title: title.trim(),
                amount: parseFloat(amount),
                date: date.toISOString(),
                category,
                note: note.trim() || undefined
            };

            if (editingItem) {
                await updateGeneralExpense(newItem);
            } else {
                await addGeneralExpense(newItem);
            }
            setIsModalVisible(false);
        } catch (e) {
            Alert.alert("Error", "Failed to save entry.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        try {
            await addCustomEntity('general_category', newCatName.trim());
            setCategory(newCatName.trim());
            setNewCatName('');
            setShowNewCatModal(false);
        } catch (e) {
            Alert.alert("Error", "Failed to add category.");
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Entry",
            "Are you sure you want to delete this expense?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteGeneralExpense(id) }
            ]
        );
    };

    const activeFilterCount = (filterState.dateFilter !== 'All Time' ? 1 : 0) + (filterState.categories.length > 0 ? 1 : 0);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                title: 'General Ledger', 
                headerShadowVisible: false,
                headerStyle: { backgroundColor: Palette.background }
            }} />
            
            <View style={styles.headerSection}>
                <Text style={styles.summaryLabel}>
                    {filterState.dateFilter === 'This Month' ? 'Expense (This Month)' : 
                     filterState.dateFilter === 'This Week' ? 'Expense (This Week)' :
                     filterState.dateFilter === 'Last Month' ? 'Expense (Last Month)' : 'Total Expenses'}
                </Text>
                <View style={styles.amountDisplay}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <Text style={styles.totalVal}>{totalFilteredAmount.toLocaleString()}</Text>
                </View>

                {/* Filter Trigger Button */}
                <Pressable style={styles.filterBar} onPress={() => setShowFilterModal(true)}>
                    <Ionicons name="filter-outline" size={18} color={Palette.primary} />
                    <Text style={styles.filterBarText}>
                        {filterState.dateFilter} {filterState.categories.length > 0 ? `• ${filterState.categories.length} Categories` : ''}
                    </Text>
                    {activeFilterCount > 0 && (
                        <View style={styles.filterDot} />
                    )}
                    <Ionicons name="chevron-down" size={14} color={Palette.textSecondary} style={{ marginLeft: 'auto' }} />
                </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
                {groupedExpenses.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="wallet-outline" size={48} color={Palette.border} />
                        <Text style={styles.emptyText}>No records found for the selected period.</Text>
                    </View>
                ) : (
                    groupedExpenses.map((group) => (
                        <View key={group.date} style={styles.timelineGroup}>
                            <View style={styles.timelineHeader}>
                                <View style={styles.timelineDot} />
                                <Text style={styles.timelineDate}>
                                    {format(new Date(group.date), 'EEEE, MMM dd, yyyy')}
                                </Text>
                            </View>
                            <View style={styles.timelineContent}>
                                {group.data.map((item: GeneralExpense) => (
                                    <Pressable 
                                        key={item.id} 
                                        style={styles.historyCard}
                                        onPress={() => handleOpenModal(item)}
                                    >
                                        <View style={styles.historyCardLeft}>
                                            <View style={[styles.historyIconBox, { backgroundColor: Palette.primary + '10' }]}>
                                                <Ionicons 
                                                    name={item.category === 'Food' ? 'fast-food' : item.category === 'Travel' ? 'airplane' : 'receipt-outline'} 
                                                    size={18} 
                                                    color={Palette.primary} 
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={styles.historyCategory}>{item.category}</Text>
                                                    {item.note && (
                                                        <Text style={styles.noteIndicator} numberOfLines={1}> • {item.note}</Text>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.historyCardRight}>
                                            <Text style={styles.historyAmount}>-₹{item.amount.toLocaleString()}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteBtnSmall}>
                                                    <Ionicons name="trash-outline" size={14} color={Palette.danger} />
                                                </Pressable>
                                            </View>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {!isModalVisible && (
                <Pressable 
                    style={styles.fab} 
                    onPress={() => handleOpenModal()}
                >
                    <Ionicons name="add" size={32} color="white" />
                </Pressable>
            )}

            {/* Premium Entry Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
                    <View style={styles.modalScrollWrap}>
                        <View style={styles.formCard}>
                            <View style={styles.formHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>{editingItem ? 'Edit Entry' : 'New Expense'}</Text>
                                    <Text style={styles.modalSubtitle}>Enter details below</Text>
                                </View>
                                <Pressable style={styles.closeBtnSmall} onPress={() => setIsModalVisible(false)}>
                                    <Ionicons name="close" size={20} color={Palette.text} />
                                </Pressable>
                            </View>

                            <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <View style={styles.bigAmountBox}>
                                    <Text style={styles.bigCurrencySymbol}>₹</Text>
                                    <TextInput
                                        style={styles.bigAmountInput}
                                        placeholder="0"
                                        placeholderTextColor={Palette.textSecondary + '40'}
                                        value={amount}
                                        onChangeText={setAmount}
                                        keyboardType="numeric"
                                        autoFocus
                                        selectTextOnFocus
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Title / Purpose</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="create-outline" size={20} color={Palette.textSecondary} style={styles.fieldIcon} />
                                        <TextInput style={styles.input} placeholder="e.g. Rent, Grocery" value={title} onChangeText={setTitle} />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}>
                                        <Text style={styles.label}>Category</Text>
                                        <Pressable onPress={() => setShowNewCatModal(true)}>
                                            <Text style={styles.addCatText}>+ New</Text>
                                        </Pressable>
                                    </View>
                                    <View style={styles.chipGrid}>
                                        {dynamicCategories.map(cat => (
                                            <Pressable key={cat} style={[styles.chip, category === cat && styles.chipActive]} onPress={() => setCategory(cat)}>
                                                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Date</Text>
                                    <Pressable style={styles.dateSelector} onPress={() => setShowCalendar(true)}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="calendar-outline" size={20} color={Palette.primary} style={styles.fieldIcon} />
                                            <Text style={styles.dateVal}>{format(date, 'MMM dd, yyyy')}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={Palette.border} />
                                    </Pressable>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Notes (Optional)</Text>
                                    <View style={[styles.inputWrapper, { alignItems: 'flex-start' }]}>
                                        <Ionicons name="document-text-outline" size={20} color={Palette.textSecondary} style={[styles.fieldIcon, { marginTop: 16 }]} />
                                        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline placeholder="Details..." value={note} onChangeText={setNote} />
                                    </View>
                                </View>

                                <Pressable style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]} onPress={handleSave} disabled={isSubmitting}>
                                    <Text style={styles.saveBtnText}>{isSubmitting ? 'Saving...' : 'Save Record'}</Text>
                                </Pressable>
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Simple Inline Category Modal */}
            <Modal visible={showNewCatModal} transparent animationType="fade">
                <View style={styles.catModalOverlay}>
                    <View style={styles.catModalContent}>
                        <Text style={styles.catModalTitle}>New Category</Text>
                        <TextInput style={styles.catInput} placeholder="Category Name" autoFocus value={newCatName} onChangeText={setNewCatName} />
                        <View style={styles.catActions}>
                            <Pressable style={styles.catBtnCancel} onPress={() => setShowNewCatModal(false)}>
                                <Text style={styles.catBtnCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.catBtnConfirm} onPress={handleAddCategory}>
                                <Text style={styles.catBtnConfirmText}>Add</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <FilterModal 
                visible={showFilterModal} 
                onClose={() => setShowFilterModal(false)} 
                onApply={setFilterState} 
                initialFilters={filterState} 
                availableCategories={dynamicCategories} 
                hideType={true}
            />

            <CalendarModal visible={showCalendar} initialDate={date} onClose={() => setShowCalendar(false)} onSelectDate={setDate} maximumDate={new Date()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Palette.background },
    headerSection: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20 },
    summaryLabel: { fontFamily: 'Outfit-Medium', fontSize: 13, color: Palette.textSecondary, marginBottom: 4 },
    amountDisplay: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    currencySymbol: { fontSize: 22, fontFamily: 'Outfit-Bold', color: Palette.text, marginRight: 4 },
    totalVal: { fontSize: 38, fontFamily: 'Outfit-Bold', color: Palette.text },
    
    // Filter Bar
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Palette.border,
        width: '100%',
        maxWidth: 320,
    },
    filterBarText: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: Palette.text,
        marginLeft: 10,
    },
    filterDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Palette.primary,
        marginLeft: 6,
    },

    // Timeline View (Matching Plot History)
    timelineGroup: { marginBottom: 20 },
    timelineHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Palette.primary,
        marginRight: 12,
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    timelineDate: { fontFamily: 'Outfit-Bold', fontSize: 15, color: Palette.text },
    timelineContent: {
        borderLeftWidth: 2,
        borderLeftColor: Palette.border,
        marginLeft: 4,
        paddingLeft: 18,
    },

    // History Cards
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    historyCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    historyIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyTitle: { fontFamily: 'Outfit-Bold', fontSize: 15, color: Palette.text },
    historyCategory: { fontFamily: 'Outfit', fontSize: 12, color: Palette.textSecondary, marginTop: 1 },
    noteIndicator: { fontFamily: 'Outfit', fontSize: 12, color: Palette.textSecondary, marginTop: 1, flex: 1 },
    historyCardRight: { alignItems: 'flex-end' },
    historyAmount: { fontFamily: 'Outfit-Bold', fontSize: 15, color: Palette.danger },
    deleteBtnSmall: { marginTop: 6, padding: 4 },

    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Palette.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalScrollWrap: { flex: 1, justifyContent: 'flex-end' },
    bigAmountBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: Palette.border },
    bigCurrencySymbol: { fontSize: 28, fontFamily: 'Outfit-Bold', color: Palette.primary, marginRight: 8 },
    bigAmountInput: { fontSize: 44, fontFamily: 'Outfit-Bold', color: Palette.text, minWidth: 120, textAlign: 'center' },
    closeBtnSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: Palette.background, justifyContent: 'center', alignItems: 'center' },
    formCard: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 24, maxHeight: '92%' },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
    modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: Palette.text },
    modalSubtitle: { fontSize: 12, fontFamily: 'Outfit', color: Palette.textSecondary, marginTop: 2 },
    formBody: { paddingHorizontal: 24 },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: Palette.text, marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.background, borderRadius: 16, borderWidth: 1, borderColor: Palette.border },
    fieldIcon: { paddingLeft: 16, paddingRight: 8 },
    input: { flex: 1, padding: 16, paddingLeft: 0, fontSize: 16, fontFamily: 'Outfit', color: Palette.text },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    addCatText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: Palette.primary },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: Palette.border, backgroundColor: 'white' },
    chipActive: { backgroundColor: Palette.primary, borderColor: Palette.primary },
    chipText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: Palette.text },
    chipTextActive: { color: 'white' },
    dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Palette.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Palette.border },
    dateVal: { fontSize: 16, fontFamily: 'Outfit', color: Palette.text },
    saveBtn: { backgroundColor: Palette.primary, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: 'white', fontSize: 18, fontFamily: 'Outfit-Bold' },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontFamily: 'Outfit', color: Palette.textSecondary, marginTop: 12, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
    catModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    catModalContent: { backgroundColor: 'white', width: '100%', borderRadius: 20, padding: 24 },
    catModalTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, marginBottom: 16, textAlign: 'center' },
    catInput: { backgroundColor: Palette.background, borderRadius: 12, padding: 14, fontSize: 16, fontFamily: 'Outfit', marginBottom: 20 },
    catActions: { flexDirection: 'row', gap: 12 },
    catBtnCancel: { flex: 1, padding: 14, alignItems: 'center' },
    catBtnCancelText: { fontFamily: 'Outfit-Bold', color: Palette.textSecondary },
    catBtnConfirm: { flex: 1, backgroundColor: Palette.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
    catBtnConfirmText: { color: 'white', fontFamily: 'Outfit-Bold' }
});
