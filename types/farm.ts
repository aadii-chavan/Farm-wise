export type TransactionType = 'Income' | 'Expense';

export type ExpenseCategory = 'Seeds' | 'Fertilizer' | 'Pesticide' | 'Equipment' | 'Labor' | 'Transport' | 'Misc';
export type IncomeCategory = 'Crops' | 'Government Subsidy' | 'Rent' | 'Other';

export type Category = ExpenseCategory | IncomeCategory;

export interface Plot {
  id: string;
  name: string;
  area: string;
  cropType: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ExpenseCategory;
  quantity: number;
  unit: string;
  pricePerUnit?: number;
}

export interface Transaction {
  id: string;
  title: string;
  type: TransactionType;
  category: Category;
  amount: number;
  date: string;
  plotId?: string;
  inventoryItemId?: string;
  quantity?: number;
  note?: string;
}
