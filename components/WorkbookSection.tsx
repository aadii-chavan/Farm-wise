import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from './Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { WorkbookTemplate, WorkbookEntry, WorkbookColumn, WorkbookColumnType } from '@/types/farm';
import { CalendarModal } from './CalendarModal';

interface WorkbookSectionProps {
  plotId: string;
}

const COLUMN_TYPES: { label: string; value: WorkbookColumnType; icon: any }[] = [
  { label: 'Text', value: 'text', icon: 'text-outline' },
  { label: 'Number', value: 'number', icon: 'calculator-outline' },
  { label: 'Category', value: 'category', icon: 'grid-outline' },
  { label: 'Date', value: 'date', icon: 'calendar-outline' },
  { label: 'Time', value: 'time', icon: 'time-outline' },
  { label: 'Phone', value: 'phone', icon: 'call-outline' },
  { label: 'Note', value: 'note', icon: 'document-text-outline' },
];

const DEFAULT_CATEGORIES = ['Pruning', 'Sowing', 'Plantation'];

export const WorkbookSection: React.FC<WorkbookSectionProps> = ({ plotId }) => {
  const { 
    getWorkbookTemplate, 
    saveWorkbookTemplate, 
    getWorkbookEntries, 
    saveWorkbookEntry, 
    deleteWorkbookEntry,
    customEntities,
    addCustomEntity
  } = useFarm();
  
  const [template, setTemplate] = useState<WorkbookTemplate | null>(null);
  const [entries, setEntries] = useState<WorkbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkbookEntry | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<{ active: boolean; colId: string } | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState<{ active: boolean; colId: string } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Form State
  const [newEntryData, setNewEntryData] = useState<Record<string, any>>({});
  const [editingColumns, setEditingColumns] = useState<WorkbookColumn[]>([]);

  // Derived State
  const workbookCategories = useMemo(() => {
    const custom = customEntities
      .filter(e => e.entityType === 'workbook_category')
      .map(e => e.name);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...custom]));
  }, [customEntities]);

  useEffect(() => {
    loadWorkbookData();
  }, [plotId]);

  const loadWorkbookData = async () => {
    setLoading(true);
    try {
      const [tpl, data] = await Promise.all([
        getWorkbookTemplate(plotId),
        getWorkbookEntries(plotId)
      ]);
      setTemplate(tpl);
      setEntries(data);
    } catch (error) {
      console.error('Error loading workbook:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (editingColumns.length === 0) {
      Alert.alert("Wait", "Please add at least one column first.");
      return;
    }
    
    if (editingColumns.some(c => !c.name.trim())) {
      Alert.alert("Wait", "All columns must have a name.");
      return;
    }

    const tpl: Partial<WorkbookTemplate> = {
      id: template?.id,
      plotId,
      columns: editingColumns
    };

    await saveWorkbookTemplate(tpl);
    setShowTemplateModal(false);
    loadWorkbookData();
  };

  const handleSaveEntry = async () => {
    if (!template) return;

    for (const col of template.columns) {
      if (col.required && (!newEntryData[col.id] || newEntryData[col.id].toString().trim() === '')) {
        Alert.alert("Wait", `${col.name} is required.`);
        return;
      }
    }

    const entry: Partial<WorkbookEntry> = {
      id: editingEntry?.id,
      plotId,
      data: newEntryData
    };

    await saveWorkbookEntry(entry);
    setShowEntryModal(false);
    setNewEntryData({});
    setEditingEntry(null);
    loadWorkbookData();
  };

  const handleDeleteEntry = (id: string) => {
    Alert.alert("Delete Record", "Are you sure you want to delete this row?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteWorkbookEntry(id);
        loadWorkbookData();
      }}
    ]);
  };

  const addColumn = () => {
    const newCol: WorkbookColumn = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      type: 'text',
      required: false,
      order: editingColumns.length
    };
    setEditingColumns([...editingColumns, newCol]);
  };

  const removeColumn = (id: string) => {
    setEditingColumns(editingColumns.filter(c => c.id !== id));
  };

  const updateColumn = (id: string, updates: Partial<WorkbookColumn>) => {
    setEditingColumns(editingColumns.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const openEntryModal = (entry?: WorkbookEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setNewEntryData(entry.data);
    } else {
      setEditingEntry(null);
      setNewEntryData({});
    }
    setShowEntryModal(true);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (workbookCategories.includes(newCategoryName.trim())) {
      Alert.alert("Wait", "This category already exists.");
      return;
    }

    await addCustomEntity('workbook_category', newCategoryName.trim());
    if (showCategoryPicker) {
      setNewEntryData({ ...newEntryData, [showCategoryPicker.colId]: newCategoryName.trim() });
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
    setShowCategoryPicker(null);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={styles.loadingText}>Loading Workbook...</Text>
        </View>
      );
    }

    if (!template || template.columns.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="construct-outline" size={48} color={Palette.primary} />
          </View>
          <Text style={styles.emptyTitle}>Custom Workbook</Text>
          <Text style={styles.emptySubtitle}>Create your own custom table to track records for this plot exactly how you want.</Text>
          <TouchableOpacity 
            style={styles.setupButton}
            onPress={() => {
              setEditingColumns([]);
              setShowTemplateModal(true);
            }}
          >
            <Text style={styles.setupButtonText}>Setup Table Structure</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const sortedColumns = [...template.columns].sort((a,b) => a.order - b.order);

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.entriesCount}>{entries.length} Records</Text>
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={() => {
              setEditingColumns(template.columns);
              setShowTemplateModal(true);
            }}
          >
            <Ionicons name="settings-outline" size={16} color={Palette.primary} />
            <Text style={styles.manageButtonText}>Manage Columns</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              {sortedColumns.map(col => (
                <View key={col.id} style={[styles.columnHeader, { width: col.type === 'note' ? 200 : 120 }]}>
                  <Ionicons 
                    name={COLUMN_TYPES.find(t => t.value === col.type)?.icon || 'text-outline'} 
                    size={14} 
                    color={Palette.textSecondary} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.columnHeaderText}>{col.name}</Text>
                </View>
              ))}
              <View style={{ width: 60 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
              {entries.length === 0 ? (
                <View style={styles.noEntriesContainer}>
                  <Text style={styles.noEntriesText}>No records yet. Tap + to add one.</Text>
                </View>
              ) : (
                entries.map(entry => (
                  <Pressable 
                    key={entry.id} 
                    style={styles.tableRow}
                    onPress={() => openEntryModal(entry)}
                  >
                    {sortedColumns.map(col => (
                      <View key={col.id} style={[styles.cell, { width: col.type === 'note' ? 200 : 120 }]}>
                        <Text 
                          style={[styles.cellText, col.type === 'note' && { fontSize: 13 }]} 
                          numberOfLines={2}
                        >
                          {entry.data[col.id] || '-'}
                        </Text>
                      </View>
                    ))}
                    <View style={[styles.cell, { width: 60, flexDirection: 'row', justifyContent: 'flex-end' }]}>
                      <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)}>
                        <Ionicons name="trash-outline" size={18} color={Palette.danger + '80'} />
                      </TouchableOpacity>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>

        <TouchableOpacity 
          style={styles.fab}
          onPress={() => openEntryModal()}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}

      {/* MODALS */}
      
      {/* Template Manager */}
      <Modal visible={showTemplateModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Table Columns</Text>
            <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
              <Ionicons name="close" size={28} color={Palette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>Define what information you want to track for this plot.</Text>
            
            {editingColumns.map((col, index) => (
              <View key={col.id} style={styles.columnEditorCard}>
                <View style={styles.columnEditorHeader}>
                  <Text style={styles.columnEditorIndex}>Column #{index + 1}</Text>
                  <TouchableOpacity onPress={() => removeColumn(col.id)}>
                    <Ionicons name="trash-outline" size={20} color={Palette.danger} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.columnNameInput}
                  placeholder="Column Name (e.g. Date, Activity)"
                  value={col.name}
                  onChangeText={(val) => updateColumn(col.id, { name: val })}
                />

                <View style={styles.typeSelectorLabelRow}>
                  <Text style={styles.typeLabel}>Data Type</Text>
                </View>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeList}>
                  {COLUMN_TYPES.map(type => (
                    <TouchableOpacity 
                      key={type.value}
                      style={[
                        styles.typeItem, 
                        col.type === type.value && styles.activeTypeItem
                      ]}
                      onPress={() => updateColumn(col.id, { type: type.value })}
                    >
                      <Ionicons 
                        name={type.icon} 
                        size={16} 
                        color={col.type === type.value ? 'white' : Palette.textSecondary} 
                      />
                      <Text style={[
                        styles.typeItemText,
                        col.type === type.value && styles.activeTypeItemText
                      ]}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity 
                  style={styles.requiredToggle}
                  onPress={() => updateColumn(col.id, { required: !col.required })}
                >
                  <Ionicons 
                    name={col.required ? "checkbox" : "square-outline"} 
                    size={20} 
                    color={col.required ? Palette.primary : Palette.textSecondary} 
                  />
                  <Text style={styles.requiredToggleText}>Required Field</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addColumnButton} onPress={addColumn}>
              <Ionicons name="add-circle-outline" size={24} color={Palette.primary} />
              <Text style={styles.addColumnButtonText}>Add New Column</Text>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
          </ScrollView>

          <TouchableOpacity style={styles.saveTemplateButton} onPress={handleSaveTemplate}>
            <Text style={styles.saveTemplateButtonText}>Save Structure</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Entry Form */}
      <Modal visible={showEntryModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.entryModalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.entryModalRoot}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={styles.entryModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingEntry ? 'Edit Record' : 'Add Record'}</Text>
                <TouchableOpacity onPress={() => setShowEntryModal(false)}>
                  <Ionicons name="close" size={28} color={Palette.text} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.formScrollView}
                contentContainerStyle={styles.formScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {template?.columns.sort((a,b) => a.order - b.order).map(col => (
                  <View key={col.id} style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      {col.name} {col.required && <Text style={{ color: Palette.danger }}>*</Text>}
                    </Text>

                    {col.type === 'category' ? (
                      <TouchableOpacity 
                        style={styles.datePickerButton}
                        onPress={() => setShowCategoryPicker({ active: true, colId: col.id })}
                      >
                        <Text style={[styles.datePickerText, !newEntryData[col.id] && { color: Palette.textSecondary }]}>
                          {newEntryData[col.id] || 'Select Category'}
                        </Text>
                        <Ionicons name="caret-down" size={20} color={Palette.primary} />
                      </TouchableOpacity>
                    ) : col.type === 'date' ? (
                      <TouchableOpacity 
                        style={styles.datePickerButton}
                        onPress={() => setShowDatePicker({ active: true, colId: col.id })}
                      >
                        <Text style={[styles.datePickerText, !newEntryData[col.id] && { color: Palette.textSecondary }]}>
                          {newEntryData[col.id] || 'Select Date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={Palette.primary} />
                      </TouchableOpacity>
                    ) : (
                      <TextInput
                        style={[styles.formInput, col.type === 'note' && { height: 100, textAlignVertical: 'top' }]}
                        placeholder={`Enter ${col.name.toLowerCase()}`}
                        multiline={col.type === 'note'}
                        keyboardType={col.type === 'number' ? 'numeric' : col.type === 'phone' ? 'phone-pad' : 'default'}
                        value={newEntryData[col.id]?.toString()}
                        onChangeText={(val) => setNewEntryData({...newEntryData, [col.id]: val})}
                      />
                    )}
                  </View>
                ))}
              </ScrollView>

              <View style={styles.entryModalFooter}>
                <TouchableOpacity style={styles.saveEntryButton} onPress={handleSaveEntry}>
                  <Text style={styles.saveEntryButtonText}>Save Record</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={!!showCategoryPicker} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setShowCategoryPicker(null)}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Category</Text>
            </View>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {workbookCategories.map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  style={styles.pickerItem}
                  onPress={() => {
                    if (showCategoryPicker) {
                      setNewEntryData({ ...newEntryData, [showCategoryPicker.colId]: cat });
                      setShowCategoryPicker(null);
                    }
                  }}
                >
                  <Text style={styles.pickerItemText}>{cat}</Text>
                  {showCategoryPicker && newEntryData[showCategoryPicker.colId] === cat && (
                    <Ionicons name="checkmark" size={20} color={Palette.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {isAddingCategory ? (
              <View style={styles.addNewSection}>
                <TextInput
                  style={styles.newCatInput}
                  placeholder="Enter new category name"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  autoFocus
                />
                <View style={styles.newCatActions}>
                  <TouchableOpacity onPress={() => setIsAddingCategory(false)}>
                    <Text style={[styles.newCatButtonText, { color: Palette.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddCategory}>
                    <Text style={[styles.newCatButtonText, { color: Palette.primary }]}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.plusNewButton}
                onPress={() => setIsAddingCategory(true)}
              >
                <Ionicons name="add" size={20} color={Palette.primary} />
                <Text style={styles.plusNewButtonText}>(+ New)</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      <CalendarModal
        visible={!!showDatePicker}
        initialDate={new Date()}
        onClose={() => setShowDatePicker(null)}
        onSelectDate={(date) => {
          if (showDatePicker) {
            setNewEntryData({ ...newEntryData, [showDatePicker.colId]: date.toISOString().split('T')[0] });
            setShowDatePicker(null);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Palette.textSecondary,
    fontFamily: 'Outfit',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  entriesCount: {
    fontSize: 14,
    color: Palette.textSecondary,
    fontFamily: 'Outfit-Medium',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  manageButtonText: {
    fontSize: 12,
    color: Palette.primary,
    fontFamily: 'Outfit-Bold',
    marginLeft: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  columnHeaderText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: Palette.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  cell: {
    paddingHorizontal: 12,
  },
  cellText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Palette.text,
  },
  noEntriesContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noEntriesText: {
    color: Palette.textSecondary,
    fontFamily: 'Outfit',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Palette.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    fontFamily: 'Outfit',
    lineHeight: 20,
    marginBottom: 30,
  },
  setupButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  setupButtonText: {
    color: 'white',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 0,
    bottom: 20,
    backgroundColor: Palette.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  modalContent: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    fontFamily: 'Outfit',
    marginBottom: 20,
  },
  columnEditorCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  columnEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  columnEditorIndex: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    color: Palette.primary,
    textTransform: 'uppercase',
  },
  columnNameInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Outfit-Medium',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
  },
  typeSelectorLabelRow: {
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    color: Palette.textSecondary,
  },
  typeList: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTypeItem: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  typeItemText: {
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    color: Palette.textSecondary,
    marginLeft: 6,
  },
  activeTypeItemText: {
    color: 'white',
  },
  requiredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  requiredToggleText: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: Palette.text,
    marginLeft: 8,
  },
  addColumnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: Palette.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: Palette.primary + '05',
  },
  addColumnButtonText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: Palette.primary,
    marginLeft: 10,
  },
  saveTemplateButton: {
    backgroundColor: Palette.primary,
    margin: 20,
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveTemplateButtonText: {
    color: 'white',
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  entryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  entryModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  entryModalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '90%',
    flex: 1,
  },
  entryModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  formScrollView: {
    flex: 1,
  },
  formScrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Outfit',
    borderWidth: 1,
    borderColor: '#eee',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  datePickerText: {
    fontSize: 16,
    fontFamily: 'Outfit',
    color: Palette.text,
  },
  saveEntryButton: {
    backgroundColor: Palette.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveEntryButtonText: {
    color: 'white',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 30,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  pickerItemText: {
    fontSize: 15,
    fontFamily: 'Outfit',
    color: Palette.text,
  },
  plusNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  plusNewButtonText: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: Palette.primary,
    marginLeft: 8,
  },
  addNewSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  newCatInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Outfit',
    marginBottom: 12,
  },
  newCatActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
  },
  newCatButtonText: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
  },
});
