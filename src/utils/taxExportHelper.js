/**
 * Helper untuk validasi dan mapping ekspor pajak e-Bupot Unifikasi DJP
 */

// Mapping tax_type ke Kode Objek Pajak resmi DJP
const TAX_CODE_MAP = {
  PPH_21: '21-100-01',
  PPH_23_JASA: '24-100-99',
  PPH_23_DIVIDEN: '24-101-01',
  PPH_4_2_SEWA: '28-401-01',
  PPH_4_2_KONSTRUKSI: '28-409-01',
  FINAL_UMKM: '41-600-01',
};

// A. Pre-flight Validation
export const validateTaxData = (transactions) => {
  const errors = [];

  transactions.forEach((tx, idx) => {
    const rowNum = idx + 1;
    const name = tx.merchant_name || tx.description || `Transaksi #${rowNum}`;

    // Validasi NPWP/NIK
    const taxId = tx.vendor_npwp;
    if (!taxId) {
      errors.push(`Baris ${rowNum} (${name}): NPWP atau NIK wajib diisi.`);
    } else {
      const cleanId = taxId.replace(/[^0-9]/g, '');
      if (cleanId.length !== 15 && cleanId.length !== 16) {
        errors.push(`Baris ${rowNum} (${name}): NPWP/NIK harus 15 atau 16 digit angka (ditemukan ${cleanId.length} digit).`);
      }
    }

    // Validasi Kode Objek Pajak
    if (!tx.tax_type || !TAX_CODE_MAP[tx.tax_type]) {
      errors.push(`Baris ${rowNum} (${name}): Kode Objek Pajak tidak dikenali untuk jenis pajak "${tx.tax_type || '-'}".`);
    }

    // Validasi Nominal
    if (!tx.amount || tx.amount <= 0) {
      errors.push(`Baris ${rowNum} (${name}): Penghasilan Bruto tidak boleh nol atau negatif.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// B. Mapping ke format resmi DJP e-Bupot Unifikasi
export const mapToEbupotFormat = (transactions) => {
  return transactions.map((data, index) => ({
    "No": index + 1,
    "Nama Penerima Penghasilan": data.merchant_name || data.description || '',
    "NPWP/NIK": (data.vendor_npwp || '').replace(/[^0-9]/g, ''),
    "Kode Objek Pajak": TAX_CODE_MAP[data.tax_type] || '',
    "Penghasilan Bruto": data.amount || 0,
    "PPh yang Dipotong": data.tax_amount || 0,
    "Tarif (%)": ((data.tax_rate || 0) * 100).toFixed(0),
    "Tanggal Transaksi": data.date || '',
    "No. Referensi": data.reference_number || '',
  }));
};

// C. Generate CSV string dari data yang sudah di-map
export const generateEbupotCSV = (mappedData) => {
  if (mappedData.length === 0) return '';
  const headers = Object.keys(mappedData[0]);
  const rows = mappedData.map(row =>
    headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(',')
  );
  return '\ufeff' + [headers.join(','), ...rows].join('\n');
};