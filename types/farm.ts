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
  time: string; // HH:mm format
  date: string; // YYYY-MM-DD
  categories: string[];
  plot?: string | null;
  completed: boolean;
  recurrence?: 'None' | 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Every 2 Days' | 'Every 3 Days' | 'Every 10 Days' | 'Every 15 Days';
  assignedTo?: string;
  note?: string;
}

export interface CustomEntity {
  id: string;
  entityType: 'category' | 'shop' | 'general_category' | 'recurrence';
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

export interface TaskCompletion {
  id: string;
  taskId: string;
  completedAt: string; // YYYY-MM-DD
}

// Labor Module Types

export type LaborType = 'Daily' | 'Annual' | 'Contract';

export interface LaborProfile {
  id: string;
  name: string;
  type: LaborType;
  baseWage?: number;       // For daily wage rate or annual salary
  phone?: string;
  startDate?: string;
  isActive: boolean;
  notes?: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-Day';

export interface LaborAttendance {
  id: string;
  workerId: string;
  date: string;
  status: AttendanceStatus;
  plotId?: string;
  notes?: string;
}

export interface LaborContract {
  id: string;
  contractorId: string; // references LaborProfile
  projectName: string;
  service?: string;
  startDate?: string;
  deadline: string;
  totalAmount: number;
  advancePaid: number;
  status: 'Active' | 'Completed' | 'Cancelled';
  plotId?: string;
  notes?: string;
}

export type LaborTransactionType = 'Weekly Settle' | 'Annual Installment' | 'Advance' | 'Advance Repayment' | 'Other';

export interface LaborTransaction {
  id: string;
  workerId: string;
  amount: number;
  date: string;
  type: LaborTransactionType;
  repaymentMethod?: 'Cash' | 'Wage Income';
  note?: string;
}
