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
    const [isAddingWorkbookCat, setIsAddingWorkbookCat] = useState(false);
    const [newWorkbookCatName, setNewWorkbookCatName] = useState('');
    const [isSavingWorkbookCat, setIsSavingWorkbookCat] = useState(false);
    
    const WORKBOOK_CATEGORIES = ['Foundational Pruning', 'Fruit Pruning', 'Sowing', 'Fertilizer', 'Pesticide', 'Irrigation', 'Harvesting', 'Plantation', 'Weeding', 'Tillage'];
    
    const dynamicWorkbookCategories = useMemo(() => {
        const customCats = customEntities.filter(c => c.entityType === 'workbook_category').map(c => c.name);
        return [...WORKBOOK_CATEGORIES, ...customCats];
    }, [customEntities, WORKBOOK_CATEGORIES]);
    
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
        setIsAddingWorkbookCat(false);
        setNewWorkbookCatName('');
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

    const handleAddWorkbookCategory = async () => {
        if (!newWorkbookCatName.trim() || isSavingWorkbookCat) return;
        setIsSavingWorkbookCat(true);
        try {
            await addCustomEntity('workbook_category', newWorkbookCatName.trim());
            setWorkbookCategory(newWorkbookCatName.trim());
            setIsAddingWorkbookCat(false);
            setNewWorkbookCatName('');
            setShowWorkbookCatPicker(false);
        } finally {
            setIsSavingWorkbookCat(false);
        }
    };



    const getCategoryColor = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes('irrigation') || cat.includes('water')) return '#0EA5E9';
        if (cat.includes('fertilizer') || cat.includes('nutrient')) return '#10B981';
        if (cat.includes('pesticide') || cat.includes('spray')) return '#F43F5E';
        if (cat.includes('labor') || cat.includes('staff')) return '#8B5CF6';
        if (cat.includes('equipment') || cat.includes('machinery')) return '#F59E0B';
        if (cat.includes('harvest')) return '#059669';
        if (cat.includes('pruning')) return '#D97706';
        if (cat.includes('weeding')) return '#B45309';
        if (cat.includes('tillage')) return '#78350F';
        return Palette.primary;
    };

    const getCategoryIcon = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes('irrigation') || cat.includes('water')) return 'water';
        if (cat.includes('fertilizer') || cat.includes('nutrient')) return 'leaf';
        if (cat.includes('pesticide') || cat.includes('spray')) return 'bug';
        if (cat.includes('labor') || cat.includes('staff')) return 'people';
        if (cat.includes('equipment') || cat.includes('machinery')) return 'construct';
        if (cat.includes('harvest')) return 'basket';
        if (cat.includes('pruning')) return 'cut';
        if (cat.includes('weeding')) return 'leaf-outline';
        if (cat.includes('tillage')) return 'trail-sign-outline';
        return 'list';
    };

    const getTimePeriod = (timeStr: string) => {
        const [hour] = timeStr.split(':').map(Number);
        if (hour < 12) return 'Morning';
        if (hour < 17) return 'Afternoon';
        if (hour < 20) return 'Evening';
        return 'Night';
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
                            <View style={styles.selectedDateBadge}>
                                <View style={styles.dot} />
                                <Text style={styles.selectedDateSub}>{format(selectedDate, 'EEEE, MMM do')}</Text>
                            </View>
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
                                                        styles.taskIndicatorDot, 
                                                        { backgroundColor: isSelected ? 'white' : getCategoryColor(tasksOnDay[0].categories[0] || '') }
                                                    ]} />
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


            <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 100 }}>
                {dayTasks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <LinearGradient
                            colors={[Palette.primary + '10', Palette.primary + '05']}
                            style={styles.emptyIconContainer}
                        >
                             <Ionicons name="calendar-outline" size={44} color={Palette.primary} />
                        </LinearGradient>
                        <Text style={styles.emptyHeader}>No Scheduled Work</Text>
                        <Text style={styles.emptySubheader}>The schedule is clear for today. Add a task to get started.</Text>
                        <Pressable 
                            style={({ pressed }) => [
                                styles.emptyAdd,
                                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                            ]} 
                            onPress={() => { resetForm(); setShowModal(true); }}
                        >
                            <Ionicons name="add-circle" size={20} color="white" />
                            <Text style={styles.emptyAddText}>Add Task</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.tableWrapper}>
                        {/* Table Header */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.headerCell, { flex: 1.2 }]}>Time</Text>
                            <Text style={[styles.headerCell, { flex: 3 }]}>Activity / Plot</Text>
                            <Text style={[styles.headerCell, { flex: 1.5 }]}>Date</Text>
                            <View style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="checkbox-outline" size={16} color="#94A3B8" />
                            </View>
                        </View>

                        {/* Table Rows */}
                        {dayTasks.map((task: any, index: number) => {
                            const catColor = getCategoryColor(task.categories[0] || '');
                            const isLast = index === dayTasks.length - 1;
                            
                            return (
                                <Pressable 
                                    key={task.id} 
                                    style={({ pressed }) => [
                                        styles.tableRow,
                                        task.isCompletedInstance && styles.tableRowCompleted,
                                        pressed && { backgroundColor: '#F8FAFC' },
                                        isLast && { borderBottomWidth: 0 }
                                    ]}
                                    onPress={() => { resetForm(task); setShowModal(true); }}
                                >
                                    {/* Time Column */}
                                    <View style={[styles.cell, { flex: 1.2 }]}>
                                        <Text style={styles.timeText}>{task.time}</Text>
                                        {task.isOverdue && !task.isCompletedInstance && (
                                            <View style={styles.overdueDot} />
                                        )}
                                    </View>

                                    {/* Activity Column */}
                                    <View style={[styles.cell, { flex: 3 }]}>
                                        <View style={styles.activityInfo}>
                                            <View style={[styles.indicatorLine, { backgroundColor: catColor }]} />
                                            <View>
                                                <Text style={[styles.taskTitleText, task.isCompletedInstance && styles.strikeText]} numberOfLines={1}>
                                                    {task.title}
                                                </Text>
                                                <Text style={styles.plotText}>{task.plot || 'General'}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Date Column */}
                                    <View style={[styles.cell, { flex: 1.5 }]}>
                                        <Text style={styles.dateCellText} numberOfLines={1}>
                                            {format(new Date(task.date), 'dd MMM')}
                                        </Text>
                                    </View>

                                    {/* Action Column */}
                                    <Pressable 
                                        style={[styles.cell, { width: 40, alignItems: 'center' }]}
                                        onPress={() => toggleComplete(task)}
                                    >
                                        <Ionicons 
                                            name={task.isCompletedInstance ? "checkmark-circle" : "ellipse-outline"} 
                                            size={22} 
                                            color={task.isCompletedInstance ? Palette.success : '#CBD5E1'} 
                                        />
                                    </Pressable>
                                </Pressable>
                            );
                        })}
                    </View>
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
                                        <Text style={styles.pickerText}>{format(taskTime, 'HH:mm')}</Text>
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

                        {showTimePicker && <DateTimePicker mode="time" is24Hour={true} value={taskTime} onChange={(e, d) => { setShowTimePicker(false); if (d) setTaskTime(d); }} />}
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
                        <ScrollView keyboardShouldPersistTaps="handled">
                            {isAddingWorkbookCat ? (
                                <View style={{ padding: 20 }}>
                                    <TextInput 
                                        style={styles.textInput} 
                                        value={newWorkbookCatName} 
                                        onChangeText={setNewWorkbookCatName} 
                                        placeholder="Enter custom category" 
                                        autoFocus
                                    />
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, gap: 15, alignItems: 'center' }}>
                                        <Pressable onPress={() => setIsAddingWorkbookCat(false)}>
                                            <Text style={{ color: Palette.textSecondary, fontFamily: 'Outfit-Medium', fontSize: 15 }}>Cancel</Text>
                                        </Pressable>
                                        <Pressable 
                                            style={[styles.saveButton, { paddingVertical: 8, paddingHorizontal: 16, marginTop: 0, opacity: isSavingWorkbookCat ? 0.7 : 1 }]}
                                            disabled={isSavingWorkbookCat}
                                            onPress={handleAddWorkbookCategory}
                                        >
                                            {isSavingWorkbookCat ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <Text style={{ color: 'white', fontFamily: 'Outfit-Bold', fontSize: 14 }}>Save</Text>
                                            )}
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    {dynamicWorkbookCategories.map(cat => (
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
                                    <Pressable 
                                        style={[styles.pickerItem, { borderBottomWidth: 0 }]}
                                        onPress={() => setIsAddingWorkbookCat(true)}
                                    >
                                        <Ionicons name="add" size={20} color={Palette.primary} style={{ marginRight: 8 }} />
                                        <Text style={[styles.pickerItemText, { color: Palette.primary, flex: 1 }]}>New category</Text>
                                    </Pressable>
                                </>
                            )}
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
    calendarSection: { backgroundColor: 'white', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 6, overflow: 'hidden' },
    calendarGradient: { paddingTop: 8, paddingBottom: 12 },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 8 },
    monthYearText: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0F172A' },
    selectedDateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.primary },
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
    todayNumber: { color: Palette.primary },
    otherMonthDay: { color: '#E2E8F0' },
    taskIndicators: { marginTop: 2, height: 4, alignItems: 'center', justifyContent: 'center' },
    taskIndicatorDot: { width: 4, height: 4, borderRadius: 2 },
    
    summaryBar: { flexDirection: 'row', backgroundColor: 'white', marginHorizontal: 20, marginTop: 15, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4, zIndex: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    summaryItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    summaryDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F1F5F9' },
    summaryValue: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#0F172A' },
    summaryLabel: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#94A3B8', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 },

    listContainer: { flex: 1, marginTop: 5 },
    tableWrapper: { marginHorizontal: 16, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    headerCell: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', alignItems: 'center' },
    tableRowCompleted: { backgroundColor: '#F8FAFC', opacity: 0.7 },
    cell: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#1E293B' },
    overdueDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginLeft: 6 },
    activityInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    indicatorLine: { width: 3, height: 24, borderRadius: 2, marginRight: 10 },
    taskTitleText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0F172A' },
    strikeText: { textDecorationLine: 'line-through', color: '#94A3B8' },
    plotText: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#64748B', marginTop: 1 },
    dateCellText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#64748B' },
    
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyIconContainer: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyHeader: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1E293B', marginBottom: 6 },
    emptySubheader: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#64748B', textAlign: 'center', lineHeight: 18 },
    emptyAdd: { marginTop: 24, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Palette.primary, borderRadius: 12, gap: 8 },
    emptyAddText: { color: 'white', fontFamily: 'Outfit-Bold', fontSize: 14 },

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
