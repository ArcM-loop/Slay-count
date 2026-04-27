/**
 * formatters.js — Utilitas format mata uang dan tanggal
 */

export const formatRupiah = (number) => {
  if (number === undefined || number === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

export const formatShortDate = (dateString) => {
  if (!dateString) return '-';
  const options = { day: '2-digit', month: 'short' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};
