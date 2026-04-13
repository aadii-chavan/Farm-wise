import { InventoryItem, Plot, Transaction } from '@/types/farm';
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
            cropType: p.crop_type
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
            crop_type: plot.cropType
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
              crop_type: plot.cropType
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
            unit: i.unit,
            pricePerUnit: i.price_per_unit,
            shopName: i.shop_name,
            companyName: i.company_name,
            batchNo: i.batch_no,
            paymentMode: i.payment_mode,
            interestRate: i.interest_rate ? Number(i.interest_rate) : undefined,
            interestPeriod: i.interest_period,
            invoiceNo: i.invoice_no,
            note: i.note,
            purchaseDate: i.purchase_date
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
            unit: item.unit,
            price_per_unit: item.pricePerUnit,
            shop_name: item.shopName,
            company_name: item.companyName,
            batch_no: item.batchNo,
            payment_mode: item.paymentMode,
            interest_rate: item.interestRate,
            interest_period: item.interestPeriod,
            invoice_no: item.invoiceNo,
            note: item.note,
            purchase_date: item.purchaseDate
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
            category: t.category,
            plot: t.plot,
            completed: t.completed,
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
            category: task.category,
            plot: task.plot || null,
            completed: task.completed,
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
                category: task.category,
                plot: task.plot || null,
                completed: task.completed,
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
