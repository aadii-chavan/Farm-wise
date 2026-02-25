import React, { createContext, useContext, useEffect, useState } from 'react';
import { InventoryItem, Plot, Transaction } from '../types/farm';
import * as Storage from '../utils/storage';

interface FarmContextType {
  transactions: Transaction[];
  plots: Plot[];
  inventory: InventoryItem[];
  loading: boolean;
  
  // Transactions
  addTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
  
  // Plots
  addPlot: (plot: Plot) => Promise<void>;
  deletePlot: (id: string) => Promise<void>;
  refreshPlots: () => Promise<void>;
  
  // Inventory
  addInventoryItem: (item: InventoryItem) => Promise<void>;
  updateInventoryQuantity: (id: string, delta: number) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  refreshInventory: () => Promise<void>;

  refreshAll: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    const [tData, pData, iData] = await Promise.all([
      Storage.getTransactions(),
      Storage.getPlots(),
      Storage.getInventory()
    ]);
    setTransactions(tData);
    setPlots(pData);
    setInventory(iData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const addTransaction = async (transaction: Transaction) => {
    await Storage.saveTransaction(transaction);
    await loadData();
  };

  const deleteTransaction = async (id: string) => {
    await Storage.deleteTransaction(id);
    await loadData();
  };

  const addPlot = async (plot: Plot) => {
    await Storage.savePlot(plot);
    await loadData();
  };

  const deletePlot = async (id: string) => {
    await Storage.deletePlot(id);
    await loadData();
  };

  const addInventoryItem = async (item: InventoryItem) => {
    await Storage.saveInventoryItem(item);
    await loadData();
  };

  const updateInventoryQuantity = async (id: string, delta: number) => {
    await Storage.updateInventoryQuantity(id, delta);
    await loadData();
  };

  const deleteInventoryItem = async (id: string) => {
    await Storage.deleteInventoryItem(id);
    await loadData();
  };

  const refreshAll = async () => {
    await loadData();
  };

  return (
    <FarmContext.Provider value={{ 
      transactions, 
      plots, 
      inventory, 
      loading, 
      addTransaction, 
      deleteTransaction, 
      refreshTransactions: refreshAll,
      addPlot,
      deletePlot,
      refreshPlots: refreshAll,
      addInventoryItem,
      updateInventoryQuantity,
      deleteInventoryItem,
      refreshInventory: refreshAll,
      refreshAll
    }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (context === undefined) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return context;
}
