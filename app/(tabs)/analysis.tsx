import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Palette } from '@/constants/Colors';
import { Stack } from 'expo-router';

export default function AnalysisPage() {
    return (
        <>
            <Stack.Screen 
               options={{ 
                   title: 'Analysis', 
                   headerShown: true, 
                   headerShadowVisible: false, 
                   headerStyle: { backgroundColor: Palette.background } 
               }} 
            />
            <View style={styles.container}>
                <Text style={styles.text}>Analysis module coming soon.</Text>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: Palette.background, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    text: { 
        fontFamily: 'Outfit', 
        color: Palette.textSecondary 
    }
});
