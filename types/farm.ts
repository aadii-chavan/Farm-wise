export type TransactionType = 'Income' | 'Expense';

export type ExpenseCategory = 'Seeds' | 'Fertilizer' | 'Pesticide' | 'Equipment' | 'Labor' | 'Transport' | 'Misc';
export type IncomeCategory = 'Crops' | 'Government Subsidy' | 'Rent' | 'Other';

export type Category = ExpenseCategory | IncomeCategory;

export type InventoryUnit = 'kg' | 'bags' | 'L' | 'mL' | 'gm';

export interface Plot {
  id: string;
  name: string;
  area: number; // In acres
  cropType: string;
  variety?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string; // Supports custom categories
  numPackages?: number;
  sizePerPackage?: number;
  quantity: number;
  unit: InventoryUnit;
  pricePerUnit?: number;
  shopName?: string;
  companyName?: string;
  batchNo?: string;
  paymentMode?: 'Cash' | 'Credit';
  interestRate?: number;
  interestPeriod?: 'day' | 'week' | 'month' | 'year';
  batchId?: string;
  invoiceNo?: string;
  note?: string;
  purchaseDate?: string;
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

export interface Task {
  id: string;
  title: string;
  time: string;
  date: string;
  category: string;
  plot?: string | null;
  completed: boolean;
}

export interface CustomEntity {
  id: string;
  entityType: 'category' | 'shop' | 'general_category';
  name: string;
}

export interface GeneralExpense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  note?: string;
}

