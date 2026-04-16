import CalendarModal from '@/components/CalendarModal';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
    addDays, 
    format, 
    subDays, 
    startOfDay, 
    parse, 
    differenceInCalendarDays, 
    getDate, 
    isAfter, 
    startOfMonth, 
    endOfMonth, 
    startOfToday, 
    startOfWeek, 
    endOfWeek, 
    isSameMonth, 
    isSameDay, 
    addMonths,
    subMonths
} from 'date-fns';
import { Stack } from 'expo-router';
import { DeviceEventEmitter, ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { Task } from '@/types/farm';
import { LinearGradient } from 'expo-linear-gradient';

export default function SchedulePage() {
    const { tasks: allTasks, plots, addTask, updateTask, deleteTask, customEntities, addCustomEntity, taskCompletions, toggleTaskCompletion } = useFarm();
    const today = startOfToday();
    
    // UI State
    const [selectedDate, setSelectedDate] = useState(today);
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
    const [showMainCalendar, setShowMainCalendar] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

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

    // Filter tasks for a specific date (including recurring tasks)
    const getTasksForDate = (date: Date) => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        return allTasks.filter(t => {
            const taskDateObj = parse(t.date, 'yyyy-MM-dd', new Date());
            const selectedDateClean = startOfDay(date);
            const taskDateClean = startOfDay(taskDateObj);

            if (isAfter(taskDateClean, selectedDateClean)) return false;

            if (t.recurrence === 'None' || !t.recurrence) {
                return formattedDate === t.date;
            } else {
                return checkRecurrence(t, selectedDateClean, taskDateClean);
            }
        });
    };

    // Filter tasks for selected date (including recurring tasks)
    const dayTasks = useMemo(() => {
        const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
        return getTasksForDate(selectedDate)
            .sort((a, b) => a.time.localeCompare(b.time))
            .map(t => {
                const isDone = taskCompletions.some(c => c.taskId === t.id && c.completedAt === formattedSelectedDate);
                return { ...t, isCompletedInstance: isDone };
            });
    }, [allTasks, selectedDate, taskCompletions]);

    // Calendar grid calculation
    const calendarWeeks = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const rows = [];
        let curr = startDate;
        while (curr <= endDate) {
            const days = [];
            for (let i = 0; i < 7; i++) {
                days.push(curr);
                curr = addDays(curr, 1);
            }
            rows.push(days);
        }
        return rows;
    }, [currentMonth]);

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
                headerTitle: 'Schedule',
                headerRight: () => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Pressable onPress={() => { setSelectedDate(today); setCurrentMonth(startOfMonth(today)); }} style={styles.iconButton}>
                            <Ionicons name="today-outline" size={22} color={Palette.text} />
                        </Pressable>
                        <Pressable onPress={() => setShowMainCalendar(true)} style={styles.iconButton}>
                            <Ionicons name="search-outline" size={22} color={Palette.text} />
                        </Pressable>
                    </View>
                )
            }} />

            <CalendarModal visible={showMainCalendar} initialDate={selectedDate} onClose={() => setShowMainCalendar(false)} onSelectDate={(date) => { setSelectedDate(date); setCurrentMonth(startOfMonth(date)); }} />

            <View style={styles.calendarSection}>
                <LinearGradient
                    colors={['#FFFFFF', '#F8FAFC']}
                    style={styles.calendarGradient}
                >
                    <View style={styles.calendarHeader}>
                        <View>
                            <Text style={styles.monthYearText}>{format(currentMonth, 'MMMM yyyy')}</Text>
                            <Text style={styles.selectedDateSub}>{format(selectedDate, 'EEEE, MMM do')}</Text>
                        </View>
                        <View style={styles.navButtons}>
                            <Pressable onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={styles.navBtn}>
                                <Ionicons name="chevron-back" size={20} color={Palette.text} />
                            </Pressable>
                            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.navBtn}>
                                <Ionicons name="chevron-forward" size={20} color={Palette.text} />
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.calendarGrid}>
                        <View style={styles.weekLabels}>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <Text key={day} style={styles.weekLabelText}>{day}</Text>
                            ))}
                        </View>
                        {calendarWeeks.map((week, idx) => (
                            <View key={idx} style={styles.calendarRow}>
                                {week.map(day => {
                                    const isSelected = isSameDay(day, selectedDate);
                                    const isToday = isSameDay(day, today);
                                    const isCurrentMonth = isSameMonth(day, currentMonth);
                                    const tasksOnDay = getTasksForDate(day);
                                    
                                    return (
                                        <Pressable 
                                            key={day.toString()} 
                                            style={[
                                                styles.calendarDay, 
                                                isSelected && styles.selectedDay
                                            ]}
                                            onPress={() => setSelectedDate(day)}
                                        >
                                            <Text style={[
                                                styles.dayNumber, 
                                                !isCurrentMonth && styles.otherMonthDay,
                                                isToday && styles.todayNumber,
                                                isSelected && styles.selectedDayNumber
                                            ]}>
                                                {format(day, 'd')}
                                            </Text>
                                            <View style={styles.taskIndicators}>
                                                {tasksOnDay.length > 0 && (
                                                    <View style={[
                                                        styles.starBadge, 
                                                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : getCategoryColor(tasksOnDay[0].categories[0] || '') + '15' }
                                                    ]}>
                                                        <Ionicons 
                                                            name="star-sharp" 
                                                            size={10} 
                                                            color={isSelected ? 'white' : getCategoryColor(tasksOnDay[0].categories[0] || '')} 
                                                        />
                                                        {tasksOnDay.length > 1 && (
                                                            <Text style={[
                                                                styles.moreTasksLabel,
                                                                { color: isSelected ? 'white' : '#475569' }
                                                            ]}>
                                                                {tasksOnDay.length}
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </LinearGradient>
            </View>

            <ScrollView style={styles.listContainer} contentContainerStyle={{ padding: 20 }}>
                {dayTasks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                             <Ionicons name="calendar-clear-outline" size={48} color="#CBD5E1" />
                        </View>
                        <Text style={styles.emptyText}>Rest Day! No tasks scheduled</Text>
                        <Pressable style={styles.emptyAdd} onPress={() => { resetForm(); setShowModal(true); }}>
                            <Ionicons name="add" size={18} color={Palette.primary} />
                            <Text style={styles.emptyAddText}>Plan a Task</Text>
                        </Pressable>
                    </View>
                ) : (
                    dayTasks.map((task: any) => (
                        <Pressable 
                            key={task.id} 
                            style={[
                                styles.taskCard, 
                                task.isCompletedInstance && styles.taskCardCompleted
                            ]}
                            onPress={() => { resetForm(task); setShowModal(true); }}
                        >
                            {/* Vertical Status Bar */}
                            <View style={[styles.statusBar, { backgroundColor: getCategoryColor(task.categories[0] || '') }]} />

                            <View style={styles.taskContent}>
                                <View style={styles.taskHeader}>
                                    <View style={styles.timeLabelContainer}>
                                        <Ionicons name="time" size={12} color={Palette.primary} />
                                        <Text style={styles.timeLabelText}>{task.time}</Text>
                                    </View>
                                    <View style={styles.taskActionsHeader}>
                                         <Pressable 
                                            style={styles.actionIconBtn}
                                            onPress={() => handleDelete(task.id)}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                                        </Pressable>
                                    </View>
                                </View>

                                <Text style={[styles.taskTitle, task.isCompletedInstance && styles.taskTitleCompleted]} numberOfLines={2}>
                                    {task.title}
                                </Text>

                                <View style={styles.taskMetaFooter}>
                                    <View style={styles.footerLeft}>
                                        <View style={styles.plotPill}>
                                            <Ionicons name="location" size={10} color="#64748B" />
                                            <Text style={styles.plotText}>{task.plot || 'General'}</Text>
                                        </View>
                                        {task.recurrence !== 'None' && (
                                            <View style={[styles.plotPill, { backgroundColor: Palette.primary + '10' }]}>
                                                <Ionicons name="repeat" size={10} color={Palette.primary} />
                                                <Text style={[styles.plotText, { color: Palette.primary }]}>{task.recurrence}</Text>
                                            </View>
                                        )}
                                    </View>
                                    
                                    <View style={styles.footerRight}>
                                         <View style={styles.badgeList}>
                                            {task.categories.slice(0, 2).map((cat: string) => (
                                                <View key={cat} style={[styles.miniBadge, { backgroundColor: getCategoryColor(cat) + '15' }]}>
                                                    <Text style={[styles.miniBadgeText, { color: getCategoryColor(cat) }]}>{cat}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <Pressable 
                                style={[styles.completionCircle, task.isCompletedInstance && styles.completionCircleChecked]}
                                onPress={() => toggleComplete(task)}
                            >
                                <Ionicons 
                                    name={task.isCompletedInstance ? "checkmark-circle" : "ellipse-outline"} 
                                    size={28} 
                                    color={task.isCompletedInstance ? Palette.success : '#CBD5E1'} 
                                />
                            </Pressable>
                        </Pressable>
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
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    iconButton: { padding: 8, marginLeft: 8 },
    calendarSection: { backgroundColor: 'white', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6, overflow: 'hidden' },
    calendarGradient: { paddingTop: 8, paddingBottom: 12 },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 8 },
    monthYearText: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0F172A' },
    selectedDateSub: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#64748B' },
    navButtons: { flexDirection: 'row', gap: 8 },
    navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    calendarGrid: { paddingHorizontal: 16 },
    weekLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    weekLabelText: { flex: 1, textAlign: 'center', fontSize: 10, fontFamily: 'Outfit-Bold', color: '#CBD5E1', textTransform: 'uppercase' },
    calendarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    calendarDay: { flex: 1, aspectRatio: 1.45, alignItems: 'center', justifyContent: 'center', borderRadius: 10, margin: 1 },
    selectedDay: { backgroundColor: Palette.primary, shadowColor: Palette.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
    dayNumber: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#334155' },
    selectedDayNumber: { color: 'white' },
    todayNumber: { color: '#F59E0B' },
    otherMonthDay: { color: '#F1F5F9' },
    taskIndicators: { marginTop: 2, alignItems: 'center', justifyContent: 'center' },
    starBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
    moreTasksLabel: { fontSize: 8, fontFamily: 'Outfit-Bold' },
    listContainer: { flex: 1 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingBottom: 120 },
    emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyText: { fontSize: 16, fontFamily: 'Outfit-Medium', color: '#64748B' },
    emptyAdd: { marginTop: 24, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Palette.primary + '15', borderRadius: 24, gap: 8 },
    emptyAddText: { color: Palette.primary, fontFamily: 'Outfit-Bold', fontSize: 15 },
    taskCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 24, marginBottom: 16, alignItems: 'stretch', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, overflow: 'hidden' },
    taskCardCompleted: { opacity: 0.6 },
    statusBar: { width: 6 },
    taskContent: { flex: 1, padding: 16, paddingLeft: 12 },
    taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    timeLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    timeLabelText: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#475569' },
    taskActionsHeader: { flexDirection: 'row', gap: 8 },
    actionIconBtn: { padding: 4 },
    taskTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#0F172A', marginBottom: 12, lineHeight: 22 },
    taskTitleCompleted: { textDecorationLine: 'line-through', color: '#94A3B8' },
    taskMetaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    footerLeft: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    footerRight: { alignItems: 'flex-end' },
    plotPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    plotText: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#64748B' },
    badgeList: { flexDirection: 'row', gap: 4 },
    miniBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    miniBadgeText: { fontSize: 10, fontFamily: 'Outfit-Bold', textTransform: 'uppercase' },
    completionCircle: { paddingHorizontal: 16, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#F1F5F9' },
    completionCircleChecked: { backgroundColor: '#F0FDF4' },
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
