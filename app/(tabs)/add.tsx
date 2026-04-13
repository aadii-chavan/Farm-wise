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

export default function RecordTransaction() {
  const router = useRouter();
  const { plotId: paramPlotId, editId } = useLocalSearchParams();
  const { addTransaction, updateTransaction, plots, inventory, transactions } = useFarm();

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
  const [category, setCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [date, setDate] = useState(new Date());
  const [plotId, setPlotId] = useState<string | null>(null);
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = React.useMemo(() => {
    const invCats = inventory.map(i => i.category);
    const pastCats = transactions.filter(t => t.type === type).map(t => t.category);
    
    if (type === 'Expense') {
        const set = new Set([...EXPENSE_CATEGORIES, ...invCats, ...pastCats, 'Other']);
        return Array.from(set);
    }
    const set = new Set([...INCOME_CATEGORIES, ...invCats, ...pastCats, 'Other']);
    return Array.from(set);
  }, [type, inventory, transactions]);

  const resetForm = useCallback(() => {
      setIsEditing(false);
      setEditingId(null);
      setTitle('');
      setAmount('');
      setQuantity('');
      setCategory(null);
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
            const isKnown = ['Other', ...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...inventory.map(i=>i.category)].includes(tx.category);
            if (isKnown) {
                setCategory(tx.category);
                setIsOtherCategory(false);
            } else {
                setCategory('Other');
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

  const onSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const finalCategory = isOtherCategory ? customCategory : category;

      if (!title || !amount || !finalCategory) {
        Alert.alert('Missing Fields', 'Please fill in Title, Amount, and Category.');
        return;
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid amount.');
        return;
      }

      const newTransaction = {
        id: isEditing && editingId ? editingId : Date.now().toString() + Math.random().toString(36).substring(7),
        title,
        type,
        amount: amountNum,
        category: finalCategory,
        date: date.toISOString(),
        plotId: plotId || undefined,
        inventoryItemId: inventoryItemId || undefined,
        quantity: quantity ? parseFloat(quantity) : undefined,
        note,
      };

      if (isEditing) {
          await updateTransaction(newTransaction as any);
      } else {
          await addTransaction(newTransaction as any);
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

  const handleSuccessViewAll = () => {
    setShowSuccess(false);
    router.push('/list');
  };

  const handleSuccessAddNew = () => {
    setShowSuccess(false);
  };

  const selectCategory = (cat: string) => {
    if (cat === 'Other') {
        setIsOtherCategory(true);
        setCategory('Other');
    } else {
        setIsOtherCategory(false);
        setCategory(cat);
    }
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
        if (!title || title.startsWith('Applied ')) {
            setTitle(`Applied ${item.name}`);
        }
        if (item.pricePerUnit && quantity) {
            const qty = parseFloat(quantity);
            if (!isNaN(qty)) setAmount((qty * item.pricePerUnit).toString());
        }
    }
  };

  const onQuantityChange = (text: string) => {
    setQuantity(text);
    const item = inventory.find(i => i.id === inventoryItemId);
    const qty = parseFloat(text);
    if (item && item.pricePerUnit && !isNaN(qty)) {
        setAmount((qty * item.pricePerUnit).toString());
    } else if (text === '') {
        setAmount('');
    }
  };

  return (
    <>
      <Stack.Screen options={{ 
        title: isEditing ? `Edit ${type}` : `Record ${type}`, 
        headerStyle: { backgroundColor: Palette.background },
        headerShadowVisible: false,
        headerRight: () => (
            <Pressable onPress={resetForm} hitSlop={10}>
                <Text style={{ fontFamily: 'Outfit-Medium', color: Palette.primary, fontSize: 16 }}>Reset</Text>
            </Pressable>
        )
      }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        
        {/* Type Toggle */}
        <View style={styles.typeToggle}>
            <Pressable 
                onPress={() => { setType('Expense'); setCategory(null); setIsOtherCategory(false); }}
                style={[styles.typeBtn, type === 'Expense' && styles.typeBtnActiveExpense]}
            >
                <Text style={[styles.typeBtnText, type === 'Expense' && styles.typeBtnTextActive]}>Expense</Text>
            </Pressable>
            <Pressable 
                onPress={() => { setType('Income'); setCategory(null); setIsOtherCategory(false); }}
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
                            category === cat && { backgroundColor: CATEGORY_COLORS[cat as Category] || Palette.primary, borderColor: CATEGORY_COLORS[cat as Category] || Palette.primary }
                        ]}
                        onPress={() => selectCategory(cat)}
                    >
                    <Ionicons
                        name={(CATEGORY_ICONS[cat as Category] as any) || 'pricetag-outline'}
                        size={16}
                        color={category === cat ? 'white' : (CATEGORY_COLORS[cat as Category] || Palette.primary)}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.chipText, { color: category === cat ? 'white' : Palette.text }]}>
                        {cat}
                    </Text>
                    </Pressable>
                ))}
                </View>
            </View>

            {isOtherCategory && (
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Custom Category Name</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="pricetag-outline" size={20} color={Palette.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Repair, Maintenance"
                            value={customCategory}
                            onChangeText={setCustomCategory}
                        />
                    </View>
                </View>
            )}

            {/* Inventory Item (Available for any category that exists in inventory) */}
            {type === 'Expense' && inventory.some(i => i.category === category) && inventory.length > 0 && (
                <View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Link to Inventory (Optional)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            {inventory.filter(i => i.category === category).map(item => (
                                <Pressable 
                                    key={item.id} 
                                    onPress={() => handleInventorySelect(item.id)}
                                    style={[styles.chip, inventoryItemId === item.id && styles.chipActive]}
                                >
                                    <Text style={[styles.chipText, { color: inventoryItemId === item.id ? 'white' : Palette.text }]}>{item.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                    {inventoryItemId && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Quantity {inventory.find(i => i.id === inventoryItemId)?.unit}</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="cube-outline" size={20} color={Palette.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., 10"
                                    value={quantity}
                                    onChangeText={onQuantityChange}
                                    keyboardType="numeric"
                                />
                            </View>
                            <Text style={styles.infoText}>This will automatically update your inventory stock.</Text>
                        </View>
                    )}
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
          primaryLabel="View All"
          secondaryLabel="Add New"
          onPrimary={handleSuccessViewAll}
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
  }
});
