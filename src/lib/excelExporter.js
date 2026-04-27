/**
 * excelExporter.js — Export Laporan Keuangan Profesional
 * Menggunakan ExcelJS dengan rumus akuntansi lengkap
 */
import ExcelJS from 'exceljs';

const IDR = (val) => {
  if (typeof val !== 'number') return val;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
};

// ─── Style helpers ────────────────────────────────────────────────
const STYLES = {
  header: {
    font: { bold: true, color: { argb: 'FF000000' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    },
  },
  sectionHeader: (color = 'FFE9ECEF') => ({
    font: { bold: true, color: { argb: 'FF000000' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: color } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: { bottom: { style: 'thin' } }
  }),
  total: {
    font: { bold: true, size: 11 },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'double' }
    },
  },
  currency: {
    numFmt: '#,##0;[Red](#,##0);"-"',
    alignment: { horizontal: 'right' },
  },
  title: {
    font: { bold: true, size: 14, color: { argb: 'FF000000' } },
    alignment: { horizontal: 'center' },
  },
  subtitle: {
    font: { size: 11, color: { argb: 'FF444444' }, italic: true },
    alignment: { horizontal: 'center' },
  },
  infoBox: {
    font: { bold: true, size: 10 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    },
    alignment: { horizontal: 'left' },
  }
};

function applyStyle(cell, style) {
  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.border) cell.border = style.border;
  if (style.numFmt) cell.numFmt = style.numFmt;
}

function addEmptyRows(ws, count = 1) {
  for (let i = 0; i < count; i++) ws.addRow([]);
}

function addHeader(ws, businessName, reportName, period, colCount) {
  const lastCol = String.fromCharCode(64 + colCount);
  ws.mergeCells(`A1:${lastCol}1`);
  ws.getCell('A1').value = businessName.toUpperCase();
  applyStyle(ws.getCell('A1'), STYLES.title);
  
  ws.mergeCells(`A2:${lastCol}2`);
  ws.getCell('A2').value = reportName.toUpperCase();
  applyStyle(ws.getCell('A2'), { ...STYLES.title, font: { ...STYLES.title.font, size: 12 } });

  ws.mergeCells(`A3:${lastCol}3`);
  ws.getCell('A3').value = `Periode: ${period}`;
  applyStyle(ws.getCell('A3'), STYLES.subtitle);

  ws.getRow(1).height = 24;
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 18;
  addEmptyRows(ws, 1);
}

// ─── Sheet 1: Daftar Akun (COA) ───────────────────────────────────
/**
 * Membangun sheet Daftar Akun (Chart of Accounts).
 * Menampilkan kode, nama, tipe, dan saldo normal setiap akun.
 * @param {ExcelJS.Workbook} wb - Instance workbook Excel.
 * @param {Array} accounts - Daftar akun dari database.
 * @param {string} businessName - Nama bisnis.
 * @param {string} period - Periode laporan.
 */
function buildCOASheet(wb, accounts, businessName, period) {
  const ws = wb.addWorksheet('Daftar_Akun');
  ws.properties.tabColor = { argb: 'FF00B4D8' };

  ws.columns = [
    { key: 'code', width: 15 },
    { key: 'name', width: 35 },
    { key: 'type', width: 18 },
    { key: 'sub_type', width: 22 },
    { key: 'saldo_normal', width: 18 },
  ];

  addHeader(ws, businessName, 'DAFTAR AKUN (COA)', period, 5);

  // Header
  const hRow = ws.addRow(['Kode Akun', 'Nama Akun', 'Tipe', 'Sub-Tipe', 'Saldo Normal']);
  hRow.eachCell(cell => applyStyle(cell, STYLES.header));
  hRow.height = 22;

  accounts.forEach(a => {
    const saldoNormal = ['Aset', 'Beban'].includes(a.type) ? 'Debit' : 'Kredit';
    const row = ws.addRow([a.code, a.name, a.type, a.sub_type || '-', saldoNormal]);
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    row.getCell(5).alignment = { horizontal: 'center' };
  });

  ws.autoFilter = { from: 'A1', to: 'E1' };
  return ws;
}

