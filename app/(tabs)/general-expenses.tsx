import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Pressable, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { useFarm } from '@/context/FarmContext';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Stack, useRouter } from 'expo-router';
import CalendarModal from '@/components/CalendarModal';
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
    const router = useRouter();

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<GeneralExpense | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [showNewCatModal, setShowNewCatModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');

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

    const totalExpenses = useMemo(() => {
        return generalExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    }, [generalExpenses]);

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

    const renderItem = ({ item }: { item: GeneralExpense }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconCircle}>
                        <Ionicons 
                           name={item.category === 'Food' ? 'fast-food' : item.category === 'Medical' ? 'medical' : 'receipt-outline'} 
                           size={20} 
                           color={Palette.primary} 
                        />
                    </View>
                    <View>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemDate}>{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.itemAmount}>₹{item.amount.toLocaleString()}</Text>
                    <View style={styles.actionIcons}>
                        <Pressable onPress={() => handleOpenModal(item)} style={styles.iconBtn}>
                            <Ionicons name="pencil" size={16} color={Palette.textSecondary} />
                        </Pressable>
                        <Pressable onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                            <Ionicons name="trash" size={16} color={Palette.danger} />
                        </Pressable>
                    </View>
                </View>
            </View>
            
            <View style={styles.cardFooter}>
                <View style={[styles.badge, { backgroundColor: Palette.primary + '10' }]}>
                    <Text style={[styles.badgeText, { color: Palette.primary }]}>{item.category}</Text>
                </View>
                {item.note && (
                    <Text style={styles.noteText} numberOfLines={1}>• {item.note}</Text>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                title: 'General Ledger', 
                headerShadowVisible: false,
                headerStyle: { backgroundColor: Palette.background }
            }} />
            
            {/* Summary Statistics - Match App Style */}
            <View style={styles.headerSection}>
                <Text style={styles.summaryLabel}>Total Personal Expenses</Text>
                <View style={styles.amountDisplay}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <Text style={styles.totalVal}>{totalExpenses.toLocaleString()}</Text>
                </View>
            </View>

            <FlatList
                data={generalExpenses}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="wallet-outline" size={48} color={Palette.border} />
                        <Text style={styles.emptyText}>No personal expenses recorded yet.</Text>
                    </View>
                }
            />

            {!isModalVisible && (
                <Pressable 
                    style={styles.fab} 
                    onPress={() => handleOpenModal()}
                >
                    <Ionicons name="add" size={32} color="white" />
                </Pressable>
            )}

            <Modal visible={isModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                    style={styles.modalBackdrop}
                >
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
                                {/* Amount Section - Now inside the card for better visibility */}
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
                                        <TextInput 
                                            style={styles.input} 
                                            placeholder="e.g. Travel, Rent, Grocery" 
                                            value={title}
                                            onChangeText={setTitle}
                                        />
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
                                            <Pressable 
                                                key={cat}
                                                style={[styles.chip, category === cat && styles.chipActive]}
                                                onPress={() => setCategory(cat)}
                                            >
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
                                        <TextInput 
                                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                                            multiline
                                            placeholder="Details..."
                                            value={note}
                                            onChangeText={setNote}
                                        />
                                    </View>
                                </View>

                                <Pressable 
                                    style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]} 
                                    onPress={handleSave}
                                    disabled={isSubmitting}
                                >
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
                        <TextInput 
                            style={styles.catInput}
                            placeholder="Category Name"
                            autoFocus
                            value={newCatName}
                            onChangeText={setNewCatName}
                        />
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

            <CalendarModal 
                visible={showCalendar}
                initialDate={date}
                onClose={() => setShowCalendar(false)}
                onSelectDate={setDate}
                maximumDate={new Date()}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.background,
    },
    headerSection: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    summaryLabel: {
        fontFamily: 'Outfit-Medium',
        fontSize: 14,
        color: Palette.textSecondary,
        marginBottom: 8,
    },
    amountDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencySymbol: {
        fontSize: 24,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        marginRight: 4,
    },
    totalVal: {
        fontSize: 42,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    // Listing Style
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Palette.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemTitle: {
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
        color: Palette.text,
    },
    itemDate: {
        fontFamily: 'Outfit',
        fontSize: 12,
        color: Palette.textSecondary,
        marginTop: 2,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    itemAmount: {
        fontFamily: 'Outfit-Bold',
        fontSize: 18,
        color: Palette.danger,
    },
    actionIcons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    iconBtn: {
        padding: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        marginTop: 16,
        paddingTop: 12,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 8,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        textTransform: 'uppercase',
    },
    noteText: {
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        flex: 1,
    },
    // Form Style
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
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalScrollWrap: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    // Amount Box
    bigAmountBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: Palette.border,
    },
    bigCurrencySymbol: {
        fontSize: 28,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
        marginRight: 8,
    },
    bigAmountInput: {
        fontSize: 44,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        minWidth: 120,
        textAlign: 'center',
    },
    closeBtnSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Palette.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    formCard: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 24,
        maxHeight: '92%',
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    modalSubtitle: {
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 2,
    },
    formBody: {
        paddingHorizontal: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        color: Palette.text,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Palette.border,
    },
    fieldIcon: {
        paddingLeft: 16,
        paddingRight: 8,
    },
    input: {
        flex: 1,
        padding: 16,
        paddingLeft: 0,
        fontSize: 16,
        fontFamily: 'Outfit',
        color: Palette.text,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    addCatText: {
        fontSize: 13,
        fontFamily: 'Outfit-Bold',
        color: Palette.primary,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Palette.border,
        backgroundColor: 'white',
    },
    chipActive: {
        backgroundColor: Palette.primary,
        borderColor: Palette.primary,
    },
    chipText: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: Palette.text,
    },
    chipTextActive: {
        color: 'white',
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Palette.background,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Palette.border,
    },
    dateVal: {
        fontSize: 16,
        fontFamily: 'Outfit',
        color: Palette.text,
    },
    saveBtn: {
        backgroundColor: Palette.primary,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    saveBtnText: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 12,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    // Cat Modal
    catModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    catModalContent: {
        backgroundColor: 'white',
        width: '100%',
        borderRadius: 20,
        padding: 24,
    },
    catModalTitle: {
        fontFamily: 'Outfit-Bold',
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center',
    },
    catInput: {
        backgroundColor: Palette.background,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        fontFamily: 'Outfit',
        marginBottom: 20,
    },
    catActions: {
        flexDirection: 'row',
        gap: 12,
    },
    catBtnCancel: {
        flex: 1,
        padding: 14,
        alignItems: 'center',
    },
    catBtnCancelText: {
        fontFamily: 'Outfit-Bold',
        color: Palette.textSecondary,
    },
    catBtnConfirm: {
        flex: 1,
        backgroundColor: Palette.primary,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    catBtnConfirmText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
    }
});
