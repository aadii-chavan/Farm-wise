import React, { createContext, useContext, useEffect, useState } from 'react';
import { InventoryItem, Plot, Transaction, Task, CustomEntity, GeneralExpense, TaskCompletion, LaborProfile, LaborAttendance, LaborContract, LaborTransaction, RainRecord, WorkbookEntry } from '../types/farm';
import * as Storage from '../utils/storage';
import { useAuth } from './AuthContext';
import { format, parse, differenceInDays } from 'date-fns';


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
  rainRecords: RainRecord[];
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
  addCustomEntity: (type: 'category' | 'shop' | 'general_category' | 'workbook_category', name: string) => Promise<void>;

  toggleTaskCompletion: (taskId: string, date: string) => Promise<void>;

  refreshAll: () => Promise<void>;

  // General Expenses
  addGeneralExpense: (expense: GeneralExpense) => Promise<void>;
  updateGeneralExpense: (expense: GeneralExpense) => Promise<void>;
  deleteGeneralExpense: (id: string) => Promise<void>;

  // Labor Module
  addLaborProfile: (profile: LaborProfile) => Promise<void>;
  updateLaborProfile: (profile: LaborProfile) => Promise<void>;
  deleteLaborProfile: (id: string) => Promise<void>;
  saveLaborAttendance: (records: LaborAttendance[]) => Promise<void>;
  addLaborContract: (contract: LaborContract) => Promise<void>;
  updateLaborContract: (contract: LaborContract) => Promise<void>;
  deleteLaborContract: (id: string) => Promise<void>;
  addLaborTransaction: (transaction: LaborTransaction) => Promise<void>;
  
  // Rain Meter
  addRainRecord: (record: RainRecord) => Promise<void>;
  updateRainRecord: (record: RainRecord) => Promise<void>;
  deleteRainRecord: (id: string) => Promise<void>;


  getWorkbookEntries: (plotId: string) => Promise<WorkbookEntry[]>;
  saveWorkbookEntry: (entry: Partial<WorkbookEntry>) => Promise<void>;
  deleteWorkbookEntry: (id: string) => Promise<void>;
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
  const [rainRecords, setRainRecords] = useState<RainRecord[]>([]);
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
    const [tData, pData, iData, tsData, ceData, geData, tcData, lpData, lcData, ltData, laData, raData] = await Promise.all([
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
      Storage.getLaborAttendance(),
      Storage.getRainRecords()
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
    setRainRecords(raData || []);
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
    // Optimistic Update
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
        await Storage.deleteTask(id);
    } catch (e) {
        // Revert on error - this would require storing the deleted task temporarily
        // For simplicity and better UX, we just refresh if there's an error
        await loadData();
    }
  };

  const addCustomEntity = async (type: 'category' | 'shop' | 'general_category' | 'workbook_category', name: string) => {
    await Storage.saveCustomEntity(type, name);
    await loadData();
  };

  const toggleTaskCompletion = async (taskId: string, date: string) => {
    // Optimistic Update
    const isAdding = !taskCompletions.some(c => c.taskId === taskId && c.completedAt === date);
    const task = tasks.find(t => t.id === taskId);
    
    if (isAdding) {
        const newRecord = { id: Math.random().toString(), taskId, completedAt: date };
        setTaskCompletions(prev => [...prev, newRecord]);
        try {
            await Storage.saveTaskCompletion(taskId, date);
            
            // Auto-adjust Task Date if it was missed (scheduled date < completion date)
            if (task && task.date < date) {
                try {
                    await Storage.updateTask({ ...task, date: date });
                    // Refresh tasks in state to reflect the move
                    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, date: date } : t));
                } catch (err) {
                    console.error('Failed to auto-adjust task date:', err);
                }
            }
            
            // Sync to Workbook if enabled (wrapped in its own try/catch to prevent revert)
            try {
                if (task?.syncToWorkbook && task.plot) {
                    const plot = plots.find(p => p.name === task.plot);
                    if (plot) {
                        // Calculate Days Past
                        const allEntries = await Storage.getWorkbookEntries(plot.id);
                        let daysPast = 0;
                        
                        if (allEntries && allEntries.length > 0) {
                            const parseDateHelper = (d: string) => d.includes('-') ? parse(d, 'yyyy-MM-dd', new Date()) : parse(d, 'dd/MM/yy', new Date());
                            const sorted = allEntries.sort((a, b) => {
                                try {
                                    const dA = parseDateHelper(a.data.date);
                                    const dB = parseDateHelper(b.data.date);
                                    return dA.getTime() - dB.getTime();
                                } catch (e) { return 0; }
                            });
                            const first = sorted[0];
                            const refDate = parseDateHelper(first.data.date);
                            const refDays = parseInt(first.data.daysPast || '0');
                            const current = parse(date, 'yyyy-MM-dd', new Date());
                            daysPast = refDays + differenceInDays(current, refDate);
                        }

                        // Sync Rain
                        const rain = rainRecords.find(r => r.date === date);

                        await Storage.saveWorkbookEntry({
                            plotId: plot.id,
                            data: {
                                date: format(parse(date, 'yyyy-MM-dd', new Date()), 'dd/MM/yy'),
                                daysPast: daysPast.toString(),
                                category: task.workbookDetails?.category || task.categories[0] || 'Task',
                                description: task.workbookDetails?.description || task.title,
                                rain: rain ? rain.amount.toString() : '',
                                note: task.note || '',
                                sourceTaskId: taskId,
                                sourceCompletionDate: date
                            }
                        });
                    }
                }
            } catch (syncErr) {
                console.error('Workbook Sync failed but task completion saved:', syncErr);
            }
        } catch (e) {
            setTaskCompletions(prev => prev.filter(c => c.id !== newRecord.id));
        }
    } else {
        const existing = taskCompletions.find(c => c.taskId === taskId && c.completedAt === date);
        if (existing) {
            setTaskCompletions(prev => prev.filter(c => c.id !== existing.id));
            try {
                await Storage.deleteTaskCompletion(taskId, date);

                // Delete synced workbook entry if exists (wrapped in its own try/catch)
                try {
                    if (task?.syncToWorkbook && task.plot) {
                        const plot = plots.find(p => p.name === task.plot);
                        if (plot) {
                            const allEntries = await Storage.getWorkbookEntries(plot.id);
                            const linkedEntry = allEntries.find(e => 
                                e.data.sourceTaskId === taskId && 
                                e.data.sourceCompletionDate === date
                            );
                            if (linkedEntry) {
                                await Storage.deleteWorkbookEntry(linkedEntry.id);
                            }
                        }
                    }
                } catch (delErr) {
                    console.error('Failed to cleanup workbook entry during task undo:', delErr);
                }
            } catch (e) {
                setTaskCompletions(prev => [...prev, existing]);
            }
        }
    }
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

  const updateLaborProfile = async (profile: LaborProfile) => {
    await Storage.saveLaborProfile(profile);
    await loadData();
  };

  const deleteLaborProfile = async (id: string) => {
    const profile = laborProfiles.find(p => p.id === id);
    if (profile) {
      await Storage.saveLaborProfile({ ...profile, isActive: false });
      await loadData();
    }
  };

  const saveLaborAttendance = async (records: LaborAttendance[]) => {
    await Storage.saveLaborAttendanceBatch(records);
    await loadData();
  };

  const addLaborContract = async (contract: LaborContract) => {
    const saved = await Storage.saveLaborContract(contract);
    
    // Automatically log the initial advance as a transaction
    if (saved && saved.advancePaid > 0) {
      await addLaborTransaction({
        id: '',
        workerId: saved.contractorId,
        amount: saved.advancePaid,
        date: saved.startDate || new Date().toISOString().split('T')[0],
        type: 'Contract Payment',
        note: `Initial Advance: ${saved.projectName}`,
        contractId: saved.id
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

  const addRainRecord = async (record: RainRecord) => {
    // Generate a temporary ID if it's a new record
    const tempId = record.id || Date.now().toString();
    const optimisticRecord = { ...record, id: tempId };
    
    setRainRecords(prev => {
        const filtered = prev.filter(r => r.id !== record.id);
        return [optimisticRecord, ...filtered].sort((a,b) => b.date.localeCompare(a.date));
    });

    try {
        await Storage.saveRainRecord(record);
    } catch (e) {
        await loadData();
    }
  };

  const updateRainRecord = async (record: RainRecord) => {
    setRainRecords(prev => prev.map(r => r.id === record.id ? record : r));
    try {
        await Storage.saveRainRecord(record);
    } catch (e) {
        await loadData();
    }
  };

  const deleteRainRecord = async (id: string) => {
    setRainRecords(prev => prev.filter(r => r.id !== id));
    try {
        await Storage.deleteRainRecord(id);
    } catch (e) {
        await loadData();
    }
  };

  const getWorkbookEntries = async (plotId: string) => await Storage.getWorkbookEntries(plotId);
  
  const saveWorkbookEntry = async (entry: Partial<WorkbookEntry>) => {
    await Storage.saveWorkbookEntry(entry);
    await loadData();
  };

  const deleteWorkbookEntry = async (id: string) => {
    await Storage.deleteWorkbookEntry(id);
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
      updateLaborProfile,
      deleteLaborProfile,
      saveLaborAttendance,
      addLaborContract,
      updateLaborContract,
      deleteLaborContract,
      addLaborTransaction,
      rainRecords,
      addRainRecord,
      updateRainRecord,
      deleteRainRecord,
      getWorkbookEntries,
      saveWorkbookEntry,
      deleteWorkbookEntry
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
