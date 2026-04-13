import { InventoryCard } from '@/components/InventoryCard';
import CalendarModal from '@/components/CalendarModal';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { InventoryUnit, InventoryItem } from '@/types/farm';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useState, useMemo } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
    KeyboardAvoidingView,
    Platform
} from 'react-native';

const FIXED_UNITS: InventoryUnit[] = ['kg', 'gm', 'L', 'mL', 'bags'];
const INVENTORY_CATEGORIES = ['Seeds', 'Fertilizer', 'Pesticide', 'Fuel'];

export default function InventoryScreen() {
  const { inventory, addInventoryItem, updateInventoryQuantity, deleteInventoryItem } = useFarm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Seeds');
  const [customCategory, setCustomCategory] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  
  // Packaged states
  const [numPackages, setNumPackages] = useState('');
  const [sizePerPackage, setSizePerPackage] = useState('');
  
  // Shared states
  const [unit, setUnit] = useState<InventoryUnit>('kg');
  const [totalCost, setTotalCost] = useState('');
  
  // Extra Tracking Details
  const [shopName, setShopName] = useState('');
  const [isOtherShop, setIsOtherShop] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [note, setNote] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const dynamicCategories = useMemo(() => {
     const existingCustom = inventory
        .map(i => i.category)
        .filter(c => !INVENTORY_CATEGORIES.includes(c));
     const uniqueCustom = Array.from(new Set(existingCustom));
     
     // Remove any manually added 'Other' if it mistakenly persists, and only append unique custom categories.
     // INVENTORY_CATEGORIES already contains 'Other' at the end.
     return [...INVENTORY_CATEGORIES.filter(c => c !== 'Other'), ...uniqueCustom, 'Other'];
  }, [inventory]);
  
  const dynamicShops = useMemo(() => {
    const existing = inventory
      .map(i => i.shopName)
      .filter((s): s is string => !!s);
    const unique = Array.from(new Set(existing));
    return unique;
  }, [inventory]);

  const handleEdit = (item: InventoryItem) => {
      setEditingId(item.id);
      setName(item.name);
      
      const isKnown = dynamicCategories.includes(item.category);
      if (isKnown && item.category !== 'Other') {
          setCategory(item.category);
          setIsOtherCategory(false);
          setCustomCategory('');
      } else {
          setCategory('Other');
          setIsOtherCategory(true);
          setCustomCategory(item.category);
      }
      
      setNumPackages(item.numPackages ? item.numPackages.toString() : '');
      setSizePerPackage(item.sizePerPackage ? item.sizePerPackage.toString() : '');
      setUnit(item.unit);
      setTotalCost(item.pricePerUnit ? (item.pricePerUnit * item.quantity).toString() : '');
      
      setShopName(item.shopName || '');
      setIsOtherShop(item.shopName ? !dynamicShops.includes(item.shopName) : false);
      setCompanyName(item.companyName || '');
      setBatchNo(item.batchNo || '');
      setInvoiceNo(item.invoiceNo || '');
      setNote(item.note || '');
      setPurchaseDate(item.purchaseDate ? new Date(item.purchaseDate) : new Date());
      
      setModalVisible(true);
  };

  const closeModal = () => {
      setModalVisible(false);
      setEditingId(null);
  };

  const onSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const finalCategory = isOtherCategory ? customCategory : category;
      
      if (!numPackages || !sizePerPackage) {
        Alert.alert('Missing Fields', 'Please fill in both number of Bags / Bottles and Size per item.');
        return;
      }
      const finalQuantity = parseFloat(numPackages) * parseFloat(sizePerPackage);

      if (!name || !finalCategory || isNaN(finalQuantity) || finalQuantity <= 0) {
        Alert.alert('Missing Fields', 'Please make sure Name and valid quantity sizes are filled.');
        return;
      }
      
      const tc = totalCost ? parseFloat(totalCost) : 0;
      const calcPricePerUnit = tc > 0 ? (tc / finalQuantity) : undefined;

      const newItem = {
        id: editingId ? editingId : Date.now().toString(),
        name,
        category: finalCategory,
        quantity: finalQuantity,
        numPackages: parseFloat(numPackages),
        sizePerPackage: parseFloat(sizePerPackage),
        unit,
        pricePerUnit: calcPricePerUnit,
        shopName: shopName || undefined,
        companyName: companyName || undefined,
        batchNo: batchNo || undefined,
        paymentMode: 'Udari' as any,
        invoiceNo: invoiceNo || undefined,
        note: note || undefined,
        purchaseDate: purchaseDate.toISOString(),
      };

      await addInventoryItem(newItem);
      setName('');
      setCategory('Seeds');
      setCustomCategory('');
      setIsOtherCategory(false);
      setNumPackages('');
      setSizePerPackage('');
      setTotalCost('');
      setUnit('kg');
      
      setShopName('');
      setIsOtherShop(false);
      setCompanyName('');
      setBatchNo('');
      setInvoiceNo('');
      setNote('');
      setPurchaseDate(new Date());
      
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectCategory = (cat: string) => {
    setIsOtherCategory(false);
    setCategory(cat);
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
            onEdit={() => handleEdit(item)}
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
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
        >
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                    <Text style={styles.modalTitle}>{editingId ? 'Edit Supply' : 'Add Supply'}</Text>
                
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
                    <View style={styles.chipContainer}>
                        {dynamicCategories.map(cat => (
                            <Pressable 
                                key={cat} 
                                onPress={() => selectCategory(cat)}
                                style={[styles.catChip, (category === cat && !isOtherCategory) && styles.catChipActive]}
                            >
                                <Text style={[styles.catChipText, (category === cat && !isOtherCategory) && styles.catChipTextActive]}>{cat}</Text>
                            </Pressable>
                        ))}

                        {isOtherCategory ? (
                            <TextInput 
                                style={[styles.catChip, { minWidth: 100, color: Palette.text, fontFamily: 'Outfit' }]}
                                autoFocus
                                placeholder="New Cat..."
                                placeholderTextColor="#999"
                                value={customCategory}
                                onChangeText={setCustomCategory}
                                onBlur={() => {
                                    if (!customCategory.trim()) setIsOtherCategory(false);
                                }}
                            />
                        ) : (
                            <Pressable 
                                onPress={() => {
                                    setIsOtherCategory(true);
                                    setCustomCategory('');
                                    setCategory('Other');
                                }}
                                style={[styles.catChip, { borderStyle: 'dashed' }]}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="add" size={16} color={Palette.textSecondary} />
                                    <Text style={[styles.catChipText, { marginLeft: 2 }]}>New</Text>
                                </View>
                            </Pressable>
                        )}
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>No. of Bags / Bottles</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g., 5" 
                            value={numPackages}
                            onChangeText={setNumPackages}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                        <Text style={styles.label}>Size per Item</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder={`e.g., 20`} 
                            value={sizePerPackage}
                            onChangeText={setSizePerPackage}
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
                    <Text style={styles.helperText}>Calculated Total: {numPackages && sizePerPackage ? (parseFloat(numPackages) * parseFloat(sizePerPackage)) : 0} {unit}</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Total Cost (₹) <Text style={styles.optionalText}>(Optional)</Text></Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Cost of the entire amount" 
                        value={totalCost}
                        onChangeText={setTotalCost}
                        keyboardType="numeric"
                    />
                    {totalCost ? (
                        <Text style={styles.helperText}>
                            Saves as ₹ { (((parseFloat(totalCost) || 0) / ((parseFloat(numPackages) * parseFloat(sizePerPackage)) || 1))).toFixed(2) } per {unit}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.sectionTitle}>Additional Tracking (Optional)</Text>
                </View>
                
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                         <Text style={styles.label}>Purchase Date</Text>
                         <Pressable style={[styles.input, { justifyContent: 'center' }]} onPress={() => setShowCalendar(true)}>
                             <Text style={{ fontFamily: 'Outfit', color: Palette.text }}>{format(purchaseDate, 'dd MMM yyyy')}</Text>
                         </Pressable>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                        <Text style={styles.label}>Invoice No.</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. INV-001" 
                            value={invoiceNo}
                            onChangeText={setInvoiceNo}
                        />
                    </View>
                </View>
                
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Shop Name</Text>
                    <View style={styles.chipContainer}>
                        {dynamicShops.map(s => (
                            <Pressable 
                                key={s} 
                                onPress={() => {
                                    setIsOtherShop(false);
                                    setShopName(s);
                                }}
                                style={[styles.catChip, (shopName === s && !isOtherShop) && styles.catChipActive]}
                            >
                                <Text style={[styles.catChipText, (shopName === s && !isOtherShop) && styles.catChipTextActive]}>{s}</Text>
                            </Pressable>
                        ))}

                        {isOtherShop ? (
                            <TextInput 
                                style={[styles.catChip, { minWidth: 100, color: Palette.text, fontFamily: 'Outfit' }]}
                                autoFocus
                                placeholder="New Shop..."
                                placeholderTextColor="#999"
                                value={shopName}
                                onChangeText={setShopName}
                                onBlur={() => {
                                    if (!shopName.trim()) setIsOtherShop(false);
                                }}
                            />
                        ) : (
                            <Pressable 
                                onPress={() => {
                                    setIsOtherShop(true);
                                    setShopName('');
                                }}
                                style={[styles.catChip, { borderStyle: 'dashed' }]}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="add" size={16} color={Palette.textSecondary} />
                                    <Text style={[styles.catChipText, { marginLeft: 2 }]}>New</Text>
                                </View>
                            </Pressable>
                        )}
                    </View>
                </View>
                
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Company Brand</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. Bayer" 
                            value={companyName}
                            onChangeText={setCompanyName}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                        <Text style={styles.label}>Batch No.</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. B-1234" 
                            value={batchNo}
                            onChangeText={setBatchNo}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Note</Text>
                    <TextInput 
                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                        placeholder="Any additional details..." 
                        value={note}
                        onChangeText={setNote}
                        multiline
                    />
                </View>

                <View style={styles.modalButtons}>
                    <Pressable style={[styles.btn, styles.cancelBtn]} onPress={closeModal}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[styles.btn, styles.saveBtn, isSubmitting && { opacity: 0.7 }]} onPress={onSave} disabled={isSubmitting}>
                        <Text style={styles.saveBtnText}>{isSubmitting ? 'Saving...' : 'Save Item'}</Text>
                    </Pressable>
                </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      <CalendarModal
        visible={showCalendar}
        initialDate={purchaseDate}
        onClose={() => setShowCalendar(false)}
        onSelectDate={(date) => {
            setPurchaseDate(date);
            setShowCalendar(false);
        }}
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
  chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
  },
  catChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: 'white',
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
  },
  typeToggle: {
      flexDirection: 'row',
      backgroundColor: Palette.background,
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
  },
  typeBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
  },
  typeBtnActive: {
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
  },
  typeBtnText: {
      fontFamily: 'Outfit-SemiBold',
      color: Palette.textSecondary,
      fontSize: 14,
  },
  typeBtnTextActive: {
      color: Palette.primary,
  },
  helperText: {
      fontSize: 12,
      color: Palette.textSecondary,
      fontFamily: 'Outfit',
      marginTop: 6,
      marginLeft: 4,
  },
  optionalText: {
      fontSize: 12,
      color: Palette.textSecondary,
      fontFamily: 'Outfit',
      fontWeight: 'normal',
  },
  sectionTitle: {
      fontSize: 16,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
      marginTop: 8,
      marginBottom: 0,
      borderTopWidth: 1,
      borderTopColor: Palette.border,
      paddingTop: 16,
  }
});
