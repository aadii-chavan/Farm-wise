export type Category = 'Seeds' | 'Fertilizer' | 'Pesticide' | 'Equipment' | 'Labor' | 'Transport' | 'Labor' | 'Misc';

export interface Expense {
  id: string;
  title: string;
  category: Category;
  amount: number;
  date: string; // ISO String for storage
  note?: string;
}
