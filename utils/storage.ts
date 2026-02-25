import { InventoryItem, Plot, Transaction } from '@/types/farm';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRANSACTIONS_KEY = '@farm_wise_transactions_v2';
const PLOTS_KEY = '@farm_wise_plots_v2';
const INVENTORY_KEY = '@farm_wise_inventory_v2';
const SEASON_DATE_KEY = '@farm_wise_season_date_v1';

// Transactions
export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to load transactions', e);
    return [];
  }
};

export const saveTransaction = async (transaction: Transaction): Promise<void> => {
  try {
    const transactions = await getTransactions();
    const newTransactions = [transaction, ...transactions];
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(newTransactions));
    
    // Auto-update inventory if linked
    if (transaction.inventoryItemId && transaction.quantity) {
        // If Expense, we are buying (adding to stock). 
        // If Income, maybe selling? (But usually seeds/fert are expenses).
        // Let's assume for seeded categories, negative quantity means usage.
        const delta = transaction.type === 'Expense' ? transaction.quantity : -transaction.quantity;
        await updateInventoryQuantity(transaction.inventoryItemId, delta);
    }
  } catch (e) {
    console.error('Failed to save transaction', e);
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    const transactions = await getTransactions();
    const newTransactions = transactions.filter((t) => t.id !== id);
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(newTransactions));
  } catch (e) {
      console.error('Failed to delete transaction', e);
  }
};

// Plots
export const getPlots = async (): Promise<Plot[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(PLOTS_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Failed to load plots', e);
        return [];
    }
};

export const savePlot = async (plot: Plot): Promise<void> => {
    try {
        const plots = await getPlots();
        const newPlots = [plot, ...plots];
        await AsyncStorage.setItem(PLOTS_KEY, JSON.stringify(newPlots));
    } catch (e) {
        console.error('Failed to save plot', e);
    }
};

export const deletePlot = async (id: string): Promise<void> => {
    try {
        const plots = await getPlots();
        const newPlots = plots.filter((p) => p.id !== id);
        await AsyncStorage.setItem(PLOTS_KEY, JSON.stringify(newPlots));
    } catch (e) {
        console.error('Failed to delete plot', e);
    }
};

// Inventory
export const getInventory = async (): Promise<InventoryItem[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(INVENTORY_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Failed to load inventory', e);
        return [];
    }
};

export const saveInventoryItem = async (item: InventoryItem): Promise<void> => {
    try {
        const inventory = await getInventory();
        const existingIndex = inventory.findIndex(i => i.id === item.id);
        let newInventory;
        if (existingIndex >= 0) {
            newInventory = [...inventory];
            newInventory[existingIndex] = item;
        } else {
            newInventory = [item, ...inventory];
        }
        await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(newInventory));
    } catch (e) {
        console.error('Failed to save inventory item', e);
    }
};

export const updateInventoryQuantity = async (id: string, delta: number): Promise<void> => {
    try {
        const inventory = await getInventory();
        const item = inventory.find(i => i.id === id);
        if (item) {
            item.quantity += delta;
            await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
        }
    } catch (e) {
        console.error('Failed to update inventory quantity', e);
    }
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
    try {
        const inventory = await getInventory();
        const newInventory = inventory.filter((i) => i.id !== id);
        await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(newInventory));
    } catch (e) {
        console.error('Failed to delete inventory item', e);
    }
};

export const getSeasonStartDate = async (): Promise<Date> => {
    try {
        const jsonValue = await AsyncStorage.getItem(SEASON_DATE_KEY);
        return jsonValue != null ? new Date(JSON.parse(jsonValue)) : new Date(new Date().getFullYear(), 0, 1);
    } catch (e) {
        console.error('Failed to load season date', e);
        return new Date(new Date().getFullYear(), 0, 1);
    }
};

export const setSeasonStartDate = async (date: Date): Promise<void> => {
    try {
        await AsyncStorage.setItem(SEASON_DATE_KEY, JSON.stringify(date.toISOString()));
    } catch (e) {
        console.error('Failed to save season date', e);
    }
};

