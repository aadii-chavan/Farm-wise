import CalendarModal from '@/components/CalendarModal';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, format, subDays } from 'date-fns';
import { Stack, useNavigation } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SchedulePage() {
    const { tasks: allTasks, plots, addTask, updateTask } = useFarm();
    const navigation = useNavigation();
    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(today);
    const [showMainCalendar, setShowMainCalendar] = useState(false);

    // Active tasks for the selected date
    const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
    const tasks = allTasks.filter(t => t.date === selectedDateString);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    
    // Time picker state
    const [pickedTime, setPickedTime] = useState(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);
    
    // Date picker state
    const [pickedDate, setPickedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Category picker state
    const [categories, setCategories] = useState(['Water', 'Fertilizer', 'Equipment', 'Labor']);
    const [newTaskCategory, setNewTaskCategory] = useState('Water');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryText, setNewCategoryText] = useState('');
    const [newTaskPlot, setNewTaskPlot] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddTask = async () => {
        if (!newTaskTitle.trim() || isSubmitting) return;
        setIsSubmitting(true);
        
        try {
            const formattedTime = format(pickedTime, 'hh:mm a');
            const formattedDate = format(pickedDate, 'yyyy-MM-dd');
            
            const task = {
                id: Math.random().toString(),
                title: newTaskTitle,
                time: formattedTime,
                date: formattedDate,
                category: newTaskCategory,
                plot: newTaskPlot,
                completed: false,
            };
            await addTask(task);
            setShowModal(false);
            setNewTaskTitle('');
            setPickedTime(new Date());
            setNewTaskCategory('Water');
            setNewTaskPlot(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Generate a week of dates centered around SELECTED DATE
    const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(subDays(selectedDate, 3), i));

    const toggleTask = async (id: string) => {
        const task = allTasks.find(t => t.id === id);
        if (task) {
            await updateTask({ ...task, completed: !task.completed });
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'water': return 'water';
            case 'fertilizer': return 'leaf';
            case 'equipment': return 'construct';
            case 'labor': return 'people';
            default: return 'list';
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category.toLowerCase()) {
            case 'water': return '#2A5C82';      // Premium Deep Ocean
            case 'fertilizer': return '#30694B'; // Elegant Forest Green
            case 'equipment': return '#A6633C';  // Rich Cognac/Copper
            case 'labor': return '#5A5069';      // Muted Eggplant
            default: return '#64748B';           // Sleek Slate
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerTitle: 'Daily Schedule',
                headerRight: () => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 15 }}>
                        <Pressable onPress={() => setShowMainCalendar(true)}>
                            <Ionicons name="calendar-outline" size={24} color={Palette.text} />
                        </Pressable>
                        <Pressable onPress={() => { setPickedDate(selectedDate); setShowModal(true); }}>
                            <Ionicons name="add-circle" size={32} color={Palette.primary} />
                        </Pressable>
                    </View>
                )
            }} />
            
            <CalendarModal 
                visible={showMainCalendar}
                initialDate={selectedDate}
                onClose={() => setShowMainCalendar(false)}
                onSelectDate={(date) => setSelectedDate(date)}
            />

            {/* Header / Date Selector */}
            <View style={styles.dateSelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
                    {weekDates.map((date, index) => {
                        const isSelected = date.toDateString() === selectedDate.toDateString();
                        const isToday = date.toDateString() === today.toDateString();
                        
                        return (
                            <Pressable 
                                key={index} 
                                style={[styles.dateCard, isSelected && styles.dateCardActive]}
                                onPress={() => setSelectedDate(date)}
                            >
                                <Text style={[styles.dateDayName, isSelected && styles.dateDayNameActive]}>
                                    {format(date, 'EEE')}
                                </Text>
                                <View style={[styles.dateNumberCircle, isSelected && styles.dateNumberCircleActive]}>
                                    <Text style={[styles.dateNumber, isSelected && styles.dateNumberActive]}>
                                        {format(date, 'd')}
                                    </Text>
                                </View>
                                {isToday && !isSelected && <View style={styles.todayDot} />}
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.summaryHeader}>
                    <Text style={styles.summaryTitle}>
                        {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed
                    </Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: tasks.length > 0 ? `${(tasks.filter(t => t.completed).length / tasks.length) * 100}%` : '0%' }]} />
                    </View>
                </View>

                {tasks.map((task) => (
                    <Pressable 
                        key={task.id} 
                        style={[styles.taskCard, task.completed && styles.taskCardCompleted]}
                        onPress={() => toggleTask(task.id)}
                    >
                        <View style={styles.taskLeft}>
                            <Pressable 
                                style={[styles.checkbox, task.completed && styles.checkboxCompleted]} 
                                onPress={() => toggleTask(task.id)}
                            >
                                {task.completed && <Ionicons name="checkmark" size={16} color="white" />}
                            </Pressable>
                            <View>
                                <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                                    {task.title}
                                </Text>
                                <View style={styles.taskMetaRow}>
                                    <Ionicons name="time-outline" size={14} color={Palette.textSecondary} />
                                    <Text style={styles.taskMetaText}>{task.time}</Text>
                                    
                                    {task.plot && (
                                        <>
                                            <View style={styles.metaDivider} />
                                            <Ionicons name="location-outline" size={14} color={Palette.textSecondary} />
                                            <Text style={styles.taskMetaText}>{task.plot}</Text>
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>
                        <View style={[styles.categoryIconBadge, { backgroundColor: getCategoryColor(task.category) + '20' }]}>
                            <Ionicons name={getCategoryIcon(task.category) as any} size={18} color={getCategoryColor(task.category)} />
                        </View>
                    </Pressable>
                ))}
            </ScrollView>



            <Modal visible={showModal} transparent animationType="slide">
                <KeyboardAvoidingView 
                    style={styles.modalOverlay} 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Task</Text>
                            <Pressable onPress={() => { setShowModal(false); setShowTimePicker(false); setShowDatePicker(false); }}>
                                <Ionicons name="close" size={24} color={Palette.textSecondary} />
                            </Pressable>
                        </View>

                        <Text style={styles.inputLabel}>Task Name</Text>
                        <TextInput 
                            style={styles.textInput} 
                            placeholder="e.g. Irrigate Northern Plot"
                            value={newTaskTitle}
                            onChangeText={setNewTaskTitle}
                            placeholderTextColor="#999"
                        />

                        {/* Plot Selector */}
                        <Text style={styles.inputLabel}>Plot (Optional)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8, marginBottom: 4 }}>
                            <Pressable 
                                style={[
                                    styles.categoryPill, 
                                    newTaskPlot === null && { backgroundColor: Palette.primary, borderColor: Palette.primary }
                                ]}
                                onPress={() => setNewTaskPlot(null)}
                            >
                                <Text style={[
                                    styles.categoryPillText, 
                                    newTaskPlot === null && styles.categoryPillTextActive
                                ]}>None</Text>
                            </Pressable>
                            {plots.map((p) => (
                                <Pressable 
                                    key={p.id} 
                                    style={[
                                        styles.categoryPill, 
                                        newTaskPlot === p.name && { backgroundColor: Palette.primary, borderColor: Palette.primary }
                                    ]}
                                    onPress={() => setNewTaskPlot(p.name)}
                                >
                                    <Text style={[
                                        styles.categoryPillText, 
                                        newTaskPlot === p.name && styles.categoryPillTextActive
                                    ]}>{p.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Date</Text>
                                <Pressable 
                                    style={styles.textInput} 
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={{ fontSize: 16, fontFamily: 'Outfit', color: Palette.text }}>
                                        {format(pickedDate, 'MMM d, yyyy')}
                                    </Text>
                                </Pressable>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Time</Text>
                                <Pressable 
                                    style={styles.textInput} 
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Text style={{ fontSize: 16, fontFamily: 'Outfit', color: Palette.text }}>
                                        {format(pickedTime, 'hh:mm a')}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {showDatePicker && (
                            <View style={Platform.OS === 'ios' ? styles.iosTimePickerWrapper : {}}>
                                <DateTimePicker
                                    mode="date"
                                    value={pickedDate}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, date) => {
                                        if (Platform.OS === 'android') {
                                            setShowDatePicker(false);
                                        }
                                        if (date) setPickedDate(date);
                                    }}
                                />
                                {Platform.OS === 'ios' && (
                                    <Pressable style={styles.iosTimeConfirm} onPress={() => setShowDatePicker(false)}>
                                        <Text style={styles.iosTimeConfirmText}>Done</Text>
                                    </Pressable>
                                )}
                            </View>
                        )}

                        {showTimePicker && (
                            <View style={Platform.OS === 'ios' ? styles.iosTimePickerWrapper : {}}>
                                <DateTimePicker
                                    mode="time"
                                    value={pickedTime}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, date) => {
                                        if (Platform.OS === 'android') {
                                            setShowTimePicker(false);
                                        }
                                        if (date) setPickedTime(date);
                                    }}
                                />
                                {Platform.OS === 'ios' && (
                                    <Pressable style={styles.iosTimeConfirm} onPress={() => setShowTimePicker(false)}>
                                        <Text style={styles.iosTimeConfirmText}>Done</Text>
                                    </Pressable>
                                )}
                            </View>
                        )}

                        <Text style={styles.inputLabel}>Category</Text>
                        <View style={styles.categoryRow}>
                            {categories.map((cat) => (
                                <Pressable 
                                    key={cat} 
                                    style={[
                                        styles.categoryPill, 
                                        newTaskCategory === cat && { backgroundColor: getCategoryColor(cat), borderColor: getCategoryColor(cat) }
                                    ]}
                                    onPress={() => setNewTaskCategory(cat)}
                                >
                                    <Text style={[
                                        styles.categoryPillText, 
                                        newTaskCategory === cat && styles.categoryPillTextActive
                                    ]}>{cat}</Text>
                                </Pressable>
                            ))}

                            {isAddingCategory ? (
                                <TextInput 
                                    style={[styles.categoryPill, { minWidth: 80, paddingVertical: 4, height: 36, color: Palette.text, fontFamily: 'Outfit' }]}
                                    autoFocus
                                    placeholder="New..."
                                    placeholderTextColor="#999"
                                    value={newCategoryText}
                                    onChangeText={setNewCategoryText}
                                    onSubmitEditing={() => {
                                        if (newCategoryText.trim()) {
                                            const normalized = newCategoryText.trim();
                                            if (!categories.includes(normalized)) {
                                                setCategories([...categories, normalized]);
                                            }
                                            setNewTaskCategory(normalized);
                                        }
                                        setIsAddingCategory(false);
                                        setNewCategoryText('');
                                    }}
                                    onBlur={() => {
                                        setIsAddingCategory(false);
                                        setNewCategoryText('');
                                    }}
                                />
                            ) : (
                                <Pressable 
                                    style={[styles.categoryPill, { borderStyle: 'dashed' }]}
                                    onPress={() => setIsAddingCategory(true)}
                                >
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                        <Ionicons name="add" size={16} color={Palette.textSecondary} />
                                        <Text style={[styles.categoryPillText, { marginLeft: 2 }]}>New</Text>
                                    </View>
                                </Pressable>
                            )}
                        </View>

                        <Pressable 
                            style={[styles.saveButton, isSubmitting && { opacity: 0.7 }]} 
                            onPress={handleAddTask}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.saveButtonText}>Schedule Task</Text>
                            )}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.background,
    },
    dateSelector: {
        backgroundColor: 'white',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    dateScroll: {
        paddingHorizontal: 16,
        gap: 12,
    },
    dateCard: {
        alignItems: 'center',
        padding: 8,
        borderRadius: 16,
        width: 54,
    },
    dateCardActive: {
        backgroundColor: Palette.primary + '10',
    },
    dateDayName: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
        marginBottom: 8,
    },
    dateDayNameActive: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
    },
    dateNumberCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateNumberCircleActive: {
        backgroundColor: Palette.primary,
    },
    dateNumber: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    dateNumberActive: {
        color: 'white',
    },
    todayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Palette.primary,
        marginTop: 6,
    },
    scroll: {
        padding: 20,
        paddingBottom: 100,
    },
    summaryHeader: {
        marginBottom: 20,
    },
    summaryTitle: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
        marginBottom: 8,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Palette.success,
        borderRadius: 4,
    },
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    taskCardCompleted: {
        backgroundColor: '#F9F9F9',
        borderColor: '#F0F0F0',
        elevation: 0,
    },
    taskLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    checkboxCompleted: {
        backgroundColor: Palette.success,
        borderColor: Palette.success,
    },
    taskTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Medium',
        color: Palette.text,
        marginBottom: 4,
    },
    taskTitleCompleted: {
        color: Palette.textSecondary,
        textDecorationLine: 'line-through',
    },
    taskMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    taskMetaText: {
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginLeft: 4,
    },
    metaDivider: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 8,
    },
    categoryIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Palette.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
        marginBottom: 8,
        marginTop: 12,
    },
    textInput: {
        backgroundColor: Palette.background,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        fontFamily: 'Outfit',
        color: Palette.text,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        minHeight: 52,
        justifyContent: 'center',
    },
    iosTimePickerWrapper: {
        marginTop: 10,
        backgroundColor: Palette.background,
        borderRadius: 12,
        overflow: 'hidden',
    },
    iosTimeConfirm: {
        backgroundColor: Palette.primary,
        padding: 12,
        alignItems: 'center',
    },
    iosTimeConfirmText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
    },
    categoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    categoryPill: {
        paddingHorizontal: 16,
        height: 36,
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: Palette.background,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    categoryPillText: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: Palette.textSecondary,
    },
    categoryPillTextActive: {
        color: 'white',
    },
    saveButton: {
        backgroundColor: Palette.primary,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginTop: 32,
    },
    saveButtonText: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
    }
});
