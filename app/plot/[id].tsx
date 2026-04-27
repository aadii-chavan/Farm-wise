import { Text } from '@/components/Themed';
import { TransactionCard } from '@/components/TransactionCard';
import { FilterModal, FilterState } from '@/components/FilterModal';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { useAuth } from '@/context/AuthContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { WorkbookSection } from '@/components/WorkbookSection';

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { plots, transactions, deleteTransaction } = useFarm();
  const { user } = useAuth();

  const confirmDelete = (txId: string) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this activity record? This will also revert any inventory deductions.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTransaction(txId) }
      ]
    );
  };

  const plot = plots.find((p) => p.id === id);
  const plotTransactions = transactions.filter((t) => t.plotId === id);



  const [filterState, setFilterState] = useState<FilterState>({
      type: 'Both',
      categories: [],
      dateFilter: 'All Time',
      customDate: null,
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'History' | 'WorkBook'>('History');

  const allCategories = useMemo(() => {
    return Array.from(new Set(plotTransactions.map(t => t.category)));
  }, [plotTransactions]);

  const filteredTransactions = useMemo(() => {
    return plotTransactions.filter((t) => {
        const d = new Date(t.date);
        const today = new Date();
        
        // Type filter
        if (filterState.type !== 'Both' && t.type !== filterState.type) return false;

        // Date Match
        let dateMatch = true;
        if (filterState.dateFilter === 'This Week') {
            // Simplified this week logic (last 7 days could also work, but "This Week" strictly is since sunday/monday)
            const sun = new Date(today);
            sun.setDate(today.getDate() - today.getDay());
            sun.setHours(0,0,0,0);
            dateMatch = d >= sun;
        } else if (filterState.dateFilter === 'This Month') {
            dateMatch = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        } else if (filterState.dateFilter === 'Last Month') {
            const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            dateMatch = d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
        } else if (filterState.dateFilter === 'Custom Date' && filterState.customDate) {
            dateMatch = d.toDateString() === filterState.customDate.toDateString();
        }
        if (!dateMatch) return false;

        let catMatch = true;
        if (filterState.categories.length > 0) {
            catMatch = filterState.categories.includes(t.category);
        }

        return catMatch;
    });
  }, [plotTransactions, filterState]);

  const income = filteredTransactions
    .filter((t) => t.type === 'Income')
    .reduce((acc, t) => acc + t.amount, 0);
  const expense = filteredTransactions
    .filter((t) => t.type === 'Expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const profit = income - expense;

  const groupedTransactions = useMemo(() => {
      const grouped = filteredTransactions.reduce((acc: any, t) => {
          const dateStr = new Date(t.date).toDateString();
          if (!acc[dateStr]) acc[dateStr] = [];
          acc[dateStr].push(t);
          return acc;
      }, {});

      return Object.keys(grouped)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map(date => ({
            date,
            data: grouped[date]
        }));
  }, [filteredTransactions]);

  const handleDownloadHistoryPDF = async () => {
    try {
        const userName = user?.user_metadata?.full_name || user?.email || 'Farmer';
        
        const totalIncome = income;
        const totalExpense = expense;
        const totalProfit = profit;

        const tableRows = filteredTransactions.map((tx, index) => {
            return `
            <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="text-align: center;">${index + 1}</td>
                <td>${new Date(tx.date).toLocaleDateString('en-GB')}</td>
                <td style="font-weight: 700; color: ${tx.type === 'Income' ? '#10b981' : '#ef4444'}; text-transform: uppercase;">${tx.type}</td>
                <td style="font-weight: 800; color: #1e293b;">${tx.category}</td>
                <td style="color: #334155; line-height: 1.4;">${tx.title}</td>
                <td style="text-align: right; color: ${tx.type === 'Income' ? '#10b981' : '#ef4444'}; font-weight: 700;">₹${tx.amount.toLocaleString()}</td>
                <td style="color: #64748b; font-style: italic; line-height: 1.3;">${tx.note || '-'}</td>
            </tr>
        `}).join('');

        const html = `
            <html>
                <head>
                    <style>
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
                        @page { margin: 15mm; size: A4; }
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #1e293b; line-height: 1.5; width: 100%; }
                        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #006d5b; padding-bottom: 20px; margin-bottom: 25px; }
                        .logo-container { flex: 1; }
                        .logo-text { font-size: 32px; font-weight: 900; color: #006d5b; letter-spacing: -1.5px; margin: 0; }
                        .logo-sub { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; margin-top: -5px; }
                        .report-meta { text-align: right; flex: 1; }
                        .report-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                        .user-info { font-size: 14px; color: #475569; margin-top: 5px; }
                        
                        .plot-details { background-color: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 25px; display: flex; justify-content: space-between; border: 1px solid #e2e8f0; }
                        
                        .stats-grid { display: flex; gap: 15px; margin-bottom: 30px; }
                        .stat-card { flex: 1; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; }
                        .stat-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
                        .stat-value { font-size: 18px; font-weight: 900; }
                        
                        .table-container { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
                        table { width: 100%; border-collapse: collapse; background: white; table-layout: fixed; }
                        th, td { vertical-align: top; padding: 12px 8px; font-size: 11px; word-wrap: break-word; overflow-wrap: break-word; border-bottom: 1px solid #e2e8f0; }
                        th { background-color: #006d5b; color: white; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
                        
                        .footer { margin-top: 40px; padding-top: 25px; border-top: 2px solid #f1f5f9; text-align: center; }
                        .footer-brand { font-size: 16px; font-weight: 800; color: #006d5b; margin-bottom: 4px; }
                        .footer-tagline { font-size: 12px; color: #64748b; font-weight: 500; }
                        .disclaimer { font-size: 10px; color: #94a3b8; margin-top: 15px; font-style: italic; max-width: 90%; margin-left: auto; margin-right: auto; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo-container">
                            <h1 class="logo-text">FarmEzy</h1>
                            <p class="logo-sub">Smart Agriculture</p>
                        </div>
                        <div class="report-meta">
                            <h2 class="report-title">Financial Ledger</h2>
                            <div class="user-info">Prepared for: <b>${userName}</b></div>
                            <div style="font-size: 12px; color: #94a3b8; margin-top: 5px;">Filter: ${filterState.dateFilter}</div>
                        </div>
                    </div>

                    <div class="plot-details">
                        <div>
                            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Plot Details</div>
                            <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${plot?.name || 'Unknown Plot'}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Crop & Area</div>
                            <div style="font-size: 14px; font-weight: 600; color: #334155;">${plot?.cropType || 'N/A'}${plot?.variety ? ` (${plot.variety})` : ''} • ${plot?.area || 0} Acres</div>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Total Income</div>
                            <div class="stat-value" style="color: #10b981;">₹${totalIncome.toLocaleString()}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Expense</div>
                            <div class="stat-value" style="color: #ef4444;">₹${totalExpense.toLocaleString()}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Net Profit/Loss</div>
                            <div class="stat-value" style="color: ${totalProfit >= 0 ? '#10b981' : '#ef4444'};">${totalProfit >= 0 ? '+' : '-'}₹${Math.abs(totalProfit).toLocaleString()}</div>
                        </div>
                    </div>

                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style="text-align: center; width: 5%;">Sr.</th>
                                    <th style="width: 12%;">Date</th>
                                    <th style="width: 10%;">Type</th>
                                    <th style="width: 15%;">Category</th>
                                    <th style="width: 25%;">Title</th>
                                    <th style="text-align: right; width: 15%;">Amount</th>
                                    <th style="width: 18%;">Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>

                    <div class="footer">
                        <div class="footer-brand">FarmEzy</div>
                        <div class="footer-tagline">Your Digital Partner in Modern Agriculture</div>
                        <p class="disclaimer">
                            This Financial Ledger is a system-generated document based on data provided by the user. It is intended for agricultural financial tracking. FarmEzy is not responsible for any discrepancies in manual data entry.
                            <br><br>
                            Generated on: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </body>
            </html>
        `;

        const { uri } = await Print.printToFileAsync({ 
            html,
            base64: false
        });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                UTI: '.pdf',
                mimeType: 'application/pdf',
                dialogTitle: `FarmEzy - Plot Ledger (${plot?.name || 'History'})`
            });
        }
    } catch (error) {
        Alert.alert('Error', 'Failed to generate PDF');
        console.error(error);
    }
  };

  if (!plot) {
    return (
      <View style={styles.container}>
        <Text>Plot not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: plot.name,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Palette.background },
          headerTintColor: Palette.text,
          headerTitleStyle: { fontFamily: 'Outfit-Bold' },
        }} 
      />
      
      <View style={styles.content}>
          <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                  <View style={{ flex: 1 }}>
                      <Text style={styles.statsTitle}>
                          {plot.cropType}{plot.variety ? ` (${plot.variety})` : ''} • {plot.area} Ac
                      </Text>
                      <View style={styles.statsRow}>
                          <Text style={styles.statLabelCompact}>
                              Inc: <Text style={{ color: Palette.success, fontFamily: 'Outfit-Bold' }}>₹{income.toLocaleString()}</Text>
                          </Text>
                          <View style={styles.dotSeparator} />
                          <Text style={styles.statLabelCompact}>
                              Exp: <Text style={{ color: Palette.danger, fontFamily: 'Outfit-Bold' }}>₹{expense.toLocaleString()}</Text>
                          </Text>
                      </View>
                  </View>
                  <View style={[styles.profitBadge, { backgroundColor: profit >= 0 ? Palette.success + '15' : Palette.danger + '15' }]}>
                      <Text style={[styles.profitText, { color: profit >= 0 ? Palette.success : Palette.danger }]}>
                          {profit >= 0 ? '↑' : '↓'} ₹{Math.abs(profit).toLocaleString()}
                      </Text>
                  </View>
              </View>
          </View>

          <View style={styles.tabContainer}>
            <Pressable 
              style={[styles.tabButton, activeTab === 'History' && styles.activeTabButton]}
              onPress={() => setActiveTab('History')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'History' && styles.activeTabButtonText]}>History</Text>
            </Pressable>
            <Pressable 
              style={[styles.tabButton, activeTab === 'WorkBook' && styles.activeTabButton]}
              onPress={() => setActiveTab('WorkBook')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'WorkBook' && styles.activeTabButtonText]}>WorkBook</Text>
            </Pressable>
          </View>

          {activeTab === 'History' ? (
              <>
                  <View style={styles.filterRow}>
                      <Pressable style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
                          <Ionicons name="options" size={16} color={Palette.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.filterButtonText}>Filter</Text>
                          {((filterState.type !== 'Both' ? 1 : 0) + (filterState.dateFilter !== 'All Time' ? 1 : 0) + (filterState.categories.length > 0 ? 1 : 0)) > 0 && (
                          <View style={styles.filterBadge}>
                              <Text style={styles.filterBadgeText}>
                                  {(filterState.type !== 'Both' ? 1 : 0) + (filterState.dateFilter !== 'All Time' ? 1 : 0) + (filterState.categories.length > 0 ? 1 : 0)}
                              </Text>
                          </View>
                          )}
                          <Ionicons name="chevron-down" size={14} color={Palette.textSecondary} style={{ marginLeft: 6 }} />
                      </Pressable>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={styles.historyCount}>{filteredTransactions.length} entries</Text>
                          <Pressable onPress={handleDownloadHistoryPDF} style={styles.downloadButton}>
                              <Ionicons name="cloud-download-outline" size={20} color={Palette.primary} />
                          </Pressable>
                      </View>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                      {groupedTransactions.length === 0 ? (
                          <View style={styles.emptyContainer}>
                              <Ionicons name="receipt-outline" size={48} color={Palette.textSecondary + '40'} />
                              <Text style={styles.emptyText}>No transactions for this plot yet.</Text>
                          </View>
                      ) : (
                          groupedTransactions.map((group, index) => (
                              <View key={group.date} style={styles.timelineGroup}>
                                  <View style={styles.timelineDateContainer}>
                                      <View style={styles.timelineDot} />
                                      <Text style={styles.timelineDateText}>
                                        {new Date(group.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                      </Text>
                                  </View>
                                  <View style={styles.timelineContent}>
                                      {group.data.map((item: any, idx: number) => (
                                          <View key={item.id} style={styles.timelineItemWrapper}>
                                              <TransactionCard 
                                                  transaction={item} 
                                                  onDelete={() => confirmDelete(item.id)}
                                                  onEdit={() => router.push({ pathname: '/add', params: { editId: item.id } })}
                                              />
                                          </View>
                                      ))}
                                  </View>
                              </View>
                          ))
                      )}
                  </ScrollView>
              </>
          ) : (
              <WorkbookSection plotId={id as string} hideHeader />
          )}
      </View>

      {activeTab === 'History' && (
        <Pressable 
          style={styles.fab} 
          onPress={() => router.push({ pathname: '/add', params: { plotId: plot.id } })}
        >
          <Ionicons name="add" size={32} color="white" />
        </Pressable>
      )}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={setFilterState}
        initialFilters={filterState}
        availableCategories={allCategories}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
      flex: 1,
      padding: 16,
  },
  statsCard: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 3,
  },
  statsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  statsTitle: {
      fontSize: 16,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
  },
  statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
  },
  statLabelCompact: {
      fontSize: 12,
      color: Palette.textSecondary,
      fontFamily: 'Outfit',
  },
  dotSeparator: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: '#cbd5e1',
      marginHorizontal: 8,
  },
  profitBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
  },
  profitText: {
      fontSize: 15,
      fontFamily: 'Outfit-Bold',
  },
  filterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'white',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
  },
  filterButtonText: {
      fontFamily: 'Outfit-Medium',
      fontSize: 14,
      color: Palette.text,
  },
  filterBadge: {
      backgroundColor: Palette.primary,
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 1,
      marginLeft: 4,
  },
  filterBadgeText: {
      color: 'white',
      fontSize: 10,
      fontFamily: 'Outfit-Bold',
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyCount: {
      fontSize: 11,
      color: Palette.textSecondary,
      fontFamily: 'Outfit-Medium',
  },
  tabContainer: {
      flexDirection: 'row',
      backgroundColor: '#f1f5f9',
      padding: 3,
      borderRadius: 10,
      marginBottom: 12,
  },
  tabButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 7,
  },
  activeTabButton: {
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
  },
  tabButtonText: {
      fontFamily: 'Outfit-Medium',
      fontSize: 13,
      color: Palette.textSecondary,
  },
  activeTabButtonText: {
      color: Palette.primary,
      fontFamily: 'Outfit-Bold',
  },
  emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 40,
  },
  emptyText: {
      fontSize: 14,
      color: Palette.textSecondary,
      fontFamily: 'Outfit',
      marginTop: 12,
  },
  timelineGroup: {
      marginBottom: 12,
  },
  timelineDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  timelineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Palette.primary,
      marginRight: 10,
  },
  timelineDateText: {
      fontSize: 13,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
  },
  timelineContent: {
      borderLeftWidth: 1.5,
      borderLeftColor: Palette.border,
      marginLeft: 3,
      paddingLeft: 16,
      paddingBottom: 4,
  },
  timelineItemWrapper: {
      marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: Palette.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
