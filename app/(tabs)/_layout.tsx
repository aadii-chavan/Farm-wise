import HeaderDropdown from '@/components/HeaderDropdown';
import FloatingActionButton from '@/components/FloatingActionButton';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Stack, usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, Text, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

const ROUTE_TITLES: Record<string, string> = {
    '/': 'FarmEzy',
    '/analysis': 'Financial Insights',
    '/plots': 'My Plots',
    '/inventory': 'Stock & Inventory',
    '/shops': 'Shop Ledgers',
    '/schedule': 'Tasks & Calendar',
    '/general-expenses': 'Personal Expenses',
};

const CustomHeader = ({ title, isOpen, onToggle }: { title: string, isOpen: boolean, onToggle: () => void }) => {
    const { top } = useSafeAreaInsets();
    const router = useRouter();
    
    // Rotating arrow animation
    const arrowStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: withSpring(isOpen ? '180deg' : '0deg', { damping: 25, stiffness: 200 }) }],
    }));

    return (
        <View style={[styles.headerContainer, { paddingTop: top }]}>
            <Pressable style={styles.headerContent} onPress={onToggle}>
                <View style={styles.titleSection}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <Animated.View style={[styles.arrowIcon, arrowStyle]}>
                        <Ionicons name="chevron-down" size={20} color={Palette.text} />
                    </Animated.View>
                </View>
                
                <Pressable 
                    style={({ pressed }) => [styles.profileButton, pressed && { opacity: 0.7 }]} 
                    onPress={() => {
                        if (isOpen) onToggle();
                        router.push('/profile');
                    }}
                >
                    <Ionicons name="person-circle-outline" size={32} color={Palette.text} />
                </Pressable>
            </Pressable>
        </View>
    );
};

export default function AppLayout() {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const pathname = usePathname();
    
    // Determine title based on pathname
    // If pathname is just /(tabs), it's the index
    const currentPath = pathname === '/(tabs)' ? '/' : pathname;
    const title = ROUTE_TITLES[currentPath] || 'FarmEzy';

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <CustomHeader 
                title={title} 
                isOpen={isDropdownOpen} 
                onToggle={() => setIsDropdownOpen(!isDropdownOpen)} 
            />
            
            <HeaderDropdown 
                isOpen={isDropdownOpen} 
                onClose={() => setIsDropdownOpen(false)} 
            />

            <View style={{ flex: 1 }}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        animation: 'fade',
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="analysis" />
                    <Stack.Screen name="plots" />
                    <Stack.Screen name="inventory" />
                    <Stack.Screen name="shops" />
                    <Stack.Screen name="schedule" />
                    <Stack.Screen name="general-expenses" />
                </Stack>
            </View>
            
            <FloatingActionButton />
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        zIndex: 1001,
    },
    headerContent: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    titleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        fontFamily: 'Outfit-Bold',
        fontSize: 22,
        color: Palette.text,
    },
    arrowIcon: {
        marginLeft: 8,
        marginTop: 2,
    },
    profileButton: {
        width: 40,
        height: 40,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
});
