import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    SlideInUp,
    FadeIn,
    FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/Colors';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const MENU_ITEMS = [
    { id: 'index', label: 'Dashboard', icon: 'grid-outline', route: '/' },
    { id: 'analysis', label: 'Analysis', icon: 'analytics-outline', route: '/analysis' },
    { id: 'plots', label: 'My Plots', icon: 'map-outline', route: '/plots' },
    { id: 'inventory', label: 'Inventory', icon: 'cube-outline', route: '/inventory' },
    { id: 'schedule', label: 'Schedule', icon: 'calendar-outline', route: '/schedule' },
    { id: 'labor-book', label: 'Labor Book', icon: 'people-outline', route: '/labor-book' },
    { id: 'rain-meter', label: 'Rain Meter', icon: 'rainy-outline', route: '/rain-meter' },
    { id: 'general-expenses', label: 'Personal Expenses', icon: 'wallet-outline', route: '/general-expenses' },
];

const QUICK_ACTIONS = [
    { id: 'settings', label: 'Settings', icon: 'settings-outline' },
    { id: 'privacy', label: 'Privacy', icon: 'shield-checkmark-outline' },
    { id: 'support', label: 'Support', icon: 'help-circle-outline' },
];

interface HeaderDropdownProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HeaderDropdown({ isOpen, onClose }: HeaderDropdownProps) {
    const { top } = useSafeAreaInsets();
    const router = useRouter();
    const pathname = usePathname();

    const opacity = useSharedValue(0);
    const translateY = useSharedValue(-20);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    useEffect(() => {
        if (isOpen) {
            opacity.value = withTiming(1, { duration: 300 });
            translateY.value = withSpring(0, { damping: 20, stiffness: 250 });
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            translateY.value = withTiming(-20, { duration: 200 });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleNavigate = (route: string) => {
        onClose();
        router.push(route as any);
    };

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Animated.View style={[styles.backdropBackground, { opacity }]} />
            </Pressable>

            <Animated.View
                style={[
                    styles.dropdownContainer,
                    { paddingTop: top + 60 },
                    animatedStyle,
                ]}
            >
                <View style={styles.content}>
                    <View style={styles.menuGrid}>
                        {MENU_ITEMS.map((item, index) => {
                            const isActive = pathname === item.route || (item.route === '/' && pathname === '/(tabs)');
                            return (
                                <Animated.View
                                    key={item.id}
                                    entering={FadeInDown.delay(index * 40).springify().damping(20).stiffness(150)}
                                >
                                    <TouchableOpacity
                                        style={[styles.menuItem, isActive && styles.activeMenuItem]}
                                        onPress={() => handleNavigate(item.route)}
                                    >
                                        <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                                            <Ionicons 
                                                name={item.icon as any} 
                                                size={24} 
                                                color={isActive ? Palette.primary : Palette.text} 
                                            />
                                        </View>
                                        <Text style={[styles.menuLabel, isActive && styles.activeMenuLabel]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </View>

                    <View style={styles.footer}>
                        <View style={styles.quickActions}>
                            {QUICK_ACTIONS.map((action, index) => (
                                <Animated.View 
                                    key={action.id}
                                    entering={FadeInDown.delay(400 + index * 50).springify()}
                                >
                                    <TouchableOpacity style={styles.quickActionItem}>
                                        <Ionicons name={action.icon as any} size={20} color={Palette.textSecondary} />
                                        <Text style={styles.quickActionLabel}>{action.label}</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </View>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    backdropBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    dropdownContainer: {
        width: '100%',
        backgroundColor: 'white',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    menuItem: {
        width: (width - 60) / 2,
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 16,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activeMenuItem: {
        backgroundColor: '#F0F9FF',
        borderColor: '#BAE6FD',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    activeIconContainer: {
        backgroundColor: 'white',
    },
    menuLabel: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: Palette.text,
        flexShrink: 1,
    },
    activeMenuLabel: {
        color: Palette.primary,
        fontFamily: 'Outfit-Bold',
    },
    footer: {
        marginTop: 10,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    quickActionItem: {
        alignItems: 'center',
        padding: 10,
    },
    quickActionLabel: {
        fontSize: 12,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        marginTop: 4,
    },
});
