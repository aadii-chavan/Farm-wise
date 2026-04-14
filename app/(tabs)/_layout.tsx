import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import FloatingActionButton from '@/components/FloatingActionButton';

function DrawerIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={22} style={{ marginRight: 0 }} {...props} />;
}

const MenuButton = () => {
    const navigation = useNavigation();
    return (
        <Pressable 
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={{ marginLeft: 20 }}
        >
            <Ionicons name="reorder-two-outline" size={32} color={Palette.text} />
        </Pressable>
    );
};

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerActiveTintColor: Palette.primary,
          drawerInactiveTintColor: Palette.textSecondary,
          drawerLabelStyle: {
            fontFamily: 'Outfit-SemiBold',
            fontSize: 15,
            marginLeft: 0,
          },
          drawerItemStyle: {
            borderRadius: 12,
            marginHorizontal: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
          },
          headerShown: true,
          headerStyle: {
            backgroundColor: 'white',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            fontFamily: 'Outfit-Bold',
            fontSize: 20,
          },
          headerTintColor: Palette.text,
          headerLeft: () => <MenuButton />,
        }}>
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: 'Dashboard',
            title: 'Farm Wise',
            drawerIcon: ({ color }) => <DrawerIcon name="grid-outline" color={color} />,
          }}
        />
        <Drawer.Screen
          name="analysis"
          options={{
            drawerLabel: 'Analysis',
            title: 'Financial Insights',
            drawerIcon: ({ color }) => <DrawerIcon name="analytics-outline" color={color} />,
          }}
        />
        <Drawer.Screen
          name="plots"
          options={{
            drawerLabel: 'Plots',
            title: 'My Plots',
            drawerIcon: ({ color }) => <DrawerIcon name="map-outline" color={color} />,
          }}
        />
        <Drawer.Screen
          name="inventory"
          options={{
            drawerLabel: 'Inventory',
            title: 'Stock & Inventory',
            drawerIcon: ({ color }) => <DrawerIcon name="cube-outline" color={color} />,
          }}
        />
        <Drawer.Screen
          name="shops"
          options={{
            drawerLabel: 'Shops',
            title: 'Shop Ledgers',
            drawerIcon: ({ color }) => <DrawerIcon name="business-outline" color={color} />,
          }}
        />
        <Drawer.Screen
          name="schedule"
          options={{
            drawerLabel: 'Schedule',
            title: 'Tasks & Calendar',
            drawerIcon: ({ color }) => <DrawerIcon name="calendar-outline" color={color} />,
          }}
        />
      </Drawer>
      
      {/* The master professional Add button */}
      <FloatingActionButton />
    </View>
  );
}

const styles = StyleSheet.create({});
