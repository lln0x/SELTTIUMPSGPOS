import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, currency: string = 'S/') {
  const value = typeof amount === 'number' ? amount : 0;
  return `${currency} ${value.toFixed(2)}`;
}

export function roundTo2Decimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function generateProductCode(prefix: string, count: number) {
  return `${prefix}${String(count + 1).padStart(3, '0')}`;
}