// ─── Sheet 2: Jurnal Umum ─────────────────────────────────────────
/**
 * Membangun sheet Jurnal Umum.
 * Menampilkan histori transaksi lengkap dengan verifikasi keseimbangan Debit/Kredit.
 * @param {ExcelJS.Workbook} wb - Instance workbook Excel.
 * @param {Array} journalEntries - Entri jurnal dari database.
 * @param {Array} accounts - Daftar akun (untuk referensi XLOOKUP).
 * @param {string} businessName - Nama bisnis.
 * @param {string} period - Periode laporan.
 */
function buildJurnalSheet(wb, journalEntries, accounts, businessName, period) {
  const ws = wb.addWorksheet('Jurnal_Umum');
  ws.properties.tabColor = { argb: 'FF39D353' };

  ws.columns = [
    { key: 'no', width: 8 },
    { key: 'date', width: 14 },
    { key: 'account_code', width: 14 },
    { key: 'account_name', width: 30 },
    { key: 'description', width: 35 },
    { key: 'debit', width: 18 },
    { key: 'credit', width: 18 },
    { key: 'check_duplicate', width: 18 },
    { key: 'xlookup_name', width: 30 },
  ];

  addHeader(ws, businessName, 'JURNAL UMUM', period, 9);

  // Balance check row
  ws.mergeCells('A2:E2');
  ws.getCell('A2').value = 'Status Keseimbangan Jurnal:';
  applyStyle(ws.getCell('A2'), STYLES.infoBox);
  ws.mergeCells('F2:I2');
  ws.getCell('F2').value = { formula: 'IF(SUM(F4:F10000)=SUM(G4:G10000),"BALANCE","SELISIH: "&TEXT(SUM(F4:F10000)-SUM(G4:G10000),"#,##0"))' };
  applyStyle(ws.getCell('F2'), { font: { bold: true }, alignment: { horizontal: 'center' }, border: STYLES.infoBox.border });
  ws.getRow(2).height = 20;

  // Header row
  const hRow = ws.addRow(['No', 'Tanggal', 'Kode Akun', 'Nama Akun', 'Keterangan', 'Debit', 'Kredit', 'Cek Duplikasi', 'Auto-Nama Akun (XLOOKUP)']);
  hRow.eachCell(cell => applyStyle(cell, STYLES.header));
  hRow.height = 22;

  const dataStartRow = 4;
  journalEntries.forEach((entry, i) => {
    const rowNum = dataStartRow + i;
    const row = ws.addRow([
      i + 1,
      entry.date,
      entry.account_code || '',
      entry.account_name || '',
      entry.description || '',
      entry.debit || 0,
      entry.credit || 0,
    ]);

    // Rumus COUNTIF cek duplikasi per kode akun
    row.getCell(8).value = { formula: `IF(COUNTIF(B$4:B${rowNum},B${rowNum})>2,"Duplikasi","OK")` };
    applyStyle(row.getCell(8), { alignment: { horizontal: 'center' } });

    // Rumus XLOOKUP pencarian nama akun otomatis dari COA
    row.getCell(9).value = { formula: `XLOOKUP(C${rowNum},Daftar_Akun!A:A,Daftar_Akun!B:B,"Akun Tidak Ditemukan")` };
    row.getCell(9).font = { color: { argb: 'FF666666' }, italic: true };

    // Format currency
    applyStyle(row.getCell(6), STYLES.currency);
    applyStyle(row.getCell(7), STYLES.currency);

    // Borders for data rows
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Total row
  const totalRow = ws.addRow(['', '', '', '', 'TOTAL', { formula: `SUM(F4:F${dataStartRow + journalEntries.length - 1})` }, { formula: `SUM(G4:G${dataStartRow + journalEntries.length - 1})` }]);
  totalRow.eachCell((cell, colNum) => {
    if (colNum >= 5) applyStyle(cell, { ...STYLES.total, ...STYLES.currency });
    else applyStyle(cell, STYLES.total);
  });

  ws.autoFilter = { from: 'A3', to: 'I3' };
  // Force full calculation
  wb.calcProperties = { fullCalcOnLoad: true };
  return ws;
}

// ─── Sheet 3: Neraca Saldo (Trial Balance) ────────────────────────
/**
 * Membangun sheet Neraca Saldo (Trial Balance).
 * Mengagregasi total debit/kredit per akun untuk memastikan keseimbangan buku besar.
 * @param {ExcelJS.Workbook} wb - Instance workbook Excel.
 * @param {Array} journalEntries - Entri jurnal.
 * @param {Array} accounts - Daftar akun.
 * @param {string} businessName - Nama bisnis.
 * @param {string} period - Periode laporan.
 */
function buildNeracaSaldoSheet(wb, journalEntries, accounts, businessName, period) {
  const ws = wb.addWorksheet('Neraca_Saldo');
  ws.properties.tabColor = { argb: 'FFBD7BFF' };

  ws.columns = [
    { key: 'code', width: 14 },
    { key: 'name', width: 32 },
    { key: 'type', width: 18 },
    { key: 'saldo_normal', width: 16 },
    { key: 'total_debit', width: 20 },
    { key: 'total_credit', width: 20 },
    { key: 'saldo_akhir_debit', width: 22 },
    { key: 'saldo_akhir_credit', width: 22 },
  ];

  addHeader(ws, businessName, 'NERACA SALDO (TRIAL BALANCE)', period, 8);

  addEmptyRows(ws);

  // Balance check
  ws.mergeCells('A3:D3');
  ws.getCell('A3').value = 'Status Keseimbangan:';
  applyStyle(ws.getCell('A3'), STYLES.infoBox);
  ws.mergeCells('E3:H3');
  ws.getCell('E3').value = { formula: 'IF(SUM(E5:E1000)=SUM(F5:F1000),"BALANCE - Total Debit = Total Kredit","TIDAK BALANCE: Selisih "&TEXT(ABS(SUM(E5:E1000)-SUM(F5:F1000)),"#,##0"))' };
  applyStyle(ws.getCell('E3'), { font: { bold: true }, alignment: { horizontal: 'center' }, border: STYLES.infoBox.border });
  ws.getRow(3).height = 20;

  // Header
  const hRow = ws.addRow(['Kode', 'Nama Akun', 'Tipe', 'Saldo Normal', 'Total Debit', 'Total Kredit', 'Saldo Debit', 'Saldo Kredit']);
  hRow.eachCell(cell => applyStyle(cell, STYLES.header));
  hRow.height = 22;

  // Compute balances
  const balanceMap = {};
  journalEntries.forEach(e => {
    if (!balanceMap[e.account_id]) {
      balanceMap[e.account_id] = { ...e, total_debit: 0, total_credit: 0 };
    }
    balanceMap[e.account_id].total_debit += e.debit || 0;
    balanceMap[e.account_id].total_credit += e.credit || 0;
  });

  const balances = Object.values(balanceMap);
  const dataStart = 5;

  balances.forEach((b, i) => {
    const rowNum = dataStart + i;
    const saldoNormal = ['Aset', 'Beban'].includes(b.account_type) ? 'Debit' : 'Kredit';
    const isDebitNormal = saldoNormal === 'Debit';
    const saldoAkhir = b.total_debit - b.total_credit;

    const row = ws.addRow([
      b.account_code,
      b.account_name,
      b.account_type,
      saldoNormal,
      b.total_debit,
      b.total_credit,
      // Rumus MAX(0,...) untuk saldo debit - tidak pernah negatif
      { formula: `MAX(0,E${rowNum}-F${rowNum})` },
      { formula: `MAX(0,F${rowNum}-E${rowNum})` },
    ]);

    applyStyle(row.getCell(5), STYLES.currency);
    applyStyle(row.getCell(6), STYLES.currency);
    applyStyle(row.getCell(7), STYLES.currency);
    applyStyle(row.getCell(8), STYLES.currency);
    row.getCell(4).alignment = { horizontal: 'center' };

    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Total row
  const endRow = dataStart + balances.length - 1;
  const totalRow = ws.addRow([
    '', 'TOTAL', '', '',
    { formula: `SUM(E${dataStart}:E${endRow})` },
    { formula: `SUM(F${dataStart}:F${endRow})` },
    { formula: `SUM(G${dataStart}:G${endRow})` },
    { formula: `SUM(H${dataStart}:H${endRow})` },
  ]);
  totalRow.eachCell((cell, col) => {
    if (col >= 5) applyStyle(cell, { ...STYLES.total, ...STYLES.currency });
    else applyStyle(cell, STYLES.total);
  });

  return ws;
}

// ─── Sheet 4: Laporan Laba Rugi ───────────────────────────────────
/**
 * Membangun laporan Laba Rugi.
 * Menghitung selisih antara total pendapatan dan beban usaha.
 * @param {ExcelJS.Workbook} wb - Instance workbook Excel.
 * @param {Array} transactions - Daftar transaksi pemasukan/pengeluaran.
 * @param {string} period - Periode laporan.
 * @param {string} businessName - Nama bisnis.
 */
function buildLabaRugiSheet(wb, transactions, period, businessName) {
  const ws = wb.addWorksheet('Laba_Rugi');
  ws.properties.tabColor = { argb: 'FF39D353' };

  ws.columns = [
    { key: 'desc', width: 40 },
    { key: 'amount', width: 22 },
    { key: 'note', width: 18 },
  ];

  addHeader(ws, businessName, 'LAPORAN LABA RUGI', period, 3);

  addEmptyRows(ws);

  const pendapatan = transactions.filter(t => t.type === 'Pemasukan');
  const beban = transactions.filter(t => t.type === 'Pengeluaran');

  // ── Pendapatan ──
  const pHeaderRow = ws.addRow(['PENDAPATAN', '', '']);
  ws.mergeCells(`A${pHeaderRow.number}:C${pHeaderRow.number}`);
  applyStyle(pHeaderRow.getCell(1), STYLES.sectionHeader('FF1A6B38'));
  pHeaderRow.height = 20;

  const pendapatanByAcc = {};
  pendapatan.forEach(t => {
    const key = t.account_name || 'Pendapatan Lain-lain';
    pendapatanByAcc[key] = (pendapatanByAcc[key] || 0) + t.amount;
  });

  const pStart = ws.rowCount + 1;
  Object.entries(pendapatanByAcc).forEach(([name, amount]) => {
    const row = ws.addRow([`    ${name}`, amount, '']);
    applyStyle(row.getCell(2), STYLES.currency);
  });
  const pEnd = ws.rowCount;

  const pTotalRow = ws.addRow(['Total Pendapatan', { formula: `SUM(B${pStart}:B${pEnd})` }, '']);
  applyStyle(pTotalRow.getCell(1), STYLES.total);
  applyStyle(pTotalRow.getCell(2), { ...STYLES.total, ...STYLES.currency });
  pTotalRow.getCell(2).font = { bold: true, color: { argb: 'FF39D353' }, size: 12 };
  const pTotalRowNum = pTotalRow.number;

  addEmptyRows(ws);

  // ── Beban ──
  const bHeaderRow = ws.addRow(['BEBAN USAHA', '', '']);
  ws.mergeCells(`A${bHeaderRow.number}:C${bHeaderRow.number}`);
  applyStyle(bHeaderRow.getCell(1), STYLES.sectionHeader('FF6B1A1A'));
  bHeaderRow.height = 20;

  const bebanByAcc = {};
  beban.forEach(t => {
    const key = t.account_name || 'Beban Lain-lain';
    bebanByAcc[key] = (bebanByAcc[key] || 0) + t.amount;
  });

  const bStart = ws.rowCount + 1;
  Object.entries(bebanByAcc).forEach(([name, amount]) => {
    const row = ws.addRow([`    ${name}`, amount, '']);
    applyStyle(row.getCell(2), STYLES.currency);
  });
  const bEnd = ws.rowCount;

  const bTotalRow = ws.addRow(['Total Beban', { formula: `SUM(B${bStart}:B${bEnd})` }, '']);
  applyStyle(bTotalRow.getCell(1), STYLES.total);
  applyStyle(bTotalRow.getCell(2), { ...STYLES.total, ...STYLES.currency });
  bTotalRow.getCell(2).font = { bold: true, color: { argb: 'FFFF6B6B' }, size: 12 };
  const bTotalRowNum = bTotalRow.number;

  addEmptyRows(ws, 2);

  // ── Laba / Rugi ──
  const labaRowNum = ws.rowCount + 1;
  const labaRow = ws.addRow(['LABA / RUGI BERSIH', { formula: `B${pTotalRowNum}-B${bTotalRowNum}` }, { formula: `IF(B${labaRowNum}>0,"LABA",IF(B${labaRowNum}<0,"RUGI","IMPAS"))` }]);
  ws.mergeCells(`A${labaRowNum}:A${labaRowNum}`);
  applyStyle(labaRow.getCell(1), { font: { bold: true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }, border: STYLES.total.border });
  applyStyle(labaRow.getCell(2), { ...STYLES.currency, font: { bold: true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }, border: STYLES.total.border });
  applyStyle(labaRow.getCell(3), { alignment: { horizontal: 'center' }, font: { bold: true, size: 10 } });
  labaRow.height = 24;

  // Conditional formatting: hijau jika laba, merah jika rugi
  ws.addConditionalFormatting({
    ref: `B${labaRowNum}`,
    rules: [
      { type: 'cellIs', operator: 'greaterThan', formulae: ['0'], priority: 1, style: { font: { color: { argb: 'FF39D353' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2B14' } } } },
      { type: 'cellIs', operator: 'lessThan', formulae: ['0'], priority: 2, style: { font: { color: { argb: 'FFFF6B6B' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B0D0D' } } } },
    ],
  });

  addEmptyRows(ws, 2);

  // ── Rasio Keuangan ──
  const ratioHeaderRow = ws.addRow(['📊 ANALISIS RASIO KEUANGAN', '', '']);
  ws.mergeCells(`A${ratioHeaderRow.number}:C${ratioHeaderRow.number}`);
  applyStyle(ratioHeaderRow.getCell(1), STYLES.sectionHeader('FF1A2E44'));
  ratioHeaderRow.height = 20;

  const totalPendapatan = pendapatan.reduce((s, t) => s + t.amount, 0);
  const totalBeban = beban.reduce((s, t) => s + t.amount, 0);
  const labaBersih = totalPendapatan - totalBeban;

  [
    ['Margin Laba Bersih (%)', totalPendapatan > 0 ? (labaBersih / totalPendapatan * 100).toFixed(2) + '%' : 'N/A', 'Laba / Pendapatan × 100'],
    ['Rasio Beban thd Pendapatan', totalBeban > 0 ? (totalBeban / totalPendapatan * 100).toFixed(2) + '%' : 'N/A', 'Beban / Pendapatan × 100'],
  ].forEach(([label, value, note]) => {
    const row = ws.addRow([`    ${label}`, value, note]);
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(2).font = { bold: true };
    row.getCell(3).font = { italic: true, color: { argb: 'FF666666' }, size: 9 };
  });

  return ws;
}

// ─── Sheet 5: Neraca (Balance Sheet) ──────────────────────────────
/**
 * Membangun laporan Neraca yang menunjukkan posisi keuangan (Aset = Kewajiban + Ekuitas).
 * @param {ExcelJS.Workbook} wb - Instance workbook Excel.
 * @param {Array} transactions - Daftar transaksi untuk menghitung laba berjalan.
 * @param {Array} journalEntries - Entri jurnal untuk menghitung saldo akun.
 * @param {Array} accounts - Daftar akun (COA).
 * @param {string} businessName - Nama entitas/bisnis.
 * @param {string} period - Periode laporan.
 */
function buildNeracaSheet(wb, transactions, journalEntries, accounts, businessName, period) {
  const ws = wb.addWorksheet('Neraca');
  ws.properties.tabColor = { argb: 'FF1A2E44' };

  ws.columns = [
    { key: 'desc', width: 45 },
    { key: 'amount', width: 22 },
  ];

  addHeader(ws, businessName, 'NERACA (BALANCE SHEET)', period, 2);

  // Agregasi saldo akun berdasarkan entri jurnal
  const balanceMap = {};
  journalEntries.forEach(e => {
    if (!balanceMap[e.account_id]) {
      balanceMap[e.account_id] = { ...e, total_debit: 0, total_credit: 0 };
    }
    balanceMap[e.account_id].total_debit += e.debit || 0;
    balanceMap[e.account_id].total_credit += e.credit || 0;
  });

  const getBalance = (type) => {
    return Object.values(balanceMap)
      .filter(b => b.account_type === type)
      .map(b => ({ name: b.account_name, amount: b.total_debit - b.total_credit, type: b.account_type }));
  };

  const aset = getBalance('Aset');
  const kewajiban = getBalance('Kewajiban');
  const ekuitas = getBalance('Ekuitas');
  
  // Hitung laba berjalan untuk menyeimbangkan Neraca
  const totalPendapatan = transactions.filter(t => t.type === 'Pemasukan').reduce((s, t) => s + t.amount, 0);
  const totalBeban = transactions.filter(t => t.type === 'Pengeluaran').reduce((s, t) => s + t.amount, 0);
  const labaBerjalan = totalPendapatan - totalBeban;

  // ── BAGIAN ASET ──
  const aHeader = ws.addRow(['ASET', '']);
  ws.mergeCells(`A${aHeader.number}:B${aHeader.number}`);
  applyStyle(aHeader.getCell(1), STYLES.sectionHeader('FFE9ECEF'));

  let aStart = ws.rowCount + 1;
  aset.forEach(a => {
    const row = ws.addRow([`    ${a.name}`, a.amount]);
    applyStyle(row.getCell(2), STYLES.currency);
  });
  let aEnd = ws.rowCount;
  
  const aTotalRow = ws.addRow(['TOTAL ASET', { formula: `SUM(B${aStart}:B${aEnd})` }]);
  applyStyle(aTotalRow.getCell(1), STYLES.total);
  applyStyle(aTotalRow.getCell(2), { ...STYLES.total, ...STYLES.currency });
  const aTotalRowNum = aTotalRow.number;

  addEmptyRows(ws);

  // ── BAGIAN KEWAJIBAN ──
  const kHeader = ws.addRow(['KEWAJIBAN', '']);
  ws.mergeCells(`A${kHeader.number}:B${kHeader.number}`);
  applyStyle(kHeader.getCell(1), STYLES.sectionHeader('FFE9ECEF'));

  let kStart = ws.rowCount + 1;
  kewajiban.forEach(k => {
    // Nilai kewajiban dibalik (normal kredit)
    const row = ws.addRow([`    ${k.name}`, k.amount * -1]);
    applyStyle(row.getCell(2), STYLES.currency);
  });
  let kEnd = ws.rowCount;
  
  const kTotalRow = ws.addRow(['TOTAL KEWAJIBAN', { formula: `SUM(B${kStart}:B${kEnd})` }]);
  applyStyle(kTotalRow.getCell(1), STYLES.total);
  applyStyle(kTotalRow.getCell(2), { ...STYLES.total, ...STYLES.currency });
  const kTotalRowNum = kTotalRow.number;

  addEmptyRows(ws);

  // ── BAGIAN EKUITAS ──
  const eHeader = ws.addRow(['EKUITAS', '']);
  ws.mergeCells(`A${eHeader.number}:B${eHeader.number}`);
  applyStyle(eHeader.getCell(1), STYLES.sectionHeader('FFE9ECEF'));

  let eStart = ws.rowCount + 1;
  ekuitas.forEach(e => {
    const row = ws.addRow([`    ${e.name}`, e.amount * -1]);
    applyStyle(row.getCell(2), STYLES.currency);
  });
  // Laba Tahun Berjalan ditambahkan ke Ekuitas agar Balance
  const labaRow = ws.addRow(['    Laba Tahun Berjalan', labaBerjalan]);
  applyStyle(labaRow.getCell(2), STYLES.currency);
  let eEnd = ws.rowCount;

  const eTotalRow = ws.addRow(['TOTAL EKUITAS', { formula: `SUM(B${eStart}:B${eEnd})` }]);
  applyStyle(eTotalRow.getCell(1), STYLES.total);
  applyStyle(eTotalRow.getCell(2), { ...STYLES.total, ...STYLES.currency });
  const eTotalRowNum = eTotalRow.number;

  addEmptyRows(ws);

  // ── TOTAL PASIVA ──
  const pasivaRow = ws.addRow(['TOTAL KEWAJIBAN & EKUITAS', { formula: `B${kTotalRowNum}+B${eTotalRowNum}` }]);
  applyStyle(pasivaRow.getCell(1), { ...STYLES.total, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } } });
  applyStyle(pasivaRow.getCell(2), { ...STYLES.total, ...STYLES.currency, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } } });

  return ws;
}

// ─── Sheet 6: Dashboard Analisis ─────────────────────────────────
/**
 * Membangun Dashboard Analisis Bisnis.
 * Memberikan ringkasan eksekutif dan rasio keuangan penting.
 * @param {ExcelJS.Workbook} wb - Instance workbook Excel.
 * @param {Array} transactions - Daftar transaksi.
 * @param {Array} journalEntries - Entri jurnal.
 * @param {Array} accounts - Daftar akun.
 * @param {string} businessName - Nama bisnis.
 * @param {string} period - Periode laporan.
 */
function buildDashboardSheet(wb, transactions, journalEntries, accounts, businessName, period) {
  const ws = wb.addWorksheet('Dashboard_Analisis');
  ws.properties.tabColor = { argb: 'FFFFB347' };

  ws.columns = [
    { key: 'label', width: 35 },
    { key: 'value', width: 22 },
    { key: 'benchmark', width: 22 },
    { key: 'status', width: 18 },
  ];

  addHeader(ws, businessName, 'RINGKASAN ANALISIS BISNIS', period, 4);

  addEmptyRows(ws, 2);

  const totalPendapatan = transactions.filter(t => t.type === 'Pemasukan').reduce((s, t) => s + t.amount, 0);
  const totalBeban = transactions.filter(t => t.type === 'Pengeluaran').reduce((s, t) => s + t.amount, 0);
  const labaBersih = totalPendapatan - totalBeban;

  const metrics = [
    ['RINGKASAN KEUANGAN', null, null, null],
    ['Total Pendapatan', totalPendapatan, null, ''],
    ['Total Beban', totalBeban, null, ''],
    ['Laba / Rugi Bersih', labaBersih, null, ''],
    ['Total Transaksi Final', transactions.length, null, ''],
    [null, null, null, null],
    ['RASIO KEUANGAN', null, null, null],
    ['Margin Laba Bersih', totalPendapatan > 0 ? (labaBersih / totalPendapatan * 100).toFixed(2) + '%' : 'N/A', '> 10% (Baik)', ''],
    ['Rasio Beban/Pendapatan', totalPendapatan > 0 ? (totalBeban / totalPendapatan * 100).toFixed(2) + '%' : 'N/A', '< 80% (Ideal)', ''],
    [null, null, null, null],
    ['INFORMASI AKUN', null, null, null],
    ['Jumlah Akun Terdaftar', accounts.length, null, ''],
    ['Akun Aset', accounts.filter(a => a.type === 'Aset').length, null, ''],
    ['Akun Beban', accounts.filter(a => a.type === 'Beban').length, null, ''],
    ['Akun Pendapatan', accounts.filter(a => a.type === 'Pendapatan').length, null, ''],
    ['Total Entri Jurnal', journalEntries.length, null, ''],
    [null, null, null, null],
    ['CATATAN', null, null, null],
    ['Dibuat oleh', 'Slay Count - Sistem Akuntansi Otomatis', null, ''],
    ['Tanggal Export', new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }), null, ''],
  ];

  metrics.forEach(([label, value, benchmark, status]) => {
    if (!label) { ws.addRow([]); return; }
    if (!value && label) {
      // Section header
      const row = ws.addRow([label, '', '', '']);
      ws.mergeCells(`A${row.number}:D${row.number}`);
      applyStyle(row.getCell(1), STYLES.sectionHeader('FF1A2E44'));
      row.height = 20;
      return;
    }
    const row = ws.addRow([`    ${label}`, value, benchmark || '', status || '']);
    if (typeof value === 'number') applyStyle(row.getCell(2), STYLES.currency);
    row.getCell(2).alignment = { horizontal: typeof value === 'number' ? 'right' : 'center' };
    row.getCell(2).font = { bold: true };
    row.getCell(3).font = { italic: true, color: { argb: 'FF666666' }, size: 9 };
    row.getCell(4).alignment = { horizontal: 'center' };
  });

  return ws;
}

// ─── Main Export Function ─────────────────────────────────────────
export async function exportFullAccountingExcel({ businessName, period, transactions, journalEntries, accounts }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Slay Count';
  wb.created = new Date();
  wb.modified = new Date();
  wb.calcProperties = { fullCalcOnLoad: true }; // Force full calculation on open

  buildCOASheet(wb, accounts, businessName, period);
  buildJurnalSheet(wb, journalEntries, accounts, businessName, period);
  buildNeracaSaldoSheet(wb, journalEntries, accounts, businessName, period);
  buildLabaRugiSheet(wb, transactions, period, businessName);
  buildNeracaSheet(wb, transactions, journalEntries, accounts, businessName, period);
  buildDashboardSheet(wb, transactions, journalEntries, accounts, businessName, period);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SlayCount_${businessName.replace(/\s/g, '_')}_${period.replace(/\s/g, '_')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
