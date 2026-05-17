/**
 * IFRS & US GAAP SPECIALIST AGENT
 * ===============================
 * Spesialisasi: International Financial Reporting Standards (IFRS) & US GAAP
 * Tugas: Menerjemahkan transaksi lokal ke standar pelaporan global.
 */

export const IFRSAgent = {
  name: "Global IFRS Scout",
  division: "Global",
  tier: 2, 
  model: "gpt", // Membutuhkan pengetahuan akuntansi tingkat tinggi
  description: "Menganalisis kepatuhan transaksi terhadap standar IFRS dan US GAAP untuk pelaporan internasional.",
  
  async analyze(transaction, context) {
    const findings = [];
    const { category, amount, description } = transaction;

    // 1. IFRS 16: Leases (Sewa)
    if (category === 'Rent' || description.toLowerCase().includes('lease')) {
      findings.push("IFRS 16 Alert: Di bawah standar global, sewa jangka panjang harus diakui sebagai 'Right-of-Use Asset', bukan sekadar biaya sewa.");
    }

    // 2. IFRS 15: Revenue Recognition
    if (category === 'Revenue' || category === 'Sales') {
      findings.push("IFRS 15 Check: Pastikan pengakuan pendapatan dilakukan saat 'Control' berpindah ke pelanggan, bukan sekadar saat invoice dikirim.");
    }

    // 3. US GAAP: Accrual nuanced
    if (description.toLowerCase().includes('subscription') || description.toLowerCase().includes('prepaid')) {
      findings.push("Global Mapping: Transaksi ini diidentifikasi sebagai biaya dibayar di muka (prepaid). US GAAP mewajibkan amortisasi ketat.");
    }

    // 4. Multi-Currency Reporting
    if (transaction.currency && transaction.currency !== 'IDR') {
      findings.push(`Valuta Asing (${transaction.currency}): Menggunakan kurs penutupan IFRS untuk translasi saldo akun.`);
    }

    return {
      agent: this.name,
      status: findings.length > 0 ? "ADVISORY" : "APPROVED",
      message: findings.join(" | "),
      weight: 1.2,
      global_standard: "IFRS / US GAAP"
    };
  }
};
