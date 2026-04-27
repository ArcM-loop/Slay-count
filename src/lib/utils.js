import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import Papa from 'papaparse'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
};
