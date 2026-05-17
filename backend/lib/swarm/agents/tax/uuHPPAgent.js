/**
 * UU HPP COMPLIANCE AGENT
 * =======================
 * Spesialisasi: UU No. 7 Tahun 2021 (Harmonisasi Peraturan Perpajakan)
 * Tugas: Memastikan kepatuhan terhadap aturan pajak terbaru di Indonesia.
 */

export const UUHPPAgent = {
  name: "UU HPP Scout",
  division: "Tax",
  tier: 2, // Auditor Level
  model: "gpt", // Gunakan model cerdas untuk interpretasi hukum
  description: "Memvalidasi kepatuhan transaksi terhadap UU Harmonisasi Peraturan Perpajakan terbaru.",
  
  async analyze(transaction, context) {
    const findings = [];
    const { amount, date, tax_type } = transaction;
    const year = new Date(date).getFullYear();

    // 1. Validasi Tarif PPN (Pasal 7 UU HPP)
    if (year >= 2025) {
      findings.push("Sesuai UU HPP Pasal 7, tarif PPN per 1 Januari 2025 adalah 12%. Pastikan faktur pajak menggunakan tarif terbaru.");
    }

    // 2. Validasi Batasan PTKP & Bracket PPh (Pasal 3 UU HPP)
    if (tax_type === 'PPh 21') {
      findings.push("Pengecekan bracket PPh 21: UU HPP mengubah lapisan tarif 5% menjadi rentang 0-60jt (sebelumnya 50jt).");
    }

    // 3. NIK sebagai NPWP (Pasal 2 UU HPP)
    if (!transaction.npwp && transaction.nik) {
      findings.push("Integrasi NIK sebagai NPWP: Transaksi ini valid menggunakan NIK sesuai UU HPP.");
    }

    // 4. Pajak Karbon & Natura (Pasal 13 & Pasal 4)
    if (transaction.category === 'Employee Benefits' || transaction.category === 'Natura') {
      findings.push("Peringatan UU HPP: Imbalan dalam bentuk natura kini menjadi objek pajak bagi penerima dan dapat dibiayakan bagi pemberi kerja.");
    }

    return {
      agent: this.name,
      status: findings.length > 0 ? "ADVISORY" : "APPROVED",
      message: findings.join(" | "),
      weight: 1.5, // Bobot hukum lebih tinggi
      legal_ref: "UU No. 7 Tahun 2021 (UU HPP)"
    };
  }
};
