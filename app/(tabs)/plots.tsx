import { PlotCard } from '@/components/PlotCard';
import { Text } from '@/components/Themed';
import { CATEGORY_COLORS, CATEGORY_ICONS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/Categories';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Category, Plot, TransactionType } from '@/types/farm';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View
} from 'react-native';

export default function PlotsScreen() {
  const { plots, transactions, addPlot, deletePlot, addTransaction, inventory } = useFarm();
  
  // Plot Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [cropType, setCropType] = useState('');

  // Quick Transaction Modal State
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [txType, setTxType] = useState<TransactionType>('Expense');
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState<string | null>(null);
  const [txCustomCategory, setTxCustomCategory] = useState('');
  const [txIsOtherCategory, setTxIsOtherCategory] = useState(false);
  const [txNote, setTxNote] = useState('');
  
  // Inventory Link State
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');

  const onSavePlot = async () => {
    if (!name || !area || !cropType) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    const newPlot = {
      id: Date.now().toString(),
      name,
      area: parseFloat(area),
      cropType,
    };

    await addPlot(newPlot);
    setName('');
    setArea('');
    setCropType('');
    setModalVisible(false);
  };

  const onSaveTransaction = async () => {
    const finalCategory = txIsOtherCategory ? txCustomCategory : txCategory;

    if (!txTitle || !txAmount || !finalCategory || !selectedPlot) {
      Alert.alert('Missing Fields', 'Please fill in Title, Amount, and Category.');
      return;
    }

    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    const newTransaction = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      title: txTitle,
      type: txType,
      amount: amountNum,
      category: finalCategory,
      date: new Date().toISOString(),
      plotId: selectedPlot.id,
      inventoryItemId: inventoryItemId || undefined,
      quantity: quantity ? parseFloat(quantity) : undefined,
      note: txNote,
    };

    await addTransaction(newTransaction as any);
    
    // Reset and Close
    setTxTitle('');
    setTxAmount('');
    setTxCategory(null);
    setTxCustomCategory('');
    setTxIsOtherCategory(false);
    setTxNote('');
    setInventoryItemId(null);
    setQuantity('');
    setTxModalVisible(false);
    
    Alert.alert('Success', `Recorded ${txType} for ${selectedPlot.name}`);
  };

  const calculateStats = (plotId: string) => {
    const plotTransactions = transactions.filter(t => t.plotId === plotId);
    const income = plotTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const expense = plotTransactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense };
  };

  const openQuickTx = (plot: Plot) => {
    setSelectedPlot(plot);
    setTxType('Expense');
    setTxModalVisible(true);
  };

  const categories = txType === 'Expense' ? [...EXPENSE_CATEGORIES, 'Other'] : [...INCOME_CATEGORIES];

  const selectTxCategory = (cat: string) => {
    if (cat === 'Other') {
        setTxIsOtherCategory(true);
        setTxCategory('Other');
    } else {
        setTxIsOtherCategory(false);
        setTxCategory(cat);
    }
    // Clean up inventory selection if category changes
    setInventoryItemId(null);
    setQuantity('');
  };

  const handleInventorySelect = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    if (inventoryItemId === itemId) {
        setInventoryItemId(null);
        setQuantity('');
    } else {
        setInventoryItemId(itemId);
        // If we select an inventory item, auto-fill the title if empty
        if (!txTitle || txTitle.startsWith('Applied ')) {
            setTxTitle(`Applied ${item.name}`);
        }
        // If it has a price and we already have a quantity, update the amount
        if (item.pricePerUnit && quantity) {
            const qty = parseFloat(quantity);
            if (!isNaN(qty)) {
                setTxAmount((qty * item.pricePerUnit).toString());
            }
        }
    }
  };

  const onQuantityChange = (text: string) => {
    setQuantity(text);
    const item = inventory.find(i => i.id === inventoryItemId);
    const qty = parseFloat(text);
    if (item && item.pricePerUnit && !isNaN(qty)) {
        // Auto calculate amount based on inventory price
        const total = qty * item.pricePerUnit;
        setTxAmount(total.toString());
    } else if (text === '') {
        setTxAmount('');
    }
  };

  const matchingInventoryItems = inventory.filter(i => {
      const finalCategory = txIsOtherCategory ? txCustomCategory : txCategory;
      return i.category === finalCategory;
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={plots}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlotCard 
            plot={item} 
            stats={calculateStats(item.id)}
            onAddTransaction={() => openQuickTx(item)}
            onDelete={() => {
                Alert.alert("Delete Plot", `Are you sure you want to delete ${item.name}?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deletePlot(item.id) }
                ]);
            }}
          />
        )}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="map-outline" size={64} color={Palette.textSecondary + '40'} />
                <Text style={styles.emptyText}>No plots added yet.</Text>
                <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
                    <Text style={styles.addBtnText}>Add Your First Plot</Text>
                </Pressable>
            </View>
        }
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="white" />
      </Pressable>

      {/* Add Plot Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add New Plot</Text>
                
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Plot Name</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g., North Field" 
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Area (Acres)</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g., 5" 
                        value={area}
                        onChangeText={setArea}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Crop Type</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g., Wheat" 
                        value={cropType}
                        onChangeText={setCropType}
                    />
                </View>

                <View style={styles.modalButtons}>
                    <Pressable style={[styles.btn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[styles.btn, styles.saveBtn]} onPress={onSavePlot}>
                        <Text style={styles.saveBtnText}>Save Plot</Text>
                    </Pressable>
                </View>
            </View>
        </View>
      </Modal>

      {/* Quick Transaction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={txModalVisible}
        onRequestClose={() => setTxModalVisible(false)}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
        >
            <View style={[styles.modalContent, { maxHeight: '95%' }]}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Update {selectedPlot?.name}</Text>
                    <Pressable onPress={() => setTxModalVisible(false)}>
                        <Ionicons name="close" size={24} color={Palette.textSecondary} />
                    </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Type Toggle */}
                    <View style={styles.typeToggle}>
                        <Pressable 
                            onPress={() => { setTxType('Expense'); setTxCategory(null); }}
                            style={[styles.typeBtn, txType === 'Expense' && styles.typeBtnActiveExpense]}
                        >
                            <Text style={[styles.typeBtnText, txType === 'Expense' && styles.typeBtnTextActive]}>Expense</Text>
                        </Pressable>
                        <Pressable 
                            onPress={() => { setTxType('Income'); setTxCategory(null); }}
                            style={[styles.typeBtn, txType === 'Income' && styles.typeBtnActiveIncome]}
                        >
                            <Text style={[styles.typeBtnText, txType === 'Income' && styles.typeBtnTextActive]}>Income</Text>
                        </Pressable>
                    </View>

                    <View style={styles.amountContainer}>
                        <Text style={styles.currencySymbol}>₹</Text>
                        <TextInput 
                            style={styles.amountInput} 
                            placeholder="0" 
                            placeholderTextColor={Palette.textSecondary + '40'}
                            value={txAmount}
                            onChangeText={setTxAmount}
                            keyboardType="numeric"
                        />
                    </View>
                    <Text style={[styles.hintText, { textAlign: 'center', marginBottom: 20 }]}>Total amount for this entry</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category</Text>
                        <View style={styles.chipContainer}>
                            {categories.map((cat) => (
                                <Pressable
                                    key={cat}
                                    style={[
                                        styles.chip,
                                        txCategory === cat && { backgroundColor: CATEGORY_COLORS[cat as Category] || Palette.primary, borderColor: CATEGORY_COLORS[cat as Category] || Palette.primary }
                                    ]}
                                    onPress={() => selectTxCategory(cat)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons 
                                            name={(CATEGORY_ICONS[cat as Category] as any) || 'apps'} 
                                            size={14} 
                                            color={txCategory === cat ? 'white' : (CATEGORY_COLORS[cat as Category] || Palette.primary)}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={[styles.chipText, { color: txCategory === cat ? 'white' : Palette.text }]}>
                                            {cat}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {txIsOtherCategory && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Custom Category Name</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="e.g., Water, Irrigation" 
                                value={txCustomCategory}
                                onChangeText={setTxCustomCategory}
                            />
                        </View>
                    )}

                    {/* Inventory Link Section - Enhanced for all relevant categories */}
                    {txType === 'Expense' && matchingInventoryItems.length > 0 && (
                        <View style={styles.inventorySection}>
                            <Text style={styles.label}>Link to {txIsOtherCategory ? txCustomCategory : txCategory} Inventory</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                                {matchingInventoryItems.map(item => (
                                    <Pressable 
                                        key={item.id} 
                                        onPress={() => handleInventorySelect(item.id)}
                                        style={[styles.chip, inventoryItemId === item.id && styles.chipActive]}
                                    >
                                        <Text style={[styles.chipText, { color: inventoryItemId === item.id ? 'white' : Palette.text }]}>
                                            {item.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            {inventoryItemId && (
                                <View style={[styles.inputGroup, { marginTop: 12 }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.label}>Quantity Applied ({inventory.find(i => i.id === inventoryItemId)?.unit})</Text>
                                        {inventory.find(i => i.id === inventoryItemId)?.pricePerUnit && (
                                            <Text style={styles.infoText}>₹{inventory.find(i => i.id === inventoryItemId)?.pricePerUnit}/{inventory.find(i => i.id === inventoryItemId)?.unit}</Text>
                                        )}
                                    </View>
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="Enter amount used" 
                                        value={quantity}
                                        onChangeText={onQuantityChange}
                                        keyboardType="numeric"
                                    />
                                    <Text style={styles.hintText}>System will auto-calculate cost and deduct stock.</Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Entry Title</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g., Applying Urea" 
                            value={txTitle}
                            onChangeText={setTxTitle}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Notes (Optional)</Text>
                        <TextInput 
                            style={[styles.input, { height: 60, textAlignVertical: 'top' }]} 
                            placeholder="Add details..." 
                            value={txNote}
                            onChangeText={setTxNote}
                            multiline
                        />
                    </View>

                    <View style={styles.modalButtons}>
                        <Pressable style={[styles.btn, styles.saveBtn, { backgroundColor: txType === 'Income' ? Palette.success : Palette.primary }]} onPress={onSaveTransaction}>
                            <Text style={styles.saveBtnText}>Record {txType}</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 100,
  },
  emptyText: {
      fontSize: 16,
      color: Palette.textSecondary,
      fontFamily: 'Outfit-Medium',
      marginTop: 16,
  },
  addBtn: {
      marginTop: 20,
      backgroundColor: Palette.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
  },
  addBtnText: {
      color: 'white',
      fontFamily: 'Outfit-Bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: Palette.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
  },
  modalContent: {
      backgroundColor: 'white',
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 24,
      paddingBottom: 40,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
  },
  modalTitle: {
      fontSize: 22,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
  },
  inputGroup: {
      marginBottom: 16,
  },
  label: {
      fontSize: 14,
      fontFamily: 'Outfit-SemiBold',
      color: Palette.text,
      marginBottom: 8,
  },
  input: {
      backgroundColor: Palette.background,
      borderRadius: 16,
      padding: 14,
      fontFamily: 'Outfit',
      borderWidth: 1,
      borderColor: Palette.border,
      color: Palette.text,
  },
  amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
  },
  currencySymbol: {
      fontSize: 28,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
      marginRight: 4,
  },
  amountInput: {
      fontSize: 36,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
      textAlign: 'center',
      minWidth: 100,
  },
  modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
  },
  btn: {
      flex: 1,
      padding: 18,
      borderRadius: 16,
      alignItems: 'center',
  },
  cancelBtn: {
      backgroundColor: Palette.background,
  },
  cancelBtnText: {
      color: Palette.textSecondary,
      fontFamily: 'Outfit-Bold',
  },
  saveBtn: {
      backgroundColor: Palette.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
  },
  saveBtnText: {
      color: 'white',
      fontSize: 16,
      fontFamily: 'Outfit-Bold',
  },
  typeToggle: {
      flexDirection: 'row',
      backgroundColor: Palette.background,
      borderRadius: 14,
      padding: 4,
      borderWidth: 1,
      borderColor: Palette.border,
      marginBottom: 24,
  },
  typeBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 11,
  },
  typeBtnActiveExpense: {
      backgroundColor: Palette.primary,
  },
  typeBtnActiveIncome: {
      backgroundColor: Palette.success,
  },
  typeBtnText: {
      fontFamily: 'Outfit-Bold',
      color: Palette.textSecondary,
  },
  typeBtnTextActive: {
      color: 'white',
  },
  chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
  },
  chipScroll: {
      flexDirection: 'row',
      marginHorizontal: -4,
  },
  chip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Palette.border,
      backgroundColor: 'white',
      marginRight: 8,
  },
  chipActive: {
      backgroundColor: Palette.primary,
      borderColor: Palette.primary,
  },
  chipText: {
      fontSize: 13,
      fontFamily: 'Outfit-Medium',
      color: Palette.text,
  },
  chipTextActive: {
      color: 'white',
  },
  inventorySection: {
      marginBottom: 20,
      padding: 16,
      backgroundColor: Palette.primaryLight + '10',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Palette.primaryLight + '30',
  },
  hintText: {
      fontSize: 11,
      color: Palette.textSecondary,
      fontFamily: 'Outfit',
      marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: Palette.primary,
    fontFamily: 'Outfit-Bold',
  }
});
