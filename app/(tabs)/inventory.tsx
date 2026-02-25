import { InventoryCard } from '@/components/InventoryCard';
import { Text } from '@/components/Themed';
import { EXPENSE_CATEGORIES } from '@/constants/Categories';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { InventoryUnit } from '@/types/farm';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View
} from 'react-native';

const FIXED_UNITS: InventoryUnit[] = ['kg', 'bags', 'L'];

export default function InventoryScreen() {
  const { inventory, addInventoryItem, updateInventoryQuantity, deleteInventoryItem } = useFarm();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Seeds');
  const [customCategory, setCustomCategory] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<InventoryUnit>('kg');
  const [pricePerUnit, setPricePerUnit] = useState('');

  const onSave = async () => {
    const finalCategory = isOtherCategory ? customCategory : category;
    
    if (!name || !quantity || !finalCategory) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name,
      category: finalCategory,
      quantity: parseFloat(quantity),
      unit,
      pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : undefined,
    };

    await addInventoryItem(newItem);
    setName('');
    setCategory('Seeds');
    setCustomCategory('');
    setIsOtherCategory(false);
    setQuantity('');
    setPricePerUnit('');
    setUnit('kg');
    setModalVisible(false);
  };

  const selectCategory = (cat: string) => {
    if (cat === 'Other') {
        setIsOtherCategory(true);
        setCategory('Other');
    } else {
        setIsOtherCategory(false);
        setCategory(cat);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={inventory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <InventoryCard 
            item={item} 
            onUpdateQuantity={(delta) => updateInventoryQuantity(item.id, delta)}
            onDelete={() => {
                Alert.alert("Delete Item", `Remove ${item.name} from inventory?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deleteInventoryItem(item.id) }
                ]);
            }}
          />
        )}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={64} color={Palette.textSecondary + '40'} />
                <Text style={styles.emptyText}>Inventory is empty.</Text>
                <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
                    <Text style={styles.addBtnText}>Add Supplies</Text>
                </Pressable>
            </View>
        }
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="white" />
      </Pressable>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add Supply</Text>
                
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Item Name</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g., Urea Fertilizer" 
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                        {[...EXPENSE_CATEGORIES, 'Other'].map(cat => (
                            <Pressable 
                                key={cat} 
                                onPress={() => selectCategory(cat)}
                                style={[styles.catChip, category === cat && styles.catChipActive]}
                            >
                                <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>{cat}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {isOtherCategory && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Custom Category Name</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g., Tools" 
                            value={customCategory}
                            onChangeText={setCustomCategory}
                        />
                    </View>
                )}

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Initial Qty</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="0" 
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                        <Text style={styles.label}>Cost per {unit}</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="₹ 0" 
                            value={pricePerUnit}
                            onChangeText={setPricePerUnit}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Unit</Text>
                    <View style={styles.unitToggleContainer}>
                        {FIXED_UNITS.map(u => (
                            <Pressable 
                                key={u} 
                                onPress={() => setUnit(u)}
                                style={[styles.unitChip, unit === u && styles.unitChipActive]}
                            >
                                <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>{u}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.modalButtons}>
                    <Pressable style={[styles.btn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[styles.btn, styles.saveBtn]} onPress={onSave}>
                        <Text style={styles.saveBtnText}>Save Item</Text>
                    </Pressable>
                </View>
            </View>
        </View>
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
    elevation: 5,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
  },
  modalContent: {
      backgroundColor: 'white',
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 24,
      paddingBottom: 40,
  },
  modalTitle: {
      fontSize: 22,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
      marginBottom: 24,
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
      borderRadius: 12,
      padding: 12,
      fontFamily: 'Outfit',
      borderWidth: 1,
      borderColor: Palette.border,
  },
  categoryScroll: {
      flexDirection: 'row',
      marginHorizontal: -4,
  },
  catChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: Palette.background,
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: Palette.border,
  },
  catChipActive: {
      backgroundColor: Palette.primary,
      borderColor: Palette.primary,
  },
  catChipText: {
      fontSize: 13,
      fontFamily: 'Outfit-Medium',
      color: Palette.textSecondary,
  },
  catChipTextActive: {
      color: 'white',
  },
  unitToggleContainer: {
      flexDirection: 'row',
      backgroundColor: Palette.background,
      borderRadius: 12,
      padding: 4,
      gap: 4,
  },
  unitChip: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: 'transparent',
  },
  unitChipActive: {
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
  },
  unitChipText: {
      fontSize: 14,
      fontFamily: 'Outfit-SemiBold',
      color: Palette.textSecondary,
  },
  unitChipTextActive: {
      color: Palette.primary,
  },
  row: {
      flexDirection: 'row',
  },
  modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
  },
  btn: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
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
  },
  saveBtnText: {
      color: 'white',
      fontFamily: 'Outfit-Bold',
  }
});
