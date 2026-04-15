import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ShopsPage() {
    const { inventory, transactions } = useFarm();
    const router = useRouter();

    const shopProfiles = useMemo(() => {
        const shopsRaw: Record<string, typeof inventory> = {};
        inventory.forEach(item => {
            if (item.shopName && item.shopName.trim() !== '') {
                const sName = item.shopName.trim();
                if (!shopsRaw[sName]) shopsRaw[sName] = [];
                shopsRaw[sName].push(item);
            }
        });

        return Object.keys(shopsRaw).map(shopName => {
            const items = shopsRaw[shopName];
            
            // Total spent = qty * pricePerUnit for ALL items bought here
            const totalSpent = items.reduce((acc, it) => acc + (it.quantity * (it.pricePerUnit || 0)), 0);
            
            // Total Credit items
            const creditItems = items.filter(i => i.paymentMode === 'Credit');
            
            // Calculate base rough credit (for list preview - deeper interest on inner page)
            const principalCredit = creditItems.reduce((acc, it) => acc + (it.quantity * (it.pricePerUnit || 0)), 0);
            
            // Total Payments made to this shop
            const payments = transactions.filter(t => t.type === 'Expense' && t.category === 'Shop Payment' && t.title === shopName);
            const totalPayments = payments.reduce((acc, p) => acc + p.amount, 0);

            const currentCredit = Math.max(0, principalCredit - totalPayments);

            return {
                shopName,
                itemCount: items.length,
                totalSpent,
                currentCredit,
            };
        }).sort((a,b) => b.totalSpent - a.totalSpent);
    }, [inventory, transactions]);

    return (
        <>
            <Stack.Screen 
               options={{ 
                   headerShown: false, 
               }} 
            />
            <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                {shopProfiles.map(shop => (
                    <Pressable 
                       key={shop.shopName} 
                       style={styles.card}
                       onPress={() => router.push({ pathname: '/shop-detail', params: { name: shop.shopName } })}
                    >
                        <View style={styles.cardHeader}>
                            <View style={styles.headerLeft}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="storefront" size={20} color={Palette.primary} />
                                </View>
                                <Text style={styles.shopName}>{shop.shopName}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Palette.textSecondary} />
                        </View>
                        
                        <View style={styles.metricsRow}>
                             <View style={styles.metricBox}>
                                 <Text style={styles.metricLabel}>Total Spent (All items)</Text>
                                 <Text style={styles.metricVal}>₹{shop.totalSpent.toLocaleString('en-IN')}</Text>
                             </View>
                              <View style={styles.metricBox}>
                                 <Text style={styles.metricLabel}>Current Credit (Approx)</Text>
                                 <Text style={[styles.metricVal, { color: shop.currentCredit > 0 ? Palette.danger : Palette.success }]}>
                                    ₹{shop.currentCredit.toLocaleString('en-IN')}
                                 </Text>
                              </View>
                        </View>
                    </Pressable>
                ))}
                
                {shopProfiles.length === 0 && (
                    <Text style={styles.emptyText}>No shops have been recorded yet. Add a shop name when buying inventory supplies!</Text>
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: Palette.background, 
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Palette.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    shopName: {
        fontFamily: 'Outfit-Bold',
        fontSize: 18,
        color: Palette.text,
    },
    metricsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 16,
    },
    metricBox: {
        flex: 1,
    },
    metricLabel: {
        fontFamily: 'Outfit-Medium',
        fontSize: 12,
        color: Palette.textSecondary,
        marginBottom: 4,
    },
    metricVal: {
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
        color: Palette.text,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontFamily: 'Outfit',
        color: Palette.textSecondary,
        fontSize: 14,
        paddingHorizontal: 20,
    }
});
