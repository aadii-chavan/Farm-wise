import CalendarModal from '@/components/CalendarModal';
import SuccessModal from '@/components/SuccessModal';
import { Text } from '@/components/Themed';
import { CATEGORY_COLORS, CATEGORY_ICONS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/Categories';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Category, TransactionType } from '@/types/farm';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View
} from 'react-native';
import { convertUnit, getSecondaryUnit, InventoryUnit } from '@/utils/conversions';

export default function RecordTransaction() {
  const router = useRouter();
  const { plotId: paramPlotId, editId } = useLocalSearchParams();
  const { addTransaction, updateTransaction, plots, inventory, transactions, customEntities, addCustomEntity } = useFarm();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (paramPlotId && typeof paramPlotId === 'string') {
      setPlotId(paramPlotId);
    }
  }, [paramPlotId]);

  const [type, setType] = useState<TransactionType>('Expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryAmounts, setCategoryAmounts] = useState<Record<string, string>>({});
  const [customCategory, setCustomCategory] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [date, setDate] = useState(new Date());
  const [plotId, setPlotId] = useState<string | null>(null);
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [inputUnit, setInputUnit] = useState<string>('kg');
  const [note, setNote] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSum, setAutoSum] = useState('');

  const categories = React.useMemo(() => {
    const invCats = inventory.map(i => i.category);
    const pastCats = transactions.filter(t => t.type === type).map(t => t.category);
    const storedCustom = customEntities.filter(e => e.entityType === 'category').map(e => e.name);
    
    if (type === 'Expense') {
        const set = new Set([...EXPENSE_CATEGORIES, ...invCats, ...pastCats, ...storedCustom]);
        return Array.from(set);
    }
    const set = new Set([...INCOME_CATEGORIES, ...invCats, ...pastCats, ...storedCustom]);
    return Array.from(set);
  }, [type, inventory, transactions, customEntities]);

  const resetForm = useCallback(() => {
      setIsEditing(false);
      setEditingId(null);
      setTitle('');
      setAmount('');
      setQuantity('');
      setSelectedCategories([]);
      setCategoryAmounts({});
      setAutoSum('');
      setCustomCategory('');
      setIsOtherCategory(false);
      setNote('');
      setDate(new Date());
      setPlotId(paramPlotId && typeof paramPlotId === 'string' ? paramPlotId : null);
      setInventoryItemId(null);
  }, [paramPlotId]);

  useFocusEffect(
    useCallback(() => {
      // If the screen comes into focus without an editId but was editing previously, reset it.
      if (!editId && isEditing) {
          resetForm();
      }
    }, [editId, isEditing, resetForm])
  );

  useEffect(() => {
    if (editId && typeof editId === 'string') {
        const tx = transactions.find(t => t.id === editId);
        if (tx && !isEditing) {
            setIsEditing(true);
            setEditingId(tx.id);
            setTitle(tx.title);
            setType(tx.type);
            setAmount(tx.amount.toString());
            
            // Reconstruct category
            const isKnown = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...inventory.map(i=>i.category)].includes(tx.category);
            if (isKnown) {
                setSelectedCategories([tx.category]);
                setCategoryAmounts({ [tx.category]: tx.amount.toString() });
                setIsOtherCategory(false);
            } else {
                setSelectedCategories(['Other']);
                setCategoryAmounts({ 'Other': tx.amount.toString() });
                setIsOtherCategory(true);
                setCustomCategory(tx.category);
            }

            setDate(new Date(tx.date));
            setPlotId(tx.plotId || null);
            setInventoryItemId(tx.inventoryItemId || null);
            setQuantity(tx.quantity ? tx.quantity.toString() : '');
            setNote(tx.note || '');
        }
    }
  }, [editId, transactions]);

  useEffect(() => {
    if (selectedCategories.length > 1) {
        let sum = 0;
        for (const cat of selectedCategories) {
            const val = parseFloat(categoryAmounts[cat]);
            if (!isNaN(val)) {
                sum += val;
            }
        }
        const newSumStr = sum > 0 ? sum.toString() : '';
        if (amount === '' || amount === autoSum) {
            setAmount(newSumStr);
            setAutoSum(newSumStr);
        }
    }
  }, [categoryAmounts, selectedCategories, amount, autoSum]);

  const onSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!title || !amount || selectedCategories.length === 0) {
        Alert.alert('Missing Fields', 'Please fill in Title, Amount, and select at least one Category.');
        return;
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid amount.');
        return;
      }

      const txsToSave = [];

      if (selectedCategories.length === 1) {
          let c = selectedCategories[0];
          let finalCat = c === 'Other' && isOtherCategory ? customCategory || 'Other' : c;
          txsToSave.push({
            title,
            type,
            amount: amountNum,
            category: finalCat,
            date: date.toISOString(),
            plotId: plotId || undefined,
            inventoryItemId: inventoryItemId || undefined,
            quantity: quantity ? parseFloat(quantity) : undefined,
            note,
          });
      } else {
          let sumBreakdown = 0;
          for (let c of selectedCategories) {
              const catAmt = parseFloat(categoryAmounts[c]) || 0;
              sumBreakdown += catAmt;
          }
          if (Math.abs(sumBreakdown - amountNum) > 0.01) {
              Alert.alert('Amount Mismatch', `The sum of category breakdowns (₹${sumBreakdown}) must equal the total amount (₹${amountNum}).`);
              return;
          }
          
          for (let c of selectedCategories) {
              let finalCat = c === 'Other' && isOtherCategory ? customCategory || 'Other' : c;
              const catAmt = parseFloat(categoryAmounts[c]) || 0;
              if (catAmt <= 0) continue;
              
              const itemIsLinked = inventoryItemId && inventory.find(i => i.id === inventoryItemId)?.category === c;
              
              txsToSave.push({
                title,
                type,
                amount: catAmt,
                category: finalCat,
                date: date.toISOString(),
                plotId: plotId || undefined,
                inventoryItemId: itemIsLinked ? inventoryItemId : undefined,
                quantity: itemIsLinked && quantity ? parseFloat(quantity) : undefined,
                note,
              });
          }
      }

      if (isEditing && editingId) {
          if (txsToSave.length > 1) {
              Alert.alert('Edit Error', 'Cannot split an existing transaction. Delete it and record new multiple ones.');
              return;
          }
          await updateTransaction({ id: editingId, ...txsToSave[0] } as any);
      } else {
          for (let tx of txsToSave) {
              await addTransaction({
                  id: Date.now().toString() + Math.random().toString(36).substring(7),
                  ...tx
               } as any);
          }
      }

      // Save new category if persistent
      if (isOtherCategory && customCategory) {
          addCustomEntity('category', customCategory);
      }

      resetForm();
      setShowSuccess(true);
      if (isEditing) {
          setTimeout(() => {
              router.back();
          }, 1000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSelectDate = (selectedDate: Date) => {
    setDate(selectedDate);
  };

  const handleSuccessDone = () => {
    setShowSuccess(false);
    router.back();
  };

  const handleSuccessAddNew = () => {
    setShowSuccess(false);
  };

  const toggleCategory = (cat: string) => {
    if (cat === 'Other') {
        setIsOtherCategory(prev => !selectedCategories.includes('Other') ? true : false);
    }

    setSelectedCategories(prev => {
        if (prev.includes(cat)) {
            const next = prev.filter(c => c !== cat);
            if (next.length === 0) {
                setInventoryItemId(null);
                setQuantity('');
            } else if (inventoryItemId) {
                const linkedItem = inventory.find(i => i.id === inventoryItemId);
                if (linkedItem && linkedItem.category === cat) {
                    setInventoryItemId(null);
                    setQuantity('');
                }
            }
            return next;
        } else {
            return [...prev, cat];
        }
    });
  };

  const handleInventorySelect = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    if (inventoryItemId === itemId) {
        setInventoryItemId(null);
        setQuantity('');
    } else {
        setInventoryItemId(itemId);
        setInputUnit(item.unit); // Default to item's primary unit
        
        if (!title || title.startsWith('Applied ')) {
            setTitle(`Applied ${item.name}`);
        }
        
        if (item.pricePerUnit && quantity) {
            const qtyNum = parseFloat(quantity);
            if (!isNaN(qtyNum)) {
                calculateCost(qtyNum, item.unit, item);
            }
        }
    }
  };

  const calculateCost = (qtyVal: number, unit: string, itemProp?: any) => {
      const item = itemProp || inventory.find(i => i.id === inventoryItemId);
      if (!item || !item.pricePerUnit) return;

      // Convert input quantity to item's primary unit to calculate cost
      const convertedQty = convertUnit(qtyVal, unit, item.unit);
      
      if (convertedQty !== null) {
          const cost = convertedQty * item.pricePerUnit;
          if (selectedCategories.length <= 1) {
              setAmount(cost.toFixed(2));
          } else {
              setCategoryAmounts(prev => ({ ...prev, [item.category]: cost.toFixed(2) }));
          }
      }
  };

  const onQuantityChange = (text: string) => {
    setQuantity(text);
    const qtyNum = parseFloat(text);
    if (!isNaN(qtyNum)) {
        calculateCost(qtyNum, inputUnit);
    } else if (text === '') {
        const item = inventory.find(i => i.id === inventoryItemId);
        if (selectedCategories.length <= 1) setAmount('');
        else if (item) setCategoryAmounts(prev => ({ ...prev, [item.category]: '' }));
    }
  };

  const toggleInputUnit = () => {
      const secondary = getSecondaryUnit(inputUnit);
      if (secondary) {
          setInputUnit(secondary);
          const qtyNum = parseFloat(quantity);
          if (!isNaN(qtyNum)) {
              calculateCost(qtyNum, secondary);
          }
      }
  };

  return (
    <>
      <Stack.Screen options={{ 
        title: isEditing ? `Edit ${type}` : `Record ${type}`, 
        headerStyle: { backgroundColor: Palette.background },
        headerShadowVisible: false,
        headerTintColor: Palette.text,
        headerTitleStyle: { fontFamily: 'Outfit-Bold' },
        headerRight: () => (
            <Pressable onPress={resetForm} hitSlop={10}>
                <Text style={{ fontFamily: 'Outfit-Bold', color: Palette.primary, fontSize: 16 }}>Reset</Text>
            </Pressable>
        )
      }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        
        {/* Type Toggle */}
        <View style={styles.typeToggle}>
            <Pressable 
                onPress={() => { setType('Expense'); setSelectedCategories([]); setCategoryAmounts({}); setIsOtherCategory(false); }}
                style={[styles.typeBtn, type === 'Expense' && styles.typeBtnActiveExpense]}
            >
                <Text style={[styles.typeBtnText, type === 'Expense' && styles.typeBtnTextActive]}>Expense</Text>
            </Pressable>
            <Pressable 
                onPress={() => { setType('Income'); setSelectedCategories([]); setCategoryAmounts({}); setIsOtherCategory(false); }}
                style={[styles.typeBtn, type === 'Income' && styles.typeBtnActiveIncome]}
            >
                <Text style={[styles.typeBtnText, type === 'Income' && styles.typeBtnTextActive]}>Income</Text>
            </Pressable>
        </View>

        {/* Amount Input */}
        <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={Palette.textSecondary + '40'}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
            />
        </View>
        <Text style={styles.helperText}>Enter transaction amount</Text>

        <View style={styles.formCard}>
            {/* Title */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="create-outline" size={20} color={Palette.textSecondary} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Sold Wheat, Bought Seeds"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>
            </View>

            {/* Plot Selection */}
            {plots.length > 0 && (
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Select Plot</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                        {plots.map(p => (
                            <Pressable 
                                key={p.id} 
                                onPress={() => setPlotId(plotId === p.id ? null : p.id)}
                                style={[styles.chip, plotId === p.id && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, { color: plotId === p.id ? 'white' : Palette.text }]}>{p.name}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Category */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.chipContainer}>
                {categories.map((cat) => (
                    <Pressable
                        key={cat}
                        style={[
                            styles.chip,
                            selectedCategories.includes(cat) && { backgroundColor: CATEGORY_COLORS[cat as Category] || Palette.primary, borderColor: CATEGORY_COLORS[cat as Category] || Palette.primary }
                        ]}
                        onPress={() => toggleCategory(cat)}
                    >
                    <Ionicons
                        name={(CATEGORY_ICONS[cat as Category] as any) || 'pricetag-outline'}
                        size={16}
                        color={selectedCategories.includes(cat) ? 'white' : (CATEGORY_COLORS[cat as Category] || Palette.primary)}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.chipText, { color: selectedCategories.includes(cat) ? 'white' : Palette.text }]}>
                        {cat}
                    </Text>
                    </Pressable>
                ))}

                {isOtherCategory ? (
                    <TextInput 
                        style={[styles.chip, { minWidth: 100, color: Palette.text, fontFamily: 'Outfit' }]}
                        autoFocus
                        placeholder="New..."
                        placeholderTextColor={Palette.textSecondary + '80'}
                        value={customCategory}
                        onChangeText={setCustomCategory}
                        onSubmitEditing={() => {
                            if (customCategory.trim() && !selectedCategories.includes('Other')) {
                                toggleCategory('Other');
                            }
                        }}
                    />
                ) : (
                    <Pressable 
                        onPress={() => {
                           setIsOtherCategory(true);
                           if (!selectedCategories.includes('Other')) {
                               toggleCategory('Other');
                           }
                        }}
                        style={[styles.chip, { borderStyle: 'dashed' }]}
                    >
                        <Ionicons name="add" size={16} color={Palette.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.chipText}>New</Text>
                    </Pressable>
                )}
                </View>
            </View>

            {/* Inventory Item (Available for any category that exists in inventory) */}
            {type === 'Expense' && inventory.some(i => selectedCategories.includes(i.category)) && inventory.length > 0 && (
                <View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Link to Inventory (Optional)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            {inventory.filter(i => selectedCategories.includes(i.category)).map(item => (
                                <Pressable 
                                    key={item.id} 
                                    onPress={() => handleInventorySelect(item.id)}
                                    style={[styles.chip, inventoryItemId === item.id && styles.chipActive]}
                                >
                                    <Text style={[styles.chipText, { color: inventoryItemId === item.id ? 'white' : Palette.text }]}>
                                        {item.name} ({item.quantity} {item.unit})
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                    {inventoryItemId && (
                        <View style={styles.inputGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={styles.label}>Quantity</Text>
                                {getSecondaryUnit(inputUnit) && (
                                    <Pressable onPress={toggleInputUnit} style={styles.unitToggleSmall}>
                                        <Text style={styles.unitToggleText}>Use {getSecondaryUnit(inputUnit)} instead</Text>
                                    </Pressable>
                                )}
                            </View>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="cube-outline" size={20} color={Palette.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={`e.g., 10 ${inputUnit}`}
                                    value={quantity}
                                    onChangeText={onQuantityChange}
                                    keyboardType="numeric"
                                />
                                <View style={styles.unitBadge}>
                                    <Text style={styles.unitBadgeText}>{inputUnit}</Text>
                                </View>
                            </View>
                            <Text style={styles.infoText}>This will automatically update your inventory stock.</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Category Breakdown (Multiple Categories) */}
            {selectedCategories.length > 1 && (
                <View style={[styles.inputGroup, { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 16 }]}>
                    <Text style={styles.label}>Category Breakdown (Must equal ₹{amount || '0'})</Text>
                    {selectedCategories.map(cat => (
                        <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ width: 100, fontFamily: 'Outfit-Medium', color: Palette.text }}>{cat === 'Other' && isOtherCategory && customCategory ? customCategory : cat}</Text>
                            <View style={[styles.inputWrapper, { flex: 1, backgroundColor: 'white' }]}>
                                <Text style={{ paddingLeft: 16, color: Palette.textSecondary }}>₹</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={`Amount for ${cat}`}
                                    value={categoryAmounts[cat] || ''}
                                    onChangeText={(val) => setCategoryAmounts(prev => ({ ...prev, [cat]: val }))}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Date */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                <Pressable onPress={() => setShowCalendar(true)} style={styles.dateButton}>
                    <Ionicons name="calendar-outline" size={20} color={Palette.primary} style={styles.inputIcon} />
                    <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                </Pressable>
                <CalendarModal
                    visible={showCalendar}
                    initialDate={date}
                    onClose={() => setShowCalendar(false)}
                    onSelectDate={onSelectDate}
                    maximumDate={new Date()}
                />
            </View>

            {/* Note */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <View style={[styles.inputWrapper, { alignItems: 'flex-start' }]}>
                    <Ionicons name="document-text-outline" size={20} color={Palette.textSecondary} style={[styles.inputIcon, { marginTop: 12 }]} />
                    <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add details (optional)"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                    />
                </View>
            </View>
        </View>

        {/* Save Button */}
        <Pressable 
            onPress={onSave} 
            disabled={isSubmitting}
            style={({ pressed }) => [styles.saveButton, (pressed || isSubmitting) && { opacity: 0.7 }, { backgroundColor: type === 'Income' ? Palette.success : Palette.primary }]}
        >
            <Text style={styles.saveButtonText}>{isSubmitting ? 'Saving...' : (isEditing ? `Update ${type}` : `Record ${type}`)}</Text>
        </Pressable>
      </ScrollView>

      {!isEditing && (
        <SuccessModal
          visible={showSuccess}
          title="Record Saved"
          message="The transaction has been recorded successfully."
          primaryLabel="Done"
          secondaryLabel="Add Another"
          onPrimary={handleSuccessDone}
          onSecondary={handleSuccessAddNew}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  typeToggle: {
      flexDirection: 'row',
      backgroundColor: 'white',
      marginHorizontal: 40,
      marginTop: 20,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: Palette.border,
  },
  typeBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
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
  amountContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
  },
  currencySymbol: {
      fontSize: 32,
      fontFamily: 'Outfit-SemiBold',
      color: Palette.text,
      marginRight: 4,
  },
  amountInput: {
      fontSize: 48,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
      minWidth: 60,
      textAlign: 'center',
  },
  helperText: {
      textAlign: 'center',
      color: Palette.textSecondary,
      marginBottom: 24,
      fontSize: 14,
      fontFamily: 'Outfit',
  },
  formCard: {
      backgroundColor: 'white',
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 24,
      paddingBottom: 40,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 5,
  },
  inputGroup: {
      marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: Palette.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Palette.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Palette.border,
  },
  inputIcon: {
      marginLeft: 16,
      marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 16,
    paddingLeft: 4,
    fontSize: 16,
    fontFamily: 'Outfit',
    color: Palette.text,
  },
  textArea: {
      height: 100,
      textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipScroll: {
      flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    marginRight: 8,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.background,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Outfit',
    color: Palette.text,
  },
  saveButton: {
    marginHorizontal: 24,
    marginTop: -20,
    marginBottom: 40,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  infoText: {
      fontSize: 11,
      color: Palette.textSecondary,
      marginLeft: 4,
      marginTop: 4,
      fontFamily: 'Outfit',
  },
  unitToggleSmall: {
      backgroundColor: Palette.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Palette.border,
  },
  unitToggleText: {
      fontSize: 12,
      fontFamily: 'Outfit-Medium',
      color: Palette.primary,
  },
  unitBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: Palette.border,
      borderRadius: 8,
      marginRight: 12,
  },
  unitBadgeText: {
      fontSize: 12,
      fontFamily: 'Outfit-Bold',
      color: Palette.textSecondary,
  }
});
