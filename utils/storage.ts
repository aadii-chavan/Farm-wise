import { Expense } from '@/types/expense';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPENSES_KEY = '@farm_wise_expenses_v1';
const SEASON_DATE_KEY = '@farm_wise_season_date_v1';

export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(EXPENSES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to load expenses', e);
    return [];
  }
};

export const saveExpense = async (expense: Expense): Promise<void> => {
  try {
    const expenses = await getExpenses();
    const newExpenses = [expense, ...expenses];
    await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(newExpenses));
  } catch (e) {
    console.error('Failed to save expense', e);
  }
};

export const deleteExpense = async (id: string): Promise<void> => {
  try {
    const expenses = await getExpenses();
    const newExpenses = expenses.filter((e) => e.id !== id);
    await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(newExpenses));
  } catch (e) {
      console.error('Failed to delete expense', e);
  }
};

export const clearExpenses = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(EXPENSES_KEY);
    } catch (e) {
        console.error('Failed to clear expenses', e);
    }
}

export const getSeasonStartDate = async (): Promise<Date> => {
    try {
        const jsonValue = await AsyncStorage.getItem(SEASON_DATE_KEY);
        // Default to Jan 1st of current year if not set
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
