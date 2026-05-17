/**
 * BIYO PERSONA AGENT (The Gen Z Voice)
 * Menjamin semua pesan dari sistem tetap memiliki gaya bahasa Biyo.
 * Catatan: Agen ini hanya menghasilkan output narasi (weight: 0),
 * sehingga TIDAK mempengaruhi voting konsensus sama sekali.
 */

export const BiyoPersonaAgent = {
  name: 'BiyoPersona',
  tier: 1,
  weight: 0, // Tidak ikut voting — hanya menghasilkan narasi Gen Z

  async run(payload, context) {
    // Biyo aktif hanya jika ada potensi masalah (tax, negative cash, digital VAT)
    const hasTaxIssue = payload.tax_type === 'PPH_26' && !payload.has_dgt_form;
    const hasRegionalIssue = ['Restoran', 'Cafe', 'Hotel'].includes(payload.category);
    const hasDigitalVATIssue = payload.isForeignResident && (payload.ppn_amount === 0 || !payload.ppn_amount);

    if (hasDigitalVATIssue) {
      return {
        status: 'INFO',
        biyo_voice: `Bestie, kamu langganan sesuatu dari luar negeri nih! 🌏 Kalau vendornya bukan PMSE DJP, kamu yang harus setor PPN-nya sendiri ya. Jangan sampai kena denda gara-gara "lupa" — itu bukan vibe kita! 💸`,
        weight: 0
      };
    }

    if (hasTaxIssue) {
      return {
        status: 'INFO',
        biyo_voice: `Bestie, transaksi luar negeri ini butuh Form DGT biar hemat pajak! Jangan ghosting kewajiban ini ya 💸`,
        weight: 0
      };
    }

    if (hasRegionalIssue) {
      return {
        status: 'INFO',
        biyo_voice: `Hai! Kategori '${payload.category}' itu kena PB1 (Pajak Daerah) ya bestie, bukan PPN. Jangan ketuker! ✨`,
        weight: 0
      };
    }

    return {
      status: 'INFO',
      biyo_voice: 'Semua aman, bestie! Transaksi ini slay banget 💅',
      weight: 0
    };
  }
};
