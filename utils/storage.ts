import { InventoryItem, Plot, Transaction, GeneralExpense, Task, TaskCompletion, LaborProfile, LaborAttendance, LaborContract, LaborTransaction } from '@/types/farm';
import { supabase } from './supabase';

// Helper to check if a string is a valid UUID
const isUUID = (uuid: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
};

// Helper to get authenticated user ID
const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

// Transactions
export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
        // If table not found, it might be a cache issue or sync issue
        if (error.code === 'PGRST205') {
            console.warn('Supabase Schema Cache error. Please refresh schema in Supabase Dashboard.');
        }
        throw error;
    }
    return (data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      category: t.category,
      amount: Number(t.amount),
      date: t.date,
      plotId: t.plot_id,
      inventoryItemId: t.inventory_item_id,
      quantity: t.quantity ? Number(t.quantity) : undefined,
      note: t.note,
    }));
  } catch (e) {
    console.error('Failed to load transactions', e);
    return [];
  }
};

export const saveTransaction = async (transaction: Transaction): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');

    // Only pass the ID if it's a valid UUID (meaning it's an update)
    // Otherwise let Supabase generate it
    const transactionData: any = {
      user_id: userId,
      title: transaction.title,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      date: transaction.date,
      plot_id: transaction.plotId && isUUID(transaction.plotId) ? transaction.plotId : null,
      inventory_item_id: transaction.inventoryItemId && isUUID(transaction.inventoryItemId) ? transaction.inventoryItemId : null,
      quantity: transaction.quantity || null,
      note: transaction.note || null,
    };

    if (transaction.id && isUUID(transaction.id)) {
      transactionData.id = transaction.id;
    }

    const { error } = await supabase.from('transactions').upsert(transactionData);

    if (error) throw error;
    
    // Auto-update inventory if linked
    if (transaction.inventoryItemId && transaction.quantity && isUUID(transaction.inventoryItemId)) {
        let delta = 0;
        if (transaction.type === 'Expense') {
            delta = transaction.plotId ? -transaction.quantity : transaction.quantity;
        } else {
            delta = -transaction.quantity; 
        }
        await updateInventoryQuantity(transaction.inventoryItemId, delta);
    }
  } catch (e) {
    console.error('Failed to save transaction', e);
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    if (!isUUID(id)) return;
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  } catch (e) {
      console.error('Failed to delete transaction', e);
  }
};

// Plots
export const getPlots = async (): Promise<Plot[]> => {
    try {
        const { data, error } = await supabase
          .from('plots')
          .select('*')
          .order('name');
        if (error) throw error;
        return data.map(p => ({
            id: p.id,
            name: p.name,
            area: Number(p.area),
            cropType: p.crop_type,
            variety: p.variety
        }));
    } catch (e) {
        console.error('Failed to load plots', e);
        return [];
    }
};

export const savePlot = async (plot: Plot): Promise<void> => {
    try {
        const userId = await getUserId();
        if (!userId) throw new Error('User not authenticated');

        const plotData: any = {
            user_id: userId,
            name: plot.name,
            area: plot.area,
            crop_type: plot.cropType,
            variety: plot.variety || null
        };

        if (plot.id && isUUID(plot.id)) {
            plotData.id = plot.id;
        }

        const { error } = await supabase.from('plots').upsert(plotData);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save plot', e);
    }
};

export const deletePlot = async (id: string): Promise<void> => {
    try {
        if (!isUUID(id)) return;
        const { error } = await supabase
          .from('plots')
          .delete()
          .eq('id', id);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to delete plot', e);
    }
};

export const updatePlot = async (plot: Plot): Promise<void> => {
    try {
        if (!plot.id || !isUUID(plot.id)) return;
        const { error } = await supabase
          .from('plots')
          .update({
              name: plot.name,
              area: plot.area,
              crop_type: plot.cropType,
              variety: plot.variety || null
          })
          .eq('id', plot.id);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to update plot', e);
    }
};

// Inventory
export const getInventory = async (): Promise<InventoryItem[]> => {
    try {
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .order('name');
        if (error) throw error;
        return data.map(i => ({
            id: i.id,
            name: i.name,
            category: i.category,
            quantity: Number(i.quantity),
            numPackages: i.num_packages ? Number(i.num_packages) : undefined,
            sizePerPackage: i.size_per_package ? Number(i.size_per_package) : undefined,
            unit: i.unit,
            pricePerUnit: i.price_per_unit,
            shopName: i.shop_name,
            companyName: i.company_name,
            batchNo: i.batch_no,
            paymentMode: i.payment_mode,
            invoiceNo: i.invoice_no,
            note: i.note,
            purchaseDate: i.purchase_date,
            interestRate: i.interest_rate ? Number(i.interest_rate) : undefined,
            interestPeriod: i.interest_period,
            batchId: i.batch_id
        }));
    } catch (e) {
        console.error('Failed to load inventory', e);
        return [];
    }
};

