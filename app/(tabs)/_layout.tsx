import { useColorScheme } from '@/components/useColorScheme';
import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: 0 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Palette.primary,
        tabBarInactiveTintColor: '#BDBDBD',
        headerShown: true,
        tabBarStyle: {
            height: 70,
            paddingBottom: 12,
            paddingTop: 8,
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            backgroundColor: 'white',
        },
        tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: 'Outfit-SemiBold',
            marginTop: 4,
        },
        headerStyle: {
            backgroundColor: Palette.background,
            elevation: 0,
            shadowOpacity: 0,
        },
        headerTitleStyle: {
            fontFamily: 'Outfit-Bold',
            fontSize: 20,
        },
        headerTintColor: Palette.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Farm Wise', // Hidden via headerShown: false in the screen file itself
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
                <TabBarIcon name={focused ? "home" : "home-outline"} color={color} />
            </View>
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Expense',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.fabContainer}>
                <View style={[styles.fab, { backgroundColor: focused ? Palette.primaryDark : Palette.primary }]}>
                    <Ionicons name="add" size={32} color="white" />
                </View>
            </View>
          ),
          tabBarLabel: '', 
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
             <TabBarIcon name={focused ? "receipt" : "receipt-outline"} color={color} />
          ),
          tabBarLabel: 'History',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
    fabContainer: {
        position: 'absolute',
        top: -30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    }
});
