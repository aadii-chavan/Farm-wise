import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

export default function SchedulePage() {
    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerTitle: 'Schedule' }} />
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.emptyCard}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="calendar" size={40} color={Palette.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>Your Schedule</Text>
                    <Text style={styles.emptyText}>Tap the + button to schedule upcoming farm activities, crop tasks, or labor assignments.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.background,
    },
    scroll: {
        padding: 20,
        flexGrow: 1,
        justifyContent: 'center',
    },
    emptyCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Palette.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: Palette.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    }
});