export const saveInventoryItem = async (item: InventoryItem): Promise<void> => {
    try {
        const userId = await getUserId();
        if (!userId) throw new Error('User not authenticated');

        const itemData: any = {
            user_id: userId,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            num_packages: item.numPackages,
            size_per_package: item.sizePerPackage,
            unit: item.unit,
            price_per_unit: item.pricePerUnit,
            shop_name: item.shopName,
            company_name: item.companyName,
            batch_no: item.batchNo,
            payment_mode: item.paymentMode,
            invoice_no: item.invoiceNo,
            note: item.note,
            purchase_date: item.purchaseDate,
            interest_rate: item.interestRate,
            interest_period: item.interestPeriod,
            batch_id: item.batchId
        };

        if (item.id && isUUID(item.id)) {
            itemData.id = item.id;
        }

        const { error } = await supabase.from('inventory').upsert(itemData);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save inventory item', e);
    }
};

export const updateInventoryQuantity = async (id: string, delta: number): Promise<void> => {
    try {
        if (!isUUID(id)) return;
        
        const { data: item, error: fetchError } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('id', id)
            .single();
        
        if (fetchError) throw fetchError;

        const { error } = await supabase
          .from('inventory')
          .update({ quantity: Number(item.quantity) + delta })
          .eq('id', id);
        
        if (error) throw error;
    } catch (e) {
        console.error('Failed to update inventory quantity', e);
    }
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
    try {
        if (!isUUID(id)) return;
        const { error } = await supabase
          .from('inventory')
          .delete()
          .eq('id', id);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to delete inventory item', e);
    }
};

export const getSeasonStartDate = async (): Promise<Date> => {
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('season_start_date')
            .single();
        
        if (error && error.code !== 'PGRST116') throw error; 
        
        return data?.season_start_date ? new Date(data.season_start_date) : new Date(new Date().getFullYear(), 0, 1);
    } catch (e) {
        console.error('Failed to load season date', e);
        return new Date(new Date().getFullYear(), 0, 1);
    }
};

export const setSeasonStartDate = async (date: Date): Promise<void> => {
    try {
        const userId = await getUserId();
        if (!userId) return;

        const { error } = await supabase.from('user_settings').upsert({
            user_id: userId,
            season_start_date: date.toISOString()
        });
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save season date', e);
    }
};

// Tasks
export const getTasks = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('time');
        
        if (error) {
            if (error.code === 'PGRST205') console.warn('Supabase Schema Cache error.');
            throw error;
        }
        return (data || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            time: t.time,
            date: t.date,
            categories: t.categories || [t.category] || [],
            plot: t.plot,
            completed: t.completed,
            recurrence: t.recurrence || 'None',
            assignedTo: t.assigned_to,
            note: t.note,
        }));
    } catch (e) {
        console.error('Failed to load tasks', e);
        return [];
    }
};

export const saveTask = async (task: any): Promise<void> => {
    try {
        const userId = await getUserId();
        if (!userId) throw new Error('User not authenticated');

        const taskData: any = {
            user_id: userId,
            title: task.title,
            time: task.time,
            date: task.date,
            category: task.categories[0] || 'Misc', // Legacy fallback
            categories: task.categories,
            plot: task.plot || null,
            completed: task.completed,
            recurrence: task.recurrence || 'None',
            assigned_to: task.assignedTo || null,
            note: task.note || null,
        };

        if (task.id && isUUID(task.id)) {
            taskData.id = task.id;
        }

        const { error } = await supabase.from('tasks').upsert(taskData);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save task', e);
    }
};

export const updateTask = async (task: any): Promise<void> => {
    try {
        if (!task.id || !isUUID(task.id)) return;
        const { error } = await supabase
            .from('tasks')
            .update({
                title: task.title,
                time: task.time,
                date: task.date,
                category: task.categories[0] || 'Misc', // Legacy fallback
                categories: task.categories,
                plot: task.plot || null,
                completed: task.completed,
                recurrence: task.recurrence || 'None',
                assigned_to: task.assignedTo || null,
                note: task.note || null,
            })
            .eq('id', task.id);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to update task', e);
    }
};

