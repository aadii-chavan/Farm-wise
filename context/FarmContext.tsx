import React, { createContext, useContext, useEffect, useState } from 'react';
import { InventoryItem, Plot, Transaction, Task, CustomEntity, GeneralExpense, TaskCompletion, LaborProfile, LaborAttendance, LaborContract, LaborTransaction } from '../types/farm';
import * as Storage from '../utils/storage';
import { useAuth } from './AuthContext';


interface FarmContextType {
  transactions: Transaction[];
  plots: Plot[];
  inventory: InventoryItem[];
  tasks: Task[];
  generalExpenses: GeneralExpense[];
  customEntities: CustomEntity[];
  taskCompletions: TaskCompletion[];
  laborProfiles: LaborProfile[];
  laborAttendance: LaborAttendance[];
  laborContracts: LaborContract[];
  laborTransactions: LaborTransaction[];
  loading: boolean;
  
  // Transactions
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
  
  // Plots
  addPlot: (plot: Plot) => Promise<void>;
  updatePlot: (plot: Plot) => Promise<void>;
  deletePlot: (id: string) => Promise<void>;
  refreshPlots: () => Promise<void>;
  
  // Inventory
  addInventoryItem: (item: InventoryItem) => Promise<void>;
  updateInventoryQuantity: (id: string, delta: number) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  refreshInventory: () => Promise<void>;

  // Tasks
  addTask: (task: Task) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  
  // Custom Entities
  addCustomEntity: (type: 'category' | 'shop' | 'general_category' | 'recurrence', name: string) => Promise<void>;

  toggleTaskCompletion: (taskId: string, date: string) => Promise<void>;

  refreshAll: () => Promise<void>;

  // General Expenses
  addGeneralExpense: (expense: GeneralExpense) => Promise<void>;
  updateGeneralExpense: (expense: GeneralExpense) => Promise<void>;
  deleteGeneralExpense: (id: string) => Promise<void>;

  // Labor Module
  addLaborProfile: (profile: LaborProfile) => Promise<void>;
  saveLaborAttendance: (records: LaborAttendance[]) => Promise<void>;
  addLaborContract: (contract: LaborContract) => Promise<void>;
  updateLaborContract: (contract: LaborContract) => Promise<void>;
  deleteLaborContract: (id: string) => Promise<void>;
  addLaborTransaction: (transaction: LaborTransaction) => Promise<void>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);


