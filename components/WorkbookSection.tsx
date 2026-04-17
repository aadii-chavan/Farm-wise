import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { format, parse, addDays, differenceInDays, isValid } from 'date-fns';
import { CalendarModal } from './CalendarModal';

interface WorkbookSectionProps {
  plotId: string;
}

// Categories for the new inbuilt table
const WORKBOOK_CATEGORIES = ['Sowing', 'Fertilizer', 'Pesticide', 'Irrigation', 'Harvesting', 'Pruning', 'Plantation', 'Weeding', 'Tillage', 'Other'];

export const WorkbookSection: React.FC<WorkbookSectionProps> = ({ plotId }) => {
  const { 
    getWorkbookEntries, 
    saveWorkbookEntry, 
    deleteWorkbookEntry,
    rainRecords
  } = useFarm();
  
  const { width: screenWidth } = useWindowDimensions();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<any>({
      date: format(new Date(), 'dd/MM/yy'),
      daysPast: '0',
      category: '',
      description: '',
      rain: '',
      note: ''
  });

  // Calculate Reference Point (Earliest Entry)
  const referencePoint = useMemo(() => {
    if (entries.length === 0) return null;
    
    // Sort by date to find the earliest
    const sorted = [...entries].sort((a, b) => {
        try {
            const parseDate = (d: string) => d.includes('-') ? parse(d, 'yyyy-MM-dd', new Date()) : parse(d, 'dd/MM/yy', new Date());
            const dateA = parseDate(a.data.date);
            const dateB = parseDate(b.data.date);
            return dateA.getTime() - dateB.getTime();
        } catch (e) {
            return 0;
        }
    });
    
    const first = sorted[0];
    return {
        date: first.data.date.includes('-') ? parse(first.data.date, 'yyyy-MM-dd', new Date()) : parse(first.data.date, 'dd/MM/yy', new Date()),
        daysPast: parseInt(first.data.daysPast || '0')
    };
  }, [entries]);

  useEffect(() => {
    loadWorkbookData();
  }, [plotId]);

  const loadWorkbookData = async () => {
    setLoading(true);
    try {
      const data = await getWorkbookEntries(plotId);
      setEntries(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Logic to sync Rain, Date, and Days Past
  const syncFields = (updatedFields: Partial<any>) => {
    const newData = { ...formData, ...updatedFields };

    // 1. If Date changed, update Days Past and Rain
    if (updatedFields.date) {
        // Sync Rain
        try {
            const parseDate = (d: string) => d.includes('-') ? parse(d, 'yyyy-MM-dd', new Date()) : parse(d, 'dd/MM/yy', new Date());
            const targetDate = format(parseDate(updatedFields.date), 'yyyy-MM-dd');
            const rain = rainRecords.find(r => r.date === targetDate);
            newData.rain = rain ? rain.amount.toString() : '';
        } catch (e) {}

        // Sync Days Past if reference exists
        if (referencePoint) {
            try {
                const parseDate = (d: string) => d.includes('-') ? parse(d, 'yyyy-MM-dd', new Date()) : parse(d, 'dd/MM/yy', new Date());
                const current = parseDate(updatedFields.date);
                const diff = differenceInDays(current, referencePoint.date);
                newData.daysPast = (referencePoint.daysPast + diff).toString();
            } catch (e) {}
        }
    }

    // 2. If Days Past changed, update Date and Rain
    if (updatedFields.daysPast !== undefined && referencePoint) {
        try {
            const diffFromRef = parseInt(updatedFields.daysPast) - referencePoint.daysPast;
            const newDate = addDays(referencePoint.date, diffFromRef);
            if (isValid(newDate)) {
                newData.date = format(newDate, 'dd/MM/yy');
                
                // Sync Rain for the new date
                const targetDate = format(newDate, 'yyyy-MM-dd');
                const rain = rainRecords.find(r => r.date === targetDate);
                newData.rain = rain ? rain.amount.toString() : '';
            }
        } catch (e) {}
    }

    setFormData(newData);
  };

  const openEntryModal = (entry?: any) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData(entry.data || {});
    } else {
      setEditingEntry(null);
      const defaultData = {
          date: format(new Date(), 'dd/MM/yy'),
          daysPast: '0',
          category: '',
          description: '',
          rain: '',
          note: ''
      };
      
      // Pre-calculate daysPast for new entry based on today's date
      if (referencePoint) {
          const diff = differenceInDays(new Date(), referencePoint.date);
          defaultData.daysPast = (referencePoint.daysPast + diff).toString();
      }

      // Pre-fill Rain
      const targetDate = format(new Date(), 'yyyy-MM-dd');
      const rain = rainRecords.find(r => r.date === targetDate);
      defaultData.rain = rain ? rain.amount.toString() : '';

      setFormData(defaultData);
    }
    setShowEntryModal(true);
  };

  const handleSaveEntry = async () => {
    const { date, daysPast, category, description } = formData;
    if (!date || !daysPast || !category || !description) {
      Alert.alert("Required Fields", "Please fill Date, Days Past, Category, and Description.");
      return;
    }

    try {
      await saveWorkbookEntry({
        ...(editingEntry?.id ? { id: editingEntry.id } : {}),
        plotId,
        data: formData
      });
      setShowEntryModal(false);
      loadWorkbookData();
    } catch (e) {
      Alert.alert("Error", "Failed to save record");
    }
  };

  const handleDeleteEntry = (id: string) => {
    Alert.alert("Delete Record", "Are you sure you want to remove this entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteWorkbookEntry(id);
        loadWorkbookData();
      }}
    ]);
  };

  // Sort entries for the table (Earliest to Latest)
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
        try {
            const parseDate = (d: string) => d.includes('-') ? parse(d, 'yyyy-MM-dd', new Date()) : parse(d, 'dd/MM/yy', new Date());
            const dateA = parseDate(a.data.date);
            const dateB = parseDate(b.data.date);
            return dateA.getTime() - dateB.getTime();
        } catch (e) {
            return 0;
        }
    });
  }, [entries]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Palette.primary} />
        <Text style={styles.loadingText}>Loading Workbook...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
            <Text style={styles.title}>Workbook</Text>
            <Text style={styles.subtitle}>Daily logs & tracking</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => openEntryModal()}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>Add Entry</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.headerCell, { width: 50 }]}>
              <Text style={styles.headerText}>Sr.</Text>
            </View>
            <View style={[styles.headerCell, { width: 100 }]}>
              <Text style={styles.headerText}>Date</Text>
            </View>
            <View style={[styles.headerCell, { width: 80 }]}>
              <Text style={styles.headerText}>Days</Text>
            </View>
            <View style={[styles.headerCell, { width: 120 }]}>
              <Text style={styles.headerText}>Category</Text>
            </View>
            <View style={[styles.headerCell, { width: 200 }]}>
              <Text style={styles.headerText}>Description</Text>
            </View>
            <View style={[styles.headerCell, { width: 70 }]}>
              <Text style={styles.headerText}>Rain</Text>
            </View>
            <View style={[styles.headerCell, { width: 150 }]}>
              <Text style={styles.headerText}>Note</Text>
            </View>
            <View style={[styles.headerCell, { width: 80 }]}>
              <Text style={styles.headerText}>Actions</Text>
            </View>
          </View>

          {/* Table Body */}
          {sortedEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="journal-outline" size={48} color={Palette.textSecondary + '20'} />
              <Text style={styles.emptyText}>No entries recorded for this plot.</Text>
            </View>
          ) : (
            sortedEntries.map((entry, index) => (
              <View key={entry.id} style={styles.tableRow}>
                <View style={[styles.cell, { width: 50 }]}>
                  <Text style={styles.cellText}>{index + 1}</Text>
                </View>
                <View style={[styles.cell, { width: 100 }]}>
                  <Text style={styles.cellText}>
                    {entry.data.date && entry.data.date.includes('-') 
                      ? format(parse(entry.data.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yy')
                      : entry.data.date}
                  </Text>
                </View>
                <View style={[styles.cell, { width: 80 }]}>
                  <Text style={styles.cellText}>{entry.data.daysPast}</Text>
                </View>
                <View style={[styles.cell, { width: 120 }]}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{entry.data.category}</Text>
                  </View>
                </View>
                <View style={[styles.cell, { width: 200 }]}>
                  <Text style={styles.cellText} numberOfLines={2}>{entry.data.description}</Text>
                </View>
                <View style={[styles.cell, { width: 70 }]}>
                  <Text style={styles.cellText}>{entry.data.rain ? `${entry.data.rain}mm` : '-'}</Text>
                </View>
                <View style={[styles.cell, { width: 150 }]}>
                  <Text style={styles.cellText} numberOfLines={1}>{entry.data.note || '-'}</Text>
                </View>
                <View style={[styles.cell, { width: 80, flexDirection: 'row', gap: 12 }]}>
                  <TouchableOpacity onPress={() => openEntryModal(entry)}>
                    <Ionicons name="create-outline" size={18} color={Palette.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)}>
                    <Ionicons name="trash-outline" size={18} color={Palette.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Entry Modal */}
      <Modal visible={showEntryModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalRoot}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>{editingEntry ? 'Edit Record' : 'Add New Record'}</Text>
                            <Text style={styles.modalSubtitle}>Table row auto-syncs rain & days past</Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowEntryModal(false)}>
                            <Ionicons name="close" size={24} color={Palette.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        style={styles.formContent} 
                        contentContainerStyle={styles.formContentContainer}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1.5, marginRight: 12 }]}>
                                <Text style={styles.label}>Date *</Text>
                                <TouchableOpacity 
                                    style={styles.input}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.inputText}>{formData.date}</Text>
                                    <Ionicons name="calendar-outline" size={18} color={Palette.primary} />
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Days Past *</Text>
                                <TextInput 
                                    style={styles.input}
                                    value={formData.daysPast}
                                    onChangeText={(val) => syncFields({ daysPast: val })}
                                    keyboardType="numeric"
                                    placeholder="0"
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Category *</Text>
                            <TouchableOpacity 
                                style={styles.input}
                                onPress={() => setShowCategoryPicker(true)}
                            >
                                <Text style={[styles.inputText, !formData.category && { color: Palette.textSecondary + '60' }]}>
                                    {formData.category || 'Select category...'}
                                </Text>
                                <Ionicons name="chevron-down" size={18} color={Palette.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Description *</Text>
                            <TextInput 
                                style={styles.input}
                                value={formData.description}
                                onChangeText={(val) => setFormData({...formData, description: val})}
                                placeholder="Details of the activity..."
                            />
                        </View>

                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Rain (mm)</Text>
                                <TextInput 
                                    style={styles.input}
                                    value={formData.rain}
                                    onChangeText={(val) => setFormData({...formData, rain: val})}
                                    keyboardType="numeric"
                                    placeholder="0"
                                />
                            </View>
                            <View style={{ flex: 1.5, marginLeft: 12, justifyContent: 'center', paddingTop: 10 }}>
                                <Text style={styles.helperText}>Auto-filled from Rain Meter</Text>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Additional Note</Text>
                            <TextInput 
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                value={formData.note}
                                onChangeText={(val) => setFormData({...formData, note: val})}
                                placeholder="Any extra remarks..."
                                multiline
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveEntry}>
                            <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.saveButtonText}>Save Record</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setShowCategoryPicker(false)}>
            <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select Category</Text>
                </View>
                <ScrollView>
                    {WORKBOOK_CATEGORIES.map(cat => (
                        <TouchableOpacity 
                            key={cat} 
                            style={styles.pickerItem}
                            onPress={() => {
                                setFormData({...formData, category: cat});
                                setShowCategoryPicker(false);
                            }}
                        >
                            <Text style={styles.pickerItemText}>{cat}</Text>
                            {formData.category === cat && <Ionicons name="checkmark" size={20} color={Palette.primary} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </Pressable>
      </Modal>

      <CalendarModal 
        visible={showDatePicker}
        initialDate={new Date()}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(date) => {
            syncFields({ date: format(date, 'dd/MM/yy') });
            setShowDatePicker(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  subtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    fontFamily: 'Outfit-Medium',
  },
  addButton: {
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    color: 'white',
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  table: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerCell: {
    padding: 14,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: 'white',
  },
  cell: {
    padding: 14,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: Palette.text,
  },
  categoryBadge: {
    backgroundColor: Palette.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: Palette.primary,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Palette.textSecondary,
    fontFamily: 'Outfit-Medium',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  emptyText: {
    marginTop: 12,
    color: Palette.textSecondary,
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontFamily: 'Outfit-Medium',
    marginTop: 2,
  },
  closeBtn: {
      padding: 4,
  },
  formContent: {
    flexGrow: 1,
  },
  formContentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    marginBottom: 10,
    color: Palette.text,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Outfit-Medium',
    color: Palette.text,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 15,
    fontFamily: 'Outfit-Medium',
    color: Palette.text,
  },
  helperText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontFamily: 'Outfit-Medium',
    fontStyle: 'italic',
  },
  modalFooter: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  saveButton: {
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveButtonText: {
    color: 'white',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  pickerContainer: {
      backgroundColor: 'white',
      width: '100%',
      borderRadius: 24,
      padding: 10,
      maxHeight: '70%',
  },
  pickerHeader: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
      alignItems: 'center',
  },
  pickerTitle: {
      fontSize: 16,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
  },
  pickerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: '#F8FAFC',
  },
  pickerItemText: {
      fontSize: 15,
      fontFamily: 'Outfit-Medium',
      color: Palette.text,
  }
});
