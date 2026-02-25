export type TransactionType = 'Income' | 'Expense';

export type ExpenseCategory = 'Seeds' | 'Fertilizer' | 'Pesticide' | 'Equipment' | 'Labor' | 'Transport' | 'Misc';
export type IncomeCategory = 'Crops' | 'Government Subsidy' | 'Rent' | 'Other';

export type Category = ExpenseCategory | IncomeCategory;

export type InventoryUnit = 'kg' | 'bags' | 'L';

export interface Plot {
  id: string;
  name: string;
  area: number; // In acres
  cropType: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string; // Supports custom categories
  quantity: number;
  unit: InventoryUnit;
  pricePerUnit?: number;
}

export interface Transaction {
  id: string;
  title: string;
  type: TransactionType;
  category: string; // Supports custom categories
  amount: number;
  date: string;
  plotId?: string;
  inventoryItemId?: string;
  quantity?: number;
  note?: string;
}