export function FarmProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [generalExpenses, setGeneralExpenses] = useState<GeneralExpense[]>([]);
  const [customEntities, setCustomEntities] = useState<CustomEntity[]>([]);
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
  const [laborProfiles, setLaborProfiles] = useState<LaborProfile[]>([]);
  const [laborAttendance, setLaborAttendance] = useState<LaborAttendance[]>([]);
  const [laborContracts, setLaborContracts] = useState<LaborContract[]>([]);
  const [laborTransactions, setLaborTransactions] = useState<LaborTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    if (!session) {
        setTransactions([]);
        setPlots([]);
        setInventory([]);
        setTasks([]);
        setCustomEntities([]);
        setTaskCompletions([]);
        setLaborProfiles([]);
        setLaborAttendance([]);
        setLaborContracts([]);
        setLaborTransactions([]);
        setLoading(false);
        return;
    }

    setLoading(true);
    const [tData, pData, iData, tsData, ceData, geData, tcData, lpData, lcData, ltData, laData] = await Promise.all([
      Storage.getTransactions(),
      Storage.getPlots(),
      Storage.getInventory(),
      Storage.getTasks(),
      Storage.getCustomEntities(),
      Storage.getGeneralExpenses(),
      Storage.getTaskCompletions(),
      Storage.getLaborProfiles(),
      Storage.getLaborContracts(),
      Storage.getLaborTransactions(),
      Storage.getLaborAttendance()
    ]);
    setTransactions(tData);
    setPlots(pData);
    setInventory(iData);
    setTasks(tsData);
    setCustomEntities(ceData);
    setGeneralExpenses(geData);
    setTaskCompletions(tcData);
    setLaborProfiles(lpData);
    setLaborAttendance(laData);
    setLaborContracts(lcData);
    setLaborTransactions(ltData);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
        loadData();
    }
  }, [session, authLoading]);

  const addTransaction = async (transaction: Transaction) => {
    await Storage.saveTransaction(transaction);
    await loadData();
  };

  const updateTransaction = async (transaction: Transaction) => {
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

  const updatePlot = async (plot: Plot) => {
    await Storage.updatePlot(plot);
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

  const addTask = async (task: Task) => {
    await Storage.saveTask(task);
    await loadData();
  };

  const updateTask = async (task: Task) => {
    await Storage.updateTask(task);
    await loadData();
  };

  const deleteTask = async (id: string) => {
    await Storage.deleteTask(id);
    await loadData();
  };

  const addCustomEntity = async (type: 'category' | 'shop' | 'general_category' | 'recurrence', name: string) => {
    await Storage.saveCustomEntity(type, name);
    await loadData();
  };

  const toggleTaskCompletion = async (taskId: string, date: string) => {
    const existing = taskCompletions.find(c => c.taskId === taskId && c.completedAt === date);
    if (existing) {
        await Storage.deleteTaskCompletion(taskId, date);
    } else {
        await Storage.saveTaskCompletion(taskId, date);
    }
    await loadData();
  };

  const refreshAll = async () => {
    await loadData();
  };

  const addGeneralExpense = async (expense: GeneralExpense) => {
    await Storage.saveGeneralExpense(expense);
    await loadData();
  };

  const updateGeneralExpense = async (expense: GeneralExpense) => {
    await Storage.saveGeneralExpense(expense);
    await loadData();
  };

  const deleteGeneralExpense = async (id: string) => {
    await Storage.deleteGeneralExpense(id);
    await loadData();
  };

  const addLaborProfile = async (profile: LaborProfile) => {
    await Storage.saveLaborProfile(profile);
    await loadData();
  };

  const saveLaborAttendance = async (records: LaborAttendance[]) => {
    await Storage.saveLaborAttendanceBatch(records);
    await loadData();
  };

  const addLaborContract = async (contract: LaborContract) => {
    await Storage.saveLaborContract(contract);
    
    // Automatically log the initial advance as a transaction
    if (contract.advancePaid > 0) {
      await addLaborTransaction({
        id: '',
        workerId: contract.contractorId,
        amount: contract.advancePaid,
        date: contract.startDate || new Date().toISOString().split('T')[0],
        type: 'Contract Payment',
        note: `Initial Advance: ${contract.projectName}`
      });
    } else {
      await loadData();
    }
  };

  const updateLaborContract = async (contract: LaborContract) => {
    await Storage.saveLaborContract(contract);
    await loadData();
  };

  const deleteLaborContract = async (id: string) => {
    await Storage.deleteLaborContract(id);
    await loadData();
  };

  const addLaborTransaction = async (transaction: LaborTransaction) => {
    await Storage.saveLaborTransaction(transaction);
    await loadData();
  };

  return (
    <FarmContext.Provider value={{ 
      transactions, 
      plots, 
      inventory, 
      tasks,
      loading, 
      addTransaction, 
      updateTransaction,
      deleteTransaction, 
      refreshTransactions: refreshAll,
      addPlot,
      updatePlot,
      deletePlot,
      refreshPlots: refreshAll,
      addInventoryItem,
      updateInventoryQuantity,
      deleteInventoryItem,
      refreshInventory: refreshAll,
      addTask,
      updateTask,
      deleteTask,
      refreshTasks: refreshAll,
      generalExpenses,
      addGeneralExpense,
      updateGeneralExpense,
      deleteGeneralExpense,
      customEntities,
      addCustomEntity,
      taskCompletions,
      toggleTaskCompletion,
      refreshAll,
      laborProfiles,
      laborAttendance,
      laborContracts,
      laborTransactions,
      addLaborProfile,
      saveLaborAttendance,
      addLaborContract,
      updateLaborContract,
      deleteLaborContract,
      addLaborTransaction
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
