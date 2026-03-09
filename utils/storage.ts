import { InventoryItem, Plot, Transaction } from '@/types/farm';
import { supabase } from './supabase';

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
    
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Failed to load transactions', e);
    return [];
  }
};

export const saveTransaction = async (transaction: Transaction): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase.from('transactions').insert({
      id: transaction.id || undefined, // Let Supabase gen UUID if empty
      user_id: userId,
      title: transaction.title,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      date: transaction.date,
      plot_id: transaction.plotId || null,
      inventory_item_id: transaction.inventoryItemId || null,
      quantity: transaction.quantity || null,
      note: transaction.note || null,
    });

    if (error) throw error;
    
    // Auto-update inventory if linked
    if (transaction.inventoryItemId && transaction.quantity) {
        let delta = 0;
        if (transaction.type === 'Expense') {
            delta = transaction.plotId ? -transaction.quantity : transaction.quantity;
        } else {
            delta = -transaction.quantity; // Income/Sale subtracts from stock
        }
        await updateInventoryQuantity(transaction.inventoryItemId, delta);
    }
  } catch (e) {
    console.error('Failed to save transaction', e);
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  try {
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

        const { error } = await supabase.from('plots').insert({
            user_id: userId,
            name: plot.name,
            area: plot.area,
            crop_type: plot.cropType
        });
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save plot', e);
    }
};

export const deletePlot = async (id: string): Promise<void> => {
    try {
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
            pricePerUnit: i.price_per_unit
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

        const { error } = await supabase.from('inventory').upsert({
            id: item.id.length > 20 ? item.id : undefined, // Check if it's already a UUID or temp ID
            user_id: userId,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            price_per_unit: item.pricePerUnit
        });
        if (error) throw error;
    } catch (e) {
        console.error('Failed to save inventory item', e);
    }
};

export const updateInventoryQuantity = async (id: string, delta: number): Promise<void> => {
    try {
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
        
        if (error && error.code !== 'PGRST116') throw error; // 116 is 'not found'
        
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