export const deleteTask = async (id: string): Promise<void> => {
    try {
        if (!isUUID(id)) return;
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to delete task', e);
    }
};

// Custom Entities (Shops & Categories)
export const getCustomEntities = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
          .from('custom_entities')
          .select('*')
          .order('name');
        
        if (error) throw error;
        return (data || []).map(e => ({
            id: e.id,
            entityType: e.entity_type,
            name: e.name
        }));
    } catch (e) {
        console.error('Failed to load custom entities', e);
        return [];
    }
};

export const saveCustomEntity = async (type: 'category' | 'shop' | 'general_category' | 'recurrence', name: string): Promise<void> => {
    try {
        const userId = await getUserId();
        if (!userId || !name.trim()) return;

        const { error } = await supabase.from('custom_entities').upsert({
            user_id: userId,
            entity_type: type,
            name: name.trim()
        }, { onConflict: 'user_id,entity_type,name' });

        if (error) throw error;
    } catch (e) {
        console.error('Failed to save custom entity', e);
    }
};

// General Expenses
export const getGeneralExpenses = async (): Promise<GeneralExpense[]> => {
    try {
        const { data, error } = await supabase
            .from('general_expenses')
            .select('*')
            .order('date', { ascending: false });
        
        if (error) throw error;
        return (data || []).map(e => ({
            id: e.id,
            title: e.title,
            amount: Number(e.amount),
            date: e.date,
            category: e.category,
            note: e.note
        }));
    } catch (e) {
        console.error('Failed to load general expenses', e);
        return [];
    }
};

export const saveGeneralExpense = async (expense: GeneralExpense): Promise<void> => {
    try {
        const userId = await getUserId();
        if (!userId) throw new Error('User not authenticated');

        const expenseData: any = {
            user_id: userId,
            title: expense.title,
            amount: expense.amount,
            date: expense.date,
            category: expense.category,
            note: expense.note
        };

        if (expense.id && isUUID(expense.id)) {
            expenseData.id = expense.id;
        }

        const { error } = await supabase.from('general_expenses').upsert(expenseData);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save general expense', e);
    }
};

export const deleteGeneralExpense = async (id: string): Promise<void> => {
    try {
        if (!isUUID(id)) return;
        const { error } = await supabase.from('general_expenses').delete().eq('id', id);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to delete general expense', e);
    }
};

// Task Completions (Per-instance)
export const getTaskCompletions = async (): Promise<TaskCompletion[]> => {
    try {
        const { data, error } = await supabase
            .from('task_completions')
            .select('*');
        if (error) throw error;
        return (data || []).map(c => ({
            id: c.id,
            taskId: c.task_id,
            completedAt: c.completed_at
        }));
    } catch (e) {
        console.error('Failed to load task completions', e);
        return [];
    }
};

export const saveTaskCompletion = async (taskId: string, date: string): Promise<void> => {
    try {
        const userId = await getUserId();
        if (!userId) return;
        const { error } = await supabase.from('task_completions').insert({
            task_id: taskId,
            user_id: userId,
            completed_at: date
        });
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save task completion', e);
    }
};

export const deleteTaskCompletion = async (taskId: string, date: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('task_completions')
            .delete()
            .eq('task_id', taskId)
            .eq('completed_at', date);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to delete task completion', e);
    }
};

// Labor Profiles
export const getLaborProfiles = async (): Promise<LaborProfile[]> => {
    try {
        const { data, error } = await supabase
            .from('labor_profiles')
            .select('*')
            .order('name');
        if (error) {
            if (error.code === 'PGRST205') console.warn('Supabase Schema Cache error. Ensure you ran the SQL in section 10 of database.sql.');
            throw error;
        }
        return (data || []).map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            baseWage: p.base_wage ? Number(p.base_wage) : undefined,
            phone: p.phone,
            startDate: p.start_date,
            isActive: p.is_active,
            notes: p.notes
        }));
    } catch (e) {
        console.error('Failed to load labor profiles', e);
        return [];
    }
};

export const saveLaborProfile = async (profile: LaborProfile): Promise<void> => {
    try {
        const userId = await getUserId();
        if (!userId) throw new Error('User not authenticated');

        const profileData: any = {
            user_id: userId,
            name: profile.name,
            type: profile.type,
            base_wage: profile.baseWage,
            phone: profile.phone,
            start_date: profile.startDate,
            is_active: profile.isActive,
            notes: profile.notes
        };

        if (profile.id && isUUID(profile.id)) {
            profileData.id = profile.id;
        }

        const { error } = await supabase.from('labor_profiles').upsert(profileData);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save labor profile', e);
    }
};

