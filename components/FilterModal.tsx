import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import CalendarModal from './CalendarModal';

export type FilterState = {
  type: 'Both' | 'Income' | 'Expense';
  categories: string[];
  dateFilter: 'All Time' | 'This Week' | 'This Month' | 'Last Month' | 'Custom Date';
  customDate: Date | null;
};

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
  availableCategories: string[];
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters,
  availableCategories,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(initialFilters);
  const [showCalendar, setShowCalendar] = useState(false);

  // Sync when opened
  React.useEffect(() => {
    if (visible) {
      setLocalFilters(initialFilters);
    }
  }, [visible, initialFilters]);

  const toggleCategory = (cat: string) => {
    setLocalFilters((prev) => {
      const isSelected = prev.categories.includes(cat);
      if (isSelected) {
        return { ...prev, categories: prev.categories.filter((c) => c !== cat) };
      } else {
        return { ...prev, categories: [...prev.categories, cat] };
      }
    });
  };

  const setType = (type: FilterState['type']) => {
    setLocalFilters((prev) => ({ ...prev, type }));
  };

  const setDateFilter = (dateFilter: FilterState['dateFilter']) => {
    setLocalFilters((prev) => ({ ...prev, dateFilter }));
    if (dateFilter === 'Custom Date' && !localFilters.customDate) {
      setShowCalendar(true);
    }
  };

  const handleCustomDateSelect = (date: Date) => {
    setLocalFilters((prev) => ({ ...prev, customDate: date, dateFilter: 'Custom Date' }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.bottomSheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Palette.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Transaction Type */}
            <Text style={styles.sectionTitle}>Transaction Type</Text>
            <View style={styles.row}>
              {['Both', 'Income', 'Expense'].map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, localFilters.type === t && styles.chipActive]}
                  onPress={() => setType(t as any)}
                >
                  <Text style={[styles.chipText, localFilters.type === t && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            {/* Date Range */}
            <Text style={styles.sectionTitle}>Date Range</Text>
            <View style={styles.row}>
              {['All Time', 'This Week', 'This Month', 'Last Month', 'Custom Date'].map((d) => (
                <Pressable
                  key={d}
                  style={[styles.chip, localFilters.dateFilter === d && styles.chipActive]}
                  onPress={() => setDateFilter(d as any)}
                >
                  <Text style={[styles.chipText, localFilters.dateFilter === d && styles.chipTextActive]}>{d}</Text>
                </Pressable>
              ))}
            </View>
            
            {localFilters.dateFilter === 'Custom Date' && localFilters.customDate && (
              <Pressable style={styles.customDateDisplay} onPress={() => setShowCalendar(true)}>
                <Ionicons name="calendar-outline" size={16} color={Palette.primary} style={{ marginRight: 8 }} />
                <Text style={styles.customDateText}>
                  {localFilters.customDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </Pressable>
            )}

            {/* Categories */}
            {availableCategories.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Categories</Text>
                <View style={styles.row}>
                  <Pressable
                    style={[styles.chip, localFilters.categories.length === 0 && styles.chipActive]}
                    onPress={() => setLocalFilters((prev) => ({ ...prev, categories: [] }))}
                  >
                    <Text style={[styles.chipText, localFilters.categories.length === 0 && styles.chipTextActive]}>Any</Text>
                  </Pressable>
                  {availableCategories.map((cat) => (
                    <Pressable
                      key={cat}
                      style={[styles.chip, localFilters.categories.includes(cat) && styles.chipActive]}
                      onPress={() => toggleCategory(cat)}
                    >
                      <Text style={[styles.chipText, localFilters.categories.includes(cat) && styles.chipTextActive]}>{cat}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable 
                style={styles.clearButton} 
                onPress={() => setLocalFilters({ type: 'Both', categories: [], dateFilter: 'All Time', customDate: null })}
            >
              <Text style={styles.clearButtonText}>Reset</Text>
            </Pressable>
            <Pressable 
                style={styles.applyButton} 
                onPress={() => {
                   onApply(localFilters);
                   onClose();
                }}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>

        <CalendarModal
          visible={showCalendar}
          initialDate={localFilters.customDate || new Date()}
          onClose={() => setShowCalendar(false)}
          onSelectDate={handleCustomDateSelect}
          maximumDate={new Date()}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: Palette.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: Palette.text,
    marginBottom: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: Palette.textSecondary,
  },
  chipTextActive: {
    color: 'white',
  },
  customDateDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Palette.primary + '10',
      padding: 12,
      borderRadius: 12,
      marginBottom: 20,
      marginTop: -8,
      alignSelf: 'flex-start',
  },
  customDateText: {
      color: Palette.primary,
      fontFamily: 'Outfit-SemiBold',
      fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    backgroundColor: 'white',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Palette.background,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: Palette.textSecondary,
  },
  applyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Palette.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: 'white',
  },
});
