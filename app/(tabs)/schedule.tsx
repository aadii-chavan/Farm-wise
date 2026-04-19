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
import { Alert, DeviceEventEmitter, ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
    const [taskAssignedTo, setTaskAssignedTo] = useState('');
    const [syncToWorkbook, setSyncToWorkbook] = useState(false);
    const [workbookCategory, setWorkbookCategory] = useState('');
    const [workbookDescription, setWorkbookDescription] = useState('');
    const [showWorkbookCatPicker, setShowWorkbookCatPicker] = useState(false);
    const WORKBOOK_CATEGORIES = ['Sowing', 'Fertilizer', 'Pesticide', 'Irrigation', 'Harvesting', 'Pruning', 'Plantation', 'Weeding', 'Tillage', 'Other'];
    
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Inline Add state
    const [newCatName, setNewCatName] = useState('');
    const [isAddingCat, setIsAddingCat] = useState(false);

    const defaultCategories = ['Irrigation', 'Fertilizer', 'Pesticide', 'Labor', 'Equipment', 'Harvest'];
    const userCategories = useMemo(() => [
        ...defaultCategories, 
        ...customEntities.filter(e => e.entityType === 'category').map(e => e.name)
    ], [customEntities]);





    // Filter tasks for a specific date (including recurring tasks)
    const getTasksForDate = (date: Date) => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        return allTasks.filter(t => t.date === formattedDate);
    };

    // Filter tasks for selected date (including overdue tasks if today)
    const dayTasks = useMemo(() => {
        const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const isTodaySelected = formattedSelectedDate === todayStr;

        // Normal tasks for this date
        let currentDayTasks = allTasks.filter(t => t.date === formattedSelectedDate);

        // If today is selected, also add missed tasks (scheduled in past and not completed)
        if (isTodaySelected) {
            const overdueTasks = allTasks.filter(t => {
                // Must be in the past
                if (t.date >= todayStr) return false;
                
                // Must not be completed
                const hasBeenDone = taskCompletions.some(c => c.taskId === t.id);
                return !hasBeenDone && !t.completed;
            });
            currentDayTasks = [...currentDayTasks, ...overdueTasks];
        }

        return currentDayTasks
            .sort((a, b) => a.time.localeCompare(b.time))
            .map(t => {
                const isDone = taskCompletions.some(c => c.taskId === t.id && c.completedAt === formattedSelectedDate);
                const isOverdue = t.date < formattedSelectedDate;
                return { ...t, isCompletedInstance: isDone, isOverdue };
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
            setTaskAssignedTo(task.assignedTo || '');
            setSyncToWorkbook(task.syncToWorkbook || false);
            setWorkbookCategory(task.workbookDetails?.category || '');
            setWorkbookDescription(task.workbookDetails?.description || '');
        } else {
            setSelectedTask(null);
            setTaskTitle('');
            setTaskTime(new Date());
            setTaskDate(selectedDate);
            setTaskCategories([]);
            setTaskPlot(null);
            setTaskNote('');
            setTaskAssignedTo('');
            setSyncToWorkbook(false);
            setWorkbookCategory('');
            setWorkbookDescription('');
        }
        setIsAddingCat(false);
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
                assignedTo: taskAssignedTo,
                note: taskNote,
                syncToWorkbook: syncToWorkbook,
                workbookDetails: syncToWorkbook ? {
                    category: workbookCategory || taskCategories[0] || 'Other',
                    description: workbookDescription || taskTitle
                } : undefined
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



    const getCategoryColor = (category: string) => {
        switch (category.toLowerCase()) {
            case 'irrigation': return '#3B82F6';
            case 'fertilizer': return '#10B981';
            case 'pesticide': return '#F43F5E';
            case 'labor': return '#8B5CF6';
            case 'equipment': return '#F59E0B';
            case 'harvest': return '#10B981';
            default: return Palette.primary;
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'irrigation': return 'water';
            case 'fertilizer': return 'leaf';
            case 'pesticide': return 'bug';
            case 'labor': return 'people';
            case 'equipment': return 'construct';
            case 'harvest': return 'basket';
            default: return 'list';
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
                                                            name="calendar" 
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
                        <LinearGradient
                            colors={[Palette.primary + '10', Palette.primary + '05']}
                            style={styles.emptyIconContainer}
                        >
                             <Ionicons name="checkmark-done-outline" size={44} color={Palette.primary} />
                        </LinearGradient>
                        <Text style={styles.emptyHeader}>All Caught Up!</Text>
                        <Text style={styles.emptySubheader}>No tasks scheduled for this day.</Text>
                        <Pressable 
                            style={({ pressed }) => [
                                styles.emptyAdd,
                                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                            ]} 
                            onPress={() => { resetForm(); setShowModal(true); }}
                        >
                            <Ionicons name="add-circle" size={20} color="white" />
                            <Text style={styles.emptyAddText}>Create a Task</Text>
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
                            <View style={styles.taskMainContent}>
                                <View style={styles.taskHeaderRow}>
                                    <View style={[styles.categoryIconContainer, { backgroundColor: getCategoryColor(task.categories[0] || '') + '15' }]}>
                                        <Ionicons 
                                            name={getCategoryIcon(task.categories[0] || '') as any} 
                                            size={18} 
                                            color={getCategoryColor(task.categories[0] || '')} 
                                        />
                                    </View>
                                    <View style={styles.taskTimeContainer}>
                                        <Text style={styles.taskTimeText}>{task.time}</Text>
                                        {task.isOverdue && !task.isCompletedInstance && (
                                            <View style={styles.overdueBadge}>
                                                <Text style={styles.overdueText}>Missed</Text>
                                            </View>
                                        )}
                                    </View>
                                    {task.syncToWorkbook && (
                                        <View style={styles.syncIndicator}>
                                            <Ionicons name="sync-circle" size={16} color={Palette.primary} />
                                        </View>
                                    )}
                                </View>

                                <Text style={[styles.taskTitle, task.isCompletedInstance && styles.taskTitleCompleted]} numberOfLines={1}>
                                    {task.title}
                                </Text>

                                <View style={styles.taskFooterRow}>
                                    <View style={styles.footerLeft}>
                                        <View style={styles.locationContainer}>
                                            <Ionicons name="location-outline" size={12} color="#94A3B8" />
                                            <Text style={styles.footerLabel}>{task.plot || 'General Plot'}</Text>
                                        </View>
                                        {task.assignedTo ? (
                                            <View style={styles.staffContainer}>
                                                <Ionicons name="person-outline" size={12} color="#94A3B8" />
                                                <Text style={styles.footerLabel}>{task.assignedTo}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    
                                    <View style={styles.badgeContainer}>
                                        {task.categories.slice(0, 1).map((cat: string) => (
                                            <View key={cat} style={[styles.compactBadge, { backgroundColor: getCategoryColor(cat) + '10' }]}>
                                                <Text style={[styles.compactBadgeText, { color: getCategoryColor(cat) }]}>{cat}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            <Pressable 
                                style={[styles.checkButton, task.isCompletedInstance && styles.checkButtonActive]}
                                onPress={() => toggleComplete(task)}
                            >
                                <Ionicons 
                                    name={task.isCompletedInstance ? "checkmark-circle" : "ellipse-outline"} 
                                    size={28} 
                                    color={task.isCompletedInstance ? Palette.success : '#E2E8F0'} 
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

                            <Text style={styles.inputLabel}>Select Plot</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                                <Pressable style={[styles.chip, taskPlot === null && styles.chipActive]} onPress={() => {
                                    setTaskPlot(null);
                                    setSyncToWorkbook(false);
                                }}>
                                    <Text style={[styles.chipText, taskPlot === null && styles.chipTextActive]}>None</Text>
                                </Pressable>
                                {plots.map(p => (
                                    <Pressable key={p.id} style={[styles.chip, taskPlot === p.name && styles.chipActive]} onPress={() => {
                                        setTaskPlot(p.name);
                                        setSyncToWorkbook(true);
                                        if (!workbookCategory) {
                                            setWorkbookCategory(taskCategories[0] || '');
                                            setWorkbookDescription(taskTitle);
                                        }
                                    }}>
                                        <Text style={[styles.chipText, taskPlot === p.name && styles.chipTextActive]}>{p.name}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            <Pressable 
                                style={[
                                    styles.syncToggleRow, 
                                    { marginTop: 10, marginBottom: 10 },
                                    !taskPlot && { opacity: 0.5 }
                                ]} 
                                onPress={() => {
                                    if (!taskPlot) {
                                        Alert.alert("Plot Required", "Please select a plot first to enable workbook syncing.");
                                        return;
                                    }
                                    setSyncToWorkbook(!syncToWorkbook);
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.inputLabel, { marginTop: 0 }]}>Sync to Workbook</Text>
                                    <Text style={styles.helperText}>Auto-log to plot workbook on completion</Text>
                                </View>
                                <View style={[styles.toggleBase, (syncToWorkbook && taskPlot) && styles.toggleActive]}>
                                    <View style={[styles.toggleCircle, (syncToWorkbook && taskPlot) && styles.toggleCircleActive]} />
                                </View>
                            </Pressable>

                            {(syncToWorkbook && taskPlot) && (
                                <View style={styles.syncDetails}>
                                    <Text style={styles.inputLabel}>Workbook Category *</Text>
                                    <Pressable 
                                        style={styles.inputPicker}
                                        onPress={() => setShowWorkbookCatPicker(true)}
                                    >
                                        <Text style={[styles.pickerText, !workbookCategory && { color: '#94A3B8' }]}>
                                            {workbookCategory || 'Select category...'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={18} color={Palette.primary} />
                                    </Pressable>
                                    
                                    <Text style={styles.inputLabel}>Workbook Description *</Text>
                                    <TextInput 
                                        style={styles.textInput} 
                                        placeholder="Details for workbook entry" 
                                        value={workbookDescription} 
                                        onChangeText={setWorkbookDescription} 
                                    />
                                </View>
                            )}

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

            {/* Workbook Category Picker */}
            <Modal visible={showWorkbookCatPicker} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setShowWorkbookCatPicker(false)}>
                    <View style={[styles.modalContent, { maxHeight: '60%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Workbook Category</Text>
                            <Pressable onPress={() => setShowWorkbookCatPicker(false)}><Ionicons name="close" size={24} color={Palette.textSecondary} /></Pressable>
                        </View>
                        <ScrollView>
                            {WORKBOOK_CATEGORIES.map(cat => (
                                <Pressable 
                                    key={cat} 
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        setWorkbookCategory(cat);
                                        setShowWorkbookCatPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerItemText}>{cat}</Text>
                                    {workbookCategory === cat && <Ionicons name="checkmark" size={20} color={Palette.primary} />}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
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
    emptyContainer: { 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginTop: 60, 
        paddingHorizontal: 40 
    },
    emptyIconContainer: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 24,
    },
    emptyHeader: { 
        fontSize: 20, 
        fontFamily: 'Outfit-Bold', 
        color: '#1E293B',
        marginBottom: 8,
    },
    emptySubheader: { 
        fontSize: 14, 
        fontFamily: 'Outfit-Medium', 
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyAdd: { 
        marginTop: 32, 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 28, 
        paddingVertical: 14, 
        backgroundColor: Palette.primary, 
        borderRadius: 16, 
        gap: 8,
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    emptyAddText: { 
        color: 'white', 
        fontFamily: 'Outfit-Bold', 
        fontSize: 15 
    },
    taskCard: { 
        flexDirection: 'row', 
        backgroundColor: 'white', 
        borderRadius: 20, 
        marginBottom: 16, 
        alignItems: 'center', 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.03, 
        shadowRadius: 12, 
        elevation: 2, 
        borderWidth: 1, 
        borderColor: '#F1F5F9' 
    },
    taskCardCompleted: { 
        backgroundColor: '#F8FAFC',
        borderColor: '#E2E8F0',
        opacity: 0.8,
    },
    taskMainContent: { 
        flex: 1, 
        padding: 16,
    },
    taskHeaderRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 12,
        gap: 12,
    },
    categoryIconContainer: { 
        width: 36, 
        height: 36, 
        borderRadius: 12, 
        alignItems: 'center', 
        justifyContent: 'center',
    },
    taskTimeContainer: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8,
    },
    taskTimeText: { 
        fontSize: 14, 
        fontFamily: 'Outfit-Bold', 
        color: '#1E293B',
    },
    syncIndicator: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskTitle: {
        fontSize: 17,
        fontFamily: 'Outfit-SemiBold',
        color: '#0F172A',
        marginBottom: 12,
    },
    taskTitleCompleted: { 
        textDecorationLine: 'line-through', 
        color: '#94A3B8',
    },
    taskFooterRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
    },
    footerLeft: { 
        flexDirection: 'row', 
        gap: 12,
    },
    locationContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4,
    },
    staffContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4,
    },
    footerLabel: { 
        fontSize: 12, 
        fontFamily: 'Outfit-Medium', 
        color: '#64748B',
    },
    badgeContainer: { 
        flexDirection: 'row', 
        gap: 6,
    },
    compactBadge: { 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 8,
    },
    compactBadgeText: { 
        fontSize: 10, 
        fontFamily: 'Outfit-Bold', 
        textTransform: 'uppercase',
    },
    checkButton: { 
        paddingHorizontal: 16, 
        height: '100%',
        justifyContent: 'center', 
        borderLeftWidth: 1, 
        borderLeftColor: '#F1F5F9',
    },
    checkButtonActive: { 
        backgroundColor: '#F0FDF410',
    },
    overdueBadge: {
        backgroundColor: '#FFF1F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FDA4AF',
    },
    overdueText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: '#E11D48',
    },
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
    saveButtonText: { color: 'white', fontFamily: 'Outfit-Bold', fontSize: 16 },
    sectionDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
    syncToggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10 },
    helperText: { fontSize: 12, color: '#64748B', fontFamily: 'Outfit-Medium', marginTop: 2 },
    toggleBase: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', padding: 2 },
    toggleActive: { backgroundColor: Palette.primary },
    toggleCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'white' },
    toggleCircleActive: { alignSelf: 'flex-end' },
    syncDetails: { marginTop: 16, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: Palette.primary + '20' },
    pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    pickerItemText: { fontSize: 15, fontFamily: 'Outfit-Medium', color: '#1E293B' }
});