// Labor Attendance
export const getLaborAttendance = async (date?: string): Promise<LaborAttendance[]> => {
    try {
        let query = supabase.from('labor_attendance').select('*');
        if (date) query = query.eq('date', date);
        
        const { data, error } = await query;
        if (error) {
            if (error.code === 'PGRST205') console.warn('Supabase Schema Cache error. Ensure you ran the SQL in section 10 of database.sql.');
            throw error;
        }
        return (data || []).map(a => ({
            id: a.id,
            workerId: a.worker_id,
            date: a.date,
            status: a.status,
            plotId: a.plot_id,
            notes: a.notes
        }));
    } catch (e) {
        console.error('Failed to load labor attendance', e);
        return [];
    }
};

export const saveLaborAttendanceBatch = async (records: LaborAttendance[]): Promise<void> => {
    try {
        const userId = await getUserId();
        if (!userId) throw new Error('User not authenticated');

        const data = records.map(r => ({
            ...(r.id && isUUID(r.id) ? { id: r.id } : {}),
            user_id: userId,
            worker_id: r.workerId,
            date: r.date,
            status: r.status,
            plot_id: r.plotId && isUUID(r.plotId) ? r.plotId : null,
            notes: r.notes
        }));

        const { error } = await supabase.from('labor_attendance').upsert(data, { onConflict: 'worker_id,date' });
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save attendance batch', e);
    }
};

// Labor Contracts
export const getLaborContracts = async (): Promise<LaborContract[]> => {
    try {
        const { data, error } = await supabase
            .from('labor_contracts')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            if (error.code === 'PGRST205') console.warn('Supabase Schema Cache error. Ensure you ran the SQL in section 10 of database.sql.');
            throw error;
        }
        return (data || []).map(c => ({
            id: c.id,
            contractorId: c.contractor_id,
            projectName: c.project_name,
            service: c.service,
            startDate: c.start_date,
            totalAmount: Number(c.total_amount),
            deadline: c.deadline,
            advancePaid: Number(c.advance_paid),
            status: c.status,
            plotId: c.plot_id,
            notes: c.notes
        }));
    } catch (e) {
        console.error('Failed to load labor contracts', e);
        return [];
    }
};

export const saveLaborContract = async (contract: LaborContract): Promise<void> => {
    try {
        const userId = await getUserId();
        if (!userId) throw new Error('User not authenticated');

        const contractData: any = {
            user_id: userId,
            contractor_id: contract.contractorId,
            project_name: contract.projectName,
            service: contract.service || null,
            start_date: contract.startDate || null,
            total_amount: contract.totalAmount,
            deadline: contract.deadline,
            advance_paid: contract.advancePaid,
            status: contract.status,
            plot_id: contract.plotId && isUUID(contract.plotId) ? contract.plotId : null,
            notes: contract.notes
        };

        if (contract.id && isUUID(contract.id)) {
            contractData.id = contract.id;
        }

        const { error } = await supabase.from('labor_contracts').upsert(contractData);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save labor contract', e);
    }
};

// Labor Transactions
export const getLaborTransactions = async (workerId?: string): Promise<LaborTransaction[]> => {
    try {
        let query = supabase.from('labor_transactions').select('*').order('date', { ascending: false });
        if (workerId) query = query.eq('worker_id', workerId);
        
        const { data, error } = await query;
        if (error) {
            if (error.code === 'PGRST205') console.warn('Supabase Schema Cache error. Ensure you ran the SQL in section 10 of database.sql.');
            throw error;
        }
        return (data || []).map(t => ({
            id: t.id,
            workerId: t.worker_id,
            amount: Number(t.amount),
            date: t.date,
            type: t.type,
            repaymentMethod: t.repayment_method,
            note: t.note
        }));
    } catch (e) {
        console.error('Failed to load labor transactions', e);
        return [];
    }
};

export const saveLaborTransaction = async (transaction: LaborTransaction): Promise<void> => {
    try {
        const userId = await getUserId();
        if (!userId) throw new Error('User not authenticated');

        const transactionData: any = {
            user_id: userId,
            worker_id: transaction.workerId,
            amount: transaction.amount,
            date: transaction.date,
            type: transaction.type,
            repayment_method: transaction.repaymentMethod || null,
            note: transaction.note
        };

        if (transaction.id && isUUID(transaction.id)) {
            transactionData.id = transaction.id;
        }

        const { error } = await supabase.from('labor_transactions').upsert(transactionData);
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save labor transaction', e);
    }
};

