import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from './Themed';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/context/FarmContext';
import { WorkbookTemplate, WorkbookEntry, WorkbookColumn, WorkbookColumnType } from '@/types/farm';
import { CalendarModal } from './CalendarModal';
import { format } from 'date-fns';

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
          <Text style={styles.loadingText}>Syncing workbook data...</Text>
        </View>
      );
    }

    if (!template || template.columns.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIllustration}>
            <View style={styles.emptyInnerCircle}>
              <Ionicons name="book" size={40} color={Palette.primary} />
            </View>
            <View style={[styles.emptyOrbit, { transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.emptyOrbit, { transform: [{ rotate: '-45deg' }] }]} />
          </View>
          <Text style={styles.emptyTitle}>Personalized Tracking</Text>
          <Text style={styles.emptySubtitle}>Every farm is different. Create a custom structure to track the exact metrics that matter to you.</Text>
          <TouchableOpacity 
            style={styles.setupButton}
            onPress={() => {
              setEditingColumns([]);
              setShowTemplateModal(true);
            }}
          >
            <Ionicons name="sparkles" size={18} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.setupButtonText}>Start Building</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const sortedColumns = [...template.columns].sort((a,b) => a.order - b.order);

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
             <Text style={styles.subtitle}>Current Records</Text>
             <Text style={styles.entriesCount}>{entries.length} Rows</Text>
          </View>
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={() => {
              setEditingColumns(template.columns);
              setShowTemplateModal(true);
            }}
          >
            <Ionicons name="options-outline" size={18} color={Palette.primary} />
            <Text style={styles.manageButtonText}>Structure</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
          <View style={styles.tableWrapper}>
            {/* Elegant Table Header */}
            <View style={styles.tableHeader}>
              {sortedColumns.map(col => (
                <View key={col.id} style={[styles.columnHeader, { width: col.type === 'note' ? 240 : 130 }]}>
                    <View style={styles.columnIconBg}>
                        <Ionicons 
                            name={COLUMN_TYPES.find(t => t.value === col.type)?.icon || 'text-outline'} 
                            size={12} 
                            color={Palette.primary} 
                        />
                    </View>
                  <Text style={styles.columnHeaderText}>{col.name}</Text>
                </View>
              ))}
              <View style={{ width: 60 }} />
            </View>

            {/* Premium Table Content */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
              {entries.length === 0 ? (
                <View style={styles.noEntriesContainer}>
                   <View style={styles.noEntriesIcon}>
                      <Ionicons name="document-text-outline" size={32} color={Palette.textSecondary + '40'} />
                   </View>
                  <Text style={styles.noEntriesText}>No records found</Text>
                  <Text style={styles.noEntriesSub}>Use the button below to add your first row</Text>
                </View>
              ) : (
                entries.map((entry, index) => (
                  <Pressable 
                    key={entry.id} 
                    style={[styles.tableRow, index % 2 === 1 && { backgroundColor: Palette.primary + '05' }]}
                    onPress={() => openEntryModal(entry)}
                  >
                    {sortedColumns.map(col => (
                      <View key={col.id} style={[styles.cell, { width: col.type === 'note' ? 240 : 130 }]}>
                        <Text 
                          style={[
                            styles.cellText, 
                            col.type === 'note' && styles.noteText,
                            col.type === 'number' && styles.numberText,
                            !entry.data[col.id] && { color: Palette.textSecondary + '40' }
                          ]} 
                        >
                          {entry.data[col.id] || '—'}
                        </Text>
                      </View>
                    ))}
                    <View style={[styles.cell, { width: 60, flexDirection: 'row', justifyContent: 'center' }]}>
                      <TouchableOpacity 
                        onPress={() => handleDeleteEntry(entry.id)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash" size={16} color={Palette.danger + '80'} />
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
          <Ionicons name="add" size={32} color="white" />
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
            <View>
                <Text style={styles.modalTitle}>Structure Builder</Text>
                <Text style={styles.modalSubtitle}>Edit your table layout</Text>
            </View>
            <TouchableOpacity 
                style={styles.closeBtn}
                onPress={() => setShowTemplateModal(false)}
            >
              <Ionicons name="close" size={24} color={Palette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {editingColumns.map((col, index) => (
              <View key={col.id} style={styles.columnEditorCard}>
                <View style={styles.columnEditorHeader}>
                  <View style={styles.indexBadge}>
                    <Text style={styles.indexBadgeText}>{index + 1}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeBtn}
                    onPress={() => removeColumn(col.id)}
                  >
                    <Ionicons name="remove-circle" size={22} color={Palette.danger} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.columnNameInput}
                  placeholder="e.g. Activity Name"
                  placeholderTextColor={Palette.textSecondary + '60'}
                  value={col.name}
                  onChangeText={(val) => updateColumn(col.id, { name: val })}
                />

                <Text style={styles.typeLabel}>Data Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeList} contentContainerStyle={{ paddingRight: 20 }}>
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
                        size={14} 
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
                  <View style={[styles.checkbox, col.required && styles.checkboxActive]}>
                    {col.required && <Ionicons name="checkmark" size={14} color="white" />}
                  </View>
                  <Text style={styles.requiredToggleText}>Mandatory field</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addColumnButton} onPress={addColumn}>
              <Ionicons name="add-circle" size={22} color={Palette.primary} />
              <Text style={styles.addColumnButtonText}>Add Column</Text>
            </TouchableOpacity>

            <View style={{ height: 120 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveTemplateButton} onPress={handleSaveTemplate}>
                <Text style={styles.saveTemplateButtonText}>Update Structure</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Entry Form */}
      <Modal visible={showEntryModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.entryModalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.entryModalRoot}
          >
            <View style={styles.entryModalContainer}>
              <View style={styles.modalHeader}>
                <View>
                    <Text style={styles.modalTitle}>{editingEntry ? 'Edit Entry' : 'Log Entry'}</Text>
                    <Text style={styles.modalSubtitle}>Fill in the details below</Text>
                </View>
                <TouchableOpacity 
                    style={styles.closeBtn}
                    onPress={() => setShowEntryModal(false)}
                >
                  <Ionicons name="close" size={24} color={Palette.text} />
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
                        style={styles.formInputContainer}
                        onPress={() => setShowCategoryPicker({ active: true, colId: col.id })}
                      >
                        <Text style={[styles.datePickerText, !newEntryData[col.id] && { color: Palette.textSecondary + '60' }]}>
                          {newEntryData[col.id] || 'Select one...'}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={Palette.primary} />
                      </TouchableOpacity>
                    ) : col.type === 'date' ? (
                      <TouchableOpacity 
                        style={styles.formInputContainer}
                        onPress={() => setShowDatePicker({ active: true, colId: col.id })}
                      >
                        <Text style={[styles.datePickerText, !newEntryData[col.id] && { color: Palette.textSecondary + '60' }]}>
                          {newEntryData[col.id] || 'Choose Date'}
                        </Text>
                        <Ionicons name="calendar" size={18} color={Palette.primary} />
                      </TouchableOpacity>
                    ) : (
                      <TextInput
                        style={[
                            styles.formInput, 
                            col.type === 'note' && { height: 120, textAlignVertical: 'top' },
                            { color: Palette.text }
                        ]}
                        placeholder={`Enter ${col.name.toLowerCase()}`}
                        placeholderTextColor={Palette.textSecondary + '60'}
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
                    <Ionicons name="checkmark-circle" size={20} color="white" style={{marginRight: 8}} />
                    <Text style={styles.saveEntryButtonText}>Save Record</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Category Picker */}
      <Modal visible={!!showCategoryPicker} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setShowCategoryPicker(null)}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Option</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(null)}>
                  <Ionicons name="close" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
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
                    <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={14} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {isAddingCategory ? (
              <View style={styles.addNewSection}>
                <TextInput
                  style={styles.newCatInput}
                  placeholder="New category name"
                  placeholderTextColor={Palette.textSecondary + '60'}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  autoFocus
                />
                <View style={styles.newCatActions}>
                  <TouchableOpacity 
                    style={styles.cancelCatBtn}
                    onPress={() => setIsAddingCategory(false)}
                  >
                    <Text style={styles.cancelCatText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.addCatBtn}
                    onPress={handleAddCategory}
                  >
                    <Text style={styles.addCatText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.plusNewButton}
                onPress={() => setIsAddingCategory(true)}
              >
                <Ionicons name="add-circle" size={20} color={Palette.primary} />
                <Text style={styles.plusNewButtonText}>Create New</Text>
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
            setNewEntryData({ ...newEntryData, [showDatePicker.colId]: format(date, 'yyyy-MM-dd') });
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
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Palette.textSecondary,
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontFamily: 'Outfit-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  entriesCount: {
    fontSize: 20,
    color: Palette.text,
    fontFamily: 'Outfit-Bold',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.primary + '20',
  },
  manageButtonText: {
    fontSize: 13,
    color: Palette.primary,
    fontFamily: 'Outfit-Bold',
    marginLeft: 6,
  },
  tableWrapper: {
    borderRadius: 16,
    backgroundColor: 'white',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  columnIconBg: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: Palette.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  columnHeaderText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    minHeight: 56,
  },
  cell: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  cellText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: Palette.text,
    lineHeight: 20,
  },
  noteText: {
    fontSize: 13,
    color: '#475569',
  },
  numberText: {
      fontFamily: 'Outfit-Bold',
      color: Palette.primary,
  },
  deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: Palette.danger + '10',
      alignItems: 'center',
      justifyContent: 'center',
  },
  noEntriesContainer: {
    padding: 60,
    alignItems: 'center',
  },
  noEntriesIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
  },
  noEntriesText: {
    color: Palette.text,
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  noEntriesSub: {
      color: Palette.textSecondary,
      fontFamily: 'Outfit',
      fontSize: 13,
      marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyIllustration: {
      width: 120,
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 30,
  },
  emptyInnerCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: Palette.primary + '10',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
  },
  emptyOrbit: {
      position: 'absolute',
      width: 110,
      height: 60,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: Palette.primary + '20',
      borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    fontFamily: 'Outfit',
    lineHeight: 22,
    marginBottom: 34,
    paddingHorizontal: 20,
  },
  setupButton: {
    flexDirection: 'row',
    backgroundColor: Palette.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  setupButtonText: {
    color: 'white',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 4,
    bottom: 20,
    backgroundColor: Palette.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  // Modal UI Enhancements
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  modalTitle: {
    fontSize: 24,
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
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
  },
  modalContent: {
    padding: 20,
  },
  columnEditorCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  columnEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  indexBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: Palette.primary + '15',
  },
  indexBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: Palette.primary,
  },
  removeBtn: {
      padding: 4,
  },
  columnNameInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 16,
    color: Palette.text,
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    color: Palette.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeList: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTypeItem: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  typeItemText: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
    color: Palette.textSecondary,
    marginLeft: 8,
  },
  activeTypeItemText: {
    color: 'white',
  },
  requiredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 4,
  },
  checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: Palette.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
  },
  checkboxActive: {
      backgroundColor: Palette.primary,
      borderColor: Palette.primary,
  },
  requiredToggleText: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: Palette.text,
  },
  addColumnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: Palette.primary,
    borderStyle: 'dashed',
    borderRadius: 20,
    marginTop: 10,
    backgroundColor: Palette.primary + '05',
  },
  addColumnButtonText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: Palette.primary,
    marginLeft: 10,
  },
  modalFooter: {
      padding: 24,
      backgroundColor: 'white',
      borderTopWidth: 1,
      borderTopColor: Palette.border,
  },
  saveTemplateButton: {
    backgroundColor: Palette.primary,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  saveTemplateButtonText: {
    color: 'white',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  // Entry Form Enhancements
  entryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  entryModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  entryModalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  entryModalFooter: {
    paddingInline: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    backgroundColor: 'white',
  },
  formScrollView: {
    flex: 1,
  },
  formScrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  formInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  datePickerText: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: Palette.text,
  },
  saveEntryButton: {
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveEntryButtonText: {
    color: 'white',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  pickerItemText: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: Palette.text,
  },
  checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: Palette.primary,
      alignItems: 'center',
      justifyContent: 'center',
  },
  plusNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Palette.primary + '08',
  },
  plusNewButtonText: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: Palette.primary,
    marginLeft: 10,
  },
  addNewSection: {
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  newCatInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Outfit-Medium',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    color: Palette.text,
  },
  newCatActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
  },
  cancelCatBtn: {
      padding: 4,
  },
  cancelCatText: {
      fontSize: 14,
      fontFamily: 'Outfit-Bold',
      color: Palette.textSecondary,
  },
  addCatBtn: {
      padding: 4,
  },
  addCatText: {
      fontSize: 14,
      fontFamily: 'Outfit-Bold',
      color: Palette.primary,
  },
});
