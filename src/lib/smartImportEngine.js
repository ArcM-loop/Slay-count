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

// FUZZY MATCH ACCOUNT
// Memadukan saran AI yang tidak persis dengan Chart of Accounts (COA) riil di database.
// Pendekatan cerdas ala Herta yang tahan banting terhadap perbedaan huruf besar/kecil, typo tipis,
// dan singkatan atau sub-bagian kata (misal: "Beban Listrik" -> "Beban Listrik & Air").
export const fuzzyMatchAccount = (suggestedName, accounts) => {
    if (!suggestedName || !Array.isArray(accounts) || accounts.length === 0) return null;

    // Standarisasi daftar akun menjadi array of objects
    const normalizedAccounts = accounts.map(acc => {
        if (typeof acc === 'string') {
            return { id: '', name: acc, type: '' };
        }
        return acc;
    });

    const cleanString = (str) => {
        const cleaned = String(str)
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\b(beban|biaya|pendapatan|akun|coa)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (cleaned) return cleaned;
        return String(str).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    };

    const suggestedClean = cleanString(suggestedName);
    if (!suggestedClean) return null;

    // 1. Exact Match (Normalized)
    for (const acc of normalizedAccounts) {
        if (cleanString(acc.name) === suggestedClean) {
            return acc;
        }
    }

    // 2. Sub-string & Token Match (Misal: "listrik" mencocokkan "Beban Listrik & Air")
    const suggestedTokens = suggestedClean.split(' ').filter(t => t.length > 1);
    let bestMatch = null;
    let maxOverlapScore = 0;

    for (const acc of normalizedAccounts) {
        const accClean = cleanString(acc.name);
        const accTokens = accClean.split(' ').filter(t => t.length > 1);

        const overlap = suggestedTokens.filter(token => accTokens.includes(token));
        const overlapScore = overlap.length;

        if (overlapScore > 0 && overlapScore > maxOverlapScore) {
            maxOverlapScore = overlapScore;
            bestMatch = acc;
        }
    }

    if (bestMatch) return bestMatch;

    // 3. Levenshtein Distance (Jika ada typo kecil)
    const getLevenshteinDistance = (a, b) => {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    };

    let minDistance = Infinity;
    let closestAcc = null;

    for (const acc of normalizedAccounts) {
        const accClean = cleanString(acc.name);
        const distance = getLevenshteinDistance(suggestedClean, accClean);
        
        const maxAllowedDistance = Math.floor(Math.min(suggestedClean.length, accClean.length) * 0.45);
        if (distance <= maxAllowedDistance && distance < minDistance) {
            minDistance = distance;
            closestAcc = acc;
        }
    }

    return closestAcc;
};

