/**
 * BIYO SMART IMPORT ENGINE
 * Logika untuk memproses file CSV/Excel yang berantakan dan memetakannya ke format SlayCount.
 */

export const analyzeColumns = (headers) => {
    const mapping = {
        date: null,
        description: null,
        amount: null,
        category: null,
        reference: null
    };

    const keywords = {
        date: ['tanggal', 'date', 'kapan', 'tgl', 'time', 'waktu'],
        description: ['keterangan', 'deskripsi', 'description', 'notes', 'memo', 'item', 'rincian'],
        amount: ['nominal', 'amount', 'harga', 'total', 'jumlah', 'price', 'value', 'duit', 'keluar', 'masuk'],
        category: ['kategori', 'category', 'akun', 'account', 'coa', 'jenis'],
        reference: ['ref', 'invoice', 'no', 'nomor', 'bukti']
    };

    headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase().trim();
        
        for (const [key, searchTerms] of Object.entries(keywords)) {
            if (searchTerms.some(term => lowerHeader.includes(term))) {
                // Prioritaskan mapping pertama yang ketemu
                if (!mapping[key]) {
                    mapping[key] = { index, headerName: header };
                }
            }
        }
    });

    return mapping;
};

// [CVE-9 Helper] Mencegah serangan CSV / Formula Injection
// Karakter pemicu formula Excel/Sheets di awal kata wajib di-escape menggunakan petik tunggal (')
// Konversi Tanggal Serial Excel ke format YYYY-MM-DD secara cerdas
const excelSerialToDate = (val) => {
    if (!val) return '';
    const trimmed = String(val).trim();
    if (!trimmed) return '';
    
    const num = Number(trimmed);
    // Angka serial Excel yang valid untuk tanggal saat ini biasanya berkisar dari 30000 s.d. 100000
    if (!isNaN(num) && num > 30000 && num < 100000) {
        try {
            const date = new Date((num - 25569) * 86400 * 1000);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (e) {
            // Fallback jika terjadi error konversi
        }
    }
    return trimmed;
};

// Fungsi Pembantu Cerdas: Mendeduksi tipe transaksi (Pemasukan vs Pengeluaran) dari nama kategori COA
const deduceTypeFromCategory = (categoryName) => {
    if (!categoryName) return 'Pengeluaran';
    const lower = categoryName.toLowerCase();
    
    // Kata kunci untuk pemasukan/pendapatan
    const incomeKeywords = ['pendapatan', 'penjualan', 'pemasukan', 'omset', 'bunga bank', 'kas masuk', 'revenue', 'income'];
    if (incomeKeywords.some(keyword => lower.includes(keyword))) {
        return 'Pemasukan';
    }
    return 'Pengeluaran'; // Beban, biaya, HPP, aset dll secara default masuk ke Pengeluaran
};

// Parser Angka Cerdas untuk format Indonesia (titik ribuan, koma desimal) & Internasional
const parseIndonesianNumber = (str) => {
    if (str === undefined || str === null) return 0;
    let cleaned = String(str).trim();
    if (!cleaned) return 0;
    
    // Hapus simbol mata uang jika ada
    cleaned = cleaned.replace(/^(Rp|USD|EUR)\.?\s*/i, '');
    
    // Kasus 1: Memiliki titik ribuan DAN koma desimal sekaligus (misal 1.250.000,50)
    if (cleaned.includes('.') && cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } 
    // Kasus 2: Hanya memiliki koma (misal 8,5 atau 15,000)
    else if (cleaned.includes(',')) {
        const parts = cleaned.split(',');
        // Jika angka setelah koma berjumlah 3 digit, asumsikan itu pemisah ribuan (15,000)
        const isThousand = parts.slice(1).every(part => part.length === 3);
        if (isThousand) {
            cleaned = cleaned.replace(/,/g, '');
        } else {
            // Sebaliknya, itu desimal koma lokal (8,5 atau 2,01)
            cleaned = cleaned.replace(/,/g, '.');
        }
    } 
    // Kasus 3: Hanya memiliki titik (misal 750.000 atau 15.000 atau 8.5)
    else if (cleaned.includes('.')) {
        const parts = cleaned.split('.');
        // Jika bagian setelah titik berjumlah 3 digit, asumsikan itu pemisah ribuan lokal (750.000)
        const isThousand = parts.slice(1).every(part => part.length === 3);
        if (isThousand) {
            cleaned = cleaned.replace(/\./g, '');
        }
        // Sebaliknya, asumsikan desimal standar internasional (8.5), biarkan titiknya tetap
    }
    
    return parseFloat(cleaned) || 0;
};

const sanitizeValue = (val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    if (!trimmed) return '';
    
    const formulaChars = ['=', '+', '-', '@', '|', '\r', '\n'];
    if (formulaChars.some(char => trimmed.startsWith(char))) {
        // Tambahkan petik tunggal di depan untuk memaksa Excel membacanya sebagai string biasa
        return `'${trimmed}`;
    }
    return trimmed;
};

export const cleanData = async (rows, mapping, coaSuggestions = []) => {
    // 1. Bersihkan data dasar dari baris secara sinkronus terlebih dahulu
    const cleanedRows = rows.map((row, index) => {
        const rawDate = row[mapping.date?.index] || '';
        const rawDesc = row[mapping.description?.index] || 'Tanpa Keterangan';
        const rawCategory = row[mapping.category?.index] || '';
        const rawRef = row[mapping.reference?.index] || '';

        let amountVal = row[mapping.amount?.index];
        // Skenario 2 Kolom (Debet / Kredit): Jika kosong, nol, atau '-', cari kolom angka lainnya di baris yang sama!
        if (!amountVal || String(amountVal).trim() === '-' || String(amountVal).trim() === '' || parseIndonesianNumber(amountVal) === 0) {
            for (let i = 0; i < row.length; i++) {
                if (i !== mapping.date?.index && i !== mapping.description?.index && i !== mapping.reference?.index && i !== mapping.category?.index) {
                    const candidate = String(row[i]).trim();
                    if (candidate && candidate !== '-' && /[0-9]/.test(candidate)) {
                        const parsedCand = parseIndonesianNumber(candidate);
                        if (parsedCand > 0) {
                            amountVal = candidate;
                            break;
                        }
                    }
                }
            }
        }

        const parsedDate = excelSerialToDate(rawDate);
        const categoryValue = rawCategory ? sanitizeValue(rawCategory) : null;

        return {
            date: parsedDate || new Date().toISOString().split('T')[0],
            // [CVE-9 Fixed by Herta] — Semua teks yang rentan di-sanitasi ketat
            description: sanitizeValue(rawDesc),
            amount: parseIndonesianNumber(amountVal),
            category: categoryValue,
            type: categoryValue ? deduceTypeFromCategory(categoryValue) : 'Pengeluaran', // Deducing type
            reference: sanitizeValue(rawRef),
            confidence: categoryValue ? 1.0 : 0,
            suggestions: []
        };
    });

    // 2. Kumpulkan baris yang membutuhkan AI untuk kategorisasi
    const rowsNeedingAI = [];
    cleanedRows.forEach((row, idx) => {
        if (!row.category && row.description) {
            rowsNeedingAI.push({ originalIndex: idx, description: row.description });
        }
    });

    // 3. Panggil AI secara BATCH (Mengubah N panggilan menjadi hanya 1 panggilan tunggal!)
    if (rowsNeedingAI.length > 0) {
        const descriptions = rowsNeedingAI.map(r => r.description);
        const prompt = `Kamu adalah Biyo, akuntan senior AI berpengalaman. Tentukan nama kategori akun (COA) akuntansi paling tepat beserta tipe transaksinya untuk masing-masing deskripsi transaksi berikut dalam bahasa Indonesia.

${coaSuggestions && coaSuggestions.length > 0 
  ? `PILIH KATEGORI HANYA DARI DAFTAR AKUN BISNIS BERIKUT (Pilih nama yang paling relevan dan persis sesuai ejaan):
${coaSuggestions.join(', ')}` 
  : 'Gunakan nama kategori COA akuntansi standar Indonesia (seperti Beban Gaji, Beban Operasional, Beban Administrasi Bank, Pendapatan Usaha, Beban Kendaraan, dll).'}

Ketentuan Tipe: 
- "Pengeluaran" untuk beban, biaya, pembelian barang, parkir, bensin, gaji, air, listrik, biaya admin, dll.
- "Pemasukan" untuk penjualan, pendapatan, penerimaan kas, piutang lunas, transfer masuk, dll.

Kembalikan jawaban dalam format JSON ARRAY berisi objek dengan format: {"category": "Nama Kategori", "type": "Pemasukan"|"Pengeluaran"}, berurutan sesuai urutan deskripsi yang diberikan. Jangan memberikan teks penjelasan tambahan apapun, hanya JSON array.

CONTOH INPUT:
["beli bensin gojek", "bayar listrik kantor", "penjualan kopi susu"]

CONTOH OUTPUT:
[
  {"category": "Beban Kendaraan", "type": "Pengeluaran"},
  {"category": "Beban Operasional", "type": "Pengeluaran"},
  {"category": "Pendapatan Usaha", "type": "Pemasukan"}
]

DAFTAR DESKRIPSI TRANSAKSI:
${JSON.stringify(descriptions)}`;

        try {
            const llmRes = await GoogleGenerativeAI.generate({
                prompt,
                temperature: 0.1,
                maxTokens: 2048,
                jsonMode: true
            });

            let categories = [];
            try {
                const parsedContent = llmRes?.choices?.[0]?.message?.content;
                categories = JSON.parse(parsedContent ?? '[]');
            } catch (jsonErr) {
                console.warn('Gagal melakukan parsing JSON kategori batch:', jsonErr);
            }

            if (Array.isArray(categories)) {
                rowsNeedingAI.forEach((item, index) => {
                    const suggested = categories[index];
                    if (suggested && suggested.category) {
                        cleanedRows[item.originalIndex].category = suggested.category;
                        cleanedRows[item.originalIndex].type = suggested.type || 'Pengeluaran';
                        cleanedRows[item.originalIndex].confidence = 0.85;
                        cleanedRows[item.originalIndex].isSuggested = true;
                    }
                });
            }
        } catch (aiErr) {
            console.warn('AI batch category suggestion failed:', aiErr);
        }
    }

    return cleanedRows;
};
