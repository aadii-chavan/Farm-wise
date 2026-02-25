import { PlotCard } from '@/components/PlotCard';
import { Text } from '@/components/Themed';
import { Palette } from '@/constants/Colors';
import { useFarm } from '@/context/FarmContext';
import { Plot } from '@/types/farm';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    TextInput,
    View
} from 'react-native';

export default function PlotsScreen() {
  const { plots, transactions, addPlot, deletePlot, updatePlot } = useFarm();
  const router = useRouter();
  
  // Plot Modal State (Used for both Add and Edit)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [cropType, setCropType] = useState('');

  const resetForm = () => {
    setName('');
    setArea('');
    setCropType('');
    setEditingPlot(null);
  };

  const onSavePlot = async () => {
    if (!name || !area || !cropType) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    if (editingPlot) {
        const updatedPlot = {
            ...editingPlot,
            name,
            area: parseFloat(area),
            cropType,
        };
        await updatePlot(updatedPlot);
    } else {
        const newPlot = {
          id: Date.now().toString(),
          name,
          area: parseFloat(area),
          cropType,
        };
        await addPlot(newPlot);
    }

    resetForm();
    setModalVisible(false);
  };

  const openEditModal = (plot: Plot) => {
    setEditingPlot(plot);
    setName(plot.name);
    setArea(plot.area.toString());
    setCropType(plot.cropType);
    setModalVisible(true);
  };

  const calculateStats = (plotId: string) => {
    const plotTransactions = transactions.filter(t => t.plotId === plotId);
    const income = plotTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const expense = plotTransactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense };
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={plots}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlotCard 
            plot={item} 
            stats={calculateStats(item.id)}
            onPress={() => router.push(`/plot/${item.id}`)}
            onEdit={() => openEditModal(item)}
            onDelete={() => {
                Alert.alert("Delete Plot", `Are you sure you want to delete ${item.name}?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deletePlot(item.id) }
                ]);
            }}
          />
        )}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="map-outline" size={64} color={Palette.textSecondary + '40'} />
                <Text style={styles.emptyText}>No plots added yet.</Text>
                <Pressable style={styles.addBtn} onPress={() => { resetForm(); setModalVisible(true); }}>
                    <Text style={styles.addBtnText}>Add Your First Plot</Text>
                </Pressable>
            </View>
        }
      />

      <Pressable style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
        <Ionicons name="add" size={32} color="white" />
      </Pressable>

      {/* Add/Edit Plot Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{editingPlot ? 'Edit Plot' : 'Add New Plot'}</Text>
                
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Plot Name</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g., North Field" 
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Area (Acres)</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g., 5" 
                        value={area}
                        onChangeText={setArea}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Crop Type</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g., Wheat" 
                        value={cropType}
                        onChangeText={setCropType}
                    />
                </View>

                <View style={styles.modalButtons}>
                    <Pressable style={[styles.btn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[styles.btn, styles.saveBtn]} onPress={onSavePlot}>
                        <Text style={styles.saveBtnText}>{editingPlot ? 'Update Plot' : 'Save Plot'}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 100,
  },
  emptyText: {
      fontSize: 16,
      color: Palette.textSecondary,
      fontFamily: 'Outfit-Medium',
      marginTop: 16,
  },
  addBtn: {
      marginTop: 20,
      backgroundColor: Palette.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
  },
  addBtnText: {
      color: 'white',
      fontFamily: 'Outfit-Bold',
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
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
  },
  modalContent: {
      backgroundColor: 'white',
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 24,
      paddingBottom: 40,
  },
  modalTitle: {
      fontSize: 22,
      fontFamily: 'Outfit-Bold',
      color: Palette.text,
      marginBottom: 20,
  },
  inputGroup: {
      marginBottom: 16,
  },
  label: {
      fontSize: 14,
      fontFamily: 'Outfit-SemiBold',
      color: Palette.text,
      marginBottom: 8,
  },
  input: {
      backgroundColor: Palette.background,
      borderRadius: 16,
      padding: 14,
      fontFamily: 'Outfit',
      borderWidth: 1,
      borderColor: Palette.border,
      color: Palette.text,
  },
  modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
  },
  btn: {
      flex: 1,
      padding: 18,
      borderRadius: 16,
      alignItems: 'center',
  },
  cancelBtn: {
      backgroundColor: Palette.background,
  },
  cancelBtnText: {
      color: Palette.textSecondary,
      fontFamily: 'Outfit-Bold',
  },
  saveBtn: {
      backgroundColor: Palette.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
  },
  saveBtnText: {
      color: 'white',
      fontSize: 16,
      fontFamily: 'Outfit-Bold',
  }
});