// Fungsi Pembantu Cerdas: Mendeduksi tipe transaksi (Pemasukan vs Pengeluaran) secara akurat
const deduceType = (description, categoryName, matchedAccount = null, amount = 0) => {
    // 1. Jika nominal negatif, hampir pasti ini pengeluaran
    if (amount < 0) return 'Pengeluaran';

    // 2. Jika akun COA teridentifikasi, gunakan tipe dari akun
    if (matchedAccount && matchedAccount.type) {
        if (matchedAccount.type === 'Beban') return 'Pengeluaran';
        if (matchedAccount.type === 'Pendapatan') return 'Pemasukan';
    }

    // 3. Cek kata kunci pada deskripsi (Akurasi Tinggi)
    const descLower = String(description || '').toLowerCase();
    const incomeDescKeywords = ['transfer masuk', 'penjualan', 'omset', 'terima', 'kas masuk', 'setoran', 'revenue', 'income', 'bunga bank', 'piutang lunas', 'pemasukan', 'jasa', 'komisi'];
    const expenseDescKeywords = ['transfer keluar', 'pembelian', 'bayar', 'beli', 'beban', 'biaya', 'tarik kas', 'pengeluaran', 'gaji', 'bensin', 'parkir', 'admin', 'langganan', 'sewa', 'pajak'];

    if (incomeDescKeywords.some(kw => descLower.includes(kw))) return 'Pemasukan';
    if (expenseDescKeywords.some(kw => descLower.includes(kw))) return 'Pengeluaran';

    // 4. Fallback ke nama kategori
    if (categoryName) {
        const catLower = String(categoryName).toLowerCase();
        if (incomeDescKeywords.some(kw => catLower.includes(kw))) return 'Pemasukan';
        if (expenseDescKeywords.some(kw => catLower.includes(kw))) return 'Pengeluaran';
    }

    return 'Pengeluaran'; // Default
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
    // Standardisasi list COA ke array of objects
    const isObjectCoa = coaSuggestions.length > 0 && typeof coaSuggestions[0] === 'object';
    const accountsList = isObjectCoa ? coaSuggestions : coaSuggestions.map(name => ({ id: '', name, type: '' }));
    const accountNames = accountsList.map(a => a.name);

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
        const parsedAmount = parseIndonesianNumber(amountVal);
        const sanitizedDesc = sanitizeValue(rawDesc);
        
        let categoryValue = rawCategory ? sanitizeValue(rawCategory) : null;
        let isSuggested = false;
        let matchedAccount = null;

        // Jika kategori sudah di-map dari Excel, coba fuzzy match langsung ke COA riil
        if (categoryValue) {
            matchedAccount = fuzzyMatchAccount(categoryValue, accountsList);
            if (matchedAccount) {
                categoryValue = matchedAccount.name;
            } else {
                const lowerCat = categoryValue.toLowerCase().trim();
                if (lowerCat === 'beban' || lowerCat === 'biaya' || lowerCat === 'pengeluaran' || lowerCat === 'pemasukan' || lowerCat === 'pendapatan') {
                    categoryValue = null; // Biarkan Biyo AI menebak kategori yang spesifik
                }
            }
        }

        const transactionType = deduceType(sanitizedDesc, categoryValue, matchedAccount, parsedAmount);

        return {
            date: parsedDate || new Date().toISOString().split('T')[0],
            description: sanitizedDesc,
            amount: Math.abs(parsedAmount), // Gunakan nilai mutlak positif untuk ledger
            category: categoryValue,
            type: transactionType,
            reference: sanitizeValue(rawRef),
            confidence: categoryValue ? 1.0 : 0,
            isSuggested: isSuggested,
            suggestions: []
        };
    });

    // 2. Kumpulkan baris yang membutuhkan AI untuk kategorisasi
    const rowsNeedingAI = [];
    cleanedRows.forEach((row, idx) => {
        if (!row.category && row.description) {
            rowsNeedingAI.push({ originalIndex: idx, description: row.description, amount: row.amount });
        }
    });

    // 3. Panggil AI secara BATCH (Mengubah N panggilan menjadi hanya 1 panggilan tunggal!)
    if (rowsNeedingAI.length > 0) {
        const descriptions = rowsNeedingAI.map(r => r.description);
        const prompt = `Kamu adalah Biyo, akuntan senior AI berpengalaman. Tentukan nama kategori akun (COA) akuntansi paling tepat beserta tipe transaksinya untuk masing-masing deskripsi transaksi berikut dalam bahasa Indonesia.

${accountNames.length > 0 
  ? `PILIH KATEGORI HANYA DARI DAFTAR AKUN BISNIS BERIKUT (Pilih nama yang paling relevan dan persis sesuai ejaan):
${accountNames.join(', ')}` 
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
                        let finalCategory = suggested.category;
                        let finalType = suggested.type || 'Pengeluaran';

                        // Lakukan fuzzy matching Herta pada saran AI agar 100% selaras dengan COA riil
                        const matchedAccount = fuzzyMatchAccount(finalCategory, accountsList);
                        if (matchedAccount) {
                            finalCategory = matchedAccount.name;
                            finalType = deduceType(cleanedRows[item.originalIndex].description, finalCategory, matchedAccount, item.amount);
                        } else {
                            finalType = deduceType(cleanedRows[item.originalIndex].description, finalCategory, null, item.amount);
                        }

                        cleanedRows[item.originalIndex].category = finalCategory;
                        cleanedRows[item.originalIndex].type = finalType;
                        cleanedRows[item.originalIndex].confidence = 0.85;
                        cleanedRows[item.originalIndex].isSuggested = true;
                    }
                });
            }
        } catch (aiErr) {
            console.warn('AI batch category suggestion failed:', aiErr);
        }
    }

    // 4. Heuristics Fallback Herta-style: Jika AI gagal atau ada baris yang masih belum ditentukan kategorinya
    cleanedRows.forEach((row) => {
        if (!row.category && row.description) {
            const lowerDesc = row.description.toLowerCase();
            let suggestedCategory = 'Beban Operasional'; // Default fallback

            if (lowerDesc.includes('gaji') || lowerDesc.includes('salary') || lowerDesc.includes('upah')) {
                suggestedCategory = 'Beban Gaji';
            } else if (lowerDesc.includes('pln') || lowerDesc.includes('listrik') || lowerDesc.includes('token') || lowerDesc.includes('pdam') || lowerDesc.includes('air')) {
                suggestedCategory = 'Beban Listrik & Air';
            } else if (lowerDesc.includes('admin') || lowerDesc.includes('biaya bulanan') || lowerDesc.includes('administrasi')) {
                suggestedCategory = 'Beban Administrasi Bank';
            } else if (lowerDesc.includes('tokopedia') || lowerDesc.includes('shopee') || lowerDesc.includes('laptop') || lowerDesc.includes('meja') || lowerDesc.includes('kursi') || lowerDesc.includes('perlengkapan')) {
                suggestedCategory = 'Beban Perlengkapan Kantor';
            } else if (lowerDesc.includes('pajak') || lowerDesc.includes('ppn') || lowerDesc.includes('pph')) {
                suggestedCategory = 'Beban Pajak';
            } else if (lowerDesc.includes('bensin') || lowerDesc.includes('pertamax') || lowerDesc.includes('gopay') || lowerDesc.includes('grab') || lowerDesc.includes('gojek') || lowerDesc.includes('transport') || lowerDesc.includes('parkir') || lowerDesc.includes('tol')) {
                if (accountNames.includes('Beban Kendaraan')) {
                    suggestedCategory = 'Beban Kendaraan';
                } else if (accountNames.includes('Beban Transportasi')) {
                    suggestedCategory = 'Beban Transportasi';
                } else {
                    suggestedCategory = 'Beban Operasional';
                }
            } else if (lowerDesc.includes('sewa') || lowerDesc.includes('kontrak')) {
                suggestedCategory = 'Beban Sewa';
            } else if (lowerDesc.includes('iklan') || lowerDesc.includes('ads') || lowerDesc.includes('marketing') || lowerDesc.includes('promosi')) {
                suggestedCategory = 'Beban Pemasaran';
            } else if (lowerDesc.includes('vendor') || lowerDesc.includes('selisih')) {
                suggestedCategory = 'Beban Operasional';
            }

            // Lakukan fuzzy matching Herta pada saran lokal agar selaras dengan COA riil
            const matched = fuzzyMatchAccount(suggestedCategory, accountsList);
            if (matched) {
                row.category = matched.name;
                row.type = deduceType(row.description, matched.name, matched, row.amount);
            } else {
                row.category = suggestedCategory;
                row.type = deduceType(row.description, suggestedCategory, null, row.amount);
            }
            row.confidence = 0.65;
            row.isSuggested = true;
        }
    });

    return cleanedRows;
};
