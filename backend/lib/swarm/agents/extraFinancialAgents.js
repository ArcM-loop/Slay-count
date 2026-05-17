/**
 * EXTRA FINANCIAL AGENTS (The Specialized Swarm)
 * ============================================
 * Agen tambahan untuk memperdalam audit deterministik MiroFish.
 */

// 1. FOREX REVALUATION AGENT (🔴 KRITIS)
export const ForexRevaluationAgent = {
  name: 'ForexRevaluation',
  tier: 2,
  weight: 2.5,
  async run(payload, context) {
    const { currency, exchangeRate, originalAmount } = payload;
    if (currency && currency !== 'IDR' && !exchangeRate) {
      return {
        status: 'REJECTED',
        message: 'Transaksi mata uang asing wajib menyertakan Kurs (Exchange Rate) untuk revaluasi.',
        weight: this.weight
      };
    }
    return { status: 'APPROVED', message: 'Keseimbangan mata uang asing valid.' };
  }
};

// 2. PERIOD LOCK AGENT (🔴 KRITIS)
export const PeriodLockAgent = {
  name: 'PeriodLock',
  tier: 2,
  weight: 5.0, // Hard blocker
  async run(payload, context) {
    const { date } = payload;
    const { closedPeriods = [] } = context;
    
    const txDate = new Date(date);
    const isLocked = closedPeriods.some(p => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      return txDate >= start && txDate <= end;
    });

    if (isLocked) {
      return {
        status: 'REJECTED',
        message: 'Periode akuntansi untuk tanggal ini sudah ditutup. Tidak diperbolehkan posting baru.',
        weight: this.weight
      };
    }
    return { status: 'APPROVED', message: 'Periode transaksi terbuka.' };
  }
};

// 3. DUPLICATE DETECTOR AGENT (🟡 PENTING)
export const DuplicateDetectorAgent = {
  name: 'DuplicateDetector',
  tier: 1,
  weight: 1.0,
  async run(payload, context) {
    const { amount, description, date } = payload;
    const { recentTransactions = [] } = context;

    const duplicate = recentTransactions.find(tx => 
      tx.amount === amount && 
      tx.date === date && 
      tx.description === description
    );

    if (duplicate) {
      return {
        status: 'WARNING',
        message: 'Potensi transaksi ganda terdeteksi (Nominal & deskripsi identik di tanggal yang sama).',
        weight: this.weight
      };
    }
    return { status: 'APPROVED', message: 'Bukan transaksi duplikat.' };
  }
};

// 4. PPH 21 TER AGENT (🟡 PENTING)
export const PPh21TERAgent = {
  name: 'PPh21TER',
  tier: 1,
  weight: 1.5,
  async run(payload, context) {
    if (payload.type === 'Gaji' && !payload.ter_category) {
      return {
        status: 'WARNING',
        message: 'Kategori TER (Tarif Efektif Rata-rata) PPh 21 belum ditentukan untuk karyawan ini.',
        weight: this.weight
      };
    }
    return { status: 'APPROVED', message: 'Kepatuhan PPh 21 TER valid.' };
  }
};

// 5. PRIOR PERIOD ADJUSTMENT AGENT (🔴 KRITIS)
export const PriorPeriodAgent = {
  name: 'PriorPeriodAdjustment',
  tier: 2,
  weight: 3.0,
  async run(payload, context) {
    if (payload.is_adjustment && !payload.original_tx_id) {
      return {
        status: 'REJECTED',
        message: 'Jurnal koreksi (Adjustment) wajib mereferensikan ID transaksi original.',
        weight: this.weight
      };
    }
    return { status: 'APPROVED', message: 'Referensi koreksi valid.' };
  }
};

// 6. CASH SAFETY MARGIN AGENT (🟢 IDEAL)
export const CashSafetyAgent = {
  name: 'CashSafetyMargin',
  tier: 1,
  weight: 1.0,
  async run(payload, context) {
    const { amount, type } = payload;
    const { currentCash = 0 } = context;

    if (type === 'Expense' && amount > currentCash * 0.5) {
      return {
        status: 'WARNING',
        message: 'Transaksi ini menghabiskan lebih dari 50% saldo kas tersedia. Bahaya likuiditas!',
        weight: this.weight
      };
    }
    return { status: 'APPROVED', message: 'Batas keamanan kas terjaga.' };
  }
};
