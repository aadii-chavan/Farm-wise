import CalendarModal from '@/components/CalendarModal';
import { InventoryCard } from '@/components/InventoryCard';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { InventoryItem, InventoryUnit } from '@/types/farm';
import { getSecondaryUnit } from '@/utils/conversions';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
    Alert,
    DeviceEventEmitter,
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

const FIXED_UNITS: InventoryUnit[] = ['kg', 'gm', 'L', 'mL', 'bags'];
const INVENTORY_CATEGORIES = ['Seeds', 'Fertilizer', 'Pesticide', 'Fuel'];

export default function InventoryScreen() {
  const { inventory, addInventoryItem, updateInventoryQuantity, deleteInventoryItem, customEntities, addCustomEntity, transactions } = useFarm();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'stocks' | 'shops'>('stocks');

// No longer using navigation options for header add button to keep it clean with the toggle
  
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('FAB_OPEN_INVENTORY_MODAL', () => {
      setModalVisible(true);
    });
    return () => sub.remove();
  }, []);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  
  // Current Item Sub-form State
  const [currentItemName, setCurrentItemName] = useState('');
  const [currentItemCategory, setCurrentItemCategory] = useState('Seeds');
  const [currentCustomCategory, setCurrentCustomCategory] = useState('');
  const [isOtherCategoryItem, setIsOtherCategoryItem] = useState(false);
  const [currentNumPackages, setCurrentNumPackages] = useState('');
  const [currentSizePerPackage, setCurrentSizePerPackage] = useState('');
  const [currentUnit, setCurrentUnit] = useState<InventoryUnit>('kg');
  const [currentTotalCost, setCurrentTotalCost] = useState('');
  const [currentItemNote, setCurrentItemNote] = useState('');
  const [currentCompanyName, setCurrentCompanyName] = useState('');
  const [currentBatchNo, setCurrentBatchNo] = useState('');
  const [quantityInputMode, setQuantityInputMode] = useState<'package' | 'total'>('package');
  const [currentTotalQty, setCurrentTotalQty] = useState('');
  
  // Shared Batch Header States
  const [shopName, setShopName] = useState('');
  const [isOtherShop, setIsOtherShop] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');

  // Financial/Payment States
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Credit'>('Cash');
  const [interestRate, setInterestRate] = useState('');
  const [interestPeriod, setInterestPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [overallNote, setOverallNote] = useState('');
  
  const dynamicCategories = useMemo(() => {
     const storedCustom = customEntities
       .filter(e => e.entityType === 'category')
       .map(e => e.name);
     const existingItems = inventory
        .map(i => i.category)
        .filter(c => !INVENTORY_CATEGORIES.includes(c));
     
     const allCats = [...INVENTORY_CATEGORIES, ...storedCustom, ...existingItems];
     const uniqueCats = Array.from(new Set(allCats.filter(c => c !== 'Other')));
     uniqueCats.push('Other');
     return uniqueCats;
  }, [inventory, customEntities]);
  
  const dynamicShops = useMemo(() => {
    const stored = customEntities
      .filter(e => e.entityType === 'shop')
      .map(e => e.name.trim());
    const existing = inventory
      .map(i => i.shopName?.trim())
      .filter((s): s is string => !!s);
    
    // Case-insensitive uniqueness
    const seen = new Set<string>();
    const unique: string[] = [];
    [...stored, ...existing].forEach(s => {
        const lower = s.toLowerCase();
        if (!seen.has(lower)) {
            seen.add(lower);
            unique.push(s);
        }
    });

    return unique.sort((a, b) => a.localeCompare(b));
  }, [inventory, customEntities]);

  const shopProfiles = useMemo(() => {
    const shopsRaw: Record<string, typeof inventory> = {};
    const canonicalNames: Record<string, string> = {}; // lowercase -> original

    inventory.forEach(item => {
        if (item.shopName && item.shopName.trim() !== '') {
            const trimmed = item.shopName.trim();
            const lower = trimmed.toLowerCase();
            if (!shopsRaw[lower]) {
                shopsRaw[lower] = [];
                canonicalNames[lower] = trimmed;
            }
            shopsRaw[lower].push(item);
        }
    });

    return Object.keys(shopsRaw).map(lower => {
        const shopName = canonicalNames[lower];
        const items = shopsRaw[lower];
        const totalSpent = items.reduce((acc, it) => acc + (it.quantity * (it.pricePerUnit || 0)), 0);
        const creditItems = items.filter(i => i.paymentMode === 'Credit');
        const principalCredit = creditItems.reduce((acc, it) => acc + (it.quantity * (it.pricePerUnit || 0)), 0);
        const payments = transactions.filter(t => t.type === 'Expense' && t.category === 'Shop Payment' && t.title === shopName);
        const totalPayments = payments.reduce((acc, p) => acc + p.amount, 0);
        const currentCredit = Math.max(0, principalCredit - totalPayments);

        return {
            shopName,
            itemCount: items.length,
            totalSpent,
            currentCredit,
        };
    }).sort((a,b) => b.totalSpent - a.totalSpent);
  }, [inventory, transactions]);

  const handleEdit = (item: InventoryItem) => {
      // For editing single items, we bypass the batch system for now 
      // or we can allow editing within the batch. Given current single edit pattern:
      setEditingId(item.id);
      setCurrentItemName(item.name);
      
      const isKnown = dynamicCategories.includes(item.category);
      if (isKnown && item.category !== 'Other') {
          setCurrentItemCategory(item.category);
          setIsOtherCategoryItem(false);
          setCurrentCustomCategory('');
      } else {
          setCurrentItemCategory('Other');
          setIsOtherCategoryItem(true);
          setCurrentCustomCategory(item.category);
      }
      
      setCurrentNumPackages(item.numPackages ? item.numPackages.toString() : '');
      setCurrentSizePerPackage(item.sizePerPackage ? item.sizePerPackage.toString() : '');
      setCurrentUnit(item.unit);
      setCurrentTotalCost(item.pricePerUnit ? (item.pricePerUnit * item.quantity).toString() : '');
      
      setShopName(item.shopName || '');
      setIsOtherShop(item.shopName ? !dynamicShops.includes(item.shopName) : false);
      setCurrentCompanyName(item.companyName || '');
      setCurrentBatchNo(item.batchNo || '');
      setInvoiceNo(item.invoiceNo || '');
      setCurrentItemNote(item.note || '');
      setPurchaseDate(item.purchaseDate ? new Date(item.purchaseDate) : new Date());
      
      setIsAddingItem(true); // Jump straight to item form
      setModalVisible(true);
  };
  const addItemToBatch = () => {

      if (!currentItemName) {
          Alert.alert("Missing Info", "Please provide Item Name.");
          return;
      }
      
      let finalQty = 0;
      let numP = quantityInputMode === 'package' ? parseFloat(currentNumPackages) : undefined;
      let sizeP = quantityInputMode === 'package' ? parseFloat(currentSizePerPackage) : parseFloat(currentTotalQty);
      
      if (quantityInputMode === 'package') {
          if (!currentNumPackages || !currentSizePerPackage) {
              Alert.alert("Missing Info", "Please provide Number of Packages and Size per Package.");
              return;
          }
          finalQty = parseFloat(currentNumPackages) * parseFloat(currentSizePerPackage);
          numP = parseFloat(currentNumPackages);
          sizeP = parseFloat(currentSizePerPackage);
      } else {
          if (!currentTotalQty) {
              Alert.alert("Missing Info", "Please provide Total Quantity.");
              return;
          }
          finalQty = parseFloat(currentTotalQty);
          numP = 1; // Direct total
          sizeP = finalQty;
      }
      
      const finalCat = isOtherCategoryItem ? currentCustomCategory : currentItemCategory;
      const tc = currentTotalCost ? parseFloat(currentTotalCost) : 0;
      const calcPricePerUnit = tc > 0 ? (tc / finalQty) : undefined;
      const itemData = {
          name: currentItemName,
          category: finalCat,
          quantity: finalQty,
          numPackages: numP,
          sizePerPackage: sizeP,
          unit: currentUnit,
          pricePerUnit: calcPricePerUnit,
          companyName: currentCompanyName,
          batchNo: currentBatchNo,
          note: currentItemNote,
      };

      setPendingItems(prev => [...prev, itemData]);
      
      // Save new category if persistent
      if (isOtherCategoryItem && currentCustomCategory) {
          addCustomEntity('category', currentCustomCategory);
      }
      
      // Clear sub-form
      setCurrentItemName('');
      setCurrentNumPackages('');
      setCurrentSizePerPackage('');
      setCurrentTotalCost('');
      setCurrentItemNote('');
      setCurrentCompanyName('');
      setCurrentBatchNo('');
      setIsAddingItem(false);
  };

  const renderUnitCosts = () => {
    const qty = quantityInputMode === 'package' 
        ? parseFloat(currentNumPackages || '0') * parseFloat(currentSizePerPackage || '0')
        : parseFloat(currentTotalQty || '0');
        
    const cost = parseFloat(currentTotalCost || '0');
    if (qty <= 0 || cost <= 0) return null;

    const pricePerPrimary = cost / qty;
    const secondaryUnit = getSecondaryUnit(currentUnit);
    
    // For Kg -> Gm, we divide price by 1000
    // For Gm -> Kg, we multiply by 1000
    let pricePerSecondary = 0;
    if (secondaryUnit) {
        if (currentUnit === 'kg' || currentUnit === 'L') pricePerSecondary = pricePerPrimary / 1000;
        else if (currentUnit === 'gm' || currentUnit === 'mL') pricePerSecondary = pricePerPrimary * 1000;
    }

    return (
        <View style={styles.costBreakdown}>
            <View style={styles.costRow}>
                <Text style={styles.costLabel}>Cost per {currentUnit}:</Text>
                <Text style={styles.costValue}>₹ {pricePerPrimary.toFixed(2)}</Text>
            </View>
            {secondaryUnit && (
                <View style={[styles.costRow, { marginTop: 4 }]}>
                    <Text style={styles.costLabelSecondary}>Cost per {secondaryUnit}:</Text>
                    <Text style={styles.costValueSecondary}>₹ {pricePerSecondary.toFixed(pricePerSecondary < 1 ? 4 : 2)}</Text>
                </View>
            )}
        </View>
    );
  };

  const closeModal = () => {
      setModalVisible(false);
      setEditingId(null);
      setPendingItems([]);
      setIsAddingItem(false);
  };

  const resetBatchForm = () => {
    setPendingItems([]);
    setShopName('');
    setInvoiceNo('');
    setOverallNote('');
    setPaymentMode('Cash');
    setInterestRate('');
    setInterestPeriod('month');
  };

  const onSave = async () => {
    if (isSubmitting) return;
    
    // If we are currently editing a single item from the list, just save that
    if (editingId && isAddingItem) {
        setIsSubmitting(true);
        try {
            const finalCategory = isOtherCategoryItem ? currentCustomCategory : currentItemCategory;
            const finalQty = parseFloat(currentNumPackages) * parseFloat(currentSizePerPackage);
            const tc = currentTotalCost ? parseFloat(currentTotalCost) : 0;
            const calcPricePerUnit = tc > 0 ? (tc / finalQty) : undefined;

            await addInventoryItem({
                id: editingId,
                name: currentItemName,
                category: finalCategory,
                quantity: finalQty,
                numPackages: parseFloat(currentNumPackages),
                sizePerPackage: parseFloat(currentSizePerPackage),
                unit: currentUnit,
                pricePerUnit: calcPricePerUnit,
                shopName: shopName.trim() || undefined,
                companyName: currentCompanyName || undefined,
                batchNo: currentBatchNo || undefined,
                invoiceNo: invoiceNo || undefined,
                note: currentItemNote || undefined,
                purchaseDate: purchaseDate.toISOString(),
                paymentMode,
                interestRate: paymentMode === 'Credit' ? parseFloat(interestRate) : undefined,
                interestPeriod: paymentMode === 'Credit' ? interestPeriod : undefined,
            });
            closeModal();
            return;
        } finally {
            setIsSubmitting(false);
        }
    }

    if (pendingItems.length === 0) {
        Alert.alert("No Items", "Please add at least one item to save.");
        return;
    }

    setIsSubmitting(true);
    try {
      const batchId = Date.now().toString();
      
      for (const item of pendingItems) {
        await addInventoryItem({
          ...item,
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          shopName: shopName.trim() || undefined,
          invoiceNo: invoiceNo || undefined,
          purchaseDate: purchaseDate.toISOString(),
          paymentMode,
          interestRate: paymentMode === 'Credit' ? parseFloat(interestRate) : undefined,
          interestPeriod: paymentMode === 'Credit' ? interestPeriod : undefined,
          batchId,
          note: (item.note ? item.note + ' | ' : '') + overallNote,
        });
      }

      if (shopName.trim() && isOtherShop) {
          addCustomEntity('shop', shopName.trim());
      }

      closeModal();
      resetBatchForm();
    } catch (error) {
        console.error("Failed to save inventory batch", error);
        Alert.alert("Error", "Could not save supplies.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectCategory = (cat: string) => {
    setIsOtherCategoryItem(false);
    setCurrentItemCategory(cat);
  };

  return (
    <View style={styles.container}>
      {/* Professional Tab Toggle */}
      <View style={styles.headerToggleContainer}>
        <View style={styles.toggleWrapper}>
            <Pressable 
                style={[styles.toggleBtn, activeTab === 'stocks' && styles.toggleBtnActive]} 
                onPress={() => setActiveTab('stocks')}
            >
                <Ionicons name="cube" size={18} color={activeTab === 'stocks' ? 'white' : Palette.textSecondary} />
                <Text style={[styles.toggleBtnText, activeTab === 'stocks' && styles.toggleBtnTextActive]}>Stocks</Text>
            </Pressable>
            <Pressable 
                style={[styles.toggleBtn, activeTab === 'shops' && styles.toggleBtnActive]} 
                onPress={() => setActiveTab('shops')}
            >
                <Ionicons name="business" size={18} color={activeTab === 'shops' ? 'white' : Palette.textSecondary} />
                <Text style={[styles.toggleBtnText, activeTab === 'shops' && styles.toggleBtnTextActive]}>Shops</Text>
            </Pressable>
        </View>
        <Pressable 
          onPress={() => setModalVisible(true)} 
          style={styles.headerAddBtn}
        >
          <Ionicons name="add" size={24} color="white" />
        </Pressable>
      </View>

      {activeTab === 'stocks' ? (
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
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
            {shopProfiles.map(shop => (
                <Pressable 
                   key={shop.shopName} 
                   style={styles.shopCard}
                   onPress={() => router.push({ pathname: '/shop-detail', params: { name: shop.shopName } })}
                >
                    <View style={styles.shopIconCircle}>
                        <Ionicons name="storefront" size={20} color={Palette.primary} />
                    </View>
                    
                    <View style={styles.shopDetails}>
                        <Text style={styles.shopCardName}>{shop.shopName}</Text>
                        <Text style={styles.shopItemCount}>{shop.itemCount} {shop.itemCount === 1 ? 'Item' : 'Items'}</Text>
                        {shop.currentCredit > 0 && (
                             <Text style={styles.shopCreditText}>
                                Outstanding Credit: ₹{shop.currentCredit.toLocaleString('en-IN')}
                             </Text>
                        )}
                    </View>

                    <View style={styles.shopMetricsColumn}>
                        <View style={styles.shopMetricDisplay}>
                            <Text style={styles.shopMetricValue}>₹{shop.totalSpent.toLocaleString('en-IN')}</Text>
                            <Text style={styles.shopMetricLabel}>Total Value</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Palette.textSecondary} style={{ marginTop: 8 }} />
                    </View>
                </Pressable>
            ))}
            
            {shopProfiles.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="business-outline" size={64} color={Palette.textSecondary + '40'} />
                    <Text style={styles.emptyText}>No shops recorded yet.</Text>
                </View>
            )}
        </ScrollView>
      )}

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
                    <Text style={styles.modalTitle}>{editingId ? 'Edit Supply' : 'Add Supplies'}</Text>
                
                {/* SHARED TRACKING INFO - TOP */}
                <View style={styles.sharedInfoSection}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Shop Name</Text>
                        <View style={styles.chipContainer}>
                            {dynamicShops.map(s => (
                                <Pressable 
                                    key={s} 
                                    onPress={() => { setIsOtherShop(false); setShopName(s); }}
                                    style={[styles.catChip, (shopName === s && !isOtherShop) && styles.catChipActive]}
                                >
                                    <Text style={[styles.catChipText, (shopName === s && !isOtherShop) && styles.catChipTextActive]}>{s}</Text>
                                </Pressable>
                            ))}
                            {isOtherShop ? (
                                <TextInput 
                                    style={[styles.catChip, { minWidth: 100, color: Palette.text, fontFamily: 'Outfit' }]}
                                    autoFocus
                                    placeholder="New..."
                                    value={shopName}
                                    onChangeText={setShopName}
                                    onBlur={() => { if (!shopName.trim()) setIsOtherShop(false); }}
                                />
                            ) : (
                                <Pressable onPress={() => { setIsOtherShop(true); setShopName(''); }} style={[styles.catChip, { borderStyle: 'dashed' }]}>
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
                            <Text style={styles.label}>Purchase Date</Text>
                            <Pressable style={[styles.input, { justifyContent: 'center' }]} onPress={() => setShowCalendar(true)}>
                                <Text style={{ fontFamily: 'Outfit', color: Palette.text }}>{format(purchaseDate, 'dd MMM yyyy')}</Text>
                            </Pressable>
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                            <Text style={styles.label}>Invoice No.</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="INV-..." 
                                value={invoiceNo}
                                onChangeText={setInvoiceNo}
                            />
                        </View>
                    </View>
                </View>

                {/* CURRENT BATCH ITEMS */}
                <View style={styles.batchListContainer}>
                    <Text style={[styles.label, { marginBottom: 12 }]}>Items in this purchase</Text>
                    {pendingItems.map((item, idx) => (
                        <View key={idx} style={styles.pendingItemRow}>
                            <View>
                                <Text style={styles.pendingItemName}>{item.name}</Text>
                                <Text style={styles.pendingItemMeta}>{item.numPackages} x {item.sizePerPackage} {item.unit} • ₹{item.pricePerUnit ? (item.pricePerUnit * item.quantity).toLocaleString() : '0'}</Text>
                            </View>
                            <Pressable onPress={() => setPendingItems(prev => prev.filter((_, i) => i !== idx))}>
                                <Ionicons name="trash-outline" size={20} color={Palette.danger} />
                            </Pressable>
                        </View>
                    ))}

                    {!isAddingItem && !editingId && (
                        <Pressable style={styles.addItemBtn} onPress={() => setIsAddingItem(true)}>
                            <Ionicons name="add-circle-outline" size={24} color={Palette.primary} />
                            <Text style={styles.addItemBtnText}>Add Item</Text>
                        </Pressable>
                    )}
                </View>

                {/* ITEM SUB-FORM */}
                {(isAddingItem || editingId) && (
                    <View style={styles.itemSubForm}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIndicator} />
                            <Text style={styles.subFormTitle}>{editingId ? 'Edit Item' : 'New Item Details'}</Text>
                        </View>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Item Name</Text>
                            <TextInput style={styles.input} placeholder="e.g. Urea" value={currentItemName} onChangeText={setCurrentItemName} />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.chipContainer}>
                                {dynamicCategories.map(cat => (
                                    <Pressable 
                                        key={cat} 
                                        onPress={() => selectCategory(cat)}
                                        style={[styles.catChip, (currentItemCategory === cat && !isOtherCategoryItem) && styles.catChipActive]}
                                    >
                                        <Text style={[styles.catChipText, (currentItemCategory === cat && !isOtherCategoryItem) && styles.catChipTextActive]}>{cat}</Text>
                                    </Pressable>
                                ))}
                                {isOtherCategoryItem ? (
                                    <TextInput 
                                        style={[styles.catChip, { minWidth: 100, color: Palette.text, fontFamily: 'Outfit' }]}
                                        autoFocus
                                        placeholder="New..."
                                        value={currentCustomCategory}
                                        onChangeText={setCurrentCustomCategory}
                                    />
                                ) : (
                                    <Pressable 
                                        onPress={() => { setIsOtherCategoryItem(true); setCurrentCustomCategory(''); setCurrentItemCategory('Other'); }}
                                        style={[styles.catChip, { borderStyle: 'dashed' }]}
                                    >
                                        <Ionicons name="add" size={16} color={Palette.textSecondary} />
                                        <Text style={[styles.catChipText, { marginLeft: 2 }]}>New</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Quantity Entry Mode</Text>
                            <View style={styles.typeToggleCompact}>
                                <Pressable 
                                    onPress={() => setQuantityInputMode('package')}
                                    style={[styles.typeBtn, quantityInputMode === 'package' && styles.typeBtnActive]}
                                >
                                    <Text style={[styles.typeBtnText, quantityInputMode === 'package' && styles.typeBtnTextActive]}>By Packages</Text>
                                </Pressable>
                                <Pressable 
                                    onPress={() => setQuantityInputMode('total')}
                                    style={[styles.typeBtn, quantityInputMode === 'total' && styles.typeBtnActive]}
                                >
                                    <Text style={[styles.typeBtnText, quantityInputMode === 'total' && styles.typeBtnTextActive]}>Total Quantity</Text>
                                </Pressable>
                            </View>
                        </View>

                        {quantityInputMode === 'package' ? (
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Bags / Bottles</Text>
                                    <TextInput style={styles.input} placeholder="Qty" value={currentNumPackages} onChangeText={setCurrentNumPackages} keyboardType="numeric" />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                                    <Text style={styles.label}>Size per Bag</Text>
                                    <TextInput style={styles.input} placeholder="Size" value={currentSizePerPackage} onChangeText={setCurrentSizePerPackage} keyboardType="numeric" />
                                </View>
                            </View>
                        ) : (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Total Quantity</Text>
                                <TextInput style={styles.input} placeholder="e.g. 500" value={currentTotalQty} onChangeText={setCurrentTotalQty} keyboardType="numeric" />
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Unit</Text>
                            <View style={styles.unitToggleContainer}>
                                {FIXED_UNITS.map(u => (
                                    <Pressable key={u} onPress={() => setCurrentUnit(u)} style={[styles.unitChip, currentUnit === u && styles.unitChipActive]}>
                                        <Text style={[styles.unitChipText, currentUnit === u && styles.unitChipTextActive]}>{u}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Item Total Cost (₹)</Text>
                            <TextInput style={styles.input} placeholder="Total for this item" value={currentTotalCost} onChangeText={setCurrentTotalCost} keyboardType="numeric" />
                            {renderUnitCosts()}
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Company Name</Text>
                                <TextInput style={styles.input} placeholder="e.g. Bayer" value={currentCompanyName} onChangeText={setCurrentCompanyName} />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                                <Text style={styles.label}>Batch No.</Text>
                                <TextInput style={styles.input} placeholder="B-..." value={currentBatchNo} onChangeText={setCurrentBatchNo} />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Item Note</Text>
                            <TextInput style={styles.input} placeholder="Optional" value={currentItemNote} onChangeText={setCurrentItemNote} />
                        </View>

                        {!editingId && (
                            <Pressable style={styles.doneBtn} onPress={addItemToBatch}>
                                <Text style={styles.doneBtnText}>Done</Text>
                            </Pressable>
                        )}
                    </View>
                )}

                {/* PAYMENT & FINAL DETAILS */}
                {!isAddingItem && !editingId && pendingItems.length > 0 && (
                    <View style={styles.paymentSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIndicator} />
                            <Text style={styles.subFormTitle}>Payment Details</Text>
                        </View>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Payment Mode</Text>
                            <View style={styles.typeToggleCompact}>
                                <Pressable 
                                    onPress={() => setPaymentMode('Cash')}
                                    style={[styles.typeBtn, paymentMode === 'Cash' && styles.typeBtnActive]}
                                >
                                    <Text style={[styles.typeBtnText, paymentMode === 'Cash' && styles.typeBtnTextActive]}>Cash</Text>
                                </Pressable>
                                <Pressable 
                                    onPress={() => setPaymentMode('Credit')}
                                    style={[styles.typeBtn, paymentMode === 'Credit' && styles.typeBtnActiveCredit]}
                                >
                                    <Text style={[styles.typeBtnText, paymentMode === 'Credit' && styles.typeBtnTextActive]}>Credit</Text>
                                </Pressable>
                            </View>
                        </View>

                        {paymentMode === 'Credit' && (
                            <View style={styles.creditDetailsContainer}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Interest Rate</Text>
                                    <View style={styles.interestInputWrapper}>
                                        <TextInput 
                                            style={styles.interestInput} 
                                            placeholder="0.0" 
                                            value={interestRate} 
                                            onChangeText={setInterestRate} 
                                            keyboardType="numeric" 
                                        />
                                        <View style={styles.percentageBadge}>
                                            <Text style={styles.percentageText}>%</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={[styles.inputGroup, { flex: 2, marginLeft: 16 }]}>
                                    <Text style={styles.label}>Interest Period</Text>
                                    <View style={styles.periodSelector}>
                                        {['day', 'week', 'month', 'year'].map(p => (
                                            <Pressable 
                                                key={p} 
                                                onPress={() => setInterestPeriod(p as any)} 
                                                style={[
                                                    styles.periodButton, 
                                                    interestPeriod === p && styles.periodButtonActive
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.periodButtonText, 
                                                    interestPeriod === p && styles.periodButtonTextActive
                                                ]}>
                                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Final Bill Note / Remark</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Any special remarks for this purchase" 
                                value={overallNote} 
                                onChangeText={setOverallNote} 
                            />
                        </View>
                    </View>
                )}


                <View style={[styles.modalButtons, { borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: 20 }]}>
                    <Pressable style={[styles.btn, styles.cancelBtn]} onPress={closeModal}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[styles.btn, styles.saveBtn, (pendingItems.length === 0 && !editingId) && { opacity: 0.5 }]} onPress={onSave} disabled={isSubmitting}>
                        <Text style={styles.saveBtnText}>{isSubmitting ? 'Saving...' : (editingId ? 'Save Changes' : `Add Supplies (${pendingItems.length})`)}</Text>
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
    backgroundColor: '#F8FAFC',
  },
  headerToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  toggleWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: Palette.primary,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: Palette.textSecondary,
  },
  toggleBtnTextActive: {
    color: 'white',
  },
  headerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  shopCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  shopIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  shopDetails: {
    flex: 1,
  },
  shopCardName: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  shopItemCount: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontFamily: 'Outfit',
    marginTop: 2,
  },
  shopCreditText: {
    fontSize: 11,
    color: Palette.danger,
    fontFamily: 'Outfit-Medium',
    marginTop: 4,
  },
  shopMetricsColumn: {
    alignItems: 'flex-end',
  },
  shopMetricDisplay: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  shopMetricValue: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  shopMetricLabel: {
    fontSize: 9,
    fontFamily: 'Outfit-Medium',
    color: Palette.textSecondary,
    marginTop: -2,
    textTransform: 'uppercase',
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
  sharedInfoSection: {
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: Palette.border,
      paddingBottom: 20,
  },
  batchListContainer: {
      marginBottom: 20,
  },
  pendingItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: Palette.background,
      padding: 16,
      borderRadius: 16,
      marginBottom: 8,
  },
  pendingItemName: {
      fontSize: 16,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
  },
  pendingItemMeta: {
      fontSize: 13,
      fontFamily: 'Outfit',
      color: Palette.textSecondary,
      marginTop: 2,
  },
  addItemBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Palette.primary,
      borderStyle: 'dashed',
      marginTop: 8,
  },
  addItemBtnText: {
      marginLeft: 8,
      fontFamily: 'Outfit-Bold',
      color: Palette.primary,
      fontSize: 16,
  },
  itemSubForm: {
      backgroundColor: '#f8fafc',
      padding: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      marginBottom: 24,
  },
  subFormTitle: {
      fontSize: 18,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
      marginBottom: 16,
  },
  doneBtn: {
      backgroundColor: Palette.primary,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10,
  },
  doneBtnText: {
      color: 'white',
      fontFamily: 'Outfit-Bold',
      fontSize: 16,
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
  costBreakdown: {
      marginTop: 12,
      padding: 12,
      backgroundColor: '#f1f5f9',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
  },
  paymentSection: {
      marginTop: 24,
      backgroundColor: '#f8fafc',
      padding: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      marginBottom: 24,
  },
  typeToggleCompact: {
    flexDirection: 'row',
    backgroundColor: 'white',
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
  typeBtnActive: {
    backgroundColor: Palette.primary,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBtnActiveCredit: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBtnText: {
    fontFamily: 'Outfit-Bold',
    color: Palette.textSecondary,
    fontSize: 13,
  },
  typeBtnTextActive: {
    color: 'white',
  },
  creditDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  interestInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingRight: 8,
  },
  interestInput: {
    flex: 1,
    padding: 12,
    fontFamily: 'Outfit',
    color: Palette.text,
  },
  percentageBadge: {
    backgroundColor: Palette.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Palette.primary + '20',
  },
  percentageText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: Palette.primary,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodButtonActive: {
    backgroundColor: Palette.primary,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButtonText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 11,
    color: Palette.textSecondary,
  },
  periodButtonTextActive: {
    fontFamily: 'Outfit-Bold',
    color: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionIndicator: {
    width: 4,
    height: 18,
    backgroundColor: Palette.primary,
    borderRadius: 2,
  },
  costRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  costLabel: {
      fontFamily: 'Outfit-Medium',
      fontSize: 13,
      color: Palette.textSecondary,
  },
  costValue: {
      fontFamily: 'Outfit-Bold',
      fontSize: 15,
      color: Palette.primary,
  },
  costLabelSecondary: {
      fontFamily: 'Outfit',
      fontSize: 12,
      color: Palette.textSecondary,
  },
  costValueSecondary: {
      fontFamily: 'Outfit-Medium',
      fontSize: 13,
      color: Palette.textSecondary,
  },
});
