import CalendarModal from '@/components/CalendarModal';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, format, subDays, startOfDay, parse, differenceInCalendarDays, getDate, isAfter } from 'date-fns';
import { Stack } from 'expo-router';
import { DeviceEventEmitter, ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { Task } from '@/types/farm';

export default function SchedulePage() {
    const { tasks: allTasks, plots, addTask, updateTask, deleteTask, customEntities, addCustomEntity, taskCompletions, toggleTaskCompletion } = useFarm();
    const today = new Date();
    
    // UI State
    const [selectedDate, setSelectedDate] = useState(today);
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
        const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
        return allTasks.filter(t => {
            const taskDateObj = parse(t.date, 'yyyy-MM-dd', new Date());
            const selectedDateClean = startOfDay(selectedDate);
            const taskDateClean = startOfDay(taskDateObj);

            if (isAfter(taskDateClean, selectedDateClean)) return false;

            let isVisible = false;
            if (t.recurrence === 'None' || !t.recurrence) {
                isVisible = formattedSelectedDate === t.date;
            } else {
                isVisible = checkRecurrence(t, selectedDateClean, taskDateClean);
            }

            if (!isVisible) return false;

            // Check if this specific instance is completed
            const isDone = taskCompletions.some(c => c.taskId === t.id && c.completedAt === formattedSelectedDate);
            return { ...t, isCompletedInstance: isDone };
        }).sort((a, b) => a.time.localeCompare(b.time))
          .map(t => {
              const isDone = taskCompletions.some(c => c.taskId === t.id && c.completedAt === formattedSelectedDate);
              return { ...t, isCompletedInstance: isDone };
          });
    }, [allTasks, selectedDate, taskCompletions]);

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
    };

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

    const toggleComplete = async (task: any) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        await toggleTaskCompletion(task.id, dateStr);
    };

    const handleDelete = async (id: string) => {
        await deleteTask(id);
        if (selectedTask?.id === id) setShowModal(false);
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

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerTitle: format(selectedDate, 'MMMM yyyy'),
                headerRight: () => (
                    <Pressable onPress={() => setShowMainCalendar(true)} style={styles.iconButton}>
                        <Ionicons name="calendar-outline" size={24} color={Palette.text} />
                    </Pressable>
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

            <ScrollView style={styles.listContainer} contentContainerStyle={{ padding: 20 }}>
                {dayTasks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="clipboard-outline" size={64} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No tasks for this day</Text>
                        <Pressable style={styles.emptyAdd} onPress={() => { resetForm(); setShowModal(true); }}>
                            <Text style={styles.emptyAddText}>Create new task</Text>
                        </Pressable>
                    </View>
                ) : (
                    dayTasks.map((task: any) => (
                        <View key={task.id} style={[styles.taskCard, task.isCompletedInstance && styles.taskCardCompleted]}>
                            <Pressable 
                                style={[styles.checkbox, task.isCompletedInstance && styles.checkboxChecked]}
                                onPress={() => toggleComplete(task)}
                            >
                                {task.isCompletedInstance && <Ionicons name="checkmark" size={18} color="white" />}
                            </Pressable>

                            <View style={styles.taskInfo}>
                                <Text style={[styles.taskTitle, task.isCompletedInstance && styles.taskTitleCompleted]}>
                                    {task.title}
                                </Text>
                                <View style={styles.metaRow}>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="time-outline" size={14} color="#64748B" />
                                        <Text style={styles.metaText}>{task.time}</Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="location-outline" size={14} color="#64748B" />
                                        <Text style={styles.metaText}>{task.plot || 'None'}</Text>
                                    </View>
                                    {task.recurrence !== 'None' && (
                                        <View style={styles.metaItem}>
                                            <Ionicons name="repeat-outline" size={14} color={Palette.primary} />
                                            <Text style={[styles.metaText, { color: Palette.primary }]}>{task.recurrence}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.catRow}>
                                    {task.categories.map((cat: string) => (
                                        <View key={cat} style={[styles.catBadge, { backgroundColor: getCategoryColor(cat) + '15' }]}>
                                            <View style={[styles.catDot, { backgroundColor: getCategoryColor(cat) }]} />
                                            <Text style={[styles.catText, { color: getCategoryColor(cat) }]}>{cat}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.actionButtons}>
                                <Pressable 
                                    style={styles.actionBtn}
                                    onPress={() => { resetForm(task); setShowModal(true); }}
                                >
                                    <Ionicons name="pencil" size={20} color="#64748B" />
                                </Pressable>
                                <Pressable 
                                    style={styles.actionBtn}
                                    onPress={() => handleDelete(task.id)}
                                >
                                    <Ionicons name="trash-outline" size={20} color={Palette.danger} />
                                </Pressable>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal visible={showModal} transparent animationType="slide">
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedTask ? 'Edit Task' : 'New Task'}</Text>
                            <Pressable onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={Palette.textSecondary} /></Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                            <Text style={styles.inputLabel}>Task Name</Text>
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

                            <Text style={styles.inputLabel}>Categories</Text>
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

                        {showTimePicker && <DateTimePicker mode="time" value={taskTime} onChange={(e, d) => { setShowTimePicker(false); if (d) setTaskTime(d); }} />}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <CalendarModal 
                visible={showDatePicker} 
                initialDate={taskDate} 
                onClose={() => setShowDatePicker(false)} 
                onSelectDate={(date) => {
                    setTaskDate(date);
                    setShowDatePicker(false);
                }} 
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    iconButton: { padding: 8, marginRight: 5 },
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
    listContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, fontFamily: 'Outfit-Medium', color: '#94A3B8', marginTop: 12 },
    emptyAdd: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Palette.primary + '15', borderRadius: 20 },
    emptyAddText: { color: Palette.primary, fontFamily: 'Outfit-Bold' },
    taskCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, alignItems: 'center', borderLeftWidth: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    taskCardCompleted: { opacity: 0.8, backgroundColor: '#F1F5F9' },
    checkbox: { width: 30, height: 30, borderRadius: 10, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 15, backgroundColor: 'white' },
    checkboxChecked: { backgroundColor: Palette.success, borderColor: Palette.success },
    taskInfo: { flex: 1 },
    taskTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#1E293B', marginBottom: 6 },
    taskTitleCompleted: { textDecorationLine: 'line-through', color: '#64748B' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, fontFamily: 'Outfit', color: '#64748B' },
    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    catBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    catDot: { width: 6, height: 6, borderRadius: 3 },
    catText: { fontSize: 11, fontFamily: 'Outfit-Bold' },
    actionButtons: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
    actionBtn: { padding: 8, marginLeft: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%', padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
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
