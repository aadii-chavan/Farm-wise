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
  Seeds: '#4CAF50',
  Fertilizer: '#8BC34A',
  Pesticide: '#FF9800',
  Equipment: '#795548',
  Labor: '#2196F3',
  Transport: '#607D8B',
  Misc: '#9E9E9E',
  Crops: '#006d5b', // Deep Emerald
  'Government Subsidy': '#f9a825', // Gold
  Rent: '#673AB7', // Purple
  Other: '#455A64', // Blue Grey
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
