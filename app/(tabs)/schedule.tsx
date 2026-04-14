import CalendarModal from '@/components/CalendarModal';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, format, subDays, startOfDay, parse, differenceInCalendarDays, getDate, isAfter, addMinutes } from 'date-fns';
import { Stack, useNavigation } from 'expo-router';
import { DeviceEventEmitter, ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Dimensions } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { Task } from '@/types/farm';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HOUR_HEIGHT = 80;
const TIME_COLUMN_WIDTH = 60;
const TIMELINE_PADDING_TOP = 20;

type ViewMode = 'day' | 'three-day' | 'agenda';

interface PositionedTask extends Task {
    left: number;
    width: number;
}

export default function SchedulePage() {
    const { tasks: allTasks, plots, addTask, updateTask, deleteTask, customEntities, addCustomEntity } = useFarm();
    const today = new Date();
    
    // UI State
    const [selectedDate, setSelectedDate] = useState(today);
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [showMainCalendar, setShowMainCalendar] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Form State
    const [taskTitle, setTaskTitle] = useState('');
    const [taskTime, setTaskTime] = useState(new Date());
    const [taskDate, setTaskDate] = useState(new Date());
    const [taskCategories, setTaskCategories] = useState<string[]>([]);
    const [taskPlot, setTaskPlot] = useState<string | null>(null);
    const [taskNote, setTaskNote] = useState('');
    const [taskRecurrence, setTaskRecurrence] = useState<string>('None');
    const [taskAssignedTo, setTaskAssignedTo] = useState('');
    
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Inline Add state
    const [newCatName, setNewCatName] = useState('');
    const [isAddingCat, setIsAddingCat] = useState(false);
    const [newRecurrence, setNewRecurrence] = useState('');
    const [isAddingRecurrence, setIsAddingRecurrence] = useState(false);

    const defaultCategories = ['Irrigation', 'Fertilizer', 'Pesticide', 'Labor', 'Equipment', 'Harvest'];
    const userCategories = useMemo(() => [
        ...defaultCategories, 
        ...customEntities.filter(e => e.entityType === 'category').map(e => e.name)
    ], [customEntities]);

    const defaultRecurrences = ['None', 'Daily', 'Weekly', 'Monthly'];
    const userRecurrences = useMemo(() => [
        ...defaultRecurrences, 
        ...customEntities.filter(e => e.entityType === 'recurrence').map(e => e.name)
    ], [customEntities]);

    // Recurrence logic helper
    const checkRecurrence = (t: Task, selected: Date, start: Date) => {
        const diffDays = differenceInCalendarDays(selected, start);
        const rec = t.recurrence || 'None';

        if (rec === 'None') return false;
        if (rec === 'Daily') return true;
        if (rec === 'Weekly') return diffDays % 7 === 0;
        if (rec === 'Monthly') return getDate(selected) === getDate(start);

        const dayMatch = rec.match(/Every (\d+) days/i);
        if (dayMatch) return diffDays % parseInt(dayMatch[1]) === 0;

        const numOnly = rec.match(/(\d+)/);
        if (numOnly) return diffDays % parseInt(numOnly[1]) === 0;

        return false;
    };

    // Filter tasks for selected date (including recurring tasks)
    const dayTasks = useMemo(() => {
        return allTasks.filter(t => {
            const taskDateObj = parse(t.date, 'yyyy-MM-dd', new Date());
            const selectedDateClean = startOfDay(selectedDate);
            const taskDateClean = startOfDay(taskDateObj);

            if (isAfter(taskDateClean, selectedDateClean)) return false;

            if (t.recurrence === 'None' || !t.recurrence) {
                return format(selectedDate, 'yyyy-MM-dd') === t.date;
            }

            return checkRecurrence(t, selectedDateClean, taskDateClean);
        });
    }, [allTasks, selectedDate]);

    // Complex Overlap Algorithm (GCal style)
    const positionedTasks = useMemo(() => {
        if (dayTasks.length === 0) return [];

        const sorted = [...dayTasks].sort((a, b) => a.time.localeCompare(b.time));
        const result: PositionedTask[] = [];
        const columns: Task[][] = [];

        sorted.forEach(task => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const lastTaskInCol = columns[i][columns[i].length - 1];
                
                // For layout, we assume a default duration of 60 mins if not specified
                // Task.time is HH:mm
                const taskStart = parse(task.time, 'HH:mm', new Date());
                const lastEnd = addMinutes(parse(lastTaskInCol.time, 'HH:mm', new Date()), 50); // Small buffer

                if (taskStart >= lastEnd) {
                    columns[i].push(task);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                columns.push([task]);
            }
        });

        const availableWidth = SCREEN_WIDTH - TIME_COLUMN_WIDTH - 40;
        const colWidth = availableWidth / columns.length;

        columns.forEach((col, colIdx) => {
            col.forEach(task => {
                result.push({
                    ...task,
                    left: TIME_COLUMN_WIDTH + 15 + (colIdx * colWidth),
                    width: colWidth - 5
                });
            });
        });

        return result;
    }, [dayTasks]);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('FAB_OPEN_TASK_MODAL', () => {
             resetForm();
             setTaskDate(selectedDate);
             setShowModal(true);
        });
        return () => sub.remove();
    }, [selectedDate]);

    const resetForm = (task?: Task) => {
        if (task) {
            setSelectedTask(task);
            setTaskTitle(task.title);
            const [h, m] = task.time.split(':').map(Number);
            const d = new Date(); d.setHours(h, m, 0, 0);
            setTaskTime(d);
            setTaskDate(parse(task.date, 'yyyy-MM-dd', new Date()));
            setTaskCategories(task.categories || []);
            setTaskPlot(task.plot || null);
            setTaskNote(task.note || '');
            setTaskRecurrence(task.recurrence || 'None');
            setTaskAssignedTo(task.assignedTo || '');
        } else {
            setSelectedTask(null);
            setTaskTitle('');
            setTaskTime(new Date());
            setTaskDate(selectedDate);
            setTaskCategories([]);
            setTaskPlot(null);
            setTaskNote('');
            setTaskRecurrence('None');
            setTaskAssignedTo('');
        }
        setIsAddingCat(false);
        setIsAddingRecurrence(false);
    }

    const handleSaveTask = async () => {
        if (!taskTitle.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const formattedTime = format(taskTime, 'HH:mm');
            const formattedDate = format(taskDate, 'yyyy-MM-dd');
            const taskData: Task = {
                id: selectedTask?.id || Math.random().toString(),
                title: taskTitle,
                time: formattedTime,
                date: formattedDate,
                categories: taskCategories,
                plot: taskPlot,
                completed: selectedTask?.completed || false,
                recurrence: taskRecurrence as any,
                assignedTo: taskAssignedTo,
                note: taskNote
            };
            if (selectedTask) await updateTask(taskData);
            else await addTask(taskData);
            setShowModal(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (selectedTask) {
            await deleteTask(selectedTask.id);
            setShowModal(false);
        }
    };

    const toggleCategory = (cat: string) => {
        setTaskCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        await addCustomEntity('category', newCatName.trim());
        setNewCatName('');
        setIsAddingCat(false);
    };

    const handleAddRecurrence = async () => {
        if (!newRecurrence.trim()) return;
        const normalized = newRecurrence.toLowerCase().includes('every') ? newRecurrence : `Every ${newRecurrence} days`;
        await addCustomEntity('recurrence', normalized);
        setNewRecurrence('');
        setIsAddingRecurrence(false);
        setTaskRecurrence(normalized);
    };

    const getTaskPosition = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours * HOUR_HEIGHT) + ((minutes / 60) * HOUR_HEIGHT) + TIMELINE_PADDING_TOP;
    };

    const getCategoryColor = (category: string) => {
        switch (category.toLowerCase()) {
            case 'irrigation': return '#2563EB';
            case 'fertilizer': return '#059669';
            case 'pesticide': return '#DC2626';
            case 'labor': return '#7C3AED';
            case 'equipment': return '#EA580C';
            case 'harvest': return '#F59E0B';
            default: return '#64748B';
        }
    };

    const renderTimeline = () => {
        const hours = Array.from({ length: 24 }).map((_, i) => i);
        return (
            <ScrollView style={styles.timelineContainer} contentContainerStyle={styles.timelineScrollContent}>
                {hours.map(hour => (
                    <View key={hour} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
                        <View style={styles.timeLabelContainer}>
                            <Text style={styles.timeLabel}>
                                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </Text>
                        </View>
                        <View style={styles.hourLine} />
                    </View>
                ))}

                {positionedTasks.map((task) => {
                    const top = getTaskPosition(task.time);
                    const color = task.categories.length > 0 ? getCategoryColor(task.categories[0]) : '#64748B';

                    return (
                        <Pressable 
                            key={task.id} 
                            style={[
                                styles.taskBlock, 
                                { 
                                    top, 
                                    left: task.left,
                                    width: task.width,
                                    height: 54, 
                                    backgroundColor: color + '15',
                                    borderLeftColor: color,
                                    opacity: task.completed ? 0.6 : 1
                                }
                            ]}
                            onPress={() => { resetForm(task); setShowModal(true); }}
                        >
                            <View style={styles.taskContent}>
                                <Text style={[styles.taskBlockTitle, { color }]} numberOfLines={1}>
                                    {task.title}
                                </Text>
                                <View style={styles.taskBlockMeta}>
                                    <Ionicons name="location-outline" size={10} color={color} />
                                    <Text style={[styles.taskBlockPlot, { color }]} numberOfLines={1}>
                                        {task.plot || 'General'}
                                    </Text>
                                    <View style={{flexDirection: 'row', marginLeft: 4, gap: 2}}>
                                        {task.categories.slice(0, 2).map(cat => (
                                            <View key={cat} style={[styles.miniCat, { backgroundColor: getCategoryColor(cat) }]} />
                                        ))}
                                    </View>
                                </View>
                            </View>
                            {task.completed && (
                                <View style={styles.completedBadge}>
                                    <Ionicons name="checkmark-circle" size={14} color={Palette.success} />
                                </View>
                            )}
                        </Pressable>
                    );
                })}

                {format(new Date(), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && (
                    <View style={[styles.currentTimeLine, { top: getTaskPosition(format(new Date(), 'HH:mm')) }]}>
                        <View style={styles.currentTimeDot} />
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderAgenda = () => {
        if (dayTasks.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={64} color="#E0E0E0" />
                    <Text style={styles.emptyText}>No tasks scheduled for this day</Text>
                </View>
            );
        }

        return (
            <ScrollView style={styles.agendaContainer} contentContainerStyle={{ padding: 20 }}>
                {dayTasks.map((task) => (
                    <Pressable key={task.id} style={[styles.agendaCard, task.completed && styles.agendaCardCompleted]} onPress={() => { resetForm(task); setShowModal(true); }}>
                        <View style={[styles.agendaIndicator, { backgroundColor: task.categories.length > 0 ? getCategoryColor(task.categories[0]) : '#64748B' }]} />
                        <View style={styles.agendaInfo}>
                            <Text style={[styles.agendaTitle, task.completed && styles.agendaTitleCompleted]}>{task.title}</Text>
                            <View style={styles.agendaMeta}>
                                <Ionicons name="time-outline" size={14} color={Palette.textSecondary} />
                                <Text style={styles.agendaMetaText}>{task.time}</Text>
                                {task.plot && (
                                    <>
                                        <Text style={styles.agendaDot}>•</Text>
                                        <Ionicons name="location-outline" size={14} color={Palette.textSecondary} />
                                        <Text style={styles.agendaMetaText}>{task.plot}</Text>
                                    </>
                                )}
                            </View>
                        </View>
                        <Pressable onPress={() => updateTask({ ...task, completed: !task.completed })} style={[styles.agendaCheckbox, task.completed && styles.agendaCheckboxActive]}>
                            {task.completed && <Ionicons name="checkmark" size={14} color="white" />}
                        </Pressable>
                    </Pressable>
                ))}
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerTitle: format(selectedDate, 'MMMM yyyy'),
                headerTitleStyle: { fontFamily: 'Outfit-Bold' },
                headerRight: () => (
                    <View style={styles.headerRight}>
                        <Pressable onPress={() => setShowMainCalendar(true)} style={styles.iconButton}>
                            <Ionicons name="calendar-outline" size={22} color={Palette.text} />
                        </Pressable>
                        <View style={styles.viewToggle}>
                            <Pressable onPress={() => setViewMode('day')} style={[styles.toggleBtn, viewMode === 'day' && styles.toggleBtnActive]}>
                                <Ionicons name="list" size={18} color={viewMode === 'day' ? 'white' : Palette.textSecondary} />
                            </Pressable>
                            <Pressable onPress={() => setViewMode('agenda')} style={[styles.toggleBtn, viewMode === 'agenda' && styles.toggleBtnActive]}>
                                <Ionicons name="reorder-four" size={18} color={viewMode === 'agenda' ? 'white' : Palette.textSecondary} />
                            </Pressable>
                        </View>
                    </View>
                )
            }} />

            <CalendarModal visible={showMainCalendar} initialDate={selectedDate} onClose={() => setShowMainCalendar(false)} onSelectDate={(date) => setSelectedDate(date)} />

            <View style={styles.dateStrip}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStripScroll}>
                    {Array.from({ length: 14 }).map((_, i) => {
                        const date = addDays(subDays(today, 3), i);
                        const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                        const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                        return (
                            <Pressable key={i} style={[styles.dateItem, isSelected && styles.dateItemActive]} onPress={() => setSelectedDate(date)}>
                                <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>{format(date, 'EEE')}</Text>
                                <View style={[styles.dateNumCircle, isSelected && styles.dateNumCircleActive, isToday && !isSelected && styles.dateNumCircleToday]}>
                                    <Text style={[styles.dateNum, isSelected && styles.dateNumActive, isToday && !isSelected && styles.dateNumToday]}>{format(date, 'd')}</Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {viewMode === 'day' ? renderTimeline() : renderAgenda()}

            <Modal visible={showModal} transparent animationType="slide">
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedTask ? 'Edit Task' : 'New Task'}</Text>
                            <View style={{ flexDirection: 'row', gap: 15 }}>
                                {selectedTask && (
                                    <Pressable onPress={handleDelete}>
                                        <Ionicons name="trash-outline" size={22} color={Palette.danger} />
                                    </Pressable>
                                )}
                                <Pressable onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={Palette.textSecondary} /></Pressable>
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                            <Text style={styles.inputLabel}>Event Title</Text>
                            <TextInput style={styles.textInput} placeholder="e.g. Irrigation of Plot A" value={taskTitle} onChangeText={setTaskTitle} placeholderTextColor="#94A3B8" />

                            <View style={styles.formRow}>
                                <View style={{ flex: 1.5 }}>
                                    <Text style={styles.inputLabel}>Date</Text>
                                    <Pressable style={styles.inputPicker} onPress={() => setShowDatePicker(true)}>
                                        <Ionicons name="calendar-outline" size={18} color={Palette.primary} />
                                        <Text style={styles.pickerText}>{format(taskDate, 'MMM dd, yyyy')}</Text>
                                    </Pressable>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Time</Text>
                                    <Pressable style={styles.inputPicker} onPress={() => setShowTimePicker(true)}>
                                        <Ionicons name="time-outline" size={18} color={Palette.primary} />
                                        <Text style={styles.pickerText}>{format(taskTime, 'hh:mm a')}</Text>
                                    </Pressable>
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>Recurrence</Text>
                            <View style={styles.multiCatRow}>
                                {userRecurrences.map(opt => (
                                    <Pressable key={opt} style={[styles.chip, taskRecurrence === opt && styles.chipActive]} onPress={() => setTaskRecurrence(opt)}>
                                        <Text style={[styles.chipText, taskRecurrence === opt && styles.chipTextActive]}>{opt}</Text>
                                    </Pressable>
                                ))}
                                {isAddingRecurrence ? (
                                    <TextInput 
                                        style={[styles.chip, { minWidth: 100, color: Palette.text }]}
                                        autoFocus
                                        placeholder="Every X Days"
                                        value={newRecurrence}
                                        onChangeText={setNewRecurrence}
                                        onSubmitEditing={handleAddRecurrence}
                                        onBlur={() => setIsAddingRecurrence(false)}
                                    />
                                ) : (
                                    <Pressable style={[styles.chip, { borderStyle: 'dashed' }]} onPress={() => setIsAddingRecurrence(true)}>
                                        <Ionicons name="add" size={16} color={Palette.textSecondary} />
                                        <Text style={[styles.chipText, { marginLeft: 4 }]}>Custom</Text>
                                    </Pressable>
                                )}
                            </View>

                            <Text style={styles.inputLabel}>Plot</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                                <Pressable style={[styles.chip, taskPlot === null && styles.chipActive]} onPress={() => setTaskPlot(null)}>
                                    <Text style={[styles.chipText, taskPlot === null && styles.chipTextActive]}>None</Text>
                                </Pressable>
                                {plots.map(p => (
                                    <Pressable key={p.id} style={[styles.chip, taskPlot === p.name && styles.chipActive]} onPress={() => setTaskPlot(p.name)}>
                                        <Text style={[styles.chipText, taskPlot === p.name && styles.chipTextActive]}>{p.name}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            <Text style={styles.inputLabel}>Categories (Select multiple)</Text>
                            <View style={styles.multiCatRow}>
                                {userCategories.map(cat => (
                                    <Pressable 
                                        key={cat} 
                                        style={[styles.chip, taskCategories.includes(cat) && { backgroundColor: getCategoryColor(cat), borderColor: getCategoryColor(cat) }]}
                                        onPress={() => toggleCategory(cat)}
                                    >
                                        <Text style={[styles.chipText, taskCategories.includes(cat) && { color: 'white' }]}>{cat}</Text>
                                    </Pressable>
                                ))}
                                {isAddingCat ? (
                                    <TextInput 
                                        style={[styles.chip, { minWidth: 80, color: Palette.text }]}
                                        autoFocus
                                        placeholder="New Category"
                                        value={newCatName}
                                        onChangeText={setNewCatName}
                                        onSubmitEditing={handleAddCategory}
                                        onBlur={() => setIsAddingCat(false)}
                                    />
                                ) : (
                                    <Pressable style={[styles.chip, { borderStyle: 'dashed' }]} onPress={() => setIsAddingCat(true)}>
                                        <Ionicons name="add" size={16} color={Palette.textSecondary} />
                                        <Text style={[styles.chipText, { marginLeft: 4 }]}>New</Text>
                                    </Pressable>
                                )}
                            </View>

                            <Text style={styles.inputLabel}>Assigned To</Text>
                            <TextInput style={styles.textInput} placeholder="Staff member name" value={taskAssignedTo} onChangeText={setTaskAssignedTo} placeholderTextColor="#94A3B8" />

                            <Text style={styles.inputLabel}>Notes</Text>
                            <TextInput style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Additional details..." multiline value={taskNote} onChangeText={setTaskNote} placeholderTextColor="#94A3B8" />

                            <Pressable style={[styles.saveButton, isSubmitting && { opacity: 0.7 }]} onPress={handleSaveTask} disabled={isSubmitting}>
                                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>{selectedTask ? 'Update Schedule' : 'Schedule Task'}</Text>}
                            </Pressable>
                            <View style={{ height: 40 }} />
                        </ScrollView>

                        {showDatePicker && <DateTimePicker mode="date" value={taskDate} onChange={(e, d) => { setShowDatePicker(false); if (d) setTaskDate(d); }} />}
                        {showTimePicker && <DateTimePicker mode="time" value={taskTime} onChange={(e, d) => { setShowTimePicker(false); if (d) setTaskTime(d); }} />}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    headerRight: { flexDirection: 'row', alignItems: 'center', marginRight: 10, gap: 12 },
    iconButton: { padding: 8 },
    viewToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 3 },
    toggleBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
    toggleBtnActive: { backgroundColor: Palette.primary, shadowColor: Palette.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
    dateStrip: { backgroundColor: 'white', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    dateStripScroll: { paddingHorizontal: 16, gap: 10 },
    dateItem: { width: 45, alignItems: 'center', justifyContent: 'center' },
    dateItemActive: { opacity: 1 },
    dateDay: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#64748B', textTransform: 'uppercase', marginBottom: 6 },
    dateDayActive: { color: Palette.primary, fontFamily: 'Outfit-Bold' },
    dateNumCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dateNumCircleActive: { backgroundColor: Palette.primary },
    dateNumCircleToday: { borderWidth: 1, borderColor: Palette.primary },
    dateNum: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1E293B' },
    dateNumActive: { color: 'white' },
    dateNumToday: { color: Palette.primary },
    timelineContainer: { flex: 1, backgroundColor: 'white' },
    timelineScrollContent: { width: SCREEN_WIDTH },
    hourRow: { flexDirection: 'row', alignItems: 'flex-start' },
    timeLabelContainer: { width: TIME_COLUMN_WIDTH, alignItems: 'center' },
    timeLabel: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#94A3B8', backgroundColor: 'white', zIndex: 1, paddingBottom: 2 },
    hourLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0', marginTop: 6 },
    taskBlock: { position: 'absolute', borderRadius: 8, borderLeftWidth: 4, padding: 8, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
    taskContent: { flex: 1 },
    taskBlockTitle: { fontSize: 13, fontFamily: 'Outfit-Bold' },
    taskBlockMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
    taskBlockPlot: { fontSize: 10, fontFamily: 'Outfit-Medium' },
    miniCat: { width: 6, height: 6, borderRadius: 3 },
    completedBadge: { marginLeft: 4 },
    currentTimeLine: { position: 'absolute', left: TIME_COLUMN_WIDTH, right: 0, height: 2, backgroundColor: '#EF4444', zIndex: 10 },
    currentTimeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginLeft: -5, marginTop: -4 },
    agendaContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { fontSize: 16, fontFamily: 'Outfit-Medium', color: '#94A3B8', textAlign: 'center' },
    agendaCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 16, marginBottom: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    agendaCardCompleted: { opacity: 0.7, backgroundColor: '#F1F5F9' },
    agendaIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 16 },
    agendaInfo: { flex: 1 },
    agendaTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#1E293B', marginBottom: 4 },
    agendaTitleCompleted: { textDecorationLine: 'line-through', color: '#64748B' },
    agendaMeta: { flexDirection: 'row', alignItems: 'center' },
    agendaMetaText: { fontSize: 12, fontFamily: 'Outfit', color: '#64748B', marginLeft: 4 },
    agendaDot: { marginHorizontal: 6, color: '#CBD5E1' },
    agendaCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    agendaCheckboxActive: { backgroundColor: Palette.success, borderColor: Palette.success },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%', padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#1E293B' },
    modalScroll: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#475569', marginBottom: 8, marginTop: 16 },
    textInput: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, fontSize: 16, fontFamily: 'Outfit', color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
    formRow: { flexDirection: 'row', gap: 12 },
    inputPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
    pickerText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#1E293B' },
    chipScroll: { marginBottom: 8 },
    multiCatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8, height: 40 },
    chipActive: { backgroundColor: Palette.primary, borderColor: Palette.primary },
    chipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#64748B' },
    chipTextActive: { color: 'white' },
    saveButton: { backgroundColor: Palette.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24, shadowColor: Palette.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    saveButtonText: { color: 'white', fontFamily: 'Outfit-Bold', fontSize: 16 }
});
