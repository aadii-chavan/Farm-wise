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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { format, parse, addDays, differenceInDays, isValid } from 'date-fns';
import { CalendarModal } from './CalendarModal';

interface WorkbookSectionProps {
  plotId: string;
}

// Categories for the new inbuilt table
const WORKBOOK_CATEGORIES = ['Sowing', 'Fertilizer', 'Pesticide', 'Irrigation', 'Harvesting', 'Pruning', 'Plantation', 'Weeding', 'Tillage', 'Other'];

const CATEGORY_STYLES: Record<string, { color: string, icon: string }> = {
  'Sowing': { color: '#4CAF50', icon: 'seed-outline' },
  'Fertilizer': { color: '#FF9800', icon: 'flask-outline' },
  'Pesticide': { color: '#F44336', icon: 'bug-outline' },
  'Irrigation': { color: '#2196F3', icon: 'water-outline' },
  'Harvesting': { color: '#9C27B0', icon: 'food-apple-outline' },
  'Pruning': { color: '#795548', icon: 'content-cut' },
  'Plantation': { color: '#009688', icon: 'tree-outline' },
  'Weeding': { color: '#E91E63', icon: 'grass' },
  'Tillage': { color: '#607D8B', icon: 'shovel' },
  'Other': { color: '#9E9E9E', icon: 'dots-horizontal' }
};

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

  const handleDownloadPDF = async () => {
    try {
        const plotName = "Farm Wise Plot"; // Ideal would be to pass plot name too
        const tableRows = sortedEntries.map((entry, index) => `
            <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${index + 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${entry.data.date && entry.data.date.includes('-') ? format(parse(entry.data.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yy') : entry.data.date}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${entry.data.daysPast}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${entry.data.category}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${entry.data.description}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #2563eb;">${entry.data.rain || '-'} mm</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${entry.data.note || '-'}</td>
            </tr>
        `).join('');

        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #1e293b; }
                        .header { border-bottom: 2px solid #006d5b; padding-bottom: 10px; margin-bottom: 20px; }
                        h1 { color: #006d5b; margin: 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                        th { background-color: #006d5b; color: white; padding: 12px 10px; text-align: left; text-transform: uppercase; }
                        .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Farm Wise: Workbook Report</h1>
                        <p>Plot Activity Log | Generated on ${format(new Date(), 'dd MMM yyyy')}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Sr.</th>
                                <th>Date</th>
                                <th>Days</th>
                                <th>Activity</th>
                                <th>Description</th>
                                <th>Rain</th>
                                <th>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                    <div class="footer">
                        <p>Farm Wise - Professional Agricultural Management</p>
                    </div>
                </body>
            </html>
        `;

        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Workbook Report' });
    } catch (e) {
        Alert.alert("Error", "Failed to generate PDF");
    }
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
        <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={handleDownloadPDF}
            >
              <Ionicons name="cloud-download-outline" size={22} color={Palette.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => openEntryModal()}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.headerCell, { width: 40 }]}>
              <Text style={styles.headerText}>Sr.</Text>
            </View>
            <View style={[styles.headerCell, { width: 70 }]}>
              <Text style={styles.headerText}>Day</Text>
            </View>
            <View style={[styles.headerCell, { width: 100 }]}>
              <Text style={styles.headerText}>Date</Text>
            </View>
            <View style={[styles.headerCell, { width: 130 }]}>
              <Text style={styles.headerText}>Activity</Text>
            </View>
            <View style={[styles.headerCell, { width: 200 }]}>
              <Text style={styles.headerText}>Description</Text>
            </View>
            <View style={[styles.headerCell, { width: 70 }]}>
              <Text style={styles.headerText}>Rain</Text>
            </View>
            <View style={[styles.headerCell, { width: 130 }]}>
              <Text style={styles.headerText}>Observations</Text>
            </View>
            <View style={[styles.headerCell, { width: 80 }]}>
                <Text style={styles.headerText}>Actions</Text>
            </View>
          </View>

          {/* Table Body */}
          {sortedEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="journal-outline" size={48} color="#94a3b830" />
              <Text style={styles.emptyText}>No workbook records found</Text>
              <Text style={styles.emptySubtext}>Entries will appear here as you log activities.</Text>
            </View>
          ) : (
            sortedEntries.map((entry, index) => {
              const catStyle = CATEGORY_STYLES[entry.data.category] || CATEGORY_STYLES['Other'];
              return (
                <Pressable 
                  key={entry.id} 
                  style={({ pressed }) => [
                    styles.tableRow, 
                    pressed && { backgroundColor: '#F8FAFC' }
                  ]}
                  onPress={() => openEntryModal(entry)}
                >
                  <View style={[styles.cell, { width: 40 }]}>
                    <Text style={styles.srText}>{index + 1}</Text>
                  </View>
                  <View style={[styles.cell, { width: 70 }]}>
                    <Text style={styles.dayText}>{entry.data.daysPast}</Text>
                  </View>
                  <View style={[styles.cell, { width: 100 }]}>
                    <Text style={styles.dateText}>
                      {entry.data.date && entry.data.date.includes('-') 
                        ? format(parse(entry.data.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yy')
                        : entry.data.date}
                    </Text>
                  </View>
                  <View style={[styles.cell, { width: 130 }]}>
                    <View style={styles.categoryRow}>
                      <View style={[styles.categoryIndicator, { backgroundColor: catStyle.color }]} />
                      <Text style={styles.categoryText}>{entry.data.category}</Text>
                    </View>
                  </View>
                  <View style={[styles.cell, { width: 200 }]}>
                    <Text style={styles.descText} numberOfLines={2}>{entry.data.description}</Text>
                  </View>
                  <View style={[styles.cell, { width: 70 }]}>
                    <Text style={[styles.rainValue, !entry.data.rain && { color: '#CBD5E1' }]}>
                      {entry.data.rain ? `${entry.data.rain}mm` : '-'}
                    </Text>
                  </View>
                  <View style={[styles.cell, { width: 130 }]}>
                    <Text style={styles.noteText} numberOfLines={2}>{entry.data.note || '-'}</Text>
                  </View>
                  <View style={[styles.cell, { width: 80, flexDirection: 'row', gap: 12 }]}>
                    <TouchableOpacity onPress={() => openEntryModal(entry)}>
                        <Ionicons name="pencil" size={16} color={Palette.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)}>
                        <Ionicons name="trash-outline" size={16} color={Palette.danger} />
                    </TouchableOpacity>
                  </View>
                </Pressable>
              );
            })
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
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 24,
    marginVertical: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    color: 'white',
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  srText: {
    fontSize: 13,
    fontFamily: 'Outfit',
    color: '#94A3B8',
  },
  table: {
    backgroundColor: 'white',
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerCell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  cell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: '#64748B',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
  },
  descText: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: '#334155',
    lineHeight: 20,
  },
  rainValue: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#2563EB',
  },
  noteText: {
    fontSize: 12,
    fontFamily: 'Outfit',
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#64748B',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Outfit',
    color: '#94A3B8',
    marginTop: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
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
