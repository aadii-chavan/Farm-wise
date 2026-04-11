import { Category, ExpenseCategory, IncomeCategory } from '../types/farm';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Seeds',
  'Fertilizer',
  'Pesticide',
  'Equipment',
  'Labor',
  'Transport',
  'Misc',
];

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Crops',
  'Government Subsidy',
  'Rent',
  'Other',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Seeds: '#10B981',       // Emerald green
  Fertilizer: '#0EA5E9',  // Sky blue
  Pesticide: '#F43F5E',   // Rose red
  Equipment: '#F59E0B',   // Amber
  Labor: '#8B5CF6',       // Violet
  Transport: '#EC4899',   // Pink
  Misc: '#94A3B8',        // Slate
  Crops: '#34D399',       // Mint
  'Government Subsidy': '#FACC15', // Yellow
  Rent: '#A855F7',        // Purple
  Other: '#3B82F6',       // Blue
};

export const CATEGORY_ICONS: Record<Category, string> = {
  Seeds: 'leaf',
  Fertilizer: 'beaker',
  Pesticide: 'skull',
  Equipment: 'construct',
  Labor: 'people',
  Transport: 'bus',
  Misc: 'apps',
  Crops: 'basket',
  'Government Subsidy': 'card',
  Rent: 'home',
  Other: 'ellipsis-horizontal',
};
