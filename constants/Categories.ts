import { Category } from '../types/expense';

export const CATEGORIES: Category[] = [
  'Seeds',
  'Fertilizer',
  'Pesticide',
  'Equipment',
  'Labor',
  'Transport',
  'Misc',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Seeds: '#4CAF50', // Green
  Fertilizer: '#8BC34A', // Light Green
  Pesticide: '#FF9800', // Orange (Caution)
  Equipment: '#795548', // Brown (Earth/Tools)
  Labor: '#2196F3', // Blue (Work)
  Transport: '#607D8B', // Blue Grey
  Misc: '#9E9E9E', // Grey
};

export const CATEGORY_ICONS: Record<Category, string> = {
  Seeds: 'leaf',
  Fertilizer: 'flask',
  Pesticide: 'skull',
  Equipment: 'hammer',
  Labor: 'people',
  Transport: 'bus',
  Misc: 'clipboard',
};

