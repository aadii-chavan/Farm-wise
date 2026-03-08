import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    isAfter,
    isBefore,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfToday,
    startOfWeek,
} from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type CalendarModalProps = {
  visible: boolean;
  initialDate: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  /**
   * Optional minimum selectable date (inclusive)
   */
  minimumDate?: Date;
  /**
   * Optional maximum selectable date (inclusive)
   */
  maximumDate?: Date;
};

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  initialDate,
  onClose,
  onSelectDate,
  minimumDate,
  maximumDate,
}) => {
  const today = startOfToday();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(initialDate));
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[][] = [];
    let current = start;

    while (current <= end) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(current);
        current = addDays(current, 1);
      }
      days.push(week);
    }

    return days;
  }, [currentMonth]);

  const isDisabled = (date: Date) => {
    if (minimumDate && isBefore(date, minimumDate)) return true;
    if (maximumDate && isAfter(date, maximumDate)) return true;
    return false;
  };

  const handleSelect = (date: Date) => {
    if (isDisabled(date)) return;
    setSelectedDate(date);
    onSelectDate(date);
    onClose();
  };

  const goToPrevMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Pressable onPress={goToPrevMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={20} color="white" />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.monthText}>{format(currentMonth, 'MMMM yyyy')}</Text>
              <Text style={styles.subText}>Select a date</Text>
            </View>
            <Pressable onPress={goToNextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </Pressable>
          </View>

          <View style={styles.weekHeaderRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, index) => (
              <Text key={`${d}-${index}`} style={styles.weekdayText}>
                {d}
              </Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day) => {
                const inMonth = isSameMonth(day, currentMonth);
                const selected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, today);
                const disabled = isDisabled(day) || !inMonth;

                let backgroundColor = 'transparent';
                let borderColor = 'transparent';
                let textColor = Palette.textSecondary;

                if (selected) {
                  backgroundColor = Palette.primary;
                  textColor = 'white';
                } else if (isToday && inMonth && !disabled) {
                  borderColor = Palette.primary;
                  textColor = Palette.primary;
                } else if (inMonth && !disabled) {
                  backgroundColor = Palette.card;
                  textColor = Palette.text;
                }

                if (disabled) {
                  textColor = Palette.textSecondary + '66';
                }

                return (
                  <Pressable
                    key={day.toISOString()}
                    style={({ pressed }) => [
                      styles.dayCell,
                      { backgroundColor, borderColor },
                      pressed && !disabled && !selected && { opacity: 0.85 },
                    ]}
                    disabled={disabled}
                    onPress={() => handleSelect(day)}
                  >
                    <Text style={[styles.dayText, { color: textColor }]}>
                      {format(day, 'd')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.footerButtonSecondary}>
              <Text style={styles.footerButtonSecondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: Palette.card,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Palette.primary,
  },
  headerCenter: {
    alignItems: 'center',
  },
  monthText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  subText: {
    color: '#E0F2F1',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Outfit',
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    color: Palette.textSecondary,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  dayCell: {
    flex: 1,
    margin: 4,
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  footerButtonSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.background,
  },
  footerButtonSecondaryText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: Palette.textSecondary,
  },
});

export default CalendarModal;

