import React, { createContext, useContext, useEffect, useState } from 'react';
import { Expense } from '../types/expense';
import * as Storage from '../utils/storage';

interface ExpensesContextType {
  expenses: Expense[];
  loading: boolean;
  addExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  refreshExpenses: () => Promise<void>;
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadExpenses = async () => {
    setLoading(true);
    const data = await Storage.getExpenses();
    setExpenses(data);
    setLoading(false);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const addExpense = async (expense: Expense) => {
    await Storage.saveExpense(expense);
    await loadExpenses(); // Refresh list
  };

  const deleteExpense = async (id: string) => {
    await Storage.deleteExpense(id);
    await loadExpenses(); // Refresh list
  };

  const refreshExpenses = async () => {
    await loadExpenses();
  };

  return (
    <ExpensesContext.Provider value={{ expenses, loading, addExpense, deleteExpense, refreshExpenses }}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpensesContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpensesProvider');
  }
  return context;
}
