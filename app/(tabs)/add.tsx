import { CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/Categories';
import { Palette } from '@/constants/Colors';
import { useExpenses } from '@/context/ExpensesContext';
import { Category } from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

export default function AddExpense() {
  const router = useRouter();
  const { addExpense } = useExpenses();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Quick inputs for farmers (optional/future)
  // const quickAmounts = ['500', '1000', '2000', '5000'];

  const onSave = async () => {
    if (!title || !amount || !category) {
      Alert.alert('Missing Fields', 'Please fill in Title, Amount, and Category.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
      return;
    }

    const newExpense = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      title,
      amount: amountNum,
      category,
      date: date.toISOString(),
      note,
    };

    await addExpense(newExpense);
    
    // Reset form
    setTitle('');
    setAmount('');
    setCategory(null);
    setNote('');
    setDate(new Date());

    Alert.alert('Expense Saved', 'Your expense has been recorded successfully.', [
        { text: 'View All', onPress: () => router.push('/list') },
        { text: 'Add New', style: 'cancel' }
    ]);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <>
      <Stack.Screen options={{ 
        title: 'Add Expense', 
        headerStyle: { backgroundColor: Palette.background },
        headerShadowVisible: false,
      }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Amount Input (Main Focus) */}
        <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={Palette.textSecondary + '40'}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            autoFocus
            />
        </View>
        <Text style={styles.helperText}>Enter expense amount</Text>

        <View style={styles.formCard}>
            {/* Title */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Expense Title</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="create-outline" size={20} color={Palette.textSecondary} style={styles.inputIcon} />
                    <TextInput
                    style={styles.input}
                    placeholder="e.g., Fertilizer, Seeds"
                    value={title}
                    onChangeText={setTitle}
                    />
                </View>
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.chipContainer}>
                {CATEGORIES.map((cat) => (
                    <Pressable
                    key={cat}
                    style={[
                        styles.chip,
                        category === cat && { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] }
                    ]}
                    onPress={() => setCategory(cat)}
                    >
                    <Ionicons
                        name={CATEGORY_ICONS[cat] as any}
                        size={16}
                        color={category === cat ? 'white' : CATEGORY_COLORS[cat]}
                        style={{ marginRight: 6 }}
                    />
                    <Text
                        style={[
                        styles.chipText,
                        { color: category === cat ? 'white' : Palette.text }
                        ]}
                    >
                        {cat}
                    </Text>
                    </Pressable>
                ))}
                </View>
            </View>

            {/* Date */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                <Pressable onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                <Ionicons name="calendar-outline" size={20} color={Palette.primary} style={styles.inputIcon} />
                <Text style={styles.dateText}>{date.toDateString()}</Text>
                </Pressable>
                {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                />
                )}
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
        <Pressable onPress={onSave} style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.9 }]}>
            <Text style={styles.saveButtonText}>Save Expense</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background, // Light gray
  },
  amountContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 0,
  },
  currencySymbol: {
      fontSize: 32,
      fontWeight: '600',
      color: Palette.text,
      marginRight: 4,
  },
  amountInput: {
      fontSize: 48,
      fontWeight: 'bold',
      color: Palette.text,
      minWidth: 60,
      textAlign: 'center',
  },
  helperText: {
      textAlign: 'center',
      color: Palette.textSecondary,
      marginBottom: 24,
      fontSize: 14,
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
      minHeight: 500, // Ensure it fills space nicely
  },
  inputGroup: {
      marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingLeft: 4, // Accounting for icon
    fontSize: 16,
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
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
    color: Palette.text,
  },
  saveButton: {
    backgroundColor: Palette.primary,
    marginHorizontal: 24,
    marginTop: -20, // Overlap the card slightly or just float
    marginBottom: 40,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
