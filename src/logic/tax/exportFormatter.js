// src/logic/tax/exportFormatter.js
// Format ekspor untuk e-Bupot dan Coretax DJP

export const formatEBupotCSV = (taxTransactions, businessName) => {
  const headers = [
    'No', 'NPWP Pemotong', 'Nama Pemotong', 'NPWP Dipotong', 
    'Nama Dipotong', 'Jenis Penghasilan', 'Kode Objek Pajak',
    'Jumlah Penghasilan Bruto', 'Tarif (%)', 'PPh Dipotong',
    'Tanggal Pemotongan', 'Nomor Dokumen'
  ];

  const pphCodeMap = {
    PPH_23_JASA: '24-100-99',
    PPH_23_DIVIDEN: '24-101-01',
    PPH_4_2_SEWA: '28-401-01',
    PPH_4_2_KONSTRUKSI: '28-409-01',
    PPH_21: '21-100-01',
  };

  const rows = taxTransactions.map((tx, idx) => {
    const rate = (tx.tax_rate || 0) * 100;
    return [
      idx + 1,
      '', // NPWP Pemotong - diisi manual
      businessName,
      tx.vendor_npwp || '',
      tx.merchant_name || tx.description || '',
      tx.tax_type_label || '',
      pphCodeMap[tx.tax_type] || '',
      tx.amount || 0,
      rate,
      tx.tax_amount || 0,
      tx.date || '',
      tx.reference_number || `TRX-${tx.id?.slice(0, 8)}`
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  return csvContent;
};

export const downloadCSV = (content, filename) => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const formatPPNCSV = (transactions, businessName) => {
  const headers = [
    'No', 'Jenis Faktur', 'Masa Pajak', 'Tahun Pajak',
    'Nomor Faktur', 'NPWP Lawan Transaksi', 'Nama Lawan Transaksi',
    'DPP', 'PPN', 'PPnBM', 'Tanggal Faktur'
  ];

  const rows = transactions.map((tx, idx) => [
    idx + 1,
    tx.type === 'Pemasukan' ? '01' : '02', // Keluaran/Masukan
    tx.date?.slice(5, 7) || '',
    tx.date?.slice(0, 4) || '',
    tx.reference_number || `FK-${tx.id?.slice(0, 8)}`,
    tx.vendor_npwp || '',
    tx.merchant_name || '',
    tx.amount || 0,
    tx.tax_amount || 0,
    0,
    tx.date || ''
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
};

export const exportTaxCSV = (transactions, accounts, taxCode) => {
  const filtered = transactions.filter(tx => tx.tax_type === taxCode);
  let csvContent = '';
  let filename = `export_${taxCode.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;

  if (taxCode.startsWith('PPN')) {
    csvContent = formatPPNCSV(filtered, 'SlayCount User');
  } else {
    csvContent = formatEBupotCSV(filtered, 'SlayCount User');
  }

  downloadCSV(csvContent, filename);
};